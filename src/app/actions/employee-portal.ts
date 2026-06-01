"use server";

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
import { EMPLOYEE_ROLES, type EmployeeRole } from "@/lib/employee/roles";

function normalizeRole(role: string): EmployeeRole {
  return EMPLOYEE_ROLES.includes(role as EmployeeRole) ? (role as EmployeeRole) : "employee";
}

function parseRoles(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function visibleToRole(audienceRoles: string, role: string): boolean {
  const roles = parseRoles(audienceRoles);
  return roles.includes("all") || roles.includes(role) || role === "super_admin";
}

function optionalDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  return new Date(`${value}T00:00:00`);
}

function optionalDateTime(value?: string): Date | null {
  if (!value?.trim()) return null;
  return new Date(value);
}

function numberValue(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  if (digits.length === 10 && digits.startsWith("11")) return `011-${digits.slice(2, 6)} ${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("0")) return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    const national = digits.slice(2);
    if (national.startsWith("11")) return `+91 11 ${national.slice(2, 6)} ${national.slice(6)}`;
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return trimmed;
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
  const bootstrapPassword = process.env.EMPLOYEE_BOOTSTRAP_PASSWORD || "Pareek@Schools24";

  if (email !== bootstrapEmail || password !== bootstrapPassword) return;

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
  try {
    const email = input.email.trim().toLowerCase();
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
    console.error("Employee login failed", error);
    return { success: false, error: friendlyEmployeeError(error, "Login failed. Please try again.") };
  }
}

export async function logoutEmployee() {
  await clearEmployeeSession();
  return { success: true };
}

export async function getEmployeePortalData(sortResources = "newest", activeTab = "dashboard") {
  const { session, user } = await requireEmployee();
  const canManage = hasEmployeeRole(session, ["admin", "hr"]);
  const canUseCrm = hasEmployeeRole(session, ["sales", "content"]);
  const canEditCrm = session.role === "super_admin";
  const canManagePayroll = hasEmployeeRole(session, ["admin", "hr"]);
  const now = new Date();

  await prisma.employeeUser.update({
    where: { id: user.id },
    data: { lastSeenAt: now },
  });

  const [users, crmRecords, crmSheets, applicants, meetings, resources, attendance, leaveRequests, tasks, payrollInputs, reviews, documents, announcements, comments, departments, notifications, expenses, auditEvents] = await Promise.all([
    canManage && ["dashboard", "admin", "ops"].includes(activeTab)
      ? prisma.employeeUser.findMany({ orderBy: { createdAt: "desc" } })
      : prisma.employeeUser.findMany({ where: { id: user.id } }),
    canUseCrm && ["dashboard", "crm"].includes(activeTab)
      ? prisma.employeeCrmRecord.findMany({ orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] })
      : Promise.resolve([]),
    activeTab === "crm"
      ? prisma.employeeCrmSheet.findMany({
          where: canManage
            ? {}
            : {
              OR: [
                { requestedBy: user.id },
                { status: "Approved", audienceRoles: "all" },
                { status: "Approved", audienceRoles: session.role },
                { status: "Approved", ownerRole: session.role },
              ],
            },
          include: { rows: { orderBy: { rowNumber: "asc" }, take: 300 } },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: 30,
        })
      : Promise.resolve([]),
    hasEmployeeRole(session, ["admin", "hr"]) && activeTab === "applicants"
      ? prisma.employeeApplicant.findMany({ orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    ["dashboard", "meetings"].includes(activeTab)
      ? prisma.employeeMeeting.findMany({ orderBy: { startsAt: "asc" } })
      : Promise.resolve([]),
    ["dashboard", "resources"].includes(activeTab)
      ? prisma.employeeResource.findMany({
          orderBy:
            sortResources === "title"
              ? { title: "asc" }
              : sortResources === "type"
                ? { resourceType: "asc" }
              : { createdAt: "desc" },
        })
      : Promise.resolve([]),
    ["dashboard", "ops"].includes(activeTab)
      ? (canManage
        ? prisma.employeeAttendance.findMany({ orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], take: 500 })
        : prisma.employeeAttendance.findMany({ where: { employeeId: user.id }, orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], take: 120 }))
      : Promise.resolve([]),
    activeTab === "ops"
      ? (canManage
        ? prisma.employeeLeaveRequest.findMany({ orderBy: [{ updatedAt: "desc" }, { startsAt: "desc" }], take: 80 })
        : prisma.employeeLeaveRequest.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }, { startsAt: "desc" }], take: 40 }))
      : Promise.resolve([]),
    ["dashboard", "ops"].includes(activeTab)
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
    activeTab === "payroll"
      ? (canManagePayroll
        ? prisma.employeePayrollInput.findMany({ orderBy: [{ updatedAt: "desc" }], take: 80 })
        : prisma.employeePayrollInput.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }], take: 24 }))
      : Promise.resolve([]),
    activeTab === "reviews"
      ? (canManage
        ? prisma.employeePerformanceReview.findMany({ orderBy: [{ updatedAt: "desc" }], take: 80 })
        : prisma.employeePerformanceReview.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }], take: 24 }))
      : Promise.resolve([]),
    ["dashboard", "documents"].includes(activeTab)
      ? prisma.employeeDocument.findMany({ orderBy: [{ updatedAt: "desc" }], take: 100 })
      : Promise.resolve([]),
    ["dashboard", "announcements"].includes(activeTab)
      ? prisma.employeeAnnouncement.findMany({ orderBy: [{ createdAt: "desc" }], take: 40 })
      : Promise.resolve([]),
    activeTab === "ops"
      ? prisma.employeeComment.findMany({ orderBy: { createdAt: "desc" }, take: 120 })
      : Promise.resolve([]),
    activeTab === "admin" && canManage ? prisma.employeeDepartment.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    ["dashboard", "admin"].includes(activeTab)
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
    activeTab === "expenses"
      ? (canManage
        ? prisma.employeeExpenseClaim.findMany({ orderBy: [{ updatedAt: "desc" }], take: 80 })
        : prisma.employeeExpenseClaim.findMany({ where: { employeeId: user.id }, orderBy: [{ updatedAt: "desc" }], take: 40 }))
      : Promise.resolve([]),
    activeTab === "admin" && canManage ? prisma.employeeAuditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) : Promise.resolve([]),
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

  return {
    session,
    capabilities: {
      canManage,
      canUseCrm,
      canRequestCrmSource: canEditCrm,
      canUpdateCrmSheetRows: canEditCrm,
      canManageCrmSheets: canEditCrm,
      canManageApplicants: hasEmployeeRole(session, ["admin", "hr"]),
      canManageResources: hasEmployeeRole(session, ["admin", "hr", "operations", "content"]),
      canScheduleMeetings: hasEmployeeRole(session, ["admin", "hr", "sales"]),
      canManageOps: canManage,
      canManagePayroll,
      canReviewPerformance: canManage,
      canPublishAnnouncements: hasEmployeeRole(session, ["admin", "hr", "operations"]),
    },
    users: users.map(({ password, ...employee }) => ({
      ...employee,
      isOnline: employee.lastSeenAt ? now.getTime() - employee.lastSeenAt.getTime() <= 5 * 60 * 1000 : false,
      isWithinWorkHours: isWithinWorkHours(employee.workStartTime, employee.workEndTime, now),
      durationLabel: employeeDurationLabel(employee.employmentStart, employee.employmentEnd),
    })),
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
    documents: documents.filter((document) => visibleToRole(document.visibilityRoles, session.role) || document.employeeId === user.id),
    announcements: announcements.filter((announcement) => visibleToRole(announcement.audienceRoles, session.role)),
    comments,
    departments,
    notifications,
    expenses,
    auditEvents,
  };
}

export async function saveEmployeeUser(input: {
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
  const { session } = await requireEmployee();
  if (!hasEmployeeRole(session, ["admin", "hr"])) {
    return { success: false, error: "Only super admins/admins can manage employee mappings." };
  }

  const email = input.email.trim().toLowerCase();
  const existing = await prisma.employeeUser.findUnique({ where: { email } });
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
    if (!input.password?.trim()) return { success: false, error: "Password is required for new employees." };
    const created = await prisma.employeeUser.create({ data: { ...data, password: hashPassword(input.password) } });
    employeeId = created.id;

    const letterType = data.employeeType === "Intern" ? "Internship Offer Letter" : "Offer Letter";
    const letterUrl = `/api/employee/letter?employeeId=${created.id}&type=${encodeURIComponent(letterType)}`;
    await prisma.employeeDocument.create({
      data: {
        employeeId: created.id,
        employeeName: created.name,
        title: letterType,
        documentType: letterType,
        url: letterUrl,
        visibilityRoles: "super_admin,admin,hr",
        notes: "Auto-generated when the employee account was created.",
        uploadedBy: Number(session.userId),
      },
    });
    await prisma.employeeNotification.create({
      data: {
        employeeId: created.id,
        title: letterType,
        body: `Your ${letterType.toLowerCase()} is available in the Documents section.`,
        createdBy: Number(session.userId),
      },
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
}

export async function saveCrmRecord(input: {
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

  await prisma.employeeCrmRecord.create({
    data: {
      ...input,
      leadRating: input.leadRating || "Warm",
      estimatedValue: numberValue(input.estimatedValue),
      reminderAt: optionalDateTime(input.reminderAt),
    },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveCrmSheetRequest(input: {
  title: string;
  sourceName?: string;
  ownerRole: string;
  audienceRoles?: string;
  description?: string;
  pasteData?: string;
}) {
  const { session, user } = await requireEmployee();
  if (session.role !== "super_admin") {
    return { success: false, error: "Only super admin can create CRM sheets." };
  }
  const parsed = parseSheetText(input.pasteData);
  const sheet = await prisma.employeeCrmSheet.create({
    data: {
      title: input.title.trim(),
      sourceName: input.sourceName?.trim() || "Pasted or CSV source",
      sourceType: "Pasted sheet",
      ownerRole: normalizeRole(input.ownerRole),
      audienceRoles: input.audienceRoles?.trim() || input.ownerRole || "sales",
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
  const { session } = await requireEmployee();
  if (session.role !== "super_admin") {
    return { success: false, error: "Only super admin can mark CRM sheet rows." };
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
  name: string;
  email: string;
  phone?: string;
  roleApplied: string;
  stage: string;
  source: string;
  meetUrl?: string;
  notes?: string;
}) {
  const { session } = await requireEmployee();
  if (!hasEmployeeRole(session, ["admin", "hr"])) {
    return { success: false, error: "Only HR/admin roles can manage applicants." };
  }
  await prisma.employeeApplicant.create({ data: input });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveMeeting(input: {
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
  if (!hasEmployeeRole(session, ["admin", "hr", "sales"])) {
    return { success: false, error: "Only super admin/admin, HR, or sales can schedule meetings." };
  }
  await prisma.employeeMeeting.create({
    data: {
      ...input,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      createdBy: Number(session.userId),
    },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveResource(input: {
  title: string;
  resourceType: string;
  url: string;
  description?: string;
  audienceRoles: string;
  tags?: string;
}) {
  const { session } = await requireEmployee();
  if (!hasEmployeeRole(session, ["admin", "hr", "operations", "content"])) {
    return { success: false, error: "You do not have permission to publish resources." };
  }
  await prisma.employeeResource.create({
    data: {
      ...input,
      createdBy: Number(session.userId),
    },
  });
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
  if (!hasEmployeeRole(session, ["admin", "hr"])) {
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
  await prisma.employeeAttendance.update({
    where: { id: openSession.id },
    data: { logoutAt: now, totalHours: Number(totalHours.toFixed(2)) },
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
  const canManage = hasEmployeeRole(session, ["admin", "hr"]);
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
  if (!hasEmployeeRole(session, ["admin", "hr", "operations", "sales", "content"])) {
    return { success: false, error: "You do not have permission to create tasks." };
  }
  const assignedTo = input.assignedTo ? Number(input.assignedTo) : null;
  await prisma.employeeTask.create({
    data: {
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
    },
  });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "task.create", entityType: "task", metadata: { title: input.title } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function savePayrollInput(input: {
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
  if (!hasEmployeeRole(session, ["admin", "hr"])) {
    return { success: false, error: "Only HR/admin roles can manage payroll inputs." };
  }
  const employeeId = Number(input.employeeId);
  await prisma.employeePayrollInput.create({
    data: {
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
    },
  });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "payroll.create", entityType: "payroll", metadata: { employeeId, payPeriod: input.payPeriod } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function savePerformanceReview(input: {
  employeeId: string;
  reviewPeriod: string;
  score?: string;
  kpiSummary?: string;
  strengths?: string;
  improvements?: string;
  status: string;
}) {
  const { session } = await requireEmployee();
  if (!hasEmployeeRole(session, ["admin", "hr"])) {
    return { success: false, error: "Only HR/admin roles can manage reviews." };
  }
  const employeeId = Number(input.employeeId);
  await prisma.employeePerformanceReview.create({
    data: {
      employeeId,
      employeeName: await employeeNameForId(employeeId),
      reviewPeriod: input.reviewPeriod,
      reviewerId: Number(session.userId),
      score: numberValue(input.score),
      kpiSummary: input.kpiSummary,
      strengths: input.strengths,
      improvements: input.improvements,
      status: input.status || "Draft",
    },
  });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "review.create", entityType: "review", metadata: { employeeId, reviewPeriod: input.reviewPeriod } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveEmployeeDocument(input: {
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
  if (!hasEmployeeRole(session, ["admin", "hr", "operations"])) {
    return { success: false, error: "Only admin/HR/operations can manage documents." };
  }
  const employeeId = input.employeeId ? Number(input.employeeId) : null;
  if (!input.url?.trim()) {
    return { success: false, error: "Upload a file or provide a document URL." };
  }
  await prisma.employeeDocument.create({
    data: {
      employeeId,
      employeeName: employeeId ? await employeeNameForId(employeeId) : null,
      title: input.title,
      documentType: input.documentType || "General",
      url: input.url,
      fileName: input.fileName,
      fileSize: input.fileSize ? Number(input.fileSize) : null,
      mimeType: input.mimeType,
      visibilityRoles: input.visibilityRoles || "super_admin,admin,hr",
      notes: input.notes,
      uploadedBy: Number(session.userId),
    },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveAnnouncement(input: {
  title: string;
  body: string;
  audienceRoles: string;
  priority: string;
}) {
  const { session } = await requireEmployee();
  if (!hasEmployeeRole(session, ["admin", "hr", "operations"])) {
    return { success: false, error: "Only admin/HR/operations can publish announcements." };
  }
  await prisma.employeeAnnouncement.create({
    data: {
      title: input.title,
      body: input.body,
      audienceRoles: input.audienceRoles || "all",
      priority: input.priority || "Normal",
      publishedBy: Number(session.userId),
    },
  });
  await prisma.employeeNotification.create({
    data: {
      targetRoles: input.audienceRoles || "all",
      title: input.title,
      body: input.body,
      createdBy: Number(session.userId),
    },
  });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveExpenseClaim(input: {
  employeeId?: string;
  category: string;
  amount?: string;
  claimDate: string;
  receiptUrl?: string;
  status?: string;
  notes?: string;
}) {
  const { session, user } = await requireEmployee();
  const canManage = hasEmployeeRole(session, ["admin", "hr"]);
  const employeeId = canManage && input.employeeId ? Number(input.employeeId) : user.id;
  await prisma.employeeExpenseClaim.create({
    data: {
      employeeId,
      employeeName: await employeeNameForId(employeeId),
      category: input.category || "General",
      amount: numberValue(input.amount),
      claimDate: optionalDate(input.claimDate) || new Date(),
      receiptUrl: input.receiptUrl,
      status: canManage ? input.status || "Pending" : "Pending",
      reviewerId: canManage ? Number(session.userId) : null,
      notes: input.notes,
    },
  });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "expense.create", entityType: "expense", metadata: { employeeId, amount: input.amount } });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function saveDepartment(input: {
  name: string;
  managerId?: string;
  description?: string;
  active?: string;
}) {
  const { session } = await requireEmployee();
  if (!hasEmployeeRole(session, ["admin", "hr"])) {
    return { success: false, error: "Only HR/admin roles can manage departments." };
  }
  await prisma.employeeDepartment.upsert({
    where: { name: input.name.trim() },
    update: {
      managerId: input.managerId ? Number(input.managerId) : null,
      description: input.description,
      active: input.active !== "Inactive",
    },
    create: {
      name: input.name.trim(),
      managerId: input.managerId ? Number(input.managerId) : null,
      description: input.description,
      active: input.active !== "Inactive",
    },
  });
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: "department.upsert", entityType: "department", entityId: input.name });
  revalidatePath("/employee/portal");
  return { success: true };
}

export async function updateEmployeeRecordStatus(input: {
  entityType: string;
  id: string;
  status: string;
}) {
  const { session } = await requireEmployee();
  if (!hasEmployeeRole(session, ["admin", "hr", "operations"])) {
    return { success: false, error: "You do not have permission to approve records." };
  }
  const id = Number(input.id);
  const data = { status: input.status };
  if (input.entityType === "leave") await prisma.employeeLeaveRequest.update({ where: { id }, data: { ...data, reviewedBy: Number(session.userId) } });
  else if (input.entityType === "expense") await prisma.employeeExpenseClaim.update({ where: { id }, data: { ...data, reviewerId: Number(session.userId) } });
  else if (input.entityType === "payroll") await prisma.employeePayrollInput.update({ where: { id }, data });
  else if (input.entityType === "task") await prisma.employeeTask.update({ where: { id }, data });
  else return { success: false, error: "Unsupported record type." };
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: `${input.entityType}.status`, entityType: input.entityType, entityId: input.id, metadata: { status: input.status } });
  revalidatePath("/employee/portal");
  return { success: true };
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
  const { session } = await requireEmployee();
  if (["crm", "crmSheet"].includes(input.entityType) && session.role !== "super_admin") {
    return { success: false, error: "Only super admin can delete CRM records." };
  }
  if (!hasEmployeeRole(session, ["admin", "hr"])) {
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
  else return { success: false, error: "Unsupported delete type." };
  await logEmployeeAudit({ actorId: Number(session.userId), actorName: session.name, action: `${input.entityType}.delete`, entityType: input.entityType, entityId: input.id });
  revalidatePath("/employee/portal");
  return { success: true };
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
