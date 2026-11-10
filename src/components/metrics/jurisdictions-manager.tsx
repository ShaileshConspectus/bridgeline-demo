"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { addJurisdiction, deleteJurisdiction } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import type { jurisdictions } from "@/db/schema";

type Jurisdiction = typeof jurisdictions.$inferSelect;

const LEVEL_LABEL: Record<string, string> = {
  subnational: "Subnational",
  national: "National",
  region: "Region",
};

export function JurisdictionsManager({ projectId, jurisdictionsList }: { projectId: number; jurisdictionsList: Jurisdiction[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Jurisdictions</CardTitle>
          <CardDescription>
            Baselines are captured subnational — the smallest unit data actually gets collected at — and roll
            up to national/regional per each metric&apos;s aggregation method.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add jurisdiction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a jurisdiction</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addJurisdiction(projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Bogotá, or Colombia" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="level">Level</Label>
                <select id="level" name="level" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="subnational">Subnational (city/site)</option>
                  <option value="national">National</option>
                  <option value="region">Region</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="parentJurisdictionId">Parent (optional — for rollup)</Label>
                <select id="parentJurisdictionId" name="parentJurisdictionId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="">None</option>
                  {jurisdictionsList.map((j) => (
                    <option key={j.id} value={j.id}>
                      [{LEVEL_LABEL[j.level]}] {j.name}
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
        {jurisdictionsList.length === 0 ? (
          <p className="text-sm text-muted">No jurisdictions yet — add one to start recording subnational baselines.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {jurisdictionsList.map((j) => {
              const parent = jurisdictionsList.find((p) => p.id === j.parentJurisdictionId);
              return (
                <div key={j.id} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
                  <Badge variant="outline">{LEVEL_LABEL[j.level]}</Badge>
                  {j.name}
                  {parent && <span className="text-muted">→ {parent.name}</span>}
                  <form action={deleteJurisdiction.bind(null, j.id, projectId)}>
                    <Button type="submit" size="icon" variant="ghost" aria-label="Delete jurisdiction" className="h-6 w-6">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
