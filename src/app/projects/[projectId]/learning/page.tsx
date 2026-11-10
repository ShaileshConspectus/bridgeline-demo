import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { listLearningAgendaItems, listLearningAgendaContext } from "@/lib/actions";
import { ProjectNav } from "@/components/project-nav";
import { LearningAgendaBoard } from "@/components/learning/learning-agenda-board";

export default async function LearningAgendaPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const [items, context] = await Promise.all([
    listLearningAgendaItems(projectId),
    listLearningAgendaContext(projectId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="learning" />

      <LearningAgendaBoard
        projectId={project.id}
        items={items}
        hypotheses={context.hypotheses}
        metricsList={context.metrics}
        instruments={context.instruments}
      />
    </div>
  );
}
