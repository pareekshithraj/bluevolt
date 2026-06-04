"use client";

import React, { FormEvent, useState } from "react";
import { ClipboardList, Handshake, PenLine, Search, Shield, Star, UserCheck, Users } from "lucide-react";
import {
  saveEmployeeRoleDefinition,
  deleteEmployeeRoleDefinition,
  getEmployeePortalData,
  type EmployeeRoleDefinitionInput,
} from "@/app/actions/employee-portal";
import { EMPLOYEE_PORTAL_FEATURES } from "@/lib/employee/roles";
import styles from "@/app/employee/portal.module.css";

type PortalData = Awaited<ReturnType<typeof getEmployeePortalData>>;
type PortalTab = "dashboard" | "crm" | "applicants" | "ops" | "expenses" | "payroll" | "reports" | "profile" | "reviews" | "documents" | "announcements" | "meetings" | "resources" | "access" | "admin";
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

  const employees = data.users;
  const roleDefinitions = data.roleDefinitions || [];

  const activeRole = roleDefinitions.find((r) => r.key === selectedRoleKey) || roleDefinitions.find((r) => r.key === "super_admin") || roleDefinitions[0];

  const featureAccessSet = (accessString?: string | null) => (
    new Set((accessString || "").split(",").map((item) => item.trim()).filter(Boolean))
  );

  const selectedFeatures = activeRole ? featureAccessSet(activeRole.featureAccess) : new Set<string>();
  const activeRoleIsProtected = activeRole ? protectedRoleKeys.has(activeRole.key) : false;

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
      features: EMPLOYEE_PORTAL_FEATURES.filter((f) => ["crm", "crm_manage", "resources", "dashboard"].includes(f.id)),
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
    <section className={styles.grid}>
      <div className={`${styles.dashboardHero} ${styles.span12}`}>
        <div>
          <div className={styles.eyebrow}>Privilege Matrix</div>
          <h1 className={styles.heroTitle}><Shield size={24} style={{ marginRight: 8, verticalAlign: "middle" }} /> Role & Feature Authorization Control</h1>
          <p className={styles.muted}>Manage roles, map granular workspace features, and review security audits.</p>
        </div>
      </div>

      {/* Left Column: Role Directory (span 4) */}
      <div className={`${styles.card} ${styles.span4}`} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.cardTitle} style={{ margin: 0 }}>Role Directory</h2>
          <button
            className={styles.button}
            type="button"
            onClick={() => setIsCreatingRole(true)}
            style={{ minHeight: 34, padding: "0 14px", fontSize: "0.85rem", background: "linear-gradient(135deg, #635bff, #4f46e5)" }}
          >
            + Create Role
          </button>
        </div>
        <div className={styles.roleDirectoryList}>
          {roleDefinitions.map((role) => {
            const isSelected = selectedRoleKey === role.key && !isCreatingRole;
            const totalFeatures = EMPLOYEE_PORTAL_FEATURES.length;
            const featuresCount = role.key === "super_admin" ? totalFeatures : featureAccessSet(role.featureAccess).size;
            const progressPct = Math.round((featuresCount / totalFeatures) * 100);
            const assignedCount = employees.filter((user) => user.role === role.key).length;
            return (
              <button
                key={role.key}
                onClick={() => {
                  setSelectedRoleKey(role.key);
                  setIsCreatingRole(false);
                }}
                className={`${styles.roleItemCard} ${isSelected ? styles.roleItemCardActive : ""}`}
                type="button"
              >
                <div className={styles.roleCardHeader}>
                  <div className={styles.roleCardTitleGroup}>
                    <span className={styles.roleIconWrapper}>{getRoleIcon(role.key)}</span>
                    <strong style={{ fontSize: "0.95rem", color: isSelected ? "var(--text-brand)" : "var(--text-primary)" }}>{role.label}</strong>
                  </div>
                  <span className={role.status === "Active" ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillMuted}`} style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                    {role.status}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", width: "100%", paddingLeft: 42 }}>
                  <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{role.key}</code>
                  <span style={{ color: isSelected ? "var(--text-brand)" : "var(--text-muted)", fontWeight: 600 }}>{assignedCount} mapped</span>
                </div>
                <div style={{ width: "100%", paddingLeft: 42 }}>
                  <div className={styles.progressBarContainer}>
                    <div className={styles.progressBarFill} style={{ width: `${progressPct}%` }} />
                  </div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span>{featuresCount}/{totalFeatures} features</span>
                    <span>{role.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Detail Editor / Create Form (span 8) */}
      <div className={`${styles.card} ${styles.span8}`}>
        {isCreatingRole ? (
          <form onSubmit={submitRole} className={styles.formGrid}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gridColumn: "1 / -1", marginBottom: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
              <div>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>Create Custom Role</h2>
                <p className={styles.muted} style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>Define a new role and select its portal privileges.</p>
              </div>
              <button className={styles.ghostButton} type="button" onClick={() => setIsCreatingRole(false)} style={{ minHeight: 34, padding: "0 14px", fontSize: "0.85rem" }}>Cancel</button>
            </div>

            <Field label="Role Name" name="label" placeholder="Content Lead" required />
            <Field label="Role Key" name="key" placeholder="content_lead" />
            <Field label="Status" name="status" options={["Active", "Inactive"]} />
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
        ) : activeRole ? (
          <form onSubmit={submitRole} className={styles.formGrid}>
            <input type="hidden" name="key" value={activeRole.key} />
            <input type="hidden" name="label" value={activeRole.label} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gridColumn: "1 / -1", marginBottom: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
              <div>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>Privilege Editor: {activeRole.label}</h2>
                <p className={styles.muted} style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                  {activeRole.key === "super_admin"
                    ? "Super Admin has full system capabilities."
                    : `Modify features mapped to the ${activeRole.label} role.`
                  }
                </p>
              </div>
              <span className={styles.pill} style={{ fontFamily: "var(--font-mono)" }}>{activeRole.key}</span>
            </div>

            {activeRoleIsProtected && (
              <div className={styles.systemAlertBanner}>
                <Shield size={20} />
                <div className={styles.systemAlertContent}>
                  <strong>Protected System Role ({activeRole.label})</strong>
                  <p>
                    {permanentFullAccessRoleKeys.has(activeRole.key)
                      ? "Director and Director / Authorized Signatory always keep full portal access, document approval, and signature rights."
                      : "This is a system-protected access role. Basic definitions are locked to maintain database schema stability. Mapped feature capabilities below can still be modified."}
                  </p>
                </div>
              </div>
            )}

            <div className={styles.field}>
              <span className={styles.label}>Role Name</span>
              <input className={styles.input} name="label_display" value={activeRole.label} disabled style={{ opacity: 0.8 }} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Status</span>
              <select
                className={styles.select}
                name="status"
                defaultValue={activeRole.status}
                disabled={activeRoleIsProtected}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Description</span>
              <textarea
                className={styles.textarea}
                name="description"
                defaultValue={activeRole.description}
                disabled={activeRoleIsProtected}
                placeholder="Role description..."
              />
            </div>

            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Access Notes / Restrictions</span>
              <textarea
                className={styles.textarea}
                name="permissions"
                defaultValue={activeRole.permissions}
                disabled={activeRoleIsProtected}
                placeholder="Restrictions..."
              />
            </div>

            {/* Privilege Mapping Categories */}
            <div className={`${styles.field} ${styles.fieldWide}`} style={{ marginTop: 12 }}>
              <span className={styles.label} style={{ marginBottom: 12, display: "block" }}>Feature Privilege Mapping</span>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {featureGroups.map((group) => (
                  <div key={group.title} style={{ background: "var(--bg-shell)", borderRadius: 16, padding: 18, border: "1px solid var(--border-color)" }}>
                    <strong style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-brand)", display: "block", marginBottom: 12 }}>
                      {group.title}
                    </strong>
                    <div className={styles.accessGrid}>
                      {group.features.map((feature) => (
                        <div className={styles.accessOption} key={feature.id} style={{ background: "var(--bg-card)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                            <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{feature.label}</strong>
                            <small style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.35 }}>{feature.description}</small>
                          </div>
                          <label className={styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              name="featureAccess"
                              value={feature.id}
                              defaultChecked={activeRole.key === "super_admin" || permanentFullAccessRoleKeys.has(activeRole.key) || selectedFeatures.has(feature.id)}
                              disabled={activeRole.key === "super_admin" || permanentFullAccessRoleKeys.has(activeRole.key)}
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

            {activeRole.key !== "super_admin" && (
              <div className={`${styles.fieldWide} ${styles.toolbar}`} style={{ marginTop: 16 }}>
                <button className={styles.button} type="submit">
                  Update Privileges
                </button>
                {!protectedRoleKeys.has(activeRole.key) && (
                  <button
                    className={styles.ghostButton}
                    type="button"
                    onClick={() => {
                      if (!confirm(`Delete the ${activeRole.label} role? This cannot be undone.`)) return;
                      setSelectedRoleKey("super_admin");
                      runAction(() => deleteEmployeeRoleDefinition({ key: activeRole.key }));
                    }}
                  >
                    Delete Custom Role
                  </button>
                )}
              </div>
            )}
          </form>
        ) : (
          <div className={styles.emptyState}>Select a role from the directory to edit.</div>
        )}
      </div>

      {/* Bottom Row: Access Audit (span 12) */}
      <div className={`${styles.card} ${styles.span12}`}>
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
    </section>
  );
}
