import Link from "next/link";
import { getFunderDashboardData } from "@/lib/org-dashboard";
import { StatTile, FundCard } from "@/components/dashboard/org-dashboard";
import { SectionBand } from "@/components/ui/section-band";

// Force dynamic rendering — see the matching comment in
// src/app/organizations/page.tsx for why.
export const dynamic = "force-dynamic";

// The cross-organization "Funder View" — a donor/impact-investor/lender's
// own relationships, rolled up by capital provider across every
// organization in the workspace, not just one. Same "by fund" grouping
// as an organization dashboard's "By fund" tab (see
// src/lib/org-dashboard.ts's summarizeProjects, shared by both), just
// run over every project regardless of which organization runs it — so
// a funder backing projects at two different organizations sees both
// under their own name here, each project labeled with its organization.
export default async function FundersPage() {
  const data = await getFunderDashboardData();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Funder view</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Funder view</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every capital-provider relationship across all {data.orgCount} organization{data.orgCount === 1 ? "" : "s"}{" "}
          in this workspace, grouped by fund — a donor, impact investor, or lender&apos;s own view, not bounded to
          one implementing organization. Manage organizations on the{" "}
          <Link href="/organizations" className="underline">
            Organizations
          </Link>{" "}
          page.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <SectionBand>Portfolio at a glance</SectionBand>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Projects" value={data.totals.projectCount} />
          <StatTile
            label="Metrics on track"
            value={data.totals.metricStatus.onTrack}
            sub={`of ${data.totals.metricTotal} reporting`}
          />
          <StatTile label="Metrics off track" value={data.totals.metricStatus.offTrack} />
          <StatTile
            label="Hypotheses supported"
            value={data.totals.hypothesisCounts.supported ?? 0}
            sub={`of ${data.totals.hypothesisTotal} total`}
          />
          <StatTile label="Funds / capital providers" value={data.totals.distinctFundCount} sub={`${data.totals.fundingInstrumentCount} instruments`} />
          <StatTile label="Organizations" value={data.orgCount} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionBand>By fund, across every organization</SectionBand>
        {data.fundGroups.length === 0 ? (
          <p className="text-sm text-muted">
            No Funding Instruments recorded yet anywhere in this workspace — add one from a project&apos;s Settings
            tab to see it here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.fundGroups.map((fund) => (
              <FundCard key={fund.capitalProviderName} fund={fund} showOrg />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
