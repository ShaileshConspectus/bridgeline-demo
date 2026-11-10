import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { projects, fundingInstruments } from "@/db/schema";
import { ProjectNav } from "@/components/project-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const TEMPLATES = [
  {
    key: "grant-narrative",
    title: "Grant / Funding Narrative Report",
    description:
      "Rolls the workplan and indicator progress into a donor-style narrative. Outcome/Impact-only rollup lens.",
    forInstrumentTypes: ["grant", "blended", "self_funded"],
  },
  {
    key: "investor-update",
    title: "Investor / Board Update",
    description:
      "Deck-style KPI summary against milestones and targets, full-detail lens by default — for equity and blended-capital audiences who want more granularity, not less.",
    forInstrumentTypes: ["equity", "blended"],
  },
  {
    key: "loan-covenant",
    title: "Loan Covenant Compliance Report",
    description:
      "Structured against the covenant terms on each debt Funding Instrument, with consequence-severity-flagged metrics surfaced first.",
    forInstrumentTypes: ["debt", "blended"],
  },
] as const;

export default async function ReportsIndexPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdParam } = await params;
  const projectId = Number(projectIdParam);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const instruments = await db.select().from(fundingInstruments).where(eq(fundingInstruments.projectId, projectId));
  const instrumentTypes = new Set(instruments.map((fi) => fi.instrumentType));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <ProjectNav projectId={project.id} projectName={project.name} active="reports" />

      <p className="text-sm text-muted">
        Report templates are differentiated by capital-provider type (spec Section 7) rather than one generic
        shape — each is generated from the same underlying thesis, metrics, and Learning data, just structured
        and lensed for a different reader.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TEMPLATES.map((t) => {
          const relevant = t.forInstrumentTypes.some((it) => instrumentTypes.has(it));
          return (
            <Link key={t.key} href={`/projects/${projectId}/reports/${t.key}`}>
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                {instruments.length > 0 && (
                  <CardContent className="pt-0 text-xs text-muted">
                    {relevant
                      ? "Matches a funding instrument on this project."
                      : "No funding instrument of this type on this project yet — still viewable."}
                  </CardContent>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
