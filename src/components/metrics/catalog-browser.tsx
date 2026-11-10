"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  IRIS_PLUS_CATALOG,
  SDG_CATALOG,
  type IrisPlusCatalogEntry,
  type SdgCatalogEntry,
  type CatalogSectorTag,
} from "@/lib/catalog";
import { attachCatalogMetric } from "@/lib/actions";

// Split a search-filtered list into [suggested, rest] based on whether the
// entry's sectorTags include the project's sector (or "cross_cutting",
// which is relevant everywhere) — a ranking hint only, never a filter, so
// nothing here shrinks which entries are attachable.
function splitBySector<T extends { sectorTags: CatalogSectorTag[] }>(
  entries: T[],
  projectSector: string | null,
): { suggested: T[]; rest: T[] } {
  if (!projectSector) return { suggested: [], rest: entries };
  const suggested: T[] = [];
  const rest: T[] = [];
  for (const entry of entries) {
    if (entry.sectorTags.includes(projectSector as CatalogSectorTag) || entry.sectorTags.includes("cross_cutting")) {
      suggested.push(entry);
    } else {
      rest.push(entry);
    }
  }
  return { suggested, rest };
}

export function CatalogBrowser({
  projectId,
  projectSector = null,
}: {
  projectId: number;
  projectSector?: string | null;
}) {
  const [query, setQuery] = useState("");

  const filteredIris = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return IRIS_PLUS_CATALOG;
    return IRIS_PLUS_CATALOG.filter(
      (e) => e.name.toLowerCase().includes(q) || e.theme.toLowerCase().includes(q) || e.sourceCode.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredSdg = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SDG_CATALOG;
    return SDG_CATALOG.filter(
      (e) => e.indicator.toLowerCase().includes(q) || e.goal.toLowerCase().includes(q) || e.sourceCode.toLowerCase().includes(q),
    );
  }, [query]);

  const { suggested: suggestedIris, rest: restIris } = useMemo(
    () => splitBySector(filteredIris, projectSector),
    [filteredIris, projectSector],
  );
  const { suggested: suggestedSdg, rest: restSdg } = useMemo(
    () => splitBySector(filteredSdg, projectSector),
    [filteredSdg, projectSector],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog browser</CardTitle>
        <CardDescription>
          Search &amp; attach from a bundled, illustrative subset of IRIS+ and SDG indicators — not the full
          catalog (see the note in <code>src/lib/catalog.ts</code> on why). Attaching pulls the standard&apos;s
          metadata into your project&apos;s metrics plan.
          {projectSector && (
            <>
              {" "}Entries tagged for this project&apos;s sector (<code>{projectSector}</code>) are listed first
              under &quot;Suggested for this project&quot; — everything else is still one scroll away and just as
              attachable.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <Input
          placeholder="Search by name, theme, goal, or code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-muted uppercase tracking-wide">IRIS+ ({filteredIris.length})</p>
          {projectSector && suggestedIris.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold text-accent uppercase tracking-wide">
                Suggested for this project
              </p>
              <div className="flex flex-col gap-2">
                {suggestedIris.map((entry) => (
                  <IrisEntryRow key={entry.sourceCode} entry={entry} projectId={projectId} />
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {(projectSector ? restIris : filteredIris).map((entry) => (
              <IrisEntryRow key={entry.sourceCode} entry={entry} projectId={projectId} />
            ))}
            {filteredIris.length === 0 && <p className="text-sm text-muted">No matches.</p>}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-muted uppercase tracking-wide">SDG ({filteredSdg.length})</p>
          {projectSector && suggestedSdg.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold text-accent uppercase tracking-wide">
                Suggested for this project
              </p>
              <div className="flex flex-col gap-2">
                {suggestedSdg.map((entry) => (
                  <SdgEntryRow key={entry.sourceCode} entry={entry} projectId={projectId} />
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {(projectSector ? restSdg : filteredSdg).map((entry) => (
              <SdgEntryRow key={entry.sourceCode} entry={entry} projectId={projectId} />
            ))}
            {filteredSdg.length === 0 && <p className="text-sm text-muted">No matches.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttachFields() {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tocLocation">ToC location (optional)</Label>
        <Input id="tocLocation" name="tocLocation" placeholder="e.g. Output" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="justification">Why this metric, for this project? (optional)</Label>
        <Textarea id="justification" name="justification" rows={2} />
      </div>
    </>
  );
}

function IrisEntryRow({ entry, projectId }: { entry: IrisPlusCatalogEntry; projectId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">
          <span className="text-muted mr-1">{entry.sourceCode}</span>
          {entry.name}
        </p>
        <p className="text-sm text-muted">{entry.definition}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline">{entry.theme}</Badge>
          <Badge variant="muted">{entry.unit}</Badge>
          {entry.mappedSdgTargets.map((t) => (
            <Badge key={t} variant="muted">
              SDG {t}
            </Badge>
          ))}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            Attach
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach {entry.name}</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              await attachCatalogMetric(projectId, formData);
              setOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="source" value="iris_plus" />
            <input type="hidden" name="sourceCode" value={entry.sourceCode} />
            <AttachFields />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Attach to project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SdgEntryRow({ entry, projectId }: { entry: SdgCatalogEntry; projectId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">
          <span className="text-muted mr-1">{entry.sourceCode}</span>
          {entry.indicator}
        </p>
        <p className="text-sm text-muted">
          {entry.goal} · {entry.target}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline">Tier {entry.tier}</Badge>
          <Badge variant="muted">{entry.unit}</Badge>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            Attach
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach {entry.indicator}</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              await attachCatalogMetric(projectId, formData);
              setOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="source" value="sdg" />
            <input type="hidden" name="sourceCode" value={entry.sourceCode} />
            <AttachFields />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Attach to project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
