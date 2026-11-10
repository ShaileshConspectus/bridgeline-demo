"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { addFundingInstrument, deleteFundingInstrument } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import type { fundingInstruments } from "@/db/schema";

type FundingInstrument = typeof fundingInstruments.$inferSelect;

const INSTRUMENT_TYPE_LABEL: Record<string, string> = {
  grant: "Grant",
  debt: "Debt",
  equity: "Equity",
  blended: "Blended",
  self_funded: "Self-funded",
};

function formatAmount(fi: FundingInstrument) {
  if (fi.amount == null) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: fi.currency || "USD",
      maximumFractionDigits: 0,
    }).format(fi.amount);
  } catch {
    return `${fi.amount.toLocaleString()} ${fi.currency ?? ""}`.trim();
  }
}

export function FundingInstrumentsManager({
  projectId,
  instruments,
}: {
  projectId: number;
  instruments: FundingInstrument[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Funding instruments</CardTitle>
          <CardDescription>
            Capital-structure-agnostic: grant, debt, equity, blended, or self-funded. Grouped by capital
            provider on the{" "}
            <a href="/" className="underline">
              organization dashboard
            </a>{" "}
            (&quot;By fund&quot;) and across every organization on the{" "}
            <a href="/funders" className="underline">
              Funder View
            </a>
            .
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add instrument
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a funding instrument</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addFundingInstrument(projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="capitalProviderName">Capital provider name</Label>
                  <Input
                    id="capitalProviderName"
                    name="capitalProviderName"
                    placeholder="e.g. Acme Foundation"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="instrumentType">Instrument type</Label>
                  <select
                    id="instrumentType"
                    name="instrumentType"
                    defaultValue="grant"
                    className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                  >
                    <option value="grant">Grant</option>
                    <option value="debt">Debt</option>
                    <option value="equity">Equity</option>
                    <option value="blended">Blended</option>
                    <option value="self_funded">Self-funded</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Amount (optional)</Label>
                  <Input id="amount" name="amount" type="number" step="any" placeholder="700000" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue="USD" placeholder="USD" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="startDate">Start date (optional)</Label>
                  <Input id="startDate" name="startDate" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="endDate">End date (optional)</Label>
                  <Input id="endDate" name="endDate" type="date" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reportingRequirement">Reporting requirement (optional)</Label>
                <Input
                  id="reportingRequirement"
                  name="reportingRequirement"
                  placeholder="e.g. Quarterly narrative report"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="covenantOrMilestoneTerms">Covenant / milestone terms (optional)</Label>
                <Textarea id="covenantOrMilestoneTerms" name="covenantOrMilestoneTerms" rows={2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="renewalOrTrancheTrigger">Renewal / tranche trigger (optional)</Label>
                <Input id="renewalOrTrancheTrigger" name="renewalOrTrancheTrigger" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {instruments.length === 0 ? (
          <p className="text-sm text-muted">No funding instruments recorded yet.</p>
        ) : (
          instruments.map((fi) => {
            const amount = formatAmount(fi);
            return (
              <div key={fi.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {fi.capitalProviderName}
                      {amount && <span className="ml-2 text-muted font-normal">{amount}</span>}
                    </p>
                    {fi.reportingRequirement && <p className="mt-0.5 text-muted">{fi.reportingRequirement}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{INSTRUMENT_TYPE_LABEL[fi.instrumentType]}</Badge>
                    <form action={deleteFundingInstrument.bind(null, fi.id, projectId)}>
                      <Button type="submit" size="icon" variant="ghost" aria-label="Delete funding instrument" className="h-6 w-6">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </form>
                  </div>
                </div>
                {(fi.covenantOrMilestoneTerms || fi.renewalOrTrancheTrigger) && (
                  <p className="mt-1 text-muted">
                    {[fi.covenantOrMilestoneTerms, fi.renewalOrTrancheTrigger && `Trigger: ${fi.renewalOrTrancheTrigger}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
