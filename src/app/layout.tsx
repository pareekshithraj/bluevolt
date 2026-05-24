import type { Metadata } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  metadataBase: new URL('https://bluevolt.group'),
  alternates: {
    canonical: '/',
  },
  title: {
    default: "BLUEVOLT GROUPS | Next-Gen Digital Infrastructure",
    template: "%s | BLUEVOLT GROUPS",
  },
  description: "BLUEVOLT GROUPS builds the foundation for the future of digital infrastructure and educational technology.",
  keywords: ["BLUEVOLT GROUPS", "Digital Infrastructure", "Educational Technology", "EdTech", "Cloud Engineering", "Enterprise Solutions"],
  authors: [{ name: "BLUEVOLT GROUPS" }],
  creator: "BLUEVOLT GROUPS",
  publisher: "BLUEVOLT GROUPS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    title: "BLUEVOLT GROUPS | Next-Gen Digital Infrastructure",
    description: "BLUEVOLT GROUPS builds the foundation for the future of digital infrastructure and educational technology.",
    url: "https://bluevolt.group",
    siteName: "BLUEVOLT GROUPS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BLUEVOLT GROUPS | Next-Gen Digital Infrastructure",
    description: "Building the foundation for the future of digital infrastructure and educational technology.",
    creator: "@BlueVoltGroup",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "BLUEVOLT GROUPS",
  "url": "https://bluevolt.group",
  "logo": "https://bluevolt.group/logo.png",
  "founder": {
    "@type": "Person",
    "name": "Pareekshith Raj"
  },
  "sameAs": [
    "https://www.linkedin.com/company/bluevolt-groups",
    "https://www.crunchbase.com/organization/bluevolt-groups"
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="yama-container">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SmoothScroll>
            <AppChrome>{children}</AppChrome>
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
