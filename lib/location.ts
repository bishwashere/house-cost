import { statePriceIndex, stateTaxRate } from "./location-benchmarks";

// EIA, 2024 Average Monthly Bill — Residential, table 5A. State averages, not ZIP-level quotes.
export const electricity: Record<string, number> = { AL:173.50, AK:143.54, AZ:160.24, AR:129.13, CA:160.86, CO:100.57, CT:199.66, DE:150.87, DC:113.23, FL:156.09, GA:151.25, HI:212.12, ID:108.73, IL:109.99, IN:133.06, IA:111.54, KS:123.90, KY:133.81, LA:140.96, ME:133.60, MD:165.87, MA:167.20, MI:119.31, MN:110.06, MS:154.83, MO:129.18, MT:107.91, NE:110.28, NV:139.39, NH:144.87, NJ:128.13, NM:92.88, NY:139.53, NC:143.50, ND:118.38, OH:135.16, OK:132.05, OR:129.62, PA:145.17, RI:162.40, SC:149.51, SD:127.81, TN:143.32, TX:163.72, UT:94.57, VT:125.66, VA:148.77, WA:113.68, WV:154.76, WI:110.87, WY:107.65 };
export const locationFields = ["tax", "insurance", "utilities", "maintenance"] as const;
export type LocationField = typeof locationFields[number];
export type LocationOverrides = Partial<Record<LocationField, boolean>>;
export type LocationEstimate = {
  zip: string; city: string; state: string; electricity: number | null;
  priceIndex: number | null; area: string | null; areaMultiplier: number;
  costFactor: number; tax: number; insurance: number; utilities: number; maintenance: number;
};
export const fallbackExpenses = { tax: 1.5, insurance: 1800, utilities: 350, maintenance: 1 };

// Approximate ZIP-prefix coverage and explicit planning allowances, not measured metro indices.
const metroAllowances = [
  { state: "CA", prefixes: /^(940|941|943|944|945|946|947|948|949|950|951)/, name: "Bay Area", multiplier: 1.15 },
  { state: "CA", prefixes: /^(90\d|91[0-8])/, name: "Los Angeles area", multiplier: 1.10 },
  { state: "CA", prefixes: /^(919|920|921)/, name: "San Diego area", multiplier: 1.10 },
  { state: "NY", prefixes: /^(10[0-4]|11[0-4]|116)/, name: "New York City area", multiplier: 1.15 },
  { state: "NJ", prefixes: /^(070|071|072|073)/, name: "New York–New Jersey area", multiplier: 1.10 },
  { state: "MA", prefixes: /^(021|022|024)/, name: "Boston area", multiplier: 1.10 },
  { state: "WA", prefixes: /^(980|981)/, name: "Seattle area", multiplier: 1.10 },
  { state: "DC", prefixes: /^(200|202|203|204|205)/, name: "Washington DC area", multiplier: 1.10 },
  { state: "VA", prefixes: /^(220|221|222|223)/, name: "Northern Virginia", multiplier: 1.10 },
  { state: "MD", prefixes: /^(208|209)/, name: "Washington DC suburbs", multiplier: 1.10 },
  { state: "FL", prefixes: /^(330|331|332|333|334)/, name: "South Florida", multiplier: 1.10 },
];

export function estimateLocation(zip: string, city: string, state: string): LocationEstimate {
  const priceIndex = statePriceIndex[state] ?? null;
  const area = /^\d{5}$/.test(zip) ? metroAllowances.find(area => area.state === state && area.prefixes.test(zip)) : undefined;
  const areaMultiplier = area?.multiplier ?? 1;
  const costFactor = (priceIndex == null ? 1 : priceIndex / 100) * areaMultiplier;
  const bill = electricity[state] ?? null;
  return {
    zip, city, state, electricity: bill, priceIndex, area: area?.name ?? null, areaMultiplier, costFactor,
    tax: stateTaxRate[state] ?? fallbackExpenses.tax,
    insurance: Math.round(1800 * costFactor / 50) * 50,
    utilities: bill == null ? fallbackExpenses.utilities : Math.round((bill + 205 * costFactor) / 5) * 5,
    maintenance: Math.round(costFactor * 100) / 100,
  };
}

export function applyLocationEstimates<T extends Record<LocationField, string>>(values: T, location: LocationEstimate | null, overrides: LocationOverrides): T {
  const next = { ...values };
  for (const field of locationFields) {
    if (!overrides[field]) next[field] = String((location ?? fallbackExpenses)[field]) as T[typeof field];
  }
  return next;
}

export const defaultLocation = estimateLocation("17011", "Camp Hill", "PA");
