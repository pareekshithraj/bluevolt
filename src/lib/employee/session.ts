import { cookies } from "next/headers";

const EMPLOYEE_SESSION_COOKIE = "bluevolt_employee_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 10;

export interface EmployeeSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  expiresAt: number;
}

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "bluevolt-employee-session-secret";
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

export function getEmployeeSessionCookieName(): string {
  return EMPLOYEE_SESSION_COOKIE;
}

export async function createEmployeeSessionToken(input: Omit<EmployeeSession, "expiresAt">): Promise<string> {
  const session: EmployeeSession = {
    ...input,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const payload = encode(JSON.stringify(session));
  return `${payload}.${await sign(payload)}`;
}

export async function readEmployeeSessionToken(token?: string): Promise<EmployeeSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload);
  if (signature !== expected) return null;

  try {
    const session = JSON.parse(decode(payload)) as EmployeeSession;
    if (!session.expiresAt || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const cookieStore = await cookies();
  return readEmployeeSessionToken(cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value);
}

export async function setEmployeeSession(input: Omit<EmployeeSession, "expiresAt">) {
  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_SESSION_COOKIE, await createEmployeeSessionToken(input), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export async function clearEmployeeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(EMPLOYEE_SESSION_COOKIE);
}

export function hasEmployeeRole(session: EmployeeSession, roles: string[]): boolean {
  return session.role === "super_admin" || roles.includes(session.role);
}
