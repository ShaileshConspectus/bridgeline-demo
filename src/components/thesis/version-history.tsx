import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { climateTheses } from "@/db/schema";

type Thesis = typeof climateTheses.$inferSelect;

export function VersionHistory({ history }: { history: Thesis[] }) {
  if (history.length <= 1) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version history</CardTitle>
        <CardDescription>Every revision is kept — nothing is overwritten.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {history.map((t) => (
          <div key={t.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Version {t.version}</span>
                {t.isCurrent && <Badge variant="ok">Current</Badge>}
                <span className="text-xs text-muted">{t.createdAt}</span>
              </div>
              {t.changeNote && <p className="text-sm text-muted">{t.changeNote}</p>}
              <p className="text-sm">{t.statement}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
