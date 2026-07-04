import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, Workflow } from "lucide-react";
import AnimatedMeshGradient from "@/components/AnimatedMeshGradient";
import { InvoicingWidget, SecurityWidget, UnifiedRecordsWidget } from "@/components/BentoWidgets";
import HoverCard from "@/components/HoverCard";
import InteractiveConsole from "@/components/InteractiveConsole";
import Reveal from "@/components/Reveal";
import StatsSection from "@/components/StatsSection";

const heroSignals = [
  {
    label: "Enterprise Control",
    value: "Role-aware workflows, approvals, and auditability across the operating stack.",
  },
  {
    label: "Mobile Reach",
    value: "Web plus Android access for teams that need field-ready execution, not desktop-only tooling.",
  },
  {
    label: "Launch Speed",
    value: "One governed layer for schools, commerce, employee operations, and service delivery.",
  },
];

const operatingLanes = [
  {
    title: "Institutional Operations",
    description: "Admissions, records, finance, communication, and staff coordination on one governed system.",
    icon: Workflow,
  },
  {
    title: "Commercial Workflows",
    description: "Retail, CRM, inventory, approvals, and reporting built for people running the operation every day.",
    icon: ShieldCheck,
  },
  {
    title: "Field-Ready Access",
    description: "Employees, managers, and leadership get mobile access to attendance, documents, tasks, and approvals.",
    icon: Smartphone,
  },
];

const ecosystemLogos = [
  { href: "/about", src: "/Assets/Logos/BLUEVOLT.png", alt: "BLUEVOLT Logo" },
  { href: "https://schools24.in", src: "/Assets/Logos/SCHOOLS24.png", alt: "Schools24 Logo", external: true },
  { href: "https://hoscore.in", src: "/Assets/Logos/HOSCORE.png", alt: "Hoscore Logo", external: true },
];

