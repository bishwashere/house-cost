# House Affordability Calculator

A responsive, single-page Next.js App Router application with TypeScript and React. No keys or database required.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Behavior

- Standard fixed-rate amortization, including 0% interest and 100% down payment.
- Property taxes, insurance, conditional conventional-loan PMI, HOA, utilities, and maintenance all contribute to monthly cost.
- Annual/monthly toggles preserve income without rounding drift. Gross/net incomes are separate user-entered amounts; no tax conversion is inferred. The starting $90,000 gross income is an editable example.
- Income is held in component memory and never sent to the server. Only ZIP is used for location lookup. No persistence or analytics.
- Copy includes assumptions, detailed expenses, inputs, income basis, results, and source information. A selectable text fallback is shown when clipboard access is denied.
- Illustrative housing-burden categories are not underwriting or mortgage qualification rules.

## Location data and limitations

`GET /api/location?zip=17011` resolves US ZIP codes using [Zippopotam.us](https://www.zippopotam.us/). The default Camp Hill, PA location is built in; other ZIPs use a cached server request with a five-second timeout. Offline, invalid, unknown, and unsupported locations fall back to explicitly labeled default estimates. Request cancellation prevents stale results from replacing the latest ZIP.

Location defaults cover all 50 states and DC, using these historical benchmarks:

- [BEA 2024 all-items regional price parities](https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area), downloaded from `SARPP_STATE_2008_2024.csv` in https://apps.bea.gov/regional/zip/SARPP.zip on October 14, 2026.
- [Tax Foundation, 2024 effective property tax rates, Table 2](https://taxfoundation.org/data/all/state/property-taxes-by-state-county/), calculated from Census ACS B25082/B25090. These describe existing owner-occupied homes; they are not statutory tax rates or purchase-specific assessments.
- [EIA 2024 residential state average electricity bills](https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf).

The cost factor is `state BEA index / 100 × metro allowance`. Selected ZIP prefixes receive **assumed**, not measured, metro allowances: 15% in the Bay Area and NYC area; 10% around Los Angeles, San Diego, Boston, Seattle, DC/Northern Virginia/Maryland suburbs, northeastern NJ, and South Florida. Coverage is intentionally approximate and is defined explicitly in `lib/location.ts`. Other areas use their state factor alone.

Automatic expense formulas:

- Property tax: state historical effective rate × entered house price / 12. No cost-of-living multiplier. Local tax districts, exemptions, assessments, and reassessment on purchase can produce materially different bills.
- Annual insurance: `$1,800 × cost factor`, rounded to $50. This simple budgeting allowance does not model rebuilding value, coverage, catastrophe exposure, flood insurance, or underwriting.
- Monthly utilities: `EIA state electricity bill + $205 × cost factor`, rounded to $5. The $205 is an assumption for other services, not sourced local billing.
- Annual maintenance reserve: `1% × cost factor`, rounded to 0.01 percentage point, applied to house value.

The default Camp Hill, PA location now uses 1.26% tax, $1,750 annual insurance, $345 monthly utilities, and a 0.98% annual maintenance reserve. Missing or unsupported locations use the fallback values in `lib/calculator.ts`: 1.5%, $1,800, $350, and 1%, respectively. Source years and formulas are disclosed in the expandable estimate note and copied calculations. Benchmarks are bundled snapshots, not live data feeds.

Tax, insurance, utilities, and maintenance each have an independent manual override, including zero or blank input, which survives ZIP changes and pending/failed lookups. “Use area estimate” restores only that field; Reset restores automatic mode for all fields. Mortgage price, down payment, interest rate, term, PMI rate, and HOA are never changed by location. PMI uses an editable annual rate against the original loan balance below 20% down; actual eligibility and cancellation depend on loan terms.

Closing costs, debt payments, tax deductions, future inflation, and lender qualification are outside this calculator. The annual total is twelve times the current estimated monthly expenses.

Google Fonts is optional; system fonts work offline. No income is passed to that service. All graphics are local inline SVG or Lucide icons.
