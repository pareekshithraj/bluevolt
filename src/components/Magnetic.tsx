"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface MagneticProps {
    children: React.ReactElement;
    strength?: number;
}

export default function Magnetic({ children, strength = 40 }: MagneticProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = (clientX - (left + width / 2)) / (width / 2);
        const y = (clientY - (top + height / 2)) / (height / 2);
        setPosition({ x: x * strength, y: y * strength });
    }, [strength]);

    const handleMouseLeave = useCallback(() => {
        setPosition({ x: 0, y: 0 });
    }, []);

    const { x, y } = position;

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ display: "inline-block" }}
        >
            <motion.div
                animate={{ x, y }}
                transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            >
                {children}
            </motion.div>
        </div>
    );
}
