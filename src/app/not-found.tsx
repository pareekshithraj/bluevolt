import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "5rem", fontWeight: 800, color: "#e5e7eb", lineHeight: 1, marginBottom: "1rem" }}>
          404
        </div>
        
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", margin: "0 0 0.75rem 0" }}>
          Page not found
        </h1>
        
        <p style={{ margin: "0 auto 2rem auto", maxWidth: "400px", fontSize: "1rem", color: "#6b7280" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link 
          href="/" 
          style={{ display: "inline-block", padding: "0.75rem 1.5rem", backgroundColor: "#2563eb", color: "#ffffff", borderRadius: "6px", textDecoration: "none", fontWeight: 500, fontSize: "0.95rem" }}
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}

