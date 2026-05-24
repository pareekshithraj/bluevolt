"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./CookieConsentBanner.module.css";
import {
  createConsent,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookies/consent";

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [functional, setFunctional] = useState(false);

  useEffect(() => {
    const syncFromStorage = () => {
      const existing = readCookieConsent();
      if (!existing) {
        setIsVisible(true);
        return;
      }

      setAnalytics(existing.analytics);
      setFunctional(existing.functional);
      setIsVisible(false);
    };

    syncFromStorage();
    window.addEventListener("bluevolt-cookie-consent-updated", syncFromStorage);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(
        "bluevolt-cookie-consent-updated",
        syncFromStorage,
      );
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const acceptAll = () => {
    writeCookieConsent(createConsent(true, true, "accepted_all"));
    setIsVisible(false);
  };

  const rejectOptional = () => {
    writeCookieConsent(createConsent(false, false, "rejected_optional"));
    setIsVisible(false);
  };

  const saveCustom = () => {
    writeCookieConsent(createConsent(analytics, functional, "customized"));
    setIsVisible(false);
  };

  return (
    <section className={styles.banner} aria-label="Cookie consent">
      <div className={styles.inner}>
        <h2 className={styles.title}>Cookie Preferences</h2>
        <p className={styles.text}>
          We use essential cookies to keep this site secure and working. With
          your permission, we also use analytics and functional cookies. Review
          details in our <Link href="/cookies">Cookie Preferences</Link> page.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={acceptAll}>
            Accept all
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={rejectOptional}
          >
            Reject optional
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => setShowCustomize((value) => !value)}
          >
            Customize
          </button>
        </div>

        {showCustomize ? (
          <div className={styles.customPanel}>
            <div className={styles.preferenceRow}>
              <div>
                <p className={styles.preferenceLabel}>Essential cookies</p>
                <p className={styles.preferenceHint}>
                  Required for core functionality and security.
                </p>
              </div>
              <button
                type="button"
                className={`${styles.switch} ${styles.switchOn} ${styles.disabled}`}
                aria-label="Essential cookies always enabled"
                disabled
              >
                <span className={`${styles.knob} ${styles.knobOn}`} />
              </button>
            </div>

            <div className={styles.preferenceRow}>
              <div>
                <p className={styles.preferenceLabel}>Analytics cookies</p>
                <p className={styles.preferenceHint}>
                  Measure traffic and product usage.
                </p>
              </div>
              <button
                type="button"
                className={`${styles.switch} ${analytics ? styles.switchOn : ""}`}
                aria-label="Toggle analytics cookies"
                onClick={() => setAnalytics((value) => !value)}
              >
                <span className={`${styles.knob} ${analytics ? styles.knobOn : ""}`} />
              </button>
            </div>

            <div className={styles.preferenceRow}>
              <div>
                <p className={styles.preferenceLabel}>Functional cookies</p>
                <p className={styles.preferenceHint}>
                  Remember settings and improve your experience.
                </p>
              </div>
              <button
                type="button"
                className={`${styles.switch} ${functional ? styles.switchOn : ""}`}
                aria-label="Toggle functional cookies"
                onClick={() => setFunctional((value) => !value)}
              >
                <span className={`${styles.knob} ${functional ? styles.knobOn : ""}`} />
              </button>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={saveCustom}>
                Save preferences
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
