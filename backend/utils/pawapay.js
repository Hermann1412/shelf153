import axios from "axios";

const BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.sandbox.pawapay.io";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAWAPAY_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function requestPawapayDeposit({ depositId, amount, currency, phone, provider }) {
  const { data } = await axios.post(
    `${BASE_URL}/v2/deposits`,
    {
      depositId,
      amount: String(amount),
      currency,
      payer: {
        type: "MMO",
        accountDetails: { phoneNumber: phone, provider },
      },
      customerMessage: "Shelf153 order payment",
    },
    { headers: authHeaders() }
  );

  return data;
}

export async function getPawapayDepositStatus(depositId) {
  const { data } = await axios.get(`${BASE_URL}/v2/deposits/${depositId}`, {
    headers: authHeaders(),
  });

  return data;
}
