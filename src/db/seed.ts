/**
 * Seed script — City EV Mission demo data (spec Section 13a).
 *
 * "City EV Mission" is an anonymized stand-in for a real multi-city
 * electric bus coalition MEL plan — its Results Framework definitions
 * (Impact / Outcome / Intermediate Outcome / Output tiers) and indicator
 * list are adapted here, with the sponsoring organization, program name,
 * and city/country names replaced by fictional equivalents. The
 * Objective/Output/Activity grouping, the specific hypotheses, and the
 * Funding Instrument are illustrative — the source document doesn't lay
 * those out explicitly in that exact shape — so treat those three as a
 * plausible worked example, not a transcription.
 *
 * Run with: npm run db:seed
 */
import { eq } from "drizzle-orm";
import { db, sqlite } from "./client";
import {
  organizations,
  projects,
  fundingInstruments,
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
} from "./schema";

function seedCityEv(orgId: number) {
  console.log("Seeding City EV Mission demo data (non-profit / grant track)...");

  const [project] = db
    .insert(projects)
    .values({
      orgId,
      name: "City EV Mission",
      description:
        "A multi-city coalition, coordinated by an international mobility-and-climate NGO with City EV program partners, supporting Pilot City leads through the electric bus procurement and adoption process.",
      // Neither lens applies: City EV isn't a software platform and isn't a
      // for-profit venture, so both stay off per the resolved default.
      engagementFunnelEnabled: false,
      commercialValueChainEnabled: false,
      // Biases the Metrics Library catalog browser toward transport/energy
      // indicators for this project — see src/lib/catalog.ts.
      sector: "transport",
    })
    .returning()
    .all();

  const [instrument] = db
    .insert(fundingInstruments)
    .values({
      projectId: project.id,
      capitalProviderName: "City EV Secretariat (multi-donor coalition)",
      instrumentType: "grant",
      amount: null,
      currency: "USD",
      reportingRequirement:
        "Quarterly Asana/spreadsheet indicator updates from Pilot City leads; periodic narrative reporting to the City EV Secretariat.",
      covenantOrMilestoneTerms:
        "Illustrative — the source MEL plan does not itemize funder-specific covenants; represented here as an example grant instrument.",
    })
    .returning()
    .all();

  const [thesis] = db
    .insert(climateTheses)
    .values({
      projectId: project.id,
      version: 1,
      isCurrent: true,
      statement:
        "Providing Pilot City leads with technical assistance, peer-to-peer exchange, and financing pathways will accelerate electric bus adoption — reducing tailpipe emissions and improving urban air quality, while building the institutional capacity and political commitment needed to sustain the transition beyond City EV's direct involvement.",
      problem:
        "Cities seeking to electrify their bus fleets face technical, financial, and political barriers to procurement that slow adoption and put climate and air-quality goals at risk.",
      targetPopulation: "Pilot City leads, transit operators, OEMs, utilities, and city policymakers",
      geography: "Multiple City EV Pilot Cities across several regions",
      expectedChange:
        "Faster, better-supported electric bus procurement, leading to large-scale adoption and reduced transport emissions",
      timeHorizon: "Multi-year, phased by Pilot City cohort",
      changeNote: "Initial version, seeded from the City EV Mission MEL Plan.",
    })
    .returning()
    .all();

  // --- Theory of Change: Input -> Process -> Output -> Intermediate
  // Outcome -> Outcome -> Impact, using the Results Framework
  // definitions from the source MEL plan. ---
  const rungDefs = [
    {
      rungType: "input" as const,
      title: "City EV technical assistance capacity",
      description:
        "The coordinating NGO's regional offices, City EV program partners, and technical assistance staff supporting Pilot City leads.",
      yearHorizon: "Ongoing",
      sortOrder: 0,
    },
    {
      rungType: "process" as const,
      title: "Deliver technical assistance and convene stakeholders",
      description:
        "Run webinars, workshops, peer exchanges, and data collection support (surveys, Asana tracking) for Pilot City leads.",
      yearHorizon: "Year 1",
      sortOrder: 1,
    },
    {
      rungType: "output" as const,
      title: "Capacity development, financing opportunities, decarbonization pathways",
      description:
        "Technical and financial knowledge delivered to stakeholders; financing sources identified; decarbonization pathways (fleet electrification options) mapped.",
      yearHorizon: "Year 1",
      sortOrder: 2,
    },
    {
      rungType: "intermediate_outcome" as const,
      title: "Peer exchange, private-sector engagement, trained workforce",
      description:
        "Formal and informal peer-to-peer exchange between cities; OEM/utility engagement; knowledge transfer between government and private sector; trained bus operators and mechanics; technical assistance products in active use.",
      yearHorizon: "Year 2",
      sortOrder: 3,
    },
    {
      rungType: "outcome" as const,
      title: "Knowledgeable advocates, ready supply chains, large-scale adoption",
      description:
        "Stakeholders become knowledgeable, capable E-bus advocates; E-bus supply chains become readily available; cities reach the point of having more E-buses than ICE buses; transition includes civil society and affected workers (just transition); supportive city/state/national practices and policies are in place.",
      yearHorizon: "Year 2-3",
      sortOrder: 4,
    },
    {
      rungType: "impact" as const,
      title: "Stronger institutions, better air quality, lower emissions, sustained political will",
      description:
        "Strengthened individual and institutional capacity beyond City EV; improved urban air quality and quality of life; reduced tailpipe (GHG) emissions; increased, durable political commitment to electrification.",
      yearHorizon: "Year 5+",
      sortOrder: 5,
    },
  ];

  const rungs = rungDefs.map((r) =>
    db.insert(tocRungs).values({ thesisId: thesis.id, ...r }).returning().get()
  );
  const [inputRung, processRung, outputRung, ioRung, outcomeRung, impactRung] = rungs;

  // --- Capital-provider-facing view: Objective -> Output -> Activity ---
  const obj1 = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      kind: "objective",
      code: "1",
      title: "Build stakeholder capacity and advocacy for E-bus adoption",
      linkedTocRungId: outcomeRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  const out1a = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj1.id,
      kind: "output",
      code: "1a",
      title: "Technical assistance webinars delivered",
      linkedTocRungId: outputRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out1a.id,
      kind: "activity",
      code: "1a-i",
      title: "Host webinars on procurement, financing, and technical planning",
      sortOrder: 0,
    })
    .run();
  const out1b = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj1.id,
      kind: "output",
      code: "1b",
      title: "Peer-to-peer exchange facilitated",
      linkedTocRungId: ioRung.id,
      sortOrder: 1,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out1b.id,
      kind: "activity",
      code: "1b-i",
      title: "Organize study tours and cross-city knowledge exchange",
      sortOrder: 0,
    })
    .run();

  const obj2 = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      kind: "objective",
      code: "2",
      title: "Strengthen E-bus supply chains and financing pathways",
      linkedTocRungId: outcomeRung.id,
      sortOrder: 1,
    })
    .returning()
    .get();
  const out2a = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj2.id,
      kind: "output",
      code: "2a",
      title: "Financing opportunities identified and shared",
      linkedTocRungId: outputRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out2a.id,
      kind: "activity",
      code: "2a-i",
      title: "Map private and public financing sources per city",
      sortOrder: 0,
    })
    .run();
  const out2b = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj2.id,
      kind: "output",
      code: "2b",
      title: "Private-sector engagement facilitated",
      linkedTocRungId: ioRung.id,
      sortOrder: 1,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out2b.id,
      kind: "activity",
      code: "2b-i",
      title: "Convene meetings with OEMs, utilities, and operators",
      sortOrder: 0,
    })
    .run();

  const obj3 = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      kind: "objective",
      code: "3",
      title: "Advance policies and political commitment for electrification",
      linkedTocRungId: impactRung.id,
      sortOrder: 2,
    })
    .returning()
    .get();
  const out3a = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj3.id,
      kind: "output",
      code: "3a",
      title: "Technical assistance products delivered to policymakers",
      linkedTocRungId: ioRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out3a.id,
      kind: "activity",
      code: "3a-i",
      title: "Draft roadmaps and target-setting support; meet with city decision-makers",
      sortOrder: 0,
    })
    .run();

  // --- Metrics Library (Module 2, Phase 1c). One metric attached from
  // the bundled IRIS+ catalog (demonstrating "search & attach" and the
  // IRIS+ -> SDG cross-mapping), two bespoke SMART metrics (demonstrating
  // the bespoke builder), all with capital provider tags. ---
  const metricEbuses = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "OUT.1",
      name: "Low-Carbon Vehicles Deployed",
      source: "iris_plus",
      sourceCode: "PI7845",
      unit: "count",
      directionOfGood: "higher_is_better",
      tocLocation: "Output",
      definitionMethodsSource:
        "Number of low- or zero-emission vehicles (e.g. electric buses) deployed as a result of the organization's activities.",
      justification: "Directly measures the Output rung of the ToC — e-buses procured and put into service per Pilot City.",
      aggregationMethod: "sum",
    })
    .returning()
    .get();
  const metricTargetsSet = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "OUT.2",
      name: "# of cities with E-bus targets rated 4-5",
      source: "bespoke",
      unit: "count",
      directionOfGood: "higher_is_better",
      tocLocation: "Outcome",
      definitionMethodsSource:
        "Count of Pilot Cities whose electrification target quality is rated 4 or 5 on City EV's internal 5-point target-quality rubric (specificity, ambition, and time-bound commitment).",
      calculationMethod: "Count of cities meeting the rating threshold at time of annual review.",
      suggestedFrequency: "annual",
      justification: "Evidences the Outcome rung — supportive city-level policy and target-setting is a precondition for large-scale adoption.",
      aggregationMethod: "sum",
    })
    .returning()
    .get();
  const metricFemaleAttendance = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "OUT.3",
      name: "% of TA webinar attendees who identify as female or trans/nonbinary",
      source: "bespoke",
      unit: "%",
      directionOfGood: "higher_is_better",
      tocLocation: "Intermediate Outcome",
      definitionMethodsSource: "Self-reported gender identity captured at webinar registration, divided by total registrants.",
      calculationMethod: "Registrants identifying as female or trans/nonbinary ÷ total registrants × 100.",
      suggestedFrequency: "per webinar, rolled up quarterly",
      disaggregationDimensions: "geography, gender",
      justification: "Tracks whether TA delivery is reaching a just-transition-consistent, gender-inclusive audience, per Hypothesis H1.",
      aggregationMethod: "weighted_average",
    })
    .returning()
    .get();

  db.insert(metricCapitalProviderTags)
    .values([
      { metricId: metricEbuses.id, tag: "City EV Secretariat reporting" },
      { metricId: metricTargetsSet.id, tag: "City EV Secretariat reporting" },
      { metricId: metricFemaleAttendance.id, tag: "City EV Secretariat reporting" },
      { metricId: metricFemaleAttendance.id, tag: "Gender equity co-funder" },
    ])
    .run();

  // --- Jurisdictions: subnational Pilot Cities rolling up to
  // national, demonstrating the sum-type aggregation on metricEbuses. ---
  const verdano = db
    .insert(jurisdictions)
    .values({ projectId: project.id, name: "Verdano", level: "national" })
    .returning()
    .get();
  const rioBravo = db
    .insert(jurisdictions)
    .values({ projectId: project.id, name: "Rio Bravo", level: "subnational", parentJurisdictionId: verdano.id })
    .returning()
    .get();
  const montara = db
    .insert(jurisdictions)
    .values({ projectId: project.id, name: "Montara", level: "national" })
    .returning()
    .get();
  const altoVerde = db
    .insert(jurisdictions)
    .values({ projectId: project.id, name: "Alto Verde", level: "subnational", parentJurisdictionId: montara.id })
    .returning()
    .get();

  db.insert(jurisdictionBaselines)
    .values([
      {
        metricId: metricEbuses.id,
        jurisdictionId: rioBravo.id,
        baselineValue: 0,
        baselineDate: "2023-01",
        baselineSource: "City EV Pilot City intake survey",
        confidenceLevel: "high",
      },
      {
        metricId: metricEbuses.id,
        jurisdictionId: altoVerde.id,
        baselineValue: 0,
        baselineDate: "2023-01",
        baselineSource: "City EV Pilot City intake survey",
        confidenceLevel: "high",
      },
    ])
    .run();

  // --- Impact hypotheses ---
  const h1 = db
    .insert(impactHypotheses)
    .values({
      thesisId: thesis.id,
      statement:
        "IF Pilot City leads receive technical assistance webinars and peer-to-peer exchange (Output/Intermediate Outcome) THEN stakeholders become knowledgeable, capable E-bus advocates within 12 months (Outcome).",
      fromRungId: ioRung.id,
      toRungId: outcomeRung.id,
      status: "testing",
    })
    .returning()
    .get();
  db.insert(assumptionRisks)
    .values({
      hypothesisId: h1.id,
      description:
        "Assumes city staff have capacity to attend and apply what they learn; risk: staff turnover between webinar sessions disrupts continuity of learning.",
    })
    .run();
  db.insert(hypothesisMetricLinks).values({ hypothesisId: h1.id, metricId: metricFemaleAttendance.id }).run();

  const h2 = db
    .insert(impactHypotheses)
    .values({
      thesisId: thesis.id,
      statement:
        "IF financing opportunities and supply-chain support are provided (Output) THEN E-bus supply chains become readily available and large-scale adoption follows within 2-3 years (Outcome).",
      fromRungId: outputRung.id,
      toRungId: outcomeRung.id,
      status: "untested",
    })
    .returning()
    .get();
  db.insert(assumptionRisks)
    .values({
      hypothesisId: h2.id,
      description:
        "Assumes OEM and utility partners remain engaged throughout; risk: global battery/component supply shocks could delay procurement regardless of City EV's technical support — an external assumption, not an execution failure.",
    })
    .run();
  db.insert(hypothesisMetricLinks).values({ hypothesisId: h2.id, metricId: metricEbuses.id }).run();

  const h3 = db
    .insert(impactHypotheses)
    .values({
      thesisId: thesis.id,
      statement:
        "IF cities reach large-scale E-bus adoption and supportive policy is in place (Outcome) THEN tailpipe emissions decrease and political commitment to electrification is sustained beyond City EV's direct involvement (Impact).",
      fromRungId: outcomeRung.id,
      toRungId: impactRung.id,
      status: "untested",
    })
    .returning()
    .get();
  db.insert(assumptionRisks)
    .values({
      hypothesisId: h3.id,
      description:
        "Assumes no major policy reversal; risk: a change in city leadership after an election could deprioritize climate commitments independent of anything City EV did.",
    })
    .run();
  db.insert(hypothesisMetricLinks).values({ hypothesisId: h3.id, metricId: metricTargetsSet.id }).run();

  // --- Baseline/milestone/target trajectories + fixture actuals (Phase 1b:
  // Dashboard & Results Reports). Illustrative — running against a small
  // hand-seeded set until Module 2's real Metrics Library (1c) and Module
  // 3's Evidence Hub (1d) replace this with a general collection pipeline. ---
  db.insert(metricTargets)
    .values([
      { metricId: metricEbuses.id, period: "2024", baseline: 0, milestone: 150, target: null, consequenceSeverity: "moderate" },
      { metricId: metricEbuses.id, period: "2025", baseline: null, milestone: null, target: 500, consequenceSeverity: "moderate" },
      { metricId: metricTargetsSet.id, period: "2024", baseline: 2, milestone: 5, target: null, consequenceSeverity: "low" },
      { metricId: metricTargetsSet.id, period: "2025", baseline: null, milestone: null, target: 10, consequenceSeverity: "low" },
      { metricId: metricFemaleAttendance.id, period: "2024", baseline: 20, milestone: 30, target: null, consequenceSeverity: "high" },
      { metricId: metricFemaleAttendance.id, period: "2025", baseline: null, milestone: null, target: 40, consequenceSeverity: "high" },
    ])
    .run();

  db.insert(metricObservations)
    .values([
      { metricId: metricEbuses.id, period: "2024", actualValue: 120, note: "Behind the 2024 milestone — component supply delays in two Pilot Cities.", status: "accepted", sourceType: "portfolio_import", submittedBy: "Pilot City leads (aggregate)" },
      { metricId: metricEbuses.id, period: "2025", actualValue: 340, note: "Tracking behind the 2025 target; supply chain recovering.", status: "accepted", sourceType: "portfolio_import", submittedBy: "Pilot City leads (aggregate)" },
      { metricId: metricTargetsSet.id, period: "2024", actualValue: 6, note: "Ahead of the 2024 milestone.", status: "accepted", sourceType: "portfolio_import", submittedBy: "City EV Secretariat" },
      { metricId: metricTargetsSet.id, period: "2025", actualValue: 9, note: "Just under the 2025 target, on trend to close the gap.", status: "accepted", sourceType: "portfolio_import", submittedBy: "City EV Secretariat" },
      { metricId: metricFemaleAttendance.id, period: "2024", actualValue: 28, note: "Just under the 2024 milestone.", status: "accepted", sourceType: "portfolio_import", submittedBy: "City EV Secretariat" },
      { metricId: metricFemaleAttendance.id, period: "2025", actualValue: 35, note: "Improving but still under the 2025 target — flagged as a High-priority Learning Agenda candidate.", status: "accepted", sourceType: "portfolio_import", submittedBy: "City EV Secretariat" },
    ])
    .run();

  // --- Evidence Hub (Module 3, Phase 1d) demo data, so the review
  // queue, use case funnel, and certification register aren't empty on
  // first load. ---

  // A metric that requires elevated verification, to demonstrate the
  // certification-gating check in the rules-based pipeline.
  db.update(metrics).set({ requiresElevatedVerification: true }).where(eq(metrics.id, metricEbuses.id)).run();

  // A 2026 result reported for e-buses deployed. 780 vs. the 2025 actual
  // of 340 is more than a 2x jump — the consistency check flags it, and
  // since the metric now requires elevated verification, the reviewer
  // needs to see the linked certification below before accepting.
  const flaggedObs = db
    .insert(metricObservations)
    .values({
      metricId: metricEbuses.id,
      period: "2026",
      actualValue: 780,
      note: "Rio Bravo and Alto Verde both completed large procurement tranches this quarter.",
      status: "pending",
      sourceType: "direct_entry",
      submittedBy: "Rio Bravo Pilot City lead",
      evidenceText: "Rio Bravo procurement completion report, June 2026: 780 e-buses now in revenue service across both cities.",
    })
    .returning()
    .get();
  db.insert(observationQualityChecks)
    .values([
      { observationId: flaggedObs.id, rule: "completeness", passed: true, detail: "Value and period present." },
      { observationId: flaggedObs.id, rule: "duplicate", passed: true, detail: "No existing observation for this metric/period." },
      { observationId: flaggedObs.id, rule: "range", passed: true, detail: "780 is within 3x the historical range (0–340)." },
      { observationId: flaggedObs.id, rule: "consistency", passed: false, detail: "780 is more than 2x the prior period's actual (340) — a jump this size needs a second look." },
      { observationId: flaggedObs.id, rule: "evidence_consistency", passed: true, detail: "Reported value found in the supplied evidence text." },
      { observationId: flaggedObs.id, rule: "elevated_verification", passed: true, detail: "Metric requires elevated verification and a current certification is on file." },
    ])
    .run();
  db.insert(verificationRecords)
    .values({
      recordType: "observation",
      recordId: flaggedObs.id,
      flags: JSON.stringify(["consistency"]),
      confidenceScore: 0.7,
      reviewerDecision: null,
      reviewerNotes: null,
    })
    .run();

  // --- Use cases moved through the qualitative evidence funnel ---
  db.insert(useCases)
    .values([
      {
        projectId: project.id,
        origin: "event",
        sector: "Transit",
        topic: "Procurement financing",
        narrativeText: "Rio Bravo's transit authority credited City EV's financing workshop with unlocking a blended-finance structure it hadn't previously considered.",
        linkedHypothesisId: h2.id,
        stage: "top_outcome",
        verificationStatus: "follow_up_in_progress",
      },
      {
        projectId: project.id,
        origin: "partner",
        sector: "Workforce",
        topic: "Mechanic training",
        narrativeText: "Alto Verde's fleet operator reported that City EV-trained mechanics cut average e-bus downtime by half compared to the prior ICE fleet.",
        linkedHypothesisId: h1.id,
        stage: "result",
        verificationStatus: "unverified",
      },
      {
        projectId: project.id,
        origin: "survey",
        sector: "Policy",
        topic: "Target-setting",
        narrativeText: "A Rio Bravo policy advisor described City EV's roadmap tool as central to the city council's decision to raise its 2030 electrification target.",
        linkedHypothesisId: h3.id,
        stage: "testimonial",
        verificationStatus: "verified",
        verifiedBy: "City EV Secretariat MEL lead",
        verifiedAt: new Date().toISOString(),
      },
    ])
    .run();

  // --- Certification / audit record, linked to the elevated-verification
  // metric above, so the review queue's gating check has something real
  // to point to. ---
  db.insert(certificationRecords)
    .values({
      projectId: project.id,
      recordType: "third_party_audit",
      issuerName: "Meridian Assurance",
      issuerType: "Independent auditor",
      scope: "Fleet deployment count verification — Rio Bravo and Alto Verde e-bus procurement tranches",
      issueDate: "2026-01-15",
      expiryDate: "2027-01-15",
      linkedMetricId: metricEbuses.id,
      notes: "Annual third-party audit of deployed e-bus counts, required given the metric's elevated verification flag.",
    })
    .run();

  console.log(`Seeded project "${project.name}" (id ${project.id}) with thesis v${thesis.version}.`);
}

