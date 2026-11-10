import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, impactHypotheses, hypothesisMetricLinks } from "@/db/schema";
import { getCurrentThesis, getProjectMetricData } from "@/lib/actions";
import { ProjectNav } from "@/components/project-nav";
import { MetricsDashboard } from "@/components/dashboard/metrics-dashboard";
import { HypothesisScorecard } from "@/components/dashboard/hypothesis-scorecard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const thesis = await getCurrentThesis(projectId);
  const { metrics: metricsList, targets, observations, tags } = await getProjectMetricData(projectId);
  const hypotheses = thesis
    ? await db.select().from(impactHypotheses).where(eq(impactHypotheses.thesisId, thesis.id))
    : [];
  const hypothesisIds = hypotheses.map((h) => h.id);
  const links = hypothesisIds.length
    ? (
        await Promise.all(
          hypothesisIds.map((id) => db.select().from(hypothesisMetricLinks).where(eq(hypothesisMetricLinks.hypothesisId, id))),
        )
      ).flat()
    : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="dashboard" />

      {!thesis ? (
        <p className="text-sm text-muted">
          Start a climate thesis in Thesis Studio first — the dashboard rolls up its hypotheses and metrics.
        </p>
      ) : (
        <>
          <HypothesisScorecard projectId={project.id} hypotheses={hypotheses} links={links} metricsList={metricsList} />
          <MetricsDashboard projectId={project.id} metricsList={metricsList} targets={targets} observations={observations} tags={tags} />
        </>
      )}
    </div>
  );
}
