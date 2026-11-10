import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, tocRungs, impactHypotheses, fundingInstruments } from "@/db/schema";
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

const ROW_STATUS_VARIANT: Record<string, "ok" | "danger" | "muted" | "warning"> = {
  on_track: "ok",
  off_track: "danger",
  no_data: "muted",
  no_comparison: "muted",
};

const SEVERITY_VARIANT: Record<string, "muted" | "warning" | "danger"> = {
  low: "muted",
  moderate: "warning",
  high: "danger",
};

export default async function InvestorUpdateReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const thesis = await getCurrentThesis(projectId);
  const instruments = await db
    .select()
    .from(fundingInstruments)
    .where(eq(fundingInstruments.projectId, projectId));
  const capitalInstruments = instruments.filter((fi) => fi.instrumentType === "equity" || fi.instrumentType === "blended");
  const { metrics: metricsList, targets, observations } = await getProjectMetricData(projectId);

  const [rungs, hypotheses] = thesis
    ? await Promise.all([
        db.select().from(tocRungs).where(eq(tocRungs.thesisId, thesis.id)).orderBy(asc(tocRungs.sortOrder)),
        db.select().from(impactHypotheses).where(eq(impactHypotheses.thesisId, thesis.id)),
      ])
    : [[], []];

  const generatedAt = new Date().toISOString().slice(0, 10);
  const hypothesisCounts = hypotheses.reduce<Record<string, number>>((acc, h) => {
    acc[h.status] = (acc[h.status] ?? 0) + 1;
    return acc;
  }, {});

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
              Investor / Board Update — deck-style KPI summary against milestones and targets. Full-detail
              rollup lens by default (every Theory of Change rung, not just Outcome/Impact) since investor and
              lender audiences typically want more granularity, not less.
            </p>
            <PrintButton />
          </div>

          <header className="border-b border-border pb-4">
            <p className="text-xs uppercase tracking-wide text-muted">Investor / Board Update</p>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm text-muted">Generated {generatedAt} · Version {thesis.version} thesis</p>
          </header>

          {capitalInstruments.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Capital structure</h2>
              {capitalInstruments.map((fi) => (
                <p key={fi.id} className="text-sm">
                  {fi.capitalProviderName} ({fi.instrumentType})
                  {fi.amount != null && <span className="text-muted"> — {fi.currency ?? "USD"} {fi.amount.toLocaleString()}</span>}
                  {fi.reportingRequirement && <span className="text-muted"> — {fi.reportingRequirement}</span>}
                </p>
              ))}
            </section>
          )}
          {capitalInstruments.length === 0 && (
            <p className="text-sm text-muted">
              No equity or blended Funding Instrument recorded on this project yet — this template still works
              off the thesis and metrics below.
            </p>
          )}

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Thesis</h2>
            <p className="text-sm">{thesis.statement}</p>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Theory of Change — full detail
            </h2>
            {rungs.length === 0 ? (
              <p className="text-sm text-muted">No Theory of Change rungs recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rungs.map((r) => (
                  <p key={r.id} className="text-sm">
                    <Badge variant="outline" className="mr-2">
                      {RUNG_LABELS[r.rungType] ?? r.rungType}
                    </Badge>
                    {r.title}
                    {r.description && <span className="text-muted"> — {r.description}</span>}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">KPI summary</h2>
            {metricsList.length === 0 ? (
              <p className="text-sm text-muted">No metrics recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-1.5 pr-4 font-medium">Indicator</th>
                    <th className="py-1.5 pr-4 font-medium">Latest period</th>
                    <th className="py-1.5 pr-4 font-medium">Actual</th>
                    <th className="py-1.5 pr-4 font-medium">Baseline</th>
                    <th className="py-1.5 pr-4 font-medium">Milestone</th>
                    <th className="py-1.5 pr-4 font-medium">Target</th>
                    <th className="py-1.5 pr-4 font-medium">Variance</th>
                    <th className="py-1.5 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsList.map((m) => {
                    const rows = buildPeriodRows(
                      m,
                      targets.filter((t) => t.metricId === m.id),
                      observations.filter((o) => o.metricId === m.id && o.status === "accepted"),
                    );
                    const row = latestRow(rows);
                    return (
                      <tr key={m.id} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-4">
                          {m.code && <span className="text-muted mr-1">{m.code}</span>}
                          {m.name}
                        </td>
                        <td className="py-1.5 pr-4">{row?.period ?? "—"}</td>
                        <td className="py-1.5 pr-4">{row?.actual ?? "—"}</td>
                        <td className="py-1.5 pr-4">{row?.baseline ?? "—"}</td>
                        <td className="py-1.5 pr-4">{row?.milestone ?? "—"}</td>
                        <td className="py-1.5 pr-4">{row?.target ?? "—"}</td>
                        <td className="py-1.5 pr-4">
                          {row?.variancePct != null ? `${row.variancePct > 0 ? "+" : ""}${row.variancePct.toFixed(0)}%` : "—"}
                        </td>
                        <td className="py-1.5 pr-4">
                          {row ? (
                            <Badge variant={ROW_STATUS_VARIANT[row.status]} className="capitalize">
                              {row.status.replace(/_/g, " ")}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Hypothesis scorecard</h2>
            {hypotheses.length === 0 ? (
              <p className="text-sm text-muted">No hypotheses recorded yet.</p>
            ) : (
              <>
                <p className="mb-2 text-sm text-muted">
                  {Object.entries(hypothesisCounts)
                    .map(([status, count]) => `${count} ${status}`)
                    .join(" · ")}
                </p>
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
              </>
            )}
          </section>
        </article>
      )}
    </div>
  );
}