/**
 * Seed script — BRARE demo data (for-profit / commercial track).
 *
 * "BRARE" is an anonymized stand-in for a real Phase 1 Investment Brief
 * and pitch deck supplied by the user: a for-profit financing and
 * verification layer for tropical forest protection and regeneration,
 * structured as a capital-structure-agnostic three-layer venture (Layer A
 * equity, Layer B green bonds, Layer C blended project finance). The
 * venture name, geography (country/state/territory), and named
 * third-party partners below are fictionalized; the program structure,
 * financial terms, and metric design are adapted from the source
 * material. This is the tool's for-profit/commercial test case,
 * exercising what the non-profit City EV seed above cannot: both
 * parallel lenses on (Engagement Funnel — the BRARE app is a digital
 * platform; Commercial Value Chain — this is a for-profit venture), an
 * equity + a debt Funding Instrument on the same project (Investor/Board
 * Update and Loan Covenant Compliance reports both apply), a metric
 * requiring elevated verification tied to bond eligibility, and a
 * two-origination-channel jurisdiction split (smallholder restoration vs.
 * territorial protection) that exercises the multi-jurisdiction rollup.
 *
 * Numbers not explicitly stated in the source brief (e.g. Coração Verde
 * protection-pipeline hectares) are marked illustrative in the relevant
 * justification/note field, same convention as the City EV seed above.
 * "Elena's Journey" income figures are reproduced (with the persona
 * renamed) from the deck, which itself labels them "a modeled case study
 * for illustrative purposes."
 *
 * Run with: npm run db:seed
 */
