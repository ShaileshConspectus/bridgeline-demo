import { notFound } from "next/navigation";
import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, tocRungs, impactHypotheses, fundingInstruments, hypothesisMetricLinks } from "@/db/schema";
import { getCurrentThesis, getProjectMetricData } from "@/lib/actions";
import { buildPeriodRows, latestRow } from "@/lib/metrics";
import { ProjectNav } from "@/components/project-nav";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";

const RUNG_LABELS: Record<string, string> = {
  input: "Input",
  process: "Process",
  output: "Output",
  intermediate_outcome: "Intermediate outcome",
  outcome: "Outcome",
  impact: "Impact",
};

const STATUS_VARIANT: Record<string, "muted" | "warning" | "ok" | "danger" | "default"> = {
  untested: "muted",
  testing: "warning",
  supported: "ok",
  refuted: "danger",
  inconclusive: "default",
};

export default async function GrantNarrativeReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const thesis = await getCurrentThesis(projectId);
  const instruments = await db.select().from(fundingInstruments).where(eq(fundingInstruments.projectId, projectId));
  const { metrics: metricsList, targets, observations } = await getProjectMetricData(projectId);

  const [rungs, hypotheses] = thesis
    ? await Promise.all([
        db.select().from(tocRungs).where(eq(tocRungs.thesisId, thesis.id)).orderBy(asc(tocRungs.sortOrder)),
        db.select().from(impactHypotheses).where(eq(impactHypotheses.thesisId, thesis.id)),
      ])
    : [[], []];

  // Grant/Funding Narrative default rollup lens (spec Module 4): only
  // Outcome and Impact rungs surface in a donor-facing narrative — the
  // granular Input/Process/Output detail stays internal.
  const outcomeRungs = rungs.filter((r) => r.rungType === "outcome");
  const impactRungs = rungs.filter((r) => r.rungType === "impact");
  const outcomeImpactRungIds = new Set([...outcomeRungs, ...impactRungs].map((r) => r.id));

  // The same rollup lens applies to the Indicator progress table below —
  // a metric only surfaces here if it's linked (via a hypothesis) to an
  // Outcome or Impact rung. A metric that only evidences earlier-rung
  // hypotheses (Input/Process/Output/Intermediate Outcome) or carries no
  // hypothesis link at all stays out of this donor-facing view; it's
  // still visible on the Dashboard's full detail.
  const hypothesisIds = hypotheses.map((h) => h.id);
  const links = hypothesisIds.length
    ? await db.select().from(hypothesisMetricLinks).where(inArray(hypothesisMetricLinks.hypothesisId, hypothesisIds))
    : [];
  const outcomeImpactHypothesisIds = new Set(
    hypotheses
      .filter((h) => (h.fromRungId != null && outcomeImpactRungIds.has(h.fromRungId)) || (h.toRungId != null && outcomeImpactRungIds.has(h.toRungId)))
      .map((h) => h.id),
  );
  const rollupMetricIds = new Set(
    links.filter((l) => outcomeImpactHypothesisIds.has(l.hypothesisId)).map((l) => l.metricId),
  );
  const rollupMetrics = metricsList.filter((m) => rollupMetricIds.has(m.id));

  const generatedAt = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <ProjectNav projectId={project.id} projectName={project.name} active="reports" />
      </div>

      {!thesis ? (
        <p className="text-sm text-muted">Start a climate thesis in Thesis Studio first.</p>
      ) : (
        <article className="flex flex-col gap-6 print:gap-4">
          <div className="flex items-start justify-between gap-2 print:hidden">
            <p className="text-sm text-muted">
              Grant / Funding Narrative Report — rolls the workplan and indicator progress up into a
              donor-style narrative. Outcome and Impact rungs only (rollup lens); switch to the Dashboard
              for full internal detail.
            </p>
            <PrintButton />
          </div>

          <header className="border-b border-border pb-4">
            <p className="text-xs uppercase tracking-wide text-muted">Grant / Funding Narrative Report</p>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm text-muted">Generated {generatedAt} · Version {thesis.version} thesis</p>
          </header>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Program summary</h2>
            <p className="text-sm">{thesis.statement}</p>
            {thesis.problem && (
              <p className="mt-2 text-sm">
                <strong>The problem: </strong>
                {thesis.problem}
              </p>
            )}
            {thesis.expectedChange && (
              <p className="mt-2 text-sm">
                <strong>Expected change: </strong>
                {thesis.expectedChange}
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {thesis.targetPopulation && (
                <div>
                  <dt className="text-muted">Target population</dt>
                  <dd>{thesis.targetPopulation}</dd>
                </div>
              )}
              {thesis.geography && (
                <div>
                  <dt className="text-muted">Geography</dt>
                  <dd>{thesis.geography}</dd>
                </div>
              )}
              {thesis.timeHorizon && (
                <div>
                  <dt className="text-muted">Time horizon</dt>
                  <dd>{thesis.timeHorizon}</dd>
                </div>
              )}
            </dl>
          </section>

          {instruments.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Funding</h2>
              {instruments.map((fi) => (
                <p key={fi.id} className="text-sm">
                  {fi.capitalProviderName} ({fi.instrumentType})
                  {fi.reportingRequirement && <span className="text-muted"> — {fi.reportingRequirement}</span>}
                </p>
              ))}
            </section>
          )}

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Outcomes &amp; impact</h2>
            {outcomeRungs.length === 0 && impactRungs.length === 0 && (
              <p className="text-sm text-muted">No Outcome or Impact rungs recorded yet.</p>
            )}
            {outcomeRungs.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium">Outcomes</p>
                {outcomeRungs.map((r) => (
                  <p key={r.id} className="text-sm">
                    {r.title}
                    {r.description && <span className="text-muted"> — {r.description}</span>}
                  </p>
                ))}
              </div>
            )}
            {impactRungs.length > 0 && (
              <div>
                <p className="text-sm font-medium">Impact</p>
                {impactRungs.map((r) => (
                  <p key={r.id} className="text-sm">
                    {r.title}
                    {r.description && <span className="text-muted"> — {r.description}</span>}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Indicator progress</h2>
            {metricsList.length === 0 ? (
              <p className="text-sm text-muted">No metrics recorded yet.</p>
            ) : rollupMetrics.length === 0 ? (
              <p className="text-sm text-muted">
                No indicators evidence an Outcome or Impact hypothesis yet — this rollup lens only surfaces
                indicators tied that high in the causal chain. See the Dashboard for full detail.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-1.5 pr-4 font-medium">Indicator</th>
                    <th className="py-1.5 pr-4 font-medium">Latest period</th>
                    <th className="py-1.5 pr-4 font-medium">Actual</th>
                    <th className="py-1.5 pr-4 font-medium">Comparison</th>
                    <th className="py-1.5 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rollupMetrics.map((m) => {
                    const rows = buildPeriodRows(
                      m,
                      targets.filter((t) => t.metricId === m.id),
                      observations.filter((o) => o.metricId === m.id && o.status === "accepted"),
                    );
                    const row = latestRow(rows);
                    return (
                      <tr key={m.id} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-4">{m.name}</td>
                        <td className="py-1.5 pr-4">{row?.period ?? "—"}</td>
                        <td className="py-1.5 pr-4">{row?.actual ?? "—"}</td>
                        <td className="py-1.5 pr-4">
                          {row?.comparisonValue != null ? `${row.comparisonValue} (${row.comparisonLabel})` : "—"}
                        </td>
                        <td className="py-1.5 pr-4 capitalize">{row?.status.replace(/_/g, " ") ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Hypothesis status</h2>
            {hypotheses.length === 0 ? (
              <p className="text-sm text-muted">No hypotheses recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {hypotheses.map((h) => (
                  <p key={h.id} className="text-sm">
                    <Badge variant={STATUS_VARIANT[h.status]} className="mr-2 capitalize">
                      {h.status}
                    </Badge>
                    {h.statement}
                  </p>
                ))}
              </div>
            )}
          </section>
        </article>
      )}
    </div>
  );
}
