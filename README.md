# Nestwell · House Affordability Calculator

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

Utilities use [EIA's 2024 residential state average electricity bills](https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf), plus an **assumed $205** for other utilities, rounded to the nearest $5. The extra allowance is a planning assumption, not sourced local data. This yields the requested $350 default in Pennsylvania. User overrides survive location changes and can be reset individually.

Property tax (1.5%) and homeowners insurance ($1,800/year) remain **editable planning defaults**, because a ZIP alone cannot determine assessed value, tax district, exemptions, policy coverage, or underwriting. The app does not fabricate ZIP-specific tax or insurance quotes. Check these against the local assessor and an insurer. PMI uses an editable annual rate against the original loan balance for down payments below 20%; actual eligibility and cancellation depend on loan terms.

Closing costs, debt payments, tax deductions, future inflation, and lender qualification are outside this calculator. The annual total is twelve times the current estimated monthly expenses.

Google Fonts is optional; system fonts work offline. No income is passed to that service. All graphics are local inline SVG or Lucide icons.