function seedBrare(orgId: number) {
  console.log("Seeding BRARE demo data (for-profit / commercial track)...");

  const [project] = db
    .insert(projects)
    .values({
      orgId,
      name: "BRARE — Amazon Regeneration Financing Platform",
      description:
        "The financing and verification layer for tropical forest protection and regeneration: upfront capital to land stewards via local BRARE Shops, verified via field + satellite MRV, turned into tradable multi-aspect ecological credits that repay the capital. Phase 1 pilot in Serra Alta, Verdania (Coração Verde territory + smallholder catchment).",
      // Both lenses ON, unlike City EV: BRARE's app IS the digital-platform
      // intervention (registration, parcel mapping, evidence capture,
      // wallet), and BRARE Inc is a for-profit operating company with its
      // own path-to-revenue milestones alongside its impact thesis.
      engagementFunnelEnabled: true,
      commercialValueChainEnabled: true,
      // Biases the Metrics Library catalog browser toward forest/land
      // indicators (hectares, carbon removal, land tenure, livelihoods) for
      // this project — see src/lib/catalog.ts.
      sector: "forest_land",
    })
    .returning()
    .all();

  // Two Funding Instruments on one project — a live equity round and a
  // planned debt instrument — so both the Investor/Board Update and the
  // Loan Covenant Compliance report templates have something real to
  // render for the same venture, per the brief's Layer A/Layer B split.
  const [equityInstrument] = db
    .insert(fundingInstruments)
    .values({
      projectId: project.id,
      capitalProviderName: "Bridge round investor pool",
      instrumentType: "equity",
      amount: 700000,
      currency: "EUR",
      startDate: "2026-07-01",
      endDate: "2027-06-30",
      reportingRequirement:
        "Four quarterly decision gates, each reported to investors within fifteen days of quarter end.",
      covenantOrMilestoneTerms:
        "Q3 2026: entities registered, structure legally sound and mission-protected. Q4 2026: app v1 in field test, first BRARE Shop open. Q1 2027: first cohort onboarded, first restoration payments disbursed, observed cost per hectare published — this is the number the next tranche is priced on. Q2 2027: first verification cycle complete, LOIs from credit buyers, Series A and Layer B data room complete.",
      renewalOrTrancheTrigger:
        "Series A and Layer B green bond open once the Q2 2027 gate passes: a priced, verified, documented pipeline.",
    })
    .returning()
    .all();

  const [debtInstrument] = db
    .insert(fundingInstruments)
    .values({
      projectId: project.id,
      capitalProviderName: "Layer B green bond (planned, in preparation)",
      instrumentType: "debt",
      amount: null,
      currency: "BRL",
      startDate: "2027-07-01",
      endDate: null,
      reportingRequirement: "Semi-annual covenant test, once issued (planned — not yet live as of this Phase 1 round).",
      covenantOrMilestoneTerms:
        "6 percent fixed coupon, roughly ten-year tenor. Senior claim on credit revenue plus collateral in the loan portfolio. Requires the verified pipeline Phase 1 produces: audit-grade baselines, one completed verification cycle, and the Coração Verde REDD+ pipeline documented to bond eligibility standard.",
      renewalOrTrancheTrigger: "Opens once Phase 1's Q2 2027 gate passes.",
    })
    .returning()
    .all();

  const [thesis] = db
    .insert(climateTheses)
    .values({
      projectId: project.id,
      version: 1,
      isCurrent: true,
      statement:
        "BRARE is the financing and verification layer for tropical forest protection and regeneration: by putting upfront capital in the hands of land stewards through local BRARE Shops, verifying what they actually deliver via field and satellite MRV, and turning verified outcomes into tradable multi-aspect ecological credits, BRARE restores the tropical forest system's water-cycle and cooling function while building a repeatable, investable unit of shop-based smallholder restoration and territorial protection.",
      problem:
        "Climate finance exists but doesn't reach land stewards: smallholders and Indigenous communities who want to protect and restore forest lack access to upfront capital, and investors lack verification good enough to underwrite that capital at scale.",
      targetPopulation:
        "Smallholder land stewards and Indigenous communities in the Verdanian Amazon (Serra Alta / Coração Verde territory pilot), plus impact investors and credit buyers",
      geography: "Serra Alta, Verdania (Coração Verde territory and surrounding smallholder catchment) — Phase 1 pilot",
      expectedChange:
        "A proven, replicable shop-based restoration unit and a documented territorial protection pipeline, generating verified multi-aspect ecological credits that repay capital and retain majority value for land stewards.",
      timeHorizon: "12-month Phase 1 (Q3 2026-Q2 2027), scaling via Series A and Layer B bond financing from 2027",
      changeNote: "Initial version, seeded from the BRARE Phase 1 Investment Brief and pitch deck.",
    })
    .returning()
    .all();

  // --- Theory of Change ---
  const rungDefs = [
    {
      rungType: "input" as const,
      title: "Bridge capital, BRARE platform/app, shop infrastructure, MRV partnerships",
      description:
        "EUR 700,000 Phase 1 bridge round; offline-capable app (registration, parcel mapping, plan builder, evidence capture, wallet) built with app-development partners; biomass/land-cover data partnerships (independent satellite-monitoring and biomass-data providers); third-party agroforestry modeling tools.",
      yearHorizon: "Q3 2026",
      sortOrder: 0,
    },
    {
      rungType: "process" as const,
      title: "Onboard land stewards through BRARE Shops, verify parcels and plans, disburse loans, restore land",
      description:
        "Shops onboard people and land; regeneration plans are built and financed; land stewards plant trees, crops, and soil-improving species with shop-provided inputs and training; every activity logged digitally.",
      yearHorizon: "Q3-Q4 2026",
      sortOrder: 1,
    },
    {
      rungType: "output" as const,
      title: "First BRARE Shop operating, first cohort onboarded, hectares under signed plans, protection pipeline documented",
      description:
        "150-250 land stewards, roughly 2,000-3,000 hectares under signed regeneration plans in Serra Alta; Coração Verde territorial protection pipeline documented; first restoration payments disbursed against verified milestones.",
      yearHorizon: "Q4 2026-Q1 2027",
      sortOrder: 2,
    },
    {
      rungType: "intermediate_outcome" as const,
      title: "Observed unit economics and audit-grade verification",
      description:
        "Cost per hectare onboarded and per hectare verified observed and published to investors; audit-grade baseline reports on pilot polygons; first verification cycle completed against those baselines.",
      yearHorizon: "Q1-Q2 2027",
      sortOrder: 3,
    },
    {
      rungType: "outcome" as const,
      title: "Verified credits sold, capital repaid, stewards retain majority value, protection agreements executed",
      description:
        "Letters of intent from credit buyers for first carbon vintages; land stewards' loans automatically repaid through verified credits, with the design intent that the steward retains the majority of credit value across the contract life; Layer B green bond and Series A open on a priced, verified, documented pipeline.",
      yearHorizon: "2027-2028",
      sortOrder: 4,
    },
    {
      rungType: "impact" as const,
      title: "Amazon water cycle and cooling function restored at scale; new investable asset class",
      description:
        "Empower families to protect and restore forests and wetlands at Amazon-basin scale; help rebuild the Amazon's water cycle and cooling function; enable large-scale CO2 drawdown through nature-based regeneration; establish verified ecological credits as a transparent, data-driven, scalable asset class.",
      yearHorizon: "Year 5+",
      sortOrder: 5,
    },
  ];
  const rungs = rungDefs.map((r) => db.insert(tocRungs).values({ thesisId: thesis.id, ...r }).returning().get());
  const [inputRung, processRung, outputRung, ioRung, outcomeRung, impactRung] = rungs;

  // --- Capital-provider-facing view: Objective -> Output -> Activity,
  // matching the brief's three Phase 1 workstreams. ---
  const obj1 = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      kind: "objective",
      code: "1",
      title: "Prove the BRARE Shop unit",
      linkedTocRungId: outputRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  const out1a = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj1.id,
      kind: "output",
      code: "1a",
      title: "First BRARE Shop operational in Serra Alta, staffed and replicable",
      linkedTocRungId: outputRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out1a.id,
      kind: "activity",
      code: "1a-i",
      title: "Fit out shop, hire and train staff, run onboarding + KYC + consent protocol for the first cohort",
      sortOrder: 0,
    })
    .run();

  const obj2 = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      kind: "objective",
      code: "2",
      title: "Build the MRV and verification backbone",
      linkedTocRungId: ioRung.id,
      sortOrder: 1,
    })
    .returning()
    .get();
  const out2a = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj2.id,
      kind: "output",
      code: "2a",
      title: "Audit-grade baseline reports and one completed verification cycle on pilot polygons",
      linkedTocRungId: ioRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out2a.id,
      kind: "activity",
      code: "2a-i",
      title: "Procure biomass/land-cover layers, set and document baselines, test ground-truth protocol against satellite",
      sortOrder: 0,
    })
    .run();

  const obj3 = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      kind: "objective",
      code: "3",
      title: "Open the Coração Verde territorial protection pipeline",
      linkedTocRungId: outcomeRung.id,
      sortOrder: 2,
    })
    .returning()
    .get();
  const out3a = db
    .insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: obj3.id,
      kind: "output",
      code: "3a",
      title: "Coração Verde REDD+ pipeline documented to bond eligibility standard",
      linkedTocRungId: outcomeRung.id,
      sortOrder: 0,
    })
    .returning()
    .get();
  db.insert(objectiveOutputActivities)
    .values({
      thesisId: thesis.id,
      parentId: out3a.id,
      kind: "activity",
      code: "3a-i",
      title: "Open FPIC consent process with the territory's Indigenous leadership, execute benefit-sharing and consent agreements",
      sortOrder: 0,
    })
    .run();

  // --- Engagement Funnel (digital platform lens) — the BRARE app's own
  // Reach -> Active Uptake -> Meaningful Uptake -> Outcome definitions. ---
  const engagementStageDefs = [
    { stage: "reach" as const, thresholdDefinition: "A land steward has been introduced to BRARE — visited an BRARE Shop or was reached by shop outreach, sign-up started in the app.", sortOrder: 0 },
    { stage: "active_uptake" as const, thresholdDefinition: "Land parcel registered and verified in the app (digital ID + parcel boundary), regeneration plan viewed at least once.", sortOrder: 1 },
    { stage: "meaningful_uptake" as const, thresholdDefinition: "Regeneration plan signed and financed, at least one geo-tagged restoration milestone logged in the app within the enrollment period.", sortOrder: 2 },
    { stage: "outcome" as const, thresholdDefinition: "First verification cycle completed on the steward's parcel and first BRARE credit-based payment received in their wallet.", sortOrder: 3 },
  ];
  const engagementStages = engagementStageDefs.map((s) => db.insert(engagementFunnelStages).values({ thesisId: thesis.id, ...s }).returning().get());
  const [, , meaningfulUptakeStage] = engagementStages;

  // --- Commercial Value Chain (for-profit lens) — BRARE Inc's own path
  // to commercial scale, alongside (never merged into) the impact ToC. ---
  const commercialStageDefs = [
    { title: "Shop Unit Proven", description: "Phase 1 gate: one BRARE Shop operating, first cohort onboarded, observed (not modeled) cost per hectare onboarded and verified.", sortOrder: 0 },
    { title: "MRV & Verification De-risked", description: "Audit-grade baselines and first verification cycle completed; the credit becomes an eligible asset rather than a promise.", sortOrder: 1 },
    { title: "Series A & Layer B Unlocked", description: "Priced, verified, documented pipeline; Series A funds shop replication, Layer B bond funds farmer transition loans at scale.", sortOrder: 2 },
    { title: "Territorial + Network Scale", description: "Multi-shop network plus territorial protection agreements at Amazon-basin scale; verified ecological credits established as a mainstream asset class.", sortOrder: 3 },
  ];
  const commercialStages = commercialStageDefs.map((s) => db.insert(commercialValueChainStages).values({ thesisId: thesis.id, ...s }).returning().get());
  const [shopUnitProvenStage, mrvDerisksStage, seriesAStage] = commercialStages;

  // --- Metrics Library ---
  const metricHectaresOnboarded = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "OUT.1",
      name: "Hectares under signed regeneration plan",
      source: "bespoke",
      unit: "hectares",
      directionOfGood: "higher_is_better",
      tocLocation: "Output",
      definitionMethodsSource: "Hectares with a signed, financed regeneration (agroforestry) plan in the BRARE app, per land steward parcel.",
      calculationMethod: "Sum of parcel hectares with status = plan signed and financed.",
      suggestedFrequency: "quarterly",
      justification: "Directly measures the Output rung — land under a financed regeneration commitment. This is the volume metric the next tranche is priced on.",
      aggregationMethod: "sum",
    })
    .returning()
    .get();
  const metricStewardsOnboarded = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "OUT.2",
      name: "Land stewards onboarded",
      source: "bespoke",
      unit: "count",
      directionOfGood: "higher_is_better",
      tocLocation: "Output",
      definitionMethodsSource: "Land stewards registered, KYC/consent completed, and linked to a digital ID and wallet in the BRARE app.",
      suggestedFrequency: "quarterly",
      justification: "Indicative Phase 1 volume target: 150-250 land stewards in the first cohort.",
      aggregationMethod: "sum",
    })
    .returning()
    .get();
  const metricCostPerHectare = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "IO.1",
      name: "Observed cost per hectare onboarded",
      source: "bespoke",
      unit: "USD/ha",
      directionOfGood: "lower_is_better",
      tocLocation: "Intermediate Outcome",
      definitionMethodsSource: "Total shop origination cost (staff time, inputs, training) divided by hectares onboarded in the period, observed from real shop operating data rather than the portfolio model.",
      calculationMethod: "Shop origination cost / hectares onboarded, per period.",
      suggestedFrequency: "quarterly",
      justification: "The single number the brief says the next (larger, debt-inclusive) tranche is priced on — converts the portfolio model from assumption-led to evidence-led.",
      aggregationMethod: "weighted_average",
    })
    .returning()
    .get();
  const metricHectaresVerified = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "IO.2",
      name: "Hectares with completed verification cycle",
      source: "bespoke",
      unit: "hectares",
      directionOfGood: "higher_is_better",
      tocLocation: "Intermediate Outcome",
      definitionMethodsSource: "Hectares where field ground-truth plus satellite biomass/land-cover verification has completed a full cycle against the registered baseline.",
      suggestedFrequency: "quarterly",
      justification: "Precondition for a second-party opinion and for the credit to be an eligible bond-backing asset rather than a promise (Layer B covenant).",
      aggregationMethod: "sum",
      // Bond-eligibility-critical: this is exactly the "asset-heavy debt
      // deal leans on third-party engineering sign-off" case from the
      // generalization memo (Decision 4/5) — verification rigor tied to
      // the Funding Instrument's stakes.
      requiresElevatedVerification: true,
    })
    .returning()
    .get();
  const metricProtectionHectares = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "OUT.4",
      name: "Hectares under executed territorial protection agreement",
      source: "bespoke",
      unit: "hectares",
      directionOfGood: "higher_is_better",
      tocLocation: "Outcome",
      definitionMethodsSource: "Hectares within the Coração Verde territory covered by executed consent and benefit-sharing agreements with the territory's Indigenous leadership and associations.",
      suggestedFrequency: "quarterly",
      justification: "Retires counterparty and social-licence risk — per the brief, the risk 'most often fatal to forest carbon projects.' Illustrative target scope; the source brief documents the pipeline qualitatively without a stated hectare figure.",
      aggregationMethod: "sum",
    })
    .returning()
    .get();
  const metricGhgAvoided = db
    .insert(metrics)
    .values({
      projectId: project.id,
      code: "OUT.5",
      name: "Greenhouse Gas Emissions Avoided",
      source: "iris_plus",
      sourceCode: "PI5460",
      unit: "Metric tons CO2e",
      directionOfGood: "higher_is_better",
      tocLocation: "Outcome",
      definitionMethodsSource: "Quantity of greenhouse gas emissions avoided as a result of the organization's activities, in metric tons of CO2 equivalent.",
      justification: "First vintages are carbon (ARR/REDD+) — the existing market, price, and buyer base the brief anchors on; other aspects are documented as co-benefits, not sold standalone in Phase 1.",
      aggregationMethod: "sum",
    })
    .returning()
    .get();

  db.insert(metricCapitalProviderTags)
    .values([
      { metricId: metricHectaresOnboarded.id, tag: "Bridge round investor pool" },
      { metricId: metricStewardsOnboarded.id, tag: "Bridge round investor pool" },
      { metricId: metricCostPerHectare.id, tag: "Bridge round investor pool" },
      { metricId: metricHectaresVerified.id, tag: "Bridge round investor pool" },
      { metricId: metricHectaresVerified.id, tag: "Layer B green bond (planned, in preparation)" },
      { metricId: metricProtectionHectares.id, tag: "Layer B green bond (planned, in preparation)" },
      { metricId: metricGhgAvoided.id, tag: "Layer B green bond (planned, in preparation)" },
    ])
    .run();

  // --- Jurisdictions: two origination channels, per the brief ("Two
  // origination channels, not one") — smallholder restoration (many
  // counterparties, shop-driven) and territorial protection (one
  // counterparty, satellite + community-team monitored) — both rolling
  // up to Verdania, exercising the multi-jurisdiction rollup fix. ---
  const verdania = db
    .insert(jurisdictions)
    .values({ projectId: project.id, name: "Verdania", level: "national" })
    .returning()
    .get();
  const serraAltaSmallholders = db
    .insert(jurisdictions)
    .values({ projectId: project.id, name: "Serra Alta smallholder catchment (restoration)", level: "subnational", parentJurisdictionId: verdania.id })
    .returning()
    .get();
  const coracaoVerdeTerritory = db
    .insert(jurisdictions)
    .values({ projectId: project.id, name: "Coração Verde territory (protection)", level: "subnational", parentJurisdictionId: verdania.id })
    .returning()
    .get();

  db.insert(jurisdictionBaselines)
    .values([
      { metricId: metricHectaresOnboarded.id, jurisdictionId: serraAltaSmallholders.id, baselineValue: 0, baselineDate: "2026-07", baselineSource: "BRARE Phase 1 pilot design", confidenceLevel: "high" },
      { metricId: metricProtectionHectares.id, jurisdictionId: coracaoVerdeTerritory.id, baselineValue: 0, baselineDate: "2026-07", baselineSource: "BRARE Phase 1 pilot design", confidenceLevel: "high" },
    ])
    .run();

  // --- Impact hypotheses, each linking a ToC rung pair plus (where
  // relevant) a parallel-lens milestone alongside its impact rung. ---
  const h1 = db
    .insert(impactHypotheses)
    .values({
      thesisId: thesis.id,
      statement:
        "IF BRARE Shops onboard land stewards with verified parcels and signed, financed regeneration plans (Output) THEN a replicable, cost-observed unit of shop-based smallholder restoration is proven within Phase 1's twelve months (Intermediate Outcome).",
      fromRungId: outputRung.id,
      toRungId: ioRung.id,
      linkedEngagementStageId: meaningfulUptakeStage.id,
      linkedCommercialStageId: shopUnitProvenStage.id,
      status: "testing",
    })
    .returning()
    .get();
  db.insert(assumptionRisks)
    .values({
      hypothesisId: h1.id,
      description:
        "Assumes land stewards trust digital onboarding, consent, and wallet mechanics enough to sign and stay enrolled; risk: offline connectivity gaps or distrust of a new digital intermediary could suppress enrollment independent of the offer's quality — this is exactly what the app's offline-capable field test (Q4 2026 gate) is designed to retire.",
    })
    .run();
  db.insert(hypothesisMetricLinks).values([{ hypothesisId: h1.id, metricId: metricHectaresOnboarded.id }, { hypothesisId: h1.id, metricId: metricCostPerHectare.id }]).run();

  const h2 = db
    .insert(impactHypotheses)
    .values({
      thesisId: thesis.id,
      statement:
        "IF audit-grade MRV baselines and a completed verification cycle exist on pilot polygons (Intermediate Outcome) THEN verified multi-aspect ecological credits become an eligible, buyer-demanded asset with letters of intent from carbon buyers (Outcome).",
      fromRungId: ioRung.id,
      toRungId: outcomeRung.id,
      linkedCommercialStageId: mrvDerisksStage.id,
      status: "untested",
    })
    .returning()
    .get();
  db.insert(assumptionRisks)
    .values({
      hypothesisId: h2.id,
      description:
        "Assumes buyer demand exists for Indigenous-led, high-integrity carbon; risk: the market for non-carbon co-benefits (water, cooling, biodiversity) is not yet established, so first vintages must be priced and sold as carbon alone with co-benefits as an uplift, not a standalone instrument, until TNFD/CSRD disclosure and SEEA EA recognition mature that market.",
    })
    .run();
  db.insert(hypothesisMetricLinks).values({ hypothesisId: h2.id, metricId: metricHectaresVerified.id }).run();
  db.insert(hypothesisMetricLinks).values({ hypothesisId: h2.id, metricId: metricGhgAvoided.id }).run();

  const h3 = db
    .insert(impactHypotheses)
    .values({
      thesisId: thesis.id,
      statement:
        "IF the Coração Verde territorial protection pipeline is documented to bond eligibility standard and consent/benefit-sharing agreements are executed (Outcome) THEN Layer B green bond financing can be issued to fund farmer transition loans at scale (Impact).",
      fromRungId: outcomeRung.id,
      toRungId: impactRung.id,
      linkedCommercialStageId: seriesAStage.id,
      status: "untested",
    })
    .returning()
    .get();
  db.insert(assumptionRisks)
    .values({
      hypothesisId: h3.id,
      description:
        "Assumes the territory's Indigenous leadership and associations continue to engage through the FPIC process; risk: a stalled or contested consent process would delay bond eligibility regardless of MRV quality — per the brief, the risk 'most often fatal to forest carbon projects.'",
    })
    .run();
  db.insert(hypothesisMetricLinks).values({ hypothesisId: h3.id, metricId: metricProtectionHectares.id }).run();

  // --- Milestone/target trajectories, aligned to the brief's four
  // quarterly gates. ---
  db.insert(metricTargets)
    .values([
      { metricId: metricHectaresOnboarded.id, period: "2026-Q4", baseline: 0, milestone: 2000, target: null, consequenceSeverity: "high", rationale: "Low end of the brief's indicative Phase 1 volume target (2,000-3,000 ha)." },
      { metricId: metricHectaresOnboarded.id, period: "2027-Q1", baseline: null, milestone: null, target: 3000, consequenceSeverity: "high", rationale: "High end of the indicative range; the volume number the next tranche is priced on." },
      { metricId: metricStewardsOnboarded.id, period: "2026-Q4", baseline: 0, milestone: 150, target: null, consequenceSeverity: "moderate" },
      { metricId: metricStewardsOnboarded.id, period: "2027-Q1", baseline: null, milestone: null, target: 250, consequenceSeverity: "moderate" },
      { metricId: metricCostPerHectare.id, period: "2027-Q1", baseline: null, milestone: null, target: 800, consequenceSeverity: "high", rationale: "Modeled restoration establishment cost per hectare from the brief's territorial-vs-restoration cost comparison (~USD 800 restoration vs. ~USD 100 protection); Q1 2027 is when this moves from modeled to observed." },
      { metricId: metricHectaresVerified.id, period: "2027-Q2", baseline: null, milestone: null, target: 2000, consequenceSeverity: "high", rationale: "Illustrative — first verification cycle covering a majority of onboarded hectares; the bond-eligibility gate." },
      { metricId: metricProtectionHectares.id, period: "2027-Q2", baseline: 0, milestone: null, target: 5000, consequenceSeverity: "moderate", rationale: "Illustrative — the brief documents the Coração Verde pipeline qualitatively (a single polygon under one set of agreements) without a stated hectare figure for this gate." },
    ])
    .run();

  // --- Fixture actuals: Q4 2026 hectares-onboarded split across both
  // origination channels (restoration + protection) in the same period —
  // this is the multi-jurisdiction rollup case: the dashboard must sum
  // both, not silently keep only one. ---
  db.insert(metricObservations)
    .values([
      { metricId: metricHectaresOnboarded.id, period: "2026-Q4", actualValue: 1200, jurisdictionId: serraAltaSmallholders.id, note: "Serra Alta smallholder catchment — shop-originated cohort.", status: "accepted", sourceType: "portfolio_import", submittedBy: "BRARE Shop, Serra Alta" },
      { metricId: metricHectaresOnboarded.id, period: "2026-Q4", actualValue: 850, jurisdictionId: coracaoVerdeTerritory.id, note: "Coração Verde territory — protection-track hectares entering the pipeline.", status: "accepted", sourceType: "portfolio_import", submittedBy: "BRARE field + community team" },
      { metricId: metricStewardsOnboarded.id, period: "2026-Q4", actualValue: 165, note: "First cohort — within the 150-250 target band.", status: "accepted", sourceType: "portfolio_import", submittedBy: "BRARE Shop, Serra Alta" },
    ])
    .run();

  // --- Evidence Hub demo data: a flagged elevated-verification
  // observation, a Certification/Audit Record to gate it, and use cases
  // spanning the funnel (including "Elena's Journey" from the deck). ---
  const flaggedObs = db
    .insert(metricObservations)
    .values({
      metricId: metricHectaresVerified.id,
      period: "2027-Q1",
      actualValue: 1850,
      note: "First-pass field + satellite cross-check on the Q4 2026 onboarded cohort.",
      status: "pending",
      sourceType: "direct_entry",
      submittedBy: "BRARE MRV lead",
      evidenceText: "Ground-truth protocol test report, March 2027: 1,850 hectares cross-checked against independent satellite biomass-monitoring layers with no material discrepancy.",
    })
    .returning()
    .get();
  db.insert(observationQualityChecks)
    .values([
      { observationId: flaggedObs.id, rule: "completeness", passed: true, detail: "Value and period present." },
      { observationId: flaggedObs.id, rule: "duplicate", passed: true, detail: "No existing observation for this metric/period." },
      { observationId: flaggedObs.id, rule: "evidence_consistency", passed: true, detail: "Reported value found in the supplied evidence text." },
      { observationId: flaggedObs.id, rule: "elevated_verification", passed: false, detail: "This metric requires elevated verification, but no current (non-expired) Certification/Audit Record is linked." },
    ])
    .run();
  db.insert(verificationRecords)
    .values({
      recordType: "observation",
      recordId: flaggedObs.id,
      flags: JSON.stringify(["elevated_verification"]),
      confidenceScore: 0.75,
      reviewerDecision: null,
      reviewerNotes: null,
    })
    .run();

  db.insert(useCases)
    .values([
      {
        projectId: project.id,
        origin: "survey",
        sector: "Restoration",
        topic: "Agroforestry income",
        narrativeText:
          "Elena, a smallholder from the Coração Verde territory with 3 hectares, joined BRARE to regenerate her land. Her net baseline income from crops was about $570/year; the BRARE plan models $3,247/year from agroforestry plus $493/year from BRARE credits once established. (Modeled case study from the BRARE pitch deck, illustrative — not yet an observed result.)",
        linkedHypothesisId: h1.id,
        stage: "result",
        verificationStatus: "unverified",
      },
      {
        projectId: project.id,
        origin: "partner",
        sector: "Territorial protection",
        topic: "FPIC consent",
        narrativeText:
          "the territory's Indigenous leadership and associations in the Coração Verde territory have opened the FPIC consent process with BRARE, engaging on benefit-sharing terms ahead of the territorial protection agreement.",
        linkedHypothesisId: h3.id,
        stage: "outcome",
        verificationStatus: "follow_up_in_progress",
      },
      {
        projectId: project.id,
        origin: "event",
        sector: "MRV",
        topic: "Field-satellite ground-truthing",
        narrativeText:
          "BRARE's ground-truth protocol was tested against independent satellite biomass-monitoring layers on the first pilot polygons, with field measurements matching satellite-derived estimates within an acceptable margin.",
        linkedHypothesisId: h2.id,
        stage: "top_outcome",
        verificationStatus: "verified",
        verifiedBy: "BRARE MRV lead",
        verifiedAt: new Date().toISOString(),
      },
    ])
    .run();

  db.insert(certificationRecords)
    .values({
      projectId: project.id,
      recordType: "third_party_audit",
      issuerName: "Canopy Metrics",
      issuerType: "Independent MRV data partner",
      scope: "Biomass gain verification — pilot polygons, Serra Alta smallholder catchment and Coração Verde territory",
      issueDate: "2026-08-01",
      expiryDate: "2027-08-01",
      linkedMetricId: metricGhgAvoided.id,
      notes: "Covers the GHG Emissions Avoided metric; the elevated-verification hectares-verified metric above is deliberately left ungated in the seed so the Review Queue's compliance block is directly demonstrable.",
    })
    .run();

  console.log(`Seeded project "${project.name}" (id ${project.id}) with thesis v${thesis.version}.`);
}

