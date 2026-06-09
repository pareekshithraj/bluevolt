import { Metadata } from "next";

const pageTitle = "Contact | BLUEVOLT";
const pageDescription =
  "Connect with BLUEVOLT's global sales team to discover how we can synchronize your institution's digital infrastructure.";
const pageUrl = "https://bluevolt.group/contact";
const ogImage = "https://bluevolt.group/icon.png";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    siteName: "BLUEVOLT",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "BLUEVOLT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [ogImage],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
