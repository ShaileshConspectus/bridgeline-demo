import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionBand } from "@/components/ui/section-band";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { OrgDashboardData, ProjectSummary, FundGroup, MetricStatusCounts } from "@/lib/org-dashboard";

const HYPOTHESIS_STATUS_LABEL: Record<string, string> = {
  untested: "Untested",
  testing: "Testing",
  supported: "Supported",
  refuted: "Refuted",
  inconclusive: "Inconclusive",
};
const HYPOTHESIS_STATUS_VARIANT: Record<string, "muted" | "warning" | "ok" | "danger" | "default"> = {
  untested: "muted",
  testing: "warning",
  supported: "ok",
  refuted: "danger",
  inconclusive: "default",
};

const INSTRUMENT_LABEL: Record<string, string> = {
  grant: "Grant",
  debt: "Debt",
  equity: "Equity",
  blended: "Blended",
  self_funded: "Self-funded",
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

// A small stat tile for the "at a glance" strip. Exported so the
// cross-org Funder View page can reuse it for its own KPI strip.
export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-surface p-4">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

// A compact horizontal segmented bar for metric on/off-track status —
// gives an at-a-glance read without opening the project.
function MetricStatusBar({ status, total }: { status: MetricStatusCounts; total: number }) {
  if (total === 0) return <p className="text-xs text-muted">No metrics yet</p>;
  const segments: { count: number; className: string }[] = [
    { count: status.onTrack, className: "bg-ok" },
    { count: status.offTrack, className: "bg-danger" },
    { count: status.noData, className: "bg-border" },
    { count: status.noComparison, className: "bg-muted-surface" },
  ];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {segments.map((s, i) =>
          s.count > 0 ? (
            <div key={i} className={s.className} style={{ width: `${(s.count / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
        {status.onTrack > 0 && <span className="text-ok">{status.onTrack} on track</span>}
        {status.offTrack > 0 && <span className="text-danger">{status.offTrack} off track</span>}
        {status.noData > 0 && <span>{status.noData} no actual</span>}
        {status.noComparison > 0 && <span>{status.noComparison} no target set</span>}
      </div>
    </div>
  );
}

function HypothesisChips({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-xs text-muted">No hypotheses yet</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => (
          <Badge key={status} variant={HYPOTHESIS_STATUS_VARIANT[status]} className="capitalize">
            {count} {HYPOTHESIS_STATUS_LABEL[status].toLowerCase()}
          </Badge>
        ))}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link href={`/projects/${project.id}/dashboard`}>
      <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted-surface">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{project.name}</p>
            {project.highPriorityOpenLearningItems > 0 && (
              <Badge variant="warning" className="shrink-0">
                {project.highPriorityOpenLearningItems} high-priority open
              </Badge>
            )}
          </div>
          {project.description && <p className="mt-0.5 text-xs text-muted line-clamp-2">{project.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {project.sector && (
              <Badge variant="outline" className="capitalize">
                {project.sector.replace(/_/g, " ")}
              </Badge>
            )}
            {project.fundingInstruments.map((fi) => (
              <Badge key={fi.id} variant="muted">
                {INSTRUMENT_LABEL[fi.instrumentType]} · {fi.capitalProviderName}
              </Badge>
            ))}
            {!project.hasThesis && <Badge variant="outline">No thesis yet</Badge>}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Metrics</p>
            <MetricStatusBar status={project.metricStatus} total={project.metricTotal} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Hypotheses</p>
            <HypothesisChips counts={project.hypothesisCounts} total={project.hypothesisTotal} />
          </div>
          {project.openLearningItems > 0 && (
            <p className="text-xs text-muted">
              {project.openLearningItems} open Learning Agenda item{project.openLearningItems === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

// `showOrg` labels each project with its organization — off within a
// single org's own dashboard (redundant there), on in the cross-org
// Funder View, where a fund's projects can span more than one
// organization.
export function FundCard({ fund, showOrg = false }: { fund: FundGroup; showOrg?: boolean }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{fund.capitalProviderName}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {fund.instrumentTypes.map((t) => (
              <Badge key={t} variant="outline">
                {INSTRUMENT_LABEL[t] ?? t}
              </Badge>
            ))}
          </div>
        </div>
        {fund.totalsByCurrency.length > 0 && (
          <div className="text-right">
            {fund.totalsByCurrency.map((t) => (
              <p key={t.currency} className="text-sm font-semibold text-foreground">
                {formatCurrency(t.amount, t.currency)}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {fund.projects.length} project{fund.projects.length === 1 ? "" : "s"}
        </p>
        {fund.projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}/dashboard`}
            className="flex flex-col gap-1.5 rounded-md border border-border p-3 transition-colors hover:bg-muted-surface"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{project.name}</p>
                {showOrg && <Badge variant="outline">{project.orgName}</Badge>}
              </div>
              <span className="text-xs text-muted">View dashboard →</span>
            </div>
            <MetricStatusBar status={project.metricStatus} total={project.metricTotal} />
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function OrgDashboard({ data }: { data: OrgDashboardData }) {
  const { totals } = data;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionBand>Portfolio at a glance</SectionBand>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Projects" value={totals.projectCount} />
          <StatTile
            label="Metrics on track"
            value={totals.metricStatus.onTrack}
            sub={`of ${totals.metricTotal} reporting`}
          />
          <StatTile label="Metrics off track" value={totals.metricStatus.offTrack} />
          <StatTile
            label="Hypotheses supported"
            value={totals.hypothesisCounts.supported ?? 0}
            sub={`of ${totals.hypothesisTotal} total`}
          />
          <StatTile label="Funds / capital providers" value={totals.distinctFundCount} sub={`${totals.fundingInstrumentCount} instruments`} />
          <StatTile
            label="Open learning items"
            value={totals.openLearningItems}
            sub={totals.highPriorityOpenLearningItems > 0 ? `${totals.highPriorityOpenLearningItems} high priority` : undefined}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionBand>Results summary</SectionBand>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All projects</TabsTrigger>
            <TabsTrigger value="fund">By fund</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {data.projectSummaries.length === 0 ? (
              <p className="pt-3 text-sm text-muted">No projects yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 pt-3 md:grid-cols-2">
                {data.projectSummaries.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fund">
            {data.fundGroups.length === 0 ? (
              <p className="pt-3 text-sm text-muted">
                No Funding Instruments recorded yet — they show up here, grouped by capital provider, once a
                project has one (visible on that project&apos;s Settings tab).
              </p>
            ) : (
              <div className="flex flex-col gap-3 pt-3">
                {data.fundGroups.map((fund) => (
                  <FundCard key={fund.capitalProviderName} fund={fund} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
