import { constants, createHash, createPublicKey, timingSafeEqual, verify } from "crypto";

const fail = (res) => res.status(401).json({ success: false, message: "Invalid pawaPay callback signature." });

const parseInput = (value) => {
  const match = String(value || "").match(/^([A-Za-z0-9_-]+)=\(([^)]*)\)(.*)$/);
  if (!match) return null;
  const components = [...match[2].matchAll(/"([^"]+)"/g)].map((part) => part[1]);
  const params = Object.fromEntries([...match[3].matchAll(/;([a-z]+)=(?:"([^"]+)"|(\d+))/g)]
    .map((part) => [part[1], part[2] ?? Number(part[3])]));
  return { label: match[1], components, params, signatureParams: `(${match[2]})${match[3]}` };
};

const digestMatches = (header, rawBody) => {
  const match = String(header || "").match(/^(sha-256|sha-512)=:([A-Za-z0-9+/=]+):$/i);
  if (!match) return false;
  const actual = createHash(match[1].toLowerCase().replace("-", "")).update(rawBody).digest();
  const expected = Buffer.from(match[2], "base64");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const signatureBytes = (header, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(header || "").match(new RegExp(`(?:^|[, ]+)${escaped}=:([A-Za-z0-9+/=]+):`));
  return match ? Buffer.from(match[1], "base64") : null;
};

const verifierOptions = (algorithm, key) => {
  if (algorithm === "rsa-pss-sha512") {
    return { digest: "sha512", key: { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64 } };
  }
  if (algorithm === "rsa-v1_5-sha256") return { digest: "sha256", key };
  if (algorithm === "ecdsa-p256-sha256") return { digest: "sha256", key };
  if (algorithm === "ecdsa-p384-sha384") return { digest: "sha384", key };
  return null;
};

export const requirePawaPayCallbackSignature = (req, res, next) => {
  if (process.env.PAWAPAY_REQUIRE_SIGNED_CALLBACKS !== "true") return next();
  try {
    const input = parseInput(req.get("signature-input"));
    const signature = input && signatureBytes(req.get("signature"), input.label);
    const publicKeyPem = process.env.PAWAPAY_CALLBACK_PUBLIC_KEY;
    const required = ["@method", "@authority", "@path", "signature-date", "content-digest", "content-type"];
    if (!input || !signature || !publicKeyPem || !required.every((component) => input.components.includes(component))) {
      return fail(res);
    }
    if (process.env.PAWAPAY_CALLBACK_KEY_ID && input.params.keyid !== process.env.PAWAPAY_CALLBACK_KEY_ID) return fail(res);
    const now = Math.floor(Date.now() / 1000);
    const skew = Number(process.env.PAWAPAY_SIGNATURE_CLOCK_SKEW_SECONDS || 300);
    if (!Number.isInteger(input.params.created) || !Number.isInteger(input.params.expires)
        || input.params.created > now + skew || input.params.expires < now - skew) return fail(res);
    const rawBody = req.rawBody || Buffer.alloc(0);
    if (!digestMatches(req.get("content-digest"), rawBody)) return fail(res);

    const authority = process.env.PAWAPAY_CALLBACK_AUTHORITY || req.get("host");
    const values = {
      "@method": req.method.toUpperCase(),
      "@authority": authority,
      "@path": req.originalUrl.split("?")[0],
      "signature-date": req.get("signature-date"),
      "content-digest": req.get("content-digest"),
      "content-type": req.get("content-type"),
    };
    const base = [
      ...input.components.map((component) => `"${component}": ${values[component]}`),
      `"@signature-params": ${input.signatureParams}`,
    ].join("\n");
    const key = createPublicKey(publicKeyPem.replace(/\\n/g, "\n"));
    const options = verifierOptions(input.params.alg, key);
    if (!options || !verify(options.digest, Buffer.from(base), options.key, signature)) return fail(res);
    return next();
  } catch {
    return fail(res);
  }
};
