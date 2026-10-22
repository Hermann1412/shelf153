import { requestPawaPayRefund } from "./pawaPay.js";
import { financialLog } from "./financialLogger.js";

export async function initiateRefund(input, requestRefund = requestPawaPayRefund) {
  try {
    const response = await requestRefund(input);
    if (["ACCEPTED", "DUPLICATE_IGNORED"].includes(response.status)) {
      return { success: true, providerResponse: response };
    }
    return { success: false, definitive: response.status === "REJECTED", providerResponse: response };
  } catch (error) {
    financialLog("warn", "pawapay.refund.initiation_uncertain", {
      refundId: input.refundId,
      orderId: input.orderId,
      error: error.message,
    });
    return {
      success: false,
      definitive: false,
      providerResponse: error.response?.data || null,
    };
  }
}
