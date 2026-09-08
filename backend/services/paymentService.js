import prisma from "../database/db.js";

export async function transitionPayment(orderId, nextStatus, providerPayload = null) {
  if (!["Paid", "Failed"].includes(nextStatus)) {
    throw new Error(`Unsupported payment status: ${nextStatus}`);
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { order_id: orderId },
      include: { order: { include: { order_items: true } } },
    });
    if (!payment) return null;
    if (payment.payment_status !== "Pending") return { payment, changed: false };

    const claimed = await tx.payment.updateMany({
      where: { order_id: orderId, payment_status: "Pending" },
      data: { payment_status: nextStatus, provider_payload: providerPayload, processed_at: new Date() },
    });
    if (claimed.count === 0) return { payment, changed: false };

    if (nextStatus === "Paid") {
      await tx.order.update({
        where: { id: orderId },
        data: { paid_at: new Date(), stock_reserved: false },
      });
    } else if (payment.order.stock_reserved) {
      for (const item of payment.order.order_items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { stock_reserved: false } });
    }

    return { payment: { ...payment, payment_status: nextStatus }, changed: true };
  }, { isolationLevel: "Serializable" });
}
