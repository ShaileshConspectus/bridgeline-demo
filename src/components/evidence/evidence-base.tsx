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
import { addEvidenceStudy, deleteEvidenceStudy } from "@/lib/actions";
import { DESIGN_LABEL, DESIGN_NOTE, TIER_LABEL, designTier, type EvidenceTier, type StudyDesign } from "@/lib/evaluation";
import { Trash2 } from "lucide-react";
import type { evidenceStudies, impactHypotheses } from "@/db/schema";

type Study = typeof evidenceStudies.$inferSelect;
type Hypothesis = typeof impactHypotheses.$inferSelect;

export const TIER_VARIANT: Record<EvidenceTier, "ok" | "default" | "warning" | "danger" | "muted"> = {
  strong: "ok",
  moderate: "default",
  limited: "warning",
  weak: "danger",
  contextual: "muted",
};

const selectClass = "h-9 rounded-md border border-border bg-surface px-3 text-sm";

export function EvidenceBase({
  projectId,
  studies,
  hypotheses,
}: {
  projectId: number;
  studies: Study[];
  hypotheses: Hypothesis[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Evidence base</CardTitle>
          <CardDescription>
            Evaluations and studies that bear on your hypotheses, graded by how well the design isolates the
            programme&apos;s effect. A before/after comparison is never presented as a randomized trial.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add study
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a study</DialogTitle>
            </DialogHeader>
            <form
              action={async (fd) => {
                await addEvidenceStudy(projectId, fd);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="study-title">Title</Label>
                <Input id="study-title" name="title" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="study-citation">Citation or link (optional)</Label>
                <Input id="study-citation" name="citation" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="study-design">Design</Label>
                  <select id="study-design" name="design" required defaultValue="" className={selectClass}>
                    <option value="" disabled>
                      Choose…
                    </option>
                    {(Object.keys(DESIGN_LABEL) as StudyDesign[]).map((d) => (
                      <option key={d} value={d}>
                        {DESIGN_LABEL[d]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="study-scope">Setting</Label>
                  <select id="study-scope" name="studyScope" defaultValue="unknown" className={selectClass}>
                    <option value="unknown">Unknown</option>
                    <option value="efficacy">Efficacy (pilot, controlled)</option>
                    <option value="effectiveness">Effectiveness (normal conditions)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="study-hyp">Hypothesis it bears on (optional)</Label>
                <select id="study-hyp" name="linkedHypothesisId" defaultValue="" className={selectClass}>
                  <option value="">None</option>
                  {hypotheses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.statement.length > 70 ? `${h.statement.slice(0, 70)}…` : h.statement}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="study-summary">What it found (optional)</Label>
                <Textarea id="study-summary" name="summary" rows={3} />
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
        {studies.length === 0 && <p className="text-sm text-muted">No studies yet.</p>}
        {studies.map((s) => {
          const tier = designTier(s.design as StudyDesign);
          const h = hypotheses.find((x) => x.id === s.linkedHypothesisId);
          const note = DESIGN_NOTE[s.design as StudyDesign];
          return (
            <div key={s.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{s.title}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={TIER_VARIANT[tier]}>{TIER_LABEL[tier]}</Badge>
                  <Badge variant="outline">{DESIGN_LABEL[s.design as StudyDesign]}</Badge>
                  {s.studyScope !== "unknown" && <Badge variant="muted" className="capitalize">{s.studyScope}</Badge>}
                </div>
                {s.citation && <p className="text-xs text-muted">{s.citation}</p>}
                {s.summary && <p className="text-sm">{s.summary}</p>}
                {note && <p className="text-xs text-warning">{note}</p>}
                {s.studyScope === "efficacy" && (
                  <p className="text-xs text-muted">Pilot conditions: results may not hold at scale.</p>
                )}
                {h && <p className="text-xs text-muted">Bears on: {h.statement.length > 90 ? `${h.statement.slice(0, 90)}…` : h.statement}</p>}
              </div>
              <form action={deleteEvidenceStudy.bind(null, s.id, projectId)}>
                <Button type="submit" size="icon" variant="ghost" aria-label="Delete study">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
