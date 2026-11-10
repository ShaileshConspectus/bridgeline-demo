import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, fundingInstruments } from "@/db/schema";
import { getProjectMetricData } from "@/lib/actions";
import { buildPeriodRows, latestRow } from "@/lib/metrics";
import { ProjectNav } from "@/components/project-nav";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";

const SEVERITY_VARIANT: Record<string, "muted" | "warning" | "danger"> = {
  low: "muted",
  moderate: "warning",
  high: "danger",
};

const ROW_STATUS_VARIANT: Record<string, "ok" | "danger" | "muted"> = {
  on_track: "ok",
  off_track: "danger",
  no_data: "muted",
  no_comparison: "muted",
};

// Severity rank for sorting consequence-severity-flagged metrics to the
// top, per the spec's Loan Covenant Compliance template ("pulling
// consequence_severity-flagged metrics to the top").
const SEVERITY_RANK: Record<string, number> = { high: 0, moderate: 1, low: 2 };

export default async function LoanCovenantReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const instruments = await db.select().from(fundingInstruments).where(eq(fundingInstruments.projectId, projectId));
  const debtInstruments = instruments.filter((fi) => fi.instrumentType === "debt" || fi.instrumentType === "blended");
  const { metrics: metricsList, targets, observations } = await getProjectMetricData(projectId);

  const generatedAt = new Date().toISOString().slice(0, 10);

  const metricRows = metricsList
    .map((m) => {
      const rows = buildPeriodRows(
        m,
        targets.filter((t) => t.metricId === m.id),
        observations.filter((o) => o.metricId === m.id && o.status === "accepted"),
      );
      const row = latestRow(rows);
      return { metric: m, row };
    })
    // Only metrics with a manually-set consequence severity belong on a
    // covenant compliance report — an unflagged metric isn't tied to
    // covenant risk.
    .filter((r) => r.row?.consequenceSeverity != null)
    .sort((a, b) => SEVERITY_RANK[a.row!.consequenceSeverity!] - SEVERITY_RANK[b.row!.consequenceSeverity!]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <ProjectNav projectId={project.id} projectName={project.name} active="reports" />
      </div>

      <article className="flex flex-col gap-6 print:gap-4">
        <div className="flex items-start justify-between gap-2 print:hidden">
          <p className="text-sm text-muted">
            Loan Covenant Compliance Report — structured against the covenant terms on this project&apos;s debt
            Funding Instrument(s), with consequence-severity-flagged metrics surfaced first.
          </p>
          <PrintButton />
        </div>

        <header className="border-b border-border pb-4">
          <p className="text-xs uppercase tracking-wide text-muted">Loan Covenant Compliance Report</p>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted">Generated {generatedAt}</p>
        </header>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Covenant terms</h2>
          {debtInstruments.length === 0 ? (
            <p className="text-sm text-muted">
              No debt (or blended) Funding Instrument recorded on this project — this template still shows
              severity-flagged metrics below, but there are no covenant terms to report against.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {debtInstruments.map((fi) => (
                <div key={fi.id} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">
                    {fi.capitalProviderName}
                    <span className="ml-2 text-muted font-normal capitalize">{fi.instrumentType}</span>
                  </p>
                  {fi.amount != null && (
                    <p className="mt-1 text-muted">
                      {fi.currency ?? "USD"} {fi.amount.toLocaleString()}
                    </p>
                  )}
                  {fi.covenantOrMilestoneTerms && <p className="mt-1">{fi.covenantOrMilestoneTerms}</p>}
                  {fi.renewalOrTrancheTrigger && (
                    <p className="mt-1 text-muted">Renewal/tranche trigger: {fi.renewalOrTrancheTrigger}</p>
                  )}
                  {fi.reportingRequirement && <p className="mt-1 text-muted">Reporting: {fi.reportingRequirement}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Covenant-linked indicators (by severity)
          </h2>
          {metricRows.length === 0 ? (
            <p className="text-sm text-muted">
              No metric has a consequence severity set yet — set one on a metric&apos;s target in the Metrics
              Library to have it appear here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-1.5 pr-4 font-medium">Severity</th>
                  <th className="py-1.5 pr-4 font-medium">Indicator</th>
                  <th className="py-1.5 pr-4 font-medium">Latest period</th>
                  <th className="py-1.5 pr-4 font-medium">Actual</th>
                  <th className="py-1.5 pr-4 font-medium">Comparison</th>
                  <th className="py-1.5 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {metricRows.map(({ metric, row }) => (
                  <tr key={metric.id} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-4">
                      <Badge variant={SEVERITY_VARIANT[row!.consequenceSeverity!]} className="capitalize">
                        {row!.consequenceSeverity}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-4">
                      {metric.code && <span className="text-muted mr-1">{metric.code}</span>}
                      {metric.name}
                    </td>
                    <td className="py-1.5 pr-4">{row?.period ?? "—"}</td>
                    <td className="py-1.5 pr-4">{row?.actual ?? "—"}</td>
                    <td className="py-1.5 pr-4">
                      {row?.comparisonValue != null ? `${row.comparisonValue} (${row.comparisonLabel})` : "—"}
                    </td>
                    <td className="py-1.5 pr-4">
                      <Badge variant={ROW_STATUS_VARIANT[row!.status]} className="capitalize">
                        {row!.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </article>
    </div>
  );
}
