/**
 * Bundled IRIS+ / SDG reference catalog (spec Module 2, "Standards &
 * governance reference data").
 *
 * This is a small, hand-curated subset — NOT the full IRIS+ or SDG
 * indicator set. The spec flags reference-data licensing/redistribution
 * terms as an open question before bundling the *full* catalog in a
 * shipped product (see Section 11); this subset sidesteps that question
 * for the prototype while still exercising the real workflow (search
 * catalog -> attach to project -> flows through the same pipeline as a
 * bespoke metric). Swap in the full GIIN/UN catalogs once licensing is
 * confirmed.
 *
 * Originally this subset only covered climate/transport/energy themes,
 * because the only reference project was the transport-sector City EV
 * Mission. Once the forest/land-based BRARE reference project was added,
 * every catalog entry it needed (hectares under regeneration, carbon
 * removal, land tenure, smallholder livelihoods) was missing — the
 * browser was quietly transport-shaped. Each entry now carries
 * `sectorTags` so the browser (src/components/metrics/catalog-browser.tsx)
 * can surface the entries relevant to a given project's `sector` first,
 * without hiding the rest — a project should never be unable to attach an
 * "off-sector" indicator, just not have to scroll past a screen of
 * irrelevant ones to find its own.
 *
 * IRIS+ source: https://iris.thegiin.org/metrics/
 * SDG source: https://unstats.un.org/sdgs/
 */

// Keep this in sync with the sector values seeded on projects (see
// src/db/seed.ts) and any others a user sets by hand — it's a free-text
// column, so this list is the catalog's own vocabulary, not a DB-enforced
// enum. An entry's `sectorTags` that don't match a project's `sector` are
// simply not promoted to "Suggested" — they're still listed and attachable.
export type CatalogSectorTag =
  | "transport"
  | "energy"
  | "climate"
  | "forest_land"
  | "biodiversity"
  | "land_tenure"
  | "livelihoods"
  | "gender"
  | "cross_cutting";

export type IrisPlusCatalogEntry = {
  sourceCode: string;
  name: string;
  strategicGoal: string;
  theme: string;
  unit: string;
  directionOfGood: "higher_is_better" | "lower_is_better";
  definition: string;
  mappedSdgTargets: string[]; // e.g. "13.2"
  sectorTags: CatalogSectorTag[];
};

export type SdgCatalogEntry = {
  sourceCode: string; // e.g. "13.2.1"
  goal: string; // e.g. "Goal 13 — Climate Action"
  target: string; // e.g. "13.2 — Integrate climate change measures into policy"
  indicator: string;
  tier: "I" | "II" | "III";
  unit: string;
  sectorTags: CatalogSectorTag[];
};

