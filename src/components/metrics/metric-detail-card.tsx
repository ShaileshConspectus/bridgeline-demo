"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  deleteMetric,
  addJurisdictionBaseline,
  deleteJurisdictionBaseline,
  addMetricTarget,
  deleteMetricTarget,
  addCapitalProviderTag,
  deleteCapitalProviderTag,
  updateMetricRequiresElevatedVerification,
} from "@/lib/actions";
import { computeAggregatedBaseline } from "@/lib/metrics";
import { IRIS_PLUS_CATALOG } from "@/lib/catalog";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { metrics, metricTargets, jurisdictions, jurisdictionBaselines, metricCapitalProviderTags } from "@/db/schema";

type Metric = typeof metrics.$inferSelect;
type MetricTarget = typeof metricTargets.$inferSelect;
type Jurisdiction = typeof jurisdictions.$inferSelect;
type JurisdictionBaseline = typeof jurisdictionBaselines.$inferSelect;
type CapitalProviderTag = typeof metricCapitalProviderTags.$inferSelect;

const SOURCE_LABEL: Record<string, string> = { iris_plus: "IRIS+", sdg: "SDG", bespoke: "Bespoke" };

export function MetricDetailCard({
  metric,
  projectId,
  targets,
  baselines,
  tags,
  jurisdictionsList,
}: {
  metric: Metric;
  projectId: number;
  targets: MetricTarget[];
  baselines: JurisdictionBaseline[];
  tags: CapitalProviderTag[];
  jurisdictionsList: Jurisdiction[];
}) {
  const [expanded, setExpanded] = useState(false);
  const rollup = computeAggregatedBaseline(metric, baselines);
  const catalogEntry = metric.source === "iris_plus" ? IRIS_PLUS_CATALOG.find((e) => e.sourceCode === metric.sourceCode) : null;

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-start justify-between gap-2 p-4">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex flex-1 items-start gap-2 text-left">
          {expanded ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
          <div>
            <p className="text-sm font-medium">
              {metric.code && <span className="text-muted mr-1">{metric.code}</span>}
              {metric.name}
              {metric.unit && <span className="text-muted font-normal"> ({metric.unit})</span>}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline">{SOURCE_LABEL[metric.source]}</Badge>
              {metric.tocLocation && <Badge variant="outline">{metric.tocLocation}</Badge>}
              {metric.requiresElevatedVerification && <Badge variant="warning">Elevated verification</Badge>}
              {tags.map((t) => (
                <Badge key={t.id} variant="muted">
                  {t.tag}
                </Badge>
              ))}
            </div>
          </div>
        </button>
        <form action={deleteMetric.bind(null, metric.id, projectId)}>
          <Button type="submit" size="icon" variant="ghost" aria-label="Delete metric">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {expanded && (
        <div className="flex flex-col gap-5 border-t border-border p-4">
          {(metric.definitionMethodsSource || metric.justification) && (
            <div className="text-sm">
              {metric.definitionMethodsSource && (
                <p>
                  <span className="text-muted">Definition/method: </span>
                  {metric.definitionMethodsSource}
                </p>
              )}
              {metric.justification && (
                <p>
                  <span className="text-muted">Justification: </span>
                  {metric.justification}
                </p>
              )}
              {metric.calculationMethod && (
                <p>
                  <span className="text-muted">Calculation: </span>
                  {metric.calculationMethod}
                </p>
              )}
              {metric.suggestedFrequency && (
                <p>
                  <span className="text-muted">Suggested frequency: </span>
                  {metric.suggestedFrequency}
                </p>
              )}
              {metric.disaggregationDimensions && (
                <p>
                  <span className="text-muted">Disaggregation: </span>
                  {metric.disaggregationDimensions}
                </p>
              )}
            </div>
          )}

          {catalogEntry && catalogEntry.mappedSdgTargets.length > 0 && (
            <div className="text-sm">
              <span className="text-muted">Cross-mapped to SDG: </span>
              {catalogEntry.mappedSdgTargets.map((t) => (
                <Badge key={t} variant="muted" className="mr-1">
                  SDG {t}
                </Badge>
              ))}
            </div>
          )}

          <ElevatedVerificationToggle metric={metric} projectId={projectId} />

          <CapitalProviderTagsSection metricId={metric.id} projectId={projectId} tags={tags} />

          <JurisdictionBaselinesSection
            metricId={metric.id}
            projectId={projectId}
            baselines={baselines}
            jurisdictionsList={jurisdictionsList}
            rollup={rollup}
          />

          <MilestoneTargetsSection
            metricId={metric.id}
            projectId={projectId}
            targets={targets}
            jurisdictionsList={jurisdictionsList}
          />
        </div>
      )}
    </div>
  );
}

function ElevatedVerificationToggle({ metric, projectId }: { metric: Metric; projectId: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between rounded-md bg-muted-surface p-3">
      <div>
        <p className="text-sm font-medium">Requires elevated verification</p>
        <p className="text-sm text-muted">
          Manually set — mirrors the consequence-severity decision rather than being inferred from funding
          instrument type. Evidence Hub (1d) will check this against a current Certification/Audit Record.
        </p>
      </div>
      <Switch
        checked={metric.requiresElevatedVerification}
        disabled={isPending}
        onCheckedChange={(checked) => {
          startTransition(async () => {
            await updateMetricRequiresElevatedVerification(metric.id, projectId, checked);
          });
        }}
      />
    </div>
  );
}

