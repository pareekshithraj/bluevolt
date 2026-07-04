"use client";

import React, { useState } from "react";
import { Briefcase, Clock3, Search, UserCheck, Users } from "lucide-react";
import {
  saveEmployeeUser,
  saveDepartment,
  getEmployeePortalData,
} from "@/app/actions/employee-portal";
import styles from "@/app/employee/portal.module.css";
import Modal from "./Modal";

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
  const [activeTab, setActiveTab] = useState<"employees" | "departments">("employees");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeModal, setActiveModal] = useState<{ id: string; payload?: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ } | null>(null);

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
    <div className={styles.vercelDashboard}>
      <div className={styles.vercelToolbar}>
        <div className={styles.vercelBreadcrumbProject}>Team Directory</div>
        <div style={{ flex: 1 }} />
        <div className={styles.vercelToolbarActions}>
          <div className={styles.vercelTabs}>
            <button className={`${styles.vercelTab} ${activeTab === "employees" ? styles.vercelTabActive : ""}`} onClick={() => setActiveTab("employees")}>Employees</button>
            <button className={`${styles.vercelTab} ${activeTab === "departments" ? styles.vercelTabActive : ""}`} onClick={() => setActiveTab("departments")}>Departments</button>
          </div>
          {activeTab === "employees" && (
            <button className={styles.ghostButton} style={{ padding: "8px", minHeight: "unset" }} onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} title="Toggle View">
              {viewMode === "grid" ? "List view" : "Grid view"}
            </button>
          )}
          {data.capabilities.canManage && activeTab === "employees" && (
            <button className={styles.vercelButtonPrimary} style={{ margin: 0, minHeight: "unset", padding: "8px 12px" }} onClick={() => setActiveModal({ id: "create-employee" })}>
              Add Employee +
            </button>
          )}
          {data.capabilities.canManage && activeTab === "departments" && (
            <button className={styles.vercelButtonPrimary} style={{ margin: 0, minHeight: "unset", padding: "8px 12px" }} onClick={() => setActiveModal({ id: "create-department" })}>
              Add Department +
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, padding: "0 24px" }}>
        <div className={styles.searchBox} style={{ width: 300 }}>
          <Search size={16} />
          <input className={styles.searchInput} placeholder="Search employees..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
        </div>
        <select className={styles.select} style={{ width: 200, height: 40 }} value={employeeTypeFilter} onChange={(e) => setEmployeeTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Intern">Intern</option>
          <option value="Contractor">Contractor</option>
        </select>
      </div>

      <div style={{ padding: "0 24px" }}>
        {activeTab === "employees" && (
          <div className={viewMode === "grid" ? styles.vercelProjectsGrid : styles.vercelProjectsList}>
            {filteredEmployees.length === 0 ? <div className={styles.emptyState}>No employees match this filter.</div> : filteredEmployees.map((user) => (
              viewMode === "list" ? (
                <div className={styles.vercelListRow} key={user.id} style={{ position: 'relative' }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {user.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{user.name} <span className={styles.pill} style={{ marginLeft: 8 }}>{displayRole(user.role)}</span></div>
                      <div className={styles.muted} style={{ fontSize: "0.8rem", marginTop: 2 }}>{user.title} &middot; {user.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={user.status === "Active" ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillMuted}`}>{user.status}</span>
                    <div className={user.isOnline ? styles.vercelProjectStatusIndicatorActive : styles.vercelAlertIndicatorGray} title={user.isOnline ? "Online" : "Offline"} />
                    {data.capabilities.canManage && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", marginLeft: 8 }} type="button" onClick={() => setActiveModal({ id: "edit-employee", payload: user })}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.vercelProjectCard} key={user.id}>
                  <div className={styles.vercelProjectHeader}>
                    <div className={styles.vercelProjectMeta}>
                      <h4>{user.name}</h4>
                      <span>{user.email}</span>
                    </div>
                    <div className={user.isOnline ? styles.vercelProjectStatusIndicatorActive : styles.vercelAlertIndicatorGray} title={user.isOnline ? "Online" : "Offline"} />
                  </div>
                  <div className={styles.vercelProjectDesc}>
                    <p style={{ margin: "0 0 4px" }}><strong>Role:</strong> {displayRole(user.role)}</p>
                    <p style={{ margin: "0 0 4px" }}><strong>Department:</strong> {user.department}</p>
                    <p style={{ margin: "0 0 12px" }}><strong>Title:</strong> {user.title}</p>
                    <div className={styles.compactMeta} style={{ margin: "8px 0", flexWrap: "wrap" }}>
                      <span className={user.compensationStatus === "Paid" ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillWarn}`}>{user.employeeType} · {user.compensationStatus}</span>
                      <span className={user.isWithinWorkHours ? `${styles.pill} ${styles.pillSuccess}` : styles.pillMuted} style={{ padding: "4px 8px", borderRadius: 12, fontSize: "0.7rem" }}>
                        {user.workStartTime}–{user.workEndTime}
                      </span>
                    </div>
                  </div>
                  <div className={styles.vercelProjectFooter} style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {data.capabilities.canManage && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }} type="button" onClick={() => setActiveModal({ id: "edit-employee", payload: user })}>
                        Edit
                      </button>
                    )}
                    {data.capabilities.canManage && user.id !== currentUserId && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", color: "#ef4444" }} type="button" onClick={() => confirmDelete("employee", user.id.toString(), user.name)}>
                        Delete
                      </button>
                    )}
                    {data.capabilities.canManage && (
                      <>
                        <a className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }} href={letterUrlFor(user)} target="_blank" rel="noopener noreferrer">Letter</a>
                        <a className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }} href={idCardUrlFor(user)} target="_blank" rel="noopener noreferrer">ID</a>
                      </>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {activeTab === "departments" && (
          <div className={viewMode === "grid" ? styles.vercelProjectsGrid : styles.vercelProjectsList}>
            {data.departments.length === 0 ? <div className={styles.emptyState}>No departments yet.</div> : data.departments.map((department) => (
              viewMode === "list" ? (
                <div className={styles.vercelListRow} key={department.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{department.name}</div>
                      <div className={styles.muted} style={{ fontSize: "0.8rem", marginTop: 2 }}>{department.description || "No description"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={department.active ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillMuted}`}>{department.active ? "Active" : "Inactive"}</span>
                    {data.capabilities.canManage && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", marginLeft: 8 }} type="button" onClick={() => setActiveModal({ id: "edit-department", payload: department })}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.vercelProjectCard} key={department.id}>
                  <div className={styles.vercelProjectHeader}>
                    <div className={styles.vercelProjectMeta}>
                      <h4>{department.name}</h4>
                      <span>{department.active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className={department.active ? styles.vercelProjectStatusIndicatorActive : styles.vercelAlertIndicatorGray} title={department.active ? "Active" : "Inactive"} />
                  </div>
                  <div className={styles.vercelProjectDesc}>
                    <p style={{ margin: "0 0 12px" }}>{department.description || "No description"}</p>
                    <p style={{ margin: "0 0 4px", fontSize: "0.8rem" }}><strong>Manager:</strong> {employeeOptions.find(opt => opt.value === department.managerId?.toString())?.label || "None"}</p>
                  </div>
                  <div className={styles.vercelProjectFooter} style={{ marginTop: 12 }}>
                    {data.capabilities.canManage && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }} type="button" onClick={() => setActiveModal({ id: "edit-department", payload: department })}>
                        Edit
                      </button>
                    )}
                    {data.capabilities.canManage && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", color: "#ef4444" }} type="button" onClick={() => confirmDelete("department", department.id.toString(), department.name)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {activeModal?.id === "edit-employee" && activeModal.payload && (
        <Modal title={`Edit ${activeModal.payload.name}`} subtitle="Update employee details." onClose={() => setActiveModal(null)}>
          <form className={styles.formGrid} onSubmit={submit(saveEmployeeUser, () => setActiveModal(null))}>
            <input type="hidden" name="id" value={activeModal.payload.id} />
            <Field label="Name" name="name" defaultValue={activeModal.payload.name} required />
            <Field label="Email" name="email" type="email" defaultValue={activeModal.payload.email} required />
            <Field label="New Password" name="password" type="password" />
            <Field label="Role" name="role" options={roleOptionsForValue(activeModal.payload.role)} defaultValue={activeModal.payload.role} />
            <Field label="Department" name="departmentId" options={[{ label: "No department", value: "" }, ...data.departments.map((dept) => ({ label: dept.name, value: dept.id.toString() }))]} defaultValue={activeModal.payload.departmentId?.toString() || ""} />
            <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} defaultValue={activeModal.payload.managerId?.toString() || ""} />
            <Field label="Title" name="title" defaultValue={activeModal.payload.title} />
            <Field label="Employee Type" name="employeeType" options={["Full-time", "Part-time", "Intern", "Contractor", "Consultant"]} defaultValue={activeModal.payload.employeeType} />
            <Field label="Paid Status" name="compensationStatus" options={["Paid", "Unpaid"]} defaultValue={activeModal.payload.compensationStatus} />
            <Field label="Employment Start" name="employmentStart" type="date" defaultValue={inputDate(activeModal.payload.employmentStart)} />
            <Field label="Employment End" name="employmentEnd" type="date" defaultValue={inputDate(activeModal.payload.employmentEnd)} />
            <Field label="Work Starts" name="workStartTime" type="time" defaultValue={activeModal.payload.workStartTime} />
            <Field label="Work Ends" name="workEndTime" type="time" defaultValue={activeModal.payload.workEndTime} />
            <Field label="Status" name="status" options={["Active", "Inactive"]} defaultValue={activeModal.payload.status} />
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Employee</button>
            {activeModal.payload.id !== currentUserId && (
              <button className={`${styles.button} ${styles.dangerButton} ${styles.fieldWide}`} type="button" onClick={() => { setActiveModal(null); confirmDelete("user", activeModal.payload.id.toString(), activeModal.payload.name); }}>
                Remove User
              </button>
            )}
          </form>
        </Modal>
      )}

      {activeModal?.id === "create-department" && (
        <Modal title="Add Department" subtitle="Create a new workspace department." onClose={() => setActiveModal(null)}>
          <form className={styles.formGrid} onSubmit={submit(saveDepartment, () => setActiveModal(null))}>
            <Field label="Department Name" name="name" required wide />
            <Field label="Status" name="active" options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} defaultValue="true" />
            <Field label="Description" name="description" textarea wide />
            <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} />
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Department</button>
          </form>
        </Modal>
      )}

      {activeModal?.id === "edit-department" && activeModal.payload && (
        <Modal title="Edit Department" subtitle="Update department settings." onClose={() => setActiveModal(null)}>
          <form className={styles.formGrid} onSubmit={submit(saveDepartment, () => setActiveModal(null))}>
            <input type="hidden" name="id" value={activeModal.payload.id} />
            <Field label="Department Name" name="name" defaultValue={activeModal.payload.name} required wide />
            <Field label="Status" name="active" options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} defaultValue={activeModal.payload.active ? "true" : "false"} />
            <Field label="Description" name="description" textarea defaultValue={activeModal.payload.description || ""} wide />
            <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} defaultValue={activeModal.payload.managerId?.toString() || ""} />
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Department</button>
          </form>
        </Modal>
      )}

      {activeModal?.id === "create-employee" && (
        <Modal title="Add Employee" subtitle="Create a new workspace member." onClose={() => setActiveModal(null)}>
          <form className={styles.formGrid} onSubmit={submit(saveEmployeeUser, () => setActiveModal(null))}>
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
            <Field label="Status" name="status" options={["Active", "Inactive"]} defaultValue="Active" />
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Employee</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
