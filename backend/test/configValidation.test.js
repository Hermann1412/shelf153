import test from "node:test";
import assert from "node:assert/strict";
import { validateProductionConfig } from "../utils/configValidation.js";

const BASE = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://db",
  JWT_SECRET_KEY: "secret",
  FRONTEND_URL: "https://shop.example",
  DASHBOARD_URL: "https://admin.example",
  PLATFORM_COMMISSION_RATE: "0.07",
};

const withEnv = (values, run) => {
  const saved = { ...process.env };
  for (const key of ["PAWAPAY_BASE_URL", "PAWAPAY_API_TOKEN", "PAWAPAY_ALLOW_SANDBOX"]) delete process.env[key];
  Object.assign(process.env, values);
  try { run(); } finally { process.env = saved; }
};

test("production refuses the pawaPay sandbox unless test mode is explicitly allowed", () => {
  withEnv({ ...BASE, PAWAPAY_BASE_URL: "https://api.sandbox.pawapay.io", PAWAPAY_API_TOKEN: "token" }, () => {
    assert.throws(validateProductionConfig, /must not use sandbox/);
  });
  withEnv({ ...BASE, PAWAPAY_BASE_URL: "https://api.sandbox.pawapay.io", PAWAPAY_ALLOW_SANDBOX: "true" }, () => {
    assert.doesNotThrow(validateProductionConfig);
  });
});

test("live mode still requires a real pawaPay token and the commission rate", () => {
  withEnv({ ...BASE, PAWAPAY_BASE_URL: "https://api.pawapay.io" }, () => {
    assert.throws(validateProductionConfig, /PAWAPAY_API_TOKEN is required/);
  });
  withEnv({ ...BASE, PLATFORM_COMMISSION_RATE: "", PAWAPAY_ALLOW_SANDBOX: "true" }, () => {
    assert.throws(validateProductionConfig, /PLATFORM_COMMISSION_RATE is required/);
  });
});
