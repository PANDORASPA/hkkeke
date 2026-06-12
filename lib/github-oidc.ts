import { createPublicKey, createVerify } from "node:crypto";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_JWKS_URL = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;

type Jwk = {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type GitHubOidcClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  repository?: string;
  repository_owner?: string;
  ref?: string;
  event_name?: string;
  workflow?: string;
};

let cachedJwks: { keys: Jwk[]; expiresAt: number } | null = null;

export async function verifyGitHubOidcToken(token: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("GitHub OIDC token 格式不正確。");
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8")) as JwtHeader;
  const claims = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as GitHubOidcClaims;

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("GitHub OIDC token 簽名格式不受支援。");
  }

  const jwk = await findJwk(header.kid);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const valid = verifier.verify(createPublicKey({ key: jwk, format: "jwk" }), base64UrlDecode(encodedSignature));
  if (!valid) throw new Error("GitHub OIDC token 簽名驗證失敗。");

  validateClaims(claims);
  return claims;
}

function validateClaims(claims: GitHubOidcClaims) {
  const expectedRepository = process.env.GITHUB_OIDC_REPOSITORY || "PANDORASPA/hkkeke";
  const expectedAudience = process.env.GITHUB_OIDC_AUDIENCE || "hkkeke-auto-production";
  const now = Math.floor(Date.now() / 1000);

  if (claims.iss !== GITHUB_OIDC_ISSUER) {
    throw new Error("GitHub OIDC issuer 不正確。");
  }
  if (!audienceIncludes(claims.aud, expectedAudience)) {
    throw new Error("GitHub OIDC audience 不正確。");
  }
  if (claims.repository !== expectedRepository) {
    throw new Error("GitHub OIDC repository 不正確。");
  }
  if (claims.exp && claims.exp < now) {
    throw new Error("GitHub OIDC token 已過期。");
  }
  if (claims.nbf && claims.nbf > now + 30) {
    throw new Error("GitHub OIDC token 尚未生效。");
  }
}

function audienceIncludes(audience: string | string[] | undefined, expected: string) {
  if (Array.isArray(audience)) return audience.includes(expected);
  return audience === expected;
}

async function findJwk(kid: string) {
  const jwks = await getJwks();
  const jwk = jwks.keys.find((key) => key.kid === kid);
  if (!jwk) throw new Error("找不到 GitHub OIDC 簽名 key。");
  return jwk;
}

async function getJwks() {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks;
  const response = await fetch(GITHUB_JWKS_URL);
  if (!response.ok) throw new Error(`讀取 GitHub OIDC JWKS 失敗：HTTP ${response.status}`);
  const json = (await response.json()) as { keys: Jwk[] };
  cachedJwks = { keys: json.keys, expiresAt: Date.now() + 10 * 60 * 1000 };
  return cachedJwks;
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}
