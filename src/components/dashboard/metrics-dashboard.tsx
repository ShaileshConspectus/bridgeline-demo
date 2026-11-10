"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteMetricTarget, deleteMetricObservation } from "@/lib/actions";
import { buildPeriodRows, type PeriodRow } from "@/lib/metrics";
import { Trash2, TrendingUp, TrendingDown, MinusCircle, HelpCircle } from "lucide-react";
import type { metrics, metricTargets, metricObservations, metricCapitalProviderTags } from "@/db/schema";

type Metric = typeof metrics.$inferSelect;
type MetricTarget = typeof metricTargets.$inferSelect;
type MetricObservation = typeof metricObservations.$inferSelect;
type CapitalProviderTag = typeof metricCapitalProviderTags.$inferSelect;

const SEVERITY_VARIANT: Record<string, "muted" | "warning" | "danger"> = {
  low: "muted",
  moderate: "warning",
  high: "danger",
};

const SOURCE_LABEL: Record<string, string> = {
  iris_plus: "IRIS+",
  sdg: "SDG",
  bespoke: "Bespoke",
};

const STATUS_DISPLAY: Record<PeriodRow["status"], { label: string; className: string; icon: React.ReactNode }> = {
  on_track: { label: "On track", className: "text-ok", icon: <TrendingUp className="h-4 w-4" /> },
  off_track: { label: "Off track", className: "text-danger", icon: <TrendingDown className="h-4 w-4" /> },
  no_data: { label: "No actual reported", className: "text-muted", icon: <HelpCircle className="h-4 w-4" /> },
  no_comparison: { label: "No baseline/milestone/target set", className: "text-muted", icon: <MinusCircle className="h-4 w-4" /> },
};

