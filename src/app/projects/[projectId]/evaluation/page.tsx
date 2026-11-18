import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { getEvaluationPageData } from "@/lib/actions";
import {
  smartCheck,
  evidenceBase,
  hypothesisGaps,
  METHOD_LABEL,
  TIER_LABEL,
  type StudyDesign,
  type MethodKey,
} from "@/lib/evaluation";
import { ProjectNav } from "@/components/project-nav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MethodSelector } from "@/components/evaluation/method-selector";
import { PowerCheck } from "@/components/evaluation/power-check";
import { IndicatorQuality, type IndicatorRow, type RungCoverage } from "@/components/evaluation/indicator-quality";
import { TIER_VARIANT } from "@/components/evidence/evidence-base";

const RUNG_ORDER = ["input", "process", "output", "intermediate_outcome", "outcome", "impact"] as const;
const RUNG_LABEL: Record<string, string> = {
  input: "Input",
  process: "Process",
  output: "Output",
  intermediate_outcome: "Intermediate outcome",
  outcome: "Outcome",
  impact: "Impact",
};

export default async function EvaluationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const { hypotheses, rungs, metrics, studies, assessments, links, targets, baselines } =
    await getEvaluationPageData(projectId);

  // --- Indicator quality rows ---
  const indicatorRows: IndicatorRow[] = metrics.map((m) => {
    const mTargets = targets.filter((t) => t.metricId === m.id);
    const hasBaseline =
      baselines.some((b) => b.metricId === m.id) || mTargets.some((t) => t.baseline !== null && t.baseline !== undefined);
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      purpose: m.indicatorPurpose ?? null,
      smart: smartCheck({
        source: m.source,
        unit: m.unit,
        definitionMethodsSource: m.definitionMethodsSource,
        calculationMethod: m.calculationMethod,
        suggestedFrequency: m.suggestedFrequency,
        disaggregationDimensions: m.disaggregationDimensions,
        justification: m.justification,
        linkedHypothesisCount: links.filter((l) => l.metricId === m.id).length,
        hasBaseline,
        hasTarget: mTargets.some((t) => t.target !== null || t.milestone !== null),
        hasTargetDate: mTargets.some((t) => !!t.targetDate || !!t.milestoneDate),
      }),
    };
  });

  // --- Rung coverage: a metric counts against the rung type its hypothesis leads to ---
  const coverage: RungCoverage[] = RUNG_ORDER.map((type) => {
    const rungIds = new Set(rungs.filter((r) => r.rungType === type).map((r) => r.id));
    const hypIds = new Set(hypotheses.filter((h) => h.toRungId !== null && rungIds.has(h.toRungId)).map((h) => h.id));
    const metricIds = new Set(links.filter((l) => hypIds.has(l.hypothesisId)).map((l) => l.metricId));
    return {
      rungType: type,
      label: RUNG_LABEL[type],
      rungCount: rungIds.size,
      metricCount: metricIds.size,
      expectsIndicator: type !== "input" && type !== "process",
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="evaluation" />

      <p className="text-sm text-muted">
        Decide whether a rigorous evaluation is worth it, pick the strongest design the programme&apos;s rules allow, and
        check that every causal claim has a counterfactual and the indicators to test it. Based on the World Bank&apos;s{" "}
        <em>Impact Evaluation in Practice</em>.
      </p>

      <Tabs defaultValue="method">
        <TabsList>
          <TabsTrigger value="method">Method selector</TabsTrigger>
          <TabsTrigger value="claims">Causal claims</TabsTrigger>
          <TabsTrigger value="indicators">Indicators</TabsTrigger>
          <TabsTrigger value="power">Power check</TabsTrigger>
        </TabsList>

        <TabsContent value="method">
          <div className="pt-3">
            <MethodSelector projectId={project.id} hypotheses={hypotheses} assessments={assessments} />
          </div>
        </TabsContent>

        <TabsContent value="claims">
          <div className="pt-3">
            <Card>
              <CardHeader>
                <CardTitle>Causal claims</CardTitle>
                <CardDescription>
                  Each IF/THEN hypothesis is a causal claim. This shows what each one rests on and what is missing.
                  Edit the counterfactual in Thesis Studio; link studies in the Evidence Hub.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-0">
                {hypotheses.length === 0 && <p className="text-sm text-muted">No hypotheses yet.</p>}
                {hypotheses.map((h) => {
                  const hs = studies.filter((s) => s.linkedHypothesisId === h.id);
                  const base = evidenceBase(hs.map((s) => ({ design: s.design as StudyDesign, studyScope: s.studyScope })));
                  const gaps = hypothesisGaps(h, base);
                  return (
                    <div key={h.id} className="rounded-md border border-border p-3">
                      <p className="text-sm font-medium">{h.statement}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="capitalize">{h.claimType}</Badge>
                        <Badge variant="muted">
                          {h.comparisonApproach && h.comparisonApproach !== "none"
                            ? METHOD_LABEL[h.comparisonApproach as MethodKey] ?? h.comparisonApproach.replaceAll("_", " ")
                            : "No comparison approach"}
                        </Badge>
                        {base.tier ? (
                          <Badge variant={TIER_VARIANT[base.tier]}>
                            Evidence: {TIER_LABEL[base.tier]} ({base.count})
                          </Badge>
                        ) : (
                          <Badge variant="muted">No evidence linked</Badge>
                        )}
                      </div>
                      {h.counterfactual && <p className="mt-2 text-sm text-muted">Without us: {h.counterfactual}</p>}
                      {gaps.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-sm text-warning">
                          {gaps.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indicators">
          <div className="pt-3">
            <IndicatorQuality projectId={project.id} rows={indicatorRows} coverage={coverage} />
          </div>
        </TabsContent>

        <TabsContent value="power">
          <div className="pt-3">
            <PowerCheck />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
