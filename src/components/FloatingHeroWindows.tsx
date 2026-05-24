"use client";

import React, { useEffect, useState } from "react";

export default function FloatingHeroWindows() {
  const [scrollY, setScrollY] = useState(0);

  // Individual window hover/tilt states
  const [win1Tilt, setWin1Tilt] = useState({ x: 0, y: 0, isHovered: false });
  const [win2Tilt, setWin2Tilt] = useState({ x: 0, y: 0, isHovered: false });
  const [win3Tilt, setWin3Tilt] = useState({ x: 0, y: 0, isHovered: false });

  // Tracking mouse movement relative to cards to compute high-fidelity 3D tilt coordinates
  const handleCardMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    setTilt: React.Dispatch<React.SetStateAction<{ x: number; y: number; isHovered: boolean }>>
  ) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // relative cursor X
    const y = e.clientY - rect.top;  // relative cursor Y
    
    // Calculate normalized deviation from card center (-0.5 to 0.5)
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateX = -(y - yc) / (rect.height / 12); // subtle tilt scaling
    const rotateY = (x - xc) / (rect.width / 12);
    
    setTilt({ x: rotateX, y: rotateY, isHovered: true });
  };

  const handleCardMouseLeave = (
    setTilt: React.Dispatch<React.SetStateAction<{ x: number; y: number; isHovered: boolean }>>
  ) => {
    setTilt({ x: 0, y: 0, isHovered: false });
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Butter-smooth hardware-accelerated parallax multipliers
  const offsetWin1 = scrollY * -0.16; // Mobile (Win 1)
  const offsetWin2 = scrollY * -0.05; // Desktop (Win 2)
  const offsetWin3 = scrollY * -0.22; // Route Planner (Win 3)

  return (
    <div className="mac-window-container">
      
      {/* ----------------- WINDOW 2: SCHOOLS24 DESKTOP DASHBOARD (img_1.png) - Center-Background ----------------- */}
      <div 
        className="mac-window-wrapper"
        onMouseMove={(e) => handleCardMouseMove(e, setWin2Tilt)}
        onMouseLeave={() => handleCardMouseLeave(setWin2Tilt)}
        style={{
          transform: `translateY(${offsetWin2}px) translateY(80px) rotateX(${win2Tilt.x}deg) rotateY(${win2Tilt.y}deg) scale(${win2Tilt.isHovered ? 1.025 : 1})`,
          zIndex: win2Tilt.isHovered ? 10 : 2,
          width: "760px",
          height: "440px",
          top: "12%",
          transition: "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.3s ease, box-shadow 0.3s ease"
        }}
      >
        {/* Layered cobalt and deep electric blue glowing halos */}
        <div 
          className="mac-window-aura-glow" 
          style={{
            background: "radial-gradient(circle at center, rgba(0, 80, 255, 0.45) 0%, rgba(0, 30, 200, 0.22) 50%, transparent 100%)",
            opacity: win2Tilt.isHovered ? 1.0 : 0.85
          }}
        />

        <div className="mac-window-header">
          <div className="mac-window-dots">
            <div className="mac-window-dot mac-window-dot-red" />
            <div className="mac-window-dot mac-window-dot-yellow" />
            <div className="mac-window-dot mac-window-dot-green" />
          </div>
          <div className="mac-window-title">schools24_desktop_dashboard.png</div>
          <div style={{ width: "52px" }} />
        </div>

        <div className="mac-window-body" style={{ padding: 0, overflow: "hidden", display: "flex", height: "calc(100% - 36px)" }}>
          <img 
            src="/Assets/img_1.png" 
            alt="Schools24 Desktop Dashboard" 
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      </div>


      {/* ----------------- WINDOW 1: SCHOOLS24 MOBILE VIEWPORT (img_2.png) - Right-Foreground Phone Simulator ----------------- */}
      <div 
        className="mac-window-wrapper phone-simulator-bezel"
        onMouseMove={(e) => handleCardMouseMove(e, setWin1Tilt)}
        onMouseLeave={() => handleCardMouseLeave(setWin1Tilt)}
        style={{
          transform: `translateY(${offsetWin1}px) translateY(120px) translateX(300px) rotateX(${win1Tilt.x}deg) rotateY(${win1Tilt.y}deg) scale(${win1Tilt.isHovered ? 1.025 : 1})`,
          zIndex: win1Tilt.isHovered ? 11 : 4,
          width: "250px",
          height: "480px",
          top: "8%",
          transition: "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.3s ease, box-shadow 0.3s ease",
          border: "none",
        }}
      >
        {/* Luminous ambient halo behind the phone */}
        <div 
          className="mac-window-aura-glow" 
          style={{
            background: "radial-gradient(circle at center, rgba(0, 119, 255, 0.45) 0%, rgba(0, 60, 255, 0.22) 50%, transparent 100%)",
            opacity: win1Tilt.isHovered ? 1.0 : 0.85
          }}
        />

        <div className="phone-simulator-notch" />

        {/* High-fidelity Status Bar */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '0',
          right: '0',
          height: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          fontSize: '9px',
          fontFamily: 'var(--font-sans)',
          color: '#ffffff',
          zIndex: 20,
          opacity: 0.8,
          fontWeight: 600,
          pointerEvents: 'none'
        }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '8px' }}>5G</span>
            <div style={{ width: '15px', height: '8px', border: '1px solid #ffffff', borderRadius: '2px', padding: '1px', display: 'flex' }}>
              <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff' }} />
            </div>
          </div>
        </div>

        <div className="phone-simulator-screen" style={{ height: "100%", width: "100%", position: "relative" }}>
          <img 
            src="/Assets/img_2.png" 
            alt="Schools24 Mobile Dashboard" 
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      </div>


      {/* ----------------- WINDOW 3: SCHOOLS24 ROUTE PLANNER (img_3.png) - Left-Foreground Glassmorphic Console ----------------- */}
      <div 
        className="mac-window-wrapper"
        onMouseMove={(e) => handleCardMouseMove(e, setWin3Tilt)}
        onMouseLeave={() => handleCardMouseLeave(setWin3Tilt)}
        style={{
          transform: `translateY(${offsetWin3}px) translateY(240px) translateX(-240px) rotateX(${win3Tilt.x}deg) rotateY(${win3Tilt.y}deg) scale(${win3Tilt.isHovered ? 1.025 : 1})`,
          zIndex: win3Tilt.isHovered ? 11 : 5,
          width: "440px",
          height: "280px",
          top: "46%",
          transition: "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.3s ease, box-shadow 0.3s ease",
          background: "rgba(10, 10, 12, 0.65)",
          backdropFilter: "blur(30px) saturate(190%)",
          WebkitBackdropFilter: "blur(30px) saturate(190%)",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}
      >
        {/* Vibrant deep electric blue aura halo */}
        <div 
          className="mac-window-aura-glow" 
          style={{
            background: "radial-gradient(circle at center, rgba(0, 150, 255, 0.45) 0%, rgba(0, 50, 220, 0.22) 50%, transparent 100%)",
            opacity: win3Tilt.isHovered ? 1.0 : 0.85
          }}
        />

        <div className="mac-window-header">
          <div className="mac-window-dots">
            <div className="mac-window-dot mac-window-dot-red" />
            <div className="mac-window-dot mac-window-dot-yellow" />
            <div className="mac-window-dot mac-window-dot-green" />
          </div>
          <div className="mac-window-title">schools24_route_planner.png</div>
          <div style={{ width: "52px" }} />
        </div>

        <div className="mac-window-body" style={{ padding: 0, overflow: "hidden", display: "flex", height: "calc(100% - 36px)" }}>
          <img 
            src="/Assets/img_3.png" 
            alt="Schools24 Route Planner" 
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      </div>
    </div>
  );
}
