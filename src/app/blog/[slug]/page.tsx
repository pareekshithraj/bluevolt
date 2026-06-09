import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { blogPosts, formatBlogDate, getBlogPostBySlug, type BlogLink } from "../posts";

type BlogPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: {
        absolute: "BLUEVOLT Blog",
      },
      description:
        "Perspectives from BLUEVOLT Groups Private Limited on digital infrastructure and integrated ecosystems.",
    };
  }

  const url = `https://bluevolt.group/blog/${post.slug}`;

  return {
    title: {
      absolute: post.title,
    },
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      locale: "en_IN",
      siteName: "BLUEVOLT",
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function renderLink(link: BlogLink, key: string) {
  if (link.external) {
    return (
      <a
        key={key}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sectionLink}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link key={key} href={link.href} className={styles.sectionLink}>
      {link.label}
    </Link>
  );
}

export default async function BlogArticlePage({ params }: BlogPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const postUrl = `https://bluevolt.group/blog/${post.slug}`;
  const relatedPosts = blogPosts
    .filter((candidate) => candidate.slug !== post.slug)
    .slice(0, 3);

  const blogPostingLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    url: postUrl,
    inLanguage: "en-IN",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    articleSection: post.sections.map((section) => section.title),
    author: {
      "@type": "Organization",
      name: "BLUEVOLT Groups Private Limited",
    },
    publisher: {
      "@type": "Organization",
      name: "BLUEVOLT Groups Private Limited",
      logo: {
        "@type": "ImageObject",
        url: "https://bluevolt.group/icon.png",
      },
    },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }}
      />

      <article className={styles.article}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>BLUEVOLT Insights</p>
          <h1 className={styles.title}>{post.title}</h1>
          <p className={styles.subtitle}>{post.subtitle}</p>
          <p className={styles.meta}>
            Published on{" "}
            <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
            <span aria-hidden="true"> | </span>
            <span>{post.readingTime}</span>
          </p>
        </header>

        <div className={styles.content}>
          {post.sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id}>{section.title}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={`${section.id}-paragraph-${index}`}>{paragraph}</p>
              ))}

              {section.links && section.links.length > 0 ? (
                <p className={styles.linksRow}>
                  {section.links.map((link, index) =>
                    renderLink(link, `${section.id}-link-${index}`),
                  )}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </article>

      <aside className={styles.readNext} aria-label="Read next">
        <div className={styles.readNextHeader}>
          <h2>Read Next</h2>
          <Link href="/blog" className={styles.viewAll}>
            View all articles
          </Link>
        </div>

        <div className={styles.relatedGrid}>
          {relatedPosts.map((relatedPost) => (
            <article key={relatedPost.slug} className={styles.relatedCard}>
              <p className={styles.relatedMeta}>
                <time dateTime={relatedPost.publishedAt}>
                  {formatBlogDate(relatedPost.publishedAt)}
                </time>
                <span aria-hidden="true"> | </span>
                <span>{relatedPost.readingTime}</span>
              </p>

              <h3>
                <Link href={`/blog/${relatedPost.slug}`}>{relatedPost.title}</Link>
              </h3>
            </article>
          ))}
        </div>
      </aside>
    </main>
  );
}
