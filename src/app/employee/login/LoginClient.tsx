"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
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
    <main className={`${styles.login} ${theme === "light" ? styles.themeLight : styles.themeDark}`}>
      <div className={styles.loginCard} style={{ maxWidth: "440px", padding: "3rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Image src="/Assets/Logos/BLUEVOLT.png" alt="BLUEVOLT Logo" width={180} height={40} style={{ margin: "0 auto 1.5rem", objectFit: "contain" }} unoptimized />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Sign in to BLUEVOLT
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Employee workspace and portal access
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "500", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Email</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                <Mail size={16} />
              </div>
              <input 
                type="email" 
                value={email} 
                onChange={(event) => setEmail(event.target.value)} 
                required 
                disabled={isLockedOut} 
                placeholder="name@bluevolt.group" 
                style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 2.5rem", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.95rem" }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "500", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Password</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                <Lock size={16} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                required 
                disabled={isLockedOut} 
                placeholder="Password" 
                style={{ width: "100%", padding: "0.75rem 2.5rem", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.95rem" }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={pending || isLockedOut}
            style={{ width: "100%", padding: "0.85rem", marginTop: "0.5rem", background: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "500", fontSize: "0.95rem", cursor: (pending || isLockedOut) ? "wait" : "pointer", opacity: (pending || isLockedOut) ? 0.7 : 1 }}
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <span>New users sign in with the default password and reset it from Profile.</span>
        </div>
      </div>
    </main>
  );
}
