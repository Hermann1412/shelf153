const RATE_SCALE = 1_000_000n;

const normalizedDecimal = (value) => {
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`Invalid non-negative decimal: ${value}`);
  return text;
};

export const decimalToMinorUnits = (value) => {
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error(`Invalid decimal: ${value}`);
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = (negative ? text.slice(1) : text).split(".");
  const cents = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  const rounded = (fraction[2] || "0") >= "5" ? cents + 1n : cents;
  return negative ? -rounded : rounded;
};

export const minorUnitsToDecimal = (minorUnits) => {
  const value = BigInt(minorUnits);
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
};

export const parseCommissionRate = (value = process.env.PLATFORM_COMMISSION_RATE || "0.07") => {
  const [whole, fraction = ""] = normalizedDecimal(value).split(".");
  const millionths = BigInt(whole) * RATE_SCALE + BigInt((fraction + "000000").slice(0, 6));
  if (millionths < 0n || millionths > RATE_SCALE) throw new Error("PLATFORM_COMMISSION_RATE must be between 0 and 1.");
  return { decimal: `${millionths / RATE_SCALE}.${String(millionths % RATE_SCALE).padStart(6, "0")}`, millionths };
};

const divideRoundHalfUp = (numerator, denominator) =>
  (numerator + denominator / 2n) / denominator;

export const multiplyMinorUnitsByRateToWhole = (minorUnits, rateValue) => {
  const [whole, fraction = ""] = normalizedDecimal(rateValue).split(".");
  const scaledRate = BigInt(whole) * RATE_SCALE + BigInt((fraction + "000000").slice(0, 6));
  return divideRoundHalfUp(BigInt(minorUnits) * scaledRate, 100n * RATE_SCALE);
};

export const divideMinorUnitsByRate = (minorUnits, rateValue) => {
  const [whole, fraction = ""] = normalizedDecimal(rateValue).split(".");
  const scaledRate = BigInt(whole) * RATE_SCALE + BigInt((fraction + "000000").slice(0, 6));
  if (scaledRate <= 0n) throw new Error("Exchange rate must be positive.");
  return divideRoundHalfUp(BigInt(minorUnits) * RATE_SCALE, scaledRate);
};

export const calculateLineFinancials = ({ unitPrice, quantity, commissionRate }) => {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Quantity must be a positive integer.");
  const rate = parseCommissionRate(commissionRate);
  const grossMinor = decimalToMinorUnits(unitPrice) * BigInt(quantity);
  const commissionMinor = divideRoundHalfUp(grossMinor * rate.millionths, RATE_SCALE);
  const sellerMinor = grossMinor - commissionMinor;
  return {
    grossMinor,
    commissionMinor,
    sellerMinor,
    grossAmount: minorUnitsToDecimal(grossMinor),
    commissionAmount: minorUnitsToDecimal(commissionMinor),
    sellerAmount: minorUnitsToDecimal(sellerMinor),
    commissionRate: rate.decimal,
  };
};

// An item may carry its own `commissionRate` (e.g. "1" for the platform's own products).
export const calculateOrderFinancials = (items, commissionRate) => {
  const lines = items.map((item) => calculateLineFinancials({
    unitPrice: item.product.price,
    quantity: item.quantity,
    commissionRate: item.commissionRate ?? commissionRate,
  }));
  const totals = lines.reduce((sum, line) => ({
    grossMinor: sum.grossMinor + line.grossMinor,
    commissionMinor: sum.commissionMinor + line.commissionMinor,
    sellerMinor: sum.sellerMinor + line.sellerMinor,
  }), { grossMinor: 0n, commissionMinor: 0n, sellerMinor: 0n });
  return {
    lines,
    // The marketplace rate; per-line rates (which may differ) are stored on each order item.
    commissionRate: parseCommissionRate(commissionRate).decimal,
    grossSalesAmount: minorUnitsToDecimal(totals.grossMinor),
    grossCommission: minorUnitsToDecimal(totals.commissionMinor),
    sellerNetAmount: minorUnitsToDecimal(totals.sellerMinor),
  };
};

export const calculateCumulativeRefund = ({ grossAmount, previousRefunded, commissionRate }) => {
  const grossMinor = decimalToMinorUnits(grossAmount);
  const previousMinor = decimalToMinorUnits(previousRefunded);
  if (grossMinor <= 0n) throw new Error("Refund amount must be positive.");
  const rate = parseCommissionRate(commissionRate);
  const cumulativeGross = previousMinor + grossMinor;
  const previousCommission = divideRoundHalfUp(previousMinor * rate.millionths, RATE_SCALE);
  const cumulativeCommission = divideRoundHalfUp(cumulativeGross * rate.millionths, RATE_SCALE);
  const commissionMinor = cumulativeCommission - previousCommission;
  return {
    grossMinor,
    commissionMinor,
    sellerMinor: grossMinor - commissionMinor,
    grossAmount: minorUnitsToDecimal(grossMinor),
    commissionAmount: minorUnitsToDecimal(commissionMinor),
    sellerAmount: minorUnitsToDecimal(grossMinor - commissionMinor),
  };
};
