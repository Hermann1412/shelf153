import { requestPawaPayPayout } from "./pawaPay.js";

export async function initiatePayout(input, requestPayout = requestPawaPayPayout) {
  try {
    const response = await requestPayout(input);
    if (["ACCEPTED", "DUPLICATE_IGNORED"].includes(response.status)) {
      return { success: true, providerResponse: response };
    }
    return { success: false, definitive: response.status === "REJECTED", providerResponse: response };
  } catch (error) {
    console.error("pawaPay payout error:", error.response?.data || error.message);
    const providerResponse = error.response?.data || null;
    return {
      success: false,
      definitive: providerResponse?.status === "REJECTED",
      providerResponse,
    };
  }
}
