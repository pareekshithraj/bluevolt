import { NextResponse } from "next/server";
import { loginEmployee } from "@/app/actions/employee-portal";
import { createEmployeeSessionToken } from "@/lib/employee/session";

interface RateLimitRecord {
  timestamps: number[];
}

const failedAttempts = new Map<string, RateLimitRecord>();
const LIMIT = 3;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = failedAttempts.get(key);
  if (!record) return false;

  // Filter out expired timestamps
  const recentTimestamps = record.timestamps.filter(ts => now - ts < WINDOW_MS);
  failedAttempts.set(key, { timestamps: recentTimestamps });

  return recentTimestamps.length >= LIMIT;
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = failedAttempts.get(key) || { timestamps: [] };
  const recentTimestamps = record.timestamps.filter(ts => now - ts < WINDOW_MS);
  recentTimestamps.push(now);
  failedAttempts.set(key, { timestamps: recentTimestamps });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Extract client IP address
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
               request.headers.get("x-real-ip")?.trim() || 
               "127.0.0.1";

    const limitKey = `${ip}:${email}`;

    if (checkRateLimit(limitKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed attempts. Please wait 1 minute before trying again.",
        },
        { status: 429 }
      );
    }

    const result = await loginEmployee({ email, password });

    if (result.success && result.user) {
      // Clear rate limit history on success
      failedAttempts.delete(limitKey);

      const token = await createEmployeeSessionToken({
        userId: result.user.id.toString(),
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      });
      return NextResponse.json({
        success: true,
        token,
        redirectTo: result.redirectTo,
        user: result.user
      }, { status: 200 });
    }

    // Record failure
    recordFailedAttempt(limitKey);
    return NextResponse.json(result, { status: 400 });
  } catch (error) {
    console.error("Employee login API failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "The employee portal is temporarily unavailable. Please try again in a minute.",
      },
      { status: 503 },
    );
  }
}
