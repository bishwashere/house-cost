"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Info, MapPin, RotateCcw, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { affordability, calculate, currency, defaults, monthlyIncome, mortgageSchedule, type Inputs } from "@/lib/calculator";
import { applyLocationEstimates, defaultLocation, locationFields, type LocationEstimate, type LocationField, type LocationOverrides } from "@/lib/location";

type FieldProps = { id: string; label: string; value: string; onChange: (value: string) => void; prefix?: string; suffix?: string; max?: number; hint?: string; large?: boolean };
function NumberField({ id, label, value, onChange, prefix, suffix, max = 1000000000, hint, large }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const display = !focused && value !== "" ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 }) : value;
  return <div className={`field ${large ? "field-large" : ""}`}>
    <label htmlFor={id}>{label}</label>
    <div className={`input-shell ${error ? "input-error" : ""}`}>
      {prefix && <span>{prefix}</span>}
      <input id={id} inputMode="decimal" autoComplete="off" value={display} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-hint` : undefined}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={event => { const next = event.target.value.replaceAll(",", "").replaceAll("$", ""); if (next === "" || (/^\d*\.?\d*$/.test(next) && Number(next) <= max)) { setError(""); onChange(next === "." ? "0." : next); } else setError(`Enter a number from 0 to ${max.toLocaleString()}.`); }} />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
    {(error || hint) && <small id={`${id}-hint`} className={error ? "field-error" : "field-hint"}>{error || hint}</small>}
  </div>;
}

export default function Calculator() {
  const [manualValues, setValues] = useState<Record<keyof Inputs, string>>(() => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, String(value)])) as Record<keyof Inputs, string>);
  const [zip, setZip] = useState("17011");
  const [resolvedLocation, setLocation] = useState<LocationEstimate | null>(defaultLocation);
  const [locationStatus, setLocationStatus] = useState("");
  const [overrides, setOverrides] = useState<LocationOverrides>({});
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState(false);
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [basis, setBasis] = useState<"gross" | "net">("gross");
  // Income stays in annual units so switching display periods never introduces rounding drift.
  const [incomes, setIncomes] = useState({ gross: [90000, 0], net: [0, 0] });
  const [second, setSecond] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const location = resolvedLocation?.zip === zip ? resolvedLocation : null;
  const values = applyLocationEstimates(manualValues, location, overrides);
  const numeric = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])) as Inputs;
  const result = calculate(numeric);
  const escrowExpenses = result.expenses.filter(item => ["tax", "insurance", "pmi"].includes(item.key));
  const separateExpenses = result.expenses.filter(item => ["utilities", "hoa", "maintenance"].includes(item.key));
  const schedule = mortgageSchedule(result.loan, numeric.rate, numeric.years);
  const income = monthlyIncome(incomes[basis][0], incomes[basis][1], second, "annual");
  const analysis = affordability(result.total, income);
  const setValue = (key: keyof Inputs, value: string) => {
    if (locationFields.includes(key as LocationField)) setOverrides(previous => ({ ...previous, [key]: true }));
    setValues(previous => ({ ...previous, [key]: value }));
  };
  const estimateHint = (field: LocationField) => overrides[field] ? "Your custom estimate" : location?.priceIndex != null ? field === "tax" ? "2024 state benchmark · verify locally" : "Location-adjusted planning estimate" : "Fallback planning estimate";
  const restoreEstimate = (field: LocationField) => <button type="button" className="text-button restore" aria-label={`Use area estimate for ${field}`} onClick={() => setOverrides(previous => ({ ...previous, [field]: false }))}>Use area estimate</button>;

  useEffect(() => { setCopyStatus(""); setCopyFallback(""); }, [manualValues, overrides, location, zip, incomes, period, basis, second]);

  useEffect(() => {
    const controller = new AbortController();
    setLocation(null);
    if (!/^\d{5}$/.test(zip)) { setLocationStatus("Enter a five-digit ZIP code. Default estimates apply."); return () => controller.abort(); }
    if (zip === "17011") { setLocation(defaultLocation); setLocationStatus(""); return () => controller.abort(); }
    setLocationStatus("Looking up your area…");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/location?zip=${zip}`, { signal: controller.signal });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(data.error);
        setLocation(data); setLocationStatus("");
      } catch (error) {
        if (!controller.signal.aborted) setLocationStatus(error instanceof Error ? error.message : "Location unavailable. Default estimates apply.");
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [zip]);

  const setAnnualIncome = (index: number, value: number) => setIncomes(previous => ({ ...previous, [basis]: previous[basis].map((amount, i) => i === index ? value : amount) }));
  const setIncome = (index: number, value: string) => setAnnualIncome(index, Number(value) * (period === "monthly" ? 12 : 1));
  const reset = () => {
    setValues(Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, String(value)])) as Record<keyof Inputs, string>);
    setZip("17011"); setLocation(defaultLocation); setLocationStatus(""); setOverrides({});
    setPeriod("annual"); setBasis("gross"); setIncomes({ gross: [90000, 0], net: [0, 0] }); setSecond(false); setCopyStatus(""); setCopyFallback("");
    setExpanded(false); setSources(false);
  };
  const copy = async () => {
    const text = ["HOUSE AFFORDABILITY CALCULATION", `House price: ${currency(numeric.price, 2)}`, `ZIP: ${zip || "Not provided"}${location ? ` (${location.city}, ${location.state})` : ""}`, `Down payment: ${numeric.down}% · ${currency(result.downPayment, 2)}`, `Mortgage loan: ${currency(result.loan, 2)}`, `Interest: ${numeric.rate}% fixed · ${numeric.years} years`, `Tax rate: ${numeric.tax}% annually`, `Insurance: ${currency(numeric.insurance, 2)}/year`, `Maintenance: ${numeric.maintenance}% annually`, `PMI rate: ${numeric.pmi}% annually (applies below 20% down)`, "", "MONTHLY EXPENSES", ...result.expenses.map(item => `${item.label}: ${currency(item.amount, 2)}`), `Total monthly housing cost: ${currency(result.total, 2)}`, `Annual housing expenses: ${currency(result.total * 12, 2)}`, "", `HOUSEHOLD INCOME · ${basis.toUpperCase()} · ${period.toUpperCase()} INPUT`, `Person 1: ${currency(incomes[basis][0] / (period === "annual" ? 1 : 12), 2)}/${period === "annual" ? "year" : "month"}`, ...(second ? [`Person 2: ${currency(incomes[basis][1] / (period === "annual" ? 1 : 12), 2)}/${period === "annual" ? "year" : "month"}`] : []), `Monthly household income: ${currency(income, 2)}`, analysis ? `Remaining monthly income: ${currency(analysis.remaining, 2)}\nHousing percentage: ${analysis.percentage.toFixed(1)}%\nIncome remaining: ${analysis.remainingPercentage.toFixed(1)}%\nIllustrative burden: ${analysis.category}` : "Affordability: enter a positive household income.", "", basis === "gross" ? "Remaining income is before income taxes and other living expenses." : "Remaining income is after income taxes, before other living expenses.", "Illustrative categories: ≤30% lower, >30–40% moderate, >40% high. These are not mortgage qualification rules.", "Location estimates are planning assumptions, not property-specific quotes. PMI eligibility, cost, and cancellation depend on loan terms.", `Location factor: ${location ? `${location.costFactor.toFixed(3)} (${location.state} BEA 2024 index ${location.priceIndex ?? "unavailable"}; ${location.area ?? "no metro allowance"}, ×${location.areaMultiplier})` : "fallback defaults"}.`, ...locationFields.map(field => `${field}: ${estimateHint(field)}`), "Tax: historical state effective rate applied to the entered price; assessed values, exemptions, and purchase reassessment may differ.", "Insurance: $1,800 × location factor, nearest $50. Maintenance: 1% × location factor, nearest 0.01%. Utilities: EIA state electricity + $205 × location factor, nearest $5. Insurance model excludes hazard and coverage pricing.", "Sources: https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area ; https://taxfoundation.org/data/all/state/property-taxes-by-state-county/ ; https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf", "Excludes closing costs and other debts. Estimates are not a loan offer."].join("\n");
    const scheduleText = ["", "MONTHLY HOUSING COST SCHEDULE", "Monthly amounts use the first month of each range. Loan balance is at the end. Current expenses are held constant, including PMI; actual costs and PMI cancellation may change.", "Escrow includes the itemized taxes, homeowners insurance, and PMI; lender billing may differ.", "Month | Total/month | Principal/month | Interest/month", ...schedule.flatMap(row => [
      `${row.startMonth === row.endMonth ? row.startMonth : `${row.startMonth}–${row.endMonth}`} | ${currency(result.total, 2)} | ${currency(row.principal, 2)} | ${currency(row.interest, 2)}`,
      `Escrow subtotal/month: ${currency(result.escrow, 2)}`,
      ...escrowExpenses.map(item => `  ${item.label}/month (included in escrow): ${currency(item.amount, 2)}`),
      ...separateExpenses.map(item => `${item.label}/month: ${currency(item.amount, 2)}`),
      `Ending loan balance: ${currency(row.balance, 2)}`, "",
    ]), ...(schedule.length ? [] : [`No loan balance. Ongoing monthly housing cost: ${currency(result.total, 2)}.`])].join("\n");
    const completeText = text + "\n" + scheduleText;
    try { await navigator.clipboard.writeText(completeText); setCopyStatus("Calculation copied!"); setCopyFallback(""); } catch { setCopyFallback(completeText); setCopyStatus("Select and copy your calculation below."); }
  };

  return <>
    <main id="main">
      <div className="calculator-heading"><h1>House Affordability Calculator</h1><button className="text-button" onClick={reset}><RotateCcw size={13}/> Reset</button></div>

      <section className="card house-card" aria-label="House information">
        <div className="house-inputs"><div className="house-price-field"><NumberField id="price" label="House price" value={values.price} onChange={value => setValue("price", value)} prefix="$" large max={100000000}/></div><div className="field field-large"><label htmlFor="zip">ZIP code</label><div className="input-shell"><MapPin size={19}/><input id="zip" inputMode="numeric" autoComplete="postal-code" value={zip} maxLength={5} onChange={event => setZip(event.target.value.replace(/\D/g, ""))} aria-describedby="location-status"/></div></div></div>
        <div className="down-payment-options price-presets" role="group" aria-label="House price presets">{[300000, 350000, 450000, 550000].map(amount => <button key={amount} type="button" aria-pressed={numeric.price === amount} onClick={() => setValue("price", String(amount))}>{currency(amount)}</button>)}</div>
        <div className="location-line" id="location-status" aria-live="polite"><MapPin size={13}/><span>{location ? `${location.city}, ${location.state} · ${location.priceIndex == null ? "Default estimates" : location.area ? "Higher-cost area estimates" : "State-adjusted estimates"}` : locationStatus}</span><button className="text-button" onClick={() => setSources(!sources)} aria-expanded={sources}>About the estimates <Info size={13}/></button></div>
        {sources && <div className="source-note">
          <p>ZIP lookup: <a href="https://www.zippopotam.us/" target="_blank" rel="noreferrer">Zippopotam.us</a>. The cost factor uses <a href="https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area" target="_blank" rel="noreferrer">BEA’s 2024 state price index</a> divided by 100, plus a 10–15% planning allowance for selected expensive metro ZIP prefixes. These approximate areas are not neighborhood-level measurements.</p>
          {location && <p>{location.state} index: {location.priceIndex?.toFixed(1) ?? "unavailable"}. {location.area ? `${location.area} allowance: +${Math.round((location.areaMultiplier - 1) * 100)}%.` : "No metro allowance."} Combined factor: {location.costFactor.toFixed(3)}.</p>}
          <p>Property taxes use <a href="https://taxfoundation.org/data/all/state/property-taxes-by-state-county/" target="_blank" rel="noreferrer">2024 state effective rates from Census data, calculated by Tax Foundation</a>. This is a historical benchmark, not your tax bill; exemptions, local assessments, and reassessment after purchase can change the amount. Cost of living does not multiply the tax rate.</p>
          <p>Insurance = $1,800 × cost factor, rounded to $50. Maintenance = 1% of house value × cost factor, rounded to 0.01%. These are budgeting formulas, not insurance quotes or repair estimates; hazard exposure, coverage, and home condition can change costs substantially.</p>
          <p>Utilities = <a href="https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf" target="_blank" rel="noreferrer">EIA’s 2024 state electricity bill</a> + $205 × cost factor for other services, rounded to $5. Unsupported or unavailable locations use default estimates. Mortgage terms stay as entered. Custom expense values stay in place when the ZIP changes.</p>
        </div>}

        {!expanded && <div className="down-payment-quick">
          <div className="down-payment-label"><span id="down-payment-label">Down payment</span><span>{numeric.down}% · {currency(result.downPayment)}</span></div>
          <div className="down-payment-options" role="group" aria-labelledby="down-payment-label">
            {[5, 10, 15, 20].map(percentage => <button key={percentage} type="button" aria-pressed={numeric.down === percentage} onClick={() => setValue("down", String(percentage))}>{percentage}%</button>)}
          </div>
        </div>}
        <div className="advanced"><button className="advanced-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="advanced-fields"><span><SlidersHorizontal size={17}/> Mortgage, Tax &amp; Expense Details</span><span className="advanced-right"><span>{numeric.down}% down · {numeric.rate}% interest · {numeric.years} years</span><ChevronDown size={17} className={expanded ? "rotated" : ""}/></span></button>
          {expanded && <div id="advanced-fields" className="advanced-fields"><div className="details-grid">
            <div><NumberField id="down" label="Down payment" value={values.down} onChange={value => setValue("down", value)} suffix="%" max={100} hint={currency(result.downPayment)}/><input type="range" min="0" max="100" step="1" value={numeric.down} onChange={event => setValue("down", event.target.value)} aria-label="Down payment percentage"/></div>
            <NumberField id="rate" label="Mortgage interest rate" value={values.rate} onChange={value => setValue("rate", value)} suffix="%" max={100} hint="Annual fixed rate"/>
            <div className="field"><label htmlFor="years">Loan duration</label><div className="input-shell"><select id="years" value={values.years} onChange={event => setValue("years", event.target.value)}>{[15,20,30].map(years => <option key={years} value={years}>{years} years</option>)}</select></div></div>
            <div><NumberField id="tax" label="Annual property tax rate" value={values.tax} onChange={value => setValue("tax", value)} suffix="%" max={100} hint={estimateHint("tax")}/>{overrides.tax && restoreEstimate("tax")}</div>
            <div><NumberField id="insurance" label="Annual homeowners insurance" value={values.insurance} onChange={value => setValue("insurance", value)} prefix="$" hint={estimateHint("insurance")}/>{overrides.insurance && restoreEstimate("insurance")}</div>
            <NumberField id="hoa" label="Monthly HOA fees" value={values.hoa} onChange={value => setValue("hoa", value)} prefix="$"/>
            <div><NumberField id="utilities" label="Monthly utilities" value={values.utilities} onChange={value => setValue("utilities", value)} prefix="$" hint={estimateHint("utilities")}/>{overrides.utilities && restoreEstimate("utilities")}</div>
            <div><NumberField id="maintenance" label="Annual maintenance reserve" value={values.maintenance} onChange={value => setValue("maintenance", value)} suffix="%" max={100} hint={estimateHint("maintenance")}/>{overrides.maintenance && restoreEstimate("maintenance")}</div>
            <NumberField id="pmi" label="Annual estimated PMI rate" value={values.pmi} onChange={value => setValue("pmi", value)} suffix="%" max={100} hint={numeric.down < 20 ? "Applied to original loan balance" : "Not applied with 20% or more down"}/>
          </div><p className="fine-print"><Info size={14}/> PMI is estimated for a conventional loan with less than 20% down. Actual eligibility, cost, and cancellation depend on your loan terms.</p></div>}
        </div>
      </section>

      <section className="card cost-card" aria-labelledby="cost-heading">
        <div className="cost-hero"><div><h2 id="cost-heading">Estimated Total Monthly House Cost</h2><div className="big-total" aria-live="polite">{currency(result.total)}<span>/ month</span></div></div></div>
        <div className="breakdown"><div className="section-label"><h3>Monthly Expense Breakdown</h3></div><div className="stacked-bar" role="img" aria-label={result.expenses.map(item => `${item.label}: ${currency(item.amount, 2)}`).join(", ")}>{result.expenses.filter(item => item.amount > 0).map(item => <div key={item.key} style={{ width: `${item.amount / result.total * 100}%`, background: item.color }} title={`${item.label}: ${currency(item.amount, 2)}`}/>)}</div>
          <div className="expense-grid">{result.expenses.map(item => <div className="expense-row" key={item.key}><span className="expense-name"><i style={{ background: item.color }}/>{item.label}{item.key === "pmi" && <span className="inline-note">PMI</span>}</span><span className={item.amount === 0 ? "zero-value" : ""}>{currency(item.amount, 2)}</span></div>)}</div><div className="breakdown-foot"><Info size={13}/><span>Estimates include a maintenance reserve. Actual costs will vary.</span></div>
        </div>
      </section>

      <section className="card income-card" aria-labelledby="income-heading"><div className="step-title"><h2 id="income-heading">Household Income</h2></div>
        <div className="income-options"><div className="segmented" aria-label="Income frequency"><button aria-pressed={period === "annual"} onClick={() => setPeriod("annual")}>Annual income</button><button aria-pressed={period === "monthly"} onClick={() => setPeriod("monthly")}>Monthly income</button></div><fieldset className="basis-options"><legend className="sr-only">Income tax basis</legend><label><input type="radio" name="basis" checked={basis === "gross"} onChange={() => setBasis("gross")}/> Before taxes <span>(Gross)</span></label><label><input type="radio" name="basis" checked={basis === "net"} onChange={() => setBasis("net")}/> After taxes <span>(Net)</span></label></fieldset></div>
        <div className="income-inputs">{(second ? [0, 1] : [0]).map(index => <div key={`${index}-${basis}`}>
          <NumberField id={`income${index + 1}-${basis}`} label={`Person ${index + 1} income`} value={incomes[basis][index] ? String(incomes[basis][index] / (period === "annual" ? 1 : 12)) : ""} onChange={value => setIncome(index, value)} prefix="$" suffix={period === "annual" ? "/ year" : "/ month"}/>
          <div className="down-payment-options income-presets" role="group" aria-label={`Person ${index + 1} ${period} ${basis} income presets`}>
            {[50000, 70000, 100000, 150000].map(amount => <button key={amount} type="button" aria-pressed={incomes[basis][index] === amount} onClick={() => setAnnualIncome(index, amount)}>{currency(amount / (period === "annual" ? 1 : 12), period === "annual" ? 0 : 2)}</button>)}
          </div>
        </div>)}</div>
        <label className="second-person"><input type="checkbox" checked={second} onChange={event => setSecond(event.target.checked)}/> Add Second Person’s Income</label><div className="income-note"><ShieldCheck size={14}/><span>{basis === "gross" ? "Use income before deductions. Gross and net amounts are saved separately." : "Enter your actual take-home income. We don’t estimate taxes or convert gross to net."}</span></div>
      </section>

      <section className="card analysis-card" aria-labelledby="analysis-heading"><div className="step-title"><h2 id="analysis-heading">Affordability Analysis</h2></div>
        {!analysis ? <div className="empty-analysis"><p>Enter a household income above $0 to see your housing percentage and what’s left each month.</p></div> : <><div className="analysis-metrics"><div><span>Monthly household income <small>({basis})</small></span><strong>{currency(income)}</strong></div><div><span>Monthly housing cost</span><strong>{currency(result.total)}</strong></div><div><span>{analysis.remaining < 0 ? "Monthly income shortfall" : "Remaining monthly income"}</span><strong className={analysis.remaining < 0 ? "negative" : "remaining"}>{currency(analysis.remaining)}</strong></div></div>
          <div className={`burden-box ${analysis.category}`}><div className="burden-top"><div className="burden-number">{analysis.percentage.toFixed(1)}<span>%</span><p>of your {basis} income goes toward housing</p></div><span className="burden-badge"><span/>{analysis.category === "lower" ? "Lower" : analysis.category === "moderate" ? "Moderate" : "High"} housing burden</span></div><div className="income-progress" role="progressbar" aria-label="Percentage of income spent on housing" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, analysis.percentage)} aria-valuetext={`${analysis.percentage.toFixed(1)}% of income spent on housing`}><div style={{ width: `${Math.min(100, analysis.percentage)}%` }}/><i style={{ left: "30%" }}/><i style={{ left: "40%" }}/></div><div className="progress-caption"><span>Housing · {analysis.percentage.toFixed(1)}%</span><span>{analysis.remainingPercentage < 0 ? `Shortfall · ${Math.abs(analysis.remainingPercentage).toFixed(1)}% of income` : `Remaining · ${analysis.remainingPercentage.toFixed(1)}%`}</span></div></div>
          <div className="category-legend"><span><i className="green"/> ≤ 30% Lower</span><span><i className="yellow"/> &gt; 30–40% Moderate</span><span><i className="red"/> &gt; 40% High</span></div><p className="analysis-disclaimer">Illustrative budgeting categories, not mortgage qualification rules. {basis === "gross" ? "Remaining income is before income taxes and other living expenses." : "Remaining income is after income taxes, before other living expenses."}</p></>}
      </section>

      <section className="card summary-card" aria-labelledby="summary-heading"><div className="summary-header"><div><h2 id="summary-heading">Financial Summary</h2></div><button className="copy-button" onClick={copy}>{copyStatus === "Calculation copied!" ? <Check size={16}/> : <Copy size={16}/>} {copyStatus === "Calculation copied!" ? "Copied!" : "Copy Calculation"}</button></div><dl className="summary-grid"><div><dt>Down payment <span>{numeric.down}%</span></dt><dd>{currency(result.downPayment)}</dd></div><div><dt>Total mortgage loan</dt><dd>{currency(result.loan)}</dd></div><div><dt>Annual housing expenses</dt><dd>{currency(result.total * 12)}</dd></div><div><dt>Monthly income <span>{basis}</span></dt><dd>{currency(income)}</dd></div><div><dt>Remaining each month</dt><dd>{analysis ? currency(analysis.remaining) : "—"}</dd></div><div><dt>Income toward housing</dt><dd>{analysis ? `${analysis.percentage.toFixed(1)}%` : "—"}</dd></div></dl><div className="copy-status" role="status">{copyStatus}</div>{copyFallback && <div className="copy-fallback"><label htmlFor="copy-text">Your complete calculation</label><textarea id="copy-text" readOnly value={copyFallback} onFocus={event => event.target.select()}/><button className="text-button" onClick={() => setCopyFallback("")}><X size={14}/> Close</button></div>}</section>
      <section className="card schedule-card" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading">Monthly Housing Cost Schedule</h2>
        {schedule.length > 0 ? <>
          <p id="schedule-note" className="schedule-note">Monthly amounts use the first month of each range; loan balance is at the end. Current expenses are held constant, including PMI; actual costs and PMI cancellation may change.</p>
          <div className="schedule-scroll" role="region" aria-labelledby="schedule-heading" aria-describedby="schedule-note" tabIndex={0}>
            <table className="schedule-table">
              <thead><tr><th id="schedule-total-label" scope="col">Total<span>/ month</span></th><th id="schedule-principal-label" scope="col">Principal<span>/ month</span></th><th id="schedule-interest-label" scope="col">Interest<span>/ month</span></th></tr></thead>
              {schedule.map(row => <tbody key={row.startMonth}>
                <tr className="schedule-period"><th id={`schedule-period-${row.startMonth}`} scope="rowgroup" colSpan={3}>{row.startMonth === row.endMonth ? `Month ${row.startMonth}` : `Months ${row.startMonth}–${row.endMonth}`}</th></tr>
                <tr className="schedule-amounts">
                  <td headers={`schedule-total-label schedule-period-${row.startMonth}`} className="schedule-total">{currency(result.total, 2)}</td><td headers={`schedule-principal-label schedule-period-${row.startMonth}`}>{currency(row.principal, 2)}</td><td headers={`schedule-interest-label schedule-period-${row.startMonth}`}>{currency(row.interest, 2)}</td>
                </tr>
                <tr><td className="schedule-details" colSpan={3}>
                  <dl>
                    <div className="schedule-escrow"><dt>Escrow subtotal / month</dt><dd>{currency(result.escrow, 2)}</dd></div>
                    {escrowExpenses.map(item => <div key={item.key} className="schedule-escrow-item"><dt>{item.key === "pmi" ? "PMI" : item.label}</dt><dd>{currency(item.amount, 2)}</dd></div>)}
                    {separateExpenses.map(item => <div key={item.key}><dt>{item.label} / month</dt><dd>{currency(item.amount, 2)}</dd></div>)}
                    <div className="schedule-balance"><dt>Loan balance at end</dt><dd>{currency(row.balance, 2)}</dd></div>
                  </dl>
                </td></tr>
              </tbody>)}
            </table>
          </div>
          <p className="schedule-note">Escrow includes the itemized taxes, homeowners insurance, and PMI shown above; lender billing may differ.</p>
        </> : <p className="schedule-note">No loan balance. Ongoing monthly housing cost: {currency(result.total, 2)}.</p>}
      </section>
      <footer><p>For planning and illustration only. Not financial advice or a loan offer.<br/>Estimates exclude closing costs, other debts, and changes in future expenses.</p><span className="footer-private"><ShieldCheck size={13}/> Income stays in your browser</span></footer>
    </main>
  </>;
}
