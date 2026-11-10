import Link from "next/link";
import { createOrganization } from "@/lib/actions";
import { getAllOrganizationsWithCounts } from "@/lib/org-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionBand } from "@/components/ui/section-band";

// Every organization in this workspace, each with a project count and a
// link into its own dashboard (/orgs/[orgId]) — plus the form to create
// a new one. Reachable from the landing page whenever there's more than
// one organization to pick between, and from the project-creation form's
// "or create a new organization" shortcut.
export default async function OrganizationsPage() {
  const orgsWithCounts = await getAllOrganizationsWithCounts();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Organizations</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted">
          Every organization running projects in this workspace. Each project belongs to exactly one — that&apos;s
          what makes the{" "}
          <Link href="/funders" className="underline">
            Funder View
          </Link>{" "}
          possible: a capital provider&apos;s relationships rolled up across every organization they support, not
          just one.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <SectionBand>Organizations</SectionBand>
        {orgsWithCounts.length === 0 ? (
          <p className="text-sm text-muted">No organizations yet — create one below to get started.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {orgsWithCounts.map((org) => (
              <Link key={org.id} href={`/orgs/${org.id}`}>
                <Card className="transition-colors hover:bg-muted-surface">
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle>{org.name}</CardTitle>
                      <CardDescription>
                        {org.projectCount} project{org.projectCount === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionBand>New organization</SectionBand>
        <Card>
          <CardContent className="pt-4">
            <form action={createOrganization} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Organization name</Label>
                <Input id="name" name="name" placeholder="e.g. Acme Foundation" required />
              </div>
              <div>
                <Button type="submit">Create organization</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
