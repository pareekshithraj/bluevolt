"use client";

import { motion } from "framer-motion";

interface RevealProps {
    children: React.ReactNode;
    width?: "fit-content" | "100%";
    delay?: number;
}

export default function Reveal({ children, width = "fit-content", delay = 0 }: RevealProps) {
    return (
        <div style={{ position: "relative", width }}>
            <motion.div
                variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 },
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, delay: delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                {children}
            </motion.div>
        </div>
    );
}
