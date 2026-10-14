"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Info, MapPin, RotateCcw, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { affordability, calculate, currency, defaults, monthlyIncome, type Inputs } from "@/lib/calculator";
import { defaultLocation, type LocationEstimate } from "@/lib/location";

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
  const [values, setValues] = useState<Record<keyof Inputs, string>>(() => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, String(value)])) as Record<keyof Inputs, string>);
  const [zip, setZip] = useState("17011");
  const [location, setLocation] = useState<LocationEstimate | null>(defaultLocation);
  const [locationStatus, setLocationStatus] = useState("");
  const [utilityOverride, setUtilityOverride] = useState(false);
  const utilityOverrideRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState(false);
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [basis, setBasis] = useState<"gross" | "net">("gross");
  // Income stays in annual units so switching display periods never introduces rounding drift.
  const [incomes, setIncomes] = useState({ gross: [90000, 0], net: [0, 0] });
  const [second, setSecond] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const numeric = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])) as Inputs;
  const result = calculate(numeric);
  const income = monthlyIncome(incomes[basis][0], incomes[basis][1], second, "annual");
  const analysis = affordability(result.total, income);
  const setValue = (key: keyof Inputs, value: string) => setValues(previous => ({ ...previous, [key]: value }));

  useEffect(() => { setCopyStatus(""); setCopyFallback(""); }, [values, zip, incomes, period, basis, second]);

  useEffect(() => {
    const controller = new AbortController();
    setLocation(null);
    if (!utilityOverrideRef.current) setValues(previous => ({ ...previous, utilities: "350" }));
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
        if (!utilityOverrideRef.current) setValues(previous => ({ ...previous, utilities: String(data.utilities ?? 350) }));
      } catch (error) {
        if (!controller.signal.aborted) setLocationStatus(error instanceof Error ? error.message : "Location unavailable. Default estimates apply.");
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [zip]);

  const setIncome = (index: number, value: string) => setIncomes(previous => ({ ...previous, [basis]: previous[basis].map((amount, i) => i === index ? Number(value) * (period === "monthly" ? 12 : 1) : amount) }));
  const reset = () => {
    setValues(Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, String(value)])) as Record<keyof Inputs, string>);
    setZip("17011"); setLocation(defaultLocation); setLocationStatus(""); setUtilityOverride(false); utilityOverrideRef.current = false;
    setPeriod("annual"); setBasis("gross"); setIncomes({ gross: [90000, 0], net: [0, 0] }); setSecond(false); setCopyStatus(""); setCopyFallback("");
    setExpanded(false); setSources(false);
  };
  const copy = async () => {
    const text = ["HOUSE AFFORDABILITY CALCULATION", `House price: ${currency(numeric.price, 2)}`, `ZIP: ${zip || "Not provided"}${location ? ` (${location.city}, ${location.state})` : ""}`, `Down payment: ${numeric.down}% · ${currency(result.downPayment, 2)}`, `Mortgage loan: ${currency(result.loan, 2)}`, `Interest: ${numeric.rate}% fixed · ${numeric.years} years`, `Tax rate: ${numeric.tax}% annually`, `Insurance: ${currency(numeric.insurance, 2)}/year`, `Maintenance: ${numeric.maintenance}% annually`, `PMI rate: ${numeric.pmi}% annually (applies below 20% down)`, "", "MONTHLY EXPENSES", ...result.expenses.map(item => `${item.label}: ${currency(item.amount, 2)}`), `Total monthly housing cost: ${currency(result.total, 2)}`, `Annual housing expenses: ${currency(result.total * 12, 2)}`, "", `HOUSEHOLD INCOME · ${basis.toUpperCase()} · ${period.toUpperCase()} INPUT`, `Person 1: ${currency(incomes[basis][0] / (period === "annual" ? 1 : 12), 2)}/${period === "annual" ? "year" : "month"}`, ...(second ? [`Person 2: ${currency(incomes[basis][1] / (period === "annual" ? 1 : 12), 2)}/${period === "annual" ? "year" : "month"}`] : []), `Monthly household income: ${currency(income, 2)}`, analysis ? `Remaining monthly income: ${currency(analysis.remaining, 2)}\nHousing percentage: ${analysis.percentage.toFixed(1)}%\nIncome remaining: ${analysis.remainingPercentage.toFixed(1)}%\nIllustrative burden: ${analysis.category}` : "Affordability: enter a positive household income.", "", basis === "gross" ? "Remaining income is before income taxes and other living expenses." : "Remaining income is after income taxes, before other living expenses.", "Illustrative categories: ≤30% lower, >30–40% moderate, >40% high. These are not mortgage qualification rules.", "Tax and insurance are editable planning assumptions, not property-specific estimates. PMI eligibility, cost, and cancellation depend on loan terms.", `Utilities: ${utilityOverride ? "manual override" : location?.electricity != null ? `2024 EIA ${location.state} electricity average (${currency(location.electricity, 2)}) + $205 assumed other utilities, rounded to nearest $5` : "$350 fallback assumption"}.`, "EIA source: https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf", "Excludes closing costs and other debts. Estimates are not a loan offer."].join("\n");
    try { await navigator.clipboard.writeText(text); setCopyStatus("Calculation copied!"); setCopyFallback(""); } catch { setCopyFallback(text); setCopyStatus("Select and copy your calculation below."); }
  };

  return <>
    <main id="main">
      <div className="calculator-heading"><h1>House Affordability Calculator</h1><button className="text-button" onClick={reset}><RotateCcw size={13}/> Reset</button></div>

      <section className="card house-card" aria-label="House information">
        <div className="house-inputs"><NumberField id="price" label="House price" value={values.price} onChange={value => setValue("price", value)} prefix="$" large max={100000000}/><div className="field field-large"><label htmlFor="zip">ZIP code</label><div className="input-shell"><MapPin size={19}/><input id="zip" inputMode="numeric" autoComplete="postal-code" value={zip} maxLength={5} onChange={event => setZip(event.target.value.replace(/\D/g, ""))} aria-describedby="location-status"/></div></div></div>
        <div className="location-line" id="location-status" aria-live="polite"><MapPin size={13}/><span>{location ? `${location.city}, ${location.state}` : locationStatus}</span><button className="text-button" onClick={() => setSources(!sources)} aria-expanded={sources}>About the estimates <Info size={13}/></button></div>
        {sources && <div className="source-note"><p>ZIP lookup uses <a href="https://www.zippopotam.us/" target="_blank" rel="noreferrer">Zippopotam.us</a>. Utilities combine the <a href="https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf" target="_blank" rel="noreferrer">EIA’s 2024 state electricity average</a>{location?.electricity != null ? ` (${currency(location.electricity, 2)}/month in ${location.state})` : ""} with an assumed $205 for water, heating, internet, and other services, rounded to the nearest $5. This is a state benchmark, not ZIP-specific billing.</p><p>Property tax (1.5%) and insurance ($1,800/year) are planning defaults. Reliable property-specific quotes aren’t available from a ZIP alone. Check the local assessor and your insurer. You can edit every estimate below; your utility override stays in place when the ZIP changes.</p></div>}
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
            <NumberField id="tax" label="Annual property tax rate" value={values.tax} onChange={value => setValue("tax", value)} suffix="%" max={100} hint="Planning assumption · verify locally"/>
            <NumberField id="insurance" label="Annual homeowners insurance" value={values.insurance} onChange={value => setValue("insurance", value)} prefix="$" hint="Planning assumption · request a quote"/>
            <NumberField id="hoa" label="Monthly HOA fees" value={values.hoa} onChange={value => setValue("hoa", value)} prefix="$"/>
            <div><NumberField id="utilities" label="Monthly utilities" value={values.utilities} onChange={value => { utilityOverrideRef.current = true; setUtilityOverride(true); setValue("utilities", value); }} prefix="$" hint={utilityOverride ? "Your custom estimate" : location?.electricity != null ? "State electricity benchmark + assumed services" : "Fallback planning assumption"}/>{utilityOverride && <button className="text-button restore" onClick={() => { utilityOverrideRef.current = false; setUtilityOverride(false); setValue("utilities", String(location?.utilities ?? 350)); }}>Use area estimate</button>}</div>
            <NumberField id="maintenance" label="Annual maintenance reserve" value={values.maintenance} onChange={value => setValue("maintenance", value)} suffix="%" max={100} hint="Percentage of home value"/>
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
        <div className="income-inputs"><NumberField id={`income1-${basis}`} label="Person 1 income" value={incomes[basis][0] ? String(incomes[basis][0] / (period === "annual" ? 1 : 12)) : ""} onChange={value => setIncome(0, value)} prefix="$" suffix={period === "annual" ? "/ year" : "/ month"}/>{second && <NumberField id={`income2-${basis}`} label="Person 2 income" value={incomes[basis][1] ? String(incomes[basis][1] / (period === "annual" ? 1 : 12)) : ""} onChange={value => setIncome(1, value)} prefix="$" suffix={period === "annual" ? "/ year" : "/ month"}/>}</div>
        <label className="second-person"><input type="checkbox" checked={second} onChange={event => setSecond(event.target.checked)}/> Add Second Person’s Income</label><div className="income-note"><ShieldCheck size={14}/><span>{basis === "gross" ? "Use income before deductions. Gross and net amounts are saved separately." : "Enter your actual take-home income. We don’t estimate taxes or convert gross to net."}</span></div>
      </section>

      <section className="card analysis-card" aria-labelledby="analysis-heading"><div className="step-title"><h2 id="analysis-heading">Affordability Analysis</h2></div>
        {!analysis ? <div className="empty-analysis"><p>Enter a household income above $0 to see your housing percentage and what’s left each month.</p></div> : <><div className="analysis-metrics"><div><span>Monthly household income <small>({basis})</small></span><strong>{currency(income)}</strong></div><div><span>Monthly housing cost</span><strong>{currency(result.total)}</strong></div><div><span>{analysis.remaining < 0 ? "Monthly income shortfall" : "Remaining monthly income"}</span><strong className={analysis.remaining < 0 ? "negative" : "remaining"}>{currency(analysis.remaining)}</strong></div></div>
          <div className={`burden-box ${analysis.category}`}><div className="burden-top"><div className="burden-number">{analysis.percentage.toFixed(1)}<span>%</span><p>of your {basis} income goes toward housing</p></div><span className="burden-badge"><span/>{analysis.category === "lower" ? "Lower" : analysis.category === "moderate" ? "Moderate" : "High"} housing burden</span></div><div className="income-progress" role="progressbar" aria-label="Percentage of income spent on housing" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, analysis.percentage)} aria-valuetext={`${analysis.percentage.toFixed(1)}% of income spent on housing`}><div style={{ width: `${Math.min(100, analysis.percentage)}%` }}/><i style={{ left: "30%" }}/><i style={{ left: "40%" }}/></div><div className="progress-caption"><span>Housing · {analysis.percentage.toFixed(1)}%</span><span>{analysis.remainingPercentage < 0 ? `Shortfall · ${Math.abs(analysis.remainingPercentage).toFixed(1)}% of income` : `Remaining · ${analysis.remainingPercentage.toFixed(1)}%`}</span></div></div>
          <div className="category-legend"><span><i className="green"/> ≤ 30% Lower</span><span><i className="yellow"/> &gt; 30–40% Moderate</span><span><i className="red"/> &gt; 40% High</span></div><p className="analysis-disclaimer">Illustrative budgeting categories, not mortgage qualification rules. {basis === "gross" ? "Remaining income is before income taxes and other living expenses." : "Remaining income is after income taxes, before other living expenses."}</p></>}
      </section>

      <section className="card summary-card" aria-labelledby="summary-heading"><div className="summary-header"><div><h2 id="summary-heading">Financial Summary</h2></div><button className="copy-button" onClick={copy}>{copyStatus === "Calculation copied!" ? <Check size={16}/> : <Copy size={16}/>} {copyStatus === "Calculation copied!" ? "Copied!" : "Copy Calculation"}</button></div><dl className="summary-grid"><div><dt>Down payment <span>{numeric.down}%</span></dt><dd>{currency(result.downPayment)}</dd></div><div><dt>Total mortgage loan</dt><dd>{currency(result.loan)}</dd></div><div><dt>Annual housing expenses</dt><dd>{currency(result.total * 12)}</dd></div><div><dt>Monthly income <span>{basis}</span></dt><dd>{currency(income)}</dd></div><div><dt>Remaining each month</dt><dd>{analysis ? currency(analysis.remaining) : "—"}</dd></div><div><dt>Income toward housing</dt><dd>{analysis ? `${analysis.percentage.toFixed(1)}%` : "—"}</dd></div></dl><div className="copy-status" role="status">{copyStatus}</div>{copyFallback && <div className="copy-fallback"><label htmlFor="copy-text">Your complete calculation</label><textarea id="copy-text" readOnly value={copyFallback} onFocus={event => event.target.select()}/><button className="text-button" onClick={() => setCopyFallback("")}><X size={14}/> Close</button></div>}</section>
      <footer><p>For planning and illustration only. Not financial advice or a loan offer.<br/>Estimates exclude closing costs, other debts, and changes in future expenses.</p><span className="footer-private"><ShieldCheck size={13}/> Income stays in your browser</span></footer>
    </main>
  </>;
}
