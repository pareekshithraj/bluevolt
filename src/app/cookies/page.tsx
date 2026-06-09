import type { Metadata } from "next";
import styles from "../legal/page.module.css";
import CookiePreferencesManager from "./CookiePreferencesManager";

const title = "Cookie Preferences | BLUEVOLT";
const description =
  "Cookie categories and preference controls for BLUEVOLT websites and services.";
const url = "https://bluevolt.group/cookies";
const image = "https://bluevolt.group/icon.png";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/cookies",
  },
  openGraph: {
    title,
    description,
    url,
    siteName: "BLUEVOLT",
    type: "article",
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: "BLUEVOLT Cookie Preferences",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
};

export default function CookiesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Cookie Preferences</h1>
        <p className={styles.subtitle}>
          We use cookies and similar technologies to operate the site,
          understand usage, and improve service quality.
        </p>
        <p className={styles.meta}>Last updated: March 11, 2026</p>

        <section className={styles.section}>
          <h2>1. Essential Cookies</h2>
          <p>
            Required for core site functionality such as security, session
            management, and network reliability. These cannot be disabled.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Analytics Cookies</h2>
          <p>
            Help us understand how visitors use our site so we can improve
            performance and user experience. When configured, this may include
            tools such as Google Analytics and Microsoft Clarity.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Functional Cookies</h2>
          <p>
            Enable enhanced features and personalized settings when available.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Managing Preferences</h2>
          <p>
            Use the preference center below or your browser settings. Blocking
            some categories may impact parts of the site.
          </p>
        </section>
        <CookiePreferencesManager />
      </div>
    </main>
  );
}
