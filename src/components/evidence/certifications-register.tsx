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
import { addCertification, deleteCertification } from "@/lib/actions";
import { renewalStatus } from "@/lib/evidence";
import { Trash2 } from "lucide-react";
import type { certificationRecords, metrics } from "@/db/schema";

type CertificationRecord = typeof certificationRecords.$inferSelect;
type Metric = typeof metrics.$inferSelect;

const RECORD_TYPE_LABEL: Record<string, string> = {
  certification: "Certification",
  third_party_audit: "Third-party audit",
  verified_credit_issuance: "Verified credit issuance",
  engineering_sign_off: "Engineering sign-off",
  other: "Other",
};

const RENEWAL_VARIANT: Record<string, "ok" | "warning" | "danger" | "muted"> = {
  current: "ok",
  due_soon: "warning",
  expired: "danger",
  no_expiry: "muted",
};

const RENEWAL_LABEL: Record<string, string> = {
  current: "Current",
  due_soon: "Renewal due soon",
  expired: "Expired",
  no_expiry: "No expiry",
};

export function CertificationsRegister({
  projectId,
  certificationsList,
  metricsList,
}: {
  projectId: number;
  certificationsList: CertificationRecord[];
  metricsList: Metric[];
}) {
  const [open, setOpen] = useState(false);
  const expiredCount = certificationsList.filter((c) => renewalStatus(c) === "expired").length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Certification / audit register</CardTitle>
          <CardDescription>
            Third-party audits, certifications, and sign-offs — link one to a metric that requires elevated
            verification and the review queue will check it&apos;s current before accepting a flagged result.
            {expiredCount > 0 && (
              <span className="ml-1 font-medium text-danger">
                {expiredCount} expired.
              </span>
            )}
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a certification / audit record</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addCertification(projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recordType">Record type</Label>
                  <select id="recordType" name="recordType" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="certification">Certification</option>
                    <option value="third_party_audit">Third-party audit</option>
                    <option value="verified_credit_issuance">Verified credit issuance</option>
                    <option value="engineering_sign_off">Engineering sign-off</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedMetricId">Linked metric (optional)</Label>
                  <select id="linkedMetricId" name="linkedMetricId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="">None</option>
                    {metricsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code ? `${m.code} — ` : ""}
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issuerName">Issuer name</Label>
                  <Input id="issuerName" name="issuerName" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issuerType">Issuer type (optional)</Label>
                  <Input id="issuerType" name="issuerType" placeholder="e.g. Independent auditor" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scope">Scope (optional)</Label>
                <Input id="scope" name="scope" placeholder="What this record covers" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issueDate">Issue date (optional)</Label>
                  <Input id="issueDate" name="issueDate" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expiryDate">Expiry date (optional)</Label>
                  <Input id="expiryDate" name="expiryDate" type="date" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" name="notes" rows={2} />
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
      <CardContent className="flex flex-col gap-3 pt-0">
        {certificationsList.length === 0 && (
          <p className="text-sm text-muted">No certification or audit records yet.</p>
        )}
        {certificationsList.map((c) => {
          const status = renewalStatus(c);
          const metric = metricsList.find((m) => m.id === c.linkedMetricId);
          return (
            <div key={c.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {c.issuerName}
                    <span className="ml-2 text-muted font-normal">{RECORD_TYPE_LABEL[c.recordType]}</span>
                  </p>
                  {c.scope && <p className="mt-0.5 text-muted">{c.scope}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={RENEWAL_VARIANT[status]}>{RENEWAL_LABEL[status]}</Badge>
                  <form action={deleteCertification.bind(null, c.id, projectId)}>
                    <Button type="submit" size="icon" variant="ghost" aria-label="Delete record" className="h-6 w-6">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </form>
                </div>
              </div>
              <p className="mt-1 text-muted">
                {[c.issueDate && `Issued ${c.issueDate}`, c.expiryDate && `Expires ${c.expiryDate}`, metric && `Linked to ${metric.name}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {c.notes && <p className="mt-1">{c.notes}</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
