const SESSION_COOKIE_NAME = "stores24_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface Stores24SessionPayload {
  userId: string;
  organizationId: string;
  storeId: string;
  storeName: string;
  username: string;
  name: string;
  role: string;
  expiresAt: number;
}

function getSessionSecret(): string {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "bluevolt-dev-session-secret";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function signValue(value: string): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(input: {
  userId: string;
  organizationId: string;
  storeId: string;
  storeName: string;
  username: string;
  name: string;
  role: string;
}): Promise<{ token: string; session: Stores24SessionPayload }> {
  const session: Stores24SessionPayload = {
    ...input,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const signature = await signValue(payload);

  return {
    token: `${payload}.${signature}`,
    session,
  };
}

export async function readSessionToken(token: string | undefined): Promise<Stores24SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(payload);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(fromBase64Url(payload));
    const session = JSON.parse(json) as Stores24SessionPayload;

    if (!session.expiresAt || session.expiresAt <= Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getSessionDurationMs(): number {
  return SESSION_DURATION_MS;
}
