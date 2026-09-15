import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCumulativeRefund,
  calculateLineFinancials,
  calculateOrderFinancials,
} from "../services/financialService.js";

for (const [sale, commission, seller] of [
  ["10.00", "0.70", "9.30"],
  ["50.00", "3.50", "46.50"],
  ["100.00", "7.00", "93.00"],
  ["1000.00", "70.00", "930.00"],
]) {
  test(`${sale} USD applies exactly 7% commission`, () => {
    const result = calculateLineFinancials({ unitPrice: sale, quantity: 1, commissionRate: "0.07" });
    assert.equal(result.commissionAmount, commission);
    assert.equal(result.sellerAmount, seller);
  });
}

test("rounds small monetary amounts deterministically in minor units", () => {
  assert.equal(calculateLineFinancials({ unitPrice: "0.05", quantity: 1, commissionRate: "0.07" }).commissionAmount, "0.00");
  assert.equal(calculateLineFinancials({ unitPrice: "0.08", quantity: 1, commissionRate: "0.07" }).commissionAmount, "0.01");
});

test("uses the actual discounted line price supplied by the server", () => {
  const result = calculateOrderFinancials([
    { product: { price: "8.00" }, quantity: 2 },
  ], "0.07");
  assert.equal(result.grossSalesAmount, "16.00");
  assert.equal(result.grossCommission, "1.12");
  assert.equal(result.sellerNetAmount, "14.88");
});

test("keeps cumulative partial-refund rounding equal to a full refund", () => {
  const first = calculateCumulativeRefund({ grossAmount: "0.04", previousRefunded: "0", commissionRate: "0.07" });
  const second = calculateCumulativeRefund({ grossAmount: "0.04", previousRefunded: "0.04", commissionRate: "0.07" });
  const full = calculateCumulativeRefund({ grossAmount: "0.08", previousRefunded: "0", commissionRate: "0.07" });
  assert.equal(first.commissionMinor + second.commissionMinor, full.commissionMinor);
  assert.equal(first.sellerMinor + second.sellerMinor, full.sellerMinor);
});
