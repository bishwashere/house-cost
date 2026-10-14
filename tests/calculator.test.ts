import { test } from "node:test";
import assert from "node:assert/strict";
import { affordability, calculate, defaults, monthlyIncome, mortgagePayment } from "../lib/calculator";
import { utilityEstimate } from "../lib/location";

test("standard amortization and full cost include all seven expenses", () => {
  const result = calculate(defaults);
  assert.equal(result.downPayment, 90000);
  assert.equal(result.loan, 360000);
  assert.ok(Math.abs(result.expenses[0].amount - 2275.44488457) < 0.00001);
  assert.ok(Math.abs(result.total - 3712.94488457) < 0.00001);
  assert.equal(result.expenses.length, 7);
});
test("zero interest, paid-in-full homes and missing values remain finite", () => {
  assert.equal(mortgagePayment(360000, 0, 30), 1000);
  assert.equal(mortgagePayment(0, 6.5, 30), 0);
  assert.equal(mortgagePayment(360000, 6.5, 0), 0);
  assert.equal(calculate({ ...defaults, down:100 }).expenses[0].amount, 0);
  assert.equal(calculate({ ...defaults, price:NaN, insurance:-20, utilities:0 }).total, 0);
});
test("PMI applies only below 20% down and is based on loan balance", () => {
  assert.equal(calculate({ ...defaults, down:10 }).expenses[3].amount, 168.75);
  assert.equal(calculate(defaults).expenses[3].amount, 0);
  assert.equal(calculate({ ...defaults, down:100 }).expenses[3].amount, 0);
});
test("expense overrides contribute to the total", () => {
  assert.equal(calculate({ ...defaults, hoa:250 }).total - calculate(defaults).total, 250);
  assert.equal(calculate({ ...defaults, insurance:3000 }).total - calculate(defaults).total, 100);
});
test("income frequency and optional second income", () => {
  assert.equal(monthlyIncome(90000,60000,false,"annual"),7500);
  assert.equal(monthlyIncome(90000,60000,true,"annual"),12500);
  assert.equal(monthlyIncome(7500,5000,true,"monthly"),12500);
});
test("category boundaries, no income, and shortfall", () => {
  assert.equal(affordability(3000,10000)?.category,"lower");
  assert.equal(affordability(3000.01,10000)?.category,"moderate");
  assert.equal(affordability(4000,10000)?.category,"moderate");
  assert.equal(affordability(4000.01,10000)?.category,"high");
  assert.equal(affordability(1000,0),null);
  assert.equal(affordability(2000,1000)?.remaining,-1000);
  assert.equal(affordability(2000,1000)?.remainingPercentage,-100);
});
test("location utility benchmarks preserve default and unknown fallback", () => {
  assert.equal(utilityEstimate("PA"),350);
  assert.equal(utilityEstimate("NY"),345);
  assert.equal(utilityEstimate("XX"),null);
});
