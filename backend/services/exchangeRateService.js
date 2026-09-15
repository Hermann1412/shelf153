import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";

export async function getExchangeRate(sourceCurrency, destinationCurrency, at = new Date()) {
  const source = sourceCurrency.toUpperCase();
  const destination = destinationCurrency.toUpperCase();
  if (source === destination) return { rate: "1", source: "identity", id: null };
  const row = await prisma.exchangeRate.findFirst({
    where: {
      source_currency: source,
      destination_currency: destination,
      active: true,
      effective_at: { lte: at },
    },
    orderBy: [{ effective_at: "desc" }, { created_at: "desc" }],
  });
  if (row) return { rate: String(row.rate), source: "database", id: row.id };
  if (source === "USD" && destination === "CDF") {
    const fallback = String(process.env.PAWAPAY_CDF_PER_USD || "").trim();
    if (/^\d+(\.\d{1,6})?$/.test(fallback) && Number(fallback) > 0) {
      return { rate: fallback, source: "environment-fallback", id: null };
    }
  }
  return null;
}

export async function createExchangeRate({
  sourceCurrency,
  destinationCurrency,
  rate,
  effectiveAt,
  createdBy,
}) {
  const source = sourceCurrency.toUpperCase();
  const destination = destinationCurrency.toUpperCase();
  if (source === destination || !["USD", "CDF"].includes(source) || !["USD", "CDF"].includes(destination)) {
    throw new ErrorHandler("Only USD/CDF exchange rates are supported.", 400);
  }
  if (!/^\d+(\.\d{1,6})?$/.test(String(rate)) || Number(rate) <= 0) {
    throw new ErrorHandler("Exchange rate must be a positive decimal with at most six decimals.", 400);
  }
  const date = new Date(effectiveAt || Date.now());
  if (Number.isNaN(date.getTime())) throw new ErrorHandler("Invalid effective date.", 400);
  return prisma.$transaction(async (tx) => {
    await tx.exchangeRate.updateMany({
      where: { source_currency: source, destination_currency: destination, active: true },
      data: { active: false },
    });
    return tx.exchangeRate.create({
      data: {
        source_currency: source,
        destination_currency: destination,
        rate: String(rate),
        effective_at: date,
        created_by: createdBy,
      },
    });
  }, { isolationLevel: "Serializable" });
}
