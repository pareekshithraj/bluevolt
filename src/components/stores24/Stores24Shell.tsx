"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState, useTransition } from "react";
import { readStores24Data } from "@/lib/stores24/storage";
import { logoutUser } from "@/app/actions/auth";

const navItems = [
  { href: "/stores24/dashboard", label: "Dashboard" },
  { href: "/stores24/pos", label: "POS" },
  { href: "/stores24/products", label: "Products" },
  { href: "/stores24/inventory", label: "Inventory" },
  { href: "/stores24/sales", label: "Sales" },
  { href: "/stores24/purchases", label: "Purchases" },
  { href: "/stores24/suppliers", label: "Suppliers" },
  { href: "/stores24/staff", label: "Staff" },
  { href: "/stores24/reports", label: "Reports" },
  { href: "/stores24/settings", label: "Settings" },
];

interface Stores24ShellProps {
  title: string;
  children: ReactNode;
}

export default function Stores24Shell({ title, children }: Stores24ShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [storeName] = useState(() => readStores24Data().settings.storeName || "Stores24");
  const [isLoggingOut, startLogout] = useTransition();

  const pageTitle = useMemo(() => title, [title]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", display: "grid", gridTemplateColumns: "260px 1fr" }}>
      <aside style={{ borderRight: "1px solid #e2e8f0", background: "#ffffff", padding: "1.25rem 1rem", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{storeName}</div>
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Retail POS + ERP</div>
        </div>

        <nav style={{ display: "grid", gap: "0.35rem" }}>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: active ? "#1d4ed8" : "#0f172a",
                  background: active ? "#dbeafe" : "transparent",
                  border: active ? "1px solid #bfdbfe" : "1px solid transparent",
                  borderRadius: "10px",
                  padding: "0.65rem 0.75rem",
                  fontWeight: active ? 700 : 500,
                  fontSize: "0.92rem",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => {
            startLogout(async () => {
              await logoutUser();
              router.push("/stores24/login");
            });
          }}
          style={{ marginTop: "1rem", width: "100%", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "10px", padding: "0.65rem 0.75rem", fontWeight: 600, cursor: "pointer", opacity: isLoggingOut ? 0.7 : 1 }}
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </aside>

      <main style={{ padding: "1.5rem" }}>
        <header style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>{pageTitle}</h1>
          <div style={{ fontSize: "0.9rem", color: "#475569" }}>Protected Stores24 workspace</div>
        </header>

        {children}
      </main>
    </div>
  );
}


