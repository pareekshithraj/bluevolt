"use client";

import { FormEvent, useState, useTransition } from "react";
import { Briefcase } from "lucide-react";
import { submitEmployeeApplication } from "@/app/actions/employee-portal";
import styles from "../portal.module.css";

function values(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
}

export default function ApplyClient() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = event.currentTarget;
    const formValues = values(form);
    const notes = [
      `Employee type: ${formValues.employeeType || "Not selected"}`,
      `Paid preference: ${formValues.paidPreference || "Not selected"}`,
      `Experience: ${formValues.experienceYears || "0"} years`,
      `Available from: ${formValues.availableFrom || "Not provided"}`,
      `Expected pay/stipend: ${formValues.expectedPay || "Not provided"}`,
      `Location: ${formValues.location || "Not provided"}`,
      `Skills: ${formValues.skills || "Not provided"}`,
      `Portfolio/Resume: ${formValues.portfolioUrl || "Not provided"}`,
      `Notes: ${formValues.notes || "Not provided"}`,
    ].join("\n");
    const payload = {
      name: formValues.name,
      email: formValues.email,
      phone: formValues.phone,
      roleApplied: formValues.roleApplied,
      notes,
    };
    startTransition(async () => {
      const result = await submitEmployeeApplication(payload);
      if (!result.success) {
        setError(result.error || "Application failed. Please try again.");
        return;
      }
      form.reset();
      setMessage("Application submitted. BlueVolt HR will review and contact you.");
    });
  };

  return (
    <main className={styles.login}>
      <section className={styles.loginCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Briefcase size={20} color="#635bff" />
          <h1 className={styles.title}>Apply to BlueVolt</h1>
        </div>
        <p className={styles.muted} style={{ marginBottom: 20 }}>Submit your details for employee or internship review.</p>
        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.notice}>{message}</div>}
        <form onSubmit={submit} className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Full name</span>
            <input className={styles.input} name="name" required />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Email</span>
            <input className={styles.input} name="email" type="email" required />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Phone / WhatsApp</span>
            <input className={styles.input} name="phone" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Role applying for</span>
            <select className={styles.select} name="roleApplied" required defaultValue="">
              <option value="" disabled>Select a role</option>
              <option>Engineering</option>
              <option>Sales</option>
              <option>Content Developer</option>
              <option>Operations</option>
              <option>HR</option>
              <option>Design</option>
              <option>Internship</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Employee Type</span>
            <select className={styles.select} name="employeeType" defaultValue="Intern">
              <option>Intern</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contractor</option>
              <option>Consultant</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Paid / Unpaid</span>
            <select className={styles.select} name="paidPreference" defaultValue="Paid">
              <option>Paid</option>
              <option>Unpaid internship okay</option>
              <option>Paid only</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Experience years</span>
            <input className={styles.input} name="experienceYears" type="number" min="0" step="0.5" defaultValue="0" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Available from</span>
            <input className={styles.input} name="availableFrom" type="date" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Expected pay / stipend</span>
            <input className={styles.input} name="expectedPay" placeholder="Example: Rs. 12000/month or negotiable" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Location</span>
            <input className={styles.input} name="location" placeholder="City, remote/hybrid preference" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Skills</span>
            <textarea className={styles.textarea} name="skills" placeholder="Tools, languages, CRM, content, sales, engineering skills" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Portfolio / resume link</span>
            <input className={styles.input} name="portfolioUrl" type="url" placeholder="Google Drive, LinkedIn, GitHub, portfolio, resume link" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Notes / links</span>
            <textarea className={styles.textarea} name="notes" placeholder="Anything HR should know" />
          </label>
          <button className={`${styles.button} ${styles.fieldWide}`} type="submit" disabled={pending}>
            {pending ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </section>
    </main>
  );
}
