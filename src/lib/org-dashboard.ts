import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  organizations,
  projects,
  fundingInstruments,
  climateTheses,
  impactHypotheses,
  metrics,
  metricTargets,
  metricObservations,
  learningAgendaItems,
} from "@/db/schema";
import { buildPeriodRows, latestRow } from "@/lib/metrics";

/**
 * Read-only aggregation for the Organization Dashboard (the app's landing
 * page) and the cross-organization Funder View. Everything here is a
 * `SELECT` — no writes, no Server Actions — kept out of actions.ts (which
 * is exclusively project-scoped reads/writes) since this is the one place
 * the app rolls data up across more than one project at a time.
 *
 * "By fund" grouping — a design decision, not a spec-literal term: the
 * data model has no first-class Fund entity (see
 * claude/mel-tool-generalization-decisions.md — a fund's core thesis was
 * discussed only as a future extension, not built). The closest existing
 * concept is the Funding Instrument's `capitalProviderName` (spec Section
 * 3a) — grouping by that name is what "by fund" means here: every
 * capital-provider relationship, grant, debt, or equity, gathered under
 * one heading. A project with more than one Funding Instrument (BRARE,
 * e.g.) legitimately appears under more than one fund — that's a real
 * multi-capital-provider project, not a bug.
 *
 * A funder's own relationships aren't bounded by one implementing
 * organization, so `getFunderDashboardData()` runs the exact same
 * grouping across every organization at once — a donor/funder view of the
 * whole system, not just one workspace. It's the same aggregation code as
 * `getOrgDashboardData()` (see `summarizeProjects` below), just handed a
 * wider project list and asked to also carry each project's organization
 * name along.
 */

export type MetricStatusCounts = {
  onTrack: number;
  offTrack: number;
  noData: number;
  noComparison: number;
};

export type ProjectSummary = {
  id: number;
  name: string;
  description: string | null;
  sector: string | null;
  createdAt: string;
  orgId: number;
  orgName: string;
  hasThesis: boolean;
  hypothesisCounts: Record<string, number>;
  hypothesisTotal: number;
  metricStatus: MetricStatusCounts;
  metricTotal: number;
  openLearningItems: number;
  highPriorityOpenLearningItems: number;
  fundingInstruments: (typeof fundingInstruments.$inferSelect)[];
};

export type FundGroup = {
  capitalProviderName: string;
  instrumentTypes: string[];
  totalsByCurrency: { currency: string; amount: number }[];
  projects: ProjectSummary[];
};

export type PortfolioTotals = {
  projectCount: number;
  hypothesisCounts: Record<string, number>;
  hypothesisTotal: number;
  metricStatus: MetricStatusCounts;
  metricTotal: number;
  openLearningItems: number;
  highPriorityOpenLearningItems: number;
  fundingInstrumentCount: number;
  distinctFundCount: number;
};

export type OrgDashboardData = {
  orgId: number;
  orgName: string;
  projectSummaries: ProjectSummary[];
  fundGroups: FundGroup[];
  totals: PortfolioTotals;
};

export type FunderDashboardData = {
  orgCount: number;
  fundGroups: FundGroup[];
  totals: PortfolioTotals;
};

const HYPOTHESIS_STATUSES = ["untested", "testing", "supported", "refuted", "inconclusive"] as const;

function emptyMetricStatus(): MetricStatusCounts {
  return { onTrack: 0, offTrack: 0, noData: 0, noComparison: 0 };
}

function addMetricStatus(a: MetricStatusCounts, b: MetricStatusCounts): MetricStatusCounts {
  return {
    onTrack: a.onTrack + b.onTrack,
    offTrack: a.offTrack + b.offTrack,
    noData: a.noData + b.noData,
    noComparison: a.noComparison + b.noComparison,
  };
}

function emptyTotals(): PortfolioTotals {
  return {
    projectCount: 0,
    hypothesisCounts: Object.fromEntries(HYPOTHESIS_STATUSES.map((s) => [s, 0])),
    hypothesisTotal: 0,
    metricStatus: emptyMetricStatus(),
    metricTotal: 0,
    openLearningItems: 0,
    highPriorityOpenLearningItems: 0,
    fundingInstrumentCount: 0,
    distinctFundCount: 0,
  };
}

