"use client";

import React, { useState } from "react";
import { Briefcase, Clock3, Search, UserCheck, Users } from "lucide-react";
import {
  saveEmployeeUser,
  saveDepartment,
  getEmployeePortalData,
} from "@/app/actions/employee-portal";
import styles from "@/app/employee/portal.module.css";

type PortalData = Awaited<ReturnType<typeof getEmployeePortalData>>;
type PortalTab = "dashboard" | "approvals" | "crm" | "applicants" | "ops" | "expenses" | "payroll" | "reports" | "profile" | "reviews" | "documents" | "announcements" | "meetings" | "resources" | "chat" | "access" | "admin";
type EmployeeListItem = PortalData["users"][number] & {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  title: string;
  status: string;
  employeeType: string;
  compensationStatus: string;
  workStartTime: string;
  workEndTime: string;
  lastSeenAt: Date | string | null;
  isOnline: boolean;
  isWithinWorkHours: boolean;
  durationLabel: string;
};

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

interface EmployeesTabProps {
  data: PortalData;
  runAction: (handler: () => Promise<{ success: boolean; error?: string }>) => void;
  copyApplicationLink: () => void;
  applicationLink: string;
  submit: <T extends Record<string, string>>(handler: (payload: T) => Promise<{ success: boolean; error?: string }>, cb?: () => void) => (e: React.FormEvent<HTMLFormElement>) => void;
  formatPortalDateTime: (date: string | Date | null | undefined) => string;
  importEmployees: (file?: File) => void;
  openPortalTab: (tabId: PortalTab) => void;
  setUserManagementOpen: (open: boolean) => void;
  activeEmployeeMenuId: number | null;
  setActiveEmployeeMenuId: (id: number | null) => void;
  confirmDelete: (entityType: string, id: string, name?: string) => void;
  currentUserId: number;
}

