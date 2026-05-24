"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export default function Cursor() {
    const [hidden, setHidden] = useState(true);
    const [isHovering, setIsHovering] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth springs for the trailing effect
    const springConfig = { damping: 30, stiffness: 200, restDelta: 0.001 };
    const smoothX = useSpring(mouseX, springConfig);
    const smoothY = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
            if (hidden) setHidden(false);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === "BUTTON" ||
                target.tagName === "A" ||
                target.closest(".bento-item") ||
                target.closest(".brand-card") ||
                target.closest(".service-row")
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseover", handleMouseOver);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseover", handleMouseOver);
        };
    }, [hidden, mouseX, mouseY]);

    if (hidden) return null;

    return (
        <>
            {/* Outer Ring */}
            <motion.div
                style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    x: smoothX,
                    y: smoothY,
                    translateX: "-50%",
                    translateY: "-50%",
                    pointerEvents: "none",
                    width: isHovering ? 54 : 32,
                    height: isHovering ? 54 : 32,
                    borderRadius: "50%",
                    border: isHovering ? "1px solid rgba(0, 210, 255, 0.5)" : "1px solid rgba(255, 255, 255, 0.22)",
                    backgroundColor: isHovering ? "rgba(255, 255, 255, 0.02)" : "transparent",
                    zIndex: 9999,
                    backdropFilter: isHovering ? "blur(2px)" : "none",
                }}
                transition={{ type: "spring", stiffness: 250, damping: 25 }}
            />
            {/* Target Dot */}
            <motion.div
                style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    x: mouseX,
                    y: mouseY,
                    translateX: "-50%",
                    translateY: "-50%",
                    pointerEvents: "none",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 0 6px rgba(0, 210, 255, 0.95), 0 0 12px rgba(255, 255, 255, 0.5)",
                    zIndex: 10000,
                }}
            />
        </>
    );
}
