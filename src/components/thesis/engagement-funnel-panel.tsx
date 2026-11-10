"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ensureEngagementFunnelStages, updateEngagementFunnelStageThreshold } from "@/lib/actions";
import type { engagementFunnelStages } from "@/db/schema";

type EngagementStage = typeof engagementFunnelStages.$inferSelect;

const STAGE_LABEL: Record<string, string> = {
  reach: "Reach",
  active_uptake: "Active Uptake",
  meaningful_uptake: "Meaningful Uptake",
  outcome: "Outcome",
};
const STAGE_ORDER = ["reach", "active_uptake", "meaningful_uptake", "outcome"];

// Spec: for programs whose intervention *is* a software tool or
// platform, depth of engagement is tracked on a separate fixed funnel
// (Reach -> Active Uptake -> Meaningful Uptake -> Outcome), each stage
// with a project-defined "active"/"meaningful" threshold. Opt-in per
// project (project.engagementFunnelEnabled) — this panel only renders
// when that lens is on.
export function EngagementFunnelPanel({
  projectId,
  thesisId,
  stages,
}: {
  projectId: number;
  thesisId: number;
  stages: EngagementStage[];
}) {
  const sorted = [...stages].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement funnel</CardTitle>
        <CardDescription>
          This project is a digital tool/platform intervention, so depth of engagement is tracked on its own
          funnel, separate from the impact Theory of Change. Define what &quot;active&quot; and
          &quot;meaningful&quot; mean for this specific tool — a hypothesis can then reference a stage here
          alongside its impact rung.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {sorted.length === 0 ? (
          <form action={ensureEngagementFunnelStages.bind(null, thesisId, projectId)}>
            <Button type="submit" size="sm" variant="outline">
              Set up funnel
            </Button>
          </form>
        ) : (
          sorted.map((s) => <StageRow key={s.id} stage={s} projectId={projectId} />)
        )}
      </CardContent>
    </Card>
  );
}

function StageRow({ stage, projectId }: { stage: EngagementStage; projectId: number }) {
  const [value, setValue] = useState(stage.thresholdDefinition ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm font-medium">{STAGE_LABEL[stage.stage] ?? stage.stage}</p>
      <form
        action={async (formData) => {
          await updateEngagementFunnelStageThreshold(stage.id, projectId, formData);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
        className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start"
      >
        <Textarea
          name="thresholdDefinition"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          placeholder={`What counts as "${STAGE_LABEL[stage.stage]}" for this tool?`}
          className="flex-1"
        />
        <Button type="submit" size="sm" variant="outline">
          {saved ? "Saved" : "Save"}
        </Button>
      </form>
    </div>
  );
}