export function MetricsDashboard({
  projectId,
  metricsList,
  targets,
  observations,
  tags,
}: {
  projectId: number;
  metricsList: Metric[];
  targets: MetricTarget[];
  observations: MetricObservation[];
  tags: CapitalProviderTag[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Actual vs. target</CardTitle>
          <CardDescription>
            Baseline → milestone → target trajectories per metric, with accepted actuals overlaid. Metrics and
            targets are managed in the{" "}
            <Link href={`/projects/${projectId}/metrics`} className="underline">
              Metrics Library
            </Link>
            ; new results are reported and verified in the{" "}
            <Link href={`/projects/${projectId}/evidence`} className="underline">
              Evidence Hub
            </Link>
            .
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {metricsList.length === 0 && (
          <p className="text-sm text-muted">
            No metrics yet —{" "}
            <Link href={`/projects/${projectId}/metrics`} className="underline">
              add one in the Metrics Library
            </Link>{" "}
            to start tracking actual vs. target.
          </p>
        )}
        {metricsList.map((m) => (
          <MetricCard
            key={m.id}
            metric={m}
            projectId={projectId}
            targets={targets.filter((t) => t.metricId === m.id)}
            observations={observations.filter((o) => o.metricId === m.id)}
            tags={tags.filter((t) => t.metricId === m.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  metric,
  projectId,
  targets,
  observations,
  tags,
}: {
  metric: Metric;
  projectId: number;
  targets: MetricTarget[];
  observations: MetricObservation[];
  tags: CapitalProviderTag[];
}) {
  const acceptedObservations = observations.filter((o) => o.status === "accepted");
  const rows = buildPeriodRows(metric, targets, acceptedObservations);
  const pendingCount = observations.filter((o) => o.status === "pending" || o.status === "needs_follow_up").length;

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {metric.code && <span className="text-muted mr-1">{metric.code}</span>}
            {metric.name}
            {metric.unit && <span className="text-muted font-normal"> ({metric.unit})</span>}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="outline">{SOURCE_LABEL[metric.source]}</Badge>
            {metric.tocLocation && <Badge variant="outline">{metric.tocLocation}</Badge>}
            {tags.map((t) => (
              <Badge key={t.id} variant="muted">
                {t.tag}
              </Badge>
            ))}
            {pendingCount > 0 && (
              <Link href={`/projects/${projectId}/evidence`}>
                <Badge variant="warning">{pendingCount} pending review</Badge>
              </Link>
            )}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No targets or accepted actuals yet.{" "}
          <Link href={`/projects/${projectId}/metrics`} className="underline">
            Set a target
          </Link>{" "}
          or{" "}
          <Link href={`/projects/${projectId}/evidence`} className="underline">
            report a result
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-1.5 pr-4 font-medium">Period</th>
                <th className="py-1.5 pr-4 font-medium">Baseline</th>
                <th className="py-1.5 pr-4 font-medium">Milestone</th>
                <th className="py-1.5 pr-4 font-medium">Target</th>
                <th className="py-1.5 pr-4 font-medium">Actual</th>
                <th className="py-1.5 pr-4 font-medium">Variance</th>
                <th className="py-1.5 pr-4 font-medium">Status</th>
                <th className="py-1.5 pr-4 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = STATUS_DISPLAY[row.status];
                return (
                  <tr key={row.period} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-4 font-medium">{row.period}</td>
                    <td className="py-1.5 pr-4">{row.baseline ?? "—"}</td>
                    <td className="py-1.5 pr-4">{row.milestone ?? "—"}</td>
                    <td className="py-1.5 pr-4">{row.target ?? "—"}</td>
                    <td className="py-1.5 pr-4">
                      {row.actual ?? "—"}
                      {row.actualAggregated && (
                        <span title="Rolled up from more than one jurisdiction, per the metric's aggregation method" className="ml-1 text-muted">
                          Σ
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-4">
                      {row.variancePct != null
                        ? `${row.variancePct > 0 ? "+" : ""}${row.variancePct.toFixed(0)}%`
                        : "—"}
                    </td>
                    <td className={`py-1.5 pr-4 ${status.className}`}>
                      <span className="inline-flex items-center gap-1">
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4">
                      {row.consequenceSeverity ? (
                        <Badge variant={SEVERITY_VARIANT[row.consequenceSeverity]} className="capitalize">
                          {row.consequenceSeverity}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RecordsFootnote projectId={projectId} targets={targets} observations={observations} />
    </div>
  );
}

// Small collapsible list so individual target/observation rows can be
// deleted without cluttering the main trajectory table above.
function RecordsFootnote({
  projectId,
  targets,
  observations,
}: {
  projectId: number;
  targets: MetricTarget[];
  observations: MetricObservation[];
}) {
  const [open, setOpen] = useState(false);
  if (targets.length === 0 && observations.length === 0) return null;

  return (
    <div className="mt-2">
      <button type="button" className="text-xs text-muted underline" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Manage"} individual records
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {targets.map((t) => (
            <div key={`t-${t.id}`} className="flex items-center justify-between rounded-md bg-muted-surface px-2 py-1 text-xs">
              <span>
                Target record · {t.period} · baseline {t.baseline ?? "—"} / milestone {t.milestone ?? "—"} / target{" "}
                {t.target ?? "—"}
              </span>
              <form action={deleteMetricTarget.bind(null, t.id, projectId)}>
                <Button type="submit" size="icon" variant="ghost" aria-label="Delete target record" className="h-6 w-6">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </form>
            </div>
          ))}
          {observations.map((o) => (
            <div key={`o-${o.id}`} className="flex items-center justify-between rounded-md bg-muted-surface px-2 py-1 text-xs">
              <span>
                Actual · {o.period} · {o.actualValue}
                {o.note ? ` — ${o.note}` : ""}
                <Badge
                  variant={o.status === "accepted" ? "ok" : o.status === "rejected" ? "danger" : "warning"}
                  className="ml-2 capitalize"
                >
                  {o.status.replace(/_/g, " ")}
                </Badge>
              </span>
              <form action={deleteMetricObservation.bind(null, o.id, projectId)}>
                <Button type="submit" size="icon" variant="ghost" aria-label="Delete observation" className="h-6 w-6">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
