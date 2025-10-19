import assert from "node:assert/strict";

import {
  aplicarEstouroEmDinheiro,
  calcularAAtribuir,
  calcularDisponivel,
  calcularProjecaoMeta
} from "../src/domain/budgeting";

function testCalcularDisponivel() {
  assert.equal(calcularDisponivel(10_00, 5_00, 2_00), 13_00);
  assert.equal(calcularDisponivel(-5_00, 0, 3_00), -8_00);
}

function testCalcularAAtribuir() {
  assert.equal(calcularAAtribuir(20_00, 12_00), 8_00);
  assert.equal(calcularAAtribuir(15_00, 18_00), -3_00);
}

function testAplicarEstouro() {
  assert.equal(aplicarEstouroEmDinheiro(-5_00, 10_00), 5_00);
  assert.equal(aplicarEstouroEmDinheiro(2_00, 7_00), 7_00);
}

function testProjecoesMetas() {
  const allocation = {
    category_id: "cat",
    month: "2025-05",
    assigned_cents: 2_00,
    activity_cents: 0,
    available_cents: 5_00,
    prev_available_cents: 3_00
  };

  const metaSaldo = calcularProjecaoMeta(
    {
      id: "goal",
      org_id: "org",
      category_id: "cat",
      type: "TB",
      amount_cents: 10_00,
      target_month: null,
      cadence: "monthly",
      created_at: new Date().toISOString()
    },
    allocation,
    "2025-05"
  );
  assert.equal(metaSaldo?.necessarioNoMes, 5_00);

  const metaMensal = calcularProjecaoMeta(
    {
      id: "goal",
      org_id: "org",
      category_id: "cat",
      type: "MFG",
      amount_cents: 6_00,
      target_month: null,
      cadence: "monthly",
      created_at: new Date().toISOString()
    },
    allocation,
    "2025-05"
  );
  assert.equal(metaMensal?.necessarioNoMes, 4_00);

  const metaData = calcularProjecaoMeta(
    {
      id: "goal",
      org_id: "org",
      category_id: "cat",
      type: "TBD",
      amount_cents: 20_00,
      target_month: "2025-07-01",
      cadence: "monthly",
      created_at: new Date().toISOString()
    },
    allocation,
    "2025-05"
  );
  assert.equal(metaData?.necessarioNoMes, 5_00);

  const metaDataPassada = calcularProjecaoMeta(
    {
      id: "goal",
      org_id: "org",
      category_id: "cat",
      type: "TBD",
      amount_cents: 20_00,
      target_month: "2025-07-01",
      cadence: "monthly",
      created_at: new Date().toISOString()
    },
    {
      ...allocation,
      month: "2025-08"
    },
    "2025-08"
  );
  assert.equal(metaDataPassada?.necessarioNoMes, 0);
}

try {
  testCalcularDisponivel();
  testCalcularAAtribuir();
  testAplicarEstouro();
  testProjecoesMetas();
  console.log("Budget tests passed");
} catch (error) {
  console.error("Budget tests failed", error);
  process.exitCode = 1;
}
