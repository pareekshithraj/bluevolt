import type { Metadata } from "next";
import styles from "../legal/page.module.css";

const title = "Terms of Service | BLUEVOLT";
const description =
  "Terms of Service for BLUEVOLT Groups Private Limited products and services.";
const url = "https://bluevolt.group/terms";
const image = "https://bluevolt.group/icon.png";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/terms",
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
        alt: "BLUEVOLT Terms of Service",
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

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>
          These terms govern use of BLUEVOLT websites, products, APIs, and
          related services. By using our services, you agree to these terms.
        </p>
        <p className={styles.meta}>Last updated: March 11, 2026</p>

        <section className={styles.section}>
          <h2>1. Service Access</h2>
          <p>
            Access to certain features requires account registration and valid
            organizational authorization. You are responsible for maintaining
            account credentials and all activities under your account.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Acceptable Use</h2>
          <ul>
            <li>Do not misuse, disrupt, or attempt unauthorized access to our systems.</li>
            <li>Do not upload unlawful, harmful, or infringing content.</li>
            <li>Use services in compliance with applicable laws and institutional policies.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Intellectual Property</h2>
          <p>
            BLUEVOLT and its licensors retain all rights in the platform,
            software, branding, and content. No rights are transferred except as
            expressly granted under these terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Service Changes and Availability</h2>
          <p>
            We may modify, suspend, or discontinue parts of the service to
            improve reliability, security, or product capabilities. We will make
            reasonable efforts to provide advance notice for material changes.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, BLUEVOLT is not liable for
            indirect, incidental, special, or consequential damages resulting
            from use of the services.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Contact</h2>
          <p>
            For legal questions, contact{" "}
            <a className={styles.mailLink} href="mailto:legal@bluevolt.in">
              legal@bluevolt.in
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
