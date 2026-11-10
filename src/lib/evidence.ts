import type { certificationRecords } from "@/db/schema";

type CertificationRecord = typeof certificationRecords.$inferSelect;

export type RenewalStatus = "current" | "due_soon" | "expired" | "no_expiry";

const DUE_SOON_WINDOW_DAYS = 60;

// Renewal status is always computed from expiryDate, never stored, per
// the spec's Certification/Audit Record object.
export function renewalStatus(record: Pick<CertificationRecord, "expiryDate">, asOf: Date = new Date()): RenewalStatus {
  if (!record.expiryDate) return "no_expiry";
  const expiry = new Date(record.expiryDate);
  if (Number.isNaN(expiry.getTime())) return "no_expiry";
  const daysUntilExpiry = (expiry.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= DUE_SOON_WINDOW_DAYS) return "due_soon";
  return "current";
}

export function isCertificationCurrent(record: Pick<CertificationRecord, "expiryDate">, asOf: Date = new Date()): boolean {
  const status = renewalStatus(record, asOf);
  return status === "current" || status === "due_soon" || status === "no_expiry";
}

// Survey fatigue guardrail (spec Module 3, workflow 4): the tool tracks
// how many times a given respondent/site has been surveyed in a rolling
// 12-month window and warns before a submission would push them past a
// configurable cap. The prototype doesn't have a first-class
// DataCollectionInstrument object yet, so "respondent/site" is
// approximated by the observation's free-text `submitted_by` field —
// close enough to demonstrate the guardrail without a schema migration.
export const SURVEY_FATIGUE_DEFAULT_CAP = 4;
const ROLLING_WINDOW_DAYS = 365;

export function checkSurveyFatigue(
  priorSubmissionsBySameRespondent: { recordedAt: string }[],
  cap: number = SURVEY_FATIGUE_DEFAULT_CAP,
  asOf: Date = new Date(),
): { countInWindow: number; cap: number; exceeded: boolean } {
  const windowStart = asOf.getTime() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const countInWindow = priorSubmissionsBySameRespondent.filter((o) => {
    const t = new Date(o.recordedAt.replace(" ", "T")).getTime();
    return Number.isFinite(t) && t >= windowStart;
  }).length;
  // +1 for the submission currently being made.
  return { countInWindow: countInWindow + 1, cap, exceeded: countInWindow + 1 > cap };
}
