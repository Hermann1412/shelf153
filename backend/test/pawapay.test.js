import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "crypto";
import {
  buildPawaPayDeposit,
  buildPawaPayPayout,
  buildPawaPayRefund,
  extractPawaPayStatus,
  matchesStoredPayment,
  matchesStoredPayout,
  matchesStoredRefund,
  normalizePhoneNumber,
} from "../utils/pawaPay.js";
import { initiatePayment } from "../utils/pawaPayPayment.js";
import { initiatePayout } from "../utils/pawaPayPayout.js";
import { initiateRefund } from "../utils/pawaPayRefund.js";
import { signPawaPayFinancialRequest } from "../utils/pawaPayRequestSignature.js";
import { requirePawaPayCallbackSignature } from "../middlewares/pawaPaySignature.js";

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
  assert.equal(deposit.amount, "12.5");
  assert.deepEqual(deposit.payer, {
    type: "MMO",
    accountDetails: { phoneNumber: "243812345678", provider: "AIRTEL_COD" },
  });
});

test("accepts only a provider payload matching the stored payment", () => {
  const payment = {
    transaction_id: "30e625f0-7430-4dd3-a9b0-72acbcf09a7a",
    amount: "12.50",
    currency: "USD",
    provider: "AIRTEL_COD",
    order: { total_price: "12.50" },
  };
  const payload = {
    status: "FOUND",
    data: {
      depositId: payment.transaction_id,
      status: "COMPLETED",
      amount: "12.50",
      currency: "USD",
      payer: { accountDetails: { provider: "AIRTEL_COD" } },
    },
  };
  assert.equal(matchesStoredPayment(payment, payload), true);
  assert.equal(matchesStoredPayment(payment, { ...payload, data: { ...payload.data, amount: "99.00" } }), false);
});

test("classifies only an explicit pawaPay rejection as definitive", async () => {
  const accepted = await initiatePayment("id", 1, "243000000000", "AIRTEL_COD", "USD", async () => ({ status: "ACCEPTED" }));
  const rejected = await initiatePayment("id", 1, "243000000000", "AIRTEL_COD", "USD", async () => ({ status: "REJECTED" }));
  const originalError = console.error;
  console.error = () => {};
  const throttled = await initiatePayment("id", 1, "243000000000", "AIRTEL_COD", "USD", async () => {
    throw { response: { status: 429, data: { message: "slow down" } } };
  });
  console.error = originalError;

  assert.equal(accepted.success, true);
  assert.equal(rejected.definitive, true);
  assert.equal(throttled.definitive, false);
});

test("builds and validates a pawaPay v2 seller payout", () => {
  const payoutId = "30e625f0-7430-4dd3-a9b0-72acbcf09a7a";
  const payout = buildPawaPayPayout({
    payoutId, sellerId: "seller-id", amount: 45.5, phone: "+243 812 345 678",
    provider: "AIRTEL_COD", currency: "USD",
  });
  assert.equal(payout.payoutId, payout.clientReferenceId);
  assert.equal(payout.amount, "45.5");
  assert.deepEqual(payout.recipient, {
    type: "MMO",
    accountDetails: { phoneNumber: "243812345678", provider: "AIRTEL_COD" },
  });
  const stored = {
    id: payoutId, amount: "45.50", currency: "USD", provider: "AIRTEL_COD", phone: "243812345678",
  };
  const payload = { status: "FOUND", data: { ...payout, status: "COMPLETED" } };
  assert.equal(matchesStoredPayout(stored, payload), true);
  assert.equal(matchesStoredPayout(stored, { ...payload, data: { ...payload.data, amount: "99.00" } }), false);
});

test("keeps ambiguous payout responses pending for reconciliation", async () => {
  const input = { payoutId: "id" };
  assert.equal((await initiatePayout(input, async () => ({ status: "ACCEPTED" }))).success, true);
  assert.equal((await initiatePayout(input, async () => ({ status: "DUPLICATE_IGNORED" }))).success, true);
  assert.equal((await initiatePayout(input, async () => ({ status: "REJECTED" }))).definitive, true);
  const originalError = console.error;
  console.error = () => {};
  const timeout = await initiatePayout(input, async () => { throw new Error("timeout"); });
  console.error = originalError;
  assert.equal(timeout.definitive, false);
});

test("builds, validates and safely retries a pawaPay v2 refund", async () => {
  const refundId = "30e625f0-7430-4dd3-a9b0-72acbcf09a7a";
  const refund = buildPawaPayRefund({
    refundId, depositId: "59f0a05c-c084-4f99-bca8-c61b427aad35",
    amount: "12.50", currency: "USD", orderId: "order-id",
  });
  assert.equal(refund.refundId, refund.clientReferenceId);
  assert.equal(refund.amount, "12.5");
  const stored = { id: refundId, provider_amount: "12.50", provider_currency: "USD", provider: "AIRTEL_COD", phone: "243812345678" };
  const payload = { status: "FOUND", data: { ...refund, status: "COMPLETED", recipient: { accountDetails: { provider: "AIRTEL_COD", phoneNumber: "243812345678" } } } };
  assert.equal(matchesStoredRefund(stored, payload), true);
  assert.equal(matchesStoredRefund(stored, { ...payload, data: { ...payload.data, amount: "12.51" } }), false);
  assert.equal((await initiateRefund(refund, async () => ({ status: "DUPLICATE_IGNORED" }))).success, true);
  assert.equal((await initiateRefund(refund, async () => ({ status: "REJECTED" }))).definitive, true);
  assert.equal((await initiateRefund(refund, async () => { throw new Error("timeout"); })).definitive, false);
});

test("validates RFC 9421 content digest, signature, key id and expiry", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const previous = { ...process.env };
  process.env.PAWAPAY_SIGN_FINANCIAL_REQUESTS = "true";
  process.env.PAWAPAY_SIGNING_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" });
  process.env.PAWAPAY_SIGNING_KEY_ID = "test-key";
  process.env.PAWAPAY_SIGNATURE_ALGORITHM = "ecdsa-p256-sha256";
  const body = JSON.stringify({ refundId: "example" });
  const headers = signPawaPayFinancialRequest({
    method: "POST", baseUrl: "https://callbacks.example.com", path: "/refund", body,
  });
  process.env.PAWAPAY_REQUIRE_SIGNED_CALLBACKS = "true";
  process.env.PAWAPAY_CALLBACK_PUBLIC_KEY = publicKey.export({ type: "spki", format: "pem" });
  process.env.PAWAPAY_CALLBACK_KEY_ID = "test-key";
  process.env.PAWAPAY_CALLBACK_AUTHORITY = "callbacks.example.com";
  const lowerHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  const req = {
    method: "POST", originalUrl: "/refund", rawBody: Buffer.from(body),
    get: (name) => lowerHeaders[name.toLowerCase()] || (name.toLowerCase() === "host" ? "callbacks.example.com" : undefined),
  };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() { return this; } };
  let accepted = false;
  requirePawaPayCallbackSignature(req, res, () => { accepted = true; });
  assert.equal(accepted, true);
  accepted = false;
  requirePawaPayCallbackSignature({ ...req, rawBody: Buffer.from("tampered") }, res, () => { accepted = true; });
  assert.equal(accepted, false);
  assert.equal(res.statusCode, 401);
  for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
  Object.assign(process.env, previous);
});
