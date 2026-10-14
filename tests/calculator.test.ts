import { test } from "node:test";
import assert from "node:assert/strict";
import { affordability, calculate, defaults, monthlyIncome, mortgagePayment, mortgageSchedule } from "../lib/calculator";
import { utilityEstimate } from "../lib/location";

test("standard amortization and full cost include all seven expenses", () => {
  const result = calculate(defaults);
  assert.equal(result.downPayment, 45000);
  assert.equal(result.loan, 405000);
  assert.ok(Math.abs(result.expenses[0].amount - 2559.87549514) < 0.00001);
  assert.ok(Math.abs(result.total - 4166.12549514) < 0.00001);
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
  assert.equal(calculate({ ...defaults, down:20 }).expenses[3].amount, 0);
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

test("mortgage schedule shows starting monthly amounts and ending balances", () => {
  const rows = mortgageSchedule(405000, 6.5, 30);
  assert.equal(rows.length, 36);
  assert.deepEqual(rows.slice(0, 8).map(row => [row.startMonth, row.endMonth]), [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,12],[13,24]]);
  assert.ok(Math.abs(rows[0].interest - 2193.75) < 0.000001);
  assert.equal(rows[6].principal.toFixed(2), "378.19");
  assert.equal(rows[6].balance.toFixed(2), "400473.21");
  // Independently amortize every month to verify each group's start and end.
  let balance = 405000;
  const payment = mortgagePayment(balance, 6.5, 30);
  for (let month = 1; month <= 360; month++) {
    const interest = balance * 0.065 / 12;
    const principal = payment - interest;
    balance -= principal;
    const start = rows.find(row => row.startMonth === month);
    if (start) {
      assert.equal(start.payment, payment);
      assert.ok(Math.abs(start.interest - interest) < 0.000001);
      assert.ok(Math.abs(start.principal - principal) < 0.000001);
    }
    const end = rows.find(row => row.endMonth === month);
    if (end) assert.ok(Math.abs(end.balance - balance) < 0.000001);
  }
  assert.equal(rows.at(-1)?.balance, 0);
});

test("schedule covers each selected term once and handles zero interest or no loan", () => {
  for (const years of [15, 20, 30]) {
    const rows = mortgageSchedule(360000, 0, years);
    let nextMonth = 1;
    for (const row of rows) {
      assert.equal(row.startMonth, nextMonth);
      assert.equal(row.payment, 360000 / (years * 12));
      assert.equal(row.principal, row.payment);
      assert.equal(row.interest, 0);
      nextMonth = row.endMonth + 1;
    }
    assert.equal(nextMonth, years * 12 + 1);
    assert.equal(rows.at(-1)?.balance, 0);
  }
  assert.deepEqual(mortgageSchedule(0, 6.5, 30), []);
  assert.deepEqual(mortgageSchedule(NaN, 6.5, 30), []);
  assert.deepEqual(mortgageSchedule(405000, 6.5, 0), []);
  const highRate = mortgageSchedule(405000, 100, 30);
  assert.equal(highRate.at(-1)?.balance, 0);
  assert.ok(highRate.every(row => Object.values(row).every(value => Number.isFinite(value) && value >= 0)));
});
