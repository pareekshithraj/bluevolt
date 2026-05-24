"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Reveal from './Reveal';

// Mock data representing global regions, modeled after major cloud networks (AWS/Vercel)
const nodes = [
    { id: 'us-west', name: 'US West (Oregon)', x: '18%', y: '35%', active: 3102, latency: 12 },
    { id: 'us-east', name: 'US East (N. Virginia)', x: '28%', y: '40%', active: 4890, latency: 8 },
    { id: 'sa-east', name: 'South America (S\u00e3o Paulo)', x: '33%', y: '75%', active: 850, latency: 45 },
    { id: 'eu-west', name: 'Europe (London)', x: '48%', y: '30%', active: 2980, latency: 15 },
    { id: 'eu-central', name: 'Europe (Frankfurt)', x: '52%', y: '32%', active: 3120, latency: 10 },
    { id: 'ap-south', name: 'Asia Pacific (Mumbai)', x: '70%', y: '50%', active: 5600, latency: 5 },
    { id: 'ap-se', name: 'Asia Pacific (Singapore)', x: '78%', y: '60%', active: 2100, latency: 18 },
    { id: 'ap-ne', name: 'Asia Pacific (Tokyo)', x: '88%', y: '40%', active: 1850, latency: 22 },
    { id: 'ap-se2', name: 'Asia Pacific (Sydney)', x: '92%', y: '85%', active: 1100, latency: 35 },
];

export default function InfrastructureMap() {
    const [activeNode, setActiveNode] = useState<string | null>(null);

    return (
        <section className="infrastructure-section" style={{ padding: '8rem 2rem', position: 'relative', overflow: 'hidden', background: 'var(--bg-base)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', marginBottom: '4rem' }}>
                <Reveal delay={0.2} width="100%">
                    <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Built for Global Scale
                    </h2>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto' }}>
                        Our infrastructure is actively deployed across top-tier enterprise regions, ensuring ultra-low latency and unparalleled uptime for global education.
                    </p>
                </Reveal>
            </div>

            <Reveal delay={0.4} width="100%">
                <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    height: '600px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-main)',
                    background: 'var(--bg-surface)',
                    boxShadow: 'var(--shadow-md)'
                }}>

                    {/* High-res Dot Matrix World Map Background */}
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image
                            src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg"
                            alt="Global Network"
                            width={1320}
                            height={600}
                            style={{ width: '110%', height: 'auto', objectFit: 'contain', filter: 'invert(1) opacity(0.2)' }}
                        />
                    </div>

                    {/* Dark gradient overlay to ensure text/node legibility */}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(15, 23, 42, 0.8) 100%)' }}></div>

                    {/* Subtle dot grid over the map to give it that "Vercel" technical feel */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.5 }}></div>

                    {/* SVG Connecting Lines for Data Flow Simulation */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
                        {/* Define the animated dash pattern */}
                        <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.1" />
                                <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>

                        {/* Connections from US East to other major hubs */}
                        <path d="M 336 240 Q 450 150 576 180" fill="none" stroke="url(#line-gradient)" strokeWidth="1.5" strokeDasharray="6 6" className="data-flow-line" /> {/* US East to EU London */}
                        <path d="M 336 240 Q 600 300 840 300" fill="none" stroke="url(#line-gradient)" strokeWidth="1.5" strokeDasharray="6 6" className="data-flow-line" /> {/* US East to AP Mumbai */}
                        <path d="M 336 240 Q 250 180 216 210" fill="none" stroke="url(#line-gradient)" strokeWidth="1.5" strokeDasharray="6 6" className="data-flow-line" /> {/* US East to US West */}
                        <path d="M 336 240 Q 300 350 396 450" fill="none" stroke="url(#line-gradient)" strokeWidth="1.5" strokeDasharray="6 6" className="data-flow-line" /> {/* US East to SA East */}

                        {/* Internal EU Connection */}
                        <path d="M 576 180 Q 600 170 624 192" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

                        {/* Internal AP Connections */}
                        <path d="M 840 300 Q 880 320 936 360" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" /> {/* Mumbai to Singapore */}
                        <path d="M 936 360 Q 1000 300 1056 240" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" /> {/* Singapore to Tokyo */}
                        <path d="M 936 360 Q 1000 450 1104 510" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" /> {/* Singapore to Sydney */}
                    </svg>

                    {/* Dynamic Nodes */}
                    {nodes.map(node => (
                        <div
                            key={node.id}
                            onMouseEnter={() => setActiveNode(node.id)}
                            onMouseLeave={() => setActiveNode(null)}
                            style={{ position: 'absolute', left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: activeNode === node.id ? 20 : 10 }}
                        >
                            {/* Outer pulsing ring */}
                            <div style={{
                                position: 'absolute',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                opacity: activeNode === node.id ? 0.4 : 0.2,
                                transform: 'translate(-50%, -50%)',
                                left: '50%',
                                top: '50%',
                                animation: activeNode === node.id ? 'none' : 'mapPing 3s cubic-bezier(0, 0, 0.2, 1) infinite',
                                pointerEvents: 'none'
                            }}></div>

                            {/* Core interactive dot */}
                            <div style={{
                                position: 'absolute',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: activeNode === node.id ? 'var(--accent)' : '#94a3b8',
                                transform: 'translate(-50%, -50%)',
                                left: '50%',
                                top: '50%',
                                border: '2px solid rgba(0,0,0,0.8)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                boxShadow: activeNode === node.id ? '0 0 20px var(--accent)' : 'none'
                            }}></div>

                            {/* Vercel-style Glass Tooltip */}
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '50%',
                                transform: 'translate(-50%, -100%)',
                                background: 'rgba(15, 23, 42, 0.85)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1.25rem',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                width: '240px',
                                pointerEvents: 'none',
                                opacity: activeNode === node.id ? 1 : 0,
                                visibility: activeNode === node.id ? 'visible' : 'hidden',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                                zIndex: 30
                            }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: '#f8fafc' }}>
                                    {node.name}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }}></div>
                                        Active Instances
                                    </span>
                                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{node.active.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                                        Network Latency
                                    </span>
                                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{node.latency}ms</span>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
            </Reveal>
        </section>
    );
}

