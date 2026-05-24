import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import InfrastructureGlobe from "@/components/InfrastructureGlobeDynamic";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import FuturisticHero3DWrapper from "@/components/FuturisticHero3DWrapper";
import FloatingHeroWindows from "@/components/FloatingHeroWindows";

export default async function Home() {
  const host = (await headers()).get("host")?.toLowerCase() ?? "";
  const stores24External = "https://stores24.bluevolt.group";

  // Ensure stores24 subdomain root never renders the main BlueVolt landing page.
  if (host.startsWith("stores24.")) {
    redirect(stores24External);
  }

  return (
    <main className="premium-dark-mode">
      
      {/* --- PREMIUM LUXURY HERO SECTION --- */}
      <div className="hero-wrapper">
        {/* Firebase Studio Inspired Warm Ambient Backlights (Massive Sunset Orange & Hot Purple) */}
        <div className="glow-blob glow-blob-firebase-left glow-blob-animated-1" style={{ width: "1100px", height: "900px", bottom: "-300px", left: "-200px", opacity: 0.95 }} />
        <div className="glow-blob glow-blob-firebase-right glow-blob-animated-2" style={{ width: "1000px", height: "900px", bottom: "-300px", right: "-150px", opacity: 0.9 }} />
        <div className="glow-blob glow-blob-neonblue glow-blob-animated-1" style={{ width: "700px", height: "700px", top: "-200px", left: "20%", opacity: 0.4 }} />

        <FuturisticHero3DWrapper />
        <div className="structural-grid-overlay"></div>
        <div className="hero-vignette-editorial"></div>

        <section className="hero">
          <div className="hero-layout-centered">
            <Reveal delay={0.1}>
              <div className="editorial-header-mono" style={{ justifyContent: "center", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ display: "inline-block", width: "7px", height: "7px", backgroundColor: "#00ff66", borderRadius: "50%", boxShadow: "0 0 10px #00ff66" }}></span>
                <span className="mono-tag" style={{ color: "#00ff66", fontWeight: 600 }}>SYSTEM: ACTIVE</span>
                <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
                <span className="mono-tag">NODE: BV_GROUPS_MAIN</span>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <h1 className="editorial-h1" style={{ textAlign: "center", textWrap: "balance", fontWeight: 700, position: "relative", zIndex: 30 }}>
                The full <span className="tech-code-badge">&#123;&#125;</span> stack
                <br />
                school workspace
              </h1>
            </Reveal>

            <Reveal delay={0.3}>
              <p className="editorial-p" style={{ textAlign: "center", margin: "0 auto 4rem auto", position: "relative", zIndex: 30 }}>
                Firebase Studio accelerates your entire development lifecycle with AI agents. Build backends, front ends, and mobile apps, all in one place.
              </p>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="editorial-cta-row" style={{ justifyContent: "center", marginBottom: "6rem", position: "relative", zIndex: 30 }}>
                <Link href="/studio" className="firebase-btn-primary">
                  Open BlueVolt Studio
                </Link>
                <Link href="/contact" className="firebase-btn-secondary">
                  Board Inquiry
                </Link>
              </div>
            </Reveal>

            {/* Cascading floating windows container centered directly below CTA buttons */}
            <Reveal delay={0.5} width="100%">
              <FloatingHeroWindows />
            </Reveal>
          </div>
        </section>
      </div>


      {/* --- EDITORIAL CAPABILITIES SECTION --- */}
      <section className="editorial-section" id="capabilities" style={{ overflow: "hidden" }}>
        {/* Dynamic Warm Ambient Backlights */}
        <div className="glow-blob glow-blob-solar glow-blob-animated-2" style={{ width: "950px", height: "950px", top: "20%", left: "55%", transform: "translate(-50%, -50%)", opacity: 0.9 }} />
        <div className="glow-blob glow-blob-cyberpink glow-blob-animated-1" style={{ width: "750px", height: "750px", bottom: "-200px", left: "-150px", opacity: 0.75 }} />

        <div className="section-structural-title">
          <Reveal delay={0.1}>
            <h2>Operational Capabilities</h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p>
              BLUEVOLT GROUPS operates at the convergence of high-availability enterprise services and scalable micro-architectures. We build platforms that optimize human capital and automate multi-tenant structures.
            </p>
          </Reveal>
        </div>

        <div className="bento-grid">
          
          {/* Capability 1 */}
          <Reveal delay={0.2} width="100%">
            <div className="bento-item">
              <div className="bento-content">
                <div className="bento-index">[ 01 ]</div>
                <h3 className="card-title">Global Architecture</h3>
                <p className="card-text">
                  Distributing and managing data streams across low-latency edge zones. Our platforms synchronize operations globally with microsecond precision.
                </p>
              </div>
              <div className="mono-tag" style={{ marginTop: '2rem' }}>CAP.01 / GLOBAL</div>
            </div>
          </Reveal>

          {/* Capability 2 */}
          <Reveal delay={0.3} width="100%">
            <div className="bento-item">
              <div className="bento-content">
                <div className="bento-index">[ 02 ]</div>
                <h3 className="card-title">Deterministic Integrity</h3>
                <p className="card-text">
                  Replacing speculative analytics with rule-level certainty. We guarantee zero compromise in critical multi-tenant data pipelines and secure systems.
                </p>
              </div>
              <div className="mono-tag" style={{ marginTop: '2rem' }}>CAP.02 / SECURITY</div>
            </div>
          </Reveal>

          {/* Capability 3 */}
          <Reveal delay={0.4} width="100%">
            <div className="bento-item">
              <div className="bento-content">
                <div className="bento-index">[ 03 ]</div>
                <h3 className="card-title">High-Velocity Operations</h3>
                <p className="card-text">
                  Accelerating workflow automation and enterprise supply logistics. Removing operational latency to drive rapid structural execution.
                </p>
              </div>
              <div className="mono-tag" style={{ marginTop: '2rem' }}>CAP.03 / VELOCITY</div>
            </div>
          </Reveal>

        </div>
      </section>


      {/* --- GEOSPATIAL INFRASTRUCTURE MAP --- */}
      <InfrastructureGlobe />


      {/* --- ECOSYSTEM PRODUCTS SECTION --- */}
      <section className="editorial-section" id="ecosystem" style={{ borderBottom: 'none', paddingBottom: '12rem', overflow: 'hidden' }}>
        {/* Warm Ambient Glowing Nebulae */}
        <div className="glow-blob glow-blob-sunset glow-blob-animated-1" style={{ width: "1050px", height: "1050px", bottom: "-350px", left: "-200px", opacity: 0.95 }} />
        <div className="glow-blob glow-blob-solar glow-blob-animated-2" style={{ width: "900px", height: "900px", top: "-150px", right: "-250px", opacity: 0.8 }} />
        <div className="glow-blob glow-blob-neonblue glow-blob-animated-1" style={{ width: "650px", height: "650px", top: "35%", left: "25%", opacity: 0.45 }} />

        <div className="section-structural-title">
          <Reveal delay={0.1}>
            <h2>The Ecosystem</h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p>
              Our proprietary platforms are engineered as decoupled digital ecosystems. Functioning in harmony, they establish the foundation for modern academic institutions and intelligent commerce.
            </p>
          </Reveal>
        </div>

        {/* Product Cards Container */}
        <div className="ecosystem-container">
          
          {/* BlueVolt */}
          <Reveal delay={0.1} width="100%">
            <a 
              href="/about" 
              className="ecosystem-card-minimal"
            >
              <div className="grayscale-logo-container">
                <Image 
                  src="/Assets/Logos/BLUEVOLT.png" 
                  alt="BlueVolt Logo" 
                  width={280} 
                  height={70} 
                  style={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '300px', maxHeight: '72px', display: 'block', margin: '0 auto' }} 
                  unoptimized 
                />
              </div>
            </a>
          </Reveal>

          {/* Schools24 */}
          <Reveal delay={0.2} width="100%">
            <a 
              href="https://schools24.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ecosystem-card-minimal"
            >
              <div className="grayscale-logo-container">
                <Image 
                  src="/Assets/Logos/SCHOOLS24.png" 
                  alt="Schools24 Logo" 
                  width={280} 
                  height={70} 
                  style={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '300px', maxHeight: '72px', display: 'block', margin: '0 auto' }} 
                  unoptimized 
                />
              </div>
            </a>
          </Reveal>

          {/* Stores24 */}
          <Reveal delay={0.3} width="100%">
            <a 
              href="https://stores24.bluevolt.group" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ecosystem-card-minimal"
            >
              <div className="grayscale-logo-container">
                <Image 
                  src="/Assets/Logos/STORES24.png" 
                  alt="Stores24 Logo" 
                  width={280} 
                  height={70} 
                  style={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '300px', maxHeight: '72px', display: 'block', margin: '0 auto' }} 
                  unoptimized 
                />
              </div>
            </a>
          </Reveal>

          {/* Events24 */}
          <Reveal delay={0.4} width="100%">
            <a 
              href="/products/events24" 
              className="ecosystem-card-minimal"
            >
              <div className="grayscale-logo-container">
                <Image 
                  src="/Assets/Logos/EVENTS24.png" 
                  alt="Events24 Logo" 
                  width={280} 
                  height={70} 
                  style={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '300px', maxHeight: '72px', display: 'block', margin: '0 auto' }} 
                  unoptimized 
                />
              </div>
            </a>
          </Reveal>

          {/* Hoscore */}
          <Reveal delay={0.5} width="100%">
            <a 
              href="https://hoscore.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ecosystem-card-minimal"
            >
              <div className="grayscale-logo-container">
                <Image 
                  src="/Assets/Logos/HOSCORE.png" 
                  alt="Hoscore Logo" 
                  width={280} 
                  height={70} 
                  style={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '300px', maxHeight: '72px', display: 'block', margin: '0 auto' }} 
                  unoptimized 
                />
              </div>
            </a>
          </Reveal>

        </div>
      </section>

    </main>
  );
}
