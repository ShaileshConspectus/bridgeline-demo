import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Phase 1a — Thesis Studio schema.
 *
 * Scope note: this is the subset of the full MEL Tool data model
 * (see spec Section 8) needed to build Thesis Studio first. Metrics is
 * a deliberate stub here — Module 2 (Metrics Library) is Phase 1c — but
 * the Metric table exists now because Impact Hypotheses need something
 * to link to (spec Module 1, "Hypothesis linking" workflow). Evidence
 * Hub (Observations, Use Cases, Certifications) and the Learning Agenda
 * are not modeled at all yet — those are 1d and later.
 *
 * Every table carries orgId even though this is a single-user prototype,
 * per the spec's multi-tenant-ready design constraint (Section 8).
 */

export const organizations = sqliteTable("organizations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orgId: integer("org_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  // Opt-in lenses, off by default per the resolved v5 design decision.
  engagementFunnelEnabled: integer("engagement_funnel_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  commercialValueChainEnabled: integer("commercial_value_chain_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  // Nullable, free-choice-of-tag sector label used only to bias which Catalog
  // entries are surfaced first in the Metrics Library's catalog browser (see
  // src/lib/catalog.ts) — e.g. a forest/land-based project shouldn't have to
  // wade past bus-fleet and air-quality indicators to find ones about
  // hectares, carbon removal, or land tenure. Purely a ranking hint, never a
  // filter: every catalog entry stays visible and attachable regardless of a
  // project's sector, and a project left null just sees the catalog in its
  // default (unranked) order.
  sector: text("sector"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// A Project may carry several Funding Instruments (spec Section 4a).
export const fundingInstruments = sqliteTable("funding_instruments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  capitalProviderName: text("capital_provider_name").notNull(),
  instrumentType: text("instrument_type", {
    enum: ["grant", "debt", "equity", "blended", "self_funded"],
  }).notNull(),
  amount: real("amount"),
  currency: text("currency").default("USD"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  // Cadence + format, e.g. "quarterly narrative report" / "semi-annual covenant test".
  reportingRequirement: text("reporting_requirement"),
  covenantOrMilestoneTerms: text("covenant_or_milestone_terms"),
  renewalOrTrancheTrigger: text("renewal_or_tranche_trigger"),
});

// Versioned: a thesis revision creates a new row rather than overwriting.
// `isCurrent` marks the active version for a project; prior versions stay
// queryable for the version history timeline.
export const climateTheses = sqliteTable("climate_theses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  version: integer("version").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
  statement: text("statement").notNull(),
  problem: text("problem"),
  targetPopulation: text("target_population"),
  geography: text("geography"),
  expectedChange: text("expected_change"),
  timeHorizon: text("time_horizon"),
  changeNote: text("change_note"), // why this version was created, for the timeline
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// The causal chain: Input -> Process -> Output -> [Intermediate Outcome]
// -> Outcome -> Impact (spec Module 1).
export const tocRungs = sqliteTable("toc_rungs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: integer("thesis_id")
    .notNull()
    .references(() => climateTheses.id),
  rungType: text("rung_type", {
    enum: ["input", "process", "output", "intermediate_outcome", "outcome", "impact"],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  yearHorizon: text("year_horizon"), // e.g. "Year 1", "Year 2-3", "Year 5+"
  isCore: integer("is_core", { mode: "boolean" }).notNull().default(true), // core vs. flexible field
  sortOrder: integer("sort_order").notNull().default(0),
});

// The capital-provider-facing view: Objective -> Output -> Activity.
// Optionally anchored to a ToC rung so both views stay linked.
export const objectiveOutputActivities = sqliteTable("objective_output_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: integer("thesis_id")
    .notNull()
    .references(() => climateTheses.id),
  parentId: integer("parent_id"),
  kind: text("kind", { enum: ["objective", "output", "activity"] }).notNull(),
  code: text("code"), // e.g. "1", "1a", "1a-i"
  title: text("title").notNull(),
  description: text("description"),
  linkedTocRungId: integer("linked_toc_rung_id").references(() => tocRungs.id),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Optional parallel lenses (off by default per project settings).
export const engagementFunnelStages = sqliteTable("engagement_funnel_stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: integer("thesis_id")
    .notNull()
    .references(() => climateTheses.id),
  stage: text("stage", {
    enum: ["reach", "active_uptake", "meaningful_uptake", "outcome"],
  }).notNull(),
  thresholdDefinition: text("threshold_definition"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const commercialValueChainStages = sqliteTable("commercial_value_chain_stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: integer("thesis_id")
    .notNull()
    .references(() => climateTheses.id),
  title: text("title").notNull(), // e.g. "Product-Market Fit", "Revenue Scale"
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const impactHypotheses = sqliteTable("impact_hypotheses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: integer("thesis_id")
    .notNull()
    .references(() => climateTheses.id),
  statement: text("statement").notNull(), // "IF ... THEN ..."
  fromRungId: integer("from_rung_id").references(() => tocRungs.id),
  toRungId: integer("to_rung_id").references(() => tocRungs.id),
  // A hypothesis can additionally reference a parallel-lens milestone
  // alongside its impact rung (spec: Engagement Funnel / Commercial
  // Value Chain, Section 3/Decision 8) — never merged into the impact
  // chain itself, just linked so "path to revenue"/"path to adoption"
  // and "path to impact" stay visible side by side.
  linkedEngagementStageId: integer("linked_engagement_stage_id").references(() => engagementFunnelStages.id),
  linkedCommercialStageId: integer("linked_commercial_stage_id").references(() => commercialValueChainStages.id),
  status: text("status", {
    enum: ["untested", "testing", "supported", "refuted", "inconclusive"],
  })
    .notNull()
    .default("untested"),
  confidenceNote: text("confidence_note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const assumptionRisks = sqliteTable("assumption_risks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hypothesisId: integer("hypothesis_id")
    .notNull()
    .references(() => impactHypotheses.id),
  description: text("description").notNull(),
});

// Module 2 — Metrics Library (Phase 1c extends this from its original
// 1a stub). Mirrors the spec's Metric object: standards-sourced or
// bespoke/SMART, coded to a ToC location, with capital provider tags
// and a manually-set elevated-verification flag.
export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  code: text("code"),
  name: text("name").notNull(),
  source: text("source", { enum: ["iris_plus", "sdg", "bespoke"] })
    .notNull()
    .default("bespoke"),
  sourceCode: text("source_code"),
  tocLocation: text("toc_location"),
  unit: text("unit"),
  directionOfGood: text("direction_of_good", { enum: ["higher_is_better", "lower_is_better"] }),
  requiresElevatedVerification: integer("requires_elevated_verification", { mode: "boolean" })
    .notNull()
    .default(false),
  // --- Phase 1c additions (Module 2) ---
  definitionMethodsSource: text("definition_methods_source"), // how it's defined/measured, and where that definition comes from
  calculationMethod: text("calculation_method"),
  suggestedFrequency: text("suggested_frequency"), // e.g. "quarterly", "annual"
  disaggregationDimensions: text("disaggregation_dimensions"), // comma-separated, e.g. "geography, gender"
  justification: text("justification"), // why this metric, for this hypothesis/ToC location
  // How subnational jurisdiction values roll up to a national figure —
  // per spec, this is a per-metric-type choice, not a per-jurisdiction one.
  aggregationMethod: text("aggregation_method", { enum: ["sum", "weighted_average", "custom"] })
    .notNull()
    .default("sum"),
});

export const hypothesisMetricLinks = sqliteTable("hypothesis_metric_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hypothesisId: integer("hypothesis_id")
    .notNull()
    .references(() => impactHypotheses.id),
  metricId: integer("metric_id")
    .notNull()
    .references(() => metrics.id),
});

/**
 * Phase 1b — Dashboard & Results Reports schema.
 *
 * Deliberately lightweight: the spec's full jurisdiction-aware, capital-
 * provider-tagged Metrics Library (with baseline/milestone/target set at
 * creation and a `consequence_severity` prompt) is Module 2 / Phase 1c.
 * These two tables exist now only so the actual-vs-target dashboard and
 * hypothesis scorecard have real data to render against — a single
 * baseline->milestone->target trajectory per metric per period, and a
 * matching stream of reported actuals. Both get superseded/extended by
 * the real Metrics Library and Evidence Hub schemas in 1c/1d; nothing
 * here is meant to be the final shape.
 */
export const metricTargets = sqliteTable("metric_targets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricId: integer("metric_id")
    .notNull()
    .references(() => metrics.id),
  period: text("period").notNull(), // free text for now, e.g. "2024", "2025" — full period modeling is 1c
  baseline: real("baseline"),
  milestone: real("milestone"),
  target: real("target"),
  // Prompted-not-forced per the resolved decision (Module 2, Decision 3/5)
  // — how urgently a miss on this target should surface.
  consequenceSeverity: text("consequence_severity", { enum: ["low", "moderate", "high"] }),
  // --- Phase 1c additions: dated three-point trajectory + rationale, and
  // an optional jurisdiction scope (null = project-level/default plan,
  // matching how this table already worked pre-1c). ---
  jurisdictionId: integer("jurisdiction_id").references(() => jurisdictions.id),
  milestoneDate: text("milestone_date"),
  targetDate: text("target_date"),
  rationale: text("rationale"),
});

// Evidence Hub's real collection pipeline (Phase 1d) — extended in place
// from the 1b/1c fixture-entry table so the dashboard's variance math
// keeps reading from one place. `status` starts "pending" and is set by
// the rules-based verification pipeline at submission time (see
// src/lib/verification.ts) — "accepted" automatically when nothing is
// flagged, left "pending" for the review queue otherwise.
export const metricObservations = sqliteTable("metric_observations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricId: integer("metric_id")
    .notNull()
    .references(() => metrics.id),
  period: text("period").notNull(),
  actualValue: real("actual_value").notNull(),
  note: text("note"),
  recordedAt: text("recorded_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  // --- Phase 1d additions (Module 3) ---
  jurisdictionId: integer("jurisdiction_id").references(() => jurisdictions.id),
  sourceType: text("source_type", { enum: ["direct_entry", "portfolio_import", "api"] })
    .notNull()
    .default("direct_entry"),
  submittedBy: text("submitted_by"),
  status: text("status", { enum: ["pending", "accepted", "rejected", "needs_follow_up"] })
    .notNull()
    .default("pending"),
  evidenceText: text("evidence_text"), // stand-in for a file/document attachment in this prototype
});

// Quality Check Rule results (spec: range / completeness / consistency /
// duplicate checks), run against every observation at submission time.
export const observationQualityChecks = sqliteTable("observation_quality_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  observationId: integer("observation_id")
    .notNull()
    .references(() => metricObservations.id),
  rule: text("rule").notNull(), // e.g. "range", "consistency", "duplicate", "evidence_consistency", "elevated_verification"
  passed: integer("passed", { mode: "boolean" }).notNull(),
  detail: text("detail"),
});

// Verification Record (spec Module 3) — the outcome of AI-assisted
// (here: rules-based) review of an Observation, Use Case, or
// Certification. `recordType`/`recordId` is a lightweight polymorphic
// reference rather than three separate FK columns, matching the spec's
// generic {record_id, record_type} shape.
export const verificationRecords = sqliteTable("verification_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recordType: text("record_type", { enum: ["observation", "use_case", "certification"] }).notNull(),
  recordId: integer("record_id").notNull(),
  flags: text("flags"), // JSON-encoded string[]
  confidenceScore: real("confidence_score"),
  reviewerDecision: text("reviewer_decision", { enum: ["accepted", "rejected", "needs_follow_up"] }),
  reviewerNotes: text("reviewer_notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// Use Case (spec Module 3, "from your practice") — qualitative evidence
// staged through a funnel and verified by follow-up, not by rules.
export const useCases = sqliteTable("use_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  origin: text("origin", { enum: ["email", "partner", "event", "survey", "other"] })
    .notNull()
    .default("other"),
  sector: text("sector"),
  topic: text("topic"),
  stage: text("stage", {
    enum: ["interest", "use", "result", "outcome", "top_outcome", "testimonial"],
  })
    .notNull()
    .default("interest"),
  linkedHypothesisId: integer("linked_hypothesis_id").references(() => impactHypotheses.id),
  narrativeText: text("narrative_text").notNull(),
  verificationStatus: text("verification_status", {
    enum: ["unverified", "follow_up_in_progress", "verified"],
  })
    .notNull()
    .default("unverified"),
  verifiedBy: text("verified_by"),
  verifiedAt: text("verified_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// Certification/Audit Record (spec Module 3, decision-resolved third
// evidence type) — a compliance artifact whose authority comes from the
// issuer's standing, tracked with its own expiry-driven renewal status
// (computed from expiryDate on read, not stored).
export const certificationRecords = sqliteTable("certification_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  recordType: text("record_type", {
    enum: ["certification", "third_party_audit", "verified_credit_issuance", "engineering_sign_off", "other"],
  })
    .notNull()
    .default("certification"),
  issuerName: text("issuer_name").notNull(),
  issuerType: text("issuer_type"), // e.g. accreditation body, auditor, registry, engineer of record
  scope: text("scope"), // what it covers — a site, a metric, a claim
  issueDate: text("issue_date"),
  expiryDate: text("expiry_date"),
  linkedMetricId: integer("linked_metric_id").references(() => metrics.id),
  linkedHypothesisId: integer("linked_hypothesis_id").references(() => impactHypotheses.id),
  documentNote: text("document_note"), // stand-in for a document attachment in this prototype
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Phase 1c — Metrics Library (Module 2) schema additions.
 *
 * Jurisdiction granularity is resolved per the spec: subnational is the
 * primary level baselines/observations are captured at; national/regional
 * figures are always a computed roll-up (per the metric's aggregationMethod
 * above), never a second value kept in sync by hand. This prototype
 * computes that roll-up on read (see src/lib/metrics.ts) rather than
 * storing it.
 */
export const jurisdictions = sqliteTable("jurisdictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  level: text("level", { enum: ["subnational", "national", "region"] })
    .notNull()
    .default("subnational"),
  parentJurisdictionId: integer("parent_jurisdiction_id"),
});

// Baseline is modeled separately from MilestoneTarget (metricTargets)
// because a metric can carry many subnational baselines across a
// portfolio, each with its own source/confidence/date — the spec's
// Jurisdiction Baseline object.
export const jurisdictionBaselines = sqliteTable("jurisdiction_baselines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricId: integer("metric_id")
    .notNull()
    .references(() => metrics.id),
  jurisdictionId: integer("jurisdiction_id")
    .notNull()
    .references(() => jurisdictions.id),
  baselineValue: real("baseline_value").notNull(),
  baselineDate: text("baseline_date"),
  baselineSource: text("baseline_source"), // e.g. "World Bank WDI", "primary survey"
  confidenceLevel: text("confidence_level", { enum: ["low", "moderate", "high"] }),
  notes: text("notes"),
});

// Capital provider tagging & overlap view (spec Module 2 workflow 4) —
// a simple tag join table rather than a comma-separated field so an
// overlap view can group metrics by shared tag without string parsing.
export const metricCapitalProviderTags = sqliteTable("metric_capital_provider_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricId: integer("metric_id")
    .notNull()
    .references(() => metrics.id),
  tag: text("tag").notNull(), // e.g. "USAID standard indicator", "Series B lead investor KPI"
});

/**
 * Module 4 — Learning Agenda (spec Section 6.3/7, v5 Section 7).
 *
 * Intentionally deferred until Evidence Hub existed and there had been a
 * real reporting/review cycle to structure an item against (v6 Section
 * 6.3) — both reference projects now have that. A Learning Agenda Item
 * is the "what did we learn, what do we do about it" record: it can be
 * raised off a hypothesis, a metric, or free-standing, carries a
 * priority tier, and is optionally tied to a Funding Instrument's
 * review cadence so "when do we have to have decided this by" is
 * visible without a separate calendar.
 */
export const learningAgendaItems = sqliteTable("learning_agenda_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  question: text("question"), // the learning question this item is trying to answer
  priority: text("priority", { enum: ["high", "moderate", "low"] })
    .notNull()
    .default("moderate"),
  status: text("status", {
    enum: ["open", "in_progress", "resolved", "archived"],
  })
    .notNull()
    .default("open"),
  linkedHypothesisId: integer("linked_hypothesis_id").references(() => impactHypotheses.id),
  linkedMetricId: integer("linked_metric_id").references(() => metrics.id),
  // A Learning Agenda item can be tied to the Funding Instrument whose
  // review cadence it should be resolved by (spec: "per-Funding-Instrument
  // review cadence") — dueDate is set manually against that cadence rather
  // than computed, since reportingRequirement is free text in this build.
  linkedFundingInstrumentId: integer("linked_funding_instrument_id").references(() => fundingInstruments.id),
  dueDate: text("due_date"),
  resolutionNote: text("resolution_note"), // what was decided/changed, filled in on resolve
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
