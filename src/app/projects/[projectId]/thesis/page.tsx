import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, tocRungs, objectiveOutputActivities, impactHypotheses, assumptionRisks, metrics } from "@/db/schema";
import {
  getCurrentThesis,
  getThesisHistory,
  listEngagementFunnelStages,
  listCommercialValueChainStages,
} from "@/lib/actions";
import { ProjectNav } from "@/components/project-nav";
import { ThesisForm } from "@/components/thesis/thesis-form";
import { TocStudio } from "@/components/thesis/toc-studio";
import { HypothesisStudio } from "@/components/thesis/hypothesis-studio";
import { VersionHistory } from "@/components/thesis/version-history";
import { EngagementFunnelPanel } from "@/components/thesis/engagement-funnel-panel";
import { CommercialValueChainPanel } from "@/components/thesis/commercial-value-chain-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ThesisStudioPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const thesis = await getCurrentThesis(projectId);
  const history = await getThesisHistory(projectId);

  const [rungs, ooaNodes, hypotheses, projectMetrics] = thesis
    ? await Promise.all([
        db.select().from(tocRungs).where(eq(tocRungs.thesisId, thesis.id)).orderBy(asc(tocRungs.sortOrder)),
        db
          .select()
          .from(objectiveOutputActivities)
          .where(eq(objectiveOutputActivities.thesisId, thesis.id))
          .orderBy(asc(objectiveOutputActivities.sortOrder)),
        db.select().from(impactHypotheses).where(eq(impactHypotheses.thesisId, thesis.id)),
        db.select().from(metrics).where(eq(metrics.projectId, projectId)),
      ])
    : [[], [], [], []];

  const hypothesisIds = hypotheses.map((h) => h.id);
  const allAssumptions = hypothesisIds.length
    ? (
        await Promise.all(
          hypothesisIds.map((id) => db.select().from(assumptionRisks).where(eq(assumptionRisks.hypothesisId, id))),
        )
      ).flat()
    : [];

  const [engagementStages, commercialStages] = thesis
    ? await Promise.all([listEngagementFunnelStages(thesis.id), listCommercialValueChainStages(thesis.id)])
    : [[], []];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="thesis" />

      {!thesis ? (
        <Card>
          <CardHeader>
            <CardTitle>Start your climate thesis</CardTitle>
            <CardDescription>
              Describe the problem, the change you expect, and who it affects. You can draft the
              Theory of Change and hypotheses with AI assistance afterward, or build them manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ThesisForm projectId={project.id} thesis={null} />
          </CardContent>
        </Card>
      ) : (
        <>
          <ThesisForm projectId={project.id} thesis={thesis} />

          <TocStudio
            projectId={project.id}
            thesisId={thesis.id}
            rungs={rungs}
            ooaNodes={ooaNodes}
            thesisStatement={thesis.statement}
          />

          {project.engagementFunnelEnabled && (
            <EngagementFunnelPanel projectId={project.id} thesisId={thesis.id} stages={engagementStages} />
          )}
          {project.commercialValueChainEnabled && (
            <CommercialValueChainPanel projectId={project.id} thesisId={thesis.id} stages={commercialStages} />
          )}

          <HypothesisStudio
            projectId={project.id}
            thesisId={thesis.id}
            hypotheses={hypotheses}
            assumptions={allAssumptions}
            rungs={rungs}
            metrics={projectMetrics}
            engagementStages={engagementStages}
            commercialStages={commercialStages}
          />

          <VersionHistory history={history} />
        </>
      )}
    </div>
  );
}
