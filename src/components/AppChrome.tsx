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

  if (isStores24) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <ScrollProgress />
      {children}
      <Footer />
      <CookieConsentBanner />
      <ConsentAnalytics />
      <BackToTop />
    </>
  );
}
