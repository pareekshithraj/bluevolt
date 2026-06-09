"use client";

import React, { useState } from 'react';
import { ChevronRight, Briefcase, Globe, Target, UserCheck } from 'lucide-react';
import Reveal from '@/components/Reveal';

export default function CareersPage() {
    // Mock open positions
    const openRoles = [
        { title: "Senior Backend Engineer", department: "Infrastructure", location: "Bangalore, India", type: "Full-Time" },
        { title: "Product Designer (UX/UI)", department: "Ecosystem Design", location: "Remote (Global)", type: "Full-Time" },
        { title: "Enterprise Account Executive", department: "Sales", location: "London, UK", type: "Full-Time" },
        { title: "School Success Manager", department: "Customer Success", location: "North America", type: "Full-Time" }
    ];

    const [hoveredRole, setHoveredRole] = useState<number | null>(null);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
            <main style={{ flex: 1, paddingTop: '120px' }}>
                <section style={{ padding: '6rem 2rem 4rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

                    {/* Background Glow */}
                    <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none' }}></div>

                    <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
                        <Reveal delay={0.1}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '2rem' }}>
                                <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Join the Mission</span>
                            </div>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <h1 style={{ fontSize: 'clamp(3.5rem, 6vw, 5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                                Build the <span style={{ background: 'linear-gradient(to right, #60a5fa, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Future</span><br /> of Education
                            </h1>
                        </Reveal>
                        <Reveal delay={0.3}>
                            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6, marginBottom: '3rem' }}>
                                At BLUEVOLT, we are engineering the digital infrastructure that empowers schools and institutions globally. Help us shape the next generation of learning environments.
                            </p>
                        </Reveal>
                        <Reveal delay={0.4}>
                            <a href="#open-roles" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.5rem', background: 'var(--accent)', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '1rem', transition: 'transform 0.2s', boxShadow: '0 10px 25px -5px rgba(37,99,235,0.5)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                View Open Roles <ChevronRight size={18} />
                            </a>
                        </Reveal>
                    </div>
                </section>

                {/* Culture & Values Grid */}
                <section style={{ padding: '6rem 2rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <Reveal delay={0.2}>
                            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Why BLUEVOLT?</h2>
                                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>We tackle complex, global-scale problems in an environment that values deep work, autonomy, and cross-border collaboration.</p>
                            </div>
                        </Reveal>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            {/* Value 1 */}
                            <Reveal delay={0.3}>
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', height: '100%', boxShadow: 'var(--shadow-sm)' }}>
                                    <Globe size={32} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Global Impact</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>The code you write scales an ecosystem actively used by top-tier institutions around the world.</p>
                                </div>
                            </Reveal>
                            {/* Value 2 */}
                            <Reveal delay={0.4}>
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', height: '100%', boxShadow: 'var(--shadow-sm)' }}>
                                    <Target size={32} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Engineering Excellence</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>We prioritize robust architecture and elegant design over rushed feature shipping. Do your best work here.</p>
                                </div>
                            </Reveal>
                            {/* Value 3 */}
                            <Reveal delay={0.5}>
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', height: '100%', boxShadow: 'var(--shadow-sm)' }}>
                                    <UserCheck size={32} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Autonomy & Ownership</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>We hire smart people and give them the resources and trust to own entire domains of the product ecosystem.</p>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* Open Positions List */}
                <section id="open-roles" style={{ padding: '8rem 2rem' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <Reveal delay={0.2}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Open Positions</h2>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Find your next role in shaping global educational technology.</p>
                        </Reveal>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {openRoles.map((role, idx) => (
                                <Reveal delay={0.3 + (idx * 0.1)} key={idx}>
                                    <div
                                        style={{
                                            background: hoveredRole === idx ? 'var(--bg-secondary)' : 'var(--bg-surface)',
                                            border: hoveredRole === idx ? '1px solid var(--accent)' : '1px solid var(--border-main)',
                                            padding: '2rem',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: hoveredRole === idx ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                                        }}
                                        onMouseEnter={() => setHoveredRole(idx)}
                                        onMouseLeave={() => setHoveredRole(null)}
                                    >
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: hoveredRole === idx ? 'var(--accent)' : 'var(--text-primary)', transition: 'color 0.2s' }}>{role.title}</h3>
                                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{role.department}</span>
                                                <span>|</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Globe size={14} /> {role.location}</span>
                                                <span>|</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Briefcase size={14} /> {role.type}</span>
                                            </div>
                                        </div>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: hoveredRole === idx ? 'var(--accent)' : 'var(--border-subtle)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            color: hoveredRole === idx ? 'white' : 'var(--text-muted)',
                                            transition: 'all 0.2s'
                                        }}>
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>

                        <Reveal delay={0.8}>
                            <div style={{ marginTop: '3rem', textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-main)', borderRadius: 'var(--radius-lg)' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Don&apos;t see a perfect fit?</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>We are always looking for exceptional engineers, designers, and operators.</p>
                                <a href="mailto:careers@bluevolt.in" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Email us your resume &rarr;</a>
                            </div>
                        </Reveal>

                    </div>
                </section>
            </main>
        </div>
    );
}
