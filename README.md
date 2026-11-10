# Bridgeline — Phase 1a/1b/1c/1d prototype (+ Learning Agenda, second-pass audit fixes)

A local, single-user prototype of **Bridgeline**, the MEL tool built for Conspectus Advisors:
software that helps non-profits, impact investors, and philanthropies translate a climate thesis
into testable hypotheses and a multi-year results ladder, assemble a real measurement plan against
it, collect and verify actual results, and track performance over time. The name and the app's
navy/teal visual theme are drawn from Conspectus Advisors' own branding (see "UI theme" below).
This build covers **Phase 1a — Thesis Studio**, **Phase 1b — Dashboard & Results Reports**,
**Phase 1c — Metrics Library**, and **Phase 1d — Evidence Hub**. All four of the spec's Phase 1
sub-phases are now in place — see "What's next" below for what's deliberately still deferred.

## UI theme

The app's palette is sampled from the Conspectus Advisors two-pager: deep navy `#1B2B4C` for the
letterhead and section bands, a steel-teal `#2F7E8B` (the color used for the two-pager's stat
callouts) for links and accents, and a pale blue-gray `#ECF2FB` for tinted card surfaces — all
defined as CSS custom properties in `src/app/globals.css`, so the rest of the UI (buttons, badges,
card borders, focus rings) inherits them automatically. The app name is set in two constants at
the top of `src/app/layout.tsx` (`APP_NAME`, `APP_TAGLINE`) if it ever needs to change again.

## For-profit / commercial track test case

The tool now has a second seeded project, **ARARA — Amazon Regeneration Financing Platform**,
built from a real investment brief and pitch deck (arara.earth). Where TUMI exercises the
non-profit/grant track, ARARA exercises the for-profit/commercial track — the two projects live
side by side under the same prototype org and are meant to be compared:

- **Both parallel lenses on** (TUMI has both off): ARARA's app is a digital-platform
  intervention, so the **Engagement Funnel** lens is on; ARARA Inc is a for-profit venture, so the
  **Commercial Value Chain** lens is on. Building this test case surfaced that these two lenses
  had schema tables but no UI or Server Actions to actually manage them — that gap is now closed
  (see "Engagement Funnel & Commercial Value Chain" below).
- **Two Funding Instruments on one project**: a live EUR 700,000 equity bridge round and a
  planned Layer B green bond (debt), so both the Investor/Board Update and the Loan Covenant
  Compliance report exercise real, non-empty data for the same venture.
