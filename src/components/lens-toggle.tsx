"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleProjectLens } from "@/lib/actions";

export function LensToggle({
  projectId,
  lens,
  initialValue,
}: {
  projectId: number;
  lens: "engagementFunnelEnabled" | "commercialValueChainEnabled";
  initialValue: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={initialValue}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleProjectLens(projectId, lens, checked);
        });
      }}
    />
  );
}
