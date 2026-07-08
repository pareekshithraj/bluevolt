export function friendlyEmployeeError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (
    lower.includes("prisma") ||
    lower.includes("database") ||
    lower.includes("can't reach database") ||
    lower.includes("connection") ||
    lower.includes("supabase.co") ||
    lower.includes("neon.tech") ||
    lower.includes("timeout") ||
    lower.includes("p1001")
  ) {
    return "The employee portal is temporarily unavailable. Please try again in a minute.";
  }

  if (lower.includes("employee login required")) {
    return "Please log in again to continue.";
  }

  if (lower.includes("inactive")) {
    return "This employee account is inactive.";
  }

  return fallback;
}
