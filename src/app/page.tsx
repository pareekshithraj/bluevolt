import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import FloatingHeroWindows from "@/components/FloatingHeroWindows";
import StatsSection from "@/components/StatsSection";
import { ArrowRight } from "lucide-react";

export default async function Home() {
  const host = (await headers()).get("host")?.toLowerCase() ?? "";
  const stores24External = "https://stores24.bluevolt.group";

  // Ensure stores24 subdomain root never renders the main BlueVolt landing page.
  if (host.startsWith("stores24.")) {
    redirect(stores24External);
  }

  return (
    <main>
      
      {/* --- PREMIUM LUXURY HERO SECTION --- */}
      <div className="hero-wrapper" style={{ 
        padding: "80px 24px 60px 24px", 
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh"
      }}>
        
        {/* Subtle background grid pattern */}
        <div className="structural-grid-overlay" style={{ pointerEvents: "none" }}></div>
        
        {/* Elegant blurred background glow blobs */}
        <div className="hero-glow-blob-1" style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          width: "min(680px, 95vw)",
          height: "320px",
          background: "radial-gradient(circle, rgba(99, 91, 255, 0.16) 0%, rgba(14, 165, 233, 0.06) 50%, transparent 100%)",
          filter: "blur(100px)",
          pointerEvents: "none",
          zIndex: 1
        }} />
        <div className="hero-glow-blob-2" style={{
          position: "absolute",
          top: "25%",
          left: "20%",
          width: "min(350px, 80vw)",
          height: "280px",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 80%)",
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 1
        }} />

        <div className="hero-vignette-editorial" style={{ zIndex: 2 }}></div>

        <section className="hero" style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", flex: 1 }}>
          {/* Centered SaaS Hero Layout (inspired by Untitled UI) */}
          <div className="hero-layout-centered" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", flex: 1 }}>
            
            {/* Centered SaaS Copywriting & Action Buttons */}
            <div className="hero-text-container" style={{ textAlign: "center", padding: 0, background: "transparent", backdropFilter: "none", margin: 0, maxWidth: "800px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <Reveal delay={0.1}>
                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
                  <span style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "0.5rem", 
                    borderRadius: "9999px", 
                    padding: "0.45rem 1.25rem", 
                    border: "1px solid rgba(99, 91, 255, 0.18)", 
                    background: "rgba(99, 91, 255, 0.06)", 
                    fontSize: "0.82rem", 
                    color: "#635bff", 
                    fontWeight: 600,
                    letterSpacing: "0.02em", 
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)"
                  }}>
                    <span style={{ color: "#f59e0b" }}>✨</span> Introducing BlueVolt Studio
                  </span>
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <h1 className="editorial-h1" style={{ 
                  textAlign: "center", 
                  textWrap: "balance", 
                  lineHeight: 1.1, 
                  marginBottom: "1.5rem"
                }}>
                  The workspace for next-gen digital operations.
                </h1>
              </Reveal>

              <Reveal delay={0.3}>
                <p className="editorial-p" style={{ 
                  textAlign: "center", 
                  margin: "0 auto 2.5rem auto", 
                  maxWidth: "700px", 
                  fontSize: "1.2rem", 
                  lineHeight: 1.65, 
                  color: "#475569",
                  fontWeight: 400
                }}>
                  BlueVolt Studio orchestrates education, e-commerce, healthcare diagnostics, events, and modern SaaS networks in a single unified platform. Built to automate complex workflows and accelerate growth.
                </p>
              </Reveal>

              <Reveal delay={0.4} width="100%">
                <div className="editorial-cta-row" style={{ justifyContent: "center", gap: "1.5rem", width: "100%", display: "flex", alignItems: "center" }}>
                  <Link href="/studio" className="firebase-btn-primary btn-pill" style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "8px",
                    background: "linear-gradient(135deg, #635bff 0%, #4f46e5 100%)",
                    color: "#ffffff",
                    border: "none",
                    boxShadow: "0 4px 14px rgba(99, 91, 255, 0.3)",
                    padding: "1rem 2.5rem",
                    fontWeight: 600,
                    borderRadius: "9999px"
                  }}>
                    Open BlueVolt Studio <ArrowRight size={16} />
                  </Link>
                  <Link href="/contact" className="firebase-btn-secondary btn-pill" style={{
                    borderColor: "rgba(99, 91, 255, 0.25)",
                    color: "#4f46e5",
                    background: "rgba(99, 91, 255, 0.03)",
                    padding: "1rem 2.5rem",
                    fontWeight: 600,
                    borderRadius: "9999px"
                  }}>
                    Board Inquiry
                  </Link>
                </div>
              </Reveal>
            </div>

          </div>

        </section>
      </div>

      {/* --- PRODUCT SHOWCASE WINDOWS SECTION (SCROLL REVEAL) --- */}
      <div className="showcase-section" style={{
        position: "relative",
        padding: "0 24px 6rem 24px",
        background: "var(--bg-base)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        overflow: "hidden"
      }}>
        <div className="structural-grid-overlay" style={{ opacity: 0.12, pointerEvents: "none" }}></div>
        <div className="hero-vignette-editorial" style={{ transform: "rotate(180deg)", top: "-100px", height: "200px", pointerEvents: "none" }}></div>
        
        <div style={{ maxWidth: "1400px", width: "100%", position: "relative", zIndex: 10 }}>
          <Reveal delay={0.2} width="100%">
            <FloatingHeroWindows />
          </Reveal>
        </div>
      </div>

      {/* --- ANIMATED STATS METRICS BAR --- */}
      <StatsSection />

      {/* --- EDITORIAL CAPABILITIES SECTION: SOLID PURPLE THEME --- */}
      <section className="capabilities-purple-section" id="capabilities" style={{ overflow: "hidden" }}>
        
        <div className="section-structural-title" style={{ textAlign: "center", display: "block", marginBottom: "5rem" }}>
          <Reveal delay={0.1}>
            <span className="mono-tag" style={{ color: "rgba(255, 255, 255, 0.7)", letterSpacing: "0.15em" }}>OPERATIONAL UTILITIES</span>
          </Reveal>
          <Reveal delay={0.2}>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, margin: "1rem 0" }}>Innovative Solutions</h2>
          </Reveal>
          <Reveal delay={0.3}>
            <p style={{ margin: "0 auto", maxWidth: "600px" }}>
              Clean, intuitive, and secure campus utilities designed to simplify administration and student management workflows.
            </p>
          </Reveal>
        </div>

        <div className="bento-grid">
          
          {/* Capability 1 */}
          <Reveal delay={0.2} width="100%">
            <div className="bento-item" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="bento-content">
                <div className="bento-index">[ 01 ]</div>
                <h3 className="card-title">Unified Records</h3>
                <p className="card-text">
                  Synchronize student profiles, academic grading, and staff records across multiple locations in a single central database.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "2rem" }}>
                <div className="mono-tag" style={{ color: "#635bff" }}>CAP.01 / RECORDS</div>
                <div className="bento-arrow-btn">↗</div>
              </div>
            </div>
          </Reveal>

          {/* Capability 2 */}
          <Reveal delay={0.3} width="100%">
            <div className="bento-item" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="bento-content">
                <div className="bento-index">[ 02 ]</div>
                <h3 className="card-title">Granular Security</h3>
                <p className="card-text">
                  Bank-grade data encryption and custom role-based permissions ensure student profiles and financial statements stay private and secure.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "2rem" }}>
                <div className="mono-tag" style={{ color: "#635bff" }}>CAP.02 / SECURITY</div>
                <div className="bento-arrow-btn">↗</div>
              </div>
            </div>
          </Reveal>

          {/* Capability 3 */}
          <Reveal delay={0.4} width="100%">
            <div className="bento-item" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="bento-content">
                <div className="bento-index">[ 03 ]</div>
                <h3 className="card-title">Automated Invoicing</h3>
                <p className="card-text">
                  Generate digital fee notices, track monthly late payments, and deliver receipts to parents instantly.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "2rem" }}>
                <div className="mono-tag" style={{ color: "#635bff" }}>CAP.03 / FINANCE</div>
                <div className="bento-arrow-btn">↗</div>
              </div>
            </div>
          </Reveal>

        </div>
      </section>





      {/* --- ECOSYSTEM PRODUCTS SECTION: TRUST STRIP FASHION --- */}
      <section className="logo-strip-section" id="ecosystem">
        <div className="logo-strip-title">
          <Reveal delay={0.1}>
            <span>Trusted & Powered by Leading Institutions</span>
          </Reveal>
        </div>

        <div className="logo-strip-row">
          
          {/* BlueVolt */}
          <Reveal delay={0.1}>
            <a href="/about" className="logo-strip-item">
              <Image 
                src="/Assets/Logos/BLUEVOLT.png" 
                alt="BlueVolt Logo" 
                width={200} 
                height={55} 
                style={{ objectFit: 'contain', width: 'auto', height: '72px' }} 
                unoptimized 
              />
            </a>
          </Reveal>

          {/* Schools24 */}
          <Reveal delay={0.2}>
            <a href="https://schools24.in" target="_blank" rel="noopener noreferrer" className="logo-strip-item">
              <Image 
                src="/Assets/Logos/SCHOOLS24.png" 
                alt="Schools24 Logo" 
                width={200} 
                height={55} 
                style={{ objectFit: 'contain', width: 'auto', height: '72px' }} 
                unoptimized 
              />
            </a>
          </Reveal>

          {/* Stores24 */}
          <Reveal delay={0.3}>
            <a href="https://stores24.bluevolt.group" target="_blank" rel="noopener noreferrer" className="logo-strip-item">
              <Image 
                src="/Assets/Logos/STORES24.png" 
                alt="Stores24 Logo" 
                width={200} 
                height={55} 
                style={{ objectFit: 'contain', width: 'auto', height: '72px' }} 
                unoptimized 
              />
            </a>
          </Reveal>

          {/* Events24 */}
          <Reveal delay={0.4}>
            <a href="/products/events24" className="logo-strip-item">
              <Image 
                src="/Assets/Logos/EVENTS24.png" 
                alt="Events24 Logo" 
                width={200} 
                height={55} 
                style={{ objectFit: 'contain', width: 'auto', height: '72px' }} 
                unoptimized 
              />
            </a>
          </Reveal>

          {/* Hoscore */}
          <Reveal delay={0.5}>
            <a href="https://hoscore.in" target="_blank" rel="noopener noreferrer" className="logo-strip-item">
              <Image 
                src="/Assets/Logos/HOSCORE.png" 
                alt="Hoscore Logo" 
                width={200} 
                height={55} 
                style={{ objectFit: 'contain', width: 'auto', height: '72px' }} 
                unoptimized 
              />
            </a>
          </Reveal>

        </div>
      </section>

    </main>
  );
}
