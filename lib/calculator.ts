export type Inputs = {
  price: number; down: number; rate: number; years: number; tax: number;
  insurance: number; hoa: number; utilities: number; maintenance: number; pmi: number;
};
export const defaults: Inputs = { price: 450000, down: 10, rate: 6.5, years: 30, tax: 1.5, insurance: 1800, hoa: 0, utilities: 350, maintenance: 1, pmi: 0.5 };
export function positive(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
export function mortgagePayment(principal: number, annualRate: number, years: number) {
  const loan = positive(principal), months = positive(years) * 12, rate = positive(annualRate) / 1200;
  if (!loan || !months) return 0;
  return rate === 0 ? loan / months : loan * rate / -Math.expm1(-months * Math.log1p(rate));
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
  return { downPayment, loan, expenses, total: expenses.reduce((sum, item) => sum + item.amount, 0) };
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
