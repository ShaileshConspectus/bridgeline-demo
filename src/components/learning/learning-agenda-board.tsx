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
import { addLearningAgendaItem, updateLearningAgendaItemStatus, deleteLearningAgendaItem } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import type { learningAgendaItems, impactHypotheses, metrics, fundingInstruments } from "@/db/schema";

type LearningAgendaItem = typeof learningAgendaItems.$inferSelect;
type Hypothesis = typeof impactHypotheses.$inferSelect;
type Metric = typeof metrics.$inferSelect;
type FundingInstrument = typeof fundingInstruments.$inferSelect;

const PRIORITIES = ["high", "moderate", "low"] as const;
const PRIORITY_LABEL: Record<string, string> = { high: "High priority", moderate: "Moderate priority", low: "Low priority" };
const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "muted"> = { high: "danger", moderate: "warning", low: "muted" };
const STATUS_OPTIONS = ["open", "in_progress", "resolved", "archived"] as const;
const STATUS_VARIANT: Record<string, "muted" | "warning" | "ok" | "default"> = {
  open: "muted",
  in_progress: "warning",
  resolved: "ok",
  archived: "default",
};

export function LearningAgendaBoard({
  projectId,
  items,
  hypotheses,
  metricsList,
  instruments,
}: {
  projectId: number;
  items: LearningAgendaItem[];
  hypotheses: Hypothesis[];
  metricsList: Metric[];
  instruments: FundingInstrument[];
}) {
  const [open, setOpen] = useState(false);
  const openCount = items.filter((i) => i.status === "open" || i.status === "in_progress").length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Learning Agenda</CardTitle>
          <CardDescription>
            What did we learn, and what are we doing about it — raised off a hypothesis, a metric, or
            free-standing, tiered by priority, and optionally tied to the Funding Instrument whose review
            cadence it should be resolved by.
            {openCount > 0 && <span className="ml-1 font-medium text-warning">{openCount} open.</span>}
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Learning Agenda item</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addLearningAgendaItem(projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="question">Learning question (optional)</Label>
                <Textarea id="question" name="question" rows={2} placeholder="What are we trying to figure out?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <select id="priority" name="priority" defaultValue="moderate" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dueDate">Due date (optional)</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedHypothesisId">Linked hypothesis (optional)</Label>
                  <select id="linkedHypothesisId" name="linkedHypothesisId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="">None</option>
                    {hypotheses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.statement.slice(0, 60)}…
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedMetricId">Linked metric (optional)</Label>
                  <select id="linkedMetricId" name="linkedMetricId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="">None</option>
                    {metricsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="linkedFundingInstrumentId">Tied to Funding Instrument&apos;s review cadence (optional)</Label>
                <select
                  id="linkedFundingInstrumentId"
                  name="linkedFundingInstrumentId"
                  className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                >
                  <option value="">None</option>
                  {instruments.map((fi) => (
                    <option key={fi.id} value={fi.id}>
                      {fi.capitalProviderName} ({fi.instrumentType})
                      {fi.reportingRequirement ? ` — ${fi.reportingRequirement}` : ""}
                    </option>
                  ))}
                </select>
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {PRIORITIES.map((priority) => (
            <div key={priority} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-muted uppercase tracking-wide">{PRIORITY_LABEL[priority]}</p>
              {items
                .filter((i) => i.priority === priority)
                .map((item) => (
                  <LearningAgendaCard
                    key={item.id}
                    item={item}
                    projectId={projectId}
                    hypotheses={hypotheses}
                    metricsList={metricsList}
                    instruments={instruments}
                  />
                ))}
              {items.filter((i) => i.priority === priority).length === 0 && (
                <p className="text-sm text-muted">No items.</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LearningAgendaCard({
  item,
  projectId,
  hypotheses,
  metricsList,
  instruments,
}: {
  item: LearningAgendaItem;
  projectId: number;
  hypotheses: Hypothesis[];
  metricsList: Metric[];
  instruments: FundingInstrument[];
}) {
  const [resolveOpen, setResolveOpen] = useState(false);
  const [displayStatus, setDisplayStatus] = useState(item.status);
  const linkedHypothesis = hypotheses.find((h) => h.id === item.linkedHypothesisId);
  const linkedMetric = metricsList.find((m) => m.id === item.linkedMetricId);
  const linkedInstrument = instruments.find((fi) => fi.id === item.linkedFundingInstrumentId);

  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <Badge variant={STATUS_VARIANT[item.status]} className="capitalize">
          {item.status.replace(/_/g, " ")}
        </Badge>
        <form action={deleteLearningAgendaItem.bind(null, item.id, projectId)}>
          <Button type="submit" size="icon" variant="ghost" aria-label="Delete item" className="h-6 w-6">
            <Trash2 className="h-3 w-3" />
          </Button>
        </form>
      </div>
      <p className="mt-1 font-medium">{item.title}</p>
      {item.question && <p className="mt-1 text-muted">{item.question}</p>}
      <div className="mt-1 flex flex-wrap gap-1">
        {linkedHypothesis && <Badge variant="outline">Hypothesis: {linkedHypothesis.statement.slice(0, 30)}…</Badge>}
        {linkedMetric && <Badge variant="outline">Metric: {linkedMetric.name}</Badge>}
        {linkedInstrument && (
          <Badge variant="outline">
            Cadence: {linkedInstrument.capitalProviderName} ({linkedInstrument.instrumentType})
          </Badge>
        )}
        {item.dueDate && <Badge variant="outline">Due {item.dueDate}</Badge>}
      </div>
      {item.status === "resolved" && item.resolutionNote && (
        <p className="mt-2 rounded-md bg-muted-surface px-2 py-1.5 text-muted">{item.resolutionNote}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <select
          value={displayStatus}
          onChange={(e) => {
            const next = e.target.value as (typeof STATUS_OPTIONS)[number];
            if (next === "resolved") {
              setResolveOpen(true);
              return;
            }
            setDisplayStatus(next);
            updateLearningAgendaItemStatus(item.id, projectId, next);
          }}
          className="h-7 flex-1 rounded-md border border-border bg-surface px-2 text-xs"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve this item</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              await updateLearningAgendaItemStatus(item.id, projectId, "resolved", formData);
              setDisplayStatus("resolved");
              setResolveOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`resolutionNote-${item.id}`}>What was decided or changed?</Label>
              <Textarea id={`resolutionNote-${item.id}`} name="resolutionNote" rows={3} />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Mark resolved</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
