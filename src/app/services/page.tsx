"use client";

import React from 'react';
import Reveal from '@/components/Reveal';
import { BookOpen, GraduationCap, PenTool, Code, MonitorPlay, FlaskConical } from 'lucide-react';

export default function ServicesPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

            {/* Hero Section */}
            <section style={{ paddingTop: '10rem', paddingBottom: '6rem', paddingLeft: '2rem', paddingRight: '2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at top right, rgba(37,99,235,0.05) 0%, transparent 60%)', zIndex: 0 }} />
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <Reveal delay={0.2}>
                        <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            Our <span style={{ background: 'linear-gradient(to right, var(--accent), var(--accent-dark))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Services</span>
                        </h1>
                    </Reveal>
                    <Reveal delay={0.3}>
                        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: 1.6 }}>
                            Empowering institutions, organizations, and individuals through comprehensive educational support, cutting-edge software solutions, and advanced digital platforms.
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* Services Grid */}
            <section style={{ padding: '4rem 2rem 8rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', flex: 1 }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2.5rem' }}>
                    
                    {/* Educational Support */}
                    <Reveal delay={0.2}>
                        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <GraduationCap size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Educational Support Services</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                                We provide academic counseling, career guidance, training coordination, examination support services, and consultancy to students, educational institutions, and corporate organizations.
                            </p>
                        </div>
                    </Reveal>

                    {/* Education & Training */}
                    <Reveal delay={0.3}>
                        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <BookOpen size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Education & Training Programs</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                                Conducting comprehensive training, coaching, and skill development programs, workshops, seminars, and online courses across technology, management, commerce, arts, and competitive examinations.
                            </p>
                        </div>
                    </Reveal>

                    {/* Publishing */}
                    <Reveal delay={0.4}>
                        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <PenTool size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Publications & Content</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                                Publishing high-quality books, journals, magazines, study materials, educational content, research publications, and various other printed or digital publications in physical, electronic, and online formats.
                            </p>
                        </div>
                    </Reveal>

                    {/* Software Development */}
                    <Reveal delay={0.5}>
                        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <Code size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Software & App Development</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                                Creating, testing, implementing, and maintaining robust computer programs, enterprise software applications, mobile apps, and dedicated digital platforms strictly tailored for educational and commercial purposes.
                            </p>
                        </div>
                    </Reveal>

                    {/* E-Learning Platforms */}
                    <Reveal delay={0.6}>
                        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <MonitorPlay size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>E-Learning & LMS Systems</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                                Operating complex e-learning platforms, high-performance learning management systems (LMS), educational software suites, scalable digital content libraries, and secure online assessment systems.
                            </p>
                        </div>
                    </Reveal>

                    {/* EdTech R&D */}
                    <Reveal delay={0.7}>
                        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <FlaskConical size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>EdTech Research & Development</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                                Deep research and ongoing development in the fields of education technology (EdTech), digital publishing, strategic software development, and advanced instructional design.
                            </p>
                        </div>
                    </Reveal>

                </div>
            </section>
        </div>
    );
}
