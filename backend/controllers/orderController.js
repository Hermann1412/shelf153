import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import { initiatePayment } from "../utils/airtelPayment.js";
import { getAirtelTransactionStatus } from "../utils/airtelMoney.js";
import { v4 as uuidv4 } from "uuid";

export const placeNewOrder = catchAsyncErrors(async (req, res, next) => {
  const { full_name, state, city, country, address, pincode, phone, orderedItems } = req.body;

  if (!full_name || !state || !city || !country || !address || !pincode || !phone) {
    return next(new ErrorHandler("Please provide complete shipping details.", 400));
  }

  const items = Array.isArray(orderedItems) ? orderedItems : JSON.parse(orderedItems);
  if (!items || items.length === 0) return next(new ErrorHandler("No items in cart.", 400));

  const productIds = items.map((item) => item.product.id);
  const placeholders = productIds.map(() => "?").join(", ");
  const { rows: products } = await database.query(
    `SELECT id, price, stock, name FROM products WHERE id IN (${placeholders})`,
    productIds
  );

  let total_price = 0;

  for (const item of items) {
    const product = products.find((p) => p.id === item.product.id);
    if (!product) return next(new ErrorHandler(`Product not found for ID: ${item.product.id}`, 404));
    if (item.quantity > product.stock) {
      return next(new ErrorHandler(`Only ${product.stock} units available for ${product.name}`, 400));
    }
    total_price += product.price * item.quantity;
  }

  const tax_price = 0.18;
  const shipping_price = total_price >= 50 ? 0 : 2;
  total_price = Math.round(total_price + total_price * tax_price + shipping_price);

  const orderId = uuidv4();
  await database.query(
    "INSERT INTO orders (id, buyer_id, total_price, tax_price, shipping_price) VALUES (?, ?, ?, ?, ?)",
    [orderId, req.user.id, total_price, tax_price, shipping_price]
  );

  for (const item of items) {
    const product = products.find((p) => p.id === item.product.id);
    await database.query(
      "INSERT INTO order_items (id, order_id, product_id, quantity, price, image, title) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), orderId, product.id, item.quantity, product.price, item.product.images?.[0]?.url || "", product.name]
    );
  }

  await database.query(
    "INSERT INTO shipping_info (id, order_id, full_name, state, city, country, address, pincode, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [uuidv4(), orderId, full_name, state, city, country, address, pincode, phone]
  );

  const paymentResponse = await initiatePayment(orderId, total_price, phone);
  if (!paymentResponse.success) return next(new ErrorHandler("Payment failed. Try again.", 500));

  res.status(200).json({
    success: true,
    message: "Order placed. Please confirm the Airtel Money payment request sent to your phone.",
    orderId,
    transactionId: paymentResponse.transactionId,
    total_price,
  });
});

export const checkPaymentStatus = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const { rows } = await database.query(
    "SELECT * FROM payments WHERE order_id = ?",
    [orderId]
  );
  if (!rows[0]) return next(new ErrorHandler("Payment not found.", 404));

  let payment = rows[0];

  if (payment.payment_status === "Pending") {
    try {
      const statusResponse = await getAirtelTransactionStatus(payment.transaction_id);
      const airtelStatus = statusResponse?.data?.transaction?.status;

      if (airtelStatus === "TS") {
        await database.query(
          "UPDATE payments SET payment_status = 'Paid' WHERE order_id = ?",
          [orderId]
        );
        await database.query("UPDATE orders SET paid_at = NOW() WHERE id = ?", [orderId]);
        payment.payment_status = "Paid";
      } else if (airtelStatus === "TF") {
        await database.query(
          "UPDATE payments SET payment_status = 'Failed' WHERE order_id = ?",
          [orderId]
        );
        payment.payment_status = "Failed";
      }
    } catch (error) {
      console.error("Airtel status check failed:", error.response?.data || error.message);
    }
  }

  res.status(200).json({ success: true, paymentStatus: payment.payment_status });
});

const buildFullOrder = async (orderId) => {
  const { rows: orderRows } = await database.query("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (!orderRows[0]) return null;
  const { rows: items } = await database.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
  const { rows: shipping } = await database.query("SELECT * FROM shipping_info WHERE order_id = ?", [orderId]);
  return { ...orderRows[0], order_items: items, shipping_info: shipping[0] || null };
};

export const fetchSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const order = await buildFullOrder(orderId);
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  res.status(200).json({ success: true, message: "Order fetched.", orders: order });
});

export const fetchMyOrders = catchAsyncErrors(async (req, res) => {
  const { rows: orders } = await database.query(
    "SELECT * FROM orders WHERE buyer_id = ? AND paid_at IS NOT NULL ORDER BY created_at DESC",
    [req.user.id]
  );

  if (orders.length === 0) {
    return res.status(200).json({ success: true, message: "All your orders are fetched.", myOrders: [] });
  }

  const ids = orders.map((o) => o.id);
  const ph = ids.map(() => "?").join(", ");

  const { rows: allItems } = await database.query(
    `SELECT * FROM order_items WHERE order_id IN (${ph})`, ids
  );
  const { rows: allShipping } = await database.query(
    `SELECT * FROM shipping_info WHERE order_id IN (${ph})`, ids
  );

  const myOrders = orders.map((o) => ({
    ...o,
    order_items: allItems.filter((i) => i.order_id === o.id),
    shipping_info: allShipping.find((s) => s.order_id === o.id) || null,
  }));

  res.status(200).json({ success: true, message: "All your orders are fetched.", myOrders });
});

export const fetchAllOrders = catchAsyncErrors(async (req, res) => {
  const { rows: orders } = await database.query(
    "SELECT * FROM orders WHERE paid_at IS NOT NULL ORDER BY created_at DESC"
  );

  if (orders.length === 0) {
    return res.status(200).json({ success: true, message: "All orders fetched.", orders: [] });
  }

  const ids = orders.map((o) => o.id);
  const ph = ids.map(() => "?").join(", ");

  const { rows: allItems } = await database.query(
    `SELECT * FROM order_items WHERE order_id IN (${ph})`, ids
  );
  const { rows: allShipping } = await database.query(
    `SELECT * FROM shipping_info WHERE order_id IN (${ph})`, ids
  );

  const result = orders.map((o) => ({
    ...o,
    order_items: allItems.filter((i) => i.order_id === o.id),
    shipping_info: allShipping.find((s) => s.order_id === o.id) || null,
  }));

  res.status(200).json({ success: true, message: "All orders fetched.", orders: result });
});

export const updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.body;
  if (!status) return next(new ErrorHandler("Provide a valid status for order.", 400));

  const { orderId } = req.params;
  const { rows } = await database.query("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (rows.length === 0) return next(new ErrorHandler("Invalid order ID.", 404));

  await database.query("UPDATE orders SET order_status = ? WHERE id = ?", [status, orderId]);
  const { rows: updated } = await database.query("SELECT * FROM orders WHERE id = ?", [orderId]);

  res.status(200).json({ success: true, message: "Order status updated.", updatedOrder: updated[0] });
});

export const deleteOrder = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const { rows } = await database.query("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (rows.length === 0) return next(new ErrorHandler("Invalid order ID.", 404));

  await database.query("DELETE FROM orders WHERE id = ?", [orderId]);
  res.status(200).json({ success: true, message: "Order deleted.", order: rows[0] });
});
