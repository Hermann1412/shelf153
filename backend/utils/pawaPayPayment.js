import { requestPawaPayDeposit } from "./pawaPay.js";

export async function initiatePayment(depositId, totalPrice, phone, provider, currency) {
  try {
    const response = await requestPawaPayDeposit({ depositId, amount: totalPrice, phone, provider, currency });
    if (["ACCEPTED", "DUPLICATE_IGNORED"].includes(response.status)) {
      return { success: true, transactionId: depositId, providerResponse: response };
    }
    return { success: false, definitive: response.status === "REJECTED", providerResponse: response };
  } catch (error) {
    console.error("pawaPay payment error:", error.response?.data || error.message);
    const status = error.response?.status;
    return {
      success: false,
      definitive: Number.isInteger(status) && status >= 400 && status < 500,
      providerResponse: error.response?.data || null,
      message: "Payment initiation could not be confirmed.",
    };
  }
}
