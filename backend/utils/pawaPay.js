import "dotenv/config";
import axios from "axios";
import { decimalToMinorUnits } from "../services/financialService.js";
import { signPawaPayFinancialRequest } from "./pawaPayRequestSignature.js";

const baseURL = process.env.PAWAPAY_BASE_URL || "https://api.sandbox.pawapay.io";

const client = axios.create({
  baseURL,
  timeout: Number(process.env.PAWAPAY_TIMEOUT_MS || 15000),
  headers: { "Content-Type": "application/json" },
});

const authorizationHeaders = () => {
  if (!process.env.PAWAPAY_API_TOKEN) throw new Error("PAWAPAY_API_TOKEN is required.");
  return { Authorization: `Bearer ${process.env.PAWAPAY_API_TOKEN}` };
};

const postFinancialRequest = async (path, payload) => {
  const body = JSON.stringify(payload);
  const headers = {
    ...authorizationHeaders(),
    ...signPawaPayFinancialRequest({ method: "POST", baseUrl: baseURL, path, body }),
  };
  return client.post(path, body, { headers });
};

export const normalizePhoneNumber = (phone) => String(phone || "").replace(/\D/g, "");
export const formatPawaPayAmount = (amount) => Number(amount).toFixed(2).replace(/\.?0+$/, "");
export const extractPawaPayStatus = (payload) => payload?.data?.status ?? payload?.status;
const sameAmount = (left, right) => {
  try { return decimalToMinorUnits(left) === decimalToMinorUnits(right); } catch { return false; }
};

export const matchesStoredPayment = (payment, payload) => {
  const data = payload?.data ?? payload;
  return Boolean(
    data?.depositId === payment.transaction_id
    && data.currency === payment.currency
    && data.payer?.accountDetails?.provider === payment.provider
    && sameAmount(data.amount, payment.amount),
  );
};

export const buildPawaPayDeposit = ({ depositId, amount, phone, provider, currency }) => ({
  depositId,
  payer: {
    type: "MMO",
    accountDetails: { phoneNumber: normalizePhoneNumber(phone), provider },
  },
  amount: formatPawaPayAmount(amount),
  currency,
  clientReferenceId: depositId,
  customerMessage: "Shelf153 order",
  metadata: [{ orderId: depositId }],
});

export async function requestPawaPayDeposit({ depositId, amount, phone, provider, currency }) {
  const { data } = await postFinancialRequest(
    "/v2/deposits", buildPawaPayDeposit({ depositId, amount, phone, provider, currency }),
  );
  return data;
}

export async function getPawaPayDepositStatus(depositId) {
  const response = await client.get(`/v2/deposits/${depositId}`, {
    headers: authorizationHeaders(),
  });
  return response.data;
}

export const buildPawaPayPayout = ({ payoutId, amount, phone, provider, currency, sellerId }) => ({
  payoutId,
  recipient: {
    type: "MMO",
    accountDetails: { phoneNumber: normalizePhoneNumber(phone), provider },
  },
  amount: formatPawaPayAmount(amount),
  currency,
  clientReferenceId: payoutId,
  customerMessage: "Shelf153 payout",
  metadata: [{ sellerId }],
});

export async function requestPawaPayPayout(input) {
  const { data } = await postFinancialRequest("/v2/payouts", buildPawaPayPayout(input));
  return data;
}

export async function getPawaPayPayoutStatus(payoutId) {
  const { data } = await client.get(`/v2/payouts/${payoutId}`, {
    headers: authorizationHeaders(),
  });
  return data;
}

export const buildPawaPayRefund = ({ refundId, depositId, amount, currency, orderId }) => ({
  refundId,
  depositId,
  amount: formatPawaPayAmount(amount),
  currency,
  clientReferenceId: refundId,
  metadata: [{ orderId }],
});

export async function requestPawaPayRefund(input) {
  const { data } = await postFinancialRequest("/v2/refunds", buildPawaPayRefund(input));
  return data;
}

export async function getPawaPayRefundStatus(refundId) {
  const { data } = await client.get(`/v2/refunds/${refundId}`, {
    headers: authorizationHeaders(),
  });
  return data;
}

export const matchesStoredRefund = (refund, payload) => {
  const data = payload?.data ?? payload;
  return Boolean(
    data?.refundId === refund.id
    && data.currency === refund.provider_currency
    && sameAmount(data.amount, refund.provider_amount)
    && (!refund.provider || data.recipient?.accountDetails?.provider === refund.provider)
    && (!refund.phone || normalizePhoneNumber(data.recipient?.accountDetails?.phoneNumber) === refund.phone),
  );
};

export const matchesStoredPayout = (payout, payload) => {
  const data = payload?.data ?? payload;
  return Boolean(
    data?.payoutId === payout.id
    && data.currency === payout.currency
    && data.recipient?.accountDetails?.provider === payout.provider
    && normalizePhoneNumber(data.recipient?.accountDetails?.phoneNumber) === payout.phone
    && sameAmount(data.amount, payout.amount),
  );
};
