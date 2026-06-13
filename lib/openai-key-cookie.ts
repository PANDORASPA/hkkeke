import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decryptSecret, encryptSecret } from "./secret-crypto";

const COOKIE_NAME = "__ai_girl_openai_key";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export function encryptOpenAIKey(apiKey: string) {
  return encryptSecret(apiKey);
}

export function decryptOpenAIKey(value: string) {
  return decryptSecret(value);
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
