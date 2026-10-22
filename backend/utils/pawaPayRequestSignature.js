import { constants, createHash, createPrivateKey, sign } from "crypto";

const signerOptions = (algorithm, key) => {
  if (algorithm === "rsa-pss-sha512") {
    return { digest: "sha512", key: { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64 } };
  }
  if (algorithm === "rsa-v1_5-sha256") return { digest: "sha256", key };
  if (algorithm === "ecdsa-p256-sha256") return { digest: "sha256", key };
  if (algorithm === "ecdsa-p384-sha384") return { digest: "sha384", key };
  throw new Error("Unsupported PAWAPAY_SIGNATURE_ALGORITHM.");
};

export const signPawaPayFinancialRequest = ({ method, baseUrl, path, body }) => {
  if (process.env.PAWAPAY_SIGN_FINANCIAL_REQUESTS !== "true") return {};
  const privateKeyPem = process.env.PAWAPAY_SIGNING_PRIVATE_KEY;
  const keyId = process.env.PAWAPAY_SIGNING_KEY_ID;
  const algorithm = process.env.PAWAPAY_SIGNATURE_ALGORITHM || "ecdsa-p256-sha256";
  if (!privateKeyPem || !keyId) throw new Error("pawaPay request signing key and key ID are required.");

  const contentType = "application/json; charset=UTF-8";
  const contentDigest = `sha-512=:${createHash("sha512").update(body).digest("base64")}:`;
  const signatureDate = new Date().toISOString();
  const created = Math.floor(Date.now() / 1000);
  const expires = created + 60;
  const components = ["@method", "@authority", "@path", "signature-date", "content-digest", "content-type"];
  const signatureParams = `(${components.map((item) => `"${item}"`).join(" ")});alg="${algorithm}";keyid="${keyId}";created=${created};expires=${expires}`;
  const authority = new URL(baseUrl).host;
  const values = {
    "@method": method.toUpperCase(),
    "@authority": authority,
    "@path": path,
    "signature-date": signatureDate,
    "content-digest": contentDigest,
    "content-type": contentType,
  };
  const signatureBase = [
    ...components.map((component) => `"${component}": ${values[component]}`),
    `"@signature-params": ${signatureParams}`,
  ].join("\n");
  const privateKey = createPrivateKey(privateKeyPem.replace(/\\n/g, "\n"));
  const options = signerOptions(algorithm, privateKey);
  const signature = sign(options.digest, Buffer.from(signatureBase), options.key).toString("base64");
  return {
    "Content-Type": contentType,
    "Content-Digest": contentDigest,
    "Signature-Date": signatureDate,
    Signature: `sig-pp=:${signature}:`,
    "Signature-Input": `sig-pp=${signatureParams}`,
    "Accept-Signature": "rsa-pss-sha512,ecdsa-p256-sha256,rsa-v1_5-sha256,ecdsa-p384-sha384",
    "Accept-Digest": "sha-256,sha-512",
  };
};