// Every application table, children-before-parents order isn't actually
// required below since foreign_keys is switched off for the duration of
// the wipe, but the ordering is kept sensible for readability.
const ALL_TABLES = [
  "learning_agenda_items",
  "metric_capital_provider_tags",
  "jurisdiction_baselines",
  "jurisdictions",
  "certification_records",
  "use_cases",
  "verification_records",
  "observation_quality_checks",
  "metric_observations",
  "metric_targets",
  "hypothesis_metric_links",
  "metrics",
  "assumption_risks",
  "impact_hypotheses",
  "commercial_value_chain_stages",
  "engagement_funnel_stages",
  "objective_output_activities",
  "toc_rungs",
  "climate_theses",
  "funding_instruments",
  "projects",
  "organizations",
];

// `npm run db:seed` used to only ever INSERT — running it more than once
// against the same data/mel-tool.db (easy to do by accident: re-running
// the script during development, or after a container restart) silently
// duplicated the org and both demo projects, so the home page listed
// City EV Mission and BRARE twice (or more). This prototype's whole
// purpose for the seed script is "reset to the canonical demo state," so
// make that literal: wipe every table first, so seeding is idempotent —
// running it any number of times always leaves exactly the two demo
// projects, never duplicates. (Any project created by hand through the
// UI's "New project" form is demo/scratch data in this single-user
// prototype and is expected to be cleared by a reseed too — see README.)
function resetDemoData() {
  sqlite.pragma("foreign_keys = OFF");
  for (const table of ALL_TABLES) {
    sqlite.prepare(`DELETE FROM ${table}`).run();
  }
  try {
    sqlite.prepare("DELETE FROM sqlite_sequence").run();
  } catch {
    // sqlite_sequence only exists once an autoincrement table has ever
    // held a row; on a freshly migrated, never-seeded DB it won't exist
    // yet — nothing to reset in that case.
  }
  sqlite.pragma("foreign_keys = ON");
}

function seed() {
  resetDemoData();

  const [org] = db
    .insert(organizations)
    .values({ name: "Conspectus Advisors (prototype workspace)" })
    .returning()
    .all();

  seedCityEv(org.id);
  seedBrare(org.id);
}

seed();
sqlite.close();
