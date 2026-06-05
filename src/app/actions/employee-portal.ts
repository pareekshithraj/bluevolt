"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/stores24/password";
import {
  clearEmployeeSession,
  getEmployeeSession,
  hasEmployeeRole,
  setEmployeeSession,
} from "@/lib/employee/session";
import {
  DEFAULT_ROLE_FEATURE_ACCESS,
  EMPLOYEE_PORTAL_FEATURES,
  EMPLOYEE_ROLES,
  type EmployeePortalFeature,
} from "@/lib/employee/roles";

function roleKey(value: string): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "employee";
}

function normalizeRole(role: string): string {
  return roleKey(role);
}

function parseRoles(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeAudienceUsers(value?: string): string {
  const ids = (value || "")
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
  const uniqueIds = [...new Set(ids)];
  return uniqueIds.length ? `,${uniqueIds.join(",")},` : "";
}

function visibleToRole(audienceRoles: string, role: string): boolean {
  const roles = parseRoles(audienceRoles);
  return roles.includes("all") || roles.includes(role) || role === "super_admin";
}

function optionalDate(value?: string): Date | null {
  const raw = value?.trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/^(\d{2})-(\d{2})-(\d{4})$/, "$3-$2-$1")
    .replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalDateTime(value?: string): Date | null {
  const raw = value?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numberValue(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const localEmployeeStorePath = path.join(process.cwd(), ".bluevolt-employee-store.json");

type LocalEmployeeUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  departmentId: number | null;
  managerId: number | null;
  title: string;
  employeeType: string;
  compensationStatus: string;
  employmentStart: string | null;
  employmentEnd: string | null;
  workStartTime: string;
  workEndTime: string;
  status: string;
  lastLogin: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type EmployeeRoleDefinition = {
  id: number;
  key: string;
  label: string;
  description: string;
  permissions: string;
  featureAccess: string;
  dashboardType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type LocalEmployeeApplicant = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roleApplied: string;
  stage: string;
  source: string;
  meetUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalEmployeeStore = {
  users: LocalEmployeeUser[];
  roles?: EmployeeRoleDefinition[];
  applicants?: LocalEmployeeApplicant[];
};

const globalForLocalEmployeeStore = globalThis as unknown as {
  bluevoltLocalEmployeeStore?: LocalEmployeeStore;
};

let localStoreWriteWarningShown = false;

const defaultRoleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  director: "Director",
  authorized_signatory: "Director / Authorized Signatory",
  admin: "Admin",
  sales: "Sales",
  content: "Content Developer",
  hr: "HR",
  operations: "Operations",
  employee: "Employee",
};

const defaultRolePermissions: Record<string, string> = {
  super_admin: "Full portal control, employee mapping, role setup, CRM sheets, documents, resources, meetings, payroll, and audits.",
  director: "Full portal control with final employee document approval and signature rights.",
  authorized_signatory: "Full portal control as Director / Authorized Signatory with employee document approval and signature rights.",
  admin: "Employee operations, attendance, documents, resources, payroll, reviews, and approvals.",
  sales: "CRM access, meetings, tasks, resources, and assigned work updates.",
  content: "Content resources, CRM visibility, tasks, documents, and assigned work updates.",
  hr: "Hiring, employee records, payroll inputs, reviews, documents, and attendance.",
  operations: "Tasks, resources, documents, announcements, and day-to-day operations.",
  employee: "Own dashboard, check-in/out, documents, resources, tasks, leave, expenses, and ID card.",
};

const coreRoleKeys = new Set<string>(EMPLOYEE_ROLES);
const defaultEmployeePassword = "abc123";
const documentSignatoryRoles = new Set(["director", "authorized_signatory"]);
const superiorDashboardRoles = new Set(["super_admin", "director", "authorized_signatory", "admin"]);

function dashboardTypeForRole(key: string): string {
  return superiorDashboardRoles.has(key) ? "superior" : "workspace";
}

function defaultRoleDefinitions(now = new Date().toISOString()): EmployeeRoleDefinition[] {
  return EMPLOYEE_ROLES.map((key, index) => ({
    id: index + 1,
    key,
    label: defaultRoleLabels[key] || key.replace(/_/g, " "),
    description: defaultRolePermissions[key] || "Portal access role.",
    permissions: defaultRolePermissions[key] || "Basic portal access.",
    featureAccess: (DEFAULT_ROLE_FEATURE_ACCESS[key] || ["dashboard"]).join(","),
    dashboardType: dashboardTypeForRole(key),
    status: "Active",
    createdAt: now,
    updatedAt: now,
  }));
}

function mergeRoleDefinitions(roles?: EmployeeRoleDefinition[]): EmployeeRoleDefinition[] {
  const merged = new Map<string, EmployeeRoleDefinition>();
  for (const role of defaultRoleDefinitions()) merged.set(role.key, role);
  for (const role of roles || []) {
    const fallback = merged.get(role.key);
    merged.set(role.key, {
      ...role,
      featureAccess: role.featureAccess || fallback?.featureAccess || "dashboard",
      dashboardType: isCoreRole(role.key) ? dashboardTypeForRole(role.key) : role.dashboardType || fallback?.dashboardType || dashboardTypeForRole(role.key),
    });
  }
  return [...merged.values()].sort((first, second) => first.label.localeCompare(second.label));
}

function isCoreRole(key: string) {
  return coreRoleKeys.has(key);
}

function parseFeatureAccess(value?: string | string[]): EmployeePortalFeature[] {
  const valid = new Set(EMPLOYEE_PORTAL_FEATURES.map((feature) => feature.id));
  const serialized = Array.isArray(value) ? value.join(",") : (value || "");
  const features = serialized
    .split(",")
    .map((feature) => feature.trim())
    .filter((feature): feature is EmployeePortalFeature => valid.has(feature as EmployeePortalFeature));
  return [...new Set(features.length ? features : (["dashboard"] as EmployeePortalFeature[]))];
}

function roleCanAccessFeature(role: string, roles: EmployeeRoleDefinition[], feature: EmployeePortalFeature): boolean {
  if (role === "super_admin") return true;
  if (documentSignatoryRoles.has(role)) return true;
  const roleDefinition = mergeRoleDefinitions(roles).find((entry) => entry.key === role);
  return parseFeatureAccess(roleDefinition?.featureAccess).includes(feature);
}

function capabilitiesForRole(role: string, roles: EmployeeRoleDefinition[]) {
  const roleDefinition = mergeRoleDefinitions(roles).find((entry) => entry.key === role);
  const isSuperiorRole = roleDefinition?.dashboardType === "superior" || superiorDashboardRoles.has(role);
  const canManage = isSuperiorRole && roleCanAccessFeature(role, roles, "employees");
  const canUseCrm = roleCanAccessFeature(role, roles, "crm") || roleCanAccessFeature(role, roles, "crm_manage");
  const canManageCrm = isSuperiorRole && roleCanAccessFeature(role, roles, "crm_manage");
  const canManageResources = roleCanAccessFeature(role, roles, "resources") && canManage;
  const canScheduleMeetings = roleCanAccessFeature(role, roles, "meetings") && canManage;
  const canPublishAnnouncements = roleCanAccessFeature(role, roles, "announcements") && canManage;
  const canViewDocuments = roleCanAccessFeature(role, roles, "documents");
  const canManageDocuments = canViewDocuments && canManage;
  const canSignDocuments = roleCanAccessFeature(role, roles, "sign_documents");
  return {
    canManage,
    canUseSuperiorDashboard: isSuperiorRole,
    canManageAccess: roleCanAccessFeature(role, roles, "access"),
    canUseCrm,
    canRequestCrmSource: canManageCrm,
    canUpdateCrmSheetRows: canManageCrm,
    canManageCrmSheets: canManageCrm,
    canManageApplicants: isSuperiorRole && roleCanAccessFeature(role, roles, "applicants"),
    canManageResources,
    canScheduleMeetings,
    canManageOps: roleCanAccessFeature(role, roles, "ops"),
    canManagePayroll: roleCanAccessFeature(role, roles, "payroll"),
    canReviewPerformance: roleCanAccessFeature(role, roles, "reviews"),
    canViewDocuments,
    canManageDocuments,
    canSignDocuments,
    canApproveDocuments: canSignDocuments,
    canViewAnnouncements: roleCanAccessFeature(role, roles, "announcements"),
    canPublishAnnouncements,
    canViewMeetings: roleCanAccessFeature(role, roles, "meetings"),
    canViewResources: roleCanAccessFeature(role, roles, "resources"),
    canUseChat: true,
    canManageExpenses: roleCanAccessFeature(role, roles, "expenses"),
    canAdminScheduleMeetings: canScheduleMeetings,
    canAdminManageResources: canManageResources,
  };
}

function isDatabaseUnavailable(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error || "");
  return [
    "database_url is not set",
    "p1001",
    "econnrefused",
    "enotfound",
    "connection timeout",
    "timeout expired",
    "can't reach database",
    "connection terminated",
    "supabase.co",
    "neon.tech",
    "database",
  ].some((entry) => text.toLowerCase().includes(entry));
}

function localDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localUserFromInput(input: {
  name: string;
  email: string;
  password?: string;
  role: string;
  department: string;
  departmentId?: string;
  managerId?: string;
  title: string;
  employeeType?: string;
  compensationStatus?: string;
  employmentStart?: string;
  employmentEnd?: string;
  workStartTime?: string;
  workEndTime?: string;
  status: string;
}, id: number, existing?: LocalEmployeeUser): LocalEmployeeUser {
  const now = new Date().toISOString();
  return {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password?.trim() ? hashPassword(input.password) : existing?.password || hashPassword(defaultEmployeePassword),
    role: normalizeRole(input.role),
    department: input.department.trim() || "General",
    departmentId: input.departmentId ? Number(input.departmentId) : null,
    managerId: input.managerId ? Number(input.managerId) : null,
    title: input.title.trim() || "Team Member",
    employeeType: input.employeeType?.trim() || "Full-time",
    compensationStatus: input.compensationStatus === "Unpaid" ? "Unpaid" : "Paid",
    employmentStart: optionalDate(input.employmentStart)?.toISOString() || null,
    employmentEnd: optionalDate(input.employmentEnd)?.toISOString() || null,
    workStartTime: input.workStartTime?.trim() || "09:00",
    workEndTime: input.workEndTime?.trim() || "18:00",
    status: input.status === "Inactive" ? "Inactive" : "Active",
    lastLogin: existing?.lastLogin || null,
    lastSeenAt: existing?.lastSeenAt || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

async function readLocalEmployeeStore(): Promise<LocalEmployeeStore> {
  try {
    const raw = await fs.readFile(localEmployeeStorePath, "utf8");
    const parsed = JSON.parse(raw) as LocalEmployeeStore;
    if (Array.isArray(parsed.users)) {
      const store = { ...parsed, roles: mergeRoleDefinitions(parsed.roles) };
      globalForLocalEmployeeStore.bluevoltLocalEmployeeStore = store;
      return store;
    }
  } catch {
    // The local store is created on first use when Neon is not reachable.
  }

  if (globalForLocalEmployeeStore.bluevoltLocalEmployeeStore) {
    return globalForLocalEmployeeStore.bluevoltLocalEmployeeStore;
  }

  const now = new Date().toISOString();
  const bootstrapEmail = (process.env.EMPLOYEE_BOOTSTRAP_EMAIL || "pareekshithraj@schools24.in").toLowerCase();
  const bootstrapPassword = process.env.EMPLOYEE_BOOTSTRAP_PASSWORD || "abc123";
  const store: LocalEmployeeStore = {
    users: [{
      id: 1,
      name: "Pareekshith Raj",
      email: bootstrapEmail,
      password: hashPassword(bootstrapPassword),
      role: "super_admin",
      department: "Leadership",
      departmentId: null,
      managerId: null,
      title: "Super Admin",
      employeeType: "Full-time",
      compensationStatus: "Paid",
      employmentStart: now,
      employmentEnd: null,
      workStartTime: "09:00",
      workEndTime: "18:00",
      status: "Active",
      lastLogin: null,
      lastSeenAt: null,
      createdAt: now,
      updatedAt: now,
    }],
    roles: defaultRoleDefinitions(now),
    applicants: [],
  };
  await writeLocalEmployeeStore(store);
  return store;
}

async function writeLocalEmployeeStore(store: LocalEmployeeStore) {
  const normalizedStore = { ...store, roles: mergeRoleDefinitions(store.roles) };
  globalForLocalEmployeeStore.bluevoltLocalEmployeeStore = normalizedStore;

  try {
    await fs.writeFile(localEmployeeStorePath, `${JSON.stringify(normalizedStore, null, 2)}\n`, "utf8");
  } catch (error) {
    if (!localStoreWriteWarningShown) {
      localStoreWriteWarningShown = true;
      console.warn("Employee local fallback store is running in memory only.", error);
    }
  }
}

let roleTableEnsured = false;
let crmSheetAccessEnsured = false;
let chatTableEnsured = false;

async function ensureEmployeeRoleDefinitionTable() {
  if (roleTableEnsured) return;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "EmployeeRoleDefinition" (
      "id" SERIAL PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "label" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "permissions" TEXT NOT NULL DEFAULT '',
      "featureAccess" TEXT NOT NULL DEFAULT 'dashboard',
      "dashboardType" TEXT NOT NULL DEFAULT 'workspace',
      "status" TEXT NOT NULL DEFAULT 'Active',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`
    ALTER TABLE "EmployeeRoleDefinition"
    ADD COLUMN IF NOT EXISTS "featureAccess" TEXT NOT NULL DEFAULT 'dashboard'
  `;
  await prisma.$executeRaw`
    ALTER TABLE "EmployeeRoleDefinition"
    ADD COLUMN IF NOT EXISTS "dashboardType" TEXT NOT NULL DEFAULT 'workspace'
  `;
  roleTableEnsured = true;
}

async function ensureEmployeeCrmSheetAccessColumns() {
  if (crmSheetAccessEnsured) return;
  await prisma.$executeRaw`
    ALTER TABLE "EmployeeCrmSheet"
    ADD COLUMN IF NOT EXISTS "audienceUsers" TEXT NOT NULL DEFAULT ''
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "EmployeeCrmSheet_audienceUsers_idx" ON "EmployeeCrmSheet"("audienceUsers")
  `;
  crmSheetAccessEnsured = true;
}

async function ensureEmployeeChatTable() {
  if (chatTableEnsured) return;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "EmployeeChatMessage" (
      "id" SERIAL PRIMARY KEY,
      "employeeId" INTEGER NOT NULL,
      "employeeName" TEXT NOT NULL,
      "employeeRole" TEXT NOT NULL DEFAULT 'employee',
      "body" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "EmployeeChatMessage_createdAt_idx" ON "EmployeeChatMessage"("createdAt")
  `;
  chatTableEnsured = true;
}

let defaultRolesSeeded = false;

async function getEmployeeRoleDefinitionsFromDatabase(): Promise<EmployeeRoleDefinition[]> {
  await ensureEmployeeRoleDefinitionTable();
  if (!defaultRolesSeeded) {
    for (const role of defaultRoleDefinitions()) {
      await prisma.$executeRaw`
        INSERT INTO "EmployeeRoleDefinition" ("key", "label", "description", "permissions", "featureAccess", "dashboardType", "status")
        VALUES (${role.key}, ${role.label}, ${role.description}, ${role.permissions}, ${role.featureAccess}, ${role.dashboardType}, ${role.status})
        ON CONFLICT ("key") DO NOTHING
      `;
    }
    defaultRolesSeeded = true;
  }

  const roles = await prisma.$queryRaw<EmployeeRoleDefinition[]>`
    SELECT
      "id",
      "key",
      "label",
      "description",
      "permissions",
      "featureAccess",
      "dashboardType",
      "status",
      "createdAt"::text AS "createdAt",
      "updatedAt"::text AS "updatedAt"
    FROM "EmployeeRoleDefinition"
    ORDER BY "label" ASC
  `;

  return mergeRoleDefinitions(roles);
}

export async function getEmployeeApplicationRoleOptions() {
  const fallback = [
    { label: "Sales", value: "Sales" },
    { label: "Content Developer", value: "Content Developer" },
    { label: "Operations", value: "Operations" },
    { label: "HR", value: "HR" },
    { label: "Employee", value: "Employee" },
  ];

  try {
    const internalOnlyRoles = new Set(["super_admin", "admin", "director", "authorized_signatory"]);
    const roles = await getEmployeeRoleDefinitionsFromDatabase();
    const options = roles
      .filter((role) => role.status !== "Inactive" && !internalOnlyRoles.has(role.key))
      .map((role) => ({ label: role.label, value: role.label }));
    return options.length ? options : fallback;
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const store = await readLocalEmployeeStore();
    const internalOnlyRoles = new Set(["super_admin", "admin", "director", "authorized_signatory"]);
    const options = mergeRoleDefinitions(store.roles)
      .filter((role) => role.status !== "Inactive" && !internalOnlyRoles.has(role.key))
      .map((role) => ({ label: role.label, value: role.label }));
    return options.length ? options : fallback;
  }
}

async function employeeSessionCanAccessFeature(session: { role: string }, feature: EmployeePortalFeature): Promise<boolean> {
  if (session.role === "super_admin") return true;
  if (documentSignatoryRoles.has(session.role)) return true;
  try {
    return roleCanAccessFeature(session.role, await getEmployeeRoleDefinitionsFromDatabase(), feature);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const store = await readLocalEmployeeStore();
    return roleCanAccessFeature(session.role, mergeRoleDefinitions(store.roles), feature);
  }
}

async function loginLocalEmployee(email: string, password: string) {
  const store = await readLocalEmployeeStore();
  const bootstrapEmail = (process.env.EMPLOYEE_BOOTSTRAP_EMAIL || "pareekshithraj@schools24.in").toLowerCase();
  const bootstrapPassword = process.env.EMPLOYEE_BOOTSTRAP_PASSWORD || defaultEmployeePassword;
  const fallbackPasswords = email === bootstrapEmail ? [bootstrapPassword] : [];
  const index = store.users.findIndex((user) => user.email === email);
  const user = index >= 0 ? store.users[index] : null;
  const valid = user && (verifyPassword(password, user.password) || fallbackPasswords.includes(password));
  if (!user || !valid || user.status !== "Active") return null;

  const now = new Date().toISOString();
  store.users[index] = { ...user, lastLogin: now, lastSeenAt: now, updatedAt: now };
  await writeLocalEmployeeStore(store);
  return store.users[index];
}

function isPhoneColumn(column: string): boolean {
  const value = column.toLowerCase();
  return value.includes("phone") || value.includes("mobile") || value.includes("contact number") || value.includes("call number");
}

function normalizePhoneValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  if (digits.length === 10 && digits.startsWith("11")) return `011-${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith("0")) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    const national = digits.slice(2);
    if (national.startsWith("11")) return `+91-11-${national.slice(2)}`;
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return trimmed;
}

function roleKeyFromApplicantRole(roleApplied: string, roles: EmployeeRoleDefinition[]): string {
  const normalized = normalizeRole(roleApplied);
  const lower = roleApplied.trim().toLowerCase();
  const match = mergeRoleDefinitions(roles).find((role) => (
    role.key === normalized ||
    role.label.toLowerCase() === lower ||
    normalizeRole(role.label) === normalized
  ));
  return match?.key || normalized || "employee";
}

function applicantNoteValue(notes: string | null | undefined, label: string): string {
  const pattern = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.*)$`, "im");
  return notes?.match(pattern)?.[1]?.trim() || "";
}

function applicantEmployeeType(notes: string | null | undefined): string {
  const value = applicantNoteValue(notes, "Employee type");
  return value || "Intern";
}

function applicantCompensationStatus(notes: string | null | undefined): string {
  const value = applicantNoteValue(notes, "Paid preference").toLowerCase();
  return value.includes("unpaid") ? "Unpaid" : "Paid";
}

function applicantStartDate(notes: string | null | undefined): Date | null {
  const value = applicantNoteValue(notes, "Available from");
  return optionalDate(value);
}

const documentApprovalPending = "Approval status: Pending Director Approval";
const documentApprovalApproved = "Approval status: Approved";
const signatorySignatureUrl = "/Assets/signatures/swathi_kn-removebg-preview.png";

function documentIsApproved(notes?: string | null): boolean {
  return (notes || "").includes(documentApprovalApproved);
}

function documentApprovalNotes(notes?: string | null, approvedBy?: string) {
  const cleaned = (notes || "")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("Approval status:") && !line.startsWith("Approved by:") && !line.startsWith("Signature:"))
    .join("\n")
    .trim();
  return [
    documentApprovalApproved,
    approvedBy ? `Approved by: ${approvedBy}` : "",
    `Signature: ${signatorySignatureUrl}`,
    cleaned,
  ].filter(Boolean).join("\n");
}

async function createEmployeeStarterDocuments(input: {
  employeeId: number;
  employeeName: string;
  employeeType: string;
  uploadedBy: number;
}) {
  const letterType = input.employeeType === "Intern" ? "Internship Offer Letter" : "Offer Letter";
  const letterUrl = `/api/employee/letter?employeeId=${input.employeeId}&type=${encodeURIComponent(letterType)}`;
  await prisma.employeeDocument.create({
    data: {
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      title: letterType,
      documentType: letterType,
      url: letterUrl,
      visibilityRoles: "super_admin,director,authorized_signatory,admin,hr",
      notes: `${documentApprovalPending}\nAuto-generated when the employee account was created.`,
      uploadedBy: input.uploadedBy,
    },
  });
  await prisma.employeeNotification.create({
    data: {
      employeeId: input.employeeId,
      title: "Change your default password",
      body: "Your account was created with the default password. Please reset it from Profile after login.",
      createdBy: input.uploadedBy,
    },
  });
}

function parseSheetText(value?: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return {
      columns: ["Company", "Contact", "Email", "Phone", "Next Action"],
      rows: [],
    };
  }
  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const parseLine = (line: string) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const columns = parseLine(lines[0]).map((column, index) => column || `Column ${index + 1}`);
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(columns.map((column, index) => {
      const cell = cells[index] || "";
      return [column, isPhoneColumn(column) ? normalizePhoneValue(cell) : cell];
    }));
  });
  return { columns, rows };
}

function crmRowColor(status: string): string {
  if (status === "Done") return "green";
  if (status === "Callback") return "blue";
  if (status === "Not Interested") return "amber";
  if (status === "Invalid") return "red";
  return "none";
}

async function employeeNameForId(id: number): Promise<string> {
  const employee = await prisma.employeeUser.findUnique({
    where: { id },
    select: { name: true },
  });
  return employee?.name || "Unknown Employee";
}

async function logEmployeeAudit(input: {
  actorId?: number;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonObject;
}) {
  await prisma.employeeAuditEvent.create({
    data: {
      actorId: input.actorId,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}

function minutesFromTime(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function isWithinWorkHours(startTime: string, endTime: string, now = new Date()): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = minutesFromTime(startTime);
  const endMinutes = minutesFromTime(endTime);
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function scheduledWorkHours(startTime: string, endTime: string): number {
  const startMinutes = minutesFromTime(startTime || "09:00");
  let endMinutes = minutesFromTime(endTime || "18:00");
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.max(0, (endMinutes - startMinutes) / 60);
}

function employeeDurationLabel(start?: Date | null, end?: Date | null): string {
  if (!start && !end) return "Not set";
  const format = (date: Date) => date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  if (start && end) return `${format(start)} to ${format(end)}`;
  if (start) return `From ${format(start)}`;
  return `Until ${format(end as Date)}`;
}

function googleCalendarUrl(input: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  details?: string | null;
  meetUrl?: string | null;
  attendee?: string | null;
}) {
  const format = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${format(input.startsAt)}/${format(input.endsAt)}`);
  if (input.details || input.meetUrl) {
    url.searchParams.set("details", [input.details, input.meetUrl].filter(Boolean).join("\n\n"));
  }
  if (input.meetUrl) url.searchParams.set("location", input.meetUrl);
  if (input.attendee) url.searchParams.set("add", input.attendee);
  return url.toString();
}

function friendlyEmployeeError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (
    lower.includes("prisma") ||
    lower.includes("database") ||
    lower.includes("can't reach database") ||
    lower.includes("connection") ||
    lower.includes("supabase.co") ||
    lower.includes("neon.tech") ||
    lower.includes("timeout") ||
    lower.includes("p1001")
  ) {
    return "The employee portal is temporarily unavailable. Please try again in a minute.";
  }

  if (lower.includes("employee login required")) {
    return "Please log in again to continue.";
  }

  if (lower.includes("inactive")) {
    return "This employee account is inactive.";
  }

  return fallback;
}

async function requireEmployee() {
  const session = await getEmployeeSession();
  if (!session) throw new Error("Employee login required.");

  const user = await prisma.employeeUser.findUnique({ where: { id: Number(session.userId) } });
  if (!user || user.status !== "Active") {
    await clearEmployeeSession();
    throw new Error("Employee account is inactive or unavailable.");
  }

  return { session: { ...session, role: user.role }, user };
}

async function ensureFirstSuperAdmin(email: string, password: string) {
  const bootstrapEmail = (process.env.EMPLOYEE_BOOTSTRAP_EMAIL || "pareekshithraj@schools24.in").toLowerCase();
  const bootstrapPasswords = process.env.EMPLOYEE_BOOTSTRAP_PASSWORD
    ? [process.env.EMPLOYEE_BOOTSTRAP_PASSWORD]
    : [defaultEmployeePassword];

  if (email !== bootstrapEmail || !bootstrapPasswords.includes(password)) return;

  const count = await prisma.employeeUser.count();
  if (count > 0) return;

  await prisma.employeeUser.create({
    data: {
      name: "Pareekshith Raj",
      email,
      password: hashPassword(password),
      role: "super_admin",
      department: "Leadership",
      title: "Super Admin",
    },
  });
}

export async function loginEmployee(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  try {
    await ensureFirstSuperAdmin(email, input.password);

    const user = await prisma.employeeUser.findUnique({ where: { email } });
    if (!user || !verifyPassword(input.password, user.password)) {
      return { success: false, error: "Invalid employee credentials." };
    }
    if (user.status !== "Active") {
      return { success: false, error: "This employee account is inactive." };
    }

    await prisma.employeeUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await setEmployeeSession({
      userId: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return { success: true, redirectTo: "/employee/portal" };
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      const localUser = await loginLocalEmployee(email, input.password);
      if (localUser) {
        await setEmployeeSession({
          userId: localUser.id.toString(),
          email: localUser.email,
          name: localUser.name,
          role: localUser.role,
        });
        return { success: true, redirectTo: "/employee/portal" };
      }
    }
    console.error("Employee login failed", error);
    return { success: false, error: friendlyEmployeeError(error, "Login failed. Please try again.") };
  }
}

export async function logoutEmployee() {
  await clearEmployeeSession();
  return { success: true };
}

async function getLocalEmployeePortalData(_sortResources = "newest", activeTab = "dashboard") {
  void _sortResources;
  const session = await getEmployeeSession();
  if (!session) throw new Error("Employee login required.");

  const store = await readLocalEmployeeStore();
  const now = new Date();
  const userIndex = store.users.findIndex((employee) => employee.id === Number(session.userId));
  if (userIndex === -1 || store.users[userIndex].status !== "Active") {
    await clearEmployeeSession();
    throw new Error("Employee account is inactive or unavailable.");
  }

  store.users[userIndex] = { ...store.users[userIndex], lastSeenAt: now.toISOString(), updatedAt: now.toISOString() };
  await writeLocalEmployeeStore(store);

  const activeUser = store.users[userIndex];
  const normalizedSession = { ...session, name: activeUser.name, email: activeUser.email, role: activeUser.role };
  const roleDefinitions = mergeRoleDefinitions(store.roles);
  const capabilities = capabilitiesForRole(normalizedSession.role, roleDefinitions);
  const canManage = capabilities.canManage;
  const visibleUsers = canManage ? store.users : store.users.filter((employee) => employee.id === activeUser.id);
  const users = visibleUsers.map((employee) => ({
    ...employee,
    employmentStart: localDate(employee.employmentStart),
    employmentEnd: localDate(employee.employmentEnd),
    lastLogin: localDate(employee.lastLogin),
    lastSeenAt: localDate(employee.lastSeenAt),
    createdAt: localDate(employee.createdAt) || now,
    updatedAt: localDate(employee.updatedAt) || now,
    isOnline: employee.lastSeenAt ? now.getTime() - new Date(employee.lastSeenAt).getTime() <= 5 * 60 * 1000 : false,
    isWithinWorkHours: isWithinWorkHours(employee.workStartTime, employee.workEndTime, now),
    durationLabel: employeeDurationLabel(localDate(employee.employmentStart), localDate(employee.employmentEnd)),
  }));

  return {
    session: normalizedSession,
    mustChangePassword: verifyPassword(defaultEmployeePassword, activeUser.password),
    capabilities,
    users,
    crmRecords: [],
    crmSheets: [],
    applicants: canManage || ["admin", "applicants", "reports"].includes(activeTab)
      ? (store.applicants || []).map((applicant) => ({
        ...applicant,
        phone: applicant.phone || null,
        meetUrl: applicant.meetUrl || null,
        notes: applicant.notes || null,
        createdAt: localDate(applicant.createdAt) || now,
        updatedAt: localDate(applicant.updatedAt) || now,
      }))
      : [],
    meetings: [],
    resources: [],
    attendance: [],
    leaveRequests: [],
    tasks: [],
    payrollInputs: [],
    reviews: [],
    documents: [],
    announcements: [],
    comments: [],
    departments: [],
    roleDefinitions,
    notifications: [{
      id: 1,
      employeeId: activeUser.id,
      title: "Local fallback mode",
      body: "Cloud database is currently unreachable, so the employee portal is running from a local employee store on this machine.",
      targetRoles: "all",
      readAt: null,
      createdBy: null,
      createdAt: now,
    }],
    expenses: [],
    auditEvents: [],
    chatMessages: [],
  };
}

export async function getEmployeePortalData(sortResources = "newest", activeTab = "dashboard") {
  try {
  const { session, user } = await requireEmployee();
  const roleDefinitions = await getEmployeeRoleDefinitionsFromDatabase();
  await ensureEmployeeCrmSheetAccessColumns();
  await ensureEmployeeChatTable();
  const capabilities = capabilitiesForRole(session.role, roleDefinitions);
  const canManage = capabilities.canManage;
  const canManageAccess = capabilities.canManageAccess;
  const canUseCrm = capabilities.canUseCrm;
  const canManagePayroll = capabilities.canManagePayroll;
  const canViewMeetings = capabilities.canViewMeetings;
  const canViewResources = capabilities.canViewResources;
  const canViewAnnouncements = capabilities.canViewAnnouncements;
  const now = new Date();

  await prisma.employeeUser.update({
    where: { id: user.id },
    data: { lastSeenAt: now },
  });

  const [users, crmRecords, crmSheets, applicants, meetings, resources, attendance, leaveRequests, tasks, payrollInputs, reviews, documents, announcements, comments, departments, notifications, expenses, auditEvents] = await Promise.all([
    canManage && ["dashboard", "admin", "ops", "reports", "crm", "approvals"].includes(activeTab)
      ? prisma.employeeUser.findMany({ orderBy: { createdAt: "desc" } })
      : prisma.employeeUser.findMany({ where: { id: user.id } }),
    canUseCrm && ["dashboard", "crm", "reports"].includes(activeTab)
      ? prisma.employeeCrmRecord.findMany({ orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] })
      : Promise.resolve([]),
    ["dashboard", "crm", "approvals"].includes(activeTab) && canUseCrm
      ? prisma.employeeCrmSheet.findMany({
          where: canManage
            ? {}
            : {
              OR: [
                { requestedBy: user.id },
                { status: "Approved", audienceRoles: "all" },
                { status: "Approved", audienceRoles: session.role },
                { status: "Approved", audienceUsers: { contains: `,${user.id},` } },
                { status: "Approved", ownerRole: session.role },
              ],
            },
          include: { rows: { orderBy: { rowNumber: "asc" }, take: 300 } },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: 30,
        })
      : Promise.resolve([]),
    capabilities.canManageApplicants && ["admin", "applicants", "reports", "approvals"].includes(activeTab)
      ? prisma.employeeApplicant.findMany({ orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canViewMeetings && ["dashboard", "meetings", "reports", "approvals"].includes(activeTab)
      ? prisma.employeeMeeting.findMany({ orderBy: { startsAt: "asc" } })
      : Promise.resolve([]),
    canViewResources && ["dashboard", "resources", "reports", "approvals"].includes(activeTab)
      ? prisma.employeeResource.findMany({
          orderBy:
            sortResources === "title"
              ? { title: "asc" }
              : sortResources === "type"
                ? { resourceType: "asc" }
              : { createdAt: "desc" },
        })
      : Promise.resolve([]),
    ["dashboard", "ops", "reports", "approvals"].includes(activeTab)
      ? (canManage
        ? prisma.employeeAttendance.findMany({ orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], take: 500 })
        : prisma.employeeAttendance.findMany({ where: { employeeId: user.id }, orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], take: 120 }))
      : Promise.resolve([]),
    ["ops", "approvals"].includes(activeTab)
      ? (canManage
        ? prisma.employeeLeaveRequest.findMany({ orderBy: [{ updatedAt: "desc" }, { startsAt: "desc" }], take: 80 })
        : prisma.employeeLeaveRequest.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }, { startsAt: "desc" }], take: 40 }))
      : Promise.resolve([]),
    ["dashboard", "ops", "approvals"].includes(activeTab)
      ? prisma.employeeTask.findMany({
          where: session.role === "super_admin" ? {} : {
            OR: [
              { assignedTo: user.id },
              { ownerRole: "all" },
              { ownerRole: session.role },
            ],
          },
          orderBy: [{ updatedAt: "desc" }, { dueAt: "asc" }],
          take: 100,
        })
      : Promise.resolve([]),
    capabilities.canManagePayroll && ["payroll", "reports"].includes(activeTab)
      ? (canManagePayroll
        ? prisma.employeePayrollInput.findMany({ orderBy: [{ updatedAt: "desc" }], take: 80 })
        : prisma.employeePayrollInput.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }], take: 24 }))
      : Promise.resolve([]),
    capabilities.canReviewPerformance && ["reviews", "reports"].includes(activeTab)
      ? (canManage
        ? prisma.employeePerformanceReview.findMany({ orderBy: [{ updatedAt: "desc" }], take: 80 })
        : prisma.employeePerformanceReview.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }], take: 24 }))
      : Promise.resolve([]),
    capabilities.canViewDocuments && ["dashboard", "documents", "reports", "approvals"].includes(activeTab)
      ? prisma.employeeDocument.findMany({ orderBy: [{ updatedAt: "desc" }], take: 100 })
      : activeTab === "documents"
        ? prisma.employeeDocument.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }], take: 50 })
      : Promise.resolve([]),
    canViewAnnouncements && ["dashboard", "announcements", "reports", "approvals"].includes(activeTab)
      ? prisma.employeeAnnouncement.findMany({ orderBy: [{ createdAt: "desc" }], take: 40 })
      : Promise.resolve([]),
    capabilities.canManageOps && activeTab === "ops"
      ? prisma.employeeComment.findMany({ orderBy: { createdAt: "desc" }, take: 120 })
      : Promise.resolve([]),
    activeTab === "admin" && canManage ? prisma.employeeDepartment.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    ["dashboard", "admin", "approvals"].includes(activeTab) || (activeTab === "access" && canManageAccess)
      ? prisma.employeeNotification.findMany({
          where: {
            OR: [
              { employeeId: user.id },
              { targetRoles: "all" },
              { targetRoles: session.role },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    capabilities.canManageExpenses && ["expenses", "reports", "approvals"].includes(activeTab)
      ? (canManage
        ? prisma.employeeExpenseClaim.findMany({ orderBy: [{ updatedAt: "desc" }], take: 80 })
        : prisma.employeeExpenseClaim.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }], take: 40 }))
      : Promise.resolve([]),
    (activeTab === "access" && canManageAccess) || (["admin", "reports"].includes(activeTab) && canManage)
      ? prisma.employeeAuditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
      : Promise.resolve([]),
  ]);

  const visibleMeetings = meetings
    .filter((meeting) => visibleToRole(meeting.audienceRoles, session.role))
    .map((meeting) => ({
      ...meeting,
      calendarUrl: googleCalendarUrl({
        title: meeting.title,
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
        details: meeting.notes,
        meetUrl: meeting.meetUrl,
        attendee: meeting.applicantEmail,
      }),
    }));

  const chatMessages = capabilities.canUseChat && ["dashboard", "chat"].includes(activeTab)
    ? await prisma.$queryRaw<Array<{
      id: number;
      employeeId: number;
      employeeName: string;
      employeeRole: string;
      body: string;
      createdAt: Date;
    }>>`
      SELECT "id", "employeeId", "employeeName", "employeeRole", "body", "createdAt"
      FROM "EmployeeChatMessage"
      ORDER BY "createdAt" DESC
      LIMIT 80
    `
    : [];

  return {
    session,
    mustChangePassword: verifyPassword(defaultEmployeePassword, user.password),
    capabilities,
    users: users.map((userRecord) => {
      const { password, ...employee } = userRecord;
      void password;
      return {
        ...employee,
        isOnline: employee.lastSeenAt ? now.getTime() - employee.lastSeenAt.getTime() <= 5 * 60 * 1000 : false,
        isWithinWorkHours: isWithinWorkHours(employee.workStartTime, employee.workEndTime, now),
        durationLabel: employeeDurationLabel(employee.employmentStart, employee.employmentEnd),
      };
    }),
    crmRecords,
    crmSheets,
    applicants,
    meetings: visibleMeetings,
    resources: resources.filter((resource) => visibleToRole(resource.audienceRoles, session.role)),
    attendance,
    leaveRequests,
    tasks,
    payrollInputs,
    reviews,
    documents: documents.filter((document) => visibleToRole(document.visibilityRoles, session.role) || (document.employeeId === user.id && documentIsApproved(document.notes))),
    announcements: announcements.filter((announcement) => visibleToRole(announcement.audienceRoles, session.role)),
    comments,
    departments,
    roleDefinitions,
    notifications,
    expenses,
    auditEvents,
    chatMessages: chatMessages.reverse(),
  };
  } catch (error) {
    if (isDatabaseUnavailable(error)) return getLocalEmployeePortalData(sortResources, activeTab);
    throw error;
  }
}

