import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-promijeni";
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type TokenPayload = {
  userId: string;
  email: string;
  exp?: number;
};

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;

  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(originalHash, "hex"),
    Buffer.from(hash, "hex")
  );
}

export function createToken(payload: { userId: string; email: string }) {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE_SECONDS,
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as TokenPayload;

    if (!payload.userId || !payload.email) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
