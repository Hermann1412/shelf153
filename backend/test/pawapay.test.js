import test from "node:test";
import assert from "node:assert/strict";
import { buildPawaPayDeposit, extractPawaPayStatus, normalizePhoneNumber } from "../utils/pawaPay.js";

test("normalizes a pawaPay phone number to international digits", () => {
  assert.equal(normalizePhoneNumber("+243 812 345 678"), "243812345678");
});

test("extracts the final status from a pawaPay status-check response", () => {
  assert.equal(extractPawaPayStatus({ status: "FOUND", data: { status: "COMPLETED" } }), "COMPLETED");
  assert.equal(extractPawaPayStatus({ status: "FAILED" }), "FAILED");
});

test("builds a pawaPay v2 MMO deposit with a stable idempotency key", () => {
  const deposit = buildPawaPayDeposit({
    depositId: "30e625f0-7430-4dd3-a9b0-72acbcf09a7a",
    amount: 12.5,
    phone: "+243 812 345 678",
    provider: "AIRTEL_COD",
    currency: "USD",
  });

  assert.equal(deposit.depositId, deposit.clientReferenceId);
  assert.equal(deposit.amount, "12.50");
  assert.deepEqual(deposit.payer, {
    type: "MMO",
    accountDetails: { phoneNumber: "243812345678", provider: "AIRTEL_COD" },
  });
});
