"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addBespokeMetric, findSimilarMetrics } from "@/lib/actions";
import type { metrics } from "@/db/schema";

type Metric = typeof metrics.$inferSelect;

// SMART bespoke metric builder (spec Module 2, workflow 2) with the
// "check before you write" duplicate finder (workflow 3) — before
// creating a new bespoke metric, search existing project metrics by
// keyword and surface close matches, mirroring the practice this spec
// is drawn from: reuse tracked indicators rather than proliferate
// near-duplicates.
export function BespokeMetricBuilder({ projectId }: { projectId: number }) {
  const [name, setName] = useState("");
  const [similar, setSimilar] = useState<Metric[]>([]);
  const [checked, setChecked] = useState(false);

  async function checkDuplicates() {
    const matches = await findSimilarMetrics(projectId, name);
    setSimilar(matches);
    setChecked(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bespoke SMART metric</CardTitle>
        <CardDescription>
          For anything not covered by IRIS+ or SDG. Built against the same SMART checklist your practice
          already uses — Specific, Measurable, Achievable, Relevant, Time-bound.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form
          action={async (formData) => {
            await addBespokeMetric(projectId, formData);
            setName("");
            setSimilar([]);
            setChecked(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. # of e-buses procured"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setChecked(false);
                }}
              />
              <Button type="button" variant="outline" onClick={checkDuplicates} disabled={name.trim().length < 3}>
                Check for duplicates
              </Button>
            </div>
            {checked && (
              <p className="text-sm text-muted">
                {similar.length === 0
                  ? "No close matches in this project — looks like a new metric."
                  : `${similar.length} possible match${similar.length === 1 ? "" : "es"} already in this project — consider reusing one instead:`}
              </p>
            )}
            {similar.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-md bg-warning/10 p-2 text-sm">
                {similar.map((m) => (
                  <li key={m.id}>
                    {m.code && <span className="text-muted mr-1">{m.code}</span>}
                    {m.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code (optional)</Label>
              <Input id="code" name="code" placeholder="e.g. OUT.1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Unit (optional)</Label>
              <Input id="unit" name="unit" placeholder="e.g. count, %" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tocLocation">ToC location</Label>
              <Input id="tocLocation" name="tocLocation" placeholder="e.g. Output" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directionOfGood">Direction of good</Label>
              <select id="directionOfGood" name="directionOfGood" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                <option value="higher_is_better">Higher is better</option>
                <option value="lower_is_better">Lower is better</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="definitionMethodsSource">Definition / measurement method (Specific + Measurable)</Label>
            <Textarea id="definitionMethodsSource" name="definitionMethodsSource" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calculationMethod">Calculation method</Label>
              <Input id="calculationMethod" name="calculationMethod" placeholder="e.g. cumulative count" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="suggestedFrequency">Frequency (Time-bound)</Label>
              <Input id="suggestedFrequency" name="suggestedFrequency" placeholder="e.g. quarterly" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disaggregationDimensions">Disaggregation dimensions (optional, comma-separated)</Label>
            <Input id="disaggregationDimensions" name="disaggregationDimensions" placeholder="e.g. geography, gender" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="justification">Justification (Relevant) — why this metric, for this hypothesis/ToC location</Label>
            <Textarea id="justification" name="justification" rows={2} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aggregationMethod">Subnational → national aggregation</Label>
            <select id="aggregationMethod" name="aggregationMethod" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
              <option value="sum">Sum (count-type metrics)</option>
              <option value="weighted_average">Weighted average (rate/ratio-type metrics)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <Button type="submit">Add metric</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
