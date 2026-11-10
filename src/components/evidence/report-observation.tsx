"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addMetricObservation, importObservationsCsv } from "@/lib/actions";
import type { metrics, jurisdictions } from "@/db/schema";

type Metric = typeof metrics.$inferSelect;
type Jurisdiction = typeof jurisdictions.$inferSelect;

export function ReportObservation({
  projectId,
  metricsList,
  jurisdictionsList,
}: {
  projectId: number;
  metricsList: Metric[];
  jurisdictionsList: Jurisdiction[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <DirectEntryForm projectId={projectId} metricsList={metricsList} jurisdictionsList={jurisdictionsList} />
      <CsvImportForm projectId={projectId} />
    </div>
  );
}

function DirectEntryForm({
  projectId,
  metricsList,
  jurisdictionsList,
}: {
  projectId: number;
  metricsList: Metric[];
  jurisdictionsList: Jurisdiction[];
}) {
  const [metricId, setMetricId] = useState<string>("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a result</CardTitle>
        <CardDescription>
          Runs through the same rules-based quality checks and verification pipeline every time — pre-filled
          with the metric&apos;s unit and definition once selected. Anything flagged goes to the Review Queue
          instead of being silently accepted or rejected.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form
          action={async (formData) => {
            const id = Number(formData.get("metricId"));
            await addMetricObservation(id, projectId, formData);
            setSubmitted("Recorded — check the Review Queue if it needed a closer look.");
            setMetricId("");
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="metricId">Metric</Label>
            <select
              id="metricId"
              name="metricId"
              required
              value={metricId}
              onChange={(e) => setMetricId(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
            >
              <option value="">Select a metric…</option>
              {metricsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code ? `${m.code} — ` : ""}
                  {m.name}
                  {m.unit ? ` (${m.unit})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period">Period</Label>
              <Input id="period" name="period" required placeholder="e.g. 2024" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actualValue">Actual value</Label>
              <Input id="actualValue" name="actualValue" type="number" step="any" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="submittedBy">Submitted by (optional)</Label>
              <Input id="submittedBy" name="submittedBy" placeholder="e.g. Deep Dive City lead, Bogotá" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" placeholder="Context for this figure" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evidenceText">Evidence (optional)</Label>
            <Textarea
              id="evidenceText"
              name="evidenceText"
              rows={2}
              placeholder="Paste supporting text — a report excerpt, survey export summary, etc. Checked against the reported value for consistency."
            />
          </div>

          <div>
            <Button type="submit">Report result</Button>
          </div>
          {submitted && <p className="text-sm text-ok">{submitted}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function CsvImportForm({ projectId }: { projectId: number }) {
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from CSV</CardTitle>
        <CardDescription>
          Portfolio data integration (spec workflow 3) — CSV import ships in the prototype; live connectors
          (DevResults, Salesforce, Power BI, Asana) are a Phase 2 item. Columns: <code>metric_code</code>,{" "}
          <code>period</code>, <code>value</code>, plus optional <code>jurisdiction</code> and{" "}
          <code>note</code>. Match <code>metric_code</code> to a metric&apos;s code in the Metrics Library.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form
          action={async (formData) => {
            setPending(true);
            const res = await importObservationsCsv(projectId, formData);
            setResult(res);
            setPending(false);
          }}
          className="flex flex-col gap-3"
        >
          <Input type="file" name="csvFile" accept=".csv,text/csv" required />
          <div>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Importing…" : "Import"}
            </Button>
          </div>
        </form>
        {result && (
          <div className="mt-3 text-sm">
            <p>
              Imported {result.imported} row{result.imported === 1 ? "" : "s"}.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-danger">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
