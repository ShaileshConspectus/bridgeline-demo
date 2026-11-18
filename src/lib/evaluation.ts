/**
 * Impact-evaluation logic — pure functions, no DB or framework imports, so
 * they can be unit-tested and shared by server pages and client components.
 *
 * Adapted from "Impact Evaluation in Practice" (Gertler, Martinez, Premand,
 * Rawlings, Vermeersch; World Bank). The book's central ideas used here:
 *  - every causal claim needs a counterfactual (ch. 3);
 *  - the right method follows from the programme's operating rules (ch. 10);
 *  - evaluate selectively: high-stakes, innovative, replicable, untested,
 *    influential programmes (ch. 1);
 *  - power calculations decide whether a design can detect an effect (ch. 11).
 *
 * Bridgeline's buyers are mostly small portfolios where rigorous impact
 * estimation is not feasible, so every function here is designed to say so
 * plainly ("monitor and tell a contribution story") rather than force a
 * method that the data cannot support.
 */

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export type MethodKey =
  | "randomized_lottery"
  | "randomized_phase_in"
  | "randomized_promotion"
  | "regression_discontinuity"
  | "difference_in_differences"
  | "matching"
  | "contribution_analysis";

export const METHOD_LABEL: Record<MethodKey, string> = {
  randomized_lottery: "Randomized assignment (lottery)",
  randomized_phase_in: "Randomized phase-in",
  randomized_promotion: "Randomized promotion (encouragement design)",
  regression_discontinuity: "Regression discontinuity",
  difference_in_differences: "Difference-in-differences",
  matching: "Matching",
  contribution_analysis: "Contribution analysis (no statistical counterfactual)",
};

type MethodGuide = {
  keyAssumption: string;
  tests: string[];
  limits: string;
};

export const METHOD_GUIDE: Record<MethodKey, MethodGuide> = {
  randomized_lottery: {
    keyAssumption: "Chance alone decides who gets the programme, so treatment and comparison groups are statistically equivalent.",
    tests: ["Check balance on baseline characteristics.", "Track attrition and take-up in both groups."],
    limits: "Needs prospective design agreed before rollout; ethically defensible mainly when demand exceeds supply.",
  },
  randomized_phase_in: {
    keyAssumption: "Randomized rollout order means later-phase units are a valid comparison for earlier-phase units until they join.",
    tests: ["Check balance across phases at baseline.", "Confirm comparison units are not anticipating or receiving the programme early."],
    limits: "Comparison window ends when the last phase starts, so only short-run effects are estimable.",
  },
  randomized_promotion: {
    keyAssumption: "The encouragement changes take-up but affects outcomes only through take-up.",
    tests: ["Show the encouragement actually moves take-up (first stage).", "Argue why the encouragement has no direct effect on outcomes."],
    limits: "Estimates the effect for those who take up because of the encouragement, not everyone.",
  },
  regression_discontinuity: {
    keyAssumption: "Units just above and just below the eligibility cutoff are comparable, and the cutoff is enforced.",
    tests: ["Check no manipulation of the score around the cutoff.", "Check covariates are smooth across the cutoff."],
    limits: "The estimate is local to units near the cutoff; needs enough units near it.",
  },
  difference_in_differences: {
    keyAssumption: "Without the programme, treatment and comparison groups would have followed parallel trends.",
    tests: ["Compare pre-programme trends for both groups.", "Run a placebo test on an outcome the programme should not affect."],
    limits: "Fails if something else changes for only one group at the same time.",
  },
  matching: {
    keyAssumption: "Participants and matched non-participants differ only in characteristics you can observe.",
    tests: ["Confirm common support (overlap) between groups.", "Test sensitivity to unobserved differences."],
    limits: "Cannot account for unobserved differences (e.g. motivation); treat as the weakest quantitative option.",
  },
  contribution_analysis: {
    keyAssumption: "The results chain is plausible, each link is evidenced, and rival explanations are examined and ruled out.",
    tests: ["Test each link in the results chain against evidence.", "List and assess alternative explanations explicitly."],
    limits: "Supports a contribution claim, not a measured effect size. Be explicit that it is not attribution.",
  },
};