export type EmployeeRoleDefinitionInput = {
  label: string;
  key?: string;
  description?: string;
  permissions?: string;
  featureAccess?: string | string[];
  dashboardType?: string;
  status?: string;
};

export async function saveEmployeeRoleDefinition(input: EmployeeRoleDefinitionInput) {
  const typedInput = {
    ...input,
    label: input.label?.trim() || "",
    key: input.key?.trim() || "",
    description: input.description?.trim(),
    permissions: input.permissions?.trim(),
    dashboardType: input.dashboardType === "superior" ? "superior" : "workspace",
  };

  try {
    const { session } = await requireEmployee();
    if (session.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can create roles and map feature access." };
    }

    const roles = await getEmployeeRoleDefinitionsFromDatabase();
    const key = roleKey(typedInput.key || typedInput.label);
    const existingRole = roles.find((role) => role.key === key);
    const label = typedInput.label || existingRole?.label || defaultRoleLabels[key] || "";
    if (!label) return { success: false, error: "Role name is required." };

    const coreRole = isCoreRole(key);
    const status = coreRole
      ? existingRole?.status || "Active"
      : typedInput.status === "Inactive"
        ? "Inactive"
        : existingRole?.status || "Active";
    const description = coreRole
      ? existingRole?.description || defaultRolePermissions[key] || "Portal access role."
      : typedInput.description || existingRole?.description || "Portal access role.";
    const permissions = coreRole
      ? existingRole?.permissions || defaultRolePermissions[key] || "Access is controlled by Super Admin assignments."
      : typedInput.permissions || existingRole?.permissions || "Access is controlled by Super Admin assignments.";
    const featureAccess = parseFeatureAccess(input.featureAccess || existingRole?.featureAccess).join(",");
    const dashboardType = coreRole
      ? dashboardTypeForRole(key)
      : typedInput.dashboardType || existingRole?.dashboardType || dashboardTypeForRole(key);

    await prisma.$executeRaw`
      INSERT INTO "EmployeeRoleDefinition" ("key", "label", "description", "permissions", "featureAccess", "dashboardType", "status")
      VALUES (${key}, ${label}, ${description}, ${permissions}, ${featureAccess}, ${dashboardType}, ${status})
      ON CONFLICT ("key") DO UPDATE SET
        "label" = EXCLUDED."label",
        "description" = EXCLUDED."description",
        "permissions" = EXCLUDED."permissions",
        "featureAccess" = EXCLUDED."featureAccess",
        "dashboardType" = EXCLUDED."dashboardType",
        "status" = EXCLUDED."status",
        "updatedAt" = NOW()
    `;

    await logEmployeeAudit({
      actorId: Number(session.userId),
      actorName: session.name,
      action: "role.upsert",
      entityType: "employee_role",
      entityId: key,
      metadata: { label, status, featureAccess, dashboardType },
    });

    revalidatePath("/employee/portal");
    return { success: true, roleKey: key };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const session = await getEmployeeSession();
    if (!session || session.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can create roles and map feature access." };
    }

    const store = await readLocalEmployeeStore();
    const now = new Date().toISOString();
    const roles = mergeRoleDefinitions(store.roles);
    const key = roleKey(typedInput.key || typedInput.label);
    const existingIndex = roles.findIndex((role) => role.key === key);
    const existingRole = existingIndex >= 0 ? roles[existingIndex] : undefined;
    const label = typedInput.label || existingRole?.label || defaultRoleLabels[key] || "";
    if (!label) return { success: false, error: "Role name is required." };

    const coreRole = isCoreRole(key);
    const status = coreRole
      ? existingRole?.status || "Active"
      : typedInput.status === "Inactive"
        ? "Inactive"
        : existingRole?.status || "Active";
    const description = coreRole
      ? existingRole?.description || defaultRolePermissions[key] || "Portal access role."
      : typedInput.description || existingRole?.description || "Portal access role.";
    const permissions = coreRole
      ? existingRole?.permissions || defaultRolePermissions[key] || "Access is controlled by Super Admin assignments."
      : typedInput.permissions || existingRole?.permissions || "Access is controlled by Super Admin assignments.";
    const featureAccess = parseFeatureAccess(input.featureAccess || existingRole?.featureAccess).join(",");
    const dashboardType = coreRole
      ? dashboardTypeForRole(key)
      : typedInput.dashboardType || existingRole?.dashboardType || dashboardTypeForRole(key);
    const nextId = Math.max(0, ...roles.map((role) => role.id || 0)) + 1;
    const role: EmployeeRoleDefinition = {
      id: existingIndex >= 0 ? roles[existingIndex].id : nextId,
      key,
      label,
      description,
      permissions,
      featureAccess,
      dashboardType,
      status,
      createdAt: existingIndex >= 0 ? roles[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) roles[existingIndex] = role;
    else roles.push(role);

    await writeLocalEmployeeStore({ ...store, roles: mergeRoleDefinitions(roles) });
    revalidatePath("/employee/portal");
    return { success: true, roleKey: key };
  }
}

export async function deleteEmployeeRoleDefinition(input: { key: string }) {
  const key = roleKey(input.key);
  if (isCoreRole(key)) {
    return { success: false, error: "System roles cannot be deleted." };
  }

  try {
    const { session } = await requireEmployee();
    if (session.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can delete custom roles." };
    }

    const assignedUsers = await prisma.employeeUser.count({ where: { role: key } });
    if (assignedUsers > 0) {
      return { success: false, error: "Reassign employees before deleting this role." };
    }

    await ensureEmployeeRoleDefinitionTable();
    await prisma.$executeRaw`DELETE FROM "EmployeeRoleDefinition" WHERE "key" = ${key}`;
    await logEmployeeAudit({
      actorId: Number(session.userId),
      actorName: session.name,
      action: "role.delete",
      entityType: "employee_role",
      entityId: key,
    });
    revalidatePath("/employee/portal");
    return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const session = await getEmployeeSession();
    if (!session || session.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can delete custom roles." };
    }

    const store = await readLocalEmployeeStore();
    if (store.users.some((user) => user.role === key)) {
      return { success: false, error: "Reassign employees before deleting this role." };
    }

    await writeLocalEmployeeStore({
      ...store,
      roles: (store.roles || []).filter((role) => role.key !== key),
    });
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function saveEmployeeUser(input: {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  department: string;
  departmentId?: string;
  managerId?: string;
  title: string;
  employeeType?: string;
  compensationStatus?: string;
  employmentStart?: string;
  employmentEnd?: string;
  workStartTime?: string;
  workEndTime?: string;
  status: string;
}) {
  try {
  const { session } = await requireEmployee();
  if (!(await employeeSessionCanAccessFeature(session, "employees"))) {
    return { success: false, error: "Only super admins/admins can manage employee mappings." };
  }

  const email = input.email.trim().toLowerCase();
  const requestedId = input.id ? Number(input.id) : null;
  const existingById = requestedId ? await prisma.employeeUser.findUnique({ where: { id: requestedId } }) : null;
  const existingByEmail = await prisma.employeeUser.findUnique({ where: { email } });
  if (existingByEmail && existingById && existingByEmail.id !== existingById.id) {
    return { success: false, error: "Another employee already uses this email." };
  }
  if (existingByEmail && !existingById && input.id) {
    return { success: false, error: "Another employee already uses this email." };
  }
  const existing = existingById || existingByEmail;
  const data = {
    name: input.name.trim(),
    email,
    role: normalizeRole(input.role),
    department: input.department.trim() || "General",
    departmentId: input.departmentId ? Number(input.departmentId) : null,
    managerId: input.managerId ? Number(input.managerId) : null,
    title: input.title.trim() || "Team Member",
    employeeType: input.employeeType?.trim() || "Full-time",
    compensationStatus: input.compensationStatus === "Unpaid" ? "Unpaid" : "Paid",
    employmentStart: optionalDate(input.employmentStart),
    employmentEnd: optionalDate(input.employmentEnd),
    workStartTime: input.workStartTime?.trim() || "09:00",
    workEndTime: input.workEndTime?.trim() || "18:00",
    status: input.status === "Inactive" ? "Inactive" : "Active",
  };

  let employeeId = existing?.id;

  if (existing) {
    await prisma.employeeUser.update({
      where: { id: existing.id },
      data: input.password?.trim() ? { ...data, password: hashPassword(input.password) } : data,
    });
  } else {
    const created = await prisma.employeeUser.create({ data: { ...data, password: hashPassword(input.password?.trim() || defaultEmployeePassword) } });
    employeeId = created.id;
    await createEmployeeStarterDocuments({
      employeeId: created.id,
      employeeName: created.name,
      employeeType: data.employeeType,
      uploadedBy: Number(session.userId),
    });
  }
  await logEmployeeAudit({
    actorId: Number(session.userId),
    actorName: session.name,
    action: existing ? "employee.update" : "employee.create",
    entityType: "employee",
    entityId: employeeId?.toString() || email,
    metadata: { email, role: data.role, compensationStatus: data.compensationStatus },
  });

  revalidatePath("/employee/portal");
  return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const session = await getEmployeeSession();
    if (!session || !(await employeeSessionCanAccessFeature(session, "employees"))) {
      return { success: false, error: "Only super admins/admins can manage employee mappings." };
    }
    const store = await readLocalEmployeeStore();
    const email = input.email.trim().toLowerCase();
    const requestedId = input.id ? Number(input.id) : null;
    const existingIndex = requestedId
      ? store.users.findIndex((employee) => employee.id === requestedId)
      : store.users.findIndex((employee) => employee.email === email);
    const emailOwner = store.users.find((employee) => employee.email === email);
    if (emailOwner && emailOwner.id !== (requestedId || emailOwner.id)) {
      return { success: false, error: "Another employee already uses this email." };
    }
    const nextId = existingIndex >= 0 ? store.users[existingIndex].id : Math.max(0, ...store.users.map((employee) => employee.id)) + 1;
    const employee = localUserFromInput(input, nextId, existingIndex >= 0 ? store.users[existingIndex] : undefined);
    if (existingIndex >= 0) store.users[existingIndex] = employee;
    else store.users.unshift(employee);
    await writeLocalEmployeeStore(store);
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function saveCrmRecord(input: {
  id?: string;
  company: string;
  contactName: string;
  email?: string;
  phone?: string;
  ownerRole: string;
  stage: string;
  source: string;
  priority: string;
  leadRating?: string;
  estimatedValue?: string;
  reminderAt?: string;
  nextAction?: string;
  notes?: string;
}) {
  const { session } = await requireEmployee();
  if (session.role !== "super_admin") {
    return { success: false, error: "Only super admin can edit CRM records." };
  }

  const { id, ...rest } = input;
  const data = {
    ...rest,
    leadRating: input.leadRating || "Warm",
    estimatedValue: numberValue(input.estimatedValue),
    reminderAt: optionalDateTime(input.reminderAt),
  };
  if (id) await prisma.employeeCrmRecord.update({ where: { id: Number(id) }, data });
  else await prisma.employeeCrmRecord.create({ data });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveCrmSheetRequest(input: {
  title: string;
  sourceName?: string;
  ownerRole: string;
  audienceRoles?: string;
  audienceUsers?: string;
  description?: string;
  pasteData?: string;
}) {
  const { session, user } = await requireEmployee();
  if (session.role !== "super_admin") {
    return { success: false, error: "Only super admin can create CRM sheets." };
  }
  await ensureEmployeeCrmSheetAccessColumns();
  const parsed = parseSheetText(input.pasteData);
  const sheet = await prisma.employeeCrmSheet.create({
    data: {
      title: input.title.trim(),
      sourceName: input.sourceName?.trim() || "Pasted or CSV source",
      sourceType: "Pasted sheet",
      ownerRole: normalizeRole(input.ownerRole),
      audienceRoles: input.audienceRoles?.trim() || input.ownerRole || "sales",
      audienceUsers: normalizeAudienceUsers(input.audienceUsers),
      description: input.description,
      status: hasEmployeeRole(session, ["admin", "hr"]) ? "Approved" : "Pending",
      locked: !hasEmployeeRole(session, ["admin", "hr"]),
      columns: parsed.columns,
      requestedBy: user.id,
      requestedByName: user.name,
      approvedBy: hasEmployeeRole(session, ["admin", "hr"]) ? Number(session.userId) : null,
      rows: {
        create: parsed.rows.map((row, index) => ({
          rowNumber: index + 1,
          data: row,
          locked: !hasEmployeeRole(session, ["admin", "hr"]),
        })),
      },
    },
  });
  await prisma.employeeNotification.create({
    data: {
      targetRoles: "admin",
      title: "CRM source approval requested",
      body: `${user.name} requested access for "${sheet.title}" with ${parsed.rows.length} source rows.`,
      createdBy: user.id,
    },
  });
  await logEmployeeAudit({
    actorId: user.id,
    actorName: session.name,
    action: "crm_sheet.request",
    entityType: "crm_sheet",
    entityId: sheet.id.toString(),
    metadata: { rows: parsed.rows.length, ownerRole: input.ownerRole },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function approveCrmSheet(input: { id: string; status: string }) {
  const { session } = await requireEmployee();
  if (session.role !== "super_admin") {
    return { success: false, error: "Only super admin can approve CRM source sheets." };
  }
  const status = input.status === "Rejected" ? "Rejected" : "Approved";
  const sheet = await prisma.employeeCrmSheet.update({
    where: { id: Number(input.id) },
    data: {
      status,
      locked: status !== "Approved",
      approvedBy: Number(session.userId),
      rows: { updateMany: { where: {}, data: { locked: status !== "Approved" } } },
    },
  });
  if (sheet.requestedBy) {
    await prisma.employeeNotification.create({
      data: {
        employeeId: sheet.requestedBy,
        title: `CRM source ${status.toLowerCase()}`,
        body: status === "Approved" ? `"${sheet.title}" is unlocked for work.` : `"${sheet.title}" was rejected by admin.`,
        createdBy: Number(session.userId),
      },
    });
  }
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "crm_sheet.approve", entityType: "crm_sheet", entityId: input.id, metadata: { status } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function addCrmSheetRows(input: { sheetId: string; pasteData: string }) {
  const { session, user } = await requireEmployee();
  if (session.role !== "super_admin") {
    return { success: false, error: "Only super admin can add CRM sheet rows." };
  }
  const sheet = await prisma.employeeCrmSheet.findUnique({ where: { id: Number(input.sheetId) }, include: { rows: { orderBy: { rowNumber: "desc" }, take: 1 } } });
  if (!sheet) return { success: false, error: "Sheet not found." };
  if (sheet.locked || sheet.status !== "Approved") return { success: false, error: "This sheet is locked until admin approval." };
  const parsed = parseSheetText(input.pasteData);
  const start = sheet.rows[0]?.rowNumber || 0;
  if (parsed.rows.length === 0) return { success: false, error: "Paste at least one data row." };
  await prisma.employeeCrmSheetRow.createMany({
    data: parsed.rows.map((row, index) => ({
      sheetId: sheet.id,
      rowNumber: start + index + 1,
      data: row,
    })),
  });
  await prisma.employeeCrmSheet.update({ where: { id: sheet.id }, data: { columns: parsed.columns } });
  await logEmployeeAudit({ actorId: user.id, actorName: session.name, action: "crm_sheet.rows_add", entityType: "crm_sheet", entityId: sheet.id.toString(), metadata: { rows: parsed.rows.length } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function updateCrmSheetRowStatus(input: {
  rowId: string;
  status: string;
  reason?: string;
}) {
  const { session, user } = await requireEmployee();
  const canUseCrm = await employeeSessionCanAccessFeature(session, "crm");
  if (!canUseCrm) return { success: false, error: "You do not have CRM access." };
  const row = await prisma.employeeCrmSheetRow.findUnique({
    where: { id: Number(input.rowId) },
    include: { sheet: true },
  });
  if (!row) return { success: false, error: "CRM row not found." };
  const sheet = row.sheet;
  const canAccessSheet = session.role === "super_admin" ||
    sheet.requestedBy === user.id ||
    (sheet.status === "Approved" && (
      sheet.audienceRoles === "all" ||
      sheet.audienceRoles === session.role ||
      sheet.ownerRole === session.role ||
      (sheet.audienceUsers || "").includes(`,${user.id},`)
    ));
  if (!canAccessSheet || sheet.status !== "Approved" || sheet.locked) {
    return { success: false, error: "This CRM sheet is not available for row updates." };
  }
  const status = ["Open", "Done", "Callback", "Not Interested", "Invalid"].includes(input.status) ? input.status : "Open";
  await prisma.employeeCrmSheetRow.update({
    where: { id: Number(input.rowId) },
    data: {
      status,
      statusColor: crmRowColor(status),
      reason: input.reason || status,
      updatedBy: Number(session.userId),
      updatedByName: session.name,
      doneAt: status === "Done" ? new Date() : null,
    },
  });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "crm_sheet.row_status", entityType: "crm_sheet_row", entityId: input.rowId, metadata: { status } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveApplicant(input: {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  roleApplied: string;
  stage: string;
  source: string;
  meetUrl?: string;
  notes?: string;
}) {
  const data = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    roleApplied: input.roleApplied.trim(),
    stage: input.stage || "New",
    source: input.source || "Manual",
    meetUrl: input.meetUrl?.trim() || null,
    notes: input.notes?.trim() || null,
  };
  try {
    const { session } = await requireEmployee();
    if (!(await employeeSessionCanAccessFeature(session, "applicants"))) {
      return { success: false, error: "Only HR/admin roles can manage applicants." };
    }
    if (input.id) await prisma.employeeApplicant.update({ where: { id: Number(input.id) }, data });
    else await prisma.employeeApplicant.create({ data });
    revalidatePath("/employee/portal");
    return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const session = await getEmployeeSession();
    if (!session || !(await employeeSessionCanAccessFeature(session, "applicants"))) {
      return { success: false, error: "Only HR/admin roles can manage applicants." };
    }
    const store = await readLocalEmployeeStore();
    const applicants = store.applicants || [];
    const now = new Date().toISOString();
    const existingIndex = input.id ? applicants.findIndex((applicant) => applicant.id === Number(input.id)) : -1;
    const nextId = existingIndex >= 0 ? applicants[existingIndex].id : Math.max(0, ...applicants.map((applicant) => applicant.id)) + 1;
    const applicant: LocalEmployeeApplicant = {
      id: nextId,
      ...data,
      createdAt: existingIndex >= 0 ? applicants[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) applicants[existingIndex] = applicant;
    else applicants.unshift(applicant);
    await writeLocalEmployeeStore({ ...store, applicants });
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function submitEmployeeApplication(input: {
  name: string;
  email: string;
  phone?: string;
  roleApplied: string;
  notes?: string;
}) {
  const data = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    roleApplied: input.roleApplied.trim(),
    stage: "New",
    source: "Public application link",
    meetUrl: null,
    notes: input.notes?.trim() || null,
  };

  if (!data.name || !data.email || !data.roleApplied) {
    return { success: false, error: "Name, email, and role are required." };
  }

  try {
    await prisma.employeeApplicant.create({ data });
    revalidatePath("/employee/portal");
    return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const store = await readLocalEmployeeStore();
    const now = new Date().toISOString();
    const applicants = store.applicants || [];
    const existingIndex = applicants.findIndex((applicant) => applicant.email === data.email && applicant.roleApplied === data.roleApplied);
    const nextId = existingIndex >= 0 ? applicants[existingIndex].id : Math.max(0, ...applicants.map((applicant) => applicant.id)) + 1;
    const applicant: LocalEmployeeApplicant = {
      id: nextId,
      ...data,
      createdAt: existingIndex >= 0 ? applicants[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) applicants[existingIndex] = applicant;
    else applicants.unshift(applicant);
    await writeLocalEmployeeStore({ ...store, applicants });
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function appointApplicantAsEmployee(input: {
  applicantId: string;
  department?: string;
  title?: string;
  workStartTime?: string;
  workEndTime?: string;
}) {
  try {
    const { session } = await requireEmployee();
    if (!(await employeeSessionCanAccessFeature(session, "employees"))) {
      return { success: false, error: "Only super admins/admins can appoint employees." };
    }

    const applicant = await prisma.employeeApplicant.findUnique({ where: { id: Number(input.applicantId) } });
    if (!applicant) return { success: false, error: "Applicant not found." };

    const roles = await getEmployeeRoleDefinitionsFromDatabase();
    const role = roleKeyFromApplicantRole(applicant.roleApplied, roles);
    const existing = await prisma.employeeUser.findUnique({ where: { email: applicant.email.toLowerCase() } });
    if (existing) return { success: false, error: "An employee already exists with this email." };

    const employeeType = applicantEmployeeType(applicant.notes);
    const created = await prisma.employeeUser.create({
      data: {
        name: applicant.name,
        email: applicant.email.toLowerCase(),
        password: hashPassword(defaultEmployeePassword),
        role,
        department: input.department?.trim() || "General",
        title: input.title?.trim() || applicant.roleApplied || "Team Member",
        employeeType,
        compensationStatus: applicantCompensationStatus(applicant.notes),
        employmentStart: applicantStartDate(applicant.notes) || new Date(),
        workStartTime: input.workStartTime?.trim() || "09:00",
        workEndTime: input.workEndTime?.trim() || "18:00",
        status: "Active",
      },
    });

    await prisma.employeeApplicant.update({ where: { id: applicant.id }, data: { stage: "Appointed" } });
    await createEmployeeStarterDocuments({
      employeeId: created.id,
      employeeName: created.name,
      employeeType,
      uploadedBy: Number(session.userId),
    });
    await logEmployeeAudit({
      actorId: Number(session.userId),
      actorName: session.name,
      action: "applicant.appoint",
      entityType: "applicant",
      entityId: applicant.id.toString(),
      metadata: { employeeId: created.id, email: created.email, role },
    });
    revalidatePath("/employee/portal");
    return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const session = await getEmployeeSession();
    if (!session || !(await employeeSessionCanAccessFeature(session, "employees"))) {
      return { success: false, error: "Only super admins/admins can appoint employees." };
    }
    const store = await readLocalEmployeeStore();
    const applicants = store.applicants || [];
    const applicantIndex = applicants.findIndex((applicant) => applicant.id === Number(input.applicantId));
    const applicant = applicantIndex >= 0 ? applicants[applicantIndex] : null;
    if (!applicant) return { success: false, error: "Applicant not found." };
    if (store.users.some((user) => user.email === applicant.email.toLowerCase())) {
      return { success: false, error: "An employee already exists with this email." };
    }
    const now = new Date().toISOString();
    const roles = mergeRoleDefinitions(store.roles);
    const nextId = Math.max(0, ...store.users.map((employee) => employee.id)) + 1;
    const employee: LocalEmployeeUser = {
      id: nextId,
      name: applicant.name,
      email: applicant.email.toLowerCase(),
      password: hashPassword(defaultEmployeePassword),
      role: roleKeyFromApplicantRole(applicant.roleApplied, roles),
      department: input.department?.trim() || "General",
      departmentId: null,
      managerId: null,
      title: input.title?.trim() || applicant.roleApplied || "Team Member",
      employeeType: applicantEmployeeType(applicant.notes),
      compensationStatus: applicantCompensationStatus(applicant.notes),
      employmentStart: applicantStartDate(applicant.notes)?.toISOString() || now,
      employmentEnd: null,
      workStartTime: input.workStartTime?.trim() || "09:00",
      workEndTime: input.workEndTime?.trim() || "18:00",
      status: "Active",
      lastLogin: null,
      lastSeenAt: null,
      createdAt: now,
      updatedAt: now,
    };
    applicants[applicantIndex] = { ...applicant, stage: "Appointed", updatedAt: now };
    await writeLocalEmployeeStore({ ...store, users: [employee, ...store.users], applicants });
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function changeEmployeePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const session = await getEmployeeSession();
  if (!session) return { success: false, error: "Please log in again to change your password." };
  const newPassword = input.newPassword?.trim() || "";
  if (newPassword.length < 8) return { success: false, error: "Use at least 8 characters for the new password." };
  if (newPassword !== input.confirmPassword) return { success: false, error: "New password and confirmation do not match." };
  if (newPassword === defaultEmployeePassword) return { success: false, error: "Choose a password different from the default password." };

  try {
    const user = await prisma.employeeUser.findUnique({ where: { id: Number(session.userId) } });
    if (!user || !verifyPassword(input.currentPassword, user.password)) {
      return { success: false, error: "Current password is incorrect." };
    }
    await prisma.employeeUser.update({ where: { id: user.id }, data: { password: hashPassword(newPassword) } });
    revalidatePath("/employee/portal");
    return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const store = await readLocalEmployeeStore();
    const userIndex = store.users.findIndex((user) => user.id === Number(session.userId));
    const user = userIndex >= 0 ? store.users[userIndex] : null;
    if (!user || !verifyPassword(input.currentPassword, user.password)) {
      return { success: false, error: "Current password is incorrect." };
    }
    store.users[userIndex] = { ...user, password: hashPassword(newPassword), updatedAt: new Date().toISOString() };
    await writeLocalEmployeeStore(store);
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function saveMeeting(input: {
  id?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  meetUrl?: string;
  audienceRoles: string;
  applicantName?: string;
  applicantEmail?: string;
  notes?: string;
}) {
  const { session } = await requireEmployee();
  const roleDefinitions = await getEmployeeRoleDefinitionsFromDatabase();
  if (!capabilitiesForRole(session.role, roleDefinitions).canScheduleMeetings) {
    return { success: false, error: "Only super admin/admin can schedule meetings." };
  }
  const { id, ...rest } = input;
  const data = {
    ...rest,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    createdBy: Number(session.userId),
  };
  if (id) await prisma.employeeMeeting.update({ where: { id: Number(id) }, data });
  else await prisma.employeeMeeting.create({ data });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveResource(input: {
  id?: string;
  title: string;
  resourceType: string;
  url: string;
  description?: string;
  audienceRoles: string;
  tags?: string;
}) {
  const { session } = await requireEmployee();
  const roleDefinitions = await getEmployeeRoleDefinitionsFromDatabase();
  if (!capabilitiesForRole(session.role, roleDefinitions).canManageResources) {
    return { success: false, error: "Only super admin/admin can publish resources." };
  }
  const { id, ...rest } = input;
  const data = { ...rest, createdBy: Number(session.userId) };
  if (id) await prisma.employeeResource.update({ where: { id: Number(id) }, data });
  else await prisma.employeeResource.create({ data });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveAttendance(input: {
  employeeId: string;
  workDate: string;
  loginAt?: string;
  logoutAt?: string;
  totalHours?: string;
  status: string;
  notes?: string;
}) {
  const { session } = await requireEmployee();
  if (!(await employeeSessionCanAccessFeature(session, "ops"))) {
    return { success: false, error: "Only HR/admin roles can manage attendance." };
  }
  const employeeId = Number(input.employeeId);
  await prisma.employeeAttendance.create({
    data: {
      employeeId,
      employeeName: await employeeNameForId(employeeId),
      workDate: optionalDate(input.workDate) || new Date(),
      loginAt: optionalDateTime(input.loginAt),
      logoutAt: optionalDateTime(input.logoutAt),
      totalHours: numberValue(input.totalHours),
      status: input.status || "Present",
      notes: input.notes,
    },
  });
  await logEmployeeAudit({
    actorId: Number(session.userId),
    actorName: session.name,
    action: "attendance.create",
    entityType: "attendance",
    metadata: { employeeId, status: input.status },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function clockInEmployee() {
  const { session, user } = await requireEmployee();
  const now = new Date();
  const startOfDay = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const openSession = await prisma.employeeAttendance.findFirst({
    where: {
      employeeId: user.id,
      workDate: { gte: startOfDay, lte: endOfDay },
      loginAt: { not: null },
      logoutAt: null,
    },
    orderBy: { loginAt: "desc" },
  });

  if (openSession) {
    return { success: false, error: "You are already checked in. Check out before starting another session." };
  }

  const created = await prisma.employeeAttendance.create({
    data: {
      employeeId: user.id,
      employeeName: user.name,
      workDate: startOfDay,
      loginAt: now,
      status: "Present",
      notes: "Work session started from portal.",
    },
  });

  await prisma.employeeUser.update({ where: { id: user.id }, data: { lastSeenAt: now } });
  await logEmployeeAudit({ actorId: user.id, actorName: session.name, action: "attendance.clock_in", entityType: "attendance", entityId: created.id.toString() });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function clockOutEmployee() {
  const { session, user } = await requireEmployee();
  const now = new Date();
  const startOfDay = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const openSession = await prisma.employeeAttendance.findFirst({
    where: {
      employeeId: user.id,
      workDate: { gte: startOfDay, lte: endOfDay },
      loginAt: { not: null },
      logoutAt: null,
    },
    orderBy: { loginAt: "desc" },
  });

  if (!openSession?.loginAt) {
    return { success: false, error: "Clock in before clocking out." };
  }

  const totalHours = Math.max(0, (now.getTime() - openSession.loginAt.getTime()) / (1000 * 60 * 60));
  const expectedHours = scheduledWorkHours(user.workStartTime, user.workEndTime);
  const status = expectedHours > 0 && totalHours >= expectedHours / 2 ? "Present" : "Half-day";
  await prisma.employeeAttendance.update({
    where: { id: openSession.id },
    data: {
      logoutAt: now,
      totalHours: Number(totalHours.toFixed(2)),
      status,
      notes: `Auto-marked ${status}. Worked ${totalHours.toFixed(2)} of ${expectedHours.toFixed(2)} scheduled hours.`,
    },
  });
  await prisma.employeeUser.update({ where: { id: user.id }, data: { lastSeenAt: now } });
  await logEmployeeAudit({ actorId: user.id, actorName: session.name, action: "attendance.clock_out", entityType: "attendance", entityId: openSession.id.toString() });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveLeaveRequest(input: {
  employeeId?: string;
  leaveType: string;
  startsAt: string;
  endsAt: string;
  status?: string;
  reason?: string;
}) {
  const { session, user } = await requireEmployee();
  const canManage = await employeeSessionCanAccessFeature(session, "ops");
  const employeeId = canManage && input.employeeId ? Number(input.employeeId) : user.id;
  await prisma.employeeLeaveRequest.create({
    data: {
      employeeId,
      employeeName: await employeeNameForId(employeeId),
      leaveType: input.leaveType || "Casual",
      startsAt: optionalDate(input.startsAt) || new Date(),
      endsAt: optionalDate(input.endsAt) || new Date(),
      status: canManage ? input.status || "Pending" : "Pending",
      reason: input.reason,
      reviewedBy: canManage ? Number(session.userId) : null,
    },
  });
  await logEmployeeAudit({
    actorId: Number(session.userId),
    actorName: session.name,
    action: "leave.create",
    entityType: "leave",
    metadata: { employeeId, status: canManage ? input.status || "Pending" : "Pending" },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveTask(input: {
  id?: string;
  title: string;
  assignedTo?: string;
  ownerRole: string;
  priority: string;
  status: string;
  dueAt?: string;
  proofUrl?: string;
  description?: string;
}) {
  const { session } = await requireEmployee();
  if (!(await employeeSessionCanAccessFeature(session, "ops"))) {
    return { success: false, error: "You do not have permission to create tasks." };
  }
  const assignedTo = input.assignedTo ? Number(input.assignedTo) : null;
  const data = {
    title: input.title,
    assignedTo,
    assignedName: assignedTo ? await employeeNameForId(assignedTo) : null,
    ownerRole: input.ownerRole || "all",
    priority: input.priority || "Medium",
    status: input.status || "Open",
    dueAt: optionalDateTime(input.dueAt),
    proofUrl: input.proofUrl,
    description: input.description,
    createdBy: Number(session.userId),
  };
  if (input.id) await prisma.employeeTask.update({ where: { id: Number(input.id) }, data });
  else await prisma.employeeTask.create({ data });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "task.create", entityType: "task", metadata: { title: input.title } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function savePayrollInput(input: {
  id?: string;
  employeeId: string;
  payPeriod: string;
  payType: string;
  amount?: string;
  workingDays?: string;
  unpaidLeaveDays?: string;
  bonus?: string;
  deductions?: string;
  status: string;
  notes?: string;
}) {
  const { session } = await requireEmployee();
  if (!(await employeeSessionCanAccessFeature(session, "payroll"))) {
    return { success: false, error: "Only HR/admin roles can manage payroll inputs." };
  }
  const employeeId = Number(input.employeeId);
  const data = {
    employeeId,
    employeeName: await employeeNameForId(employeeId),
    payPeriod: input.payPeriod,
    payType: input.payType || "Salary",
    amount: numberValue(input.amount),
    workingDays: numberValue(input.workingDays),
    unpaidLeaveDays: numberValue(input.unpaidLeaveDays),
    bonus: numberValue(input.bonus),
    deductions: numberValue(input.deductions),
    status: input.status || "Draft",
    notes: input.notes,
  };
  if (input.id) await prisma.employeePayrollInput.update({ where: { id: Number(input.id) }, data });
  else await prisma.employeePayrollInput.create({ data });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "payroll.create", entityType: "payroll", metadata: { employeeId, payPeriod: input.payPeriod } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function savePerformanceReview(input: {
  id?: string;
  employeeId: string;
  reviewPeriod: string;
  score?: string;
  kpiSummary?: string;
  strengths?: string;
  improvements?: string;
  status: string;
}) {
  const { session } = await requireEmployee();
  if (!(await employeeSessionCanAccessFeature(session, "reviews"))) {
    return { success: false, error: "Only HR/admin roles can manage reviews." };
  }
  const employeeId = Number(input.employeeId);
  const data = {
    employeeId,
    employeeName: await employeeNameForId(employeeId),
    reviewPeriod: input.reviewPeriod,
    reviewerId: Number(session.userId),
    score: numberValue(input.score),
    kpiSummary: input.kpiSummary,
    strengths: input.strengths,
    improvements: input.improvements,
    status: input.status || "Draft",
  };
  if (input.id) await prisma.employeePerformanceReview.update({ where: { id: Number(input.id) }, data });
  else await prisma.employeePerformanceReview.create({ data });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "review.create", entityType: "review", metadata: { employeeId, reviewPeriod: input.reviewPeriod } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveEmployeeDocument(input: {
  id?: string;
  employeeId?: string;
  title: string;
  documentType: string;
  url?: string;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  visibilityRoles: string;
  notes?: string;
}) {
  const { session } = await requireEmployee();
  const roleDefinitions = await getEmployeeRoleDefinitionsFromDatabase();
  if (!capabilitiesForRole(session.role, roleDefinitions).canManageDocuments) {
    return { success: false, error: "Only admin/HR/operations can manage documents." };
  }
  const employeeId = input.employeeId ? Number(input.employeeId) : null;
  if (!input.url?.trim()) {
    return { success: false, error: "Upload a file or provide a document URL." };
  }
  const data = {
    employeeId,
    employeeName: employeeId ? await employeeNameForId(employeeId) : null,
    title: input.title,
    documentType: input.documentType || "General",
    url: input.url,
    fileName: input.fileName,
    fileSize: input.fileSize ? Number(input.fileSize) : null,
    mimeType: input.mimeType,
    visibilityRoles: input.visibilityRoles || "super_admin,director,authorized_signatory,admin,hr",
    notes: input.notes?.includes("Approval status:")
      ? input.notes
      : `${documentApprovalPending}${input.notes?.trim() ? `\n${input.notes.trim()}` : ""}`,
    uploadedBy: Number(session.userId),
  };
  if (input.id) await prisma.employeeDocument.update({ where: { id: Number(input.id) }, data });
  else await prisma.employeeDocument.create({ data });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function approveEmployeeDocument(input: { id: string }) {
  const { session } = await requireEmployee();
  if (!(await employeeSessionCanAccessFeature(session, "sign_documents"))) {
    return { success: false, error: "Only Director or Director / Authorized Signatory roles can approve documents." };
  }
  const document = await prisma.employeeDocument.findUnique({ where: { id: Number(input.id) } });
  if (!document) return { success: false, error: "Document not found." };
  await prisma.employeeDocument.update({
    where: { id: document.id },
    data: {
      notes: documentApprovalNotes(document.notes, session.name),
      visibilityRoles: document.employeeId
        ? "super_admin,director,authorized_signatory,admin,hr"
        : document.visibilityRoles,
    },
  });
  await logEmployeeAudit({
    actorId: Number(session.userId),
    actorName: session.name,
    action: "document.approve",
    entityType: "document",
    entityId: input.id,
    metadata: { title: document.title, employeeId: document.employeeId },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveAnnouncement(input: {
  id?: string;
  title: string;
  body: string;
  audienceRoles: string;
  priority: string;
}) {
  const { session } = await requireEmployee();
  const roleDefinitions = await getEmployeeRoleDefinitionsFromDatabase();
  if (!capabilitiesForRole(session.role, roleDefinitions).canPublishAnnouncements) {
    return { success: false, error: "Only super admin/admin can publish announcements." };
  }
  const data = {
    title: input.title,
    body: input.body,
    audienceRoles: input.audienceRoles || "all",
    priority: input.priority || "Normal",
    publishedBy: Number(session.userId),
  };
  if (input.id) await prisma.employeeAnnouncement.update({ where: { id: Number(input.id) }, data });
  else {
    await prisma.employeeAnnouncement.create({ data });
    await prisma.employeeNotification.create({
      data: {
        targetRoles: input.audienceRoles || "all",
        title: input.title,
        body: input.body,
        createdBy: Number(session.userId),
      },
    });
  }
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveGroupChatMessage(input: { body: string }) {
  const { session, user } = await requireEmployee();
  const body = input.body?.trim();
  if (!body) return { success: false, error: "Type a message before sending." };
  if (body.length > 1000) return { success: false, error: "Keep chat messages under 1000 characters." };

  await ensureEmployeeChatTable();
  await prisma.$executeRaw`
    INSERT INTO "EmployeeChatMessage" ("employeeId", "employeeName", "employeeRole", "body")
    VALUES (${user.id}, ${session.name}, ${session.role}, ${body})
  `;
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveExpenseClaim(input: {
  id?: string;
  employeeId?: string;
  category: string;
  amount?: string;
  claimDate: string;
  receiptUrl?: string;
  status?: string;
  notes?: string;
}) {
  const { session, user } = await requireEmployee();
  const roleDefinitions = await getEmployeeRoleDefinitionsFromDatabase();
  const capabilities = capabilitiesForRole(session.role, roleDefinitions);
  const canManageClaims = capabilities.canUseSuperiorDashboard && capabilities.canManageExpenses;
  const employeeId = canManageClaims && input.employeeId ? Number(input.employeeId) : user.id;
  if (input.id && !canManageClaims) {
    const existing = await prisma.employeeExpenseClaim.findUnique({ where: { id: Number(input.id) } });
    if (!existing || existing.employeeId !== user.id) {
      return { success: false, error: "You can only edit your own expense claims." };
    }
    if (existing.status !== "Pending") {
      return { success: false, error: "Approved or rejected claims cannot be edited by employees." };
    }
  }
  const data = {
    employeeId,
    employeeName: await employeeNameForId(employeeId),
    category: input.category || "General",
    amount: numberValue(input.amount),
    claimDate: optionalDate(input.claimDate) || new Date(),
    receiptUrl: input.receiptUrl,
    status: canManageClaims ? input.status || "Pending" : "Pending",
    reviewerId: canManageClaims && input.status && input.status !== "Pending" ? Number(session.userId) : null,
    notes: input.notes,
  };
  if (input.id) await prisma.employeeExpenseClaim.update({ where: { id: Number(input.id) }, data });
  else await prisma.employeeExpenseClaim.create({ data });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "expense.create", entityType: "expense", metadata: { employeeId, amount: input.amount } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveDepartment(input: {
  id?: string;
  name: string;
  managerId?: string;
  description?: string;
  active?: string;
}) {
  const { session } = await requireEmployee();
  if (!(await employeeSessionCanAccessFeature(session, "employees"))) {
    return { success: false, error: "Only HR/admin roles can manage departments." };
  }
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Department name is required." };
  }
  const data = {
    name,
    managerId: input.managerId ? Number(input.managerId) : null,
    description: input.description,
    active: input.active !== "Inactive",
  };
  if (input.id) {
    await prisma.employeeDepartment.update({
      where: { id: Number(input.id) },
      data,
    });
  } else {
    await prisma.employeeDepartment.upsert({
      where: { name },
      update: {
        managerId: data.managerId,
        description: data.description,
        active: data.active,
      },
      create: data,
    });
  }
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "department.upsert", entityType: "department", entityId: input.id || name });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function updateEmployeeRecordStatus(input: {
  entityType: string;
  id: string;
  status: string;
}) {
  const feature: EmployeePortalFeature =
    input.entityType === "applicant" ? "applicants" :
    input.entityType === "payroll" ? "payroll" :
    input.entityType === "expense" ? "expenses" :
    "ops";
  try {
    const { session } = await requireEmployee();
    if (!(await employeeSessionCanAccessFeature(session, feature))) {
      return { success: false, error: "You do not have permission to approve records." };
    }
    const id = Number(input.id);
    const data = { status: input.status };
    if (input.entityType === "leave") await prisma.employeeLeaveRequest.update({ where: { id }, data: { ...data, reviewedBy: Number(session.userId) } });
    else if (input.entityType === "expense") await prisma.employeeExpenseClaim.update({ where: { id }, data: { ...data, reviewerId: Number(session.userId) } });
    else if (input.entityType === "payroll") await prisma.employeePayrollInput.update({ where: { id }, data });
    else if (input.entityType === "task") await prisma.employeeTask.update({ where: { id }, data });
    else if (input.entityType === "applicant") await prisma.employeeApplicant.update({ where: { id }, data: { stage: input.status } });
    else return { success: false, error: "Unsupported record type." };
    await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: `${input.entityType}.status`, entityType: input.entityType, entityId: input.id, metadata: { status: input.status } });
    revalidatePath("/employee/portal");
    return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error) || input.entityType !== "applicant") throw error;
    const session = await getEmployeeSession();
    if (!session || !(await employeeSessionCanAccessFeature(session, feature))) {
      return { success: false, error: "You do not have permission to approve records." };
    }
    const store = await readLocalEmployeeStore();
    const applicants = (store.applicants || []).map((applicant) => (
      applicant.id === Number(input.id) ? { ...applicant, stage: input.status, updatedAt: new Date().toISOString() } : applicant
    ));
    await writeLocalEmployeeStore({ ...store, applicants });
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function markNotificationRead(input: { id: string }) {
  const { user } = await requireEmployee();
  await prisma.employeeNotification.update({
    where: { id: Number(input.id) },
    data: { readAt: new Date() },
  });
  await prisma.employeeUser.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function updateCrmSheetRowData(input: {
  rowId: string;
  data: Record<string, string>;
}) {
  const { session } = await requireEmployee();
  if (session.role !== "super_admin") {
    return { success: false, error: "Only super admin can edit CRM sheet cells." };
  }
  const row = await prisma.employeeCrmSheetRow.findUnique({ where: { id: Number(input.rowId) }, include: { sheet: true } });
  if (!row) return { success: false, error: "Row not found." };
  
  if (row.sheet.locked) {
    return { success: false, error: "Sheet is locked." };
  }

  await prisma.employeeCrmSheetRow.update({
    where: { id: Number(input.rowId) },
    data: { data: input.data },
  });
  await prisma.employeeCrmSheet.update({ where: { id: row.sheetId }, data: { updatedAt: new Date() } });
  return { success: true };
}

export async function deleteEmployeeEntity(input: {
  entityType: string;
  id: string;
}) {
  try {
    const { session } = await requireEmployee();
    if (["crm", "crmSheet"].includes(input.entityType) && session.role !== "super_admin") {
      return { success: false, error: "Only super admin can delete CRM records." };
    }
    if (input.entityType === "resource" && !capabilitiesForRole(session.role, await getEmployeeRoleDefinitionsFromDatabase()).canManageResources) {
      return { success: false, error: "Only mapped resource managers can delete resources." };
    }
    if (input.entityType === "announcement" && !capabilitiesForRole(session.role, await getEmployeeRoleDefinitionsFromDatabase()).canPublishAnnouncements) {
      return { success: false, error: "Only mapped announcement publishers can delete announcements." };
    }
    if (input.entityType === "meeting" && !capabilitiesForRole(session.role, await getEmployeeRoleDefinitionsFromDatabase()).canScheduleMeetings) {
      return { success: false, error: "Only mapped meeting schedulers can delete meetings." };
    }
    const deleteFeature: EmployeePortalFeature =
      ["employee", "department"].includes(input.entityType) ? "employees" :
      input.entityType === "applicant" ? "applicants" :
      input.entityType === "payroll" ? "payroll" :
      input.entityType === "review" ? "reviews" :
      input.entityType === "document" ? "documents" :
      input.entityType === "resource" ? "resources" :
      input.entityType === "announcement" ? "announcements" :
      input.entityType === "meeting" ? "meetings" :
      input.entityType === "expense" ? "expenses" :
      "ops";
    if (!(await employeeSessionCanAccessFeature(session, deleteFeature))) {
      return { success: false, error: "Only HR/admin roles can delete records." };
    }
    const id = Number(input.id);
    if (input.entityType === "task") await prisma.employeeTask.delete({ where: { id } });
    else if (input.entityType === "document") await prisma.employeeDocument.delete({ where: { id } });
    else if (input.entityType === "resource") await prisma.employeeResource.delete({ where: { id } });
    else if (input.entityType === "crm") await prisma.employeeCrmRecord.delete({ where: { id } });
    else if (input.entityType === "crmSheet") await prisma.employeeCrmSheet.delete({ where: { id } });
    else if (input.entityType === "announcement") await prisma.employeeAnnouncement.delete({ where: { id } });
    else if (input.entityType === "expense") await prisma.employeeExpenseClaim.delete({ where: { id } });
    else if (input.entityType === "employee") await prisma.employeeUser.delete({ where: { id } });
    else if (input.entityType === "applicant") await prisma.employeeApplicant.delete({ where: { id } });
    else if (input.entityType === "meeting") await prisma.employeeMeeting.delete({ where: { id } });
    else if (input.entityType === "payroll") await prisma.employeePayrollInput.delete({ where: { id } });
    else if (input.entityType === "review") await prisma.employeePerformanceReview.delete({ where: { id } });
    else if (input.entityType === "leave") await prisma.employeeLeaveRequest.delete({ where: { id } });
    else if (input.entityType === "attendance") await prisma.employeeAttendance.delete({ where: { id } });
    else if (input.entityType === "department") await prisma.employeeDepartment.delete({ where: { id } });
    else return { success: false, error: "Unsupported delete type." };
    await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: `${input.entityType}.delete`, entityType: input.entityType, entityId: input.id });
    revalidatePath("/employee/portal");
    return { success: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const session = await getEmployeeSession();
    if (!session || !(await employeeSessionCanAccessFeature(session, "employees"))) {
      return { success: false, error: "Only HR/admin roles can delete records." };
    }
    const store = await readLocalEmployeeStore();
    if (input.entityType === "employee") {
      await writeLocalEmployeeStore({ ...store, users: store.users.filter((user) => user.id !== Number(input.id)) });
    } else if (input.entityType === "applicant") {
      await writeLocalEmployeeStore({ ...store, applicants: (store.applicants || []).filter((applicant) => applicant.id !== Number(input.id)) });
    } else {
      return { success: false, error: "This local fallback record cannot be deleted yet." };
    }
    revalidatePath("/employee/portal");
    return { success: true };
  }
}

export async function saveEmployeeComment(input: {
  entityType: string;
  entityId: string;
  body: string;
}) {
  const { session } = await requireEmployee();
  await prisma.employeeComment.create({
    data: {
      entityType: input.entityType,
      entityId: Number(input.entityId),
      body: input.body,
      authorId: Number(session.userId),
      authorName: session.name,
    },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}
