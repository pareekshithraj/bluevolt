"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ConsentAnalytics from "@/components/ConsentAnalytics";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStores24 = pathname.startsWith("/stores24");
  const isEmployeePortal = pathname.startsWith("/employee");

  if (isStores24 || isEmployeePortal) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <ScrollProgress />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      <Footer />
      <CookieConsentBanner />
      <ConsentAnalytics />
      <BackToTop />
    </div>
  );
}
