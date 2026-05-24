export type CookieConsentStatus =
  | "accepted_all"
  | "rejected_optional"
  | "customized";

export type CookieConsent = {
  essential: true;
  analytics: boolean;
  functional: boolean;
  status: CookieConsentStatus;
  updatedAt: string;
};

export const COOKIE_CONSENT_KEY = "bluevolt_cookie_consent_v1";

export function createConsent(
  analytics: boolean,
  functional: boolean,
  status: CookieConsentStatus,
): CookieConsent {
  return {
    essential: true,
    analytics,
    functional,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (
      parsed.essential === true &&
      typeof parsed.analytics === "boolean" &&
      typeof parsed.functional === "boolean" &&
      typeof parsed.status === "string" &&
      typeof parsed.updatedAt === "string"
    ) {
      return {
        essential: true,
        analytics: parsed.analytics,
        functional: parsed.functional,
        status: parsed.status as CookieConsentStatus,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function writeCookieConsent(consent: CookieConsent) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new Event("bluevolt-cookie-consent-updated"));
}
