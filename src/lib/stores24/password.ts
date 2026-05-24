import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  if (storedPassword.startsWith("scrypt:")) {
    const [, salt, existingHash] = storedPassword.split(":");
    if (!salt || !existingHash) {
      return false;
    }

    const derivedHash = scryptSync(password, salt, 64);
    const existingBuffer = Buffer.from(existingHash, "hex");

    if (derivedHash.length !== existingBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedHash, existingBuffer);
  }

  return storedPassword === password;
}
