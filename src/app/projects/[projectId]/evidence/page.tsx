import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, impactHypotheses } from "@/db/schema";
import {
  getProjectMetricData,
  listProjectJurisdictions,
  getCurrentThesis,
  getReviewQueueData,
  listProjectUseCases,
  listProjectCertifications,
} from "@/lib/actions";
import { ProjectNav } from "@/components/project-nav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReportObservation } from "@/components/evidence/report-observation";
import { ReviewQueue } from "@/components/evidence/review-queue";
import { UseCaseBoard } from "@/components/evidence/use-case-board";
import { CertificationsRegister } from "@/components/evidence/certifications-register";
import { Badge } from "@/components/ui/badge";

export default async function EvidenceHubPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const { metrics: metricsList } = await getProjectMetricData(projectId);
  const jurisdictionsList = await listProjectJurisdictions(projectId);
  const thesis = await getCurrentThesis(projectId);
  const hypothesesList = thesis
    ? await db.select().from(impactHypotheses).where(eq(impactHypotheses.thesisId, thesis.id))
    : [];
  const { observations, checks, verifications } = await getReviewQueueData(projectId);
  const useCasesList = await listProjectUseCases(projectId);
  const certificationsList = await listProjectCertifications(projectId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="evidence" />

      <p className="text-sm text-muted">
        Module 3 — where results, qualitative evidence, and audit records get collected and verified before they
        count. Report a result here (or import a CSV), and it runs through the same rules-based quality checks
        every time. Anything flagged lands in the Review Queue for a human decision; only <code>accepted</code>{" "}
        results show up on the Dashboard and in Reports.
      </p>

      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">Report &amp; import</TabsTrigger>
          <TabsTrigger value="review">
            Review queue
            {observations.length > 0 && (
              <Badge variant="warning" className="ml-2">
                {observations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usecases">Use cases</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <div className="pt-3">
            <ReportObservation projectId={project.id} metricsList={metricsList} jurisdictionsList={jurisdictionsList} />
          </div>
        </TabsContent>

        <TabsContent value="review">
          <div className="pt-3">
            <ReviewQueue
              projectId={project.id}
              observations={observations}
              checks={checks}
              verifications={verifications}
              metricsList={metricsList}
            />
          </div>
        </TabsContent>

        <TabsContent value="usecases">
          <div className="pt-3">
            <UseCaseBoard projectId={project.id} useCasesList={useCasesList} hypothesesList={hypothesesList} />
          </div>
        </TabsContent>

        <TabsContent value="certifications">
          <div className="pt-3">
            <CertificationsRegister projectId={project.id} certificationsList={certificationsList} metricsList={metricsList} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
