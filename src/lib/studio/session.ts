import { cookies } from "next/headers";

const STUDIO_SESSION_COOKIE = "bluevolt_studio_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 2; // 2 hours

export interface StudioSession {
  email: string;
  expiresAt: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("FATAL: AUTH_SECRET environment variable must be set.");
  }
  return secret;
}

function encode(value: string): string {
  return toBase64Url(new TextEncoder().encode(value));
}

function decode(value: string): string {
  return new TextDecoder().decode(fromBase64Url(value));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createStudioSessionToken(email: string): Promise<string> {
  const session: StudioSession = {
    email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const payload = encode(JSON.stringify(session));
  return `${payload}.${await sign(payload)}`;
}

export async function readStudioSessionToken(token?: string): Promise<StudioSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload);
  if (signature !== expected) return null;

  try {
    const session = JSON.parse(decode(payload)) as StudioSession;
    if (!session.expiresAt || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getStudioSession(): Promise<StudioSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_SESSION_COOKIE)?.value;
  return readStudioSessionToken(token);
}

export async function setStudioSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(STUDIO_SESSION_COOKIE, await createStudioSessionToken(email), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export async function clearStudioSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STUDIO_SESSION_COOKIE);
}
