import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgDashboardData } from "@/lib/org-dashboard";
import { OrgDashboard } from "@/components/dashboard/org-dashboard";
import { Button } from "@/components/ui/button";

// One organization's dashboard, addressed explicitly by id — what the
// landing page (/) links to for each organization once there's more than
// one, and a stable URL a returning user can bookmark for "their" org
// even after a second organization gets added.
export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: orgIdParam } = await params;
  const orgId = Number(orgIdParam);

  const data = await getOrgDashboardData(orgId);
  if (!data) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link href="/organizations" className="hover:text-foreground">
              Organizations
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">{data.orgName}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.orgName}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/funders">
            <Button variant="outline">Funder view (all orgs)</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">Manage projects</Button>
          </Link>
        </div>
      </header>

      {data.projectSummaries.length === 0 ? (
        <div className="rounded-md border border-border bg-muted-surface px-4 py-6 text-center">
          <p className="text-sm text-muted">
            No projects yet for this organization.{" "}
            <Link href="/projects" className="underline">
              Create one
            </Link>{" "}
            and link it here.
          </p>
        </div>
      ) : (
        <OrgDashboard data={data} />
      )}
    </div>
  );
}
