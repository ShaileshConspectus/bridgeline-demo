import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { metrics, metricCapitalProviderTags } from "@/db/schema";

type Metric = typeof metrics.$inferSelect;
type CapitalProviderTag = typeof metricCapitalProviderTags.$inferSelect;

// Capital provider overlap view (spec Module 2, workflow 4 / UI surface)
// — a table grouped by tag stands in for the spec's Venn-style diagram;
// metrics tagged by more than one capital provider are the interesting
// case (they serve multiple reporting relationships at once) and are
// called out explicitly.
export function CapitalProviderOverlap({ metricsList, tags }: { metricsList: Metric[]; tags: CapitalProviderTag[] }) {
  const tagNames = Array.from(new Set(tags.map((t) => t.tag))).sort();
  const metricTagCount = new Map<number, number>();
  for (const t of tags) {
    metricTagCount.set(t.metricId, (metricTagCount.get(t.metricId) ?? 0) + 1);
  }
  const sharedMetrics = metricsList.filter((m) => (metricTagCount.get(m.id) ?? 0) > 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital provider overlap</CardTitle>
        <CardDescription>
          Which capital providers require or recognize each metric — useful for seeing which indicators serve
          more than one reporting relationship at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {tagNames.length === 0 ? (
          <p className="text-sm text-muted">No capital provider tags yet — add some from a metric&apos;s detail panel.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {tagNames.map((tagName) => {
                const metricIds = tags.filter((t) => t.tag === tagName).map((t) => t.metricId);
                const taggedMetrics = metricsList.filter((m) => metricIds.includes(m.id));
                return (
                  <div key={tagName}>
                    <p className="text-sm font-medium">{tagName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {taggedMetrics.map((m) => (
                        <Badge key={m.id} variant="outline">
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {sharedMetrics.length > 0 && (
              <div className="rounded-md bg-ok/10 p-3 text-sm">
                <p className="font-medium">Serving multiple capital providers at once:</p>
                <ul className="mt-1 list-disc pl-5">
                  {sharedMetrics.map((m) => (
                    <li key={m.id}>{m.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
