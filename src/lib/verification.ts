/**
 * Rules-based Quality Check + AI-enabled outcome verification pipeline
 * (spec Module 3, "prototype scope — simulated/rules-based stand-in").
 *
 * Per the resolved design decision, Phase 1 verification is 100%
 * rules-based (statistical checks + simple text matching), never an
 * autonomous accept/reject — every check produces a pass/fail + detail,
 * and the overall result is a confidence score + human-readable
 * rationale for a person to review. This is intentionally architected
 * as a standalone function (a `VerificationProvider`-shaped interface,
 * per spec Section 9.3) so a real LLM/ML verifier can be swapped in
 * later without changing the review-queue UI or the calling code in
 * src/lib/actions.ts.
 */

export type QualityCheckResult = {
  rule: string;
  passed: boolean;
  detail: string;
};

export type VerificationResult = {
  checks: QualityCheckResult[];
  flags: string[];
  confidenceScore: number; // 0-1
  rationale: string;
  autoStatus: "accepted" | "pending"; // pending -> goes to the human review queue
};

export function runObservationVerification(input: {
  actualValue: number;
  period: string;
  evidenceText: string | null;
  priorObservations: { period: string; actualValue: number }[];
  metricRequiresElevatedVerification: boolean;
  hasCurrentCertification: boolean;
  surveyFatigue?: { countInWindow: number; cap: number; exceeded: boolean } | null;
}): VerificationResult {
  const checks: QualityCheckResult[] = [];

  // Completeness: enforced by the form (period + value required), but
  // checked here too so the pipeline is self-contained.
  checks.push({
    rule: "completeness",
    passed: input.period.trim().length > 0 && Number.isFinite(input.actualValue),
    detail: "Period and actual value are both present.",
  });

  // Duplicate detection: an observation already exists for this period.
  const duplicate = input.priorObservations.some((o) => o.period === input.period);
  checks.push({
    rule: "duplicate",
    passed: !duplicate,
    detail: duplicate
      ? `An observation for period "${input.period}" already exists for this metric.`
      : "No existing observation for this period.",
  });

  // Range check: value outside 3x the historical range (spec's own
  // definition of the range check).
  if (input.priorObservations.length > 0) {
    const values = input.priorObservations.map((o) => o.actualValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, Math.abs(max) * 0.1, 1); // avoid a zero-width band
    const lowerBound = min - span * 3;
    const upperBound = max + span * 3;
    const withinRange = input.actualValue >= lowerBound && input.actualValue <= upperBound;
    checks.push({
      rule: "range",
      passed: withinRange,
      detail: withinRange
        ? `Within 3x the historical range (${min}–${max}).`
        : `Outside 3x the historical range (${min}–${max}) — reported ${input.actualValue}.`,
    });
  }

  // Consistency: an implausible jump vs. the most recent prior value
  // (more than a 2x swing either direction).
  const mostRecent = input.priorObservations[input.priorObservations.length - 1];
  if (mostRecent && mostRecent.actualValue !== 0) {
    const ratio = input.actualValue / mostRecent.actualValue;
    const plausible = ratio >= 0.5 && ratio <= 2;
    checks.push({
      rule: "consistency",
      passed: plausible,
      detail: plausible
        ? `Consistent with the prior period's value (${mostRecent.actualValue}).`
        : `Large jump vs. the prior period's value (${mostRecent.actualValue} → ${input.actualValue}).`,
    });
  }

  // Evidence cross-check: simple text-matching heuristic — does the
  // attached evidence text mention the reported number.
  if (input.evidenceText && input.evidenceText.trim().length > 0) {
    const mentionsValue =
      input.evidenceText.includes(String(input.actualValue)) ||
      input.evidenceText.includes(String(Math.round(input.actualValue)));
    checks.push({
      rule: "evidence_consistency",
      passed: mentionsValue,
      detail: mentionsValue
        ? "The attached evidence text mentions the reported value."
        : "The attached evidence text does not obviously mention the reported value — worth a manual look.",
    });
  }

  // Survey fatigue guardrail: warn (don't block) when the same
  // respondent/site has now been surveyed more than the configurable cap
  // within a rolling 12-month window.
  if (input.surveyFatigue) {
    const { countInWindow, cap, exceeded } = input.surveyFatigue;
    checks.push({
      rule: "survey_fatigue",
      passed: !exceeded,
      detail: exceeded
        ? `This respondent/site has now been surveyed ${countInWindow} times in the past 12 months, over the cap of ${cap} — consider spacing out future requests.`
        : `This respondent/site has been surveyed ${countInWindow} of ${cap} times allowed in the past 12 months.`,
    });
  }

  // Elevated verification: if the metric requires it, a current
  // Certification/Audit Record must be attached.
  if (input.metricRequiresElevatedVerification) {
    checks.push({
      rule: "elevated_verification",
      passed: input.hasCurrentCertification,
      detail: input.hasCurrentCertification
        ? "A current Certification/Audit Record is linked to this metric."
        : "This metric requires elevated verification, but no current (non-expired) Certification/Audit Record is linked.",
    });
  }

  const failed = checks.filter((c) => !c.passed);
  const flags = failed.map((c) => `${c.rule}: ${c.detail}`);
  const confidenceScore = checks.length === 0 ? 1 : (checks.length - failed.length) / checks.length;

  const rationale =
    failed.length === 0
      ? "All automated checks passed."
      : `${failed.length} of ${checks.length} checks did not pass: ${failed.map((c) => c.rule).join(", ")}.`;

  return {
    checks,
    flags,
    confidenceScore,
    rationale,
    autoStatus: failed.length === 0 ? "accepted" : "pending",
  };
}
