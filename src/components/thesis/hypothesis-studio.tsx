"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  addHypothesis,
  deleteHypothesis,
  updateHypothesisStatus,
  updateHypothesisStageLinks,
  addAssumptionRisk,
  deleteAssumptionRisk,
} from "@/lib/actions";
import { Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import type { tocRungs, impactHypotheses, assumptionRisks, metrics, engagementFunnelStages, commercialValueChainStages } from "@/db/schema";

type TocRung = typeof tocRungs.$inferSelect;
type Hypothesis = typeof impactHypotheses.$inferSelect;
type AssumptionRisk = typeof assumptionRisks.$inferSelect;
type Metric = typeof metrics.$inferSelect;
type EngagementStage = typeof engagementFunnelStages.$inferSelect;
type CommercialStage = typeof commercialValueChainStages.$inferSelect;

const ENGAGEMENT_STAGE_LABEL: Record<string, string> = {
  reach: "Reach",
  active_uptake: "Active Uptake",
  meaningful_uptake: "Meaningful Uptake",
  outcome: "Outcome",
};

const STATUS_OPTIONS = ["untested", "testing", "supported", "refuted", "inconclusive"] as const;
const STATUS_VARIANT: Record<string, "muted" | "warning" | "ok" | "danger" | "default"> = {
  untested: "muted",
  testing: "warning",
  supported: "ok",
  refuted: "danger",
  inconclusive: "default",
};

const RUNG_LABELS: Record<string, string> = {
  input: "Input",
  process: "Process",
  output: "Output",
  intermediate_outcome: "Intermediate outcome",
  outcome: "Outcome",
  impact: "Impact",
};

export function HypothesisStudio({
  projectId,
  thesisId,
  hypotheses,
  assumptions,
  rungs,
  engagementStages = [],
  commercialStages = [],
}: {
  projectId: number;
  thesisId: number;
  hypotheses: Hypothesis[];
  assumptions: AssumptionRisk[];
  rungs: TocRung[];
  metrics: Metric[];
  engagementStages?: EngagementStage[];
  commercialStages?: CommercialStage[];
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Impact hypotheses</CardTitle>
          <CardDescription>
            Falsifiable IF/THEN statements linking rungs in the results ladder, each with an
            assumptions &amp; risks register.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add hypothesis
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add an impact hypothesis</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addHypothesis(thesisId, projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="statement">Statement</Label>
                <Textarea
                  id="statement"
                  name="statement"
                  required
                  rows={2}
                  placeholder="IF ... THEN ..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fromRungId">From rung (optional)</Label>
                  <select id="fromRungId" name="fromRungId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="">None</option>
                    {rungs.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{RUNG_LABELS[r.rungType]}] {r.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="toRungId">To rung (optional)</Label>
                  <select id="toRungId" name="toRungId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="">None</option>
                    {rungs.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{RUNG_LABELS[r.rungType]}] {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(engagementStages.length > 0 || commercialStages.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {engagementStages.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="linkedEngagementStageId">Engagement funnel stage (optional)</Label>
                      <select
                        id="linkedEngagementStageId"
                        name="linkedEngagementStageId"
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                      >
                        <option value="">None</option>
                        {engagementStages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {ENGAGEMENT_STAGE_LABEL[s.stage] ?? s.stage}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {commercialStages.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="linkedCommercialStageId">Commercial milestone (optional)</Label>
                      <select
                        id="linkedCommercialStageId"
                        name="linkedCommercialStageId"
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                      >
                        <option value="">None</option>
                        {commercialStages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confidenceNote">Confidence note (optional)</Label>
                <Textarea id="confidenceNote" name="confidenceNote" rows={2} />
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
        {hypotheses.length === 0 && <p className="text-sm text-muted">No hypotheses yet.</p>}
        {hypotheses.map((h) => {
          const fromRung = rungs.find((r) => r.id === h.fromRungId);
          const toRung = rungs.find((r) => r.id === h.toRungId);
          const linkedEngagementStage = engagementStages.find((s) => s.id === h.linkedEngagementStageId);
          const linkedCommercialStage = commercialStages.find((s) => s.id === h.linkedCommercialStageId);
          const relatedAssumptions = assumptions.filter((a) => a.hypothesisId === h.id);
          const isExpanded = expanded === h.id;

          return (
            <div key={h.id} className="rounded-md border border-border">
              <div className="flex items-start justify-between gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : h.id)}
                  className="flex flex-1 items-start gap-2 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{h.statement}</p>
                    <p className="text-sm text-muted">
                      {fromRung && RUNG_LABELS[fromRung.rungType]}
                      {fromRung && toRung && " → "}
                      {toRung && RUNG_LABELS[toRung.rungType]}
                      {relatedAssumptions.length > 0 &&
                        ` · ${relatedAssumptions.length} assumption${relatedAssumptions.length === 1 ? "" : "s"}`}
                    </p>
                    {(linkedEngagementStage || linkedCommercialStage) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {linkedEngagementStage && (
                          <Badge variant="outline">Engagement: {ENGAGEMENT_STAGE_LABEL[linkedEngagementStage.stage] ?? linkedEngagementStage.stage}</Badge>
                        )}
                        {linkedCommercialStage && <Badge variant="outline">Commercial: {linkedCommercialStage.title}</Badge>}
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <StatusSelect hypothesisId={h.id} projectId={projectId} status={h.status} />
                  {(engagementStages.length > 0 || commercialStages.length > 0) && (
                    <StageLinkEditDialog
                      hypothesisId={h.id}
                      projectId={projectId}
                      engagementStages={engagementStages}
                      commercialStages={commercialStages}
                      currentEngagementStageId={h.linkedEngagementStageId}
                      currentCommercialStageId={h.linkedCommercialStageId}
                    />
                  )}
                  <form action={deleteHypothesis.bind(null, h.id, projectId)}>
                    <Button type="submit" size="icon" variant="ghost" aria-label="Delete hypothesis">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-3">
                  <p className="mb-2 text-sm font-semibold">Assumptions &amp; risks</p>
                  <div className="flex flex-col gap-2">
                    {relatedAssumptions.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-md bg-muted-surface px-3 py-2 text-sm">
                        <span>{a.description}</span>
                        <form action={deleteAssumptionRisk.bind(null, a.id, projectId)}>
                          <Button type="submit" size="icon" variant="ghost" aria-label="Delete assumption">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                    ))}
                    {relatedAssumptions.length === 0 && (
                      <p className="text-sm text-muted">None recorded.</p>
                    )}
                  </div>
                  <form
                    action={addAssumptionRisk.bind(null, h.id, projectId)}
                    className="mt-2 flex gap-2"
                  >
                    <Input name="description" placeholder="Add an assumption or risk…" className="flex-1" />
                    <Button type="submit" size="sm" variant="outline">
                      Add
                    </Button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StatusSelect({
  hypothesisId,
  projectId,
  status,
}: {
  hypothesisId: number;
  projectId: number;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Badge variant={STATUS_VARIANT[status] ?? "muted"} className="capitalize">
        {status}
      </Badge>
      <select
        disabled={isPending}
        value={status}
        onChange={(e) => {
          const next = e.target.value as (typeof STATUS_OPTIONS)[number];
          startTransition(async () => {
            await updateHypothesisStatus(hypothesisId, projectId, next);
          });
        }}
        className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

// Edits a hypothesis's parallel-lens links after creation (spec Section
// 3.3/12) — these previously could only be set when the hypothesis was
// first added, so changing a project's commercial milestones or
// engagement thresholds meant deleting and recreating hypotheses to
// re-point the link. This dialog lets either link be changed or cleared
// in place.
function StageLinkEditDialog({
  hypothesisId,
  projectId,
  engagementStages,
  commercialStages,
  currentEngagementStageId,
  currentCommercialStageId,
}: {
  hypothesisId: number;
  projectId: number;
  engagementStages: EngagementStage[];
  commercialStages: CommercialStage[];
  currentEngagementStageId: number | null;
  currentCommercialStageId: number | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label="Edit parallel-lens links">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit parallel-lens links</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await updateHypothesisStageLinks(hypothesisId, projectId, formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          {engagementStages.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-linkedEngagementStageId-${hypothesisId}`}>Engagement funnel stage</Label>
              <select
                id={`edit-linkedEngagementStageId-${hypothesisId}`}
                name="linkedEngagementStageId"
                defaultValue={currentEngagementStageId ?? ""}
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
              >
                <option value="">None</option>
                {engagementStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {ENGAGEMENT_STAGE_LABEL[s.stage] ?? s.stage}
                  </option>
                ))}
              </select>
            </div>
          )}
          {commercialStages.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-linkedCommercialStageId-${hypothesisId}`}>Commercial milestone</Label>
              <select
                id={`edit-linkedCommercialStageId-${hypothesisId}`}
                name="linkedCommercialStageId"
                defaultValue={currentCommercialStageId ?? ""}
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
              >
                <option value="">None</option>
                {commercialStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
