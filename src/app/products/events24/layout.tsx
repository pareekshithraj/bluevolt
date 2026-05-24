import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Events24",
    description: "Transform chaotic campus events into flawless, data-driven experiences with Events24. From ticketing to real-time analytics.",
    openGraph: {
        title: "Events24 | BlueVolt",
        description: "Transform chaotic campus events into flawless, data-driven experiences with Events24. From ticketing to real-time analytics.",
        url: "https://bluevolt.group/products/events24",
    },
};

export default function Events24Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
