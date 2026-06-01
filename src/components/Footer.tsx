import Link from 'next/link';
import Image from 'next/image';
import { Linkedin, Mail, Globe } from 'lucide-react';

export default function Footer() {
    return (
        <footer id="contact" className="footer-section" style={{ overflow: 'hidden', position: 'relative' }}>
            {/* Warm Ambient Glowing Nebulae behind footer */}
            <div className="glow-blob glow-blob-sunset glow-blob-animated-2" style={{ width: "800px", height: "800px", bottom: "-300px", right: "-100px", opacity: 0.9 }} />
            <div className="glow-blob glow-blob-solar glow-blob-animated-1" style={{ width: "700px", height: "700px", top: "-200px", left: "-150px", opacity: 0.7 }} />

            <div className="footer-container">

                {/* Main Footer Grid */}
                <div className="footer-grid">

                    {/* Brand Column */}
                    <div>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '2rem' }}>
                            <Image src="/Assets/Logos/BLUEVOLT.png" alt="BLUEVOLT GROUPS" width={180} height={40} style={{ objectFit: 'contain', height: '36px', width: 'auto' }} unoptimized />
                        </Link>
                        <p style={{ fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            Engineering the next generation of scalable software ecosystems. Unifying administrative intelligence, digital orchestration, and high-velocity global commerce.
                        </p>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            <span>PVT. LTD. INCORPORATED FEB 24, 2026</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <a
                                href="https://www.linkedin.com/company/bluevolt-groups"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--text-secondary)', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center' }}
                                aria-label="LinkedIn"
                            >
                                <Linkedin size={18} />
                            </a>
                            <a
                                href="mailto:Pareekshithraj@schools24.in"
                                style={{ color: 'var(--text-secondary)', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center' }}
                                aria-label="Email"
                            >
                                <Mail size={18} />
                            </a>
                        </div>
                    </div>

                    {/* Ecosystem Column */}
                    <div>
                        <h4>ECOSYSTEM</h4>
                        <ul>
                            <li><a href="https://schools24.in" target="_blank" rel="noopener noreferrer">Schools24</a></li>
                            <li><a href="https://stores24.bluevolt.group" target="_blank" rel="noopener noreferrer">Stores24 ERP</a></li>
                            <li><Link href="/#ecosystem">Events24 <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', padding: '0.1rem 0.4rem', border: '1px solid var(--border-main)', marginLeft: '0.5rem', color: 'var(--text-primary)' }}>Beta</span></Link></li>
                        </ul>
                    </div>

                    {/* Solutions Column */}
                    <div>
                        <h4>SOLUTIONS</h4>
                        <ul>
                            <li><Link href="/services">Engineering Services</Link></li>
                            <li><Link href="/#about">Institutional Core</Link></li>
                            <li><Link href="/#about">Enterprise Logistics</Link></li>
                            <li><Link href="/#about">Multi-Tenant Scale</Link></li>
                            <li><Link href="/#about">Autonomous Control</Link></li>
                        </ul>
                    </div>

                    {/* Corporate Column */}
                    <div>
                        <h4>CORPORATE</h4>
                        <ul>
                            <li><Link href="/about">About BlueVolt</Link></li>
                            <li><Link href="/studio">BlueVolt Studio</Link></li>
                            <li><Link href="/careers">Careers</Link></li>
                            <li><Link href="/contact">Inquire</Link></li>
                            <li><a href="mailto:Pareekshithraj@schools24.in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={12} /> pareekshithraj@schools24.in</a></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Legal Bar */}
                <div className="footer-bottom">
                    <div className="footer-bottom-info">
                        <span>&copy; {new Date().getFullYear()} BLUEVOLT GROUPS PRIVATE LIMITED. ALL RIGHTS RESERVED.</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Globe size={11} /> GLOBAL HUB</span>
                    </div>

                    <div className="footer-bottom-links">
                        <Link href="/legal">LEGAL DISCLOSURE</Link>
                        <Link href="/privacy">PRIVACY POLICY</Link>
                        <Link href="/terms">TERMS OF SERVICE</Link>
                        <Link href="/employee/login" style={{ opacity: 0.15, fontSize: '0.62rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.15'}>[EMPLOYEE_GATEWAY]</Link>
                        <Link href="/studio/admin" style={{ opacity: 0.15, fontSize: '0.62rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.15'}>[SYS_ADMIN_NODE]</Link>
                    </div>
                </div>

            </div>
        </footer>
    );
}
