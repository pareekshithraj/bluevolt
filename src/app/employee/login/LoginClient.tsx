"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import styles from "../portal.module.css";

function simpleLoginError(message?: string) {
  const text = (message || "").toLowerCase();
  if (
    text.includes("prisma") ||
    text.includes("database") ||
    text.includes("can't reach") ||
    text.includes("neon.tech") ||
    text.includes("connection") ||
    text.includes("timeout")
  ) {
    return "The employee portal is temporarily unavailable. Please try again in a minute.";
  }
  return message || "Login failed. Please try again.";
}

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const showSimpleFailure = (event: ErrorEvent | PromiseRejectionEvent) => {
      const value = "reason" in event ? event.reason : event.error || event.message;
      const text = value instanceof Error ? value.message : String(value || "");
      const isRawBrowserEvent = value instanceof Event || text === "[object Event]" || text === "[object Object]" || text.trim() === "";
      const isNetworkFailure = text.toLowerCase().includes("failed to fetch") || text.toLowerCase().includes("network");

      if (isRawBrowserEvent || isNetworkFailure) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setError("The employee portal is temporarily unavailable. Please try again in a minute.");
      }
    };

    window.addEventListener("error", showSimpleFailure, true);
    window.addEventListener("unhandledrejection", showSimpleFailure, true);
    return () => {
      window.removeEventListener("error", showSimpleFailure, true);
      window.removeEventListener("unhandledrejection", showSimpleFailure, true);
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/employee/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const result = await response.json();
        if (result.success && result.redirectTo) {
          router.push(result.redirectTo);
        } else {
          setError(simpleLoginError(result.error));
        }
      } catch {
        setError("The employee portal is temporarily unavailable. Please try again in a minute.");
      }
    });
  };

  return (
    <main className={styles.login}>
      <section className={styles.loginCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Lock size={20} color="#f59e0b" />
          <h1 className={styles.title}>Employee Gateway</h1>
        </div>
        <p className={styles.muted} style={{ marginBottom: 20 }}>Private BlueVolt workspace access</p>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={submit} className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Employee email</span>
            <input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Password</span>
            <input className={styles.input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className={`${styles.button} ${styles.fieldWide}`} type="submit" disabled={pending}>
            {pending ? "Authorizing..." : "Enter Portal"}
          </button>
        </form>
      </section>
    </main>
  );
}
