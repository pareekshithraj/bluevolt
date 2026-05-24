"use client";

import React from 'react';
import Reveal from '@/components/Reveal';
import { CalendarDays, ScanLine, Ticket, ArrowRight, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Events24Page() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

            {/* Hero Section */}
            <section className="product-hero-section">
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(var(--border-main) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.5, zIndex: 0 }} />

                <div className="product-split-section" style={{ maxWidth: '1200px', margin: '0 auto', gap: '4rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <Reveal delay={0.2}>
                        <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-light)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                                <CalendarDays size={16} /> Event Orchestration
                            </div>
                            <h1 className="product-hero-title" style={{ textAlign: 'left' }}>
                                Seamless Experiences <br /> <span style={{ color: 'var(--accent)' }}>at Scale</span>
                            </h1>
                            <p className="product-hero-desc">
                                Events24 transforms chaotic campus events into flawless, data-driven experiences. From ticketing to real-time analytics and alumni engagement.
                            </p>

                            <div className="product-hero-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <Link href="/contact" style={{ background: 'var(--accent)', color: 'white', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'transform 0.2s', boxShadow: 'var(--shadow-md)' }}>
                                    Request Demo <ArrowRight size={18} />
                                </Link>
                                <a href="#features" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', color: 'var(--text-primary)', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    Explore Features
                                </a>
                            </div>
                        </div>
                    </Reveal>

                    {/* Mock Mobile Event App Graphic */}
                    <Reveal delay={0.4}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div className="mock-mobile-app">
                                {/* Mobile Notch */}
                                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '24px', background: 'var(--border-subtle)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', zIndex: 10 }} />

                                {/* App Header */}
                                <div style={{ padding: '2.5rem 1.5rem 1rem', background: 'var(--accent)', color: 'white' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>Upcoming Events</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Campus Wide</div>
                                </div>

                                {/* App Content */}
                                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-secondary)', overflowY: 'auto' }}>
                                    {/* Mock Ticket 1 */}
                                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Tech Symposium 2026</div>
                                            <div style={{ color: 'var(--accent)', fontWeight: 600 }}>VIP</div>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Oct 15 • Grand Auditorium</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <Image src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=example_ticket_1" alt="QR Code" width={80} height={80} style={{ width: '80px', height: '80px', opacity: 0.9 }} />
                                        </div>
                                    </div>

                                    {/* Mock Event 2 */}
                                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-main)' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Alumni Networking Gala</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nov 2 • Main Hall</div>
                                    </div>

                                    {/* Mock Event 3 */}
                                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-main)' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Fall Career Fair</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nov 10 • Campus Green</div>
                                    </div>
                                </div>

                                {/* App Footer */}
                                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-around', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                                    <CalendarDays size={20} color="var(--accent)" />
                                    <ScanLine size={20} />
                                    <Ticket size={20} />
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Core Capabilities */}
            <section id="features" style={{ padding: '6rem 2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Reveal delay={0.2}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Core Capabilities</h2>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>The modern event stack for high-density academic environments.</p>
                        </div>
                    </Reveal>

                    <div className="product-features-grid">
                        {[
                            { icon: <Ticket size={24} />, title: "Smart Ticketing", desc: "Dynamic pricing, tiered access (Student, Alumni, VIP), and instant digital delivery." },
                            { icon: <ScanLine size={24} />, title: "Rapid Check-in", desc: "Process thousands of attendees in minutes via the Events24 mobile scanning app." },
                            { icon: <BarChart3 size={24} />, title: "Live Dashboards", desc: "Track attendance, revenue, and capacity limits in real-time." },
                            { icon: <Users size={24} />, title: "Audience Engagement", desc: "Live polling, push notifications, and post-event feedback collection workflows." }
                        ].map((feature, idx) => (
                            <Reveal delay={0.2 + (idx * 0.1)} key={idx}>
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', padding: '2rem', borderRadius: 'var(--radius-lg)', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }} className="hover-card">
                                    <div style={{ width: '48px', height: '48px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                        {feature.icon}
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{feature.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>{feature.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
