import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import {
  extractPawaPayStatus,
  getPawaPayRefundStatus,
  matchesStoredRefund,
} from "../utils/pawaPay.js";
import { submitRefund, transitionRefund } from "../services/refundService.js";

export const publicRefundSelect = {
  id: true,
  external_reference: true,
  payment_id: true,
  order_item_id: true,
  gross_amount: true,
  currency: true,
  provider_amount: true,
  provider_currency: true,
  provider: true,
  phone: true,
  status: true,
  failure_code: true,
  failure_message: true,
  processed_at: true,
  created_at: true,
  updated_at: true,
};

export const createRefund = catchAsyncErrors(async (req, res, next) => {
  const grossAmount = String(req.body?.grossAmount || "").trim();
  const paymentFeeRefund = String(req.body?.paymentFeeRefund || "0").trim();
  const externalReference = String(req.body?.externalReference || "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(grossAmount) || Number(grossAmount) <= 0
      || !/^\d+(\.\d{1,2})?$/.test(paymentFeeRefund)) {
    return next(new ErrorHandler("Provide valid refund amounts with at most two decimals.", 400));
  }
  const result = await submitRefund({
    orderId: req.params.orderId,
    orderItemId: req.params.orderItemId,
    externalReference,
    grossAmount,
    paymentFeeRefund,
    initiatedBy: req.user.id,
  });
  res.status(result.uncertain ? 202 : result.refund.status === "Failed" ? 409 : 201).json({
    success: result.refund.status !== "Failed",
    uncertain: Boolean(result.uncertain),
    changed: result.changed,
    refund: Object.fromEntries(Object.keys(publicRefundSelect).map((key) => [key, result.refund[key]])),
  });
});

export const fetchRefunds = catchAsyncErrors(async (_req, res) => {
  const refunds = await prisma.saleRefund.findMany({
    select: publicRefundSelect,
    orderBy: { created_at: "desc" },
    take: 200,
  });
  res.status(200).json({ success: true, refunds });
});

export const checkRefundStatus = catchAsyncErrors(async (req, res, next) => {
  let refund = await prisma.saleRefund.findUnique({ where: { id: req.params.refundId } });
  if (!refund) return next(new ErrorHandler("Refund not found.", 404));
  if (!["Completed", "Failed"].includes(refund.status)) {
    try {
      const payload = await getPawaPayRefundStatus(refund.id);
      await prisma.saleRefund.update({
        where: { id: refund.id },
        data: { last_checked_at: new Date(), check_attempts: { increment: 1 } },
      });
      if (payload?.status === "FOUND") {
        if (!matchesStoredRefund(refund, payload)) return next(new ErrorHandler("Refund provider data mismatch.", 502));
        const status = extractPawaPayStatus(payload);
        if (["COMPLETED", "FAILED", "PROCESSING", "ENQUEUED"].includes(status)) {
          refund = (await transitionRefund(refund.id, status, payload)).refund;
        }
      }
    } catch (error) {
      if (error instanceof ErrorHandler) return next(error);
    }
  }
  res.status(200).json({ success: true, refundStatus: refund.status });
});
