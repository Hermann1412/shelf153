const required = (name, errors) => {
  const value = String(process.env[name] || "").trim();
  if (!value || value.startsWith("PASTE_") || value.startsWith("SET_")) errors.push(`${name} is required`);
};

export const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== "production") return;
  // Explicit test mode for a live site whose pawaPay account is not validated yet: the site
  // runs, but payments go to the pawaPay sandbox and no real money moves.
  const sandboxAllowed = process.env.PAWAPAY_ALLOW_SANDBOX === "true";
  const errors = [];
  for (const name of [
    "DATABASE_URL", "JWT_SECRET_KEY", "FRONTEND_URL", "DASHBOARD_URL", "PLATFORM_COMMISSION_RATE",
    ...(sandboxAllowed ? [] : ["PAWAPAY_BASE_URL", "PAWAPAY_API_TOKEN"]),
  ]) required(name, errors);
  if (sandboxAllowed) {
    console.warn("[config] PAWAPAY_ALLOW_SANDBOX=true: payments use the pawaPay sandbox, no real money is collected.");
  } else if (String(process.env.PAWAPAY_BASE_URL || "").includes("sandbox")) {
    errors.push("PAWAPAY_BASE_URL must not use sandbox in production (set PAWAPAY_ALLOW_SANDBOX=true to run in test mode)");
  }
  if (process.env.PAWAPAY_REQUIRE_SIGNED_CALLBACKS === "true") {
    for (const name of ["PAWAPAY_CALLBACK_PUBLIC_KEY", "PAWAPAY_CALLBACK_KEY_ID", "PAWAPAY_CALLBACK_AUTHORITY"]) required(name, errors);
  }
  if (process.env.PAWAPAY_SIGN_FINANCIAL_REQUESTS === "true") {
    for (const name of ["PAWAPAY_SIGNING_PRIVATE_KEY", "PAWAPAY_SIGNING_KEY_ID"]) required(name, errors);
  }
  if (errors.length) throw new Error(`Invalid production configuration: ${errors.join("; ")}`);
};
