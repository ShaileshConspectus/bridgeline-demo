"use server";

import { eq, and, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import {
  organizations,
  projects,
  climateTheses,
  tocRungs,
  objectiveOutputActivities,
  impactHypotheses,
  assumptionRisks,
  metrics,
  hypothesisMetricLinks,
  metricTargets,
  metricObservations,
  jurisdictions,
  jurisdictionBaselines,
  metricCapitalProviderTags,
  observationQualityChecks,
  verificationRecords,
  useCases,
  certificationRecords,
  engagementFunnelStages,
  commercialValueChainStages,
  learningAgendaItems,
  fundingInstruments,
} from "@/db/schema";
import { IRIS_PLUS_CATALOG, SDG_CATALOG } from "@/lib/catalog";
import { runObservationVerification } from "@/lib/verification";
import { isCertificationCurrent, checkSurveyFatigue } from "@/lib/evidence";

// Fallback for callers that don't specify an organization — kept for
// back-compat (and used when a project-create form is submitted with
// neither an existing org selected nor a new one named). Creates a
// default org only if none exists at all yet.
async function getDefaultOrgId(): Promise<number> {
  const existing = await db.select().from(organizations).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [created] = await db
    .insert(organizations)
    .values({ name: "Default Organization" })
    .returning();
  return created.id;
}

// ---------- Organizations ----------
// The app started as a single-org prototype (everything hung off
// getDefaultOrgId() above); organizations are now a first-class,
// user-manageable concept so a project can be explicitly attributed to
// the org running it, and a funder/donor can see their relationships
// rolled up across every organization they support (see
// src/lib/org-dashboard.ts's getFunderDashboardData and the /funders
// page) — not just within one workspace.

export async function getAllOrganizations() {
  return db.select().from(organizations).orderBy(asc(organizations.name));
}

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Organization name is required.");

  const [org] = await db.insert(organizations).values({ name }).returning();

  revalidatePath("/organizations");
  revalidatePath("/");
  revalidatePath("/projects");
  redirect(`/orgs/${org.id}`);
}

// ---------- Projects ----------

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Project name is required.");

  // A project is explicitly linked to an organization at creation, per
  // the resolved design: this is what makes "by fund"/"by org" portfolio
  // views and the cross-org Funder View meaningful, rather than every
  // project silently landing in one default workspace. The create form
  // offers a dropdown of existing orgs plus an inline "or create a new
  // organization" field; either is accepted here, and if neither is
  // filled in (e.g. a very first run before any org exists) it falls
  // back to the single-org default so the prototype still works
  // out of the box.
  const newOrgName = String(formData.get("newOrgName") ?? "").trim();
  const orgIdRaw = String(formData.get("orgId") ?? "").trim();

  let orgId: number;
  if (newOrgName) {
    const [org] = await db.insert(organizations).values({ name: newOrgName }).returning();
    orgId = org.id;
  } else if (orgIdRaw) {
    orgId = Number(orgIdRaw);
  } else {
    orgId = await getDefaultOrgId();
  }

  const [project] = await db
    .insert(projects)
    .values({ orgId, name, description: description || null })
    .returning();

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/organizations");
  revalidatePath(`/orgs/${orgId}`);
  revalidatePath("/funders");
  redirect(`/projects/${project.id}`);
}

