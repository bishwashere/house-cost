export type Inputs = {
  price: number; down: number; rate: number; years: number; tax: number;
  insurance: number; hoa: number; utilities: number; maintenance: number; pmi: number;
};
export const defaults: Inputs = { price: 300000, down: 10, rate: 6.5, years: 30, tax: 1.5, insurance: 1800, hoa: 0, utilities: 350, maintenance: 1, pmi: 0.5 };
export function positive(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
export function mortgagePayment(principal: number, annualRate: number, years: number) {
  const loan = positive(principal), months = positive(years) * 12, rate = positive(annualRate) / 1200;
  if (!loan || !months) return 0;
  return rate === 0 ? loan / months : loan * rate / -Math.expm1(-months * Math.log1p(rate));
}
export function mortgageSchedule(principal: number, annualRate: number, years: number) {
  const loan = positive(principal), months = Math.floor(positive(years) * 12), rate = positive(annualRate) / 1200;
  const rows: { startMonth: number; endMonth: number; payment: number; principal: number; interest: number; balance: number }[] = [];
  if (!loan || !months) return rows;
  const payment = mortgagePayment(loan, annualRate, months / 12);
  for (let startMonth = 1; startMonth <= months;) {
    const endMonth = Math.min(months, startMonth <= 6 ? startMonth : Math.ceil(startMonth / 12) * 12);
    // Compute from the remaining term to avoid accumulated rounding or cancellation errors.
    const principalPayment = rate === 0 ? payment : payment * Math.exp(-(months - startMonth + 1) * Math.log1p(rate));
    const balance = rate === 0 ? payment * (months - endMonth) : payment * -Math.expm1(-(months - endMonth) * Math.log1p(rate)) / rate;
    rows.push({ startMonth, endMonth, payment, principal: principalPayment, interest: payment - principalPayment, balance: Math.max(0, balance) });
    startMonth = endMonth + 1;
  }
  return rows;
}
export function calculate(raw: Inputs) {
  const input = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, positive(value)])) as Inputs;
  const down = Math.min(100, input.down);
  const downPayment = input.price * down / 100;
  const loan = input.price - downPayment;
  const expenses = [
    { key: "mortgage", label: "Mortgage principal & interest", amount: mortgagePayment(loan, input.rate, input.years), color: "#236b60" },
    { key: "tax", label: "Property taxes", amount: input.price * input.tax / 1200, color: "#72a697" },
    { key: "insurance", label: "Homeowners insurance", amount: input.insurance / 12, color: "#adc5b7" },
    { key: "pmi", label: "Private mortgage insurance", amount: down < 20 && loan > 0 ? loan * input.pmi / 1200 : 0, color: "#9b98b4" },
    { key: "hoa", label: "HOA fees", amount: input.hoa, color: "#b6aaa0" },
    { key: "utilities", label: "Utilities", amount: input.utilities, color: "#d9b77b" },
    { key: "maintenance", label: "Maintenance reserve", amount: input.price * input.maintenance / 1200, color: "#c78665" },
  ];
  const escrow = expenses.filter(item => ["tax", "insurance", "pmi"].includes(item.key)).reduce((sum, item) => sum + item.amount, 0);
  const otherHousing = expenses.filter(item => ["hoa", "utilities", "maintenance"].includes(item.key)).reduce((sum, item) => sum + item.amount, 0);
  return { downPayment, loan, expenses, escrow, otherHousing, total: expenses.reduce((sum, item) => sum + item.amount, 0) };
}
export function affordability(total: number, income: number) {
  if (!Number.isFinite(income) || income <= 0) return null;
  const percentage = total / income * 100;
  return { percentage, remaining: income - total, remainingPercentage: 100 - percentage, category: percentage <= 30 ? "lower" : percentage <= 40 ? "moderate" : "high" } as const;
}
export function monthlyIncome(person1: number, person2: number, second: boolean, period: "annual" | "monthly") {
  return (positive(person1) + (second ? positive(person2) : 0)) / (period === "annual" ? 12 : 1);
}
export const currency = (value: number, decimals = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
