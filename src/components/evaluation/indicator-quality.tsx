"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateMetricIndicatorPurpose } from "@/lib/actions";
import type { SmartResult } from "@/lib/evaluation";

export type IndicatorRow = {
  id: number;
  name: string;
  code: string | null;
  purpose: "monitoring" | "evaluation" | null;
  smart: SmartResult;
};

export type RungCoverage = {
  rungType: string;
  label: string;
  rungCount: number;
  metricCount: number;
  /** Input and Process rungs are tracked by delivery monitoring, so a missing indicator there is not flagged. */
  expectsIndicator: boolean;
};

const LETTERS: { key: "specific" | "measurable" | "attributable" | "realistic" | "targeted"; letter: string }[] = [
  { key: "specific", letter: "S" },
  { key: "measurable", letter: "M" },
  { key: "attributable", letter: "A" },
  { key: "realistic", letter: "R" },
  { key: "targeted", letter: "T" },
];

export function IndicatorQuality({
  projectId,
  rows,
  coverage,
}: {
  projectId: number;
  rows: IndicatorRow[];
  coverage: RungCoverage[];
}) {
  const [pending, startTransition] = useTransition();
  const gaps = coverage.filter((c) => c.expectsIndicator && c.rungCount > 0 && c.metricCount === 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Indicators across the results chain</CardTitle>
          <CardDescription>
            Indicators should cover the whole chain, not only outcomes. Metrics are counted against the rung their
            hypothesis leads to. Input and Process rungs are normally tracked through delivery monitoring, so they
            are not flagged.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 sm:grid-cols-3">
            {coverage.map((c) => (
              <div key={c.rungType} className="rounded-md border border-border p-2 text-sm">
                <p className="font-medium">{c.label}</p>
                <p className="text-muted">
                  {c.rungCount} rung{c.rungCount === 1 ? "" : "s"} · {c.metricCount} indicator{c.metricCount === 1 ? "" : "s"}
                </p>
                {c.expectsIndicator && c.rungCount > 0 && c.metricCount === 0 && <Badge variant="warning" className="mt-1">No indicator</Badge>}
              </div>
            ))}
          </div>
          {gaps.length > 0 && (
            <p className="mt-3 text-sm text-warning">
              No indicator reaches: {gaps.map((g) => g.label).join(", ")}. Link a metric to a hypothesis ending at that
              rung.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indicator quality (SMART)</CardTitle>
          <CardDescription>
            Specific, Measurable, Attributable, Realistic, Targeted. Mark each indicator as monitoring (tracks
            delivery) or evaluation (supports a causal claim).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          {rows.length === 0 && <p className="text-sm text-muted">No metrics yet. Add some in the Metrics Library.</p>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  {r.code && <p className="text-xs text-muted">{r.code}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1" aria-label={`SMART score ${r.smart.score} of 5`}>
                    {LETTERS.map((l) => (
                      <Badge key={l.key} variant={r.smart[l.key] ? "ok" : "danger"} title={l.key}>
                        {l.letter}
                      </Badge>
                    ))}
                  </div>
                  <select
                    disabled={pending}
                    value={r.purpose ?? ""}
                    onChange={(e) => {
                      const v = e.target.value as "" | "monitoring" | "evaluation";
                      startTransition(async () => {
                        await updateMetricIndicatorPurpose(r.id, projectId, v === "" ? null : v);
                      });
                    }}
                    className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
                    aria-label="Indicator purpose"
                  >
                    <option value="">Unclassified</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="evaluation">Evaluation</option>
                  </select>
                </div>
              </div>
              {r.smart.missing.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-muted">
                  {r.smart.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
