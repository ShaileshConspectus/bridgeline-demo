import type { metrics, metricTargets, metricObservations, jurisdictionBaselines } from "@/db/schema";

type Metric = typeof metrics.$inferSelect;
type MetricTarget = typeof metricTargets.$inferSelect;
type MetricObservation = typeof metricObservations.$inferSelect;
type JurisdictionBaseline = typeof jurisdictionBaselines.$inferSelect;

export type PeriodRow = {
  period: string;
  baseline: number | null;
  milestone: number | null;
  target: number | null;
  actual: number | null;
  actualAggregated: boolean;
  comparisonLabel: "milestone" | "target" | "baseline" | null;
  comparisonValue: number | null;
  comparisonAggregated: boolean;
  varianceAbs: number | null;
  variancePct: number | null;
  status: "on_track" | "off_track" | "no_data" | "no_comparison";
  consequenceSeverity: "low" | "moderate" | "high" | null;
};

// Both metric_targets and metric_observations can be jurisdiction-scoped
// (Section 8's Jurisdiction entity) — more than one row can legitimately
// exist for the same metric + period, one per Deep Dive City. Picking an
// arbitrary one with .find() would silently drop the others. Instead,
// roll multiple jurisdiction-scoped rows up using the metric's
// aggregation_method (sum | weighted_average | custom), the same rule
// computeAggregatedBaseline already applies to jurisdiction baselines —
// national/regional figures must always be a computed roll-up, never a
// second value entered (or accidentally picked) by hand (spec Section 8).
function resolvePeriodValue<T extends { jurisdictionId: number | null }>(
  metric: Metric,
  rowsForPeriod: T[],
  getValue: (row: T) => number | null,
): { value: number | null; aggregated: boolean } {
  const projectLevel = rowsForPeriod.find((r) => r.jurisdictionId == null && getValue(r) != null) ?? null;
  const jurisdictionRows = rowsForPeriod.filter((r) => r.jurisdictionId != null && getValue(r) != null);

  // A single reported figure (whichever scope) — no aggregation needed.
  if (jurisdictionRows.length === 0) {
    return { value: projectLevel ? getValue(projectLevel) : null, aggregated: false };
  }
  if (jurisdictionRows.length === 1 && !projectLevel) {
    return { value: getValue(jurisdictionRows[0]), aggregated: false };
  }

  // More than one jurisdiction-scoped row for this period (regardless of
  // whether a project-level row also exists) — compute the roll-up
  // rather than arbitrarily picking one.
  const values = jurisdictionRows.map(getValue).filter((v): v is number => v != null);
  if (values.length === 0) {
    return { value: projectLevel ? getValue(projectLevel) : null, aggregated: false };
  }
  if (metric.aggregationMethod === "sum") {
    return { value: values.reduce((a, b) => a + b, 0), aggregated: true };
  }
  if (metric.aggregationMethod === "weighted_average") {
    return { value: values.reduce((a, b) => a + b, 0) / values.length, aggregated: true };
  }
  // Custom aggregation: no automatic figure — surfaced as "needs manual
  // reconciliation" rather than guessing.
  return { value: null, aggregated: true };
}

