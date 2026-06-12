"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface HoverCardProps {
  index: string;
  title: string;
  description: string;
  delay?: number;
  children?: React.ReactNode;
}

export default function HoverCard({ index, title, description, delay = 0, children }: HoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -8, scale: 1.01 }}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: isHovered ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.02)",
        border: isHovered ? "1.5px solid rgba(255, 255, 255, 0.2)" : "1.5px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "24px",
        padding: "2rem",
        boxShadow: isHovered 
          ? "inset 0 2px 0 rgba(255, 255, 255, 0.45), inset 0 -8px 25px rgba(0, 0, 0, 0.35), 0 25px 50px rgba(0, 0, 0, 0.45), 0 0 20px rgba(99, 91, 255, 0.15)" 
          : "inset 0 1.5px 0 rgba(255, 255, 255, 0.3), inset 0 -8px 20px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.15)",
        transition: "box-shadow 0.4s ease, border-color 0.4s ease, background-color 0.4s ease",
        overflow: "hidden",
        cursor: "default"
      }}
    >
      {/* Glass gloss/reflection overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 60%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Subtle hover gradient effect inside the card */}
      <motion.div 
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "linear-gradient(90deg, #818cf8, #c084fc, #f472b6)",
          zIndex: 1
        }}
      />

      <div className="bento-content" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        {children && (
          <div style={{ 
            width: "100%", 
            height: "140px", 
            borderRadius: "16px", 
            backgroundColor: "rgba(0, 0, 0, 0.2)", 
            border: "1px solid rgba(255, 255, 255, 0.06)",
            marginBottom: "1.25rem",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
          }}>
            {children}
          </div>
        )}

        <div style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          {index}
        </div>
        <h3 style={{ color: "var(--text-primary)", fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
          {title}
        </h3>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.88rem" }}>
          {description}
        </p>
      </div>

      <motion.div 
        animate={{ x: isHovered ? 5 : 0, color: isHovered ? "#6366f1" : "#94a3b8" }}
        transition={{ duration: 0.3 }}
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-end", 
          marginTop: "1.5rem" 
        }}
      >
        <div style={{ fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
          CAP.{index.replace("[ ", "").replace(" ]", "")} / FEATURE
        </div>
        <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
          ↗
        </div>
      </motion.div>
    </motion.div>
  );
}
