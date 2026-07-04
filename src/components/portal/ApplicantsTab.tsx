"use client";

import React, { useState } from "react";
import { Users, X } from "lucide-react";
import {
  updateEmployeeRecordStatus,
  deleteEmployeeEntity,
  saveApplicant,
  getEmployeePortalData,
  appointApplicantAsEmployee,
} from "@/app/actions/employee-portal";
import styles from "@/app/employee/portal.module.css";
import Modal from "@/components/portal/Modal";

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
  const [appointingApplicant, setAppointingApplicant] = useState<PortalData["applicants"][number] | null>(null);
  const [editingApplicant, setEditingApplicant] = useState<PortalData["applicants"][number] | null>(null);

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
    <div className={styles.vercelDashboard}>
      <div className={styles.vercelToolbar}>
        <div className={styles.vercelBreadcrumbProject}>Hiring Console</div>
        <div style={{ flex: 1 }} />
        <div className={styles.vercelToolbarActions}>
          <button className={styles.ghostButton} type="button" onClick={copyApplicationLink}>Copy Link</button>
          <a className={styles.ghostButton} href={applicationLink} target="_blank" rel="noopener noreferrer">Public Form</a>
          <button className={styles.ghostButton} type="button" onClick={() => downloadCsv("bluevolt-applicants.csv", applicantRows)}>Export CSV</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
        <div className={styles.vercelCard} style={{ padding: 24 }}>
          <h2 className={styles.cardTitle}>Total Applications</h2>
          <span className={styles.metricValue}>{data.applicants.length}</span>
        </div>
        <div className={styles.vercelCard} style={{ padding: 24 }}>
          <h2 className={styles.cardTitle}>Awaiting Review</h2>
          <span className={styles.metricValue}>{pendingApplicants.length}</span>
        </div>
        <div className={styles.vercelCard} style={{ padding: 24 }}>
          <h2 className={styles.cardTitle}>Approved</h2>
          <span className={styles.metricValue}>{approvedApplicants.length}</span>
        </div>
        <div className={styles.vercelCard} style={{ padding: 24 }}>
          <h2 className={styles.cardTitle}>Rejected</h2>
          <span className={styles.metricValue}>{rejectedApplicants.length}</span>
        </div>
      </div>

      <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 24 }}>
        <div className={styles.vercelCard}>
          <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 className={styles.cardTitle} style={{ margin: 0 }}>Applications</h2>
              <p className={styles.muted} style={{ margin: 0 }}>{pendingApplicants.length} pending decisions. Accept creates the HR signal; reject closes the applicant cleanly.</p>
            </div>
            <input
              type="text"
              className={styles.input}
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 220, padding: "8px 12px" }}
            />
          </div>
          
          <div className={styles.smartTable} style={{ marginTop: 16 }}>
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
                  {applicant.stage !== "Offer" && applicant.stage !== "Appointed" && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "applicant", id: applicant.id.toString(), status: "Offer" }))}>Accept</button>}
                  {applicant.stage === "Offer" && (
                    <button 
                      className={styles.button} 
                      type="button" 
                      onClick={() => setAppointingApplicant(applicant)}
                      style={{ background: "var(--accent-color)", color: "white" }}
                    >
                      Appoint as Employee
                    </button>
                  )}
                  {applicant.stage !== "Rejected" && applicant.stage !== "Appointed" && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "applicant", id: applicant.id.toString(), status: "Rejected" }))}>Reject</button>}
                  <button className={styles.ghostButton} type="button" onClick={() => setEditingApplicant(applicant)}>Edit</button>
                  <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "applicant", id: applicant.id.toString() }))}>Delete</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className={styles.vercelCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>Decision Trail</h2>
          </div>
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
        
        <div className={styles.vercelCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>Application Form Sharing</h2>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Direct Form URL</span>
            <div className={styles.inlineForm}>
              <input className={styles.input} value={applicationLink} readOnly />
              <button className={styles.button} type="button" onClick={copyApplicationLink}>Copy Link</button>
            </div>
          </div>
          <div className={styles.field} style={{ marginTop: 16 }}>
            <span className={styles.label}>Embed Code</span>
            <textarea className={styles.textarea} value={`<iframe src="${applicationLink}?embed=1" width="100%" height="980" style="border:0;" loading="lazy"></iframe>`} readOnly />
          </div>
        </div>
      </div>

      {appointingApplicant && (
        <Modal title="Appoint as Employee" subtitle={`Onboard ${appointingApplicant.name} to the active employee list. Default password is abc123.`} onClose={() => setAppointingApplicant(null)}>
          <form className={styles.formGrid} onSubmit={submit((values) => appointApplicantAsEmployee({
            applicantId: appointingApplicant.id.toString(),
            departmentId: values.departmentId,
            title: values.title,
            workStartTime: values.workStartTime,
            workEndTime: values.workEndTime,
          }), () => setAppointingApplicant(null))}>
            <Field label="Title" name="title" defaultValue={appointingApplicant.roleApplied || "Team Member"} required />
            <Field 
              label="Department" 
              name="departmentId" 
              options={[{ label: "No department", value: "" }, ...data.departments.map((d) => ({ label: d.name, value: d.id.toString() }))]} 
            />
            <Field label="Work Starts" name="workStartTime" type="time" defaultValue="09:00" required />
            <Field label="Work Ends" name="workEndTime" type="time" defaultValue="18:00" required />
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Approve & Appoint</button>
          </form>
        </Modal>
      )}

      {editingApplicant && (
        <Modal title="Edit Applicant" subtitle="Update applicant details." onClose={() => setEditingApplicant(null)}>
          <form className={styles.formGrid} onSubmit={submit(saveApplicant, () => setEditingApplicant(null))}>
            <input type="hidden" name="id" value={editingApplicant.id} />
            <Field label="Name" name="name" defaultValue={editingApplicant.name} required />
            <Field label="Email" name="email" type="email" defaultValue={editingApplicant.email} required />
            <Field label="Phone" name="phone" defaultValue={editingApplicant.phone || ""} />
            <Field label="Role Applied" name="roleApplied" defaultValue={editingApplicant.roleApplied} required />
            <Field label="Stage" name="stage" options={["New", "Screening", "Interview", "Offer", "Rejected"]} defaultValue={editingApplicant.stage} />
            <Field label="Source" name="source" defaultValue={editingApplicant.source} />
            <Field label="Meet URL" name="meetUrl" type="url" defaultValue={editingApplicant.meetUrl || ""} wide />
            <Field label="Notes" name="notes" textarea defaultValue={editingApplicant.notes || ""} wide />
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Applicant</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
