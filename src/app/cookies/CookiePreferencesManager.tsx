"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../legal/page.module.css";
import {
  createConsent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsent,
} from "@/lib/cookies/consent";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CookiePreferencesManager() {
  const [analytics, setAnalytics] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [stored, setStored] = useState<CookieConsent | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const current = readCookieConsent();
    if (!current) {
      return;
    }

    setStored(current);
    setAnalytics(current.analytics);
    setFunctional(current.functional);
  }, []);

  const statusLabel = useMemo(() => {
    if (!stored) {
      return "No choice saved yet";
    }

    if (stored.status === "accepted_all") {
      return "Accepted all";
    }

    if (stored.status === "rejected_optional") {
      return "Rejected optional";
    }

    return "Custom preferences";
  }, [stored]);

  const save = () => {
    const next = createConsent(analytics, functional, "customized");
    writeCookieConsent(next);
    setStored(next);
    setMessage("Your cookie preferences were saved.");
  };

  const acceptAll = () => {
    const next = createConsent(true, true, "accepted_all");
    writeCookieConsent(next);
    setStored(next);
    setAnalytics(true);
    setFunctional(true);
    setMessage("All optional cookies are now enabled.");
  };

  const rejectOptional = () => {
    const next = createConsent(false, false, "rejected_optional");
    writeCookieConsent(next);
    setStored(next);
    setAnalytics(false);
    setFunctional(false);
    setMessage("Optional cookies are now disabled.");
  };

  return (
    <section className={styles.preferenceCard} aria-label="Cookie preference center">
      <h2 className={styles.preferenceTitle}>Preference Center</h2>
      <p className={styles.preferenceText}>
        Essential cookies are always on. You can choose whether analytics and
        functional cookies are enabled.
      </p>

      <div className={styles.preferenceRowStatic}>
        <div>
          <p className={styles.preferenceLabel}>Saved status</p>
          <p className={styles.preferenceHint}>
            {statusLabel}
            {stored ? ` on ${formatDate(stored.updatedAt)}` : ""}
          </p>
        </div>
      </div>

      <div className={styles.preferenceRowStatic}>
        <div>
          <p className={styles.preferenceLabel}>Essential cookies</p>
          <p className={styles.preferenceHint}>Required for security and availability.</p>
        </div>
        <span className={styles.preferenceTagOn}>Always active</span>
      </div>

      <div className={styles.preferenceRowStatic}>
        <div>
          <p className={styles.preferenceLabel}>Analytics cookies</p>
          <p className={styles.preferenceHint}>Help us measure traffic and improve UX.</p>
        </div>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
          <span>Enabled</span>
        </label>
      </div>

      <div className={styles.preferenceRowStatic}>
        <div>
          <p className={styles.preferenceLabel}>Functional cookies</p>
          <p className={styles.preferenceHint}>Remember your preferences and settings.</p>
        </div>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={functional}
            onChange={(event) => setFunctional(event.target.checked)}
          />
          <span>Enabled</span>
        </label>
      </div>

      <div className={styles.preferenceActions}>
        <button type="button" className={styles.buttonPrimary} onClick={save}>
          Save preferences
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={acceptAll}>
          Accept all
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={rejectOptional}>
          Reject optional
        </button>
      </div>

      {message ? <p className={styles.preferenceMessage}>{message}</p> : null}
    </section>
  );
}
