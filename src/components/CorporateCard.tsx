"use client";

import React from "react";
import Image from "next/image";
import { LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

interface CorporateCardProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    image?: string;
    link?: string;
    linkText?: string;
    delay?: number;
    className?: string;
}

export default function CorporateCard({
    title,
    description,
    icon: Icon,
    image,
    link,
    linkText,
    delay = 0.2,
    className = "",
}: CorporateCardProps) {
    const content = (
        <div className={`brand-card ${className}`}>
            {image ? (
                <div className="brand-image-container">
                    <Image
                        src={image}
                        alt={`${title} logo`}
                        width={56}
                        height={56}
                        className="brand-image-logo"
                    />
                </div>
            ) : Icon ? (
                <div className="brand-image-container">
                    <Icon size={32} strokeWidth={2} color="var(--accent)" className="animate-icon" />
                </div>
            ) : null}

            <h3>{title}</h3>
            <p>{description}</p>

            {link && (
                <a
                    href={link}
                    target={link.startsWith('http') ? "_blank" : "_self"}
                    rel={link.startsWith('http') ? "noopener noreferrer" : ""}
                    className="brand-link"
                >
                    {linkText || "Learn More"}
                </a>
            )}
        </div>
    );

    return (
        <Reveal delay={delay} width="100%">
            {content}
        </Reveal>
    );
}
