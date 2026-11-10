"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  addCommercialValueChainStage,
  updateCommercialValueChainStage,
  deleteCommercialValueChainStage,
} from "@/lib/actions";
import { Trash2, Pencil } from "lucide-react";
import type { commercialValueChainStages } from "@/db/schema";

type CommercialStage = typeof commercialValueChainStages.$inferSelect;

// Spec Decision 8: an optional parallel causal chain for a for-profit
// venture's "path to commercial scale" — free-form ordered milestones
// (e.g. Product-Market Fit -> Revenue Scale -> Category Leadership),
// kept structurally separate from the impact ToC. Financial KPI
// *values* stay out of scope (per the financial-metrics decision) —
// this is about naming commercial milestones, not tracking numbers.
export function CommercialValueChainPanel({
  projectId,
  thesisId,
  stages,
}: {
  projectId: number;
  thesisId: number;
  stages: CommercialStage[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Commercial value chain</CardTitle>
          <CardDescription>
            This project is a for-profit venture, so &quot;reaching commercial scale&quot; is tracked as its
            own milestone chain, alongside — never merged into — the impact Theory of Change. A hypothesis
            can reference a stage here so &quot;path to revenue&quot; and &quot;path to impact&quot; stay
            visible side by side.
          </CardDescription>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a commercial milestone</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addCommercialValueChainStage(thesisId, projectId, formData);
                setAddOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="e.g. Product-Market Fit" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" rows={2} />
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
        {stages.length === 0 && <p className="text-sm text-muted">No commercial milestones yet.</p>}
        {stages.map((s, i) => (
          <StageRow key={s.id} stage={s} index={i} projectId={projectId} />
        ))}
      </CardContent>
    </Card>
  );
}

function StageRow({ stage, index, projectId }: { stage: CommercialStage; index: number; projectId: number }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">
          <span className="text-muted mr-1">{index + 1}.</span>
          {stage.title}
        </p>
        {stage.description && <p className="mt-0.5 text-sm text-muted">{stage.description}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="icon" variant="ghost" aria-label="Edit stage" className="h-7 w-7">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit commercial milestone</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await updateCommercialValueChainStage(stage.id, projectId, formData);
                setEditOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`title-${stage.id}`}>Title</Label>
                <Input id={`title-${stage.id}`} name="title" required defaultValue={stage.title} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`description-${stage.id}`}>Description (optional)</Label>
                <Textarea id={`description-${stage.id}`} name="description" rows={2} defaultValue={stage.description ?? ""} />
              </div>
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
        <form action={deleteCommercialValueChainStage.bind(null, stage.id, projectId)}>
          <Button type="submit" size="icon" variant="ghost" aria-label="Delete stage" className="h-7 w-7">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
