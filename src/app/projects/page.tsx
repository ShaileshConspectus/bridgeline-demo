import Link from "next/link";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createProject, getAllOrganizations } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionBand } from "@/components/ui/section-band";

// The full project list and "create a new project" form — split out of
// the landing page when that page became the Organization Dashboard
// (src/app/page.tsx), which links here for project management and links
// into individual project dashboards for the portfolio-summary-first
// experience.
export default async function ProjectsPage() {
  const [allProjects, allOrgs] = await Promise.all([
    db.select().from(projects).orderBy(desc(projects.createdAt)),
    getAllOrganizations(),
  ]);
  const orgNameById = new Map(allOrgs.map((o) => [o.id, o.name]));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Projects</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted">
          Every project in this workspace, across every organization. Open one for its Thesis Studio, Metrics
          Library, Evidence Hub, and dashboard — or see a whole organization&apos;s portfolio at once from{" "}
          <Link href="/organizations" className="underline">
            Organizations
          </Link>
          .
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <SectionBand>Projects</SectionBand>
        {allProjects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet — create one below to get started.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {allProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="transition-colors hover:bg-muted-surface">
                  <CardHeader className="flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle>{p.name}</CardTitle>
                      {p.description && <CardDescription>{p.description}</CardDescription>}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {orgNameById.get(p.orgId) ?? "Unknown organization"}
                    </Badge>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionBand>New project</SectionBand>
        <Card>
          <CardContent className="pt-4">
            <form action={createProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" name="name" placeholder="e.g. City EV Mission" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" placeholder="A short description of the project" />
              </div>

              <div className="rounded-md border border-border bg-muted-surface p-3">
                <p className="mb-2 text-sm font-medium">Organization</p>
                <p className="mb-3 text-xs text-muted">
                  Every project belongs to one organization — that&apos;s what powers the by-fund and
                  cross-organization Funder View rollups. Pick an existing one, or name a new one below.
                </p>
                <div className="flex flex-col gap-3">
                  {allOrgs.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="orgId">Existing organization</Label>
                      <select
                        id="orgId"
                        name="orgId"
                        defaultValue={allOrgs.length === 1 ? allOrgs[0].id : ""}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                      >
                        {allOrgs.length !== 1 && <option value="">Select an organization…</option>}
                        {allOrgs.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newOrgName">
                      {allOrgs.length > 0 ? "Or create a new organization" : "New organization name"}
                    </Label>
                    <Input
                      id="newOrgName"
                      name="newOrgName"
                      placeholder="e.g. Acme Foundation"
                      required={allOrgs.length === 0}
                    />
                    {allOrgs.length > 0 && (
                      <p className="text-xs text-muted">Filling this in overrides the dropdown above.</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Button type="submit">Create project</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