- **A metric requiring elevated verification tied to bond eligibility** ("Hectares with completed
  verification cycle") — deliberately left ungated in the seed (no current certification linked),
  so the Review Queue's compliance block from the previous audit fix is directly demonstrable
  rather than already satisfied.
- **A two-origination-channel jurisdiction split** (smallholder restoration vs. territorial
  protection, per the brief's own framing) with the same metric reported for both jurisdictions in
  the same quarter — exercises the multi-jurisdiction rollup fix from the previous audit pass.
- **A hypothesis linked to both a Commercial Value Chain milestone and an Engagement Funnel
  stage** alongside its impact rung, demonstrating the "path to revenue"/"path to adoption" and
  "path to impact" side-by-side pattern the spec calls for (Decision 8).

### Engagement Funnel & Commercial Value Chain (newly built)

These two parallel lenses were togglable in Project Settings since Phase 1a, and their tables
existed in the schema, but nothing let a user actually manage them — turning a lens on did
nothing. Built out for real:

- **Engagement Funnel**: a fixed 4-stage funnel (Reach → Active Uptake → Meaningful Uptake →
  Outcome, per spec) with an editable per-project threshold definition for each stage. "Set up
  funnel" creates the four stages once; each stage's definition is edited inline.
- **Commercial Value Chain**: a free-form, ordered list of commercial milestones (e.g. "Shop Unit
  Proven," "Series A & Layer B Unlocked") — add, edit, and delete, matching the pattern already
  used for Theory of Change rungs.
- Both panels render in Thesis Studio, conditionally, only when their project-level toggle is on.
- A hypothesis can now optionally reference a stage from either lens, alongside its impact rung
  (`fromRungId`/`toRungId`) — shown as badges on the hypothesis list. This is additive: the impact
  causal chain is never merged with either parallel lens, matching the spec's explicit intent that
  a revenue or adoption milestone is never treated as evidence of climate impact.

## Post-delivery audit fixes

A second AI review of this build against the spec surfaced four issues; all were checked against
the actual code and spec text before changing anything (one of the four turned out to already be
correct as built — see below), and three real gaps were fixed:

1. **Elevated verification gate now enforced, not just flagged** (real bug — spec Section 6/9.3
   explicitly requires this). Previously a reviewer could click "Accept" on an observation for a
   `requires_elevated_verification` metric even with no current certification linked — the check
   existed but was advisory only. `decideObservation` now blocks the accept action outright until
   a current Certification/Audit Record exists.
2. **Multi-jurisdiction rollup bug in the dashboard/reports** (real bug, though not quite as
   described in the audit — see below). `buildPeriodRows` used `.find()` to pick a target/actual
   for a given period, so when more than one jurisdiction reported for the same period, all but
   one silently vanished instead of rolling up. Fixed to aggregate via the metric's
   `aggregation_method` (sum or weighted average), matching how jurisdiction baselines already
   worked.
3. **Survey fatigue guardrail** — genuinely missing (a real spec workflow, Module 3 workflow 4,
   not yet built in any prior phase). Added as a new automated quality check.
4. **Report template gap** — Investor/Board Update and Loan Covenant Compliance were real gaps
   (previously flagged in this README as a known Phase 2 item, not a regression). Both are now
   built, alongside a `/reports` template picker.

Two of the audit's other claims didn't hold up against the code and were left as-is: the
"hardcoded seed dependency" claim was inaccurate — every mutation already calls `revalidatePath`
on the dashboard and report routes, so a newly-added metric hydrates them immediately without a
reseed; and the specific rollup complaint ("rate metrics sum instead of averaging, producing
totals over 100%") doesn't reproduce — `aggregationMethod: "weighted_average"` already averages
rather than sums. The real rollup bug (#2 above) was a different, more subtle issue in the same
area. Per-instrument Learning Agenda review cadence remains not-yet-built, as previously
documented — it's a real gap, but a full future phase rather than a bug in what exists today.

## Second-pass audit fixes (v6 → v7)

A third-party test report run against the v6 as-built spec found 2 real workflow breakages and
flagged a documented gap. As with the previous audit, each claim was checked against the code
before anything changed — one claim ("dynamic report lens toggle") didn't match how the code
actually works and was fixed differently from how it was described (see below).

1. **Hypothesis-to-parallel-stage links can now be edited after creation** (real regression —
   spec Section 3.3/12 explicitly names this as the known limitation). Previously
   `linked_engagement_stage_id`/`linked_commercial_stage_id` could only be set on the "Add
   hypothesis" dialog; changing a project's commercial milestones or engagement thresholds meant
   deleting and recreating hypotheses to re-point the link, which also deleted their assumptions
   and metric links. A new edit action (pencil icon on each hypothesis row, `updateHypothesisStageLinks`)
   lets either link be changed or cleared in place, with no effect on the hypothesis's rung
   linkage, assumptions, or metric links.
2. **Learning Agenda — built.** Previously deferred by design (v6 Section 6.3: intentionally held
   back until Evidence Hub existed and there had been a real reporting/review cycle to structure
   items against — both reference projects now have that). A `LearningAgendaItem` object, a new
   `/projects/[projectId]/learning` board tiered by priority (High/Moderate/Low), and a status
   lifecycle (open → in progress → resolved, with a resolution note captured on resolve) are now
   built. An item can optionally link to a hypothesis, a metric, or the Funding Instrument whose
   review cadence it should be resolved by.
3. **Report rollup lens — the actual issue was a table the narrative text described but didn't
   enforce, not a broken toggle.** The audit's specific claim (a `lens-toggle.tsx` component
   driving dynamic Full Detail vs. Outcome+Impact-only rendering on the report pages) doesn't
   match the code: `lens-toggle.tsx` is the Engagement Funnel/Commercial Value Chain project
   settings switch, unrelated to reports, and neither report page reads it. What *was* real: the
   Grant/Funding Narrative page's Theory of Change section already correctly filtered to
   Outcome/Impact rungs, but the "Indicator progress" metrics table right below it listed every
   metric on the project regardless of rung, contradicting the "rollup lens" framing in the same
   report. Fixed by filtering that table to metrics linked (via `hypothesisMetricLinks`) to a
   hypothesis that reaches an Outcome or Impact rung — metrics that only evidence earlier-rung
   hypotheses, or carry no hypothesis link at all, now stay off the donor-facing narrative and
   remain visible only on the Dashboard's full detail. The Investor/Board Update template was
   already correct (full detail is its documented default) and needed no change.

All three fixes were verified directly against the seeded database (stage-link clear/restore,
Learning Agenda item creation and resolve-with-note, and the Grant Narrative's indicator table
before/after on both TUMI — unaffected, all three metrics already reach Outcome/Impact — and
ARARA, where 3 of 6 metrics now correctly surface and 3 correctly drop out).

## What's in this build

### Phase 1a — Thesis Studio

- **Thesis intake & versioning** — write a climate thesis (problem, target population,
  geography, expected change, time horizon); every revision is kept as a new version, never
  overwritten.
- **Theory of Change**, togglable between two linked views:
  - **Causal chain**: Input → Process → Output → Intermediate Outcome → Outcome → Impact,
    with each rung fully editable (not just add/delete)
  - **Objective / Output / Activity**: the capital-provider-facing tree, optionally cross-linked
    to causal-chain rungs
- **Impact hypotheses** — falsifiable "IF … THEN …" statements linking rungs, each with a
  status (untested / testing / supported / refuted / inconclusive) and an assumptions & risks
  register
- **AI-assisted decomposition** — an optional "Draft with AI" pass that proposes candidate rungs
  and hypotheses from the thesis text. It's drafting only (not verification): every suggestion
  is a checkbox the user accepts or discards before anything saves. Degrades gracefully with a
  plain explanation if no API key is configured — the manual forms work identically either way.
- **Project settings** — two lenses (Engagement Funnel, Commercial Value Chain), both off by
  default per the resolved design decision, plus a read-only view of the project's funding
  instruments (grant / debt / equity / blended / self-funded — capital-structure-agnostic).

### Phase 1c — Metrics Library

- **Catalog browser** — search and attach from a small, hand-curated (not the full — see
  licensing note in `src/lib/catalog.ts`) IRIS+ and SDG indicator set; attaching pulls the
  standard's metadata (unit, direction of good, definition) into the project, and IRIS+ entries
  show their cross-mapped SDG target.
- **Bespoke SMART metric builder** — structured form (definition/method, calculation, frequency,
  disaggregation, justification) plus a "check for duplicates" search against the project's
  existing metrics before you create a new one.
- **Jurisdictions** — subnational entries (the level data actually gets collected at) that can
  roll up to a national/regional parent; each metric picks how it aggregates (sum for counts,
  averaged for rates — flagged as unweighted in this prototype since it doesn't model population
  weights).
- **Jurisdiction baselines** — per-metric, per-jurisdiction baseline values with source, date,
  and confidence, plus a computed national/regional roll-up shown alongside them.
- **Milestone/target trajectories** — the three-point baseline → milestone → target structure,
  each with dates, a rationale, an optional jurisdiction scope, and a manually-set consequence
  severity.
- **Capital provider tagging & overlap view** — tag a metric with the capital providers that
  require or recognize it, and see which metrics serve more than one funding relationship at
  once.
- **Elevated verification flag** — manually set per metric; Evidence Hub (1d) will check it
  against a current Certification/Audit Record once that module exists.

### Phase 1b — Dashboard & Results Reports

- **Actual vs. target dashboard** — report actuals against the targets set in the Metrics
  Library, with variance (absolute + %), on-track/off-track status (respecting direction of
  good), and consequence severity all visible per period.
- **Hypothesis scorecard** — every hypothesis's status rolled up with the metrics evidencing it,
  plus an at-a-glance count by status.
- **Grant/Funding Narrative Report** — a donor-style report assembled from the current thesis,
  Outcome/Impact-only rollup of the Theory of Change, indicator progress, and hypothesis status;
  printable / saveable as PDF via the browser's print dialog. (First of the spec's three report
  templates — Investor Board Update and Loan Covenant Compliance come later.)

Metric creation and target-setting now live in the Metrics Library (Module 2's job, per the
spec); the Dashboard's role is reporting actuals and showing the resulting variance (Module 4's
job) — the module boundary the spec describes, now reflected in the UI.

### Phase 1d — Evidence Hub

- **Report a result** — direct-entry form (metric, period, actual value, optional jurisdiction,
  submitted-by, note, and free-text evidence) that runs every submission through the same
  rules-based quality-check pipeline before it's accepted.
- **CSV import** — bulk-report actuals via `metric_code, period, value` (plus optional
  `jurisdiction`, `note`) columns, matched against the project's Metrics Library codes; a stand-in
  for the spec's portfolio-tool connectors (DevResults, Salesforce, Power BI, Asana), which are a
  Phase 2 item.
- **Rules-based verification pipeline** (`src/lib/verification.ts`) — a standalone, swappable
  pure function matching the spec's `VerificationProvider` shape (Section 9.3), so a real LLM/ML
  verifier can later replace it without touching the review queue or calling code. Runs
  completeness, duplicate, range (3x historical span), consistency (>2x/<0.5x vs. prior period),
  evidence-text cross-check, and — for metrics flagged `requiresElevatedVerification` — a check
  that a current Certification/Audit Record is on file. Every check produces a confidence score
  and rationale; the pipeline never auto-rejects, and only auto-accepts when every check passes.
- **Review queue** — every flagged observation, with each check's pass/fail and detail shown
  alongside the submitted note and evidence text, so a person makes the final accept /
  needs-follow-up / reject call with reviewer notes captured.
- **Use case log** — qualitative evidence staged through a 6-stage funnel (Interest → Use →
  Result → Outcome → Top Outcome → Testimonial), optionally linked to an impact hypothesis.
  Moving a case to Outcome or Top Outcome automatically flips it to "follow-up in progress"
  unless it's already been formally verified — it never silently counts as verified just by
  reaching a late stage.
- **Certification / audit register** — third-party audits, certifications, credit issuances, and
  engineering sign-offs, each optionally linked to a metric, with a renewal status (current / due
  soon within 60 days / expired / no expiry) computed from the expiry date rather than stored.
- **Module boundary enforced end to end**: the Evidence Hub is now the only place observations get
  created or verified; the Dashboard and Grant/Funding Narrative Report only ever show
  `status === "accepted"` observations, so a flagged or rejected figure can't leak into a
  donor-facing report before a person has signed off on it.
- **Elevated verification gating (enforced, not just flagged)**: for a metric flagged
  `requires_elevated_verification`, the Review Queue's "Accept" action itself is blocked — not
  just the automated check that produces a flag — unless a current (non-expired) Certification/
  Audit Record is linked to that metric. A reviewer physically cannot override this by clicking
  Accept; they have to add or renew the certification first (spec Section 6/9.3).
- **Survey fatigue guardrail** — every submission (direct entry or CSV import) is checked against
  how many times the same respondent/site (`submitted_by`) has reported anywhere in the project in
  the trailing 12 months; exceeding a configurable cap (default 4) adds a `survey_fatigue` quality
  check that routes the submission to the Review Queue with a warning, rather than blocking outright.

### Report templates (Module 4)

Three of the spec's five report templates are implemented, reachable from a new `/reports` picker
page:

- **Grant/Funding Narrative Report** — donor-style narrative, Outcome/Impact-only rollup lens.
- **Investor/Board Update** — deck-style KPI summary against milestones and targets, full-detail
  rollup lens (every Theory of Change rung, not just Outcome/Impact).
- **Loan Covenant Compliance Report** — structured against the covenant terms on the project's
  debt Funding Instrument(s), with consequence-severity-flagged metrics sorted to the top.

Board/Public Impact Report and the live dashboard export remain a Phase 2 item.

### Seed data

Two projects, under the same prototype org, deliberately chosen to contrast the non-profit/grant
and for-profit/commercial tracks:

**TUMI E-Bus Mission** (non-profit / grant), drawn from a real (offline) Results Framework
document: an illustrative Objective/Output/Activity breakdown, three worked hypotheses, one
metric attached from the bundled IRIS+ catalog (cross-mapped to SDG) plus two bespoke SMART
metrics, two Deep Dive City jurisdictions rolling up to their countries, capital provider tags,
and two years of worked baseline/milestone/target/actual data (all pre-accepted, so they show up
on the dashboard and report immediately). A 2026 e-bus deployment figure sits flagged in the
Review Queue (a consistency-check outlier), plus a use case at each funnel stage and a
third-party audit record linked to the elevated-verification e-bus metric.

**ARARA — Amazon Regeneration Financing Platform** (for-profit / commercial), drawn from ARARA's
real Phase 1 Investment Brief and pitch deck (arara.earth): both parallel lenses on, two Funding
Instruments (equity bridge round + planned Layer B green bond), a full Theory of Change and
Objective/Output/Activity tree matching the brief's three Phase 1 workstreams, an Engagement
Funnel with ARARA-app-specific threshold definitions, a Commercial Value Chain with four
milestones from Shop Unit Proven through Territorial + Network Scale, five bespoke metrics plus
one IRIS+ catalog attachment, a two-jurisdiction hectares split (restoration vs. protection
channel) in the same reporting period to exercise the rollup, a hectares-verified metric flagged
`requiresElevatedVerification` and left deliberately ungated (no current certification) so the
Review Queue's compliance block is directly demonstrable, and three use cases including a
retelling of "Maria's Journey" from the deck (explicitly marked illustrative/modeled, as the deck
itself does).

## Stack

Next.js 16 (App Router, Turbopack, Server Actions) + TypeScript + Tailwind CSS v4 +
Drizzle ORM + SQLite (local file, `better-sqlite3`) + hand-written Radix UI primitives.

This diverges slightly from the spec's Section 9.2 stack table, which named Prisma and
shadcn/ui — both were swapped for functionally equivalent alternatives (Drizzle+better-sqlite3,
hand-written Radix components) because the build environment used to develop this prototype
blocked their install-time network calls. The underlying philosophy — SQLite, Tailwind, zero
hosting cost, fully offline-capable — is unchanged; only the specific libraries differ. Prisma
or shadcn/ui can be swapped back in later with no change to the data model or UI behavior.

## Getting started

```bash
npm install
npm run db:seed     # creates data/mel-tool.db and seeds the TUMI E-Bus Mission demo project
npm run dev
```

Open http://localhost:3000. The seeded project appears on the home page — click into it, then
into "Thesis Studio."

To reset the demo data, delete `data/mel-tool.db` (and the `data/mel-tool.db-*` WAL/SHM files
next to it) and re-run `npm run db:seed`.

### Optional: AI-assisted drafting

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` to enable the "Draft with AI"
button in Thesis Studio. Without it, that button explains it's unavailable and everything else
works the same.

## Other commands

```bash
npm run build        # production build
npm run start         # run the production build
npm run lint          # eslint
npx drizzle-kit generate   # after changing src/db/schema.ts, generate a new migration
npx drizzle-kit migrate    # apply pending migrations to data/mel-tool.db
```

## Project structure

```
src/
  app/                          Next.js routes (App Router)
    page.tsx                    Project list + create-project form
    projects/[projectId]/
      page.tsx                  Project settings (lens toggles, funding instruments)
      thesis/page.tsx           Thesis Studio
      metrics/page.tsx          Metrics Library (catalog, bespoke builder, jurisdictions, overlap)
      evidence/page.tsx         Evidence Hub (report/import, review queue, use cases, certifications)
      dashboard/page.tsx        Actual vs. target dashboard + hypothesis scorecard
      reports/page.tsx                   Report template picker
      reports/grant-narrative/page.tsx   Grant/Funding Narrative Report (printable)
      reports/investor-update/page.tsx   Investor/Board Update (printable)
      reports/loan-covenant/page.tsx     Loan Covenant Compliance Report (printable)
      learning/page.tsx                 Learning Agenda board (priority-tiered)
  components/
    ui/                         Hand-written Radix-based primitives (button, card, dialog, ...)
    thesis/                     Thesis Studio building blocks (form, ToC tree, hypotheses, history,
                                 engagement funnel panel, commercial value chain panel)
    metrics/                    Catalog browser, bespoke builder, jurisdictions, metric detail, overlap
    evidence/                   Report/import forms, review queue, use case board, certification register
    dashboard/                  Metrics dashboard + hypothesis scorecard
    learning/                   Learning Agenda board
    project-nav.tsx, lens-toggle.tsx, print-button.tsx
  db/
    schema.ts                   Drizzle schema (22 tables — Phase 1a/1b/1c/1d + Learning Agenda)
    client.ts                   SQLite connection (auto-creates its folder, auto-runs migrations)
    seed.ts                     TUMI (non-profit/grant) + ARARA (for-profit/commercial) demo projects
  lib/
    actions.ts                  Server Actions (all mutations — Thesis Studio, Metrics Library, Evidence Hub, dashboard)
    metrics.ts                  Actual-vs-target variance math + jurisdiction rollup, shared across pages
    catalog.ts                  Bundled IRIS+/SDG reference catalog (small curated subset)
    verification.ts             Rules-based observation verification pipeline (VerificationProvider-shaped, swappable)
    evidence.ts                 Certification renewal-status logic (computed from expiry date, never stored)
    ai/
      types.ts                  Shared types + isAiAvailable() (no server directive — safe for client import)
      actions.ts                 draftThesisDecomposition() — the one LLM call in this build
drizzle/                        Generated SQL migrations
```

## What's next (per the spec's build sequence)

1. AI-assisted verification as an alternative `VerificationProvider` implementation, swapped in
   alongside (not replacing) the rules-based pipeline.
2. Remaining Module 4 report templates: Board/Public Impact Report and a live dashboard export
   (Grant/Funding Narrative, Investor/Board Update, and Loan Covenant Compliance are all built).
3. Live portfolio-tool connectors (DevResults, Salesforce, Power BI, Asana) in place of CSV
   import.
4. A first-class `DataCollectionInstrument` object — the survey fatigue guardrail currently
   approximates "respondent/site" from the observation's free-text `submitted_by` field rather
   than a structured respondent registry.
5. The Learning Agenda's due dates are set manually against a Funding Instrument's free-text
   `reportingRequirement` rather than computed from a structured cadence — a real calendar/
   reminder view is a natural follow-up once that field is more structured.
