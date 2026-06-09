import { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Us",
    description: "Learn about BLUEVOLT's mission to engineer the critical digital infrastructure required to run global educational ecosystems at scale.",
    openGraph: {
        title: "About Us | BLUEVOLT",
        description: "Learn about BLUEVOLT's mission to engineer the critical digital infrastructure required to run global educational ecosystems at scale.",
        url: "https://bluevolt.group/about",
    },
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
