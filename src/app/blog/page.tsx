import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { blogPosts, formatBlogDate } from "./posts";

const BLOG_TITLE = "BlueVolt Blog: Insights on Integrated Digital Infrastructure";
const BLOG_DESCRIPTION =
  "Perspectives from BlueVolt Groups Private Limited on integrated software ecosystems, digital infrastructure, enterprise operations, and global market readiness.";
const BLOG_URL = "https://bluevolt.group/blog";

export const metadata: Metadata = {
  title: {
    absolute: BLOG_TITLE,
  },
  description: BLOG_DESCRIPTION,
  keywords: [
    "Schools24",
    "schools24.in",
    "NEP 2020",
    "school management software India",
    "education digital infrastructure",
    "BlueVolt blog",
  ],
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: BLOG_URL,
    type: "website",
    locale: "en_IN",
    siteName: "BlueVolt",
  },
  twitter: {
    card: "summary_large_image",
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
  },
};

const itemListLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: BLOG_TITLE,
  itemListElement: blogPosts.map((post, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${BLOG_URL}/${post.slug}`,
    name: post.title,
  })),
};

export default function BlogIndexPage() {
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <section className={styles.hero} aria-labelledby="blog-heading">
        <p className={styles.eyebrow}>BlueVolt Perspectives</p>
        <h1 id="blog-heading" className={styles.title}>
          Strategic Insights for the Global Digital Economy
        </h1>
        <p className={styles.subtitle}>
          Editorial perspectives from BlueVolt Groups Private Limited on
          integrated software ecosystems, enterprise execution, and digital
          infrastructure at scale.
        </p>
      </section>

      <section className={styles.gridSection} aria-label="Blog articles">
        <div className={styles.grid}>
          {blogPosts.map((post) => (
            <article key={post.slug} className={styles.card}>
              <p className={styles.cardMeta}>
                <time dateTime={post.publishedAt}>
                  {formatBlogDate(post.publishedAt)}
                </time>
                <span aria-hidden="true"> | </span>
                <span>{post.readingTime}</span>
              </p>

              <h2 className={styles.cardTitle}>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>

              <p className={styles.cardDescription}>{post.description}</p>

              <Link href={`/blog/${post.slug}`} className={styles.cardCta}>
                Read article
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
