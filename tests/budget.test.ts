import assert from "node:assert/strict";

import {
  budgetInternals,
  computeAvailable,
  calculateToBeBudgeted,
  NULL_CATEGORY_KEY,
  suggestFromAvg3m
} from "../src/domain/budget.ts";

function testComputeAvailable() {
  const result = computeAvailable(5000, 10000, 7500);
  assert.equal(result, 7500, "deve somar saldo anterior e orçamento e subtrair gastos");

  const negative = computeAvailable(-2000, 3000, 8000);
  assert.equal(negative, -7000, "deve suportar valores negativos");
}

async function testSuggestFromAvg3m() {
  const original = budgetInternals.getActivityMap;
  const calls: Array<{ year: number; month: number }> = [];
  budgetInternals.getActivityMap = async (year: number, month: number) => {
    calls.push({ year, month });
    if (month === 3) {
      return { [NULL_CATEGORY_KEY]: 9000, catA: 12000 };
    }
    if (month === 2) {
      return { [NULL_CATEGORY_KEY]: 6000, catA: 6000 };
    }
    return { [NULL_CATEGORY_KEY]: 3000 };
  };

  try {
    const result = await suggestFromAvg3m(2024, 4);
    assert.deepEqual(result, {
      [NULL_CATEGORY_KEY]: Math.round((9000 + 6000 + 3000) / 3),
      catA: Math.round((12000 + 6000 + 0) / 3)
    });
    assert.equal(calls.length, 3);
    assert.equal(calls[0].month, 3);
  } finally {
    budgetInternals.getActivityMap = original;
  }
}

function testCalculateToBeBudgeted() {
  const inflows = 100_00;
  const categories = [
    { budgeted_cents: 25_00 },
    { budgeted_cents: 15_00 },
    { budgeted_cents: 10_00 }
  ];
  const result = calculateToBeBudgeted(inflows, categories);
  assert.equal(result, inflows - 50_00);

  const withAdjustments = calculateToBeBudgeted(inflows, categories, 10_00, 5_00);
  assert.equal(withAdjustments, inflows - 50_00 - 10_00 + 5_00);
}

(async () => {
  try {
    testComputeAvailable();
    testCalculateToBeBudgeted();
    await testSuggestFromAvg3m();
    console.log("Budget tests passed");
  } catch (err) {
    console.error("Budget tests failed", err);
    process.exitCode = 1;
  }
})();