// Shared aggregation core: given a set of projects (one organization's, or
// every organization's at once) and a lookup for each project's org
// name, computes per-project summaries, "by fund" groups, and portfolio
// totals. Used by both getOrgDashboardData (single org) and
// getFunderDashboardData (all orgs).
async function summarizeProjects(
  projectRows: (typeof projects.$inferSelect)[],
  orgNameById: Map<number, string>,
): Promise<{ projectSummaries: ProjectSummary[]; fundGroups: FundGroup[]; totals: PortfolioTotals }> {
  if (projectRows.length === 0) {
    return { projectSummaries: [], fundGroups: [], totals: emptyTotals() };
  }

  const projectIds = projectRows.map((p) => p.id);

  const [allInstruments, allTheses, allLearningItems] = await Promise.all([
    db.select().from(fundingInstruments).where(inArray(fundingInstruments.projectId, projectIds)),
    db.select().from(climateTheses).where(inArray(climateTheses.projectId, projectIds)),
    db.select().from(learningAgendaItems).where(inArray(learningAgendaItems.projectId, projectIds)),
  ]);

  const currentThesisByProject = new Map<number, (typeof allTheses)[number]>();
  for (const t of allTheses) {
    if (!t.isCurrent) continue;
    currentThesisByProject.set(t.projectId, t);
  }
  const thesisIds = Array.from(currentThesisByProject.values()).map((t) => t.id);

  const allHypotheses = thesisIds.length
    ? await db.select().from(impactHypotheses).where(inArray(impactHypotheses.thesisId, thesisIds))
    : [];
  const hypothesesByThesisId = new Map<number, typeof allHypotheses>();
  for (const h of allHypotheses) {
    const list = hypothesesByThesisId.get(h.thesisId) ?? [];
    list.push(h);
    hypothesesByThesisId.set(h.thesisId, list);
  }

  const allMetrics = await db.select().from(metrics).where(inArray(metrics.projectId, projectIds));
  const metricIds = allMetrics.map((m) => m.id);
  const [allTargets, allObservations] = metricIds.length
    ? await Promise.all([
        db.select().from(metricTargets).where(inArray(metricTargets.metricId, metricIds)),
        db.select().from(metricObservations).where(inArray(metricObservations.metricId, metricIds)),
      ])
    : [[], []];

  const targetsByMetric = new Map<number, typeof allTargets>();
  for (const t of allTargets) {
    const list = targetsByMetric.get(t.metricId) ?? [];
    list.push(t);
    targetsByMetric.set(t.metricId, list);
  }
  const observationsByMetric = new Map<number, typeof allObservations>();
  for (const o of allObservations) {
    const list = observationsByMetric.get(o.metricId) ?? [];
    list.push(o);
    observationsByMetric.set(o.metricId, list);
  }

  function computeMetricStatusForProject(projectId: number): { status: MetricStatusCounts; total: number } {
    const projectMetrics = allMetrics.filter((m) => m.projectId === projectId);
    const status = emptyMetricStatus();
    for (const metric of projectMetrics) {
      const targetsForMetric = targetsByMetric.get(metric.id) ?? [];
      const observationsForMetric = (observationsByMetric.get(metric.id) ?? []).filter((o) => o.status === "accepted");
      const rows = buildPeriodRows(metric, targetsForMetric, observationsForMetric);
      const current = latestRow(rows);
      if (!current) {
        status.noComparison += 1;
      } else if (current.status === "on_track") status.onTrack += 1;
      else if (current.status === "off_track") status.offTrack += 1;
      else if (current.status === "no_data") status.noData += 1;
      else status.noComparison += 1;
    }
    return { status, total: projectMetrics.length };
  }

  const projectSummaries: ProjectSummary[] = projectRows.map((project) => {
    const thesis = currentThesisByProject.get(project.id) ?? null;
    const hypotheses = thesis ? hypothesesByThesisId.get(thesis.id) ?? [] : [];
    const hypothesisCounts = Object.fromEntries(
      HYPOTHESIS_STATUSES.map((s) => [s, hypotheses.filter((h) => h.status === s).length]),
    );
    const { status: metricStatus, total: metricTotal } = computeMetricStatusForProject(project.id);
    const projectLearningItems = allLearningItems.filter((item) => item.projectId === project.id);
    const openLearningItems = projectLearningItems.filter((i) => i.status === "open" || i.status === "in_progress").length;
    const highPriorityOpenLearningItems = projectLearningItems.filter(
      (i) => i.priority === "high" && (i.status === "open" || i.status === "in_progress"),
    ).length;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      sector: project.sector,
      createdAt: project.createdAt,
      orgId: project.orgId,
      orgName: orgNameById.get(project.orgId) ?? "Unknown organization",
      hasThesis: thesis != null,
      hypothesisCounts,
      hypothesisTotal: hypotheses.length,
      metricStatus,
      metricTotal,
      openLearningItems,
      highPriorityOpenLearningItems,
      fundingInstruments: allInstruments.filter((fi) => fi.projectId === project.id),
    };
  });

  // ---- "By fund" grouping (see module doc comment) ----
  const fundGroupMap = new Map<string, FundGroup>();
  for (const summary of projectSummaries) {
    for (const instrument of summary.fundingInstruments) {
      const key = instrument.capitalProviderName;
      let group = fundGroupMap.get(key);
      if (!group) {
        group = { capitalProviderName: key, instrumentTypes: [], totalsByCurrency: [], projects: [] };
        fundGroupMap.set(key, group);
      }
      if (!group.instrumentTypes.includes(instrument.instrumentType)) {
        group.instrumentTypes.push(instrument.instrumentType);
      }
      if (instrument.amount != null) {
        const currency = instrument.currency ?? "USD";
        const existing = group.totalsByCurrency.find((t) => t.currency === currency);
        if (existing) existing.amount += instrument.amount;
        else group.totalsByCurrency.push({ currency, amount: instrument.amount });
      }
      if (!group.projects.some((p) => p.id === summary.id)) {
        group.projects.push(summary);
      }
    }
  }
  const fundGroups = Array.from(fundGroupMap.values()).sort((a, b) =>
    a.capitalProviderName.localeCompare(b.capitalProviderName),
  );

  const totals: PortfolioTotals = {
    projectCount: projectRows.length,
    hypothesisCounts: Object.fromEntries(
      HYPOTHESIS_STATUSES.map((s) => [s, projectSummaries.reduce((sum, p) => sum + p.hypothesisCounts[s], 0)]),
    ),
    hypothesisTotal: projectSummaries.reduce((sum, p) => sum + p.hypothesisTotal, 0),
    metricStatus: projectSummaries.reduce((acc, p) => addMetricStatus(acc, p.metricStatus), emptyMetricStatus()),
    metricTotal: projectSummaries.reduce((sum, p) => sum + p.metricTotal, 0),
    openLearningItems: projectSummaries.reduce((sum, p) => sum + p.openLearningItems, 0),
    highPriorityOpenLearningItems: projectSummaries.reduce((sum, p) => sum + p.highPriorityOpenLearningItems, 0),
    fundingInstrumentCount: projectSummaries.reduce((sum, p) => sum + p.fundingInstruments.length, 0),
    distinctFundCount: fundGroups.length,
  };

  return { projectSummaries, fundGroups, totals };
}

