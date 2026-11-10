"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideObservation } from "@/lib/actions";
import type { metrics, metricObservations, observationQualityChecks, verificationRecords } from "@/db/schema";

type Metric = typeof metrics.$inferSelect;
type Observation = typeof metricObservations.$inferSelect;
type QualityCheck = typeof observationQualityChecks.$inferSelect;
type VerificationRecord = typeof verificationRecords.$inferSelect;

export function ReviewQueue({
  projectId,
  observations,
  checks,
  verifications,
  metricsList,
}: {
  projectId: number;
  observations: Observation[];
  checks: QualityCheck[];
  verifications: VerificationRecord[];
  metricsList: Metric[];
}) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review queue</CardTitle>
        <CardDescription>
          Observations the rules-based pipeline flagged — never auto-accepted or auto-rejected. Each check's
          rationale is shown alongside any evidence text so a person makes the final call, same as your MEL
          team&apos;s existing follow-up/verify step.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {observations.length === 0 && <p className="text-sm text-muted">Nothing waiting for review.</p>}
        {observations.map((o) => {
          const metric = metricsList.find((m) => m.id === o.metricId);
          const observationChecks = checks.filter((c) => c.observationId === o.id);
          const verification = verifications.find((v) => v.recordId === o.id);
          const flags: string[] = verification?.flags ? JSON.parse(verification.flags) : [];

          return (
            <div key={o.id} className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {metric?.name ?? "Unknown metric"} — {o.period}: {o.actualValue}
                  </p>
                  <p className="text-sm text-muted">
                    {o.sourceType.replace(/_/g, " ")}
                    {o.submittedBy ? ` · ${o.submittedBy}` : ""}
                    {verification?.confidenceScore != null && ` · confidence ${(verification.confidenceScore * 100).toFixed(0)}%`}
                  </p>
                </div>
                <Badge variant={o.status === "needs_follow_up" ? "warning" : "muted"} className="capitalize">
                  {o.status.replace(/_/g, " ")}
                </Badge>
              </div>

              {o.note && <p className="mt-2 text-sm">{o.note}</p>}
              {o.evidenceText && (
                <p className="mt-1 text-sm text-muted">
                  <span className="font-medium">Evidence: </span>
                  {o.evidenceText}
                </p>
              )}

              <div className="mt-3 flex flex-col gap-1">
                {observationChecks.map((c) => (
                  <p key={c.id} className={`text-sm ${c.passed ? "text-ok" : "text-danger"}`}>
                    {c.passed ? "✓" : "✗"} <span className="font-medium">{c.rule}:</span> {c.detail}
                  </p>
                ))}
              </div>

              {flags.length > 0 && (
                <p className="mt-2 text-sm text-muted">
                  <span className="font-medium">Rationale: </span>
                  {flags.length} check{flags.length === 1 ? "" : "s"} flagged.
                </p>
              )}

              <form
                action={async (formData) => {
                  const decision = formData.get("decision") as "accepted" | "rejected" | "needs_follow_up";
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next[o.id];
                    return next;
                  });
                  try {
                    await decideObservation(o.id, projectId, decision, formData);
                  } catch (err) {
                    setErrors((prev) => ({ ...prev, [o.id]: err instanceof Error ? err.message : "Could not record this decision." }));
                  }
                }}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <Input name="reviewerNotes" placeholder="Reviewer notes (optional)" className="flex-1 min-w-[12rem]" />
                <Button type="submit" name="decision" value="accepted" size="sm" variant="outline">
                  Accept
                </Button>
                <Button type="submit" name="decision" value="needs_follow_up" size="sm" variant="outline">
                  Needs follow-up
                </Button>
                <Button type="submit" name="decision" value="rejected" size="sm" variant="destructive">
                  Reject
                </Button>
              </form>
              {errors[o.id] && <p className="mt-2 text-sm text-danger">{errors[o.id]}</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
