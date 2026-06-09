import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Careers",
    description: "Join BLUEVOLT and build the future of education. Discover open roles in engineering, design, and operations.",
    openGraph: {
        title: "Careers | BLUEVOLT",
        description: "Join BLUEVOLT and build the future of education. Discover open roles in engineering, design, and operations.",
        url: "https://bluevolt.group/careers",
    },
};

export default function CareersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