// One organization's dashboard. Pass `orgId` to target a specific
// organization (e.g. from /orgs/[orgId]); omit it to fall back to the
// first organization on record, matching getDefaultOrgId() in
// actions.ts — the zero-friction path for the common single-org case,
// and what the landing page uses when there's only one org to show.
// Read-only: never creates an organization row, unlike
// getDefaultOrgId() — the dashboard should show an empty state, not
// silently create an org, if none exists yet.
export async function getOrgDashboardData(orgId?: number): Promise<OrgDashboardData | null> {
  const org = orgId != null
    ? (await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1))[0]
    : (await db.select().from(organizations).limit(1))[0];
  if (!org) return null;

  const orgProjects = await db.select().from(projects).where(eq(projects.orgId, org.id));
  const orgNameById = new Map([[org.id, org.name]]);
  const { projectSummaries, fundGroups, totals } = await summarizeProjects(orgProjects, orgNameById);

  return { orgId: org.id, orgName: org.name, projectSummaries, fundGroups, totals };
}

export async function getAllOrganizationsWithCounts(): Promise<
  { id: number; name: string; createdAt: string; projectCount: number }[]
> {
  const [allOrgs, allProjects] = await Promise.all([
    db.select().from(organizations),
    db.select().from(projects),
  ]);
  return allOrgs
    .map((org) => ({
      ...org,
      projectCount: allProjects.filter((p) => p.orgId === org.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Cross-organization "by fund" rollup — a donor/funder's own view, which
// is never bounded by one implementing organization. Same aggregation as
// getOrgDashboardData, just handed every project across every
// organization; each ProjectSummary carries its orgName so a fund
// group's project list can show which organization each project belongs
// to.
export async function getFunderDashboardData(): Promise<FunderDashboardData> {
  const [allOrgs, allProjects] = await Promise.all([
    db.select().from(organizations),
    db.select().from(projects),
  ]);
  const orgNameById = new Map(allOrgs.map((o) => [o.id, o.name]));
  const { fundGroups, totals } = await summarizeProjects(allProjects, orgNameById);
  return { orgCount: allOrgs.length, fundGroups, totals };
}
