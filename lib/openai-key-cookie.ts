import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "__ai_girl_openai_key";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

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

export function encryptOpenAIKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [toBase64Url(iv), toBase64Url(tag), toBase64Url(encrypted)].join(".");
}

export function decryptOpenAIKey(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) return "";

  try {
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), fromBase64Url(ivValue));
    decipher.setAuthTag(fromBase64Url(tagValue));
    const decrypted = Buffer.concat([
      decipher.update(fromBase64Url(encryptedValue)),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

export async function getOpenAIKeyFromCookie() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value ? decryptOpenAIKey(value) : "";
}

export function setOpenAIKeyCookie(response: NextResponse, apiKey: string) {
  response.cookies.set(COOKIE_NAME, encryptOpenAIKey(apiKey), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS
  });
}
