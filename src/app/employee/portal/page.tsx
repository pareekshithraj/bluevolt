import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmployeePortalData } from "@/app/actions/employee-portal";
import { getEmployeeSession } from "@/lib/employee/session";
import PortalClient from "./PortalClient";

export default async function EmployeePortalPage() {
  try {
    const data = await getEmployeePortalData();
    return <PortalClient initialData={data} />;
  } catch (error) {
    // A missing/invalid session is the only reason to send the user back to
    // login. Any other failure (transient DB timeout, schema issue) must NOT
    // bounce to login — that made a successful sign-in look broken.
    const session = await getEmployeeSession();
    if (!session) {
      redirect("/employee/login");
    }

    console.error("Employee portal failed to load", error);
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif", background: "#0b0b0f", color: "#e5e7eb" }}>
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>The portal is temporarily unavailable</h1>
          <p style={{ color: "#9ca3af", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            We couldn&apos;t load your workspace just now. This is usually a brief connection issue — please try again in a moment.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link href="/employee/portal" style={{ display: "inline-block", padding: "0.7rem 1.4rem", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 500, textDecoration: "none" }}>
              Retry
            </Link>
            <form action={async () => {
              "use server";
              const { clearEmployeeSession } = await import("@/lib/employee/session");
              await clearEmployeeSession();
              redirect("/employee/login");
            }}>
              <button type="submit" style={{ padding: "0.7rem 1.4rem", background: "transparent", color: "#9ca3af", border: "1px solid #374151", borderRadius: 6, fontWeight: 500, cursor: "pointer" }}>
                Log out
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }
}
