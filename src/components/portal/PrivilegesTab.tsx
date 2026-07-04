"use client";

import React, { FormEvent, useState } from "react";
import { ClipboardList, Handshake, PenLine, Search, Shield, Star, UserCheck, Users, LayoutGrid, List } from "lucide-react";
import Modal from "./Modal";
import {
  saveEmployeeRoleDefinition,
  deleteEmployeeRoleDefinition,
  getEmployeePortalData,
  type EmployeeRoleDefinitionInput,
} from "@/app/actions/employee-portal";
import { EMPLOYEE_PORTAL_FEATURES } from "@/lib/employee/roles";
import styles from "@/app/employee/portal.module.css";

type PortalData = Awaited<ReturnType<typeof getEmployeePortalData>>;
type PortalTab = "dashboard" | "crm" | "applicants" | "ops" | "expenses" | "payroll" | "reports" | "profile" | "reviews" | "documents" | "announcements" | "meetings" | "resources" | "chat" | "access" | "admin";
const protectedRoleKeys = new Set(["super_admin", "director", "authorized_signatory", "admin", "hr", "sales", "content", "operations", "employee"]);
const permanentFullAccessRoleKeys = new Set(["director", "authorized_signatory"]);

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

function values(form: HTMLFormElement) {
  const output: Record<string, string> = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    const text = String(value);
    output[key] = output[key] ? `${output[key]},${text}` : text;
  }
  return output;
}

interface PrivilegesTabProps {
  data: PortalData;
  runAction: (handler: () => Promise<{ success: boolean; error?: string }>) => void;
  formatPortalDateTime: (date: string | Date | null | undefined) => string;
  selectedRoleKey: string;
  setSelectedRoleKey: (key: string) => void;
  isCreatingRole: boolean;
  setIsCreatingRole: (creating: boolean) => void;
  setError: (err: string) => void;
  setNotice: (msg: string) => void;
  startTransition: React.TransitionStartFunction;
  setData: React.Dispatch<React.SetStateAction<PortalData>>;
  mergePortalData: (prev: PortalData, next: PortalData, tab: PortalTab) => PortalData;
  simplePortalError: (err: unknown, fallback: string) => string;
}

