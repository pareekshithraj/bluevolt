"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function AnimatedMeshGradient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      {/* Base Dark Background */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#030712" }} />

      {/* Animated Gradient Orbs */}
      <motion.div
        animate={{
          x: ["0%", "20%", "-20%", "0%"],
          y: ["0%", "-20%", "20%", "0%"],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.14) 0%, rgba(3, 7, 18, 0) 70%)",
          filter: "blur(90px)",
          borderRadius: "50%",
        }}
      />
      
      <motion.div
        animate={{
          x: ["0%", "-30%", "10%", "0%"],
          y: ["0%", "30%", "-10%", "0%"],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        style={{
          position: "absolute",
          top: "30%",
          right: "10%",
          width: "60%",
          height: "60%",
          background: "radial-gradient(circle, rgba(99, 91, 255, 0.14) 0%, rgba(3, 7, 18, 0) 70%)",
          filter: "blur(110px)",
          borderRadius: "50%",
        }}
      />

      <motion.div
        animate={{
          x: ["0%", "15%", "-15%", "0%"],
          y: ["0%", "15%", "-15%", "0%"],
          scale: [1, 1.3, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
        style={{
          position: "absolute",
          bottom: "10%",
          left: "40%",
          width: "40%",
          height: "40%",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, rgba(3, 7, 18, 0) 70%)",
          filter: "blur(100px)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