export type Timing = "prospective" | "retrospective";
export type Allocation =
  | "oversubscribed"
  | "phased"
  | "cutoff"
  | "voluntary_universal"
  | "universal"
  | "self_selected"
  | "judgement";
export type ComparisonData = "before_and_after" | "after_only" | "none";

export const ALLOCATION_LABEL: Record<Allocation, string> = {
  oversubscribed: "More eligible units than the programme can serve",
  phased: "Programme rolls out in phases over time",
  cutoff: "Eligibility is set by a score cutoff (e.g. an index threshold)",
  voluntary_universal: "Open to everyone, but take-up is voluntary",
  universal: "Everyone is covered at once (no one left out)",
  self_selected: "Units choose to join (self-selected)",
  judgement: "Staff or partners choose participants by judgement",
};

export const COMPARISON_DATA_LABEL: Record<ComparisonData, string> = {
  before_and_after: "Data on non-participants before and after",
  after_only: "Data on non-participants after only",
  none: "No data on non-participants",
};

/** Below this many independent units, statistical impact estimation is not credible. */
export const MIN_UNITS_FOR_STATISTICAL = 30;

export type MethodInputs = {
  timing: Timing;
  allocation: Allocation;
  comparisonData: ComparisonData;
  numUnits: number | null;
};

export type MethodRecommendation = {
  primary: MethodKey;
  alternatives: MethodKey[];
  /** Whether the primary method produces a statistical counterfactual. */
  statistical: boolean;
  rationale: string;
  warnings: string[];
};

