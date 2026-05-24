"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readCookieConsent, type CookieConsent } from "@/lib/cookies/consent";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: {
      (...args: unknown[]): void;
      q?: unknown[];
    };
    __bluevoltGaInitialized?: boolean;
    __bluevoltClarityInitialized?: boolean;
    [key: string]: unknown;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() ?? "";

function appendScript(id: string, src: string, async = true) {
  if (document.getElementById(id)) {
    return;
  }

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = async;
  document.head.appendChild(script);
}

function initGoogleAnalytics(measurementId: string) {
  if (!measurementId || typeof window === "undefined") {
    return;
  }

  if (!window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
  }

  appendScript(
    "bluevolt-ga-script",
    `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
  );

  if (!window.__bluevoltGaInitialized) {
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });
    window.__bluevoltGaInitialized = true;
  }

  window[`ga-disable-${measurementId}`] = false;
}

function disableGoogleAnalytics(measurementId: string) {
  if (!measurementId || typeof window === "undefined") {
    return;
  }

  window[`ga-disable-${measurementId}`] = true;
}

function initClarity(projectId: string) {
  if (!projectId || typeof window === "undefined") {
    return;
  }

  if (!window.clarity) {
    window.clarity = (...args: unknown[]) => {
      if (!window.clarity) {
        return;
      }

      window.clarity.q = window.clarity.q || [];
      window.clarity.q.push(args);
    };
  }

  appendScript(
    "bluevolt-clarity-script",
    `https://www.clarity.ms/tag/${projectId}`,
  );

  window.__bluevoltClarityInitialized = true;
}

function trackPageView(measurementId: string, pagePath: string) {
  if (!measurementId || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: document.title,
  });
}

export default function ConsentAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const syncConsent = () => {
      setConsent(readCookieConsent());
    };

    syncConsent();
    window.addEventListener("bluevolt-cookie-consent-updated", syncConsent);
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener("bluevolt-cookie-consent-updated", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  useEffect(() => {
    if (consent?.analytics) {
      initGoogleAnalytics(GA_ID);
      initClarity(CLARITY_ID);
      return;
    }

    disableGoogleAnalytics(GA_ID);
  }, [consent]);

  useEffect(() => {
    if (!consent?.analytics) {
      return;
    }

    trackPageView(GA_ID, pathname);
  }, [consent, pathname]);

  return null;
}
