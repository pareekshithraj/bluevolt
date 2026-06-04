"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Info } from "lucide-react";
import styles from "../portal.module.css";

function simpleLoginError(message?: string) {
  const text = (message || "").toLowerCase();
  if (
    text.includes("prisma") ||
    text.includes("database") ||
    text.includes("can't reach") ||
    text.includes("supabase.co") ||
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const isLockedOut = lockoutRemaining > 0;

  useEffect(() => {
    setTheme("light");
    localStorage.setItem("bluevolt-theme", "light");
  }, []);

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

  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemaining(0);
      return;
    }

    const syncLockout = () => {
      const remaining = Math.max(0, lockoutUntil - Date.now());
      setLockoutRemaining(remaining);
      if (remaining === 0) {
        setLockoutUntil(0);
        setLoginAttempts(0);
      }
    };

    syncLockout();
    const timer = window.setInterval(syncLockout, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutUntil]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (isLockedOut) {
      const remainingSeconds = Math.ceil(lockoutRemaining / 1000);
      setError(`Too many attempts. Please wait ${remainingSeconds} seconds.`);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/employee/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const result = await response.json();
        if (response.ok && result.success && result.redirectTo) {
          setLoginAttempts(0);
          setLockoutUntil(0);
          setLockoutRemaining(0);
          router.push(result.redirectTo);
          return;
        }

        if (response.status >= 500) {
          setError(simpleLoginError(result.error));
          return;
        }

        setLoginAttempts((previousAttempts) => {
          const nextAttempts = previousAttempts + 1;
          if (nextAttempts >= 3) {
            setLockoutUntil(Date.now() + 60000);
            setError("Too many failed attempts. Please wait 1 minute before trying again.");
          } else {
            setError(simpleLoginError(result.error));
          }
          return nextAttempts;
        });
      } catch {
        setError("The employee portal is temporarily unavailable. Please try again in a minute.");
      }
    });
  };

  return (
    <main className={`${styles.loginWrapper} ${theme === "light" ? styles.themeLight : styles.themeDark}`}>
      <div className={styles.loginVisual}>
        <div className={styles.loginVisualContent}>
          <Image src="/logo.png" alt="BlueVolt Logo" width={132} height={56} style={{ height: 56, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.95 }} />
        </div>
        <div className={`${styles.loginVisualContent} ${styles.loginQuote}`}>
          BlueVolt internal<br />workspace access.
        </div>
      </div>
      <div className={styles.loginFormContainer}>
        <section className={styles.loginCardPremium}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 30 }}>
            <span className={styles.loginStatusPill}>Private employee access</span>
            <div className={styles.loginLogoMark}>
              <Image src="/logo.png" alt="BlueVolt Logo" width={168} height={112} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h1 className={styles.title} style={{ fontSize: "2.15rem", marginBottom: 6 }}>Employee Gateway</h1>
              <p className={styles.muted}>Sign in to dashboard, CRM, resources, meetings, and attendance.</p>
            </div>
          </div>
          {error && <div className={`${styles.toast} ${styles.toastError}`} style={{ position: "relative", top: 0, right: 0, marginBottom: 20 }}><span>{error}</span></div>}
          <form onSubmit={submit} className={styles.formGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Employee Email</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
                  <Mail size={18} />
                </span>
                <input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLockedOut} style={{ paddingLeft: 42 }} />
              </div>
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Password</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
                  <Lock size={18} />
                </span>
                <input className={styles.input} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLockedOut} style={{ paddingLeft: 42, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit" disabled={pending || isLockedOut} style={{ marginTop: 8 }}>
              {pending ? "Authorizing..." : "Secure Login"}
            </button>
            <div className={`${styles.loginSecurityHint} ${styles.fieldWide}`} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", background: "var(--bg-shell)", padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--border-color)", marginTop: 12 }}>
              <Info size={16} style={{ color: "var(--text-brand)", flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "left", lineHeight: "1.4" }}>
                New employees use the default password, then reset it from Profile after first login.
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
