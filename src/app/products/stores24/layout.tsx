import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Stores24",
    description: "Stores24 is BlueVolt's connected retail operations platform for catalog, orders, inventory, and fulfillment visibility.",
    openGraph: {
        title: "Stores24 | BlueVolt",
        description: "Connected retail operations platform for catalog, orders, inventory, and fulfillment visibility.",
        url: "https://bluevolt.group/products/stores24",
    },
};

export default function Stores24Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
