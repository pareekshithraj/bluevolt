"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 30) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close mobile menu when switching to larger screen
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1100 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [mobileMenuOpen]);

    return (
        <header className={`navbar-fixed ${scrolled ? "scrolled" : ""}`}>
            {/* Main Navigation Tier */}
            <div className="navbar-container-inner">
                <Link href="/" className="navbar-logo" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                    <Image 
                        src="/Assets/Logos/BLUEVOLT.png" 
                        alt="BLUEVOLT GROUPS Logo" 
                        width={220} 
                        height={48} 
                        style={{ objectFit: "contain", height: "44px", width: "auto", borderRadius: "8px" }} 
                        priority 
                        unoptimized 
                    />
                </Link>

                {/* Mobile Menu Toggle Button */}
                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div className={`nav-links-wrapper ${mobileMenuOpen ? "open" : ""}`}>
                    <nav className="nav-links">
                        <Link href="/" className="nav-link-corporate active-home-pill" onClick={() => setMobileMenuOpen(false)}>
                            Home
                        </Link>
                        <Link href="https://schools24.in" target="_blank" className="nav-link-corporate" onClick={() => setMobileMenuOpen(false)}>
                            Schools24
                        </Link>
                        <Link href="https://stores24.bluevolt.group" target="_blank" className="nav-link-corporate" onClick={() => setMobileMenuOpen(false)}>
                            Stores24
                        </Link>
                        <Link href="/services" className="nav-link-corporate" onClick={() => setMobileMenuOpen(false)}>
                            Services
                        </Link>
                        <Link href="/careers" className="nav-link-corporate" onClick={() => setMobileMenuOpen(false)}>
                            Careers
                        </Link>
                        <Link href="/blog" className="nav-link-corporate" onClick={() => setMobileMenuOpen(false)}>
                            Blog
                        </Link>
                        <Link href="/studio" className="nav-link-corporate" onClick={() => setMobileMenuOpen(false)}>
                            Studio
                        </Link>
                        <Link href="/about" className="nav-link-corporate" onClick={() => setMobileMenuOpen(false)}>
                            About
                        </Link>
                    </nav>

                    <div>
                        <Link href="/contact" className="btn-launch" onClick={() => setMobileMenuOpen(false)}>
                            Inquire
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
