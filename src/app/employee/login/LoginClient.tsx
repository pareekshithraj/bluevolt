"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BarChart3, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, TrendingUp } from "lucide-react";
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
    <main className={`${styles.salesaiLogin} ${theme === "light" ? styles.themeLight : styles.themeDark}`}>
      <section className={styles.salesaiVisual} aria-hidden="true">
        <div className={styles.salesaiBrand}>
          <Image src="/logo.png" alt="BlueVolt Logo" width={118} height={50} />
          <span>BLUEVOLT</span>
        </div>
        <div className={`${styles.floatPanel} ${styles.floatPanelOne}`}>
          <div className={styles.panelMenu}>...</div>
          <span className={styles.panelKicker}>Workspace pulse</span>
          <strong>Work</strong>
          <p>tasks, attendance, and daily queues</p>
          <div className={styles.miniHeatmap}>
            {Array.from({ length: 12 }).map((_, index) => <i key={index} />)}
          </div>
        </div>
        <div className={`${styles.floatPanel} ${styles.floatPanelTwo}`}>
          <span className={styles.panelIcon}><TrendingUp size={20} /></span>
          <span className={styles.panelKicker}>CRM progress</span>
          <strong>CRM</strong>
          <p>assigned sheets and callbacks</p>
          <em>role based</em>
        </div>
        <div className={`${styles.floatPanel} ${styles.floatPanelThree}`}>
          <span className={styles.panelIcon}><BarChart3 size={20} /></span>
          <span className={styles.panelKicker}>Team hours</span>
          <strong>Hours</strong>
          <p>check-in and check-out history</p>
        </div>
        <div className={`${styles.floatPanel} ${styles.floatPanelFour}`}>
          <span className={styles.panelIcon}><CheckCircle2 size={20} /></span>
          <strong>Docs</strong>
          <p>signed employee records</p>
        </div>
        <div className={styles.loginCenterLogo}>
          <Image src="/logo.png" alt="" width={128} height={72} />
        </div>
      </section>
      <section className={styles.salesaiFormPane}>
        <div className={styles.salesaiFormShell}>
          <div className={styles.salesaiMobileLogo}>
            <Image src="/logo.png" alt="BlueVolt Logo" width={120} height={58} />
          </div>
          <h1>Sign in to BlueVolt</h1>
          <p>Employee workspace, CRM, resources, meetings, and attendance.</p>
          {error && <div className={styles.loginErrorCompact}><span>{error}</span></div>}
          <form onSubmit={submit} className={styles.salesaiForm}>
            <label>
              <span>Email</span>
              <Mail size={17} />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLockedOut} placeholder="Email" />
            </label>
            <label>
              <span>Password</span>
              <Lock size={17} />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLockedOut} placeholder="Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>
            <button className={styles.salesaiSubmit} type="submit" disabled={pending || isLockedOut}>
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className={styles.loginDivider}><span>Private access</span></div>
          <div className={styles.loginSecurityLine}>
            <ShieldCheck size={18} />
            <span>New users sign in with the default password and reset it from Profile.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
