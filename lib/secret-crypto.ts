import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getEncryptionKey() {
  const secret =
    process.env.SETTINGS_COOKIE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    "local-development-openai-key-cookie-secret";

  return createHash("sha256").update(secret).digest();
}

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [toBase64Url(iv), toBase64Url(tag), toBase64Url(encrypted)].join(".");
}

export function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) return "";

  try {
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), fromBase64Url(ivValue));
    decipher.setAuthTag(fromBase64Url(tagValue));
    const decrypted = Buffer.concat([decipher.update(fromBase64Url(encryptedValue)), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}