export default function PrivilegesTab({
  data,
  runAction,
  formatPortalDateTime,
  selectedRoleKey,
  setSelectedRoleKey,
  isCreatingRole,
  setIsCreatingRole,
  setError,
  setNotice,
  startTransition,
  setData,
  mergePortalData,
  simplePortalError,
}: PrivilegesTabProps) {
  const [auditSearch, setAuditSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [activeEditRoleKey, setActiveEditRoleKey] = useState<string | null>(null);

  const employees = data.users;
  const roleDefinitions = data.roleDefinitions || [];

  const activeRole = roleDefinitions.find((r) => r.key === selectedRoleKey) || roleDefinitions.find((r) => r.key === "super_admin") || roleDefinitions[0];

  const featureAccessSet = (accessString?: string | null) => (
    new Set((accessString || "").split(",").map((item) => item.trim()).filter(Boolean))
  );

  const selectedFeatures = activeRole ? featureAccessSet(activeRole.featureAccess) : new Set<string>();
  const activeRoleIsProtected = activeRole ? protectedRoleKeys.has(activeRole.key) : false;
  const dashboardLockedRoleKeys = new Set(["super_admin", "director", "authorized_signatory"]);
  const superiorRoleKeys = new Set(["super_admin", "director", "authorized_signatory", "admin"]);
  const roleDashboardType = (roleKey: string, dashboardType?: string | null) => (
    dashboardType || (superiorRoleKeys.has(roleKey) ? "superior" : "workspace")
  );

  const getRoleIcon = (roleKey: string) => {
    switch (roleKey) {
      case "super_admin":
        return <Shield size={16} />;
      case "director":
      case "authorized_signatory":
        return <UserCheck size={16} />;
      case "admin":
        return <Shield size={16} style={{ color: "#ef4444" }} />;
      case "hr":
        return <Users size={16} />;
      case "sales":
        return <Handshake size={16} />;
      case "content":
        return <PenLine size={16} />;
      case "operations":
        return <ClipboardList size={16} />;
      case "employee":
        return <UserCheck size={16} />;
      default:
        return <Star size={16} />;
    }
  };

  const submitRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("Processing your request...");
    const form = event.currentTarget;
    const formValues = values(form) as unknown as EmployeeRoleDefinitionInput;
    startTransition(async () => {
      try {
        const result = await saveEmployeeRoleDefinition(formValues);
        if (!result.success) {
          setError(result.error || "Save failed.");
          return;
        }
        form.reset();
        setNotice("Role definition saved successfully.");
        const newData = await getEmployeePortalData(undefined, "access");
        setData(prev => mergePortalData(prev, newData, "access"));
        if (isCreatingRole) {
          setSelectedRoleKey(result.roleKey || formValues.key || "role");
          setIsCreatingRole(false);
        }
      } catch (roleError) {
        setError(simplePortalError(roleError, "Role update failed. Please try again."));
      }
    });
  };

  const featureGroups = [
    {
      title: "Staff & Organization Control",
      features: EMPLOYEE_PORTAL_FEATURES.filter((f) => ["employees", "access", "applicants", "announcements", "meetings"].includes(f.id)),
    },
    {
      title: "Business Workspace",
      features: EMPLOYEE_PORTAL_FEATURES.filter((f) => ["crm", "crm_manage", "resources", "chat", "dashboard"].includes(f.id)),
    },
    {
      title: "Financial & Core Operations",
      features: EMPLOYEE_PORTAL_FEATURES.filter((f) => ["ops", "expenses", "payroll", "reviews", "documents", "sign_documents"].includes(f.id)),
    },
  ];

  const filteredAuditEvents = data.auditEvents.filter((event) => {
    if (!auditSearch) return true;
    const search = auditSearch.toLowerCase();
    return (
      (event.action || "").toLowerCase().includes(search) ||
      (event.entityType || "").toLowerCase().includes(search) ||
      (event.actorName || "").toLowerCase().includes(search) ||
      (event.entityId || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className={styles.vercelDashboard}>
      <div className={styles.vercelToolbar}>
        <div className={styles.vercelBreadcrumbProject}>Role & Feature Authorization</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className={styles.ghostButton} style={{ padding: "8px", minHeight: "unset" }} onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} title="Toggle View">
            {viewMode === "grid" ? <List size={18} /> : <LayoutGrid size={18} />}
          </button>
          <button className={styles.vercelButtonPrimary} style={{ margin: 0, minHeight: "unset", padding: "8px 12px" }} onClick={() => setIsCreateRoleModalOpen(true)}>Create Role +</button>
        </div>
        <Modal isOpen={isCreateRoleModalOpen} onClose={() => setIsCreateRoleModalOpen(false)} title="Create Custom Role" maxWidth="650px">
          <form key="create-role" onSubmit={(e) => { submitRole(e); setIsCreateRoleModalOpen(false); }} className={styles.formGrid}>
            <Field label="Role Name" name="label" placeholder="Content Lead" required />
            <Field label="Role Key" name="key" placeholder="content_lead" />
            <Field label="Status" name="status" options={["Active", "Inactive"]} />
            <Field
              label="Dashboard Experience"
              name="dashboardType"
              options={[
                { label: "Workspace dashboard for employees/interns", value: "workspace" },
                { label: "Superior dashboard for directors/admins", value: "superior" },
              ]}
              defaultValue="workspace"
            />
            <Field label="Description" name="description" placeholder="Short description of the role's purpose." textarea wide />
            <Field label="Access Notes / Restrictions" name="permissions" placeholder="Example: View only access to CRM." textarea wide />

            <div className={`${styles.field} ${styles.fieldWide}`} style={{ marginTop: 12 }}>
              <span className={styles.label} style={{ marginBottom: 10, display: "block" }}>Select Feature Access</span>
              <div className={styles.accessGrid}>
                {EMPLOYEE_PORTAL_FEATURES.map((feature) => (
                  <div className={styles.accessOption} key={feature.id} style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                      <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{feature.label}</strong>
                      <small style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.35 }}>{feature.description}</small>
                    </div>
                    <label className={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        name="featureAccess"
                        value={feature.id}
                        defaultChecked={feature.id === "dashboard"}
                      />
                      <span className={styles.switchSlider} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <button className={`${styles.button} ${styles.fieldWide}`} type="submit" style={{ marginTop: 16 }}>Save Role</button>
          </form>
        </Modal>
      </div>

      <div className={viewMode === "grid" ? styles.vercelProjectsGrid : styles.vercelProjectsList}>
        {roleDefinitions.map((role) => {
          const totalFeatures = EMPLOYEE_PORTAL_FEATURES.length;
          const roleType = roleDashboardType(role.key, role.dashboardType);
          const featuresCount = role.key === "super_admin" || permanentFullAccessRoleKeys.has(role.key) ? totalFeatures : featureAccessSet(role.featureAccess).size;
          const progressPct = Math.round((featuresCount / totalFeatures) * 100);
          const assignedCount = employees.filter((user) => user.role === role.key).length;
          const isProtected = protectedRoleKeys.has(role.key);
          const roleFeatures = featureAccessSet(role.featureAccess);

          return (
            viewMode === "list" ? (
              <div className={styles.vercelListRow} key={role.key} onClick={() => setActiveEditRoleKey(role.key)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div className={styles.roleIconWrapper}>{getRoleIcon(role.key)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{role.label} <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: 8 }}>{role.key}</span></div>
                    <div className={styles.muted} style={{ fontSize: "0.8rem", marginTop: 2 }}>{assignedCount} mapped users &middot; {roleType === "superior" ? "Superior" : "Workspace"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{featuresCount}/{totalFeatures}</span>
                  <span className={role.status === "Active" ? styles.vercelCardTag : `${styles.vercelCardTag} ${styles.muted}`}>{role.status}</span>
                </div>
              </div>
            ) : (
            <div className={styles.vercelProjectCard} key={role.key} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className={styles.vercelProjectHeader}>
                <div className={styles.vercelProjectMeta} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={styles.roleIconWrapper}>{getRoleIcon(role.key)}</span>
                  <div>
                    <h4>{role.label}</h4>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{role.key}</span>
                  </div>
                </div>
                <span className={role.status === "Active" ? styles.vercelCardTag : `${styles.vercelCardTag} ${styles.muted}`}>{role.status}</span>
              </div>
              
              <div className={styles.vercelProjectDesc} style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", width: "100%", marginBottom: 12, minHeight: 20 }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{assignedCount} mapped users</span>
                  <span className={roleType === "superior" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>
                    {roleType === "superior" ? "Superior" : "Workspace"}
                  </span>
                </div>
                
                <div style={{ width: "100%" }}>
                  <div className={styles.progressBarContainer}>
                    <div className={styles.progressBarFill} style={{ width: `${progressPct}%`, background: "var(--text-brand)" }} />
                  </div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span>{featuresCount}/{totalFeatures} features assigned</span>
                  </div>
                </div>
              </div>

              <div className={styles.vercelProjectFooter} style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <button className={styles.ghostButton} style={{ width: "100%" }} onClick={() => setActiveEditRoleKey(role.key)}>Edit Role Config</button>
              </div>
            </div>
            )
          );
        })}
      </div>

      {activeEditRoleKey && (
        <Modal
          isOpen={!!activeEditRoleKey}
          onClose={() => setActiveEditRoleKey(null)}
          title={`Edit Role: ${roleDefinitions.find(r => r.key === activeEditRoleKey)?.label || ""}`}
          maxWidth="700px"
        >
          {(() => {
            const role = roleDefinitions.find(r => r.key === activeEditRoleKey);
            if (!role) return null;
            const isProtected = protectedRoleKeys.has(role.key);
            const roleFeatures = featureAccessSet(role.featureAccess);
            return (
              <form key={`edit-role-${role.key}`} onSubmit={(e) => {
                submitRole(e);
                setActiveEditRoleKey(null);
              }} className={styles.formGrid} style={{ marginTop: 8 }}>
                <input type="hidden" name="key" value={role.key} />
                <input type="hidden" name="label" value={role.label} />
                {dashboardLockedRoleKeys.has(role.key) && <input type="hidden" name="dashboardType" value={roleDashboardType(role.key, role.dashboardType)} />}

                {isProtected && (
                  <div className={styles.systemAlertBanner} style={{ gridColumn: "1 / -1" }}>
                    <Shield size={20} />
                    <div className={styles.systemAlertContent}>
                      <strong>Protected System Role</strong>
                      <p>
                        {permanentFullAccessRoleKeys.has(role.key)
                          ? "Director and Director / Authorized Signatory always keep full portal access, document approval, and signature rights."
                          : "This is a system-protected access role. Role identity is locked, but dashboard type and mapped feature capabilities can still be modified."}
                      </p>
                    </div>
                  </div>
                )}

                <div className={styles.field}>
                  <span className={styles.label}>Role Name</span>
                  <input className={styles.input} name="label_display" value={role.label} disabled style={{ opacity: 0.8 }} />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Status</span>
                  <select
                    className={styles.select}
                    name="status"
                    defaultValue={role.status}
                    disabled={isProtected}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Dashboard Experience</span>
                  <select
                    className={styles.select}
                    name="dashboardType"
                    defaultValue={roleDashboardType(role.key, role.dashboardType)}
                    disabled={dashboardLockedRoleKeys.has(role.key)}
                  >
                    <option value="workspace">Workspace dashboard for employees/interns</option>
                    <option value="superior">Superior dashboard for directors/admins</option>
                  </select>
                </div>

                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Description</span>
                  <textarea
                    className={styles.textarea}
                    name="description"
                    defaultValue={role.description}
                    disabled={isProtected}
                    placeholder="Role description..."
                  />
                </div>

                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Access Notes / Restrictions</span>
                  <textarea
                    className={styles.textarea}
                    name="permissions"
                    defaultValue={role.permissions}
                    disabled={isProtected}
                    placeholder="Restrictions..."
                  />
                </div>

                <div className={`${styles.field} ${styles.fieldWide}`} style={{ marginTop: 12 }}>
                  <span className={styles.label} style={{ marginBottom: 12, display: "block" }}>Feature Privilege Mapping</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {featureGroups.map((group) => (
                      <div key={group.title} style={{ background: "var(--bg-shell)", borderRadius: 12, padding: 16, border: "1px solid var(--border-color)" }}>
                        <strong style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-brand)", display: "block", marginBottom: 12 }}>
                          {group.title}
                        </strong>
                        <div className={styles.accessGrid}>
                          {group.features.map((feature) => (
                            <div className={styles.accessOption} key={feature.id} style={{ background: "var(--bg-card)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                                <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{feature.label}</strong>
                                <small style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.35 }}>{feature.description}</small>
                              </div>
                              <label className={styles.toggleSwitch}>
                                <input
                                  type="checkbox"
                                  name="featureAccess"
                                  value={feature.id}
                                  defaultChecked={role.key === "super_admin" || permanentFullAccessRoleKeys.has(role.key) || roleFeatures.has(feature.id)}
                                  disabled={role.key === "super_admin" || permanentFullAccessRoleKeys.has(role.key)}
                                />
                                <span className={styles.switchSlider} />
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${styles.fieldWide} ${styles.toolbar}`} style={{ marginTop: 16 }}>
                  <button className={styles.button} type="submit">
                    Update Privileges
                  </button>
                  {!isProtected && (
                    <button
                      className={styles.ghostButton}
                      type="button"
                      onClick={() => {
                        if (!confirm(`Delete the ${role.label} role? This cannot be undone.`)) return;
                        runAction(() => deleteEmployeeRoleDefinition({ key: role.key }));
                        setActiveEditRoleKey(null);
                      }}
                      style={{ color: "#ef4444" }}
                    >
                      Delete Custom Role
                    </button>
                  )}
                </div>
              </form>
            );
          })()}
        </Modal>
      )}

      <div className={styles.vercelCard} style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>Access Security Audit</h2>
            <p className={styles.muted} style={{ margin: "4px 0 0" }}>Chronological system events relating to authorization changes.</p>
          </div>
          <div className={styles.auditSearchWrapper}>
            <Search size={14} />
            <input
              className={`${styles.input} ${styles.auditSearchInput}`}
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Filter audit logs..."
            />
          </div>
        </div>
        <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: 4 }}>
          {filteredAuditEvents.length === 0 ? (
            <div className={styles.emptyState}>No audit events match search or exist yet.</div>
          ) : (
            <div className={styles.timelineContainer}>
              {filteredAuditEvents.map((event) => {
                let badgeColorClass = styles.timelineBadgeBlue;
                if (event.action.includes("create")) {
                  badgeColorClass = styles.timelineBadgeGreen;
                } else if (event.action.includes("delete")) {
                  badgeColorClass = styles.timelineBadgeRed;
                }
                return (
                  <div className={styles.timelineItem} key={event.id}>
                    <div className={`${styles.timelineBadge} ${badgeColorClass}`} />
                    <div className={styles.timelineMeta}>
                      <div className={styles.timelineActionGroup}>
                        <span className={styles.pill} style={{ fontSize: "0.65rem", padding: "2px 8px" }}>{event.entityType}</span>
                        <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{event.action}</strong>
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {formatPortalDateTime(event.createdAt)}
                      </span>
                    </div>
                    <p className={styles.timelineDetails}>
                      Entity Key/ID: <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-brand)" }}>{event.entityId}</code> &bull; Performed by <strong>{event.actorName || "System"}</strong> (ID: {event.actorId})
                    </p>
                    {event.metadata && (() => {
                      try {
                        const meta = typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata;
                        if (meta && Object.keys(meta).length) {
                          return (
                            <div style={{ marginTop: 8, fontSize: "0.75rem", background: "var(--bg-shell)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", fontFamily: "var(--font-mono)", overflowX: "auto" }}>
                              {JSON.stringify(meta)}
                            </div>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
