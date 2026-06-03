"use client";

import React from 'react';
import Image from 'next/image';
import Reveal from '@/components/Reveal';
import { Target, Globe, Linkedin, Twitter, Instagram, Facebook } from 'lucide-react';

export default function AboutPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

            {/* Hero Section */}
            <section style={{ paddingTop: '10rem', paddingBottom: '6rem', paddingLeft: '2rem', paddingRight: '2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at top right, rgba(37,99,235,0.05) 0%, transparent 60%)', zIndex: 0 }} />
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <Reveal delay={0.2}>
                        <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            The Foundation of <span style={{ background: 'linear-gradient(to right, var(--accent), var(--accent-dark))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Modern Education</span>
                        </h1>
                    </Reveal>
                    <Reveal delay={0.3}>
                        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                            BlueVolt Groups Private Limited engineers the critical digital infrastructure required to run global educational ecosystems at scale.
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* Mission & Vision */}
            <section style={{ padding: '6rem 2rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem' }}>
                    <Reveal delay={0.2}>
                        <div>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <Target size={28} />
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Our Mission</h2>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                To seamlessly orchestrate institutional administration, bridging fragmented campus tools into a single, high-performance, interconnected ecosystem.
                            </p>
                        </div>
                    </Reveal>
                    <Reveal delay={0.4}>
                        <div>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <Globe size={28} />
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>The Problem</h2>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                Modern institutions rely on dozens of disconnected systems for admissions, finance, learning, and events. This fragmentation limits scale and frustrates users.
                            </p>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Leadership Gallery */}
            <section style={{ padding: '8rem 2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Reveal delay={0.2}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Executive Leadership</h2>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>The team engineering the future of educational technology.</p>
                        </div>
                    </Reveal>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
                        {/* Executive 1 */}
                        <Reveal delay={0.3}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '200px', height: '300px', borderRadius: 'var(--radius-lg)', background: 'var(--border-main)', margin: '0 auto 1.5rem', overflow: 'hidden', position: 'relative' }}>
                                    <Image src="/Assets/pareekshith.jpg" alt="Pareekshith Raj" fill style={{ objectFit: 'cover' }} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Pareekshith Raj</h3>
                                <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Founder and CEO</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Driving BlueVolt&apos;s vision to revolutionize digital infrastructure, blending strategic leadership with a passion for transformative educational technology.</p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.2rem' }}>
                                    <a href="https://www.linkedin.com/in/pareekshith-raj/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                        <Linkedin size={20} />
                                    </a>
                                    <a href="https://x.com/pareekshithraj0" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                        <Twitter size={20} />
                                    </a>
                                    <a href="https://www.instagram.com/pareekshith_raj_official/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                        <Instagram size={20} />
                                    </a>
                                    <a href="https://www.facebook.com/PareekshithrRaj.Official/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                        <Facebook size={20} />
                                    </a>
                                </div>
                            </div>
                        </Reveal>

                        {/* Executive 2 */}
                        <Reveal delay={0.4}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '200px', height: '300px', borderRadius: 'var(--radius-lg)', background: 'var(--border-main)', margin: '0 auto 1.5rem', overflow: 'hidden', position: 'relative' }}>
                                    <Image src="/Assets/swathi.jpg" alt="Swathi K N" fill style={{ objectFit: 'cover' }} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Swathi K N</h3>
                                <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Director</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Spearheading operational excellence and strategic growth initiatives, ensuring robust scaling of BlueVolt&apos;s enterprise solutions globally.</p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.2rem' }}>
                                    <a href="https://www.linkedin.com/in/swathi-raj-08a7873b3/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                        <Linkedin size={20} />
                                    </a>
                                </div>
                            </div>
                        </Reveal>

                        {/* Executive 3 */}
                        <Reveal delay={0.5}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '200px', height: '300px', borderRadius: 'var(--radius-lg)', background: 'var(--border-main)', margin: '0 auto 1.5rem', overflow: 'hidden', position: 'relative' }}>
                                    <Image src="/Assets/rahul.png" alt="Rahul H R" fill style={{ objectFit: 'cover' }} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Rahul H R</h3>
                                <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Director</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Orchestrating product innovation and user-centric design, bridging complex technological challenges with intuitive platform experiences.</p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.2rem' }}>
                                    <a href="https://www.linkedin.com/in/rahul-h-r-286576286/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                        <Linkedin size={20} />
                                    </a>
                                    <a href="https://www.instagram.com/iamrahulwalker/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                        <Instagram size={20} />
                                    </a>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>
        </div>
    );
}