export default function EmployeesTab({
  data,
  copyApplicationLink,
  applicationLink,
  submit,
  formatPortalDateTime,
  importEmployees,
  openPortalTab,
  setUserManagementOpen,
  activeEmployeeMenuId,
  setActiveEmployeeMenuId,
  confirmDelete,
  currentUserId,
}: EmployeesTabProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState("all");

  const employees = data.users as EmployeeListItem[];

  const roleDefinitions = data.roleDefinitions || [];
  const activeRoleOptions = roleDefinitions
    .filter((role) => role.status !== "Inactive")
    .map((role) => ({ label: `${role.label} (${role.key})`, value: role.key }));
  const roleOptions = activeRoleOptions.length ? activeRoleOptions : [{ label: "Employee (employee)", value: "employee" }];
  const roleNameByKey = new Map(roleDefinitions.map((role) => [role.key, role.label]));
  const displayRole = (role: string): string => (roleNameByKey.get(role) as string) || role.replace(/_/g, " ");

  const employeeOptions = employees.map((user) => ({ label: `${user.name} (${user.email})`, value: user.id.toString() }));

  const roleOptionsForValue = (value?: string) => {
    if (!value || roleOptions.some((role) => role.value === value)) return roleOptions;
    return [{ label: `${displayRole(value)} (${value}) - inactive`, value }, ...roleOptions];
  };

  const filteredEmployees = employees.filter((user) => {
    const searchText = `${user.name} ${user.email} ${user.department} ${user.title} ${user.role}`.toLowerCase();
    const matchesSearch = searchText.includes(employeeSearch.toLowerCase());
    const matchesType = employeeTypeFilter === "all" || user.employeeType === employeeTypeFilter;
    return matchesSearch && matchesType;
  });

  const onlineEmployees = employees.filter((user) => user.isOnline).length;
  const workingEmployees = employees.filter((user) => user.isWithinWorkHours).length;

  const inputDate = (val?: string | Date | null) => {
    if (!val) return "";
    const parsed = new Date(val);
    if (isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
  };

  const letterUrlFor = (user: EmployeeListItem) => (
    `/api/employee/letter?employeeId=${user.id}`
  );

  const mailtoFor = (user: EmployeeListItem) => {
    const subject = encodeURIComponent("Your BLUEVOLT Offer Letter");
    const body = encodeURIComponent(
      `Hello ${user.name},\n\nPlease find your official appointment details and job responsibilities letter at the link below:\n${window.location.origin}${letterUrlFor(user)}\n\nBest regards,\nBlueVolt Group HR`
    );
    return `mailto:${user.email}?subject=${subject}&body=${body}`;
  };

  const idCardUrlFor = (user: EmployeeListItem, download = false) => (
    `/api/employee/id-card?employeeId=${user.id}${download ? "&download=1" : ""}`
  );

  return (
    <section className={styles.grid}>
      <div className={`${styles.dashboardHero} ${styles.span12}`}>
        <div>
          <div className={styles.eyebrow}>Employee Management</div>
          <h1 className={styles.heroTitle}><Briefcase size={24} style={{ marginRight: 8, verticalAlign: "middle" }} /> Manage active employees, roles, work hours, and documents.</h1>
          <p className={styles.muted}>Hiring submissions live in Applicants. This page is for current team access, direct user creation, departments, and imports.</p>
        </div>
        <div className={styles.heroActions}>
          {data.capabilities.canManage && <button className={styles.button} type="button" onClick={() => setUserManagementOpen(true)}>Appoint / Add User</button>}
          {data.capabilities.canManage && <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("applicants")}>Open Applicants</button>}
          {data.capabilities.canManageAccess && <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("access")}>Open Privileges</button>}
        </div>
      </div>
      {data.capabilities.canManage && (
        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Quick Actions</h2>
              <p className={styles.muted}>Create direct access, copy the hiring link, or open the applicant inbox.</p>
            </div>
            <div className={styles.toolbar}>
              <button className={styles.button} type="button" onClick={() => setUserManagementOpen(true)}>Add Employee</button>
              <button className={styles.ghostButton} type="button" onClick={copyApplicationLink}>Copy Hiring Link</button>
              <a className={styles.ghostButton} href={applicationLink} target="_blank" rel="noopener noreferrer">Preview Form</a>
            </div>
          </div>
          <div className={styles.inlineForm}>
            <input className={styles.input} value={applicationLink} readOnly />
            <a className={styles.ghostButton} href={applicationLink} target="_blank" rel="noopener noreferrer">Open Form</a>
          </div>
        </div>
      )}
      <div className={`${styles.card} ${data.capabilities.canManage ? styles.span8 : styles.span12}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.cardTitle}>Employees</h2>
            <p className={styles.muted}>Search employees, verify work windows, and monitor active portal presence.</p>
          </div>
          <div className={styles.toolbar}>
            <label style={{ position: "relative", display: "block" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 14, color: "#94a3b8" }} />
              <input className={styles.input} style={{ paddingLeft: 32, width: 220 }} value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search employee" />
            </label>
            <select className={styles.select} style={{ maxWidth: 150 }} value={employeeTypeFilter} onChange={(event) => setEmployeeTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              {["Full-time", "Part-time", "Intern", "Contractor", "Consultant"].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.quickGrid} style={{ marginBottom: 12 }}>
          <div className={styles.row}><span className={styles.pill}><Users size={13} /> {employees.length} total</span></div>
          <div className={styles.row}><span className={`${styles.pill} ${styles.pillSuccess}`}><UserCheck size={13} /> {onlineEmployees} online</span></div>
          <div className={styles.row}><span className={`${styles.pill} ${styles.pillWarn}`}><Clock3 size={13} /> {workingEmployees} in hours</span></div>
          <div className={styles.row}><span className={styles.pill}><Briefcase size={13} /> {employees.filter((user) => user.employeeType === "Intern").length} interns</span></div>
        </div>
        <div className={styles.list}>{filteredEmployees.length === 0 ? <div className={styles.emptyState}>No employees match this filter.</div> : filteredEmployees.map((user) => (
          <div className={styles.row} key={user.id}>
            <div className={styles.rowHeader}>
              <strong>{user.name}</strong>
              <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                <span className={styles.pill}>{displayRole(user.role)}</span>
                <span className={user.compensationStatus === "Paid" ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillWarn}`}>{user.employeeType} · {user.compensationStatus}</span>
                <span className={user.isOnline ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillMuted}`} title={user.isWithinWorkHours ? "Online · Within work hours" : "Offline · Outside work hours"}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: user.isOnline ? "#22c55e" : "#94a3b8", display: "inline-block", marginRight: 4 }} />
                  {user.isOnline ? "Online" : "Offline"}
                </span>
                {data.capabilities.canManage && (
                  <div style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={styles.ghostButton}
                      style={{ padding: "4px 10px", minHeight: 32, fontSize: "0.8rem", fontWeight: 700 }}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveEmployeeMenuId(activeEmployeeMenuId === user.id ? null : user.id);
                      }}
                    >
                      &#8942; Actions
                    </button>
                    {activeEmployeeMenuId === user.id && (
                      <div
                        className={styles.actionDropdownMenu}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "100%",
                          zIndex: 50,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                          borderRadius: 10,
                          boxShadow: "var(--shadow-md)",
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 160,
                          marginTop: 4,
                        }}
                      >
                        <a className={styles.dropdownItem} href={letterUrlFor(user)} target="_blank" rel="noopener noreferrer">Open letter</a>
                        <a className={styles.dropdownItem} href={mailtoFor(user)}>Send letter email</a>
                        <a className={styles.dropdownItem} href={idCardUrlFor(user)} target="_blank" rel="noopener noreferrer">Open ID card</a>
                        <a className={styles.dropdownItem} href={idCardUrlFor(user, true)}>Download ID card</a>
                        {user.id !== currentUserId && (
                          <button className={styles.dropdownItemDanger} type="button" onClick={() => {
                            confirmDelete("employee", user.id.toString(), user.name);
                          }}>Delete</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className={styles.muted}>{user.email} · {user.department} · {user.title} · {user.status}</p>
            <p className={styles.muted}>
              {user.durationLabel} · {user.workStartTime}–{user.workEndTime}
              {user.lastSeenAt ? ` · Last seen ${formatPortalDateTime(user.lastSeenAt)}` : ""}
            </p>
            {data.capabilities.canManage && (
              <details className={styles.editPanel}>
                <summary>Edit employee</summary>
                <form className={styles.formGrid} onSubmit={submit(saveEmployeeUser)}>
                  <input type="hidden" name="id" value={user.id} />
                  <Field label="Name" name="name" defaultValue={user.name} required />
                  <Field label="Email" name="email" type="email" defaultValue={user.email} required />
                  <Field label="New Password" name="password" type="password" />
                  <Field label="Role" name="role" options={roleOptionsForValue(user.role)} defaultValue={user.role} />
                  <Field label="Department" name="departmentId" options={[{ label: "No department", value: "" }, ...data.departments.map((dept) => ({ label: dept.name, value: dept.id.toString() }))]} defaultValue={user.departmentId?.toString() || ""} />
                  <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} defaultValue={user.managerId?.toString() || ""} />
                  <Field label="Title" name="title" defaultValue={user.title} />
                  <Field label="Employee Type" name="employeeType" options={["Full-time", "Part-time", "Intern", "Contractor", "Consultant"]} defaultValue={user.employeeType} />
                  <Field label="Paid Status" name="compensationStatus" options={["Paid", "Unpaid"]} defaultValue={user.compensationStatus} />
                  <Field label="Employment Start" name="employmentStart" type="date" defaultValue={inputDate(user.employmentStart)} />
                  <Field label="Employment End" name="employmentEnd" type="date" defaultValue={inputDate(user.employmentEnd)} />
                  <Field label="Work Starts" name="workStartTime" type="time" defaultValue={user.workStartTime} />
                  <Field label="Work Ends" name="workEndTime" type="time" defaultValue={user.workEndTime} />
                  <Field label="Status" name="status" options={["Active", "Inactive"]} defaultValue={user.status} />
                  <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Employee</button>
                </form>
              </details>
            )}
          </div>
        ))}</div>
      </div>

      {data.capabilities.canManage && (
        <>
          <details className={`${styles.card} ${styles.span4} ${styles.collapsibleCard}`} open={employees.length <= 1}>
            <summary className={styles.collapsibleSummary}>
              <div>
                <h2 className={styles.cardTitle}>Manual Employee Access</h2>
                <p className={styles.muted}>Use this only for direct hires or immediate internal access.</p>
              </div>
              <span className={styles.pill}>Direct entry</span>
            </summary>
            <form className={styles.formGrid} onSubmit={submit(saveEmployeeUser)}>
              <p className={`${styles.muted} ${styles.fieldWide}`}>Assign a prepared role, then set employee type, paid status, and work hours.</p>
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" />
              <Field label="Role" name="role" options={roleOptions} defaultValue={roleOptions.some((role) => role.value === "employee") ? "employee" : roleOptions[0]?.value} />
              <Field label="Department" name="departmentId" options={[{ label: "No department", value: "" }, ...data.departments.map((dept) => ({ label: dept.name, value: dept.id.toString() }))]} />
              <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} />
              <Field label="Title" name="title" defaultValue="Team Member" />
              <Field label="Employee Type" name="employeeType" options={["Full-time", "Part-time", "Intern", "Contractor", "Consultant"]} />
              <Field label="Paid Status" name="compensationStatus" options={["Paid", "Unpaid"]} />
              <Field label="Employment Start" name="employmentStart" type="date" />
              <Field label="Employment End" name="employmentEnd" type="date" />
              <Field label="Work Starts" name="workStartTime" type="time" defaultValue="09:00" />
              <Field label="Work Ends" name="workEndTime" type="time" defaultValue="18:00" />
              <Field label="Status" name="status" options={["Active", "Inactive"]} />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Employee</button>
            </form>
          </details>

          <details className={`${styles.card} ${styles.span12} ${styles.collapsibleCard}`}>
            <summary className={styles.collapsibleSummary}>
              <div>
                <h2 className={styles.cardTitle}>Bulk Employee Import</h2>
                <p className={styles.muted}>Onboard team members in bulk using a CSV template.</p>
              </div>
              <span className={styles.pill}>CSV Upload</span>
            </summary>
            <div style={{ padding: "0 24px 24px" }}>
              <p className={styles.muted} style={{ marginBottom: 16 }}>CSV headers: name,email,password,role,department,title,employeeType,compensationStatus. Role must match a Role Key from Created Roles. New accounts get default offer/internship letter access through Documents.</p>
              <input className={styles.input} type="file" accept=".csv,text/csv" onChange={(event) => importEmployees(event.target.files?.[0])} />
            </div>
          </details>

          <details className={`${styles.card} ${styles.span4} ${styles.collapsibleCard}`}>
            <summary className={styles.collapsibleSummary}>
              <div>
                <h2 className={styles.cardTitle}>Department Setup</h2>
                <p className={styles.muted}>Create or update the reporting structure without leaving this page.</p>
              </div>
              <span className={styles.pill}>Team structure</span>
            </summary>
            <form className={styles.formGrid} onSubmit={submit(saveDepartment)}>
              <Field label="Name" name="name" required />
              <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} />
              <Field label="Status" name="active" options={["Active", "Inactive"]} />
              <Field label="Description" name="description" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Department</button>
            </form>
          </details>
        </>
      )}
      <div className={`${styles.card} ${data.capabilities.canManage ? styles.span8 : styles.span12}`}>
        <h2 className={styles.cardTitle}>Departments</h2>
        <div className={styles.list}>{data.departments.length === 0 ? <div className={styles.emptyState}>No departments yet.</div> : data.departments.map((department) => (
          <div className={styles.row} key={department.id}>
            <div className={styles.rowHeader}><strong>{department.name}</strong><span className={department.active ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillMuted}`}>{department.active ? "Active" : "Inactive"}</span></div>
            {department.description && <p className={styles.muted}>{department.description}</p>}
            {data.capabilities.canManage && (
              <>
                <details className={styles.editPanel}>
                  <summary>Edit department</summary>
                  <form className={styles.formGrid} onSubmit={submit(saveDepartment)}>
                    <input type="hidden" name="id" value={department.id} />
                    <Field label="Name" name="name" defaultValue={department.name} required />
                    <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} defaultValue={department.managerId?.toString() || ""} />
                    <Field label="Status" name="active" options={["Active", "Inactive"]} defaultValue={department.active ? "Active" : "Inactive"} />
                    <Field label="Description" name="description" textarea defaultValue={department.description || ""} wide />
                    <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Department</button>
                  </form>
                </details>
                <button className={styles.ghostButton} type="button" onClick={() => confirmDelete("department", department.id.toString(), department.name)}>Delete</button>
              </>
            )}
          </div>
        ))}</div>
      </div>
    </section>
  );
}