export async function toggleProjectLens(
  projectId: number,
  lens: "engagementFunnelEnabled" | "commercialValueChainEnabled",
  value: boolean,
) {
  await db
    .update(projects)
    .set({ [lens]: value })
    .where(eq(projects.id, projectId));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- Funding Instruments (spec Section 3a — capital-structure-agnostic) ----------

function revalidateFundingInstruments(projectId: number, orgId?: number) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/reports`);
  revalidatePath(`/projects/${projectId}/reports/investor-update`);
  revalidatePath(`/projects/${projectId}/reports/loan-covenant`);
  revalidatePath(`/projects/${projectId}/learning`);
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/funders");
  if (orgId != null) revalidatePath(`/orgs/${orgId}`);
}

export async function addFundingInstrument(projectId: number, formData: FormData) {
  const capitalProviderName = String(formData.get("capitalProviderName") ?? "").trim();
  const instrumentType = String(formData.get("instrumentType") ?? "grant") as
    | "grant"
    | "debt"
    | "equity"
    | "blended"
    | "self_funded";
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const reportingRequirement = String(formData.get("reportingRequirement") ?? "").trim();
  const covenantOrMilestoneTerms = String(formData.get("covenantOrMilestoneTerms") ?? "").trim();
  const renewalOrTrancheTrigger = String(formData.get("renewalOrTrancheTrigger") ?? "").trim();
  if (!capitalProviderName) throw new Error("Capital provider name is required.");

  await db.insert(fundingInstruments).values({
    projectId,
    capitalProviderName,
    instrumentType,
    amount: amountRaw ? Number(amountRaw) : null,
    currency: currency || "USD",
    startDate: startDate || null,
    endDate: endDate || null,
    reportingRequirement: reportingRequirement || null,
    covenantOrMilestoneTerms: covenantOrMilestoneTerms || null,
    renewalOrTrancheTrigger: renewalOrTrancheTrigger || null,
  });

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  revalidateFundingInstruments(projectId, project?.orgId);
}

export async function deleteFundingInstrument(instrumentId: number, projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  await db.delete(fundingInstruments).where(eq(fundingInstruments.id, instrumentId));
  revalidateFundingInstruments(projectId, project?.orgId);
}

// ---------- Thesis ----------

export async function getCurrentThesis(projectId: number) {
  const rows = await db
    .select()
    .from(climateTheses)
    .where(and(eq(climateTheses.projectId, projectId), eq(climateTheses.isCurrent, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getThesisHistory(projectId: number) {
  return db
    .select()
    .from(climateTheses)
    .where(eq(climateTheses.projectId, projectId))
    .orderBy(desc(climateTheses.version));
}

// Creates version 1, or (if a current thesis exists) revises it: the old
// row's isCurrent flips to false and a new versioned row is inserted, per
// the spec's "versioned via new rows, not overwrites" design.
export async function saveThesis(projectId: number, formData: FormData) {
  const statement = String(formData.get("statement") ?? "").trim();
  const problem = String(formData.get("problem") ?? "").trim();
  const targetPopulation = String(formData.get("targetPopulation") ?? "").trim();
  const geography = String(formData.get("geography") ?? "").trim();
  const expectedChange = String(formData.get("expectedChange") ?? "").trim();
  const timeHorizon = String(formData.get("timeHorizon") ?? "").trim();
  const changeNote = String(formData.get("changeNote") ?? "").trim();

  if (!statement) throw new Error("Thesis statement is required.");

  const current = await getCurrentThesis(projectId);

  if (!current) {
    await db.insert(climateTheses).values({
      projectId,
      version: 1,
      isCurrent: true,
      statement,
      problem: problem || null,
      targetPopulation: targetPopulation || null,
      geography: geography || null,
      expectedChange: expectedChange || null,
      timeHorizon: timeHorizon || null,
      changeNote: changeNote || "Initial thesis.",
    });
  } else {
    await db
      .update(climateTheses)
      .set({ isCurrent: false })
      .where(eq(climateTheses.id, current.id));
    await db.insert(climateTheses).values({
      projectId,
      version: current.version + 1,
      isCurrent: true,
      statement,
      problem: problem || null,
      targetPopulation: targetPopulation || null,
      geography: geography || null,
      expectedChange: expectedChange || null,
      timeHorizon: timeHorizon || null,
      changeNote: changeNote || null,
    });
  }

  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- ToC rungs ----------

export async function addTocRung(thesisId: number, projectId: number, formData: FormData) {
  const rungType = String(formData.get("rungType")) as
    | "input"
    | "process"
    | "output"
    | "intermediate_outcome"
    | "outcome"
    | "impact";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const yearHorizon = String(formData.get("yearHorizon") ?? "").trim();
  if (!title) throw new Error("Rung title is required.");

  await db.insert(tocRungs).values({
    thesisId,
    rungType,
    title,
    description: description || null,
    yearHorizon: yearHorizon || null,
  });

  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function updateTocRung(rungId: number, projectId: number, formData: FormData) {
  const rungType = String(formData.get("rungType")) as
    | "input"
    | "process"
    | "output"
    | "intermediate_outcome"
    | "outcome"
    | "impact";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const yearHorizon = String(formData.get("yearHorizon") ?? "").trim();
  if (!title) throw new Error("Rung title is required.");

  await db
    .update(tocRungs)
    .set({
      rungType,
      title,
      description: description || null,
      yearHorizon: yearHorizon || null,
    })
    .where(eq(tocRungs.id, rungId));

  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function deleteTocRung(rungId: number, projectId: number) {
  await db.delete(tocRungs).where(eq(tocRungs.id, rungId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- Objective / Output / Activity ----------

export async function addOoaNode(thesisId: number, projectId: number, formData: FormData) {
  const kind = String(formData.get("kind")) as "objective" | "output" | "activity";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const parentIdRaw = String(formData.get("parentId") ?? "");
  const linkedRungIdRaw = String(formData.get("linkedTocRungId") ?? "");
  if (!title) throw new Error("Title is required.");

  await db.insert(objectiveOutputActivities).values({
    thesisId,
    kind,
    title,
    description: description || null,
    code: code || null,
    parentId: parentIdRaw ? Number(parentIdRaw) : null,
    linkedTocRungId: linkedRungIdRaw ? Number(linkedRungIdRaw) : null,
  });

  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function deleteOoaNode(nodeId: number, projectId: number) {
  await db.delete(objectiveOutputActivities).where(eq(objectiveOutputActivities.id, nodeId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- Impact hypotheses ----------

export async function addHypothesis(thesisId: number, projectId: number, formData: FormData) {
  const statement = String(formData.get("statement") ?? "").trim();
  const fromRungIdRaw = String(formData.get("fromRungId") ?? "");
  const toRungIdRaw = String(formData.get("toRungId") ?? "");
  const linkedEngagementStageIdRaw = String(formData.get("linkedEngagementStageId") ?? "");
  const linkedCommercialStageIdRaw = String(formData.get("linkedCommercialStageId") ?? "");
  const confidenceNote = String(formData.get("confidenceNote") ?? "").trim();
  if (!statement) throw new Error("Hypothesis statement is required.");

  await db.insert(impactHypotheses).values({
    thesisId,
    statement,
    fromRungId: fromRungIdRaw ? Number(fromRungIdRaw) : null,
    toRungId: toRungIdRaw ? Number(toRungIdRaw) : null,
    // Parallel-lens links (spec Decision 8 / Engagement Funnel section):
    // a hypothesis can reference a commercial or engagement milestone
    // alongside its impact rung — never merged into the impact chain.
    linkedEngagementStageId: linkedEngagementStageIdRaw ? Number(linkedEngagementStageIdRaw) : null,
    linkedCommercialStageId: linkedCommercialStageIdRaw ? Number(linkedCommercialStageIdRaw) : null,
    confidenceNote: confidenceNote || null,
  });

  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function updateHypothesisStatus(
  hypothesisId: number,
  projectId: number,
  status: "untested" | "testing" | "supported" | "refuted" | "inconclusive",
) {
  await db.update(impactHypotheses).set({ status }).where(eq(impactHypotheses.id, hypothesisId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

// Post-creation edit for a hypothesis's parallel-lens links (spec Section
// 3.3/12): originally set-at-creation only, matching how fromRungId/
// toRungId worked before rung editing existed. A second-pass audit
// correctly flagged this as a real gap — changing a project's commercial
// milestones or engagement thresholds shouldn't require deleting and
// recreating hypotheses just to re-point the link. Either field can be
// cleared by passing an empty string, so a stage that's been removed can
// be unlinked without deleting the hypothesis itself.
export async function updateHypothesisStageLinks(hypothesisId: number, projectId: number, formData: FormData) {
  const linkedEngagementStageIdRaw = String(formData.get("linkedEngagementStageId") ?? "");
  const linkedCommercialStageIdRaw = String(formData.get("linkedCommercialStageId") ?? "");
  await db
    .update(impactHypotheses)
    .set({
      linkedEngagementStageId: linkedEngagementStageIdRaw ? Number(linkedEngagementStageIdRaw) : null,
      linkedCommercialStageId: linkedCommercialStageIdRaw ? Number(linkedCommercialStageIdRaw) : null,
    })
    .where(eq(impactHypotheses.id, hypothesisId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function deleteHypothesis(hypothesisId: number, projectId: number) {
  await db.delete(assumptionRisks).where(eq(assumptionRisks.hypothesisId, hypothesisId));
  await db.delete(hypothesisMetricLinks).where(eq(hypothesisMetricLinks.hypothesisId, hypothesisId));
  await db.delete(impactHypotheses).where(eq(impactHypotheses.id, hypothesisId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function addAssumptionRisk(hypothesisId: number, projectId: number, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("Description is required.");
  await db.insert(assumptionRisks).values({ hypothesisId, description });
  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function deleteAssumptionRisk(id: number, projectId: number) {
  await db.delete(assumptionRisks).where(eq(assumptionRisks.id, id));
  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- Engagement Funnel (parallel lens, digital/platform interventions) ----------
// Spec: a fixed 4-stage funnel (Reach -> Active Uptake -> Meaningful
// Uptake -> Outcome) with per-project threshold definitions — not a
// free-form list like the Commercial Value Chain below, since the
// stage names themselves are part of the practice being modeled.

const ENGAGEMENT_STAGES = ["reach", "active_uptake", "meaningful_uptake", "outcome"] as const;

export async function listEngagementFunnelStages(thesisId: number) {
  return db.select().from(engagementFunnelStages).where(eq(engagementFunnelStages.thesisId, thesisId));
}

// Idempotent: creates the four fixed stages (empty threshold
// definitions) if none exist yet for this thesis.
export async function ensureEngagementFunnelStages(thesisId: number, projectId: number) {
  const existing = await listEngagementFunnelStages(thesisId);
  if (existing.length > 0) return;
  await db.insert(engagementFunnelStages).values(
    ENGAGEMENT_STAGES.map((stage, i) => ({ thesisId, stage, sortOrder: i })),
  );
  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function updateEngagementFunnelStageThreshold(stageId: number, projectId: number, formData: FormData) {
  const thresholdDefinition = String(formData.get("thresholdDefinition") ?? "").trim();
  await db
    .update(engagementFunnelStages)
    .set({ thresholdDefinition: thresholdDefinition || null })
    .where(eq(engagementFunnelStages.id, stageId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- Commercial Value Chain (parallel lens, for-profit ventures) ----------
// Spec Decision 8: an optional parallel causal chain for "path to
// revenue"/"path to commercial scale" milestones, kept structurally
// separate from the impact ToC so a revenue milestone is never treated
// as evidence of climate impact. Free-form ordered list, since a
// venture's commercial milestones aren't a fixed taxonomy the way the
// Engagement Funnel's four stages are.

export async function listCommercialValueChainStages(thesisId: number) {
  return db
    .select()
    .from(commercialValueChainStages)
    .where(eq(commercialValueChainStages.thesisId, thesisId))
    .orderBy(asc(commercialValueChainStages.sortOrder));
}

export async function addCommercialValueChainStage(thesisId: number, projectId: number, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Stage title is required.");

  const existing = await listCommercialValueChainStages(thesisId);
  const sortOrder = existing.length ? Math.max(...existing.map((s) => s.sortOrder)) + 1 : 0;

  await db.insert(commercialValueChainStages).values({
    thesisId,
    title,
    description: description || null,
    sortOrder,
  });
  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function updateCommercialValueChainStage(stageId: number, projectId: number, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Stage title is required.");

  await db
    .update(commercialValueChainStages)
    .set({ title, description: description || null })
    .where(eq(commercialValueChainStages.id, stageId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

export async function deleteCommercialValueChainStage(stageId: number, projectId: number) {
  // Unlink first so a deleted stage can't leave a dangling reference on
  // a hypothesis (linkedCommercialStageId has no ON DELETE rule in SQLite
  // by default).
  await db
    .update(impactHypotheses)
    .set({ linkedCommercialStageId: null })
    .where(eq(impactHypotheses.linkedCommercialStageId, stageId));
  await db.delete(commercialValueChainStages).where(eq(commercialValueChainStages.id, stageId));
  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- AI draft acceptance ----------

// Bulk-inserts the rungs/hypotheses the user kept after reviewing an
// AI-assisted draft (see src/lib/ai/thesis-assistant.ts). Nothing from
// the AI draft is ever written until the user explicitly accepts it here.
export async function acceptThesisDraft(
  thesisId: number,
  projectId: number,
  rungs: { rungType: string; title: string; description: string }[],
  hypotheses: {
    statement: string;
    fromRungType: string | null;
    toRungType: string | null;
    assumptions: string[];
  }[],
) {
  const rungTypeToId = new Map<string, number>();

  for (const [i, r] of rungs.entries()) {
    const [inserted] = await db
      .insert(tocRungs)
      .values({
        thesisId,
        rungType: r.rungType as never,
        title: r.title,
        description: r.description || null,
        sortOrder: i,
      })
      .returning();
    // Last one wins if multiple rungs share a rungType — good enough for
    // linking hypotheses drafted against the same set.
    rungTypeToId.set(r.rungType, inserted.id);
  }

  for (const h of hypotheses) {
    const [insertedHyp] = await db
      .insert(impactHypotheses)
      .values({
        thesisId,
        statement: h.statement,
        fromRungId: h.fromRungType ? rungTypeToId.get(h.fromRungType) ?? null : null,
        toRungId: h.toRungType ? rungTypeToId.get(h.toRungType) ?? null : null,
      })
      .returning();

    for (const a of h.assumptions) {
      if (a.trim()) {
        await db.insert(assumptionRisks).values({ hypothesisId: insertedHyp.id, description: a });
      }
    }
  }

  revalidatePath(`/projects/${projectId}/thesis`);
}

// ---------- Metrics Library (Module 2, Phase 1c) ----------

function revalidateMetrics(projectId: number) {
  revalidatePath(`/projects/${projectId}/metrics`);
  revalidatePath(`/projects/${projectId}/dashboard`);
  revalidatePath(`/projects/${projectId}/reports/grant-narrative`);
}

export async function listProjectMetrics(projectId: number) {
  return db.select().from(metrics).where(eq(metrics.projectId, projectId));
}

// "Check before you write" duplicate finder (spec Module 2, workflow 3):
// simple keyword match against name/code/ToC location, surfaced in the
// bespoke metric builder before a new metric is created.
export async function findSimilarMetrics(projectId: number, query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  const projectMetrics = await db.select().from(metrics).where(eq(metrics.projectId, projectId));
  return projectMetrics.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.code ?? "").toLowerCase().includes(q) ||
      (m.tocLocation ?? "").toLowerCase().includes(q),
  );
}

// SMART bespoke metric builder (spec workflow 2) — also the general path
// for editing an already-attached catalog metric's project-specific
// metadata (ToC location, justification, disaggregation, tags handled
// separately).
export async function addBespokeMetric(projectId: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const tocLocation = String(formData.get("tocLocation") ?? "").trim();
  const directionOfGoodRaw = String(formData.get("directionOfGood") ?? "");
  const definitionMethodsSource = String(formData.get("definitionMethodsSource") ?? "").trim();
  const calculationMethod = String(formData.get("calculationMethod") ?? "").trim();
  const suggestedFrequency = String(formData.get("suggestedFrequency") ?? "").trim();
  const disaggregationDimensions = String(formData.get("disaggregationDimensions") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();
  const aggregationMethodRaw = String(formData.get("aggregationMethod") ?? "sum");
  if (!name) throw new Error("Metric name is required.");

  await db.insert(metrics).values({
    projectId,
    name,
    source: "bespoke",
    code: code || null,
    unit: unit || null,
    tocLocation: tocLocation || null,
    directionOfGood: directionOfGoodRaw ? (directionOfGoodRaw as "higher_is_better" | "lower_is_better") : null,
    definitionMethodsSource: definitionMethodsSource || null,
    calculationMethod: calculationMethod || null,
    suggestedFrequency: suggestedFrequency || null,
    disaggregationDimensions: disaggregationDimensions || null,
    justification: justification || null,
    aggregationMethod: (aggregationMethodRaw as "sum" | "weighted_average" | "custom") || "sum",
  });

  revalidateMetrics(projectId);
}

// Search & attach (spec workflow 1): pull a metric from the bundled IRIS+
// or SDG catalog into the project's metrics plan, carrying its standards
// metadata forward so it flows through the same analysis pipeline as a
// bespoke metric.
export async function attachCatalogMetric(projectId: number, formData: FormData) {
  const source = String(formData.get("source") ?? "") as "iris_plus" | "sdg";
  const sourceCode = String(formData.get("sourceCode") ?? "");
  const tocLocation = String(formData.get("tocLocation") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (source === "iris_plus") {
    const entry = IRIS_PLUS_CATALOG.find((e) => e.sourceCode === sourceCode);
    if (!entry) throw new Error("Catalog entry not found.");
    await db.insert(metrics).values({
      projectId,
      name: entry.name,
      source: "iris_plus",
      sourceCode: entry.sourceCode,
      unit: entry.unit,
      directionOfGood: entry.directionOfGood,
      tocLocation: tocLocation || null,
      definitionMethodsSource: entry.definition,
      justification: justification || null,
    });
  } else if (source === "sdg") {
    const entry = SDG_CATALOG.find((e) => e.sourceCode === sourceCode);
    if (!entry) throw new Error("Catalog entry not found.");
    await db.insert(metrics).values({
      projectId,
      name: entry.indicator,
      source: "sdg",
      sourceCode: entry.sourceCode,
      unit: entry.unit,
      tocLocation: tocLocation || null,
      definitionMethodsSource: `${entry.goal} · ${entry.target} (Tier ${entry.tier})`,
      justification: justification || null,
    });
  } else {
    throw new Error("Unknown catalog source.");
  }

  revalidateMetrics(projectId);
}

export async function updateMetricRequiresElevatedVerification(metricId: number, projectId: number, value: boolean) {
  await db.update(metrics).set({ requiresElevatedVerification: value }).where(eq(metrics.id, metricId));
  revalidateMetrics(projectId);
}

export async function deleteMetric(metricId: number, projectId: number) {
  // Every observation this metric ever received went through the
  // verification pipeline (src/lib/verification.ts), which always writes
  // at least one observation_quality_checks row and usually a
  // verification_records row too. observation_quality_checks.observationId
  // is a NOT NULL foreign key to metric_observations.id, and this app runs
  // with PRAGMA foreign_keys = ON (src/db/client.ts) — so deleting
  // metric_observations directly, as this used to do, throws "FOREIGN KEY
  // constraint failed" the moment a metric has ever had a result reported
  // against it (i.e. almost always), crashing the request instead of
  // deleting anything. Fixed by deleting each observation's child rows
  // first, mirroring exactly what deleteMetricObservation already does
  // per observation (below).
  const observations = await db
    .select({ id: metricObservations.id })
    .from(metricObservations)
    .where(eq(metricObservations.metricId, metricId));
  for (const { id: observationId } of observations) {
    await db.delete(observationQualityChecks).where(eq(observationQualityChecks.observationId, observationId));
    await db
      .delete(verificationRecords)
      .where(and(eq(verificationRecords.recordType, "observation"), eq(verificationRecords.recordId, observationId)));
  }
  await db.delete(metricObservations).where(eq(metricObservations.metricId, metricId));

  // certification_records.linked_metric_id and learning_agenda_items.linked_metric_id
  // are nullable FKs to this metric — a certification or Learning Agenda
  // item referencing it is its own independent record, so unlink rather
  // than delete, then the metric itself can be removed without violating
  // either foreign key.
  await db
    .update(certificationRecords)
    .set({ linkedMetricId: null })
    .where(eq(certificationRecords.linkedMetricId, metricId));
  await db
    .update(learningAgendaItems)
    .set({ linkedMetricId: null })
    .where(eq(learningAgendaItems.linkedMetricId, metricId));

  await db.delete(hypothesisMetricLinks).where(eq(hypothesisMetricLinks.metricId, metricId));
  await db.delete(metricTargets).where(eq(metricTargets.metricId, metricId));
  await db.delete(jurisdictionBaselines).where(eq(jurisdictionBaselines.metricId, metricId));
  await db.delete(metricCapitalProviderTags).where(eq(metricCapitalProviderTags.metricId, metricId));
  await db.delete(metrics).where(eq(metrics.id, metricId));
  revalidateMetrics(projectId);
}

export async function getProjectMetricData(projectId: number) {
  const projectMetrics = await db.select().from(metrics).where(eq(metrics.projectId, projectId));
  const metricIds = projectMetrics.map((m) => m.id);
  if (metricIds.length === 0) {
    return {
      metrics: [],
      targets: [] as (typeof metricTargets.$inferSelect)[],
      observations: [] as (typeof metricObservations.$inferSelect)[],
      tags: [] as (typeof metricCapitalProviderTags.$inferSelect)[],
      baselines: [] as (typeof jurisdictionBaselines.$inferSelect)[],
    };
  }
  const [allTargets, allObservations, allTags, allBaselines] = await Promise.all([
    Promise.all(metricIds.map((id) => db.select().from(metricTargets).where(eq(metricTargets.metricId, id)))),
    Promise.all(metricIds.map((id) => db.select().from(metricObservations).where(eq(metricObservations.metricId, id)))),
    Promise.all(metricIds.map((id) => db.select().from(metricCapitalProviderTags).where(eq(metricCapitalProviderTags.metricId, id)))),
    Promise.all(metricIds.map((id) => db.select().from(jurisdictionBaselines).where(eq(jurisdictionBaselines.metricId, id)))),
  ]);
  return {
    metrics: projectMetrics,
    targets: allTargets.flat(),
    observations: allObservations.flat(),
    tags: allTags.flat(),
    baselines: allBaselines.flat(),
  };
}

// Milestone/target setting (spec workflow 6) — three-point trajectory,
// optionally scoped to a jurisdiction, with a prompted-not-forced
// consequence severity.
export async function addMetricTarget(metricId: number, projectId: number, formData: FormData) {
  const period = String(formData.get("period") ?? "").trim();
  const baselineRaw = String(formData.get("baseline") ?? "");
  const milestoneRaw = String(formData.get("milestone") ?? "");
  const targetRaw = String(formData.get("target") ?? "");
  const milestoneDate = String(formData.get("milestoneDate") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();
  const rationale = String(formData.get("rationale") ?? "").trim();
  const jurisdictionIdRaw = String(formData.get("jurisdictionId") ?? "");
  const consequenceSeverityRaw = String(formData.get("consequenceSeverity") ?? "");
  if (!period) throw new Error("Period is required.");

  await db.insert(metricTargets).values({
    metricId,
    period,
    baseline: baselineRaw ? Number(baselineRaw) : null,
    milestone: milestoneRaw ? Number(milestoneRaw) : null,
    target: targetRaw ? Number(targetRaw) : null,
    milestoneDate: milestoneDate || null,
    targetDate: targetDate || null,
    rationale: rationale || null,
    jurisdictionId: jurisdictionIdRaw ? Number(jurisdictionIdRaw) : null,
    consequenceSeverity: consequenceSeverityRaw
      ? (consequenceSeverityRaw as "low" | "moderate" | "high")
      : null,
  });

  revalidateMetrics(projectId);
}

export async function deleteMetricTarget(targetId: number, projectId: number) {
  await db.delete(metricTargets).where(eq(metricTargets.id, targetId));
  revalidateMetrics(projectId);
}

function revalidateEvidence(projectId: number) {
  revalidatePath(`/projects/${projectId}/evidence`);
  revalidatePath(`/projects/${projectId}/dashboard`);
  revalidatePath(`/projects/${projectId}/reports/grant-narrative`);
}

// Whether a metric that requires elevated verification has a current
// (non-expired) Certification/Audit Record linked to it. Shared by the
// verification pipeline (informational check) and by decideObservation
// (the actual enforcement gate — see Section 6/9.3 of the spec: "the
// review queue visibly requires a linked Certification/Audit Record
// before an Observation can be marked accepted").
async function hasCurrentCertificationForMetric(metricId: number, requiresElevatedVerification: boolean) {
  if (!requiresElevatedVerification) return true;
  const linkedCerts = await db.select().from(certificationRecords).where(eq(certificationRecords.linkedMetricId, metricId));
  return linkedCerts.some((c) => isCertificationCurrent(c));
}

// Runs the rules-based quality-check + verification pipeline
// (src/lib/verification.ts) against a proposed observation, given the
// metric's prior observations and any linked certification, and
// persists the observation, its per-rule QualityCheckResults, and a
// VerificationRecord together. Shared by direct entry and CSV import.
async function recordObservation(params: {
  metricId: number;
  period: string;
  actualValue: number;
  note: string | null;
  jurisdictionId: number | null;
  sourceType: "direct_entry" | "portfolio_import" | "api";
  submittedBy: string | null;
  evidenceText: string | null;
}) {
  const [metric] = await db.select().from(metrics).where(eq(metrics.id, params.metricId));
  if (!metric) throw new Error("Metric not found.");

  const priorObservations = await db
    .select({ period: metricObservations.period, actualValue: metricObservations.actualValue })
    .from(metricObservations)
    .where(eq(metricObservations.metricId, params.metricId));

  const hasCurrentCertification = await hasCurrentCertificationForMetric(metric.id, metric.requiresElevatedVerification);

  // Survey fatigue guardrail: count how many times this same
  // respondent/site (submittedBy) has already submitted a result
  // anywhere in this project, across all metrics — a respondent pool is
  // typically shared across indicators, not scoped to one metric.
  let surveyFatigue = null;
  if (params.submittedBy) {
    const projectMetricIds = (await db.select({ id: metrics.id }).from(metrics).where(eq(metrics.projectId, metric.projectId))).map(
      (m) => m.id,
    );
    const priorSubmissions = projectMetricIds.length
      ? (
          await Promise.all(
            projectMetricIds.map((id) =>
              db
                .select({ recordedAt: metricObservations.recordedAt })
                .from(metricObservations)
                .where(and(eq(metricObservations.metricId, id), eq(metricObservations.submittedBy, params.submittedBy!))),
            ),
          )
        ).flat()
      : [];
    surveyFatigue = checkSurveyFatigue(priorSubmissions);
  }

  const result = runObservationVerification({
    actualValue: params.actualValue,
    period: params.period,
    evidenceText: params.evidenceText,
    priorObservations,
    metricRequiresElevatedVerification: metric.requiresElevatedVerification,
    hasCurrentCertification,
    surveyFatigue,
  });

  const [observation] = await db
    .insert(metricObservations)
    .values({
      metricId: params.metricId,
      period: params.period,
      actualValue: params.actualValue,
      note: params.note,
      jurisdictionId: params.jurisdictionId,
      sourceType: params.sourceType,
      submittedBy: params.submittedBy,
      evidenceText: params.evidenceText,
      status: result.autoStatus,
    })
    .returning();

  if (result.checks.length > 0) {
    await db.insert(observationQualityChecks).values(
      result.checks.map((c) => ({
        observationId: observation.id,
        rule: c.rule,
        passed: c.passed,
        detail: c.detail,
      })),
    );
  }

  await db.insert(verificationRecords).values({
    recordType: "observation",
    recordId: observation.id,
    flags: JSON.stringify(result.flags),
    confidenceScore: result.confidenceScore,
    reviewerDecision: result.autoStatus === "accepted" ? "accepted" : null,
    reviewerNotes: result.autoStatus === "accepted" ? "Auto-accepted — all automated checks passed." : null,
  });

  return { observation, result };
}

export async function addMetricObservation(metricId: number, projectId: number, formData: FormData) {
  const period = String(formData.get("period") ?? "").trim();
  const actualValueRaw = String(formData.get("actualValue") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const jurisdictionIdRaw = String(formData.get("jurisdictionId") ?? "");
  const submittedBy = String(formData.get("submittedBy") ?? "").trim();
  const evidenceText = String(formData.get("evidenceText") ?? "").trim();
  if (!period) throw new Error("Period is required.");
  if (!actualValueRaw) throw new Error("Actual value is required.");

  await recordObservation({
    metricId,
    period,
    actualValue: Number(actualValueRaw),
    note: note || null,
    jurisdictionId: jurisdictionIdRaw ? Number(jurisdictionIdRaw) : null,
    sourceType: "direct_entry",
    submittedBy: submittedBy || null,
    evidenceText: evidenceText || null,
  });

  revalidateEvidence(projectId);
}

export async function deleteMetricObservation(observationId: number, projectId: number) {
  await db.delete(observationQualityChecks).where(eq(observationQualityChecks.observationId, observationId));
  await db
    .delete(verificationRecords)
    .where(and(eq(verificationRecords.recordType, "observation"), eq(verificationRecords.recordId, observationId)));
  await db.delete(metricObservations).where(eq(metricObservations.id, observationId));
  revalidateEvidence(projectId);
}

// CSV import (spec workflow 3, "Portfolio data integration" — CSV import
// ships in the prototype; live connectors are Phase 2). Expected columns:
// metric_code, period, jurisdiction, value, note (jurisdiction and note
// optional). Every row runs through the same verification pipeline as a
// direct-entry observation.
export async function importObservationsCsv(projectId: number, formData: FormData) {
  const file = formData.get("csvFile");
  if (!(file instanceof File)) throw new Error("A CSV file is required.");
  const text = await file.text();

  const projectMetrics = await db.select().from(metrics).where(eq(metrics.projectId, projectId));
  const projectJurisdictions = await db.select().from(jurisdictions).where(eq(jurisdictions.projectId, projectId));

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV file has no data rows.");

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    metricCode: header.indexOf("metric_code"),
    period: header.indexOf("period"),
    jurisdiction: header.indexOf("jurisdiction"),
    value: header.indexOf("value"),
    note: header.indexOf("note"),
  };
  if (idx.metricCode === -1 || idx.period === -1 || idx.value === -1) {
    throw new Error("CSV must include at least metric_code, period, and value columns.");
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const metricCode = cols[idx.metricCode];
    const period = cols[idx.period];
    const valueRaw = cols[idx.value];
    const jurisdictionName = idx.jurisdiction !== -1 ? cols[idx.jurisdiction] : "";
    const note = idx.note !== -1 ? cols[idx.note] : "";

    const metric = projectMetrics.find((m) => m.code === metricCode);
    if (!metric) {
      errors.push(`Row ${i + 1}: no metric with code "${metricCode}".`);
      continue;
    }
    const value = Number(valueRaw);
    if (!Number.isFinite(value)) {
      errors.push(`Row ${i + 1}: "${valueRaw}" is not a valid number.`);
      continue;
    }
    const jurisdiction = jurisdictionName ? projectJurisdictions.find((j) => j.name === jurisdictionName) : null;

    await recordObservation({
      metricId: metric.id,
      period,
      actualValue: value,
      note: note || null,
      jurisdictionId: jurisdiction?.id ?? null,
      sourceType: "portfolio_import",
      submittedBy: null,
      evidenceText: null,
    });
    imported++;
  }

  revalidateEvidence(projectId);
  return { imported, errors };
}

// ---------- Review queue ----------

export async function getReviewQueueData(projectId: number) {
  const projectMetrics = await db.select().from(metrics).where(eq(metrics.projectId, projectId));
  const metricIds = projectMetrics.map((m) => m.id);
  if (metricIds.length === 0) return { observations: [], checks: [], verifications: [] };

  const allObservations = (
    await Promise.all(metricIds.map((id) => db.select().from(metricObservations).where(eq(metricObservations.metricId, id))))
  ).flat();
  const pending = allObservations.filter((o) => o.status === "pending" || o.status === "needs_follow_up");
  const observationIds = pending.map((o) => o.id);

  const [checks, verifications] = await Promise.all([
    observationIds.length
      ? (
          await Promise.all(
            observationIds.map((id) => db.select().from(observationQualityChecks).where(eq(observationQualityChecks.observationId, id))),
          )
        ).flat()
      : [],
    observationIds.length
      ? db.select().from(verificationRecords).where(eq(verificationRecords.recordType, "observation"))
      : [],
  ]);

  return { observations: pending, checks, verifications: verifications.filter((v) => observationIds.includes(v.recordId)) };
}

export async function decideObservation(
  observationId: number,
  projectId: number,
  decision: "accepted" | "rejected" | "needs_follow_up",
  formData: FormData,
) {
  const reviewerNotes = String(formData.get("reviewerNotes") ?? "").trim();

  // Compliance gate (spec Section 6/9.3): a metric flagged
  // requires_elevated_verification cannot have an observation marked
  // accepted without a current, non-expired Certification/Audit Record
  // linked to it — the review queue must enforce this, not just flag it
  // as one more check a reviewer can override.
  if (decision === "accepted") {
    const [observation] = await db.select().from(metricObservations).where(eq(metricObservations.id, observationId));
    if (!observation) throw new Error("Observation not found.");
    const [metric] = await db.select().from(metrics).where(eq(metrics.id, observation.metricId));
    if (metric?.requiresElevatedVerification) {
      const hasCurrentCertification = await hasCurrentCertificationForMetric(metric.id, true);
      if (!hasCurrentCertification) {
        throw new Error(
          `"${metric.name}" requires elevated verification, and no current Certification/Audit Record is linked to it. Add or renew a certification for this metric in the Certifications tab before accepting this observation.`,
        );
      }
    }
  }

  await db.update(metricObservations).set({ status: decision }).where(eq(metricObservations.id, observationId));

  const [existing] = await db
    .select()
    .from(verificationRecords)
    .where(and(eq(verificationRecords.recordType, "observation"), eq(verificationRecords.recordId, observationId)));

  if (existing) {
    await db
      .update(verificationRecords)
      .set({ reviewerDecision: decision, reviewerNotes: reviewerNotes || null })
      .where(eq(verificationRecords.id, existing.id));
  } else {
    await db.insert(verificationRecords).values({
      recordType: "observation",
      recordId: observationId,
      reviewerDecision: decision,
      reviewerNotes: reviewerNotes || null,
    });
  }

  revalidateEvidence(projectId);
}

// ---------- Use Cases (qualitative evidence, stage funnel) ----------

export async function listProjectUseCases(projectId: number) {
  return db.select().from(useCases).where(eq(useCases.projectId, projectId));
}

export async function addUseCase(projectId: number, formData: FormData) {
  const origin = String(formData.get("origin") ?? "other") as "email" | "partner" | "event" | "survey" | "other";
  const sector = String(formData.get("sector") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const narrativeText = String(formData.get("narrativeText") ?? "").trim();
  const linkedHypothesisIdRaw = String(formData.get("linkedHypothesisId") ?? "");
  if (!narrativeText) throw new Error("Narrative is required.");

  await db.insert(useCases).values({
    projectId,
    origin,
    sector: sector || null,
    topic: topic || null,
    narrativeText,
    linkedHypothesisId: linkedHypothesisIdRaw ? Number(linkedHypothesisIdRaw) : null,
  });

  revalidateEvidence(projectId);
}

// Moving a use case to "outcome" or "top_outcome" is the trigger, per the
// spec, for an automatic follow-up: verificationStatus resets to
// follow-up-in-progress unless it's already been formally verified.
export async function updateUseCaseStage(
  useCaseId: number,
  projectId: number,
  stage: "interest" | "use" | "result" | "outcome" | "top_outcome" | "testimonial",
) {
  const [current] = await db.select().from(useCases).where(eq(useCases.id, useCaseId));
  const needsFollowUp = (stage === "outcome" || stage === "top_outcome") && current?.verificationStatus === "unverified";

  await db
    .update(useCases)
    .set({ stage, verificationStatus: needsFollowUp ? "follow_up_in_progress" : current?.verificationStatus })
    .where(eq(useCases.id, useCaseId));

  revalidateEvidence(projectId);
}

export async function verifyUseCase(useCaseId: number, projectId: number, formData: FormData) {
  const verifiedBy = String(formData.get("verifiedBy") ?? "").trim();
  await db
    .update(useCases)
    .set({
      verificationStatus: "verified",
      verifiedBy: verifiedBy || null,
      verifiedAt: new Date().toISOString(),
    })
    .where(eq(useCases.id, useCaseId));
  revalidateEvidence(projectId);
}

export async function deleteUseCase(useCaseId: number, projectId: number) {
  await db.delete(useCases).where(eq(useCases.id, useCaseId));
  revalidateEvidence(projectId);
}

// ---------- Certification / Audit Records ----------

export async function listProjectCertifications(projectId: number) {
  return db.select().from(certificationRecords).where(eq(certificationRecords.projectId, projectId));
}

export async function addCertification(projectId: number, formData: FormData) {
  const recordType = String(formData.get("recordType") ?? "certification") as
    | "certification"
    | "third_party_audit"
    | "verified_credit_issuance"
    | "engineering_sign_off"
    | "other";
  const issuerName = String(formData.get("issuerName") ?? "").trim();
  const issuerType = String(formData.get("issuerType") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();
  const issueDate = String(formData.get("issueDate") ?? "").trim();
  const expiryDate = String(formData.get("expiryDate") ?? "").trim();
  const linkedMetricIdRaw = String(formData.get("linkedMetricId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!issuerName) throw new Error("Issuer name is required.");

  await db.insert(certificationRecords).values({
    projectId,
    recordType,
    issuerName,
    issuerType: issuerType || null,
    scope: scope || null,
    issueDate: issueDate || null,
    expiryDate: expiryDate || null,
    linkedMetricId: linkedMetricIdRaw ? Number(linkedMetricIdRaw) : null,
    notes: notes || null,
  });

  revalidateEvidence(projectId);
  revalidateMetrics(projectId);
}

export async function deleteCertification(certificationId: number, projectId: number) {
  await db.delete(certificationRecords).where(eq(certificationRecords.id, certificationId));
  revalidateEvidence(projectId);
  revalidateMetrics(projectId);
}

// ---------- Jurisdictions (subnational, with national/regional rollup) ----------

export async function listProjectJurisdictions(projectId: number) {
  return db.select().from(jurisdictions).where(eq(jurisdictions.projectId, projectId));
}

export async function addJurisdiction(projectId: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "subnational") as "subnational" | "national" | "region";
  const parentIdRaw = String(formData.get("parentJurisdictionId") ?? "");
  if (!name) throw new Error("Jurisdiction name is required.");

  await db.insert(jurisdictions).values({
    projectId,
    name,
    level,
    parentJurisdictionId: parentIdRaw ? Number(parentIdRaw) : null,
  });

  revalidateMetrics(projectId);
}

export async function deleteJurisdiction(jurisdictionId: number, projectId: number) {
  await db.delete(jurisdictionBaselines).where(eq(jurisdictionBaselines.jurisdictionId, jurisdictionId));
  await db.delete(jurisdictions).where(eq(jurisdictions.id, jurisdictionId));
  revalidateMetrics(projectId);
}

// ---------- Jurisdiction baselines ----------

export async function addJurisdictionBaseline(metricId: number, projectId: number, formData: FormData) {
  const jurisdictionIdRaw = String(formData.get("jurisdictionId") ?? "");
  const baselineValueRaw = String(formData.get("baselineValue") ?? "");
  const baselineDate = String(formData.get("baselineDate") ?? "").trim();
  const baselineSource = String(formData.get("baselineSource") ?? "").trim();
  const confidenceLevelRaw = String(formData.get("confidenceLevel") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!jurisdictionIdRaw) throw new Error("Jurisdiction is required.");
  if (!baselineValueRaw) throw new Error("Baseline value is required.");

  await db.insert(jurisdictionBaselines).values({
    metricId,
    jurisdictionId: Number(jurisdictionIdRaw),
    baselineValue: Number(baselineValueRaw),
    baselineDate: baselineDate || null,
    baselineSource: baselineSource || null,
    confidenceLevel: confidenceLevelRaw ? (confidenceLevelRaw as "low" | "moderate" | "high") : null,
    notes: notes || null,
  });

  revalidateMetrics(projectId);
}

export async function deleteJurisdictionBaseline(baselineId: number, projectId: number) {
  await db.delete(jurisdictionBaselines).where(eq(jurisdictionBaselines.id, baselineId));
  revalidateMetrics(projectId);
}

// ---------- Capital provider tagging & overlap view ----------

export async function addCapitalProviderTag(metricId: number, projectId: number, formData: FormData) {
  const tag = String(formData.get("tag") ?? "").trim();
  if (!tag) throw new Error("Tag is required.");
  await db.insert(metricCapitalProviderTags).values({ metricId, tag });
  revalidateMetrics(projectId);
}

export async function deleteCapitalProviderTag(tagId: number, projectId: number) {
  await db.delete(metricCapitalProviderTags).where(eq(metricCapitalProviderTags.id, tagId));
  revalidateMetrics(projectId);
}

// ---------- Learning Agenda (Module 4, spec Section 6.3/7) ----------
// Previously deferred (v6 marked this NOT YET BUILT by design, pending a
// real reporting/review cycle to structure items against). Both reference
// projects now have that, so this closes the "measure -> learn -> adapt"
// loop: an item can be raised off a hypothesis or a metric, tiered by
// priority, and optionally tied to the Funding Instrument whose review
// cadence it should be resolved by.

function revalidateLearningAgenda(projectId: number) {
  revalidatePath(`/projects/${projectId}/learning`);
}

export async function listLearningAgendaItems(projectId: number) {
  return db
    .select()
    .from(learningAgendaItems)
    .where(eq(learningAgendaItems.projectId, projectId))
    .orderBy(desc(learningAgendaItems.createdAt));
}

export async function listLearningAgendaContext(projectId: number) {
  const thesis = await getCurrentThesis(projectId);
  const [hypotheses, projectMetrics, instruments] = await Promise.all([
    thesis
      ? db.select().from(impactHypotheses).where(eq(impactHypotheses.thesisId, thesis.id))
      : Promise.resolve([] as (typeof impactHypotheses.$inferSelect)[]),
    db.select().from(metrics).where(eq(metrics.projectId, projectId)),
    db.select().from(fundingInstruments).where(eq(fundingInstruments.projectId, projectId)),
  ]);
  return {
    hypotheses,
    metrics: projectMetrics,
    instruments,
  };
}

export async function addLearningAgendaItem(projectId: number, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const question = String(formData.get("question") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "moderate");
  const linkedHypothesisIdRaw = String(formData.get("linkedHypothesisId") ?? "");
  const linkedMetricIdRaw = String(formData.get("linkedMetricId") ?? "");
  const linkedFundingInstrumentIdRaw = String(formData.get("linkedFundingInstrumentId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "").trim();

  await db.insert(learningAgendaItems).values({
    projectId,
    title,
    question: question || null,
    priority: (priorityRaw as "high" | "moderate" | "low") || "moderate",
    linkedHypothesisId: linkedHypothesisIdRaw ? Number(linkedHypothesisIdRaw) : null,
    linkedMetricId: linkedMetricIdRaw ? Number(linkedMetricIdRaw) : null,
    linkedFundingInstrumentId: linkedFundingInstrumentIdRaw ? Number(linkedFundingInstrumentIdRaw) : null,
    dueDate: dueDate || null,
  });

  revalidateLearningAgenda(projectId);
}

export async function updateLearningAgendaItemStatus(
  itemId: number,
  projectId: number,
  status: "open" | "in_progress" | "resolved" | "archived",
  formData?: FormData,
) {
  const resolutionNote = formData ? String(formData.get("resolutionNote") ?? "").trim() : "";
  await db
    .update(learningAgendaItems)
    .set({
      status,
      // A resolution note is captured when an item moves to resolved; it's
      // left untouched on other transitions so a prior note isn't clobbered
      // by, say, reopening and re-closing an item.
      ...(status === "resolved" && resolutionNote ? { resolutionNote } : {}),
    })
    .where(eq(learningAgendaItems.id, itemId));
  revalidateLearningAgenda(projectId);
}

export async function deleteLearningAgendaItem(itemId: number, projectId: number) {
  await db.delete(learningAgendaItems).where(eq(learningAgendaItems.id, itemId));
  revalidateLearningAgenda(projectId);
}
