import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { impactHypotheses, metrics, hypothesisMetricLinks } from "@/db/schema";

type Hypothesis = typeof impactHypotheses.$inferSelect;
type Metric = typeof metrics.$inferSelect;
type HypothesisMetricLink = typeof hypothesisMetricLinks.$inferSelect;

const STATUS_ORDER = ["supported", "testing", "untested", "inconclusive", "refuted"] as const;
const STATUS_VARIANT: Record<string, "muted" | "warning" | "ok" | "danger" | "default"> = {
  untested: "muted",
  testing: "warning",
  supported: "ok",
  refuted: "danger",
  inconclusive: "default",
};

export function HypothesisScorecard({
  projectId,
  hypotheses,
  links,
  metricsList,
}: {
  projectId: number;
  hypotheses: Hypothesis[];
  links: HypothesisMetricLink[];
  metricsList: Metric[];
}) {
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: hypotheses.filter((h) => h.status === status).length,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hypothesis scorecard</CardTitle>
        <CardDescription>
          Rolls up each hypothesis&apos;s linked metrics into a single status.{" "}
          <Link href={`/projects/${projectId}/thesis`} className="underline">
            Edit in Thesis Studio
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex flex-wrap gap-2">
          {counts.map(({ status, count }) => (
            <Badge key={status} variant={STATUS_VARIANT[status]} className="capitalize">
              {count} {status}
            </Badge>
          ))}
        </div>

        {hypotheses.length === 0 && <p className="text-sm text-muted">No hypotheses yet.</p>}

        <div className="flex flex-col gap-2">
          {hypotheses.map((h) => {
            const linkedMetricIds = links.filter((l) => l.hypothesisId === h.id).map((l) => l.metricId);
            const linkedMetrics = metricsList.filter((m) => linkedMetricIds.includes(m.id));
            return (
              <div key={h.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{h.statement}</p>
                  <Badge variant={STATUS_VARIANT[h.status]} className="shrink-0 capitalize">
                    {h.status}
                  </Badge>
                </div>
                {linkedMetrics.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Evidenced by: {linkedMetrics.map((m) => m.name).join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
