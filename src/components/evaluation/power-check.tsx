"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minimumDetectableEffect, mdeReading } from "@/lib/evaluation";

const selectClass = "h-9 rounded-md border border-border bg-surface px-3 text-sm";

export function PowerCheck() {
  const [nPerArm, setNPerArm] = useState("200");
  const [clusterSize, setClusterSize] = useState("1");
  const [icc, setIcc] = useState("0.05");
  const [alpha, setAlpha] = useState<"0.05" | "0.1">("0.05");
  const [power, setPower] = useState<"0.8" | "0.9">("0.8");
  const [sd, setSd] = useState("");

  const result = useMemo(
    () =>
      minimumDetectableEffect({
        nPerArm: Number(nPerArm),
        clusterSize: Number(clusterSize),
        icc: Number(icc),
        alpha: Number(alpha) as 0.05 | 0.1,
        power: Number(power) as 0.8 | 0.9,
        outcomeSd: sd.trim() === "" ? null : Number(sd),
      }),
    [nPerArm, clusterSize, icc, alpha, power, sd],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Power check</CardTitle>
        <CardDescription>
          How small an effect could your sample detect? Two equal arms, two-sided test. If the minimum detectable
          effect is bigger than any change you could realistically expect, a null result would tell you nothing, so
          do not claim impact from this design.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nPerArm">People per arm</Label>
            <Input id="nPerArm" type="number" min={2} value={nPerArm} onChange={(e) => setNPerArm(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clusterSize">People per cluster (1 = individual)</Label>
            <Input id="clusterSize" type="number" min={1} value={clusterSize} onChange={(e) => setClusterSize(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="icc">Intra-cluster correlation</Label>
            <Input id="icc" type="number" min={0} max={1} step={0.01} value={icc} onChange={(e) => setIcc(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alpha">Significance level</Label>
            <select id="alpha" value={alpha} onChange={(e) => setAlpha(e.target.value as "0.05" | "0.1")} className={selectClass}>
              <option value="0.05">5%</option>
              <option value="0.1">10%</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="power">Power</Label>
            <select id="power" value={power} onChange={(e) => setPower(e.target.value as "0.8" | "0.9")} className={selectClass}>
              <option value="0.8">80%</option>
              <option value="0.9">90%</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sd">Outcome standard deviation (optional)</Label>
            <Input id="sd" type="number" min={0} step="any" value={sd} onChange={(e) => setSd(e.target.value)} placeholder="In outcome units" />
          </div>
        </div>

        {result ? (
          <div className="rounded-md border border-border bg-muted-surface p-3 text-sm">
            <p>
              <span className="font-semibold">Minimum detectable effect: {result.mdeSd.toFixed(2)} standard deviations</span>
              {result.mdeAbsolute !== null && <span> ({result.mdeAbsolute.toFixed(2)} in outcome units)</span>}
            </p>
            <p className="mt-1 text-muted">{mdeReading(result.mdeSd)}</p>
            <p className="mt-2 text-muted">
              Design effect {result.designEffect.toFixed(2)}
              {Number(clusterSize) > 1 && ` · about ${result.clusters} clusters in total`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-danger">Enter at least 2 people per arm, a cluster size of 1 or more, and a correlation between 0 and 1.</p>
        )}
      </CardContent>
    </Card>
  );
}
