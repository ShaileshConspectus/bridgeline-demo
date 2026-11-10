import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { getProjectMetricData, listProjectJurisdictions } from "@/lib/actions";
import { ProjectNav } from "@/components/project-nav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CatalogBrowser } from "@/components/metrics/catalog-browser";
import { BespokeMetricBuilder } from "@/components/metrics/bespoke-metric-builder";
import { JurisdictionsManager } from "@/components/metrics/jurisdictions-manager";
import { MetricDetailCard } from "@/components/metrics/metric-detail-card";
import { CapitalProviderOverlap } from "@/components/metrics/capital-provider-overlap";

export default async function MetricsLibraryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const { metrics: metricsList, targets, tags, baselines } = await getProjectMetricData(projectId);
  const jurisdictionsList = await listProjectJurisdictions(projectId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="metrics" />

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">My Metrics Plan</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
          <TabsTrigger value="overlap">Capital Provider Overlap</TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          <div className="flex flex-col gap-4 pt-3">
            <Card>
              <CardHeader>
                <CardTitle>Assembled metrics plan</CardTitle>
                <CardDescription>
                  Every metric in this project&apos;s plan, coded and linked to ToC location — attached from the
                  catalog or built bespoke. Expand a metric to manage its jurisdiction baselines, milestone/target
                  trajectory, capital provider tags, and verification requirement.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                {metricsList.length === 0 && (
                  <p className="text-sm text-muted">
                    No metrics yet — attach one from the Catalog tab or build a bespoke one below.
                  </p>
                )}
                {metricsList.map((m) => (
                  <MetricDetailCard
                    key={m.id}
                    metric={m}
                    projectId={project.id}
                    targets={targets.filter((t) => t.metricId === m.id)}
                    baselines={baselines.filter((b) => b.metricId === m.id)}
                    tags={tags.filter((t) => t.metricId === m.id)}
                    jurisdictionsList={jurisdictionsList}
                  />
                ))}
              </CardContent>
            </Card>

            <BespokeMetricBuilder projectId={project.id} />
          </div>
        </TabsContent>

        <TabsContent value="catalog">
          <div className="pt-3">
            <CatalogBrowser projectId={project.id} projectSector={project.sector} />
          </div>
        </TabsContent>

        <TabsContent value="jurisdictions">
          <div className="pt-3">
            <JurisdictionsManager projectId={project.id} jurisdictionsList={jurisdictionsList} />
          </div>
        </TabsContent>

        <TabsContent value="overlap">
          <div className="pt-3">
            <CapitalProviderOverlap metricsList={metricsList} tags={tags} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
