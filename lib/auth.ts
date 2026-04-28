import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-promijeni";

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
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}