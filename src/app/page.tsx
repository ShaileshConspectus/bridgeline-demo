import Link from "next/link";
import { getOrgDashboardData, getAllOrganizationsWithCounts } from "@/lib/org-dashboard";
import { OrgDashboard } from "@/components/dashboard/org-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionBand } from "@/components/ui/section-band";

// Force dynamic rendering — see the matching comment in
// src/app/organizations/page.tsx for why. This page in particular is the
// one most likely to otherwise get frozen at build time with zero
// organizations/projects baked in, since it's the first thing anyone
// deploying this app opens.
export const dynamic = "force-dynamic";

// The app's landing page. With exactly one organization on record (the
// common case for this prototype) it renders that organization's
// dashboard directly, zero extra clicks — the same experience as before
// organizations became multi-org-aware. With more than one, guessing
// which org to show would be wrong, so it shows an organization picker
// instead; with none yet, it points at /organizations to create the
// first one. A "Funder view" link is always available once there's
// anything to roll up — see /funders for the cross-organization view.
export default async function HomePage() {
  const orgs = await getAllOrganizationsWithCounts();

  if (orgs.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Measurement, Evaluation &amp; Learning</h1>
        </header>
        <div className="rounded-md border border-border bg-muted-surface px-4 py-6 text-center">
          <p className="text-sm text-muted">
            No organizations yet.{" "}
            <Link href="/organizations" className="underline">
              Create your first organization
            </Link>{" "}
            to start a project.
          </p>
        </div>
      </div>
    );
  }

  if (orgs.length === 1) {
    const data = await getOrgDashboardData(orgs[0].id);
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data ? data.orgName : "Measurement, Evaluation & Learning"}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Every project&apos;s thesis, metrics, and learning status in one place — switch to{" "}
              <span className="font-medium text-foreground">By fund</span> to see the same portfolio grouped by
              capital provider, or open any project for the full detail.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/funders">
              <Button variant="outline">Funder view</Button>
            </Link>
            <Link href="/organizations">
              <Button variant="outline">Organizations</Button>
            </Link>
            <Link href="/projects">
              <Button variant="outline">Manage projects</Button>
            </Link>
          </div>
        </header>

        {!data || data.projectSummaries.length === 0 ? (
          <div className="rounded-md border border-border bg-muted-surface px-4 py-6 text-center">
            <p className="text-sm text-muted">
              No projects yet.{" "}
              <Link href="/projects" className="underline">
                Create your first project
              </Link>{" "}
              to start building a thesis, a metrics plan, and this dashboard.
            </p>
          </div>
        ) : (
          <OrgDashboard data={data} />
        )}
      </div>
    );
  }

  // More than one organization: don't guess — show the picker.
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Pick an organization for its own dashboard, or see every capital-provider relationship rolled up
            across all of them at once.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/funders">
            <Button variant="outline">Funder view (all orgs)</Button>
          </Link>
          <Link href="/organizations">
            <Button variant="outline">Manage organizations</Button>
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <SectionBand>Organizations</SectionBand>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {orgs.map((org) => (
            <Link key={org.id} href={`/orgs/${org.id}`}>
              <Card className="transition-colors hover:bg-muted-surface">
                <CardHeader>
                  <CardTitle>{org.name}</CardTitle>
                  <CardDescription>
                    {org.projectCount} project{org.projectCount === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
