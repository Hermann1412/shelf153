import "dotenv/config";
import axios from "axios";

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

export const normalizePhoneNumber = (phone) => String(phone || "").replace(/\D/g, "");
export const extractPawaPayStatus = (payload) => payload?.data?.status ?? payload?.status;

export const buildPawaPayDeposit = ({ depositId, amount, phone, provider, currency }) => ({
  depositId,
  payer: {
    type: "MMO",
    accountDetails: { phoneNumber: normalizePhoneNumber(phone), provider },
  },
  amount: Number(amount).toFixed(2),
  currency,
  clientReferenceId: depositId,
  customerMessage: "Shelf153 order",
  metadata: [{ orderId: depositId }],
});

export async function requestPawaPayDeposit({ depositId, amount, phone, provider, currency }) {
  const { data } = await client.post(
    "/v2/deposits",
    buildPawaPayDeposit({ depositId, amount, phone, provider, currency }),
    { headers: authorizationHeaders() },
  );
  return data;
}

export async function getPawaPayDepositStatus(depositId) {
  const response = await client.get(`/v2/deposits/${depositId}`, {
    headers: authorizationHeaders(),
  });
  return response.data;
}
