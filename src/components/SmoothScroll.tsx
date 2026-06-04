"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function SmoothScroll({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isEmployeePortal = pathname.startsWith("/employee");
    const isStores24 = pathname.startsWith("/stores24");

    if (isEmployeePortal || isStores24) {
        return <>{children}</>;
    }

    return (
        <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
            {children}
        </ReactLenis>
    );
}