export const IRIS_PLUS_CATALOG: IrisPlusCatalogEntry[] = [
  {
    sourceCode: "PI5460",
    name: "Greenhouse Gas Emissions Avoided",
    strategicGoal: "Climate Change Mitigation",
    theme: "Climate",
    unit: "Metric tons CO2e",
    directionOfGood: "higher_is_better",
    definition: "Quantity of greenhouse gas emissions avoided as a result of the organization's activities, in metric tons of CO2 equivalent.",
    mappedSdgTargets: ["13.2"],
    sectorTags: ["climate", "transport", "energy", "forest_land", "cross_cutting"],
  },
  {
    sourceCode: "PI4066",
    name: "Renewable Energy Capacity Installed",
    strategicGoal: "Climate Change Mitigation",
    theme: "Energy",
    unit: "Megawatts",
    directionOfGood: "higher_is_better",
    definition: "Amount of renewable energy generation capacity installed as a result of the organization's activities.",
    mappedSdgTargets: ["7.2"],
    sectorTags: ["energy", "climate"],
  },
  {
    sourceCode: "PI7845",
    name: "Low-Carbon Vehicles Deployed",
    strategicGoal: "Climate Change Mitigation",
    theme: "Transport",
    unit: "Count",
    directionOfGood: "higher_is_better",
    definition: "Number of low- or zero-emission vehicles (e.g. electric buses) deployed as a result of the organization's activities.",
    mappedSdgTargets: ["11.2", "13.2"],
    sectorTags: ["transport"],
  },
  {
    sourceCode: "OI8478",
    name: "Client Individuals: Total",
    strategicGoal: "Cross-Cutting",
    theme: "Reach",
    unit: "Count",
    directionOfGood: "higher_is_better",
    definition: "Total number of individuals directly served or reached by the organization's activities in the reporting period.",
    mappedSdgTargets: [],
    sectorTags: ["cross_cutting"],
  },
  {
    sourceCode: "PD8158",
    name: "Employees: Total",
    strategicGoal: "Cross-Cutting",
    theme: "Employment",
    unit: "Count",
    directionOfGood: "higher_is_better",
    definition: "Total number of employees, including part-time and seasonal, at the end of the reporting period.",
    mappedSdgTargets: ["8.5"],
    sectorTags: ["cross_cutting"],
  },
  {
    sourceCode: "PI7218",
    name: "Air Quality Improvement",
    strategicGoal: "Climate Change Mitigation",
    theme: "Air Quality",
    unit: "Micrograms per cubic meter (PM2.5)",
    directionOfGood: "lower_is_better",
    definition: "Change in ambient air pollutant concentration attributable to the organization's activities.",
    mappedSdgTargets: ["11.6"],
    sectorTags: ["transport", "climate"],
  },
  {
    sourceCode: "PI3097",
    name: "Institutional Capacity Strengthened",
    strategicGoal: "Climate Change Mitigation",
    theme: "Capacity Building",
    unit: "Count of institutions",
    directionOfGood: "higher_is_better",
    definition: "Number of institutions (e.g. city governments, utilities) with strengthened technical or operational capacity as a result of the organization's activities.",
    mappedSdgTargets: ["13.3"],
    sectorTags: ["cross_cutting", "climate"],
  },
  {
    sourceCode: "PI4045",
    name: "Women in Leadership Positions",
    strategicGoal: "Gender Equality",
    theme: "Gender",
    unit: "Percentage",
    directionOfGood: "higher_is_better",
    definition: "Percentage of leadership or decision-making positions held by women within participating organizations or programs.",
    mappedSdgTargets: ["5.5"],
    sectorTags: ["cross_cutting", "gender"],
  },
  {
    sourceCode: "PI1552",
    name: "Land and/or Forest Under Improved Management or Protection",
    strategicGoal: "Sustainable Land & Forest Use",
    theme: "Land & Forest",
    unit: "Hectares",
    directionOfGood: "higher_is_better",
    definition: "Area of land and/or forest that is under improved management practices or formal protection as a result of the organization's activities.",
    mappedSdgTargets: ["15.2"],
    sectorTags: ["forest_land", "biodiversity"],
  },
  {
    sourceCode: "PI9264",
    name: "Greenhouse Gas Emissions Removed",
    strategicGoal: "Climate Change Mitigation",
    theme: "Land & Forest",
    unit: "Metric tons CO2e",
    directionOfGood: "higher_is_better",
    definition: "Quantity of greenhouse gas emissions removed from the atmosphere and sequestered (e.g. via forest regeneration or avoided deforestation) as a result of the organization's activities — distinct from emissions avoided elsewhere in the value chain.",
    mappedSdgTargets: ["13.2", "15.2"],
    sectorTags: ["forest_land", "climate"],
  },
  {
    sourceCode: "PI2019",
    name: "Indigenous and/or Community Land Tenure Secured",
    strategicGoal: "Land Tenure & Rights",
    theme: "Land Tenure",
    unit: "Hectares",
    directionOfGood: "higher_is_better",
    definition: "Area of land for which formal or customary tenure rights held by Indigenous peoples and/or local communities were newly secured or strengthened as a result of the organization's activities.",
    mappedSdgTargets: ["1.4"],
    sectorTags: ["land_tenure", "forest_land"],
  },
  {
    sourceCode: "PI6499",
    name: "Species Habitat Protected or Restored",
    strategicGoal: "Biodiversity & Ecosystem Conservation",
    theme: "Biodiversity",
    unit: "Hectares",
    directionOfGood: "higher_is_better",
    definition: "Area of habitat for species of conservation concern that is protected or under active restoration as a result of the organization's activities.",
    mappedSdgTargets: ["15.5"],
    sectorTags: ["biodiversity", "forest_land"],
  },
  {
    sourceCode: "PI7731",
    name: "Land Steward Household Income from Ecological Payments",
    strategicGoal: "Sustainable Livelihoods",
    theme: "Livelihoods",
    unit: "USD per household per year",
    directionOfGood: "higher_is_better",
    definition: "Average annual income received by participating land-steward households from ecological credit sales, conservation payments, or similar results-based transfers.",
    mappedSdgTargets: ["1.4", "2.3"],
    sectorTags: ["livelihoods", "forest_land"],
  },
];

