"use server";

import Anthropic from "@anthropic-ai/sdk";
import { isAiAvailable, type ThesisDraft } from "./types";

const SYSTEM_PROMPT = `You are a monitoring, evaluation and learning (MEL) analyst assisting with drafting a Theory of Change and impact hypotheses for a climate or development project.

Given a free-text project thesis, propose:
1. A results ladder of 4-8 rungs across the causal chain input -> process -> output -> intermediate_outcome -> outcome -> impact (intermediate_outcome is optional, use only where genuinely useful).
2. A set of 2-5 falsifiable "IF ... THEN ..." impact hypotheses that connect specific rungs, each with 1-2 plausible assumptions or risks that could break the causal link.

This is a DRAFT for a human analyst to edit, reorder, merge, or reject — not a final answer. Be concrete and specific to the thesis text given; do not pad with generic language.

Respond ONLY with JSON matching this shape, no prose, no markdown fences:
{
  "rungs": [{ "rungType": "input|process|output|intermediate_outcome|outcome|impact", "title": "string", "description": "string" }],
  "hypotheses": [{ "statement": "string (IF ... THEN ... format)", "fromRungType": "rungType or null", "toRungType": "rungType or null", "assumptions": ["string"] }]
}`;

export async function draftThesisDecomposition(
  thesisText: string,
): Promise<{ ok: true; draft: ThesisDraft } | { ok: false; reason: string }> {
  if (!isAiAvailable()) {
    return {
      ok: false,
      reason:
        "AI-assisted drafting is not configured in this environment (no ANTHROPIC_API_KEY set). Use the manual entry forms below instead.",
    };
  }

  if (!thesisText || thesisText.trim().length < 20) {
    return {
      ok: false,
      reason: "Enter a fuller thesis statement (at least a sentence or two) before requesting an AI draft.",
    };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: thesisText }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, reason: "The AI response did not contain usable text. Try again or draft manually." };
    }

    let raw = textBlock.text.trim();
    // Defensive: strip markdown fences if the model adds them despite instructions.
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(json)?/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(raw) as ThesisDraft;
    if (!Array.isArray(parsed.rungs) || !Array.isArray(parsed.hypotheses)) {
      throw new Error("Malformed draft shape");
    }

    return { ok: true, draft: parsed };
  } catch (err) {
    return {
      ok: false,
      reason: `AI drafting failed (${err instanceof Error ? err.message : "unknown error"}). You can draft manually instead.`,
    };
  }
}
