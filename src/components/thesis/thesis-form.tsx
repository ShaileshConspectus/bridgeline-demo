"use client";

import { useState, useTransition } from "react";
import { saveThesis, acceptThesisDraft } from "@/lib/actions";
import { draftThesisDecomposition } from "@/lib/ai/actions";
import type { ThesisDraft } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import type { climateTheses } from "@/db/schema";

type Thesis = typeof climateTheses.$inferSelect;

const RUNG_LABELS: Record<string, string> = {
  input: "Input",
  process: "Process",
  output: "Output",
  intermediate_outcome: "Intermediate outcome",
  outcome: "Outcome",
  impact: "Impact",
};

export function ThesisForm({ projectId, thesis }: { projectId: number; thesis: Thesis | null }) {
  const [editing, setEditing] = useState(!thesis);
  const [statementDraft, setStatementDraft] = useState(thesis?.statement ?? "");
  const [aiState, setAiState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; reason: string }
    | { status: "ready"; draft: ThesisDraft; acceptedRungs: boolean[]; acceptedHyps: boolean[] }
  >({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  async function requestAiDraft() {
    setAiState({ status: "loading" });
    const result = await draftThesisDecomposition(statementDraft);
    if (result.ok) {
      setAiState({
        status: "ready",
        draft: result.draft,
        acceptedRungs: result.draft.rungs.map(() => true),
        acceptedHyps: result.draft.hypotheses.map(() => true),
      });
    } else {
      setAiState({ status: "error", reason: result.reason });
    }
  }

  function acceptDraft(thesisId: number) {
    if (aiState.status !== "ready") return;
    const rungs = aiState.draft.rungs.filter((_, i) => aiState.acceptedRungs[i]);
    const hypotheses = aiState.draft.hypotheses.filter((_, i) => aiState.acceptedHyps[i]);
    startTransition(async () => {
      await acceptThesisDraft(
        thesisId,
        projectId,
        rungs.map((r) => ({ rungType: r.rungType, title: r.title, description: r.description })),
        hypotheses.map((h) => ({
          statement: h.statement,
          fromRungType: h.fromRungType,
          toRungType: h.toRungType,
          assumptions: h.assumptions,
        })),
      );
      setAiState({ status: "idle" });
    });
  }

  if (!editing && thesis) {
    return (
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Climate thesis</CardTitle>
            <CardDescription>Version {thesis.version}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Revise
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0 text-sm">
          <p>{thesis.statement}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {thesis.problem && (
              <div>
                <dt className="text-muted">Problem</dt>
                <dd>{thesis.problem}</dd>
              </div>
            )}
            {thesis.targetPopulation && (
              <div>
                <dt className="text-muted">Target population</dt>
                <dd>{thesis.targetPopulation}</dd>
              </div>
            )}
            {thesis.geography && (
              <div>
                <dt className="text-muted">Geography</dt>
                <dd>{thesis.geography}</dd>
              </div>
            )}
            {thesis.timeHorizon && (
              <div>
                <dt className="text-muted">Time horizon</dt>
                <dd>{thesis.timeHorizon}</dd>
              </div>
            )}
            {thesis.expectedChange && (
              <div className="col-span-2">
                <dt className="text-muted">Expected change</dt>
                <dd>{thesis.expectedChange}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{thesis ? "Revise thesis" : "Climate thesis"}</CardTitle>
        <CardDescription>
          {thesis
            ? "Saving creates a new version; prior versions stay visible in the history below."
            : "This becomes version 1. You can revise it later without losing history."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form
          action={async (formData) => {
            await saveThesis(projectId, formData);
            setEditing(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="statement">Thesis statement</Label>
            <Textarea
              id="statement"
              name="statement"
              required
              rows={3}
              value={statementDraft}
              onChange={(e) => setStatementDraft(e.target.value)}
              placeholder="If we provide X, then Y will happen, resulting in Z."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="problem">Problem</Label>
              <Textarea id="problem" name="problem" defaultValue={thesis?.problem ?? ""} rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetPopulation">Target population</Label>
              <Textarea id="targetPopulation" name="targetPopulation" defaultValue={thesis?.targetPopulation ?? ""} rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="geography">Geography</Label>
              <Input id="geography" name="geography" defaultValue={thesis?.geography ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timeHorizon">Time horizon</Label>
              <Input id="timeHorizon" name="timeHorizon" defaultValue={thesis?.timeHorizon ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expectedChange">Expected change</Label>
            <Textarea id="expectedChange" name="expectedChange" defaultValue={thesis?.expectedChange ?? ""} rows={2} />
          </div>
          {thesis && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="changeNote">What changed in this revision? (optional)</Label>
              <Input id="changeNote" name="changeNote" placeholder="e.g. Narrowed geography after Q2 review" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit">{thesis ? "Save new version" : "Save thesis"}</Button>
            {thesis && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        {thesis && (
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">AI-assisted decomposition</p>
                <p className="text-sm text-muted">
                  Draft candidate results-ladder rungs and hypotheses from the thesis text above.
                  You review and choose what to keep — nothing saves automatically.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={requestAiDraft} disabled={aiState.status === "loading"}>
                {aiState.status === "loading" ? "Drafting…" : "Draft with AI"}
              </Button>
            </div>

            {aiState.status === "error" && (
              <p className="mt-3 rounded-md bg-warning/10 p-3 text-sm text-warning">{aiState.reason}</p>
            )}

            {aiState.status === "ready" && (
              <div className="mt-4 flex flex-col gap-4 rounded-md border border-border p-4">
                <div>
                  <p className="mb-2 text-sm font-semibold">Proposed results ladder</p>
                  <div className="flex flex-col gap-2">
                    {aiState.draft.rungs.map((r, i) => (
                      <label key={i} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={aiState.acceptedRungs[i]}
                          onChange={(e) => {
                            const next = [...aiState.acceptedRungs];
                            next[i] = e.target.checked;
                            setAiState({ ...aiState, acceptedRungs: next });
                          }}
                        />
                        <span>
                          <Badge variant="outline" className="mr-2">
                            {RUNG_LABELS[r.rungType]}
                          </Badge>
                          <strong>{r.title}</strong> — {r.description}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Proposed impact hypotheses</p>
                  <div className="flex flex-col gap-2">
                    {aiState.draft.hypotheses.map((h, i) => (
                      <label key={i} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={aiState.acceptedHyps[i]}
                          onChange={(e) => {
                            const next = [...aiState.acceptedHyps];
                            next[i] = e.target.checked;
                            setAiState({ ...aiState, acceptedHyps: next });
                          }}
                        />
                        <span>
                          {h.statement}
                          {h.assumptions.length > 0 && (
                            <span className="block text-muted">
                              Assumptions: {h.assumptions.join("; ")}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <CardFooter className="p-0">
                  <Button type="button" onClick={() => acceptDraft(thesis.id)} disabled={isPending}>
                    {isPending ? "Saving…" : "Accept selected"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setAiState({ status: "idle" })}>
                    Discard
                  </Button>
                </CardFooter>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
