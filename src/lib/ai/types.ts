/**
 * ThesisAssistant types — AI-assisted drafting only (spec Section 9.3 pattern).
 *
 * Per the resolved v5 decision, Phase 1 includes AI-assisted drafting of
 * a candidate Theory of Change / hypothesis set from free-text thesis
 * input — NOT elevated AI verification of outcomes (that is a later,
 * out-of-scope capability). The output here is always a draft: the user
 * reviews, edits, reorders, merges, or rejects every suggestion before
 * anything is saved. Nothing this module returns is written to the
 * database directly.
 *
 * This file has no "use server" directive so it can be imported from
 * both client and server code (types + the plain isAiAvailable check);
 * the actual LLM call lives in ./actions.ts, which is a server-only file.
 */

export type DraftRung = {
  rungType: "input" | "process" | "output" | "intermediate_outcome" | "outcome" | "impact";
  title: string;
  description: string;
};

export type DraftHypothesis = {
  statement: string;
  fromRungType: DraftRung["rungType"] | null;
  toRungType: DraftRung["rungType"] | null;
  assumptions: string[];
};

export type ThesisDraft = {
  rungs: DraftRung[];
  hypotheses: DraftHypothesis[];
};

export function isAiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
