import Link from "next/link";

export default function NotFound() {
  return (
    <main className="premium-dark-mode" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", backgroundColor: "#050505" }}>
      <div className="glow-blob glow-blob-sunset" style={{ position: "absolute", borderRadius: "50%", width: "600px", height: "600px", top: "20%", left: "20%", opacity: 0.15, filter: "blur(120px)", pointerEvents: "none" }} />
      <div className="glow-blob glow-blob-neonblue" style={{ position: "absolute", borderRadius: "50%", width: "500px", height: "500px", bottom: "10%", right: "10%", opacity: 0.15, filter: "blur(120px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "2rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#00ff66", letterSpacing: "0.15em", marginBottom: "1.5rem" }}>
          ERRORCODE: 404_PAGE_NOT_FOUND
        </div>
        
        <h1 className="editorial-h1" style={{ fontSize: "clamp(3rem, 10vw, 7rem)", fontWeight: 800, margin: "0 0 1.5rem 0", lineHeight: 0.9 }}>
          <span className="text-fluid-gradient">Lost in space.</span>
        </h1>
        
        <p className="editorial-p" style={{ margin: "0 auto 3rem auto", maxWidth: "500px", fontSize: "1.1rem" }}>
          The requested system node or coordinate does not exist. It may have been relocated or archived.
        </p>

        <div>
          <Link href="/" className="firebase-btn-primary">
            Return to Core
          </Link>
        </div>
      </div>
    </main>
  );
}
