import type { Metadata } from "next";
import styles from "../legal/page.module.css";

const title = "Privacy Policy | BlueVolt";
const description =
  "Privacy Policy for BlueVolt Groups Private Limited products and services, including schools24.in.";
const url = "https://bluevolt.group/privacy";
const image = "https://bluevolt.group/icon.png";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title,
    description,
    url,
    siteName: "BlueVolt",
    type: "article",
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: "BlueVolt Privacy Policy",
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

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>
          This policy explains how BlueVolt Groups Private Limited collects, uses,
          stores, and protects personal data across our websites and products,
          including Schools24.
        </p>
        <p className={styles.meta}>Last updated: March 11, 2026</p>

        <section className={styles.section}>
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly, such as contact details,
            account information, organization details, and support requests. We
            also collect technical data such as device type, browser type, IP
            address, and usage analytics.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. How We Use Information</h2>
          <ul>
            <li>To provide and improve our services.</li>
            <li>To manage user accounts and organization access controls.</li>
            <li>To communicate product updates, security alerts, and support responses.</li>
            <li>To comply with legal and regulatory requirements.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Data Sharing and Disclosure</h2>
          <p>
            We do not sell personal information. We may share information with
            service providers that help us operate infrastructure, analytics,
            customer support, and security operations. All such processing is
            governed by contractual safeguards.
          </p>
          <p>
            Analytics tools are enabled only when optional analytics consent is
            provided through our cookie preference controls.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Data Security and Retention</h2>
          <p>
            We use reasonable technical and organizational measures to protect
            data from unauthorized access, misuse, and loss. Data is retained only
            for as long as required to deliver services, meet contractual
            obligations, or satisfy legal requirements.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Your Rights</h2>
          <p>
            Depending on applicable law, you may have rights to access, correct,
            delete, or restrict processing of your personal data. You may also
            request data portability where applicable.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Contact</h2>
          <p>
            For privacy requests, contact us at{" "}
            <a className={styles.mailLink} href="mailto:privacy@bluevolt.in">
              privacy@bluevolt.in
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
