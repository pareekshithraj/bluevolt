import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Schools24",
    description: "End-to-end infrastructure for modern schools. We handle technology, smart classrooms, and systems so you can focus on education.",
    openGraph: {
        title: "Schools24 | BlueVolt",
        description: "End-to-end infrastructure for modern schools. We handle technology, smart classrooms, and systems so you can focus on education.",
        url: "https://bluevolt.group/products/schools24",
    },
};

export default function Schools24Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
