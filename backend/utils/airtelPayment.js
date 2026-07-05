import database from "../database/db.js";
import { v4 as uuidv4 } from "uuid";
import { requestAirtelCollection } from "./airtelMoney.js";

export async function initiatePayment(orderId, totalPrice, phone) {
  try {
    await requestAirtelCollection({
      transactionId: orderId,
      amount: totalPrice,
      phone,
    });

    await database.query(
      "INSERT INTO payments (id, order_id, payment_type, payment_status, transaction_id) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), orderId, "Airtel Money", "Pending", orderId]
    );

    return { success: true, transactionId: orderId };
  } catch (error) {
    console.error("Payment Error:", error.response?.data || error.message);
    return { success: false, message: "Payment Failed." };
  }
}
