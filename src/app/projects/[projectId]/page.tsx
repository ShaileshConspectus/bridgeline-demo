import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, fundingInstruments } from "@/db/schema";
import { ProjectNav } from "@/components/project-nav";
import { LensToggle } from "@/components/lens-toggle";
import { FundingInstrumentsManager } from "@/components/settings/funding-instruments-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const instruments = await db
    .select()
    .from(fundingInstruments)
    .where(eq(fundingInstruments.projectId, projectId));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="settings" />

      <Card>
        <CardHeader>
          <CardTitle>Optional lenses</CardTitle>
          <CardDescription>
            Off by default. Turn these on only if this project needs them — they add parallel
            views alongside the core Theory of Change.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Engagement funnel</p>
              <p className="text-sm text-muted">
                Reach → Active uptake → Meaningful uptake → Outcome
              </p>
            </div>
            <LensToggle
              projectId={project.id}
              lens="engagementFunnelEnabled"
              initialValue={project.engagementFunnelEnabled}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Commercial value chain</p>
              <p className="text-sm text-muted">
                For for-profit / equity or debt-financed portfolio entities
              </p>
            </div>
            <LensToggle
              projectId={project.id}
              lens="commercialValueChainEnabled"
              initialValue={project.commercialValueChainEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <FundingInstrumentsManager projectId={project.id} instruments={instruments} />
    </div>
  );
}