function CapitalProviderTagsSection({
  metricId,
  projectId,
  tags,
}: {
  metricId: number;
  projectId: number;
  tags: CapitalProviderTag[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Capital provider tags</p>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span key={t.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
            {t.tag}
            <form action={deleteCapitalProviderTag.bind(null, t.id, projectId)}>
              <button type="submit" aria-label="Remove tag" className="text-muted hover:text-danger">
                ×
              </button>
            </form>
          </span>
        ))}
        <form action={addCapitalProviderTag.bind(null, metricId, projectId)} className="flex gap-1">
          <Input name="tag" placeholder="e.g. USAID standard indicator" className="h-7 w-56 text-xs" />
          <Button type="submit" size="sm" variant="outline" className="h-7">
            Add
          </Button>
        </form>
      </div>
    </div>
  );
}

function JurisdictionBaselinesSection({
  metricId,
  projectId,
  baselines,
  jurisdictionsList,
  rollup,
}: {
  metricId: number;
  projectId: number;
  baselines: JurisdictionBaseline[];
  jurisdictionsList: Jurisdiction[];
  rollup: { value: number | null; label: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Jurisdiction baselines</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              Add baseline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a jurisdiction baseline</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addJurisdictionBaseline(metricId, projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jurisdictionId">Jurisdiction</Label>
                <select id="jurisdictionId" name="jurisdictionId" required className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="">Select…</option>
                  {jurisdictionsList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="baselineValue">Baseline value</Label>
                  <Input id="baselineValue" name="baselineValue" type="number" step="any" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="baselineDate">Baseline date</Label>
                  <Input id="baselineDate" name="baselineDate" placeholder="e.g. 2023-01" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="baselineSource">Source</Label>
                <Input id="baselineSource" name="baselineSource" placeholder="e.g. World Bank WDI, primary survey" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confidenceLevel">Confidence</Label>
                <select id="confidenceLevel" name="confidenceLevel" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="">Not set</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
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

      {jurisdictionsList.length === 0 && <p className="text-sm text-muted">Add a jurisdiction first (below) to record baselines.</p>}

      {baselines.length > 0 && (
        <div className="mb-2 rounded-md bg-muted-surface p-2 text-sm">
          <span className="font-medium">Computed national/regional figure: </span>
          {rollup.value != null ? rollup.value.toLocaleString() : "—"}
          <span className="text-muted"> ({rollup.label})</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {baselines.map((b) => {
          const j = jurisdictionsList.find((jur) => jur.id === b.jurisdictionId);
          return (
            <div key={b.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-sm">
              <span>
                {j?.name ?? "Unknown jurisdiction"}: {b.baselineValue}
                {b.baselineDate ? ` (${b.baselineDate})` : ""}
                {b.baselineSource ? ` · ${b.baselineSource}` : ""}
                {b.confidenceLevel && (
                  <Badge variant="outline" className="ml-2 capitalize">
                    {b.confidenceLevel} confidence
                  </Badge>
                )}
              </span>
              <form action={deleteJurisdictionBaseline.bind(null, b.id, projectId)}>
                <Button type="submit" size="icon" variant="ghost" aria-label="Delete baseline" className="h-6 w-6">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneTargetsSection({
  metricId,
  projectId,
  targets,
  jurisdictionsList,
}: {
  metricId: number;
  projectId: number;
  targets: MetricTarget[];
  jurisdictionsList: Jurisdiction[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Milestone / target trajectory</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              Add period
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set baseline / milestone / target</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addMetricTarget(metricId, projectId, formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="period">Period label</Label>
                  <Input id="period" name="period" required placeholder="e.g. 2024" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="jurisdictionId">Jurisdiction (optional)</Label>
                  <select id="jurisdictionId" name="jurisdictionId" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                    <option value="">Project-level</option>
                    {jurisdictionsList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="baseline">Baseline</Label>
                  <Input id="baseline" name="baseline" type="number" step="any" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="milestone">Milestone</Label>
                  <Input id="milestone" name="milestone" type="number" step="any" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="target">Target</Label>
                  <Input id="target" name="target" type="number" step="any" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="milestoneDate">Milestone date</Label>
                  <Input id="milestoneDate" name="milestoneDate" placeholder="e.g. 2024-06" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="targetDate">Target date</Label>
                  <Input id="targetDate" name="targetDate" placeholder="e.g. 2025-12" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rationale">Rationale (optional)</Label>
                <Input id="rationale" name="rationale" placeholder="Why this milestone/target" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="consequenceSeverity">Consequence severity if missed</Label>
                <select id="consequenceSeverity" name="consequenceSeverity" className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="">Not set</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
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

      <div className="flex flex-col gap-1">
        {targets.map((t) => {
          const j = jurisdictionsList.find((jur) => jur.id === t.jurisdictionId);
          return (
            <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-sm">
              <span>
                {t.period} {j && <span className="text-muted">({j.name})</span>} — baseline {t.baseline ?? "—"} /
                milestone {t.milestone ?? "—"}
                {t.milestoneDate ? ` by ${t.milestoneDate}` : ""} / target {t.target ?? "—"}
                {t.targetDate ? ` by ${t.targetDate}` : ""}
                {t.consequenceSeverity && (
                  <Badge variant="outline" className="ml-2 capitalize">
                    {t.consequenceSeverity} severity
                  </Badge>
                )}
              </span>
              <form action={deleteMetricTarget.bind(null, t.id, projectId)}>
                <Button type="submit" size="icon" variant="ghost" aria-label="Delete target" className="h-6 w-6">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </form>
            </div>
          );
        })}
        {targets.length === 0 && <p className="text-sm text-muted">No targets set yet.</p>}
      </div>
    </div>
  );
}
