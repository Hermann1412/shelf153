import { useEffect, useState } from "react";
import { axiosInstance } from "./axios";

// Product prices are typed in CDF and stored in USD (stored = typed / divisor).
// The backend owns the divisor (PRICE_INPUT_DIVISOR) and exposes it on GET /settings.
export const usePriceDivisor = () => {
  const [divisor, setDivisor] = useState(null);

  useEffect(() => {
    let active = true;
    axiosInstance
      .get("/settings")
      .then(({ data }) => {
        const value = Number(data.price_input_divisor);
        if (active && value > 0) setDivisor(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return divisor;
};
