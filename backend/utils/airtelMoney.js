import axios from "axios";

const BASE_URL = process.env.AIRTEL_BASE_URL || "https://openapiuat.airtel.africa";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const { data } = await axios.post(`${BASE_URL}/auth/oauth2/token`, {
    client_id: process.env.AIRTEL_CLIENT_ID,
    client_secret: process.env.AIRTEL_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export async function requestAirtelCollection({ transactionId, amount, phone }) {
  const token = await getAccessToken();
  const country = process.env.AIRTEL_COUNTRY;
  const currency = process.env.AIRTEL_CURRENCY;

  const { data } = await axios.post(
    `${BASE_URL}/merchant/v1/payments/`,
    {
      reference: "Shelf153 Order Payment",
      subscriber: { country, currency, msisdn: phone },
      transaction: { amount, country, currency, id: transactionId },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Country": country,
        "X-Currency": currency,
        "Content-Type": "application/json",
        Accept: "*/*",
      },
    }
  );

  return data;
}

export async function getAirtelTransactionStatus(transactionId) {
  const token = await getAccessToken();
  const country = process.env.AIRTEL_COUNTRY;
  const currency = process.env.AIRTEL_CURRENCY;

  const { data } = await axios.get(
    `${BASE_URL}/standard/v1/payments/${transactionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Country": country,
        "X-Currency": currency,
      },
    }
  );

  return data;
}