// Actual vs. target math (spec Module 4, "Actual vs. target dashboard"):
// for each metric x period, compare the actual against whichever
// trajectory point applies (milestone takes precedence over target over
// baseline, since a milestone is the nearer-term checkpoint), respecting
// the metric's direction of good.
export function buildPeriodRows(
  metric: Metric,
  targetsForMetric: MetricTarget[],
  observationsForMetric: MetricObservation[],
): PeriodRow[] {
  const periods = Array.from(
    new Set([...targetsForMetric.map((t) => t.period), ...observationsForMetric.map((o) => o.period)]),
  ).sort();

  const higherIsBetter = metric.directionOfGood !== "lower_is_better";

  return periods.map((period) => {
    const targetsThisPeriod = targetsForMetric.filter((t) => t.period === period);
    const observationsThisPeriod = observationsForMetric.filter((o) => o.period === period);

    const baselineResolved = resolvePeriodValue(metric, targetsThisPeriod, (t) => t.baseline);
    const milestoneResolved = resolvePeriodValue(metric, targetsThisPeriod, (t) => t.milestone);
    const targetResolved = resolvePeriodValue(metric, targetsThisPeriod, (t) => t.target);
    const actualResolved = resolvePeriodValue(metric, observationsThisPeriod, (o) => o.actualValue);

    // Consequence severity is a manual per-metric-target-pair tag, not a
    // number to aggregate — take it from whichever target row set it.
    const consequenceSeverity = targetsThisPeriod.find((t) => t.consequenceSeverity != null)?.consequenceSeverity ?? null;

    const comparisonLabel: PeriodRow["comparisonLabel"] =
      milestoneResolved.value != null ? "milestone" : targetResolved.value != null ? "target" : baselineResolved.value != null ? "baseline" : null;
    const comparisonValue =
      comparisonLabel === "milestone" ? milestoneResolved.value : comparisonLabel === "target" ? targetResolved.value : comparisonLabel === "baseline" ? baselineResolved.value : null;
    const comparisonAggregated =
      comparisonLabel === "milestone" ? milestoneResolved.aggregated : comparisonLabel === "target" ? targetResolved.aggregated : comparisonLabel === "baseline" ? baselineResolved.aggregated : false;

    const actual = actualResolved.value;

    let varianceAbs: number | null = null;
    let variancePct: number | null = null;
    let status: PeriodRow["status"] = "no_data";

    if (actual == null) {
      status = "no_data";
    } else if (comparisonValue == null) {
      status = "no_comparison";
    } else {
      varianceAbs = actual - comparisonValue;
      variancePct = comparisonValue !== 0 ? (varianceAbs / Math.abs(comparisonValue)) * 100 : null;
      const onTrack = higherIsBetter ? actual >= comparisonValue : actual <= comparisonValue;
      status = onTrack ? "on_track" : "off_track";
    }

    return {
      period,
      baseline: baselineResolved.value,
      milestone: milestoneResolved.value,
      target: targetResolved.value,
      actual,
      actualAggregated: actualResolved.aggregated,
      comparisonLabel,
      comparisonValue,
      comparisonAggregated,
      varianceAbs,
      variancePct,
      status,
      consequenceSeverity,
    };
  });
}

export function latestRow(rows: PeriodRow[]): PeriodRow | null {
  // Prefer the most recent period that actually has an actual value;
  // fall back to the most recent period overall.
  const withData = [...rows].reverse().find((r) => r.actual != null);
  return withData ?? rows[rows.length - 1] ?? null;
}

// Subnational -> national/regional rollup (spec Module 2, Jurisdiction
// entity): national figures are always computed, never a second value
// entered by hand. `sum` is exact for count-type metrics; `weighted_average`
// is approximated here as a plain average, since this prototype doesn't
// model jurisdiction population/weight — flagged in the label so it's
// never mistaken for a rigorous weighted figure.
export function computeAggregatedBaseline(
  metric: Metric,
  baselinesForMetric: JurisdictionBaseline[],
): { value: number | null; label: string } {
  if (baselinesForMetric.length === 0) return { value: null, label: "No subnational baselines recorded" };

  const values = baselinesForMetric.map((b) => b.baselineValue);

  if (metric.aggregationMethod === "sum") {
    return { value: values.reduce((a, b) => a + b, 0), label: `Sum across ${values.length} jurisdiction(s)` };
  }
  if (metric.aggregationMethod === "weighted_average") {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { value: avg, label: `Average across ${values.length} jurisdiction(s) — weights not modeled in this prototype` };
  }
  return { value: null, label: "Custom aggregation — compute manually" };
}
