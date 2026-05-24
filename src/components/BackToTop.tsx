"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 500) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    onClick={scrollToTop}
                    className="back-to-top"
                    aria-label="Back to Top"
                    style={{
                        position: "fixed",
                        bottom: "2rem",
                        right: "2rem",
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        background: "rgba(59, 130, 246, 0.2)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 90,
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                    }}
                    whileHover={{
                        scale: 1.1,
                        background: "rgba(59, 130, 246, 0.4)",
                        borderColor: "rgba(59, 130, 246, 0.8)"
                    }}
                    whileTap={{ scale: 0.9 }}
                >
                    <ArrowUp size={24} strokeWidth={2} />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
