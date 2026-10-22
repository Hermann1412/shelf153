import { requestPawaPayDeposit } from "./pawaPay.js";

export async function initiatePayment(
  depositId,
  totalPrice,
  phone,
  provider,
  currency,
  requestDeposit = requestPawaPayDeposit,
) {
  try {
    const response = await requestDeposit({ depositId, amount: totalPrice, phone, provider, currency });
    if (["ACCEPTED", "DUPLICATE_IGNORED"].includes(response.status)) {
      return { success: true, transactionId: depositId, providerResponse: response };
    }
    return { success: false, definitive: response.status === "REJECTED", providerResponse: response };
  } catch (error) {
    console.error("pawaPay payment error:", error.response?.data || error.message);
    const providerResponse = error.response?.data || null;
    return {
      success: false,
      definitive: providerResponse?.status === "REJECTED",
      providerResponse,
      message: "Payment initiation could not be confirmed.",
    };
  }
}
