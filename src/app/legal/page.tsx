import type { Metadata } from "next";
import styles from "./page.module.css";
import Link from "next/link";

const title = "Legal Disclosure & Corporate Information | BLUEVOLT";
const description =
  "Official legal disclosure and corporate information for BLUEVOLT Groups Private Limited.";
const url = "https://bluevolt.group/legal";
const image = "https://bluevolt.group/icon.png";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/legal",
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
        alt: "BLUEVOLT Legal Disclosure",
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

export default function LegalPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Governance</p>
        <h1 className={styles.title}>Legal Disclosure</h1>
        <p className={styles.subtitle}>
          Corporate information and statutory disclosures for BLUEVOLT Groups Private Limited.
        </p>
        <p className={styles.meta}>Last updated: April 26, 2026</p>

        <section className={styles.section}>
          <h2>1. Corporate Identity</h2>
          <ul>
            <li><strong>Company Name:</strong> BLUEVOLT Groups Private Limited</li>
            <li><strong>Registered Under:</strong> The Companies Act, 2013</li>
            <li><strong>Incorporation Sub-category:</strong> Company limited by shares</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Registered Office</h2>
          <p>
            The registered office of the company is situated in the state of <strong>Karnataka, India</strong>.
          </p>
          <p>
            Operating operations and development branches are distributed globally and across various technical centers.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Board of Directors</h2>
          <ul>
            <li><strong>Pareekshith Raj</strong> (Founder and CEO)</li>
            <li><strong>Swathi K N</strong> (Director)</li>
            <li><strong>Rahul H R</strong> (Director)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Contact Information</h2>
          <p>
            You may contact us regarding any official inquiries or general questions at the following:
          </p>
          <ul>
            <li><strong>Official Email:</strong> <a className={styles.mailLink} href="mailto:Pareekshithraj@schools24.in">Pareekshithraj@schools24.in</a></li>
            <li><strong>Phone:</strong> +91 9110893850</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Dispute Resolution & Jurisdiction</h2>
          <p>
            The BLUEVOLT platform, services, and associated legal matters are subject to the laws of India. Any disputes arising out of the use of our services or related to our corporate entity are subject to the exclusive jurisdiction of the courts in Karnataka, India.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Other Mandated Policies</h2>
          <p>
            For information regarding how we handle your data, your usage rights, and platform security, please review our other policies:
          </p>
          <div className={styles.preferenceActions} style={{ marginTop: '1rem' }}>
            <Link href="/privacy" className={styles.buttonSecondary} style={{ textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" className={styles.buttonSecondary} style={{ textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/cookies" className={styles.buttonSecondary} style={{ textDecoration: 'none' }}>Cookie Preferences</Link>
          </div>
        </section>

      </div>
    </main>
  );
}
