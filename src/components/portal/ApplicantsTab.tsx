"use client";

import React, { useState } from "react";
import { Users } from "lucide-react";
import {
  updateEmployeeRecordStatus,
  deleteEmployeeEntity,
  saveApplicant,
  getEmployeePortalData,
} from "@/app/actions/employee-portal";
import styles from "@/app/employee/portal.module.css";

type PortalData = Awaited<ReturnType<typeof getEmployeePortalData>>;

interface SelectOption {
  label: string;
  value: string;
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: string[] | SelectOption[];
  textarea?: boolean;
}) {
  const className = `${styles.field} ${props.wide ? styles.fieldWide : ""}`;
  if (props.options) {
    return (
      <label className={className}>
        <span className={styles.label}>{props.label}</span>
        <select className={styles.select} name={props.name} defaultValue={props.defaultValue} required={props.required}>
          {props.options.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const label = typeof option === "string" ? option : option.label;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      </label>
    );
  }
  if (props.textarea) {
    return (
      <label className={className}>
        <span className={styles.label}>{props.label}</span>
        <textarea className={styles.textarea} name={props.name} defaultValue={props.defaultValue} placeholder={props.placeholder} required={props.required} />
      </label>
    );
  }
  return (
    <label className={className}>
      <span className={styles.label}>{props.label}</span>
      <input className={styles.input} type={props.type || "text"} name={props.name} defaultValue={props.defaultValue} placeholder={props.placeholder} required={props.required} />
    </label>
  );
}

interface ApplicantsTabProps {
  data: PortalData;
  runAction: (handler: () => Promise<{ success: boolean; error?: string }>) => void;
  copyApplicationLink: () => void;
  applicationLink: string;
  submit: <T extends Record<string, string>>(handler: (payload: T) => Promise<{ success: boolean; error?: string }>, cb?: () => void) => (e: React.FormEvent<HTMLFormElement>) => void;
  formatPortalDateTime: (date: string | Date | null | undefined) => string;
  downloadCsv: (fileName: string, rows: Record<string, string | number | null | undefined>[]) => void;
}

export default function ApplicantsTab({
  data,
  runAction,
  copyApplicationLink,
  applicationLink,
  submit,
  formatPortalDateTime,
  downloadCsv,
}: ApplicantsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const pendingApplicants = data.applicants.filter((applicant) => !["Offer", "Appointed", "Rejected"].includes(applicant.stage));
  const approvedApplicants = data.applicants.filter((applicant) => ["Offer", "Appointed"].includes(applicant.stage));
  const rejectedApplicants = data.applicants.filter((applicant) => applicant.stage === "Rejected");

  const filteredApplicants = data.applicants.filter((applicant) => {
    const searchText = `${applicant.name} ${applicant.email} ${applicant.roleApplied} ${applicant.phone || ""} ${applicant.stage} ${applicant.notes || ""}`.toLowerCase();
    return searchText.includes(searchTerm.toLowerCase());
  });

  const applicantRows = data.applicants.map((applicant) => ({
    Name: applicant.name,
    Email: applicant.email,
    Phone: applicant.phone || "",
    RoleApplied: applicant.roleApplied,
    Stage: applicant.stage,
    Source: applicant.source,
    MeetUrl: applicant.meetUrl || "",
    Notes: applicant.notes || "",
    CreatedAt: applicant.createdAt,
  }));

  return (
    <section className={styles.grid}>
      <div className={`${styles.dashboardHero} ${styles.span12}`}>
        <div>
          <div className={styles.eyebrow}>Hiring Console</div>
          <h1 className={styles.heroTitle}><Users size={24} style={{ marginRight: 8, verticalAlign: "middle" }} /> Recruitment decisions without follow-up data entry.</h1>
          <p className={styles.muted}>Applicants submit role, type, availability, links, and expectations up front. Admin can accept, reject, or edit only when needed.</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.button} type="button" onClick={copyApplicationLink}>Copy WhatsApp Link</button>
          <a className={styles.ghostButton} href={applicationLink} target="_blank" rel="noopener noreferrer">View Public Form</a>
        </div>
      </div>

      <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
        <span className={styles.muted}>Total Applications</span>
        <span className={styles.metricValue}>{data.applicants.length}</span>
      </div>
      <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
        <span className={styles.muted}>Awaiting Review</span>
        <span className={styles.metricValue}>{pendingApplicants.length}</span>
      </div>
      <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
        <span className={styles.muted}>Approved</span>
        <span className={styles.metricValue}>{approvedApplicants.length}</span>
      </div>
      <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
        <span className={styles.muted}>Rejected</span>
        <span className={styles.metricValue}>{rejectedApplicants.length}</span>
      </div>

      <div className={`${styles.card} ${styles.span12}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.cardTitle}>Applications</h2>
            <p className={styles.muted}>{pendingApplicants.length} pending decisions. Accept creates the HR signal; reject closes the applicant cleanly.</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className={styles.input}
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 220, minHeight: 38, padding: "8px 12px" }}
            />
            <button className={styles.ghostButton} type="button" onClick={() => downloadCsv("bluevolt-applicants.csv", applicantRows)} style={{ minHeight: 38, padding: "8px 14px" }}>Download CSV</button>
          </div>
        </div>
        <div className={styles.smartTable}>
          <div className={styles.smartTableHeader}>
            <span>Applicant</span>
            <span>Role</span>
            <span>Details</span>
            <span>Submitted</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {filteredApplicants.length === 0 ? <div className={styles.emptyState}>No applications found.</div> : filteredApplicants.map((applicant) => (
            <div className={styles.smartTableRow} key={applicant.id}>
              <div className={styles.identityCell}>
                <span className={styles.avatar}>{applicant.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                <span><strong>{applicant.name}</strong><small>{applicant.email}</small></span>
              </div>
              <span>{applicant.roleApplied}</span>
              <span className={styles.muted}>{applicant.phone || "No phone"}{applicant.notes ? ` - ${applicant.notes.slice(0, 90)}` : ""}</span>
              <span className={styles.muted}>{formatPortalDateTime(applicant.createdAt)}</span>
              <span className={applicant.stage === "Offer" ? `${styles.pill} ${styles.pillSuccess}` : applicant.stage === "Rejected" ? `${styles.pill} ${styles.pillMuted}` : `${styles.pill} ${styles.pillWarn}`}>{applicant.stage}</span>
              <span className={styles.actionStack}>
                {applicant.stage !== "Offer" && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "applicant", id: applicant.id.toString(), status: "Offer" }))}>Accept</button>}
                {applicant.stage !== "Rejected" && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "applicant", id: applicant.id.toString(), status: "Rejected" }))}>Reject</button>}
                <details className={styles.editPanel}>
                  <summary>Edit</summary>
                  <form className={styles.formGrid} onSubmit={submit(saveApplicant)}>
                    <input type="hidden" name="id" value={applicant.id} />
                    <Field label="Name" name="name" defaultValue={applicant.name} required />
                    <Field label="Email" name="email" type="email" defaultValue={applicant.email} required />
                    <Field label="Phone" name="phone" defaultValue={applicant.phone || ""} />
                    <Field label="Role Applied" name="roleApplied" defaultValue={applicant.roleApplied} required />
                    <Field label="Stage" name="stage" options={["New", "Screening", "Interview", "Offer", "Rejected"]} defaultValue={applicant.stage} />
                    <Field label="Source" name="source" defaultValue={applicant.source} />
                    <Field label="Meet URL" name="meetUrl" type="url" defaultValue={applicant.meetUrl || ""} wide />
                    <Field label="Notes" name="notes" textarea defaultValue={applicant.notes || ""} wide />
                    <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Applicant</button>
                  </form>
                </details>
                <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "applicant", id: applicant.id.toString() }))}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.card} ${styles.span6}`}>
        <h2 className={styles.cardTitle}>Decision Trail</h2>
        <p className={styles.muted}>Latest accept/reject decisions for audit and handover.</p>
        <div className={styles.list}>
          {[...approvedApplicants, ...rejectedApplicants].slice(0, 6).map((applicant) => (
            <div className={styles.row} key={`decision-${applicant.id}`}>
              <div className={styles.rowHeader}><strong>{applicant.name}</strong><span className={applicant.stage === "Offer" ? `${styles.pill} ${styles.pillSuccess}` : styles.pill}>{applicant.stage}</span></div>
              <p className={styles.muted}>{applicant.roleApplied} - {formatPortalDateTime(applicant.updatedAt)}</p>
            </div>
          ))}
          {approvedApplicants.length + rejectedApplicants.length === 0 && <div className={styles.emptyState}>No decisions recorded yet.</div>}
        </div>
      </div>
      <div className={`${styles.card} ${styles.span6}`}>
        <h2 className={styles.cardTitle}>Application Form Sharing</h2>
        <p className={styles.muted}>Public link for WhatsApp groups, career pages, and manual sharing.</p>
        <div className={styles.field}>
          <span className={styles.label}>Direct Form URL</span>
          <div className={styles.inlineForm}>
            <input className={styles.input} value={applicationLink} readOnly />
            <button className={styles.button} type="button" onClick={copyApplicationLink}>Copy Link</button>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Embed Code</span>
          <textarea className={styles.textarea} value={`<iframe src="${applicationLink}?embed=1" width="100%" height="980" style="border:0;" loading="lazy"></iframe>`} readOnly />
        </div>
      </div>
    </section>
  );
}
