"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveEvaluationAssessment, deleteEvaluationAssessment } from "@/lib/actions";
import {
  recommendMethod,
  screenVerdict,
  screenScore,
  METHOD_LABEL,
  METHOD_GUIDE,
  ALLOCATION_LABEL,
  COMPARISON_DATA_LABEL,
  SCREEN_CRITERIA,
  SCREEN_VERDICT_LABEL,
  type Allocation,
  type ComparisonData,
  type MethodKey,
  type ScreenFlags,
  type ScreenVerdict,
  type Timing,
} from "@/lib/evaluation";
import { Trash2 } from "lucide-react";
import type { evaluationAssessments, impactHypotheses } from "@/db/schema";

type Assessment = typeof evaluationAssessments.$inferSelect;
type Hypothesis = typeof impactHypotheses.$inferSelect;

const VERDICT_VARIANT: Record<ScreenVerdict, "ok" | "warning" | "muted"> = {
  evaluate_rigorously: "ok",
  light_touch: "warning",
  monitor_only: "muted",
};

const selectClass = "h-9 rounded-md border border-border bg-surface px-3 text-sm";

export function MethodSelector({
  projectId,
  hypotheses,
  assessments,
}: {
  projectId: number;
  hypotheses: Hypothesis[];
  assessments: Assessment[];
}) {
  const [timing, setTiming] = useState<Timing>("prospective");
  const [allocation, setAllocation] = useState<Allocation>("oversubscribed");
  const [comparisonData, setComparisonData] = useState<ComparisonData>("none");
  const [numUnits, setNumUnits] = useState("");
  const [flags, setFlags] = useState<ScreenFlags>({
    highStakes: false,
    innovative: false,
    replicable: false,
    untested: false,
    influential: false,
  });

  const units = numUnits.trim() === "" || Number.isNaN(Number(numUnits)) ? null : Math.floor(Number(numUnits));
  const rec = useMemo(
    () => recommendMethod({ timing, allocation, comparisonData, numUnits: units }),
    [timing, allocation, comparisonData, units],
  );
  const verdict = screenVerdict(flags);
  const shown: MethodKey = rec.primary;
  const guide = METHOD_GUIDE[shown];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Should we evaluate, and how?</CardTitle>
          <CardDescription>
            Most portfolios cannot run a randomized trial, and many projects should not try. Answer about how the
            programme actually operates and Bridgeline recommends the strongest design that is feasible, or says
            plainly that monitoring plus a contribution story is the right level.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form
            action={async (fd) => {
              await saveEvaluationAssessment(projectId, fd);
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">What are you assessing?</Label>
              <Input id="title" name="title" required placeholder="e.g. Peer exchange programme, Year 1 cohort" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">1. Is it worth a rigorous evaluation?</p>
              <p className="text-xs text-muted">
                Evaluate selectively. Tick each criterion that applies.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SCREEN_CRITERIA.map((c) => (
                  <label key={c.key} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
                    <input
                      type="checkbox"
                      name={c.key}
                      checked={flags[c.key]}
                      onChange={(e) => setFlags({ ...flags, [c.key]: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">{c.label}</span>
                      <span className="block text-xs text-muted">{c.help}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={VERDICT_VARIANT[verdict]}>{SCREEN_VERDICT_LABEL[verdict]}</Badge>
                <span className="text-muted">{screenScore(flags)} of 5 criteria</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">2. How does the programme operate?</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="timing">Timing</Label>
                  <select id="timing" name="timing" value={timing} onChange={(e) => setTiming(e.target.value as Timing)} className={selectClass}>
                    <option value="prospective">Prospective: not yet rolled out</option>
                    <option value="retrospective">Retrospective: already running</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="allocation">Who gets the programme?</Label>
                  <select id="allocation" name="allocation" value={allocation} onChange={(e) => setAllocation(e.target.value as Allocation)} className={selectClass}>
                    {(Object.keys(ALLOCATION_LABEL) as Allocation[]).map((a) => (
                      <option key={a} value={a}>
                        {ALLOCATION_LABEL[a]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="comparisonData">Comparison data you have or can get</Label>
                  <select id="comparisonData" name="comparisonData" value={comparisonData} onChange={(e) => setComparisonData(e.target.value as ComparisonData)} className={selectClass}>
                    {(Object.keys(COMPARISON_DATA_LABEL) as ComparisonData[]).map((c) => (
                      <option key={c} value={c}>
                        {COMPARISON_DATA_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="numUnits">Independent units (sites, communities, organisations)</Label>
                  <Input id="numUnits" name="numUnits" type="number" min={0} value={numUnits} onChange={(e) => setNumUnits(e.target.value)} placeholder="Leave blank if unknown" />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Recommendation</p>
                <Badge variant={rec.statistical ? "ok" : "warning"}>{METHOD_LABEL[shown]}</Badge>
              </div>
              <p className="mt-2 text-sm">{rec.rationale}</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div>
                  <dt className="font-medium">Key assumption</dt>
                  <dd className="text-muted">{guide.keyAssumption}</dd>
                </div>
                <div>
                  <dt className="font-medium">Tests to run</dt>
                  <dd>
                    <ul className="list-disc pl-5 text-muted">
                      {guide.tests.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Limits</dt>
                  <dd className="text-muted">{guide.limits}</dd>
                </div>
              </dl>
              {rec.alternatives.length > 0 && (
                <p className="mt-3 text-sm">
                  <span className="font-medium">Alternatives: </span>
                  <span className="text-muted">{rec.alternatives.map((a) => METHOD_LABEL[a]).join("; ")}</span>
                </p>
              )}
              {rec.warnings.length > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm text-warning">
                  {rec.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hypothesisId">Link to a hypothesis (optional)</Label>
                <select id="hypothesisId" name="hypothesisId" className={selectClass} defaultValue="">
                  <option value="">None</option>
                  {hypotheses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.statement.length > 70 ? `${h.statement.slice(0, 70)}…` : h.statement}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Save assessment</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved assessments</CardTitle>
          <CardDescription>A record of why each method was chosen, as it stood when you ran it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          {assessments.length === 0 && <p className="text-sm text-muted">None yet.</p>}
          {assessments.map((a) => {
            const h = hypotheses.find((x) => x.id === a.hypothesisId);
            return (
              <div key={a.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={VERDICT_VARIANT[a.screenVerdict as ScreenVerdict] ?? "muted"}>
                      {SCREEN_VERDICT_LABEL[a.screenVerdict as ScreenVerdict] ?? a.screenVerdict}
                    </Badge>
                    <Badge variant="outline">{METHOD_LABEL[a.recommendedMethod as MethodKey] ?? a.recommendedMethod}</Badge>
                    {h && <Badge variant="muted">Linked hypothesis</Badge>}
                  </div>
                  {a.rationale && <p className="text-sm text-muted">{a.rationale}</p>}
                </div>
                <form action={deleteEvaluationAssessment.bind(null, a.id, projectId)}>
                  <Button type="submit" size="icon" variant="ghost" aria-label="Delete assessment">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
