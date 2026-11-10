"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { addTocRung, updateTocRung, deleteTocRung, addOoaNode, deleteOoaNode } from "@/lib/actions";
import { Trash2, Pencil } from "lucide-react";
import type { tocRungs, objectiveOutputActivities } from "@/db/schema";

type TocRung = typeof tocRungs.$inferSelect;
type OoaNode = typeof objectiveOutputActivities.$inferSelect;

const RUNG_ORDER = ["input", "process", "output", "intermediate_outcome", "outcome", "impact"] as const;
const RUNG_LABELS: Record<string, string> = {
  input: "Input",
  process: "Process",
  output: "Output",
  intermediate_outcome: "Intermediate outcome",
  outcome: "Outcome",
  impact: "Impact",
};

export function TocStudio({
  projectId,
  thesisId,
  rungs,
  ooaNodes,
}: {
  projectId: number;
  thesisId: number;
  rungs: TocRung[];
  ooaNodes: OoaNode[];
  thesisStatement: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theory of change</CardTitle>
        <CardDescription>
          Toggle between the causal-chain view (input → impact) and the capital-provider-facing
          Objective / Output / Activity view. Both stay linked when items reference the same rung.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="causal">
          <TabsList>
            <TabsTrigger value="causal">Causal chain</TabsTrigger>
            <TabsTrigger value="ooa">Objective / Output / Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="causal">
            <CausalChainView projectId={projectId} thesisId={thesisId} rungs={rungs} />
          </TabsContent>
          <TabsContent value="ooa">
            <OoaView projectId={projectId} thesisId={thesisId} ooaNodes={ooaNodes} rungs={rungs} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CausalChainView({
  projectId,
  thesisId,
  rungs,
}: {
  projectId: number;
  thesisId: number;
  rungs: TocRung[];
}) {
  const [open, setOpen] = useState(false);
  const grouped = RUNG_ORDER.map((type) => ({
    type,
    items: rungs.filter((r) => r.rungType === type),
  }));

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add rung
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a results-ladder rung</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addTocRung(thesisId, projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <RungFormFields />
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
      </div>

      {grouped.map(({ type, items }) => (
        <div key={type} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge>{RUNG_LABELS[type]}</Badge>
            {items.length === 0 && <span className="text-sm text-muted">Nothing yet</span>}
          </div>
          {items.map((r) => (
            <RungCard key={r.id} rung={r} projectId={projectId} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RungFormFields({ rung }: { rung?: TocRung }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rungType">Type</Label>
        <select
          id="rungType"
          name="rungType"
          required
          defaultValue={rung?.rungType}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
        >
          {RUNG_ORDER.map((t) => (
            <option key={t} value={t}>
              {RUNG_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={rung?.title} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={rung?.description ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="yearHorizon">Year horizon (optional)</Label>
        <Input id="yearHorizon" name="yearHorizon" placeholder="e.g. Year 1" defaultValue={rung?.yearHorizon ?? ""} />
      </div>
    </>
  );
}

function RungCard({ rung, projectId }: { rung: TocRung; projectId: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ml-2 flex items-start justify-between gap-2 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">
          {rung.title} {rung.yearHorizon && <span className="text-muted font-normal">· {rung.yearHorizon}</span>}
        </p>
        {rung.description && <p className="text-sm text-muted">{rung.description}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="icon" variant="ghost" aria-label="Edit rung">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit rung</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await updateTocRung(rung.id, projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <RungFormFields rung={rung} />
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
        <form action={deleteTocRung.bind(null, rung.id, projectId)}>
          <Button type="submit" size="icon" variant="ghost" aria-label="Delete rung">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function OoaView({
  projectId,
  thesisId,
  ooaNodes,
  rungs,
}: {
  projectId: number;
  thesisId: number;
  ooaNodes: OoaNode[];
  rungs: TocRung[];
}) {
  const [open, setOpen] = useState(false);
  const objectives = ooaNodes.filter((n) => n.kind === "objective");
  const childrenOf = (parentId: number) => ooaNodes.filter((n) => n.parentId === parentId);

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add node
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add an objective, output, or activity</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addOoaNode(thesisId, projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kind">Kind</Label>
                <select
                  id="kind"
                  name="kind"
                  required
                  className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                >
                  <option value="objective">Objective</option>
                  <option value="output">Output</option>
                  <option value="activity">Activity</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Code (optional)</Label>
                <Input id="code" name="code" placeholder="e.g. 1a" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="parentId">Parent (optional)</Label>
                <select id="parentId" name="parentId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="">None (top-level objective)</option>
                  {ooaNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.kind}] {n.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="linkedTocRungId">Linked ToC rung (optional)</Label>
                <select
                  id="linkedTocRungId"
                  name="linkedTocRungId"
                  className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                >
                  <option value="">None</option>
                  {rungs.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{RUNG_LABELS[r.rungType]}] {r.title}
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
      </div>

      {objectives.length === 0 && ooaNodes.length === 0 && (
        <p className="text-sm text-muted">Nothing yet.</p>
      )}

      {objectives.map((obj) => (
        <OoaNodeRow key={obj.id} node={obj} childrenOf={childrenOf} rungs={rungs} projectId={projectId} depth={0} />
      ))}
    </div>
  );
}

function OoaNodeRow({
  node,
  childrenOf,
  rungs,
  projectId,
  depth,
}: {
  node: OoaNode;
  childrenOf: (parentId: number) => OoaNode[];
  rungs: TocRung[];
  projectId: number;
  depth: number;
}) {
  const linkedRung = node.linkedTocRungId ? rungs.find((r) => r.id === node.linkedTocRungId) : null;
  const kids = childrenOf(node.id);

  return (
    <div style={{ marginLeft: depth * 20 }} className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
        <div>
          <p className="text-sm font-medium">
            {node.code && <span className="text-muted mr-1">{node.code}</span>}
            {node.title}
            <Badge variant="outline" className="ml-2 capitalize">
              {node.kind}
            </Badge>
            {linkedRung && (
              <Badge variant="muted" className="ml-2">
                {RUNG_LABELS[linkedRung.rungType]}
              </Badge>
            )}
          </p>
          {node.description && <p className="text-sm text-muted">{node.description}</p>}
        </div>
        <form action={deleteOoaNode.bind(null, node.id, projectId)}>
          <Button type="submit" size="icon" variant="ghost" aria-label="Delete node">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>
      {kids.map((child) => (
        <OoaNodeRow
          key={child.id}
          node={child}
          childrenOf={childrenOf}
          rungs={rungs}
          projectId={projectId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
