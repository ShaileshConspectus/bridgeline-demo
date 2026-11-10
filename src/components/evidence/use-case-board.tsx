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
import { addUseCase, updateUseCaseStage, verifyUseCase, deleteUseCase } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import type { useCases, impactHypotheses } from "@/db/schema";

type UseCase = typeof useCases.$inferSelect;
type Hypothesis = typeof impactHypotheses.$inferSelect;

const STAGES = ["interest", "use", "result", "outcome", "top_outcome", "testimonial"] as const;
const STAGE_LABEL: Record<string, string> = {
  interest: "Interest",
  use: "Use",
  result: "Result",
  outcome: "Outcome",
  top_outcome: "Top Outcome",
  testimonial: "Testimonial",
};
const VERIFICATION_VARIANT: Record<string, "muted" | "warning" | "ok"> = {
  unverified: "muted",
  follow_up_in_progress: "warning",
  verified: "ok",
};

export function UseCaseBoard({
  projectId,
  useCasesList,
  hypothesesList,
}: {
  projectId: number;
  useCasesList: UseCase[];
  hypothesesList: Hypothesis[];
}) {
  const [open, setOpen] = useState(false);
  const followUpCount = useCasesList.filter((u) => u.verificationStatus === "follow_up_in_progress").length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Use case log</CardTitle>
          <CardDescription>
            Qualitative evidence staged Interest → Use → Result → Outcome → Top Outcome → Testimonial. Moving a
            case to Outcome or Top Outcome creates a follow-up requirement — it doesn&apos;t count as verified
            until someone confirms it.
            {followUpCount > 0 && (
              <span className="ml-1 font-medium text-warning">
                {followUpCount} awaiting follow-up.
              </span>
            )}
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add use case
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a use case</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addUseCase(projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="origin">Origin</Label>
                  <select id="origin" name="origin" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="email">Email</option>
                    <option value="partner">Partner</option>
                    <option value="event">Event</option>
                    <option value="survey">Survey</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedHypothesisId">Linked hypothesis (optional)</Label>
                  <select id="linkedHypothesisId" name="linkedHypothesisId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="">None</option>
                    {hypothesesList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.statement.slice(0, 60)}…
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sector">Sector (optional)</Label>
                  <Input id="sector" name="sector" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topic">Topic (optional)</Label>
                  <Input id="topic" name="topic" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="narrativeText">Narrative</Label>
                <Textarea id="narrativeText" name="narrativeText" required rows={3} />
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
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-muted uppercase tracking-wide">{STAGE_LABEL[stage]}</p>
              {useCasesList
                .filter((u) => u.stage === stage)
                .map((u) => (
                  <UseCaseCard key={u.id} useCase={u} projectId={projectId} />
                ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UseCaseCard({ useCase, projectId }: { useCase: UseCase; projectId: number }) {
  const [verifyOpen, setVerifyOpen] = useState(false);

  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <Badge variant={VERIFICATION_VARIANT[useCase.verificationStatus]} className="capitalize">
          {useCase.verificationStatus.replace(/_/g, " ")}
        </Badge>
        <form action={deleteUseCase.bind(null, useCase.id, projectId)}>
          <Button type="submit" size="icon" variant="ghost" aria-label="Delete use case" className="h-6 w-6">
            <Trash2 className="h-3 w-3" />
          </Button>
        </form>
      </div>
      <p className="mt-1">{useCase.narrativeText}</p>
      {(useCase.sector || useCase.topic) && (
        <p className="mt-1 text-muted">
          {[useCase.sector, useCase.topic].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <select
          defaultValue={useCase.stage}
          onChange={(e) => updateUseCaseStage(useCase.id, projectId, e.target.value as UseCase["stage"])}
          className="h-7 flex-1 rounded-md border border-border bg-surface px-2 text-xs"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        {useCase.verificationStatus !== "verified" && (
          <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
                Verify
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify this use case</DialogTitle>
              </DialogHeader>
              <form
                action={async (formData) => {
                  await verifyUseCase(useCase.id, projectId, formData);
                  setVerifyOpen(false);
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="verifiedBy">Verified by</Label>
                  <Input id="verifiedBy" name="verifiedBy" placeholder="Your name" />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Confirm verified</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