export const SDG_CATALOG: SdgCatalogEntry[] = [
  {
    sourceCode: "7.2.1",
    goal: "Goal 7 — Affordable and Clean Energy",
    target: "7.2 — Increase share of renewable energy",
    indicator: "Renewable energy share in the total final energy consumption",
    tier: "I",
    unit: "%",
    sectorTags: ["energy", "climate"],
  },
  {
    sourceCode: "11.2.1",
    goal: "Goal 11 — Sustainable Cities and Communities",
    target: "11.2 — Access to safe, affordable, sustainable transport systems",
    indicator: "Proportion of population with convenient access to public transport",
    tier: "II",
    unit: "%",
    sectorTags: ["transport"],
  },
  {
    sourceCode: "11.6.2",
    goal: "Goal 11 — Sustainable Cities and Communities",
    target: "11.6 — Reduce environmental impact of cities",
    indicator: "Annual mean levels of fine particulate matter in cities",
    tier: "I",
    unit: "Micrograms per cubic meter (PM2.5)",
    sectorTags: ["transport", "climate"],
  },
  {
    sourceCode: "13.2.1",
    goal: "Goal 13 — Climate Action",
    target: "13.2 — Integrate climate change measures into policy",
    indicator: "Number of countries/cities with nationally/locally determined climate strategies",
    tier: "II",
    unit: "Count",
    sectorTags: ["climate", "cross_cutting"],
  },
  {
    sourceCode: "13.3.1",
    goal: "Goal 13 — Climate Action",
    target: "13.3 — Improve education and institutional capacity on climate",
    indicator: "Institutions with integrated climate change adaptation/mitigation capacity",
    tier: "II",
    unit: "Count of institutions",
    sectorTags: ["climate", "cross_cutting"],
  },
  {
    sourceCode: "5.5.2",
    goal: "Goal 5 — Gender Equality",
    target: "5.5 — Full participation in leadership and decision-making",
    indicator: "Proportion of women in managerial positions",
    tier: "I",
    unit: "%",
    sectorTags: ["gender", "cross_cutting"],
  },
  {
    sourceCode: "15.1.1",
    goal: "Goal 15 — Life on Land",
    target: "15.1 — Conserve and restore terrestrial and freshwater ecosystems",
    indicator: "Forest area as a proportion of total land area",
    tier: "I",
    unit: "%",
    sectorTags: ["forest_land", "biodiversity"],
  },
  {
    sourceCode: "15.2.1",
    goal: "Goal 15 — Life on Land",
    target: "15.2 — Promote sustainable forest management, halt deforestation, restore degraded forest",
    indicator: "Progress towards sustainable forest management",
    tier: "I",
    unit: "Composite index",
    sectorTags: ["forest_land"],
  },
  {
    sourceCode: "1.4.2",
    goal: "Goal 1 — No Poverty",
    target: "1.4 — Equal rights to ownership and control over land",
    indicator: "Proportion of adults with secure tenure rights to land, with legally recognized documentation",
    tier: "II",
    unit: "%",
    sectorTags: ["land_tenure", "forest_land"],
  },
  {
    sourceCode: "2.3.2",
    goal: "Goal 2 — Zero Hunger",
    target: "2.3 — Double agricultural productivity and incomes of small-scale food producers",
    indicator: "Average income of small-scale food producers, by sex and Indigenous status",
    tier: "II",
    unit: "USD per year",
    sectorTags: ["livelihoods", "forest_land"],
  },
];