export default async function Home() {
  return (
    <main>
      <div
        className="hero-wrapper"
        style={{
          padding: "80px 24px 60px 24px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #020617 0%, #030712 100%)",
          overflow: "hidden",
        }}
      >
        <AnimatedMeshGradient />
        <div className="premium-grid-bg" />

        <section
          className="hero"
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            flex: 1,
          }}
        >
          <div
            className="hero-layout-centered"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              flex: 1,
            }}
          >
            <div
              className="hero-text-container"
              style={{
                textAlign: "center",
                padding: "2rem 0",
                margin: 0,
                maxWidth: "900px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Reveal delay={0.1}>
                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
                  <span
                    className="animated-badge-border"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      borderRadius: "9999px",
                      padding: "0.45rem 1.25rem",
                      border: "1px solid transparent",
                      background:
                        "linear-gradient(#030712, #030712) padding-box, linear-gradient(90deg, #0ea5e9, #22c55e, #38bdf8, #0ea5e9) border-box",
                      backgroundSize: "200% auto",
                      fontSize: "0.85rem",
                      color: "#cbd5e1",
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                    }}
                  >
                    <span className="pulse-dot" />
                    Introducing BLUEVOLT Studio
                  </span>
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <h1
                  className="editorial-h1"
                  style={{
                    textAlign: "center",
                    textWrap: "balance",
                    lineHeight: 1.08,
                    marginBottom: "1.5rem",
                    letterSpacing: "-0.04em",
                    fontWeight: 700,
                  }}
                >
                  The workflow layer for high-accountability digital operations.
                </h1>
              </Reveal>

              <Reveal delay={0.3}>
                <p
                  className="editorial-p"
                  style={{
                    textAlign: "center",
                    margin: "0 auto 2.5rem auto",
                    maxWidth: "720px",
                    fontSize: "1.15rem",
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                    fontWeight: 400,
                  }}
                >
                  BLUEVOLT brings institutional administration, commerce, employee operations, and mobile execution into one governed system. Built for teams that need structured rollout, daily clarity, and reliable operational control.
                </p>
              </Reveal>

              <Reveal delay={0.4} width="100%">
                <div
                  className="editorial-cta-row"
                  style={{
                    justifyContent: "center",
                    gap: "1.5rem",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Link
                    href="/studio"
                    className="firebase-btn-primary btn-pill"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "linear-gradient(180deg, #0ea5e9 0%, #0369a1 100%)",
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      boxShadow:
                        "inset 2px 2px 4px rgba(255, 255, 255, 0.24), inset -2px -2px 4px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(14, 165, 233, 0.24), 0 2px 4px rgba(0, 0, 0, 0.1)",
                      padding: "0.85rem 2.2rem",
                      fontWeight: 600,
                      borderRadius: "9999px",
                      fontSize: "0.95rem",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    Open BLUEVOLT Studio <ArrowRight size={16} />
                  </Link>
                  <a
                    href="/bluevolt-app-debug.apk"
                    download
                    className="firebase-btn-secondary btn-pill"
                    style={{
                      border: "1px solid rgba(0, 210, 255, 0.25)",
                      color: "#ffffff",
                      background: "rgba(0, 210, 255, 0.04)",
                      boxShadow:
                        "inset 0 1.5px 0 rgba(0, 210, 255, 0.2), inset 0 -4px 10px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 210, 255, 0.1)",
                      padding: "0.85rem 2.2rem",
                      fontWeight: 600,
                      borderRadius: "9999px",
                      fontSize: "0.95rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      textDecoration: "none"
                    }}
                  >
                    <Smartphone size={16} /> Download Android App
                  </a>
                  <Link
                    href="/contact"
                    className="firebase-btn-secondary btn-pill"
                    style={{
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      background: "rgba(255, 255, 255, 0.03)",
                      boxShadow:
                        "inset 0 1.5px 0 rgba(255, 255, 255, 0.18), inset 0 -4px 10px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.15)",
                      padding: "0.85rem 2.2rem",
                      fontWeight: 600,
                      borderRadius: "9999px",
                      fontSize: "0.95rem",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    Plan Rollout
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.5} width="100%">
                <div className="hero-proof-grid">
                  {heroSignals.map((signal) => (
                    <div key={signal.label} className="hero-proof-card">
                      <span className="hero-proof-label">{signal.label}</span>
                      <p>{signal.value}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </div>

      <div
        className="showcase-section"
        style={{
          position: "relative",
          padding: "0 24px 6rem 24px",
          background: "linear-gradient(to bottom, #030712 0%, #080c16 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "1400px", width: "100%", position: "relative", zIndex: 10, display: "flex", justifyContent: "center" }}>
          <Reveal delay={0.2} width="100%">
            <InteractiveConsole />
          </Reveal>
        </div>
      </div>

      <StatsSection />

      <section className="operating-system-section">
        <div className="operating-system-shell">
          <Reveal delay={0.1}>
            <span className="mono-tag">SYSTEM DESIGN</span>
          </Reveal>
          <Reveal delay={0.2}>
            <h2 className="operating-system-title">One operating layer. Three high-value execution lanes.</h2>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="operating-system-copy">
              BLUEVOLT is strongest when it removes fragmentation between leadership, operations, and field teams. These lanes make the platform commercially defensible instead of merely visually impressive.
            </p>
          </Reveal>

          <div className="operating-grid">
            {operatingLanes.map((lane, index) => {
              const Icon = lane.icon;
              return (
                <Reveal key={lane.title} delay={0.15 + index * 0.1}>
                  <article className="operating-card">
                    <div className="operating-card-top">
                      <span className="operating-card-index">0{index + 1}</span>
                      <Icon size={20} />
                    </div>
                    <h3>{lane.title}</h3>
                    <p>{lane.description}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="capabilities-modern-section" id="capabilities" style={{ overflow: "hidden", background: "#080c16", padding: "8rem 24px" }}>
        <div className="section-structural-title" style={{ textAlign: "center", display: "block", marginBottom: "5rem" }}>
          <Reveal delay={0.1}>
            <span className="mono-tag" style={{ color: "#94a3b8", letterSpacing: "0.15em" }}>WORKFLOW ENGINE</span>
          </Reveal>
          <Reveal delay={0.2}>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, margin: "1rem 0", color: "var(--text-primary)" }}>
              Operational primitives that compound
            </h2>
          </Reveal>
          <Reveal delay={0.3}>
            <p style={{ margin: "0 auto", maxWidth: "600px", color: "var(--text-secondary)" }}>
              These are the building blocks that let one system serve schools, retail, internal teams, and service operations without losing control.
            </p>
          </Reveal>
        </div>

        <div className="bento-grid">
          <HoverCard
            index="[ 01 ]"
            title="Unified Records"
            description="Keep profiles, transactions, documents, and status updates synchronized across teams and locations from one governed source."
            delay={0.1}
          >
            <UnifiedRecordsWidget />
          </HoverCard>
          <HoverCard
            index="[ 02 ]"
            title="Granular Security"
            description="Role-scoped access, approval boundaries, and auditable actions keep sensitive operational data restricted to the right people."
            delay={0.2}
          >
            <SecurityWidget />
          </HoverCard>
          <HoverCard
            index="[ 03 ]"
            title="Automated Invoicing"
            description="Automate billing, reminders, receipts, and financial follow-through without forcing teams into spreadsheet-driven work."
            delay={0.3}
          >
            <InvoicingWidget />
          </HoverCard>
        </div>
      </section>

      <section className="closing-cta-section">
        <Reveal delay={0.1}>
          <div className="closing-cta-panel">
            <div>
              <span className="mono-tag">READY TO DEPLOY</span>
              <h2>Bring BLUEVOLT into the workflow layer, not just the website layer.</h2>
              <p>
                If the goal is production deployment, the next move is mapping one business unit, one operating workflow, and one accountable rollout path.
              </p>
            </div>
            <div className="closing-cta-actions">
              <Link href="/studio" className="btn-launch">Open Studio</Link>
              <Link href="/contact" className="nav-link-corporate active-home-pill">Plan Rollout</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        className="logo-strip-section"
        id="ecosystem"
        style={{
          borderTop: "1px solid var(--border-main)",
          borderBottom: "1px solid var(--border-main)",
          background: "linear-gradient(to bottom, #080c16 0%, #0e1224 100%)",
        }}
      >
        <div className="logo-strip-title" style={{ display: "none" }}>
          <Reveal delay={0.1}>
            <span></span>
          </Reveal>
        </div>

        <div className="logo-strip-row" style={{ marginTop: "2rem" }}>
          {ecosystemLogos.map((logo, index) => (
            <Reveal key={logo.alt} delay={0.1 + index * 0.1}>
              <a
                href={logo.href}
                target={logo.external ? "_blank" : undefined}
                rel={logo.external ? "noopener noreferrer" : undefined}
                className="logo-strip-item"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={200}
                  height={55}
                  style={{ objectFit: "contain", width: "auto", height: "72px" }}
                  unoptimized
                />
              </a>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