export function recommendMethod(input: MethodInputs): MethodRecommendation {
  const { timing, allocation, comparisonData, numUnits } = input;
  const prospective = timing === "prospective";
  const warnings: string[] = [];
  const alternatives: MethodKey[] = [];
  let primary: MethodKey;
  let rationale: string;

  const hasBeforeAfter = comparisonData === "before_and_after";
  const hasAfter = comparisonData !== "none";

  if (allocation === "oversubscribed" && prospective) {
    primary = "randomized_lottery";
    rationale =
      "Demand exceeds capacity, so a lottery is both fair and gives a valid comparison group. This is the strongest design available when it can be planned before rollout.";
    if (hasBeforeAfter) alternatives.push("difference_in_differences");
  } else if (allocation === "phased" && prospective) {
    primary = "randomized_phase_in";
    rationale =
      "Phased rollout lets you randomize the order. Units not yet reached are the comparison group until they join.";
    if (hasBeforeAfter) alternatives.push("difference_in_differences");
  } else if (allocation === "voluntary_universal" && prospective) {
    primary = "randomized_promotion";
    rationale =
      "You cannot deny the programme, but you can randomly encourage some units to take it up. The difference in take-up creates a comparison.";
    if (hasBeforeAfter) alternatives.push("difference_in_differences");
  } else if (allocation === "cutoff") {
    primary = "regression_discontinuity";
    rationale =
      "A strictly applied eligibility cutoff makes units just either side comparable, even for a programme already running.";
    if (hasBeforeAfter) alternatives.push("difference_in_differences");
    warnings.push("The estimate applies only to units near the cutoff, and the cutoff must be enforced in practice.");
  } else if (hasBeforeAfter) {
    primary = "difference_in_differences";
    rationale =
      "You have outcome data on non-participants before and after, so you can compare changes over time and remove fixed differences between groups.";
    if (hasAfter) alternatives.push("matching");
    if (!prospective) {
      warnings.push("Retrospective design: you cannot add a baseline, so parallel trends can only be checked on whatever history exists.");
    }
  } else if (comparisonData === "after_only") {
    primary = "matching";
    rationale =
      "You only have post-programme data on non-participants, so the best quantitative option is matching on observed characteristics.";
    warnings.push("Matching cannot remove bias from unobserved differences such as motivation. Treat results as indicative, not conclusive.");
  } else {
    primary = "contribution_analysis";
    rationale =
      "With no data on a comparison group, a credible counterfactual is not available. Build a tested results chain and rule out rival explanations instead.";
  }

  if (allocation === "universal" && prospective && comparisonData === "none") {
    warnings.push(
      "Everyone is covered at once and no comparison data exists. If a later cohort or region will join, plan to collect data on it now.",
    );
  }
  if (allocation === "self_selected" || allocation === "judgement") {
    warnings.push(
      "Participants were chosen by self-selection or judgement, so a naive participant vs non-participant comparison will be biased (the book's 'counterfeit' estimate).",
    );
  }
  if ((allocation === "oversubscribed" || allocation === "phased" || allocation === "voluntary_universal") && !prospective) {
    warnings.push("Randomized designs need to be planned before rollout. Because this is retrospective, a randomized option is not available.");
  }

  // Small-n safeguard: with too few independent units no statistical design
  // is credible, so the headline becomes contribution analysis and the design
  // the rules would otherwise point to is kept as the "if more units" option.
  if (primary !== "contribution_analysis" && numUnits !== null && numUnits < MIN_UNITS_FOR_STATISTICAL) {
    const statisticalOption = primary;
    warnings.push(
      `Only ${numUnits} independent unit${numUnits === 1 ? "" : "s"}: too few for a credible statistical estimate (rule of thumb: ${MIN_UNITS_FOR_STATISTICAL}+). Run the power check before committing to ${METHOD_LABEL[statisticalOption]}.`,
    );
    rationale = `Too few independent units for a credible statistical comparison, so rely on a tested results chain with strong monitoring. If more units become available, the design your programme's rules point to is ${METHOD_LABEL[statisticalOption]}: ${rationale}`;
    alternatives.unshift(statisticalOption);
    primary = "contribution_analysis";
  }
  if (primary !== "contribution_analysis" && !alternatives.includes("contribution_analysis")) {
    alternatives.push("contribution_analysis");
  }

  return {
    primary,
    alternatives: [...new Set(alternatives)].filter((m) => m !== primary),
    statistical: primary !== "contribution_analysis",
    rationale,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// "Should we evaluate at all?" screen
// ---------------------------------------------------------------------------

export type ScreenFlags = {
  highStakes: boolean;
  innovative: boolean;
  replicable: boolean;
  untested: boolean;
  influential: boolean;
};

export const SCREEN_CRITERIA: { key: keyof ScreenFlags; label: string; help: string }[] = [
  { key: "highStakes", label: "High stakes", help: "Large budget, many people, or a major funding decision rides on the answer." },
  { key: "innovative", label: "Innovative", help: "A new approach, not a standard, well-understood intervention." },
  { key: "replicable", label: "Replicable", help: "It could be repeated or scaled elsewhere if it works." },
  { key: "untested", label: "Untested", help: "There is little or no existing credible evidence it works in this setting." },
  { key: "influential", label: "Influential", help: "Results would change decisions by this funder or others." },
];

export type ScreenVerdict = "evaluate_rigorously" | "light_touch" | "monitor_only";

export const SCREEN_VERDICT_LABEL: Record<ScreenVerdict, string> = {
  evaluate_rigorously: "Evaluate rigorously",
  light_touch: "Light-touch evaluation",
  monitor_only: "Monitor and learn",
};

export function screenScore(flags: ScreenFlags): number {
  return SCREEN_CRITERIA.filter((c) => flags[c.key]).length;
}

export function screenVerdict(flags: ScreenFlags): ScreenVerdict {
  const score = screenScore(flags);
  if (score >= 4) return "evaluate_rigorously";
  if (score >= 2) return "light_touch";
  return "monitor_only";
}

// ---------------------------------------------------------------------------
// Evidence strength
// ---------------------------------------------------------------------------

export type StudyDesign =
  | "randomized"
  | "regression_discontinuity"
  | "difference_in_differences"
  | "matching"
  | "before_after"
  | "enrolled_vs_not_enrolled"
  | "qualitative"
  | "other";

export type EvidenceTier = "strong" | "moderate" | "limited" | "weak" | "contextual";

export const DESIGN_LABEL: Record<StudyDesign, string> = {
  randomized: "Randomized trial",
  regression_discontinuity: "Regression discontinuity",
  difference_in_differences: "Difference-in-differences",
  matching: "Matching",
  before_after: "Before / after",
  enrolled_vs_not_enrolled: "Enrolled vs not enrolled",
  qualitative: "Qualitative / case study",
  other: "Other",
};

export const TIER_LABEL: Record<EvidenceTier, string> = {
  strong: "Strong",
  moderate: "Moderate",
  limited: "Limited",
  weak: "Weak",
  contextual: "Contextual",
};

const DESIGN_TIER: Record<StudyDesign, EvidenceTier> = {
  randomized: "strong",
  regression_discontinuity: "strong",
  difference_in_differences: "moderate",
  matching: "limited",
  before_after: "weak",
  enrolled_vs_not_enrolled: "weak",
  qualitative: "contextual",
  other: "contextual",
};

/** Higher = stronger. Contextual evidence sits above weak designs only for explanation, not for effect size. */
const TIER_RANK: Record<EvidenceTier, number> = { strong: 5, moderate: 4, limited: 3, contextual: 2, weak: 1 };

export function designTier(design: StudyDesign): EvidenceTier {
  return DESIGN_TIER[design];
}

export const DESIGN_NOTE: Partial<Record<StudyDesign, string>> = {
  before_after:
    "Counterfeit risk: cannot separate the programme's effect from everything else that changed over time.",
  enrolled_vs_not_enrolled:
    "Counterfeit risk: people who enrol usually differ from those who do not, so the gap is biased.",
  matching: "Cannot account for unobserved differences between participants and non-participants.",
  qualitative: "Explains why and how, but does not estimate how much.",
};

export type StudyLike = { design: StudyDesign; studyScope?: "efficacy" | "effectiveness" | "unknown" };

export type EvidenceBase = {
  tier: EvidenceTier | null;
  count: number;
  /** Strongest design is only an efficacy (controlled-conditions) study. */
  efficacyOnly: boolean;
};

export function evidenceBase(studies: StudyLike[]): EvidenceBase {
  if (studies.length === 0) return { tier: null, count: 0, efficacyOnly: false };
  let best = studies[0];
  for (const s of studies) {
    if (TIER_RANK[DESIGN_TIER[s.design]] > TIER_RANK[DESIGN_TIER[best.design]]) best = s;
  }
  const bestTier = DESIGN_TIER[best.design];
  const sameTier = studies.filter((s) => DESIGN_TIER[s.design] === bestTier);
  return {
    tier: bestTier,
    count: studies.length,
    efficacyOnly: sameTier.every((s) => s.studyScope === "efficacy"),
  };
}

// ---------------------------------------------------------------------------
// Hypothesis counterfactual completeness
// ---------------------------------------------------------------------------

export type HypothesisLike = {
  status: string;
  counterfactual: string | null;
  comparisonApproach: string | null;
  claimType: "attribution" | "contribution";
};

/** Plain-language gaps on a hypothesis's causal claim; empty = nothing to flag. */
export function hypothesisGaps(h: HypothesisLike, base: EvidenceBase): string[] {
  const gaps: string[] = [];
  if (!h.counterfactual || !h.counterfactual.trim()) gaps.push("No counterfactual stated: what would happen without the intervention?");
  if (!h.comparisonApproach || h.comparisonApproach === "none") {
    if (h.claimType === "attribution") gaps.push("Claims attribution but has no comparison approach.");
  }
  if (h.claimType === "attribution" && (h.comparisonApproach === "before_after" || h.comparisonApproach === "contribution_analysis")) {
    gaps.push("Attribution claim rests on a design that cannot support it. Downgrade to contribution or change design.");
  }
  if (h.status === "supported" && (base.tier === null || base.tier === "weak")) {
    gaps.push(
      base.tier === null
        ? "Marked supported but no evidence studies are linked."
        : "Marked supported but the strongest linked study uses a weak design.",
    );
  }
  return gaps;
}

// ---------------------------------------------------------------------------
// SMART indicator check
// ---------------------------------------------------------------------------

export type SmartInput = {
  source: "iris_plus" | "sdg" | "bespoke";
  unit: string | null;
  definitionMethodsSource: string | null;
  calculationMethod: string | null;
  suggestedFrequency: string | null;
  disaggregationDimensions: string | null;
  justification: string | null;
  linkedHypothesisCount: number;
  hasBaseline: boolean;
  hasTarget: boolean;
  hasTargetDate: boolean;
};

export type SmartResult = {
  specific: boolean;
  measurable: boolean;
  attributable: boolean;
  realistic: boolean;
  targeted: boolean;
  score: number;
  missing: string[];
};

const filled = (v: string | null) => !!v && v.trim().length > 0;

export function smartCheck(m: SmartInput): SmartResult {
  const standard = m.source !== "bespoke"; // catalogue entries arrive with a standard definition
  const specific = standard || filled(m.definitionMethodsSource);
  const measurable = filled(m.unit) && (standard || filled(m.calculationMethod)) && filled(m.suggestedFrequency);
  const attributable = m.linkedHypothesisCount > 0;
  const realistic = m.hasBaseline; // a target is only realistic relative to a starting point
  const targeted = m.hasTarget && (m.hasTargetDate || filled(m.disaggregationDimensions));

  const missing: string[] = [];
  if (!specific) missing.push("Specific: add a definition and where it comes from.");
  if (!measurable) missing.push("Measurable: set a unit, a calculation method and a reporting frequency.");
  if (!attributable) missing.push("Attributable: link it to at least one hypothesis.");
  if (!realistic) missing.push("Realistic: record a baseline so targets can be judged.");
  if (!targeted) missing.push("Targeted: set a target with a date or a target population.");

  const score = [specific, measurable, attributable, realistic, targeted].filter(Boolean).length;
  return { specific, measurable, attributable, realistic, targeted, score, missing };
}

// ---------------------------------------------------------------------------
// Power / minimum detectable effect
// ---------------------------------------------------------------------------

// Normal quantiles for the common choices (two-sided alpha, power).
const Z_ALPHA: Record<number, number> = { 0.05: 1.959964, 0.1: 1.644854 };
const Z_POWER: Record<number, number> = { 0.8: 0.841621, 0.9: 1.281552 };

export type PowerInput = {
  /** Individuals per arm (treatment and comparison are assumed equal in size). */
  nPerArm: number;
  /** Individuals per cluster; 1 means individual-level randomization. */
  clusterSize: number;
  /** Intra-cluster correlation; ignored when clusterSize is 1. */
  icc: number;
  alpha: 0.05 | 0.1;
  power: 0.8 | 0.9;
  /** Standard deviation of the outcome, to express MDE in outcome units. */
  outcomeSd: number | null;
};

export type PowerResult = {
  designEffect: number;
  /** Minimum detectable effect in standard-deviation units. */
  mdeSd: number;
  /** Minimum detectable effect in outcome units, if an SD was given. */
  mdeAbsolute: number | null;
  clusters: number;
};

export function minimumDetectableEffect(p: PowerInput): PowerResult | null {
  if (!(p.nPerArm > 1) || !(p.clusterSize >= 1) || p.icc < 0 || p.icc > 1) return null;
  const designEffect = 1 + (p.clusterSize - 1) * p.icc;
  const z = Z_ALPHA[p.alpha] + Z_POWER[p.power];
  // Two equal arms, equal variance: MDE (in SDs) = z * sqrt(2 * DEFF / n)
  const mdeSd = z * Math.sqrt((2 * designEffect) / p.nPerArm);
  return {
    designEffect,
    mdeSd,
    mdeAbsolute: p.outcomeSd && p.outcomeSd > 0 ? mdeSd * p.outcomeSd : null,
    clusters: Math.ceil(p.nPerArm / p.clusterSize) * 2,
  };
}

/** Plain-language read of an MDE in SD units (Cohen's rough benchmarks). */
export function mdeReading(mdeSd: number): string {
  if (mdeSd <= 0.2) return "Can detect small effects. Good power.";
  if (mdeSd <= 0.5) return "Can detect moderate effects only. Check this is realistic for your intervention.";
  if (mdeSd <= 0.8) return "Can detect only large effects. Most programmes do not produce effects this big, so a null result would be uninformative.";
  return "Underpowered: only very large effects are detectable. Do not claim impact from this sample.";
}
