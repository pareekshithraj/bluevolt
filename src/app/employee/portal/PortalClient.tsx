"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, ChevronRight, ClipboardList, Code2, FileText, Handshake, LogOut, Menu, Moon, PenLine, RefreshCw, RotateCw, Star, Sun, Target, UserCheck, Users, Video, WalletCards, X } from "lucide-react";
import {
  approveEmployeeDocument,
  changeEmployeePassword,
  clockInEmployee,
  clockOutEmployee,
  deleteEmployeeEntity,
  getEmployeePortalData,
  logoutEmployee,
  markNotificationRead,
  saveAnnouncement,
  saveAttendance,
  saveEmployeeDocument,
  saveEmployeeUser,
  saveExpenseClaim,
  saveLeaveRequest,
  saveMeeting,
  savePayrollInput,
  savePerformanceReview,
  saveResource,
  saveTask,
  updateCrmSheetRowData,
  updateEmployeeRecordStatus,
} from "@/app/actions/employee-portal";
import styles from "../portal.module.css";
import CrmTab from "@/components/portal/CrmTab";
import ApplicantsTab from "@/components/portal/ApplicantsTab";
import EmployeesTab from "@/components/portal/EmployeesTab";
import PrivilegesTab from "@/components/portal/PrivilegesTab";

type PortalData = Awaited<ReturnType<typeof getEmployeePortalData>>;
type PortalNotification = PortalData["notifications"][number];
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

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Users },
  { id: "crm", label: "CRM", icon: Handshake },
  { id: "applicants", label: "Applicants", icon: Users },
  { id: "ops", label: "Work Ops", icon: ClipboardList },
  { id: "expenses", label: "Expenses", icon: WalletCards },
  { id: "payroll", label: "Payroll", icon: WalletCards },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "profile", label: "Profile", icon: UserCheck },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "meetings", label: "Meetings", icon: Video },
  { id: "resources", label: "Resources", icon: FileText },
  { id: "access", label: "Privileges", icon: UserCheck },
  { id: "admin", label: "Employees", icon: CalendarDays },
] as const;

type SelectOption = string | { label: string; value: string };

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: SelectOption[];
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
        <textarea className={styles.textarea} name={props.name} defaultValue={props.defaultValue} required={props.required} />
      </label>
    );
  }
  return (
    <label className={className}>
      <span className={styles.label}>{props.label}</span>
      <input className={styles.input} name={props.name} type={props.type || "text"} defaultValue={props.defaultValue} placeholder={props.placeholder} required={props.required} />
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

type FormValues = ReturnType<typeof values>;
type ActionResult = { success: boolean; error?: string };
type SaveHandler<T extends FormValues = FormValues> = (payload: T) => Promise<ActionResult>;
type PortalTab = (typeof tabs)[number]["id"];
type SelectedCrmCell = {
  rowId: number;
  rowIndex: number;
  column: string;
  columnIndex: number;
  value: string;
};

type DateValue = string | Date | null | undefined;

const portalDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const portalTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

const portalDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

const portalNumberFormatter = new Intl.NumberFormat("en-IN");

function validDate(value: DateValue): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPortalDate(value: DateValue) {
  const date = validDate(value);
  return date ? portalDateFormatter.format(date) : "--";
}

function formatPortalTime(value: DateValue) {
  const date = validDate(value);
  return date ? portalTimeFormatter.format(date) : "--";
}

function formatPortalDateTime(value: DateValue) {
  const date = validDate(value);
  return date ? portalDateTimeFormatter.format(date) : "--";
}

function formatPortalTimeAgo(value: DateValue) {
  const date = validDate(value);
  if (!date) return "--";
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return portalDateFormatter.format(date);
}

function formatPortalNumber(value: number) {
  return portalNumberFormatter.format(value);
}

function formatWorkHours(value: number) {
  return `${value.toFixed(2)} hrs`;
}

function documentApproved(notes?: string | null) {
  return (notes || "").includes("Approval status: Approved");
}

function documentPending(notes?: string | null) {
  return (notes || "").includes("Approval status: Pending");
}

function cleanDocumentNotes(notes?: string | null) {
  return (notes || "")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("Approval status:") && !line.startsWith("Approved by:") && !line.startsWith("Signature:"))
    .join("\n")
    .trim();
}

function inputDate(value: DateValue) {
  const date = validDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

function inputDateTime(value: DateValue) {
  const date = validDate(value);
  return date ? date.toISOString().slice(0, 16) : "";
}

function simplePortalError(error: unknown, fallback = "The portal could not complete that request. Please try again.") {
  const text = error instanceof Error ? error.message : String(error || "");
  if (!text || text === "[object Event]" || text === "[object Object]") {
    return "The portal hit a temporary issue. Refresh and try again.";
  }
  if (
    /server action|failed to fetch|network|prisma|database|neon|timeout|temporarily unavailable/i.test(text)
  ) {
    return "The portal is temporarily unavailable. Refresh and try again.";
  }
  return text || fallback;
}

function mergePortalData(previous: PortalData, incoming: PortalData, activeTab: PortalTab): PortalData {
  return {
    ...previous,
    ...incoming,
    users: ["dashboard", "admin", "ops", "reports"].includes(activeTab) ? incoming.users : previous.users,
    crmRecords: ["dashboard", "crm", "reports"].includes(activeTab) ? incoming.crmRecords : previous.crmRecords,
    crmSheets: activeTab === "crm" ? incoming.crmSheets : previous.crmSheets,
    applicants: ["applicants", "admin", "reports"].includes(activeTab) ? incoming.applicants : previous.applicants,
    meetings: ["dashboard", "meetings", "reports"].includes(activeTab) ? incoming.meetings : previous.meetings,
    resources: ["dashboard", "resources", "reports"].includes(activeTab) ? incoming.resources : previous.resources,
    attendance: ["dashboard", "ops", "reports"].includes(activeTab) ? incoming.attendance : previous.attendance,
    leaveRequests: activeTab === "ops" ? incoming.leaveRequests : previous.leaveRequests,
    tasks: ["dashboard", "ops"].includes(activeTab) ? incoming.tasks : previous.tasks,
    payrollInputs: ["payroll", "reports"].includes(activeTab) ? incoming.payrollInputs : previous.payrollInputs,
    reviews: ["reviews", "reports"].includes(activeTab) ? incoming.reviews : previous.reviews,
    documents: ["dashboard", "documents", "reports"].includes(activeTab) ? incoming.documents : previous.documents,
    announcements: ["dashboard", "announcements", "reports"].includes(activeTab) ? incoming.announcements : previous.announcements,
    comments: activeTab === "ops" ? incoming.comments : previous.comments,
    departments: activeTab === "admin" ? incoming.departments : previous.departments,
    roleDefinitions: ["admin", "access"].includes(activeTab) ? incoming.roleDefinitions : previous.roleDefinitions,
    notifications: ["dashboard", "admin", "access"].includes(activeTab) ? incoming.notifications : previous.notifications,
    expenses: ["expenses", "reports"].includes(activeTab) ? incoming.expenses : previous.expenses,
    auditEvents: ["admin", "access", "reports"].includes(activeTab) ? incoming.auditEvents : previous.auditEvents,
  };
}

export default function PortalClient({ initialData }: { initialData: PortalData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<PortalTab>("dashboard");
  const [loadingTab, setLoadingTab] = useState<PortalTab | "">("");
  const [error, setError] = useState("");
  const [sortResources, setSortResources] = useState("newest");
  const [activeEmployeeMenuId, setActiveEmployeeMenuId] = useState<number | null>(null);
  const [workHoursEmployeeId, setWorkHoursEmployeeId] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [activeCrmSheetId, setActiveCrmSheetId] = useState<number | null>(null);
  const [selectedCrmRowId, setSelectedCrmRowId] = useState<number | null>(null);
  const [selectedCrmCell, setSelectedCrmCell] = useState<SelectedCrmCell | null>(null);
  const [clockOverride, setClockOverride] = useState<"working" | "off" | "">("");
  const [clockSaving, setClockSaving] = useState(false);
  const [applicationLink, setApplicationLink] = useState("/employee/apply");
  const [pending, startTransition] = useTransition();
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string; fileSize: string; mimeType: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("super_admin");
  const [isCreatingRole, setIsCreatingRole] = useState<boolean>(false);
  const [passwordAlertDismissed, setPasswordAlertDismissed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [now, setNow] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bluevolt-sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bluevolt-sidebar-collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    setTheme("light");
    localStorage.setItem("bluevolt-theme", "light");

    // Lock page scrolling when in the portal
    document.body.classList.add("portal-body-lock");
    document.documentElement.classList.add("portal-body-lock");

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(timer);
      document.body.classList.remove("portal-body-lock");
      document.documentElement.classList.remove("portal-body-lock");
    };
  }, []);

  useEffect(() => {
    setSelectedCrmRowId(null);
    setSelectedCrmCell(null);
  }, [activeCrmSheetId]);

  useEffect(() => {
    setApplicationLink(`${window.location.origin}/employee/apply`);
  }, []);

  useEffect(() => {
    const key = `bluevolt-default-password-alert-dismissed:${data.session.email}`;
    setPasswordAlertDismissed(localStorage.getItem(key) === "1");
  }, [data.session.email]);

  // Auto-dismiss notices after 4 seconds
  useEffect(() => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    if (notice) {
      noticeTimerRef.current = setTimeout(() => setNotice(""), 4000);
    }
    return () => { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current); };
  }, [notice]);

  // Escape key closes CRM sheet view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeCrmSheetId) {
        setActiveCrmSheetId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCrmSheetId]);

  // Close mobile sidebar on tab change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [tab]);

  // Close employee actions menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveEmployeeMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const visibleTabs = useMemo(() => tabs.filter((item) => {
    if (item.id === "dashboard") return true;
    if (item.id === "crm") return data.capabilities.canRequestCrmSource || data.capabilities.canUseCrm;
    if (item.id === "applicants") return data.capabilities.canManageApplicants;
    if (item.id === "ops") return data.capabilities.canManageOps;
    if (item.id === "expenses") return data.capabilities.canManageExpenses;
    if (item.id === "payroll") return data.capabilities.canManagePayroll;
    if (item.id === "reports") return data.capabilities.canManage || data.capabilities.canManagePayroll || data.capabilities.canManageApplicants;
    if (item.id === "profile") return true;
    if (item.id === "reviews") return data.capabilities.canReviewPerformance;
    if (item.id === "documents") return data.capabilities.canViewDocuments || data.capabilities.canManageDocuments;
    if (item.id === "announcements") return data.capabilities.canViewAnnouncements || data.capabilities.canPublishAnnouncements;
    if (item.id === "meetings") return data.capabilities.canViewMeetings || data.capabilities.canScheduleMeetings;
    if (item.id === "resources") return data.capabilities.canViewResources || data.capabilities.canManageResources;
    if (item.id === "access") return data.capabilities.canManageAccess;
    if (item.id === "admin") return data.capabilities.canManage;
    return true;
  }), [data.capabilities]);

  const refresh = (sort = sortResources, currentTab = tab) => startTransition(async () => {
    try {
      const newData = await getEmployeePortalData(sort, currentTab);
      setData(prev => mergePortalData(prev, newData, currentTab));
      setClockOverride("");
    } catch (refreshError) {
      setError(simplePortalError(refreshError));
    }
  });

  const openPortalTab = (nextTab: PortalTab) => {
    setLoadingTab(nextTab);
    startTransition(async () => {
      try {
        const newData = await getEmployeePortalData(sortResources, nextTab);
        setData(prev => mergePortalData(prev, newData, nextTab));
        setTab(nextTab);
      } catch (tabError) {
        setError(simplePortalError(tabError));
      } finally {
        setLoadingTab("");
      }
    });
  };

  const employees = data.users as EmployeeListItem[];
  const filteredResources = data.resources.filter((resource) => (
    resourceTypeFilter === "all" || resource.resourceType === resourceTypeFilter
  ));

  const onlineEmployees = employees.filter((user) => user.isOnline).length;
  const workingEmployees = employees.filter((user) => user.isWithinWorkHours).length;
  const employeeOptions = employees.map((user) => ({ label: `${user.name} (${user.email})`, value: user.id.toString() }));
  const roleDefinitions = data.roleDefinitions || [];
  const currentUserId = Number(data.session.userId);
  const activeRoleOptions = roleDefinitions
    .filter((role) => role.status !== "Inactive")
    .map((role) => ({ label: `${role.label} (${role.key})`, value: role.key }));
  const roleOptions = activeRoleOptions.length ? activeRoleOptions : [{ label: "Employee (employee)", value: "employee" }];
  const ownerRoleOptions = [{ label: "All roles", value: "all" }, ...roleOptions];
  const roleNameByKey = new Map(roleDefinitions.map((role) => [role.key, role.label]));
  const displayRole = (role: string) => roleNameByKey.get(role) || role.replace(/_/g, " ");
  const audienceOptionsForValue = (value?: string) => {
    if (!value || ownerRoleOptions.some((role) => role.value === value)) return ownerRoleOptions;
    return [{ label: `${displayRole(value)} (${value}) - inactive`, value }, ...ownerRoleOptions];
  };
  const roleLabel = displayRole(data.session.role);
  const currentRoleDefinition = roleDefinitions.find((role) => role.key === data.session.role);
  const superiorRoleKeys = new Set(["super_admin", "director", "authorized_signatory", "admin"]);
  const isSuperiorDashboard = currentRoleDefinition?.dashboardType
    ? currentRoleDefinition.dashboardType === "superior"
    : superiorRoleKeys.has(data.session.role);
  const normalizedRole = data.session.role.toLowerCase();
  const openTasks = data.tasks.filter((task) => task.status !== "Done");
  const myOpenTasks = openTasks.filter((task) => task.assignedTo === currentUserId || task.assignedName === data.session.name || task.ownerRole === data.session.role);
  const blockedTasks = data.tasks.filter((task) => task.status === "Blocked");
  const dueSoonTasks = data.tasks.filter((task) => task.dueAt && task.status !== "Done" && new Date(task.dueAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000);
  const actionableCrmRows = data.crmSheets.flatMap((sheet) => sheet.rows).filter((row) => ["Open", "Callback"].includes(row.status));
  const roleActionableCrmRows = actionableCrmRows.filter((row) => {
    const sheet = data.crmSheets.find((candidate) => candidate.rows.some((sheetRow) => sheetRow.id === row.id));
    return !sheet || sheet.ownerRole === data.session.role || sheet.audienceRoles === "all" || sheet.audienceRoles === data.session.role;
  });
  const upcomingMeetings = data.meetings.filter((meeting) => new Date(meeting.startsAt).getTime() >= Date.now()).slice(0, 4);
  const recentResources = data.resources.slice(0, 4);
  const canEditCrmSheet = data.session.role === "super_admin";
  const currentEmployee = employees.find((user) => user.id === currentUserId);
  const activeAttendance = data.attendance.find((entry) => entry.employeeId === currentUserId && entry.loginAt && !entry.logoutAt);
  const isWorking = clockOverride ? clockOverride === "working" : Boolean(activeAttendance);
  const recentAttendance = data.attendance.slice(0, data.capabilities.canManage ? 12 : 6);
  const selectedHoursEmployeeId = Number(workHoursEmployeeId || currentUserId);
  const selectedHoursEmployee = employees.find((user) => user.id === selectedHoursEmployeeId) || currentEmployee;
  const teamWorkHours = data.attendance.reduce((total, entry) => total + Number(entry.totalHours || 0), 0);
  const selectedEmployeeWorkHours = data.attendance
    .filter((entry) => entry.employeeId === selectedHoursEmployeeId)
    .reduce((total, entry) => total + Number(entry.totalHours || 0), 0);
  const completedSessions = data.attendance.filter((entry) => entry.logoutAt).length;
  const selectedEmployeeSessions = data.attendance.filter((entry) => entry.employeeId === selectedHoursEmployeeId).length;
  const payrollTotal = data.payrollInputs.reduce((total, item) => total + Number(item.amount || 0), 0);
  const payrollReady = data.payrollInputs.filter((item) => item.status === "Ready").length;
  const payrollPaid = data.payrollInputs.filter((item) => item.status === "Paid").length;

  const downloadCsv = (fileName: string, rows: Record<string, string | number | null | undefined>[]) => {
    if (!rows.length) {
      setNotice("No records available for this report yet.");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (value: string | number | null | undefined) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applicantRows = data.applicants.map((applicant) => ({
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone || "",
    role: applicant.roleApplied,
    stage: applicant.stage,
    source: applicant.source,
    submitted: formatPortalDateTime(applicant.createdAt),
    notes: applicant.notes || "",
  }));

  const employeeRows = employees.map((employee) => ({
    name: employee.name,
    email: employee.email,
    role: displayRole(employee.role),
    department: employee.department,
    title: employee.title,
    type: employee.employeeType,
    compensation: employee.compensationStatus,
    status: employee.status,
    workStart: employee.workStartTime,
    workEnd: employee.workEndTime,
  }));

  const payrollRows = data.payrollInputs.map((payroll) => ({
    employee: payroll.employeeName,
    period: payroll.payPeriod,
    payType: payroll.payType,
    amount: payroll.amount,
    workingDays: payroll.workingDays,
    unpaidLeaveDays: payroll.unpaidLeaveDays,
    bonus: payroll.bonus,
    deductions: payroll.deductions,
    status: payroll.status,
  }));

  const attendanceRows = data.attendance.map((entry) => ({
    employee: entry.employeeName,
    date: formatPortalDate(entry.workDate),
    loginAt: formatPortalDateTime(entry.loginAt),
    logoutAt: formatPortalDateTime(entry.logoutAt),
    totalHours: Number(entry.totalHours || 0).toFixed(2),
    status: entry.status,
    notes: entry.notes || "",
  }));

  const submit = <T extends FormValues>(handler: SaveHandler<T>, onSuccessOptimistic?: () => void) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("Processing your request...");
    const form = event.currentTarget;
    const formValues = values(form) as T;
    if (onSuccessOptimistic) onSuccessOptimistic();
    startTransition(async () => {
      try {
        const result = await handler(formValues);
        if (!result.success) {
          setError(result.error || "Save failed.");
          return;
        }
        form.reset();
        setUploadedFile(null);
        setNotice("Saved successfully.");
        const newData = await getEmployeePortalData(sortResources, tab);
        setData(prev => mergePortalData(prev, newData, tab));
      } catch (submitError) {
        setError(simplePortalError(submitError, "Save failed. Please try again."));
      }
    });
  };

  const runAction = (handler: () => Promise<{ success: boolean; error?: string }>) => {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await handler();
        if (!result.success) setError(result.error || "Action failed.");
        else setNotice("Updated successfully.");
        const newData = await getEmployeePortalData(sortResources, tab);
        setData(prev => mergePortalData(prev, newData, tab));
      } catch (actionError) {
        setError(simplePortalError(actionError, "Action failed. Please try again."));
      }
    });
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/employee/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!result.success) {
        setError(result.error || "Upload failed.");
        return;
      }
      setNotice(`${result.fileName} uploaded.`);
      setUploadedFile({
        url: result.url,
        fileName: result.fileName,
        fileSize: String(result.fileSize),
        mimeType: result.mimeType,
      });
    } catch {
      setError("Upload failed. Please check your connection and try again.");
    }
  };

  const handleClockIn = () => {
    if (isWorking || clockSaving) return;
    const now = new Date();
    setClockOverride("working");
    setClockSaving(true);
    setData(prev => {
      const userId = Number(prev.session.userId);
      const employee = prev.users.find((user) => user.id === userId);
      const optimisticEntry = {
        id: -Date.now(),
        employeeId: userId,
        employeeName: employee?.name || prev.session.name,
        workDate: now,
        loginAt: now,
        logoutAt: null,
        totalHours: 0,
        status: "Present",
        notes: "Clocked in from portal.",
        createdAt: now,
        updatedAt: now,
      } as PortalData["attendance"][number];
      return {
        ...prev,
        users: prev.users.map((user) => user.id === userId ? { ...user, isOnline: true, isWithinWorkHours: true, lastSeenAt: now } : user),
        attendance: [optimisticEntry, ...prev.attendance.filter((entry) => !(entry.employeeId === userId && entry.loginAt && !entry.logoutAt))],
      };
    });
    startTransition(async () => {
      try {
        const result = await clockInEmployee();
        if (!result.success) {
          setError(result.error || "Clock in failed.");
          setClockOverride("off");
        }
      } catch (clockError) {
        setError(simplePortalError(clockError, "Clock in failed. Please try again."));
        setClockOverride("off");
      } finally {
        setClockSaving(false);
      }
    });
  };

  const handleClockOut = () => {
    if (!isWorking || clockSaving) return;
    const now = new Date();
    setClockOverride("off");
    setClockSaving(true);
    setData(prev => {
      const userId = Number(prev.session.userId);
      return {
        ...prev,
        users: prev.users.map((user) => user.id === userId ? { ...user, isOnline: false, lastSeenAt: now } : user),
        attendance: prev.attendance.map((entry) => {
          if (entry.employeeId === userId && entry.loginAt && !entry.logoutAt) {
            const loginAt = new Date(entry.loginAt);
            return {
              ...entry,
              logoutAt: now,
              totalHours: Math.max(0, (now.getTime() - loginAt.getTime()) / (1000 * 60 * 60)),
              updatedAt: now,
            };
          }
          return entry;
        }),
      };
    });
    startTransition(async () => {
      try {
        const result = await clockOutEmployee();
        if (!result.success) {
          setError(result.error || "Clock out failed.");
          setClockOverride("working");
        }
      } catch (clockError) {
        setError(simplePortalError(clockError, "Clock out failed. Please try again."));
        setClockOverride("working");
      } finally {
        setClockSaving(false);
      }
    });
  };

  const handleCellChange = (rowId: number, colName: string, newValue: string) => {
    if (!canEditCrmSheet) return;
    setData(prev => {
        const crmSheets = [...prev.crmSheets];
        const sheetIndex = crmSheets.findIndex(s => s.id === activeCrmSheetId);
        if (sheetIndex !== -1) {
            const rows = [...crmSheets[sheetIndex].rows];
            const rowIndex = rows.findIndex(r => r.id === rowId);
            if (rowIndex !== -1) {
                const originalData = typeof rows[rowIndex].data === "string" ? JSON.parse(rows[rowIndex].data) : rows[rowIndex].data;
                const newData = { ...originalData, [colName]: newValue };
                rows[rowIndex] = { ...rows[rowIndex], data: newData };
                crmSheets[sheetIndex] = { ...crmSheets[sheetIndex], rows };
                updateCrmSheetRowData({ rowId: rowId.toString(), data: newData }).catch(console.error);
            }
        }
        return { ...prev, crmSheets };
    });
  };

  const importEmployees = async (file?: File) => {
    if (!file) return;
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/employee/import", { method: "POST", body: formData });
      const result = await response.json();
      if (!result.success) {
        setError(result.error || "Import failed.");
        return;
      }
      setNotice(`${result.imported} employee records imported or updated.`);
      const newData = await getEmployeePortalData(sortResources, tab);
      setData(prev => mergePortalData(prev, newData, tab));
    } catch {
      setError("Import failed. Please check your connection and try again.");
    }
  };

  const copyApplicationLink = async () => {
    try {
      const message = `BlueVolt application link:\n${applicationLink}\n\nPlease fill this form if you are applying for an employee or internship role.`;
      await navigator.clipboard.writeText(message);
      setNotice("Application link copied. Paste it in WhatsApp.");
    } catch {
      setError("Copy failed. Please copy the link manually.");
    }
  };

  const idCardUrlFor = (user: EmployeeListItem, download = false) => (
    `/api/employee/id-card?employeeId=${user.id}${download ? "&download=1" : ""}`
  );

  const greetingHour = now.getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";
  const userInitials = data.session.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const confirmDelete = (entityType: string, id: string, name?: string) => {
    const label = name || entityType;
    if (!confirm(`Delete this ${label}? This action cannot be undone.`)) return;
    runAction(() => deleteEmployeeEntity({ entityType, id }));
  };

  return (
    <div className={`${styles.shell} ${theme === "light" ? styles.themeLight : styles.themeDark} ${sidebarCollapsed ? styles.shellCollapsed : ""}`}>
      {/* Mobile hamburger button */}
      <button className={styles.mobileMenuButton} type="button" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} aria-label="Toggle navigation">
        {mobileSidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile overlay */}
      {mobileSidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setMobileSidebarOpen(false)} />}

      {userManagementOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Appoint or add user">
          <div className={styles.modalPanel}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.cardTitle}>Appoint / Add User</h2>
                <p className={styles.muted}>Share the public form link or create direct portal access. New accounts use default password abc123.</p>
              </div>
              <button className={styles.refreshIconButton} type="button" onClick={() => setUserManagementOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className={styles.modalLinkBox}>
              <input className={styles.input} value={applicationLink} readOnly />
              <button className={styles.button} type="button" onClick={copyApplicationLink}>Copy Link</button>
              <a className={styles.ghostButton} href={applicationLink} target="_blank" rel="noopener noreferrer">Open Form</a>
            </div>
            <form className={styles.formGrid} onSubmit={submit(saveEmployeeUser)}>
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <input type="hidden" name="password" value="abc123" />
              <Field label="Role" name="role" options={roleOptions} defaultValue={roleOptions.some((role) => role.value === "employee") ? "employee" : roleOptions[0]?.value} />
              <Field label="Department" name="department" defaultValue="General" />
              <Field label="Title" name="title" defaultValue="Team Member" />
              <Field label="Employee Type" name="employeeType" options={["Full-time", "Part-time", "Intern", "Contractor", "Consultant"]} />
              <Field label="Paid Status" name="compensationStatus" options={["Paid", "Unpaid"]} />
              <Field label="Employment Start" name="employmentStart" type="date" />
              <Field label="Employment End" name="employmentEnd" type="date" />
              <Field label="Work Starts" name="workStartTime" type="time" defaultValue="09:00" />
              <Field label="Work Ends" name="workEndTime" type="time" defaultValue="18:00" />
              <Field label="Status" name="status" options={["Active", "Inactive"]} />
              <div className={`${styles.notice} ${styles.fieldWide}`}>Default password: abc123. User will be warned to change it after first login.</div>
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Create User Access</button>
            </form>
          </div>
        </div>
      )}

      <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ""} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        {/* Collapse toggle button (Desktop only) */}
        <button 
          className={styles.sidebarCollapseToggle} 
          onClick={toggleSidebar} 
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />}
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid var(--border-color)", width: "100%" }}>
          {sidebarCollapsed ? (
            <span style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--text-brand)" }}>B</span>
          ) : (
            <Image src="/logo.png" alt="BlueVolt Logo" width={110} height={52} style={{ height: 52, width: "auto", objectFit: "contain" }} />
          )}
        </div>
        <div className={styles.sidebarProfile}>
          <div className={styles.sidebarAvatar}>
            <span>{userInitials}</span>
            {isWorking && <span className={styles.sidebarOnlineDot} />}
          </div>
          {!sidebarCollapsed && (
            <div className={styles.sidebarProfileInfo}>
              <div className={styles.sidebarName} style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>{data.session.name}</div>
              <div className={styles.pill} style={{ marginTop: 4, fontSize: "0.68rem", textTransform: "uppercase" }}>{roleLabel}</div>
            </div>
          )}
        </div>
        <nav className={styles.nav}>
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id} 
                className={`${styles.navButton} ${tab === item.id ? styles.navButtonActive : ""}`} 
                onClick={() => {
                  openPortalTab(item.id);
                }} 
                type="button"
                title={item.label}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon size={18} /> 
                  {!sidebarCollapsed && (loadingTab === item.id ? "Loading..." : item.label)}
                </span>
                {!sidebarCollapsed && tab === item.id && <ChevronRight size={14} className={styles.navChevron} />}
              </button>
            );
          })}
        </nav>
        <button 
          className={styles.logoutButton} 
          type="button" 
          title="Sign out"
          onClick={() => startTransition(async () => {
            await logoutEmployee();
            router.push("/employee/login");
          })}
        >
          <LogOut size={18} />
          {!sidebarCollapsed && " Sign out"}
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.greetingText}>{greeting}, {data.session.name.split(" ")[0]}</p>
            <h1 className={styles.title}>Employee Portal</h1>
            <p className={styles.muted}>{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className={styles.workIsland}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginRight: 8, paddingRight: 16, borderRight: "1px solid var(--border-color)", position: "relative" }}>
              <div className="headerClock" style={{ textAlign: "right", display: "none" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{now.toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit" })}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <style>{`@media (min-width: 768px) { .headerClock { display: block !important; } }`}</style>
              <button type="button" className={styles.refreshIconButton} onClick={() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                setTheme(newTheme);
                localStorage.setItem("bluevolt-theme", newTheme);
              }} aria-label="Toggle Theme">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button type="button" className={styles.refreshIconButton} onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications" style={{ position: "relative" }}>
                <Bell size={18} />
                {data.notifications.some((n: PortalNotification) => !n.readAt) && (
                  <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", border: "1px solid var(--bg-card)" }} />
                )}
              </button>
              {notificationsOpen && (
                <div 
                  className={styles.notificationPopover} 
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    zIndex: 120,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 16,
                    boxShadow: "var(--shadow-lg)",
                    width: 320,
                    maxHeight: 400,
                    overflowY: "auto",
                    marginTop: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                    <strong style={{ fontSize: "0.95rem" }}>Notifications</strong>
                    <button 
                      className={styles.ghostButton} 
                      style={{ padding: "4px 8px", minHeight: 24, fontSize: "0.75rem" }}
                      type="button" 
                      onClick={() => setNotificationsOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.notifications.length === 0 ? (
                      <div className={styles.muted} style={{ fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No new notifications</div>
                    ) : (
                      data.notifications.map((item: PortalNotification) => (
                        <div 
                          key={item.id} 
                          style={{ 
                            padding: 10, 
                            borderRadius: 8, 
                            background: item.readAt ? "transparent" : "var(--pill-bg)", 
                            border: "1px solid var(--border-color)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: item.readAt ? "var(--text-primary)" : "var(--text-brand)" }}>{item.title}</span>
                            {!item.readAt && (
                              <button 
                                className={styles.ghostButton} 
                                style={{ padding: "2px 6px", minHeight: 20, fontSize: "0.7rem", flexShrink: 0 }}
                                type="button" 
                                onClick={() => runAction(() => markNotificationRead({ id: item.id.toString() }))}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{item.body}</p>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{formatPortalTimeAgo(item.createdAt)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.workIslandMeta}>
              <span className={`${styles.workDot} ${isWorking ? styles.workDotOn : ""}`} />
              <div>
                <strong>{isWorking ? "Working now" : "Off work"}</strong>
                <span>{currentEmployee?.workStartTime || "09:00"} â€“ {currentEmployee?.workEndTime || "18:00"} {clockSaving ? "saving..." : ""}</span>
              </div>
            </div>
            <button className={`${styles.workSwitch} ${isWorking ? styles.workSwitchOn : ""}`} type="button" onClick={isWorking ? handleClockOut : handleClockIn} aria-pressed={isWorking} disabled={clockSaving}>
              <span>{isWorking ? "Working" : "Off"}</span>
              <i />
            </button>
            <button className={styles.refreshIconButton} type="button" onClick={() => refresh(sortResources, tab)} disabled={pending} aria-label="Refresh portal"><RefreshCw size={16} className={pending ? styles.spinning : ""} /></button>
          </div>
        </header>

        {/* Toast notifications */}
        <div className={styles.toastContainer}>
          {error && <div className={`${styles.toast} ${styles.toastError}`}><span>{error}</span><button type="button" onClick={() => setError("")} className={styles.toastClose}><X size={14} /></button></div>}
          {notice && <div className={`${styles.toast} ${styles.toastSuccess}`}><span>{notice}</span><button type="button" onClick={() => setNotice("")} className={styles.toastClose}><X size={14} /></button></div>}
          {loadingTab && <div className={`${styles.toast} ${styles.toastInfo}`}><RotateCw size={14} className={styles.spinning} /> Loading {loadingTab === "crm" ? "CRM sheets" : loadingTab}...</div>}
        </div>

        {data.mustChangePassword && !passwordAlertDismissed && (
          <div className={styles.passwordAlert}>
            <div>
              <strong>Default password is still active</strong>
              <p>Reset it from your profile before using the portal for regular work.</p>
            </div>
            <div className={styles.alertActions}>
              <button className={styles.ghostButton} type="button" onClick={() => {
                localStorage.setItem(`bluevolt-default-password-alert-dismissed:${data.session.email}`, "1");
                setPasswordAlertDismissed(true);
              }}>Ignore forever</button>
              <button className={styles.button} type="button" onClick={() => openPortalTab("profile")}>Change Password</button>
            </div>
          </div>
        )}

        {tab === "dashboard" && !isSuperiorDashboard && (
          <section className={styles.grid}>
            <div className={`${styles.card} ${styles.span12} ${styles.dashboardHero}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flexShrink: 0, width: 86, height: 78, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-shell)", padding: 12, borderRadius: "18px", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)" }}>
                  <Image src="/logo.png" alt="BlueVolt Logo" width={86} height={78} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div>
                  <span className={styles.eyebrow}>{normalizedRole.includes("sales") ? "Sales Workspace" : normalizedRole.includes("content") ? "Content Workspace" : "My Workspace"}</span>
                  <h2 className={styles.heroTitle} style={{ margin: "4px 0" }}>Today&apos;s work for {data.session.name}</h2>
                  <p className={styles.muted} style={{ margin: 0 }}>
                    Focused view for your tasks, check-in status, CRM/content work, resources, meetings, and documents.
                  </p>
                </div>
              </div>
              <div className={styles.heroActions}>
                <button className={styles.button} type="button" onClick={() => openPortalTab("ops")}>My tasks</button>
                {data.capabilities.canUseCrm && <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("crm")}>My CRM sheets</button>}
                <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("resources")}>Resources</button>
                {currentEmployee && <a className={styles.ghostButton} href={idCardUrlFor(currentEmployee)} target="_blank" rel="noopener noreferrer">My ID card</a>}
              </div>
            </div>

            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}>
              <h2 className={styles.cardTitle}>Work Status</h2>
              <span className={styles.metricValue}>{isWorking ? "On" : "Off"}</span>
              <p className={styles.muted}>{currentEmployee?.workStartTime || "09:00"} to {currentEmployee?.workEndTime || "18:00"}</p>
            </div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}>
              <h2 className={styles.cardTitle}>My Tasks</h2>
              <span className={styles.metricValue}>{myOpenTasks.length}</span>
              <p className={styles.muted}>{myOpenTasks.filter((task) => task.status === "Blocked").length} blocked, {myOpenTasks.filter((task) => task.dueAt).length} with due dates.</p>
            </div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}>
              <h2 className={styles.cardTitle}>{normalizedRole.includes("sales") ? "CRM Follow-ups" : normalizedRole.includes("content") ? "Content Queue" : "Assigned Work"}</h2>
              <span className={styles.metricValue}>{normalizedRole.includes("sales") ? roleActionableCrmRows.length : myOpenTasks.length}</span>
              <p className={styles.muted}>{normalizedRole.includes("sales") ? "Open and callback rows visible to you." : "Visible tasks for your role."}</p>
            </div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}>
              <h2 className={styles.cardTitle}>My Hours</h2>
              <span className={styles.metricValue}>{formatWorkHours(selectedEmployeeWorkHours)}</span>
              <p className={styles.muted}>{selectedEmployeeSessions} work sessions recorded.</p>
            </div>

            <div className={`${styles.card} ${styles.span8}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{normalizedRole.includes("sales") ? "Sales Action List" : normalizedRole.includes("content") ? "Content Development Queue" : "Priority Work"}</h2>
                  <p className={styles.muted}>{normalizedRole.includes("sales") ? "Rows you can follow up from approved CRM sheets." : "Tasks assigned to you or your role."}</p>
                </div>
              </div>
              <div className={styles.list}>
                {normalizedRole.includes("sales") ? (
                  roleActionableCrmRows.length === 0 ? <div className={styles.emptyState}>No CRM follow-ups assigned right now.</div> : roleActionableCrmRows.slice(0, 6).map((row) => {
                    const rowData = row.data && typeof row.data === "object" ? row.data as Record<string, string> : {};
                    return (
                      <div className={styles.row} key={row.id}>
                        <div className={styles.rowHeader}>
                          <strong>{rowData["School Name"] || rowData.Company || `CRM row ${row.rowNumber}`}</strong>
                          <span className={row.status === "Callback" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{row.status}</span>
                        </div>
                        <p className={styles.muted}>{rowData["Phone Number"] || rowData.Phone || row.reason || "Open follow-up."}</p>
                      </div>
                    );
                  })
                ) : (
                  myOpenTasks.length === 0 ? <div className={styles.emptyState}>No assigned work right now.</div> : myOpenTasks.slice(0, 6).map((task) => (
                    <div className={styles.row} key={task.id}>
                      <div className={styles.rowHeader}><strong>{task.title}</strong><span className={task.status === "Blocked" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{task.status}</span></div>
                      <p className={styles.muted}>{task.description || "Update progress from Work Ops."} {task.dueAt ? `Due ${formatPortalDateTime(task.dueAt)}` : ""}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`${styles.card} ${styles.span4}`}>
              <h2 className={styles.cardTitle}>Quick Access</h2>
              <div className={styles.list}>
                <button className={styles.rowButton} type="button" onClick={() => openPortalTab("profile")}><span>Profile and password</span><ChevronRight size={16} /></button>
                <button className={styles.rowButton} type="button" onClick={() => openPortalTab("documents")}><span>Documents and letters</span><ChevronRight size={16} /></button>
                <button className={styles.rowButton} type="button" onClick={() => openPortalTab("meetings")}><span>Meetings</span><ChevronRight size={16} /></button>
                <button className={styles.rowButton} type="button" onClick={() => openPortalTab("resources")}><span>Resources</span><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className={`${styles.card} ${styles.span6}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Upcoming Meetings</h2>
                  <p className={styles.muted}>Read-only meeting list for your role.</p>
                </div>
                <span className={styles.pill}>{upcomingMeetings.length} upcoming</span>
              </div>
              <div className={styles.list}>
                {upcomingMeetings.length === 0 ? <div className={styles.emptyState}>No upcoming meetings.</div> : upcomingMeetings.map((meeting) => (
                  <div className={styles.row} key={meeting.id}>
                    <strong>{meeting.title}</strong>
                    <p className={styles.muted}>{formatPortalDateTime(meeting.startsAt)}</p>
                    {meeting.meetUrl && <a className={styles.ghostButton} href={meeting.meetUrl} target="_blank" rel="noopener noreferrer">Join</a>}
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.card} ${styles.span6}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Resources For You</h2>
                  <p className={styles.muted}>Files and links visible to your role.</p>
                </div>
                <span className={styles.pill}>{data.resources.length} visible</span>
              </div>
              <div className={styles.list}>
                {recentResources.length === 0 ? <div className={styles.emptyState}>No resources yet.</div> : recentResources.map((resource) => (
                  <div className={styles.row} key={resource.id}>
                    <strong>{resource.title}</strong>
                    <p className={styles.muted}>{resource.resourceType} {resource.tags ? `- ${resource.tags}` : ""}</p>
                    {resource.url && <a className={styles.ghostButton} href={resource.url} target="_blank" rel="noopener noreferrer">Open</a>}
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.card} ${styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>My Check-In History</h2>
                  <p className={styles.muted}>Your recent work sessions and total hours.</p>
                </div>
                <span className={styles.pill}>{recentAttendance.length} recent</span>
              </div>
              <div className={styles.attendanceGrid}>{recentAttendance.length === 0 ? <div className={styles.emptyState}>No check-in history yet.</div> : recentAttendance.map((entry) => (
                <div className={styles.attendanceItem} key={entry.id}>
                  <div>
                    <strong>{entry.employeeName}</strong>
                    <p className={styles.muted}>{formatPortalDate(entry.workDate)} - {entry.status}</p>
                  </div>
                  <div><span className={styles.label}>In</span><strong>{formatPortalTime(entry.loginAt)}</strong></div>
                  <div><span className={styles.label}>Out</span><strong>{entry.logoutAt ? formatPortalTime(entry.logoutAt) : "Working"}</strong></div>
                  <span className={entry.logoutAt ? styles.pill : `${styles.pill} ${styles.pillSuccess}`}>{entry.logoutAt ? `${entry.totalHours.toFixed(2)} hrs` : "Live"}</span>
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "dashboard" && isSuperiorDashboard && (
          <section className={styles.grid}>
            <div className={`${styles.card} ${styles.span12} ${styles.dashboardHero}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flexShrink: 0, width: 96, height: 86, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-shell)", padding: 12, borderRadius: "18px", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)" }}>
                  <Image src="/logo.png" alt="BlueVolt Logo" width={96} height={86} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div>
                  <span className={styles.eyebrow}>Today Command Center</span>
                  <h2 className={styles.heroTitle} style={{ margin: "4px 0" }}>Work queue for {roleLabel}</h2>
                  <p className={styles.muted} style={{ margin: 0 }}>Tasks, meetings, resources, and team signals grouped for engineering, content, and sales workflows.</p>
                </div>
              </div>
              <div className={styles.heroActions}>
                <button className={styles.button} type="button" onClick={() => openPortalTab("ops")}>Open tasks</button>
                {data.capabilities.canUseCrm && <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("crm")}>Open CRM</button>}
                <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("resources")}>Resources</button>
                {currentEmployee && <a className={styles.ghostButton} href={idCardUrlFor(currentEmployee)} target="_blank" rel="noopener noreferrer">My ID card</a>}
              </div>
            </div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}><h2 className={styles.cardTitle}>Open Tasks</h2><span className={styles.metricValue}>{openTasks.length}</span><p className={styles.muted}>{blockedTasks.length} blocked, {dueSoonTasks.length} due soon.</p></div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}><h2 className={styles.cardTitle}>CRM Rows</h2><span className={styles.metricValue}>{actionableCrmRows.length}</span><p className={styles.muted}>Open or callback rows from visible sheets.</p></div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}><h2 className={styles.cardTitle}>Upcoming Meets</h2><span className={styles.metricValue}>{upcomingMeetings.length}</span><p className={styles.muted}>Visible scheduled sessions.</p></div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}><h2 className={styles.cardTitle}>Team Online</h2><span className={styles.metricValue}>{onlineEmployees}</span><p className={styles.muted}>{workingEmployees} inside work window.</p></div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}><h2 className={styles.cardTitle}>Total Employees</h2><span className={styles.metricValue}>{employees.length}</span><p className={styles.muted}>{employees.filter((user) => user.employeeType === "Intern").length} interns, {employees.filter((user) => user.status === "Active").length} active.</p></div>

            <div className={`${styles.card} ${styles.span9}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Work Hours Overview</h2>
                  <p className={styles.muted}>{data.capabilities.canManage ? "Full-team and employee-wise completed work sessions." : "Your completed work sessions."}</p>
                </div>
                {data.capabilities.canManage && (
                  <select className={styles.select} style={{ maxWidth: 260 }} value={workHoursEmployeeId} onChange={(event) => setWorkHoursEmployeeId(event.target.value)}>
                    <option value="">Me: {data.session.name}</option>
                    {employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                )}
              </div>
              <div className={styles.quickGrid}>
                {data.capabilities.canManage && (
                  <div className={styles.row}>
                    <span className={styles.label}>Full team hours</span>
                    <strong>{formatWorkHours(teamWorkHours)}</strong>
                    <p className={styles.muted}>{completedSessions} completed sessions loaded.</p>
                  </div>
                )}
                <div className={styles.row}>
                  <span className={styles.label}>{selectedHoursEmployee?.name || data.session.name}</span>
                  <strong>{formatWorkHours(selectedEmployeeWorkHours)}</strong>
                  <p className={styles.muted}>{selectedEmployeeSessions} sessions in history.</p>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>Currently working</span>
                  <strong>{data.attendance.filter((entry) => entry.loginAt && !entry.logoutAt).length}</strong>
                  <p className={styles.muted}>Live check-ins across visible records.</p>
                </div>
              </div>
            </div>

            <div className={`${styles.card} ${styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Check-In History</h2>
                  <p className={styles.muted}>{data.capabilities.canManage ? "Recent employee clock-in and clock-out records." : "Your recent work sessions."}</p>
                </div>
                <span className={styles.pill}>{recentAttendance.length} recent</span>
              </div>
              <div className={styles.attendanceGrid}>{recentAttendance.length === 0 ? <div className={styles.emptyState}>No check-in history yet.</div> : recentAttendance.map((entry) => (
                <div className={styles.attendanceItem} key={entry.id}>
                  <div>
                    <strong>{entry.employeeName}</strong>
                    <p className={styles.muted}>{formatPortalDate(entry.workDate)} - {entry.status}</p>
                  </div>
                  <div>
                    <span className={styles.label}>In</span>
                    <strong>{formatPortalTime(entry.loginAt)}</strong>
                  </div>
                  <div>
                    <span className={styles.label}>Out</span>
                    <strong>{entry.logoutAt ? formatPortalTime(entry.logoutAt) : "Working"}</strong>
                  </div>
                  <span className={entry.logoutAt ? styles.pill : `${styles.pill} ${styles.pillSuccess}`}>{entry.logoutAt ? `${entry.totalHours.toFixed(2)} hrs` : "Live"}</span>
                </div>
              ))}</div>
            </div>

            <div className={`${styles.card} ${styles.span4}`}>
              <div className={styles.rowHeader}>
                <h2 className={styles.cardTitle}><Code2 size={16} /> Engineering</h2>
                <span className={styles.pill}>{blockedTasks.length} blockers</span>
              </div>
              <div className={styles.list}>
                {[
                  ["Active builds", `${openTasks.filter((task) => ["In Progress", "Blocked"].includes(task.status)).length} tasks in motion`],
                  ["Proof review", `${data.tasks.filter((task) => task.proofUrl).length} proof links submitted`],
                  ["Docs", `${data.documents.filter((doc) => ["NDA", "Certificate", "General"].includes(doc.documentType)).length} technical/admin docs visible`],
                ].map(([title, copy]) => <div className={styles.row} key={title}><strong>{title}</strong><p className={styles.muted}>{copy}</p></div>)}
              </div>
            </div>
            <div className={`${styles.card} ${styles.span4}`}>
              <div className={styles.rowHeader}>
                <h2 className={styles.cardTitle}><PenLine size={16} /> Content</h2>
                <span className={styles.pill}>{data.tasks.filter((task) => task.ownerRole === "content" || task.title.toLowerCase().includes("content")).length} tasks</span>
              </div>
              <div className={styles.list}>
                {data.tasks.filter((task) => task.ownerRole === "content" || task.title.toLowerCase().includes("content")).slice(0, 3).map((task) => (
                  <div className={styles.row} key={task.id}>
                    <div className={styles.rowHeader}><strong>{task.title}</strong><span className={styles.pill}>{task.status}</span></div>
                    <p className={styles.muted}>{task.description || "Content task ready for update."}</p>
                  </div>
                ))}
                {data.tasks.filter((task) => task.ownerRole === "content" || task.title.toLowerCase().includes("content")).length === 0 && <div className={styles.emptyState}>No content tasks.</div>}
              </div>
            </div>
            <div className={`${styles.card} ${styles.span4}`}>
              <div className={styles.rowHeader}>
                <h2 className={styles.cardTitle}><Target size={16} /> Sales</h2>
                <span className={styles.pill}>{actionableCrmRows.length} CRM rows</span>
              </div>
              <div className={styles.list}>
                {actionableCrmRows.slice(0, 3).map((row) => {
                  const rowData = row.data && typeof row.data === "object" ? row.data as Record<string, string> : {};
                  return (
                  <div className={styles.row} key={row.id}>
                    <div className={styles.rowHeader}><strong>{rowData["School Name"] || rowData.Company || `Row ${row.rowNumber}`}</strong><span className={row.status === "Callback" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{row.status}</span></div>
                    <p className={styles.muted}>{rowData["Phone Number"] || rowData.Phone || row.reason || "Open CRM follow-up."}</p>
                  </div>
                  );
                })}
                {actionableCrmRows.length === 0 && <div className={styles.emptyState}>No open CRM rows.</div>}
              </div>
            </div>

            <div className={`${styles.card} ${styles.span8}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Priority Work</h2>
                  <p className={styles.muted}>Newest visible tasks, due items, and blocked work.</p>
                </div>
              </div>
              <div className={styles.list}>{openTasks.length === 0 ? <div className={styles.emptyState}>No open tasks.</div> : openTasks.slice(0, 5).map((task) => (
                <div className={styles.row} key={task.id}>
                  <div className={styles.rowHeader}><strong>{task.title}</strong><span className={task.status === "Blocked" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{task.status}</span></div>
                  <p className={styles.muted}>{task.assignedName || displayRole(task.ownerRole)} {task.dueAt ? `- Due ${formatPortalDateTime(task.dueAt)}` : ""}</p>
                </div>
              ))}</div>
            </div>
            <div className={`${styles.card} ${styles.span4}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Meetings & Resources</h2>
                  <p className={styles.muted}>Next calls and useful files.</p>
                </div>
              </div>
              <div className={styles.list}>
                {upcomingMeetings.length === 0 ? <div className={styles.emptyState}>No upcoming meetings.</div> : upcomingMeetings.map((meeting) => (
                  <div className={styles.row} key={meeting.id}>
                    <strong>{meeting.title}</strong>
                    <p className={styles.muted}>{formatPortalDateTime(meeting.startsAt)}</p>
                  </div>
                ))}
                {recentResources.map((resource) => (
                  <div className={styles.row} key={`resource-${resource.id}`}>
                    <strong>{resource.title}</strong>
                    <p className={styles.muted}>{resource.resourceType} - {resource.audienceRoles}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${styles.card} ${styles.span6}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Notifications</h2>
                  <p className={styles.muted}>Unread operational updates for your role or account.</p>
                </div>
                <span className={styles.pill}>{data.notifications.filter((item) => !item.readAt).length} unread</span>
              </div>
              <div className={styles.list}>{data.notifications.length === 0 ? <div className={styles.emptyState}>No notifications.</div> : data.notifications.slice(0, 5).map((item) => (
                <div className={styles.row} key={item.id}>
                  <div className={styles.rowHeader}><strong>{item.title}</strong><span className={item.readAt ? `${styles.pill} ${styles.pillMuted}` : `${styles.pill} ${styles.pillWarn}`}>{item.readAt ? "Read" : "Unread"}</span></div>
                  <p>{item.body}</p>
                  {!item.readAt && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => markNotificationRead({ id: item.id.toString() }))}>Mark read</button>}
                </div>
              ))}</div>
            </div>
            <div className={`${styles.card} ${styles.span6}`}>
              <h2 className={styles.cardTitle}>Exports</h2>
              <p className={styles.muted}>Admin/HR can download operational data as CSV.</p>
              <div className={styles.toolbar}>
                {["employees", "attendance", "payroll", "crm", "expenses"].map((type) => (
                  <a className={styles.ghostButton} href={`/api/employee/export?type=${type}`} key={type}>{type}</a>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "profile" && (
          <section className={styles.grid}>
            <div className={`${styles.dashboardHero} ${styles.span12}`}>
              <div>
                <div className={styles.eyebrow}>My Profile</div>
                <h1 className={styles.heroTitle}>Account, ID card, and password security.</h1>
                <p className={styles.muted}>Update your password after first login and keep your account access private.</p>
              </div>
              <div className={styles.heroActions}>
                {currentEmployee && <a className={styles.ghostButton} href={idCardUrlFor(currentEmployee)} target="_blank" rel="noopener noreferrer">Open ID Card</a>}
                {currentEmployee && <a className={styles.ghostButton} href={idCardUrlFor(currentEmployee, true)}>Download ID Card</a>}
              </div>
            </div>
            <div className={`${styles.card} ${styles.span5}`}>
              <h2 className={styles.cardTitle}>Profile Summary</h2>
              <div className={styles.profileCard}>
                <div className={styles.profileAvatar}>{data.session.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{data.session.name}</strong>
                  <p className={styles.muted}>{data.session.email}</p>
                  <span className={styles.pill}>{roleLabel}</span>
                </div>
              </div>
              {currentEmployee && (
                <div className={styles.list}>
                  <div className={styles.row}><span className={styles.label}>Department</span><strong>{currentEmployee.department}</strong></div>
                  <div className={styles.row}><span className={styles.label}>Employee Type</span><strong>{currentEmployee.employeeType}</strong></div>
                  <div className={styles.row}><span className={styles.label}>Work Window</span><strong>{currentEmployee.workStartTime} to {currentEmployee.workEndTime}</strong></div>
                </div>
              )}
            </div>
            <form className={`${styles.card} ${styles.span7} ${styles.formGrid}`} onSubmit={submit(changeEmployeePassword)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Reset Password</h2>
              <p className={`${styles.muted} ${styles.fieldWide}`}>Default password for new accounts is abc123. Replace it with a private password after first login.</p>
              <Field label="Current Password" name="currentPassword" type="password" required wide />
              <Field label="New Password" name="newPassword" type="password" required />
              <Field label="Confirm Password" name="confirmPassword" type="password" required />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Password</button>
            </form>
          </section>
        )}

        {tab === "crm" && (
          <CrmTab
            data={data}
            runAction={runAction}
            activeCrmSheetId={activeCrmSheetId}
            setActiveCrmSheetId={setActiveCrmSheetId}
            selectedCrmRowId={selectedCrmRowId}
            setSelectedCrmRowId={setSelectedCrmRowId}
            selectedCrmCell={selectedCrmCell}
            setSelectedCrmCell={setSelectedCrmCell}
            setError={setError}
            submit={submit}
            handleCellChange={handleCellChange}
          />
        )}

        {tab === "applicants" && (
          <ApplicantsTab
            data={data}
            runAction={runAction}
            copyApplicationLink={copyApplicationLink}
            applicationLink={applicationLink}
            submit={submit}
            formatPortalDateTime={formatPortalDateTime}
            downloadCsv={downloadCsv}
          />
        )}

        {tab === "ops" && (
          <section className={styles.grid}>
            {data.capabilities.canManageOps && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveAttendance)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Attendance Entry</h2>
                <Field label="Employee" name="employeeId" options={employeeOptions} required wide />
                <Field label="Work Date" name="workDate" type="date" required />
                <Field label="Login At" name="loginAt" type="datetime-local" />
                <Field label="Logout At" name="logoutAt" type="datetime-local" />
                <Field label="Total Hours" name="totalHours" type="number" />
                <Field label="Status" name="status" options={["Present", "Absent", "Late", "Half-day", "Remote"]} />
                <Field label="Notes" name="notes" textarea wide />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Attendance</button>
              </form>
            )}
            <div className={`${styles.card} ${data.capabilities.canManageOps ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Attendance & Timesheets</h2>
                  <p className={styles.muted}>Track daily status, hours, late logins, remote work, and absences.</p>
                </div>
                <span className={styles.pill}>{data.attendance.length} records</span>
              </div>
              <div className={styles.list}>{data.attendance.length === 0 ? <div className={styles.emptyState}>No attendance records yet.</div> : data.attendance.map((entry) => (
                <div className={styles.row} key={entry.id}>
                  <div className={styles.rowHeader}><strong>{entry.employeeName}</strong><span className={entry.logoutAt ? styles.pill : `${styles.pill} ${styles.pillSuccess}`}>{entry.logoutAt ? entry.status : "Working now"}</span></div>
                  <p className={styles.muted}>
                    {formatPortalDate(entry.workDate)} - In: {formatPortalDateTime(entry.loginAt)} - Out: {entry.logoutAt ? formatPortalDateTime(entry.logoutAt) : "Still working"} - {entry.totalHours.toFixed(2)} hours
                  </p>
                  {entry.notes && <p>{entry.notes}</p>}
                  {data.capabilities.canManageOps && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "attendance", id: entry.id.toString() }))}>Delete</button>}
                </div>
              ))}</div>
            </div>

            <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveLeaveRequest)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Leave Request</h2>
              {data.capabilities.canManageOps && <Field label="Employee" name="employeeId" options={employeeOptions} wide />}
              <Field label="Leave Type" name="leaveType" options={["Casual", "Sick", "Unpaid", "Emergency", "Comp Off"]} />
              <Field label="Starts" name="startsAt" type="date" required />
              <Field label="Ends" name="endsAt" type="date" required />
              {data.capabilities.canManageOps && <Field label="Status" name="status" options={["Pending", "Approved", "Rejected"]} />}
              <Field label="Reason" name="reason" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Leave</button>
            </form>
            <div className={`${styles.card} ${styles.span8}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Leave Board</h2>
                  <p className={styles.muted}>Employees can request leave; admin/HR can add and mark approval status.</p>
                </div>
                <span className={styles.pill}>{data.leaveRequests.length} requests</span>
              </div>
              <div className={styles.list}>{data.leaveRequests.length === 0 ? <div className={styles.emptyState}>No leave requests yet.</div> : data.leaveRequests.map((leave) => (
                <div className={styles.row} key={leave.id}>
                  <div className={styles.rowHeader}><strong>{leave.employeeName}</strong><span className={leave.status === "Approved" ? `${styles.pill} ${styles.pillSuccess}` : leave.status === "Rejected" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{leave.status}</span></div>
                  <p className={styles.muted}>{leave.leaveType} - {formatPortalDate(leave.startsAt)} to {formatPortalDate(leave.endsAt)}</p>
                  {leave.reason && <p>{leave.reason}</p>}
                  {data.capabilities.canManageOps && (
                    <div className={styles.toolbar}>
                      <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "leave", id: leave.id.toString(), status: "Approved" }))}>Approve</button>
                      <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "leave", id: leave.id.toString(), status: "Rejected" }))}>Reject</button>
                      <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "leave", id: leave.id.toString() }))}>Delete</button>
                    </div>
                  )}
                </div>
              ))}</div>
            </div>

            <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveTask)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Assign Task</h2>
              <Field label="Title" name="title" required wide />
              <Field label="Assign To" name="assignedTo" options={[{ label: "Role based / unassigned", value: "" }, ...employeeOptions]} wide />
              <Field label="Owner Role" name="ownerRole" options={ownerRoleOptions} />
              <Field label="Priority" name="priority" options={["High", "Medium", "Low"]} />
              <Field label="Status" name="status" options={["Open", "In Progress", "Blocked", "Done"]} />
              <Field label="Due At" name="dueAt" type="datetime-local" />
              <Field label="Proof URL" name="proofUrl" type="url" wide />
              <Field label="Description" name="description" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Task</button>
            </form>
            <div className={`${styles.card} ${styles.span8}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Task Tracker</h2>
                  <p className={styles.muted}>Assign by person or role, track status, priority, due date, and proof links.</p>
                </div>
                <span className={styles.pill}>{data.tasks.length} visible</span>
              </div>
              <div className={styles.list}>{data.tasks.length === 0 ? <div className={styles.emptyState}>No tasks yet.</div> : data.tasks.map((task) => (
                <div className={styles.row} key={task.id}>
                  <div className={styles.rowHeader}><strong>{task.title}</strong><span className={task.priority === "High" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{task.priority}</span></div>
                  <p className={styles.muted}>{task.assignedName || displayRole(task.ownerRole)} - {task.status}{task.dueAt ? ` - Due ${formatPortalDateTime(task.dueAt)}` : ""}</p>
                  {task.proofUrl && <a href={task.proofUrl} target="_blank" rel="noopener noreferrer">Open proof</a>}
                  <div className={styles.toolbar}>
                    {["In Progress", "Blocked", "Done"].map((status) => <button className={styles.ghostButton} key={status} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "task", id: task.id.toString(), status }))}>{status}</button>)}
                    {data.capabilities.canManageOps && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "task", id: task.id.toString() }))}>Delete</button>}
                  </div>
                  {data.capabilities.canManageOps && (
                    <details className={styles.editPanel}>
                      <summary>Edit task</summary>
                      <form className={styles.formGrid} onSubmit={submit(saveTask)}>
                        <input type="hidden" name="id" value={task.id} />
                        <Field label="Title" name="title" defaultValue={task.title} required wide />
                        <Field label="Assign To" name="assignedTo" options={[{ label: "Role based / unassigned", value: "" }, ...employeeOptions]} defaultValue={task.assignedTo?.toString() || ""} wide />
                        <Field label="Owner Role" name="ownerRole" options={ownerRoleOptions} defaultValue={task.ownerRole} />
                        <Field label="Priority" name="priority" options={["High", "Medium", "Low"]} defaultValue={task.priority} />
                        <Field label="Status" name="status" options={["Open", "In Progress", "Blocked", "Done"]} defaultValue={task.status} />
                        <Field label="Due At" name="dueAt" type="datetime-local" defaultValue={inputDateTime(task.dueAt)} />
                        <Field label="Proof URL" name="proofUrl" type="url" defaultValue={task.proofUrl || ""} wide />
                        <Field label="Description" name="description" textarea defaultValue={task.description || ""} wide />
                        <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Task</button>
                      </form>
                    </details>
                  )}
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "expenses" && (
          <section className={styles.grid}>
            <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveExpenseClaim)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Expense Claim</h2>
              {data.capabilities.canManageOps && <Field label="Employee" name="employeeId" options={employeeOptions} wide />}
              <Field label="Category" name="category" options={["Travel", "Food", "Software", "Office", "General"]} />
              <Field label="Amount" name="amount" type="number" required />
              <Field label="Claim Date" name="claimDate" type="date" required />
              <Field label="Receipt URL" name="receiptUrl" type="url" wide />
              {data.capabilities.canManageOps && <Field label="Status" name="status" options={["Pending", "Approved", "Rejected", "Paid"]} />}
              <Field label="Notes" name="notes" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Expense</button>
            </form>
            <div className={`${styles.card} ${styles.span8}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Expense Claims</h2>
                  <p className={styles.muted}>Submit receipts and approve or reject monthly claims.</p>
                </div>
                <span className={styles.pill}>{data.expenses.length} claims</span>
              </div>
              <div className={styles.list}>{data.expenses.length === 0 ? <div className={styles.emptyState}>No expense claims yet.</div> : data.expenses.map((claim) => (
                <div className={styles.row} key={claim.id}>
                  <div className={styles.rowHeader}><strong>{claim.employeeName}</strong><span className={styles.pill}>{claim.status}</span></div>
                  <p className={styles.muted}>{claim.category} - Rs. {formatPortalNumber(claim.amount)} - {formatPortalDate(claim.claimDate)}</p>
                  {claim.receiptUrl && <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer">Open receipt</a>}
                  {data.capabilities.canManageOps && <div className={styles.toolbar}>{["Approved", "Rejected", "Paid"].map((status) => <button className={styles.ghostButton} key={status} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "expense", id: claim.id.toString(), status }))}>{status}</button>)}<button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "expense", id: claim.id.toString() }))}>Delete</button></div>}
                  {data.capabilities.canManageExpenses && (
                    <details className={styles.editPanel}>
                      <summary>Edit expense</summary>
                      <form className={styles.formGrid} onSubmit={submit(saveExpenseClaim)}>
                        <input type="hidden" name="id" value={claim.id} />
                        <Field label="Employee" name="employeeId" options={employeeOptions} defaultValue={claim.employeeId.toString()} wide />
                        <Field label="Category" name="category" options={["Travel", "Food", "Software", "Office", "General"]} defaultValue={claim.category} />
                        <Field label="Amount" name="amount" type="number" defaultValue={claim.amount.toString()} required />
                        <Field label="Claim Date" name="claimDate" type="date" defaultValue={inputDate(claim.claimDate)} required />
                        <Field label="Receipt URL" name="receiptUrl" type="url" defaultValue={claim.receiptUrl || ""} wide />
                        <Field label="Status" name="status" options={["Pending", "Approved", "Rejected", "Paid"]} defaultValue={claim.status} />
                        <Field label="Notes" name="notes" textarea defaultValue={claim.notes || ""} wide />
                        <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Expense</button>
                      </form>
                    </details>
                  )}
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "payroll" && (
          <section className={styles.grid}>
            <div className={`${styles.dashboardHero} ${styles.span12}`}>
              <div>
                <div className={styles.eyebrow}>Salary Management</div>
                <h1 className={styles.heroTitle}>Payroll overview for employees, interns, and paid contractors.</h1>
                <p className={styles.muted}>Review monthly payroll, mark payment status, and export payroll records without opening multiple forms.</p>
              </div>
              <div className={styles.heroActions}>
                <button className={styles.button} type="button" onClick={() => downloadCsv("bluevolt-payroll.csv", payrollRows)}>Export CSV</button>
              </div>
            </div>
            <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
              <span className={styles.muted}>Total Payroll</span>
              <span className={styles.metricValue}>Rs. {formatPortalNumber(payrollTotal)}</span>
            </div>
            <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
              <span className={styles.muted}>Ready to Pay</span>
              <span className={styles.metricValue}>{payrollReady}</span>
            </div>
            <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
              <span className={styles.muted}>Paid</span>
              <span className={styles.metricValue}>{payrollPaid}</span>
            </div>
            <div className={`${styles.card} ${styles.metricCard} ${styles.span3}`}>
              <span className={styles.muted}>Employees</span>
              <span className={styles.metricValue}>{employees.length}</span>
            </div>
            {data.capabilities.canManagePayroll && (
              <details className={`${styles.card} ${styles.span12} ${styles.editPanel}`}>
                <summary>Add payroll record</summary>
                <form className={styles.formGrid} onSubmit={submit(savePayrollInput)}>
                  <Field label="Employee" name="employeeId" options={employeeOptions} required wide />
                  <Field label="Pay Period" name="payPeriod" placeholder="2026-05" required />
                  <Field label="Pay Type" name="payType" options={["Salary", "Stipend", "Contract", "Bonus Only"]} />
                  <Field label="Amount" name="amount" type="number" />
                  <Field label="Working Days" name="workingDays" type="number" />
                  <Field label="Unpaid Leave Days" name="unpaidLeaveDays" type="number" />
                  <Field label="Bonus" name="bonus" type="number" />
                  <Field label="Deductions" name="deductions" type="number" />
                  <Field label="Status" name="status" options={["Draft", "Ready", "Paid", "Hold"]} />
                  <Field label="Notes" name="notes" textarea wide />
                  <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Payroll</button>
                </form>
              </details>
            )}
            <div className={`${styles.card} ${styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Payroll Inputs</h2>
                  <p className={styles.muted}>Salary/stipend, unpaid leave, bonus, deductions, and payment status.</p>
                </div>
                <span className={styles.pill}>{data.payrollInputs.length} records</span>
              </div>
              <div className={styles.smartTable}>
                <div className={styles.smartTableHeader}>
                  <span>Employee</span>
                  <span>Period</span>
                  <span>Type</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {data.payrollInputs.length === 0 ? <div className={styles.emptyState}>No payroll records yet.</div> : data.payrollInputs.map((payroll) => (
                  <div className={styles.smartTableRow} key={payroll.id}>
                    <div className={styles.identityCell}>
                      <span className={styles.avatar}>{payroll.employeeName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                      <span><strong>{payroll.employeeName}</strong><small>{payroll.workingDays} working days, {payroll.unpaidLeaveDays} unpaid leave</small></span>
                    </div>
                    <span>{payroll.payPeriod}</span>
                    <span>{payroll.payType}</span>
                    <strong>Rs. {formatPortalNumber(payroll.amount)}</strong>
                    <span className={payroll.status === "Paid" ? `${styles.pill} ${styles.pillSuccess}` : payroll.status === "Hold" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{payroll.status}</span>
                    {data.capabilities.canManagePayroll && (
                      <span className={styles.actionStack}>
                        {["Ready", "Paid", "Hold"].map((status) => <button className={styles.ghostButton} key={status} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "payroll", id: payroll.id.toString(), status }))}>{status}</button>)}
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "payroll", id: payroll.id.toString() }))}>Delete</button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "reports" && (
          <section className={styles.grid}>
            <div className={`${styles.dashboardHero} ${styles.span12}`}>
              <div>
                <div className={styles.eyebrow}>Reports</div>
                <h1 className={styles.heroTitle}>Download the operating data you need.</h1>
                <p className={styles.muted}>Employees, applications, payroll, attendance, CRM, resources, documents, and expenses can be exported for reviews or backups.</p>
              </div>
              <div className={styles.heroActions}>
                <button className={styles.button} type="button" onClick={() => {
                  downloadCsv("bluevolt-all-reports-summary.csv", [
                    { report: "employees", records: employees.length },
                    { report: "applicants", records: data.applicants.length },
                    { report: "attendance", records: data.attendance.length },
                    { report: "payroll", records: data.payrollInputs.length },
                    { report: "resources", records: data.resources.length },
                    { report: "documents", records: data.documents.length },
                    { report: "expenses", records: data.expenses.length },
                  ]);
                }}>Export Summary</button>
              </div>
            </div>
            {[
              { title: "Employee Report", hint: "Roster, roles, work type, paid/unpaid status", count: employees.length, action: () => downloadCsv("bluevolt-employees.csv", employeeRows) },
              { title: "Applicant Report", hint: "Public form submissions and decisions", count: data.applicants.length, action: () => downloadCsv("bluevolt-applicants.csv", applicantRows) },
              { title: "Attendance Report", hint: "Check-in, check-out, and total hours", count: data.attendance.length, action: () => downloadCsv("bluevolt-attendance.csv", attendanceRows) },
              { title: "Payroll Report", hint: "Salary/stipend inputs and status", count: data.payrollInputs.length, action: () => downloadCsv("bluevolt-payroll.csv", payrollRows) },
              { title: "Resource Report", hint: "Links, files, tags, and role visibility", count: data.resources.length, action: () => downloadCsv("bluevolt-resources.csv", data.resources.map((item) => ({ title: item.title, type: item.resourceType, url: item.url, audience: item.audienceRoles, tags: item.tags || "" }))) },
              { title: "Expense Report", hint: "Claims, receipts, amounts, and status", count: data.expenses.length, action: () => downloadCsv("bluevolt-expenses.csv", data.expenses.map((item) => ({ employee: item.employeeName, category: item.category, amount: item.amount, date: formatPortalDate(item.claimDate), status: item.status, receipt: item.receiptUrl || "" }))) },
            ].map((report) => (
              <div className={`${styles.card} ${styles.span4} ${styles.reportCard}`} key={report.title}>
                <div>
                  <h2 className={styles.cardTitle}>{report.title}</h2>
                  <p className={styles.muted}>{report.hint}</p>
                </div>
                <div className={styles.rowHeader}>
                  <span className={styles.metricValue}>{report.count}</span>
                  <button className={styles.button} type="button" onClick={report.action}>Download</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "reviews" && (
          <section className={styles.grid}>
            {data.capabilities.canReviewPerformance && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(savePerformanceReview)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Performance Review</h2>
                <Field label="Employee" name="employeeId" options={employeeOptions} required wide />
                <Field label="Review Period" name="reviewPeriod" placeholder="May 2026" required />
                <Field label="Score" name="score" type="number" />
                <Field label="Status" name="status" options={["Draft", "Shared", "Final"]} />
                <Field label="KPI Summary" name="kpiSummary" textarea wide />
                <Field label="Strengths" name="strengths" textarea wide />
                <Field label="Improvements" name="improvements" textarea wide />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Review</button>
              </form>
            )}
            <div className={`${styles.card} ${data.capabilities.canReviewPerformance ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Performance Reviews</h2>
                  <p className={styles.muted}>Monthly scorecards, KPI notes, strengths, and improvement plans.</p>
                </div>
                <span className={styles.pill}>{data.reviews.length} reviews</span>
              </div>
              <div className={styles.list}>{data.reviews.length === 0 ? <div className={styles.emptyState}>No reviews yet.</div> : data.reviews.map((review) => (
                <div className={styles.row} key={review.id}>
                  <div className={styles.rowHeader}><strong>{review.employeeName}</strong><span className={styles.pill}>{review.score}/10</span></div>
                  <p className={styles.muted}>{review.reviewPeriod} - {review.status}</p>
                  {review.kpiSummary && <p>{review.kpiSummary}</p>}
                  {data.capabilities.canReviewPerformance && (
                    <>
                      <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "review", id: review.id.toString() }))}>Delete</button>
                      <details className={styles.editPanel}>
                        <summary>Edit review</summary>
                        <form className={styles.formGrid} onSubmit={submit(savePerformanceReview)}>
                          <input type="hidden" name="id" value={review.id} />
                          <Field label="Employee" name="employeeId" options={employeeOptions} defaultValue={review.employeeId.toString()} required wide />
                          <Field label="Review Period" name="reviewPeriod" defaultValue={review.reviewPeriod} required />
                          <Field label="Score" name="score" type="number" defaultValue={review.score.toString()} />
                          <Field label="Status" name="status" options={["Draft", "Shared", "Final"]} defaultValue={review.status} />
                          <Field label="KPI Summary" name="kpiSummary" textarea defaultValue={review.kpiSummary || ""} wide />
                          <Field label="Strengths" name="strengths" textarea defaultValue={review.strengths || ""} wide />
                          <Field label="Improvements" name="improvements" textarea defaultValue={review.improvements || ""} wide />
                          <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Review</button>
                        </form>
                      </details>
                    </>
                  )}
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "documents" && (
          <section className={styles.grid}>
            {data.capabilities.canManageDocuments && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveEmployeeDocument)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Employee Document</h2>
                <Field label="Employee" name="employeeId" options={[{ label: "General document", value: "" }, ...employeeOptions]} wide />
                <Field label="Title" name="title" required />
                <Field label="Type" name="documentType" options={["Offer Letter", "NDA", "ID Proof", "Resume", "Certificate", "Payslip", "General"]} />
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Upload File</span>
                  <input className={styles.input} type="file" onChange={(event) => uploadFile(event.target.files?.[0])} />
                </label>
                {uploadedFile ? (
                  <input type="hidden" name="url" value={uploadedFile.url} />
                ) : (
                  <Field label="URL" name="url" type="url" wide />
                )}
                <input type="hidden" name="fileName" value={uploadedFile?.fileName || ""} />
                <input type="hidden" name="fileSize" value={uploadedFile?.fileSize || ""} />
                <input type="hidden" name="mimeType" value={uploadedFile?.mimeType || ""} />
                <Field label="Visibility Roles" name="visibilityRoles" defaultValue="super_admin,director,authorized_signatory,admin,hr" wide />
                <Field label="Notes" name="notes" textarea wide />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Document</button>
              </form>
            )}
            <div className={`${styles.card} ${data.capabilities.canManageDocuments ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Employee Documents</h2>
                  <p className={styles.muted}>Offer letters, NDA, ID proof, resumes, certificates, payslips, and private links.</p>
                </div>
                <span className={styles.pill}>{data.documents.length} documents</span>
              </div>
              <div className={styles.list}>{data.documents.length === 0 ? <div className={styles.emptyState}>No documents yet.</div> : data.documents.map((document) => (
                <div className={styles.row} key={document.id}>
                  <div className={styles.rowHeader}>
                    <strong>{document.title}</strong>
                    <div className={styles.compactMeta}>
                      <span className={styles.pill}>{document.documentType}</span>
                      <span className={documentApproved(document.notes) ? `${styles.pill} ${styles.pillSuccess}` : documentPending(document.notes) ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>
                        {documentApproved(document.notes) ? "Signed" : documentPending(document.notes) ? "Pending approval" : "General"}
                      </span>
                    </div>
                  </div>
                  <p className={styles.muted}>{document.employeeName || "General"} - {document.visibilityRoles}</p>
                  {cleanDocumentNotes(document.notes) && <p className={styles.muted}>{cleanDocumentNotes(document.notes)}</p>}
                  <a href={document.url} target="_blank" rel="noopener noreferrer">Open document</a>
                  {data.capabilities.canSignDocuments && !documentApproved(document.notes) && (
                    <button className={styles.button} type="button" onClick={() => runAction(() => approveEmployeeDocument({ id: document.id.toString() }))}>Approve & Sign</button>
                  )}
                  {data.capabilities.canManageDocuments && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "document", id: document.id.toString() }))}>Delete</button>}
                  {data.capabilities.canManageDocuments && (
                    <details className={styles.editPanel}>
                      <summary>Edit document</summary>
                      <form className={styles.formGrid} onSubmit={submit(saveEmployeeDocument)}>
                        <input type="hidden" name="id" value={document.id} />
                        <Field label="Employee" name="employeeId" options={[{ label: "General document", value: "" }, ...employeeOptions]} defaultValue={document.employeeId?.toString() || ""} wide />
                        <Field label="Title" name="title" defaultValue={document.title} required />
                        <Field label="Type" name="documentType" options={["Offer Letter", "NDA", "ID Proof", "Resume", "Certificate", "Payslip", "General"]} defaultValue={document.documentType} />
                        <Field label="URL" name="url" type="url" defaultValue={document.url} wide />
                        <Field label="Visibility Roles" name="visibilityRoles" defaultValue={document.visibilityRoles} wide />
                        <Field label="Notes" name="notes" textarea defaultValue={document.notes || ""} wide />
                        <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Document</button>
                      </form>
                    </details>
                  )}
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "announcements" && (
          <section className={styles.grid}>
            {data.capabilities.canPublishAnnouncements && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveAnnouncement)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Publish Announcement</h2>
                <Field label="Title" name="title" required wide />
                <Field label="Audience Roles" name="audienceRoles" options={ownerRoleOptions} defaultValue="all" wide />
                <Field label="Priority" name="priority" options={["Normal", "Important", "Urgent"]} />
                <Field label="Body" name="body" textarea wide required />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Publish</button>
              </form>
            )}
            <div className={`${styles.card} ${data.capabilities.canPublishAnnouncements ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Announcements</h2>
                  <p className={styles.muted}>Broadcast updates to all employees or selected roles.</p>
                </div>
                <span className={styles.pill}>{data.announcements.length} visible</span>
              </div>
              <div>{data.announcements.length === 0 ? <div className={styles.emptyState}>No announcements yet.</div> : data.announcements.map((announcement) => (
                <div className={`${styles.announcementCard} ${announcement.priority === "Urgent" ? styles.announcementCardUrgent : announcement.priority === "Important" ? styles.announcementCardImportant : styles.announcementCardNormal}`} key={announcement.id}>
                  <div className={styles.rowHeader}>
                    <strong style={{ fontSize: "1.1rem" }}>{announcement.title}</strong>
                    <span className={announcement.priority === "Urgent" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>
                      {announcement.priority}
                    </span>
                  </div>
                  <p style={{ margin: "8px 0", lineHeight: "1.5", fontSize: "0.95rem" }}>{announcement.body}</p>
                  <p className={styles.muted} style={{ fontSize: "0.82rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                    <span>Visible to: {displayRole(announcement.audienceRoles)}</span>
                    <span>{formatPortalTimeAgo(announcement.createdAt)}</span>
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
                    {data.capabilities.canPublishAnnouncements && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.8rem", padding: "6px 14px", minHeight: 34, color: "#f87171" }} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "announcement", id: announcement.id.toString() }))}>
                        Delete
                      </button>
                    )}
                    {data.capabilities.canPublishAnnouncements && (
                      <details className={styles.editPanel} style={{ width: "100%", marginTop: 8 }}>
                        <summary style={{ fontSize: "0.78rem" }}>Edit announcement</summary>
                        <form className={styles.formGrid} onSubmit={submit(saveAnnouncement)} style={{ marginTop: 8 }}>
                          <input type="hidden" name="id" value={announcement.id} />
                          <Field label="Title" name="title" defaultValue={announcement.title} required wide />
                          <Field label="Audience Roles" name="audienceRoles" options={audienceOptionsForValue(announcement.audienceRoles)} defaultValue={announcement.audienceRoles} wide />
                          <Field label="Priority" name="priority" options={["Normal", "Important", "Urgent"]} defaultValue={announcement.priority} />
                          <Field label="Body" name="body" textarea defaultValue={announcement.body} wide required />
                          <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Announcement</button>
                        </form>
                      </details>
                    )}
                  </div>
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "meetings" && (
          <section className={styles.grid}>
            {data.capabilities.canScheduleMeetings && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveMeeting)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Schedule Google Meet</h2>
                <Field label="Title" name="title" required wide />
                <Field label="Starts At" name="startsAt" type="datetime-local" required />
                <Field label="Ends At" name="endsAt" type="datetime-local" required />
                <Field label="Meet URL" name="meetUrl" type="url" wide />
                <Field label="Audience Roles" name="audienceRoles" options={ownerRoleOptions} defaultValue="all" wide />
                <Field label="Applicant Name" name="applicantName" />
                <Field label="Applicant Email" name="applicantEmail" type="email" />
                <Field label="Notes" name="notes" textarea wide />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Meeting</button>
              </form>
            )}
            <div className={`${styles.card} ${data.capabilities.canScheduleMeetings ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Meeting Schedule</h2>
                  <p className={styles.muted}>Meet links can be opened directly or added to Google Calendar.</p>
                </div>
                <span className={styles.pill}>{data.meetings.length} visible</span>
              </div>
              <div className={styles.meetingTimeline}>
                {data.meetings.length === 0 ? (
                  <div className={styles.emptyState}>No visible meetings yet.</div>
                ) : (
                  data.meetings.map((meeting) => (
                    <div className={styles.meetingTimelineCard} key={meeting.id}>
                      <div className={styles.rowHeader}>
                        <strong style={{ fontSize: "1.05rem" }}>{meeting.title}</strong>
                        <span className={styles.pill}>{displayRole(meeting.audienceRoles)}</span>
                      </div>
                      <p className={styles.muted} style={{ fontSize: "0.84rem", margin: "6px 0 12px" }}>
                        {formatPortalDateTime(meeting.startsAt)} – {formatPortalDateTime(meeting.endsAt)}
                      </p>
                      {meeting.notes && (
                        <p className={styles.muted} style={{ fontSize: "0.84rem", background: "var(--bg-shell)", padding: "10px 14px", borderRadius: 8, margin: "8px 0 12px", borderLeft: "3px solid var(--border-color)" }}>
                          {meeting.notes}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        {meeting.meetUrl && (
                          <a className={styles.button} href={meeting.meetUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", padding: "6px 14px", minHeight: 34, fontSize: "0.8rem", textDecoration: "none", alignItems: "center" }}>
                            Join Google Meet
                          </a>
                        )}
                        <a className={styles.ghostButton} href={meeting.calendarUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 14px", minHeight: 34, fontSize: "0.8rem" }}>
                          Add to Calendar
                        </a>
                        {data.capabilities.canScheduleMeetings && (
                          <button className={styles.ghostButton} style={{ padding: "6px 14px", minHeight: 34, fontSize: "0.8rem", color: "#f87171" }} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "meeting", id: meeting.id.toString() }))}>
                            Delete
                          </button>
                        )}
                      </div>
                      {data.capabilities.canScheduleMeetings && (
                        <details className={styles.editPanel} style={{ marginTop: 12 }}>
                          <summary style={{ fontSize: "0.78rem" }}>Edit meeting</summary>
                          <form className={styles.formGrid} onSubmit={submit(saveMeeting)} style={{ marginTop: 8 }}>
                            <input type="hidden" name="id" value={meeting.id} />
                            <Field label="Title" name="title" defaultValue={meeting.title} required wide />
                            <Field label="Starts At" name="startsAt" type="datetime-local" defaultValue={inputDateTime(meeting.startsAt)} required />
                            <Field label="Ends At" name="endsAt" type="datetime-local" defaultValue={inputDateTime(meeting.endsAt)} required />
                            <Field label="Meet URL" name="meetUrl" type="url" defaultValue={meeting.meetUrl || ""} wide />
                            <Field label="Audience Roles" name="audienceRoles" options={audienceOptionsForValue(meeting.audienceRoles)} defaultValue={meeting.audienceRoles} wide />
                            <Field label="Applicant Name" name="applicantName" defaultValue={meeting.applicantName || ""} />
                            <Field label="Applicant Email" name="applicantEmail" type="email" defaultValue={meeting.applicantEmail || ""} />
                            <Field label="Notes" name="notes" textarea defaultValue={meeting.notes || ""} wide />
                            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Meeting</button>
                          </form>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "resources" && (
          <section className={styles.grid}>
            {data.capabilities.canManageResources && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveResource)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Publish Resource</h2>
                <Field label="Title" name="title" required />
                <Field label="Type" name="resourceType" options={["Link", "PDF", "Excel", "PowerPoint", "Document", "Image", "Video", "Other"]} />
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Upload File</span>
                  <input className={styles.input} type="file" onChange={(event) => uploadFile(event.target.files?.[0])} />
                  {uploadedFile && <span className={styles.muted}>Uploaded: {uploadedFile.fileName}. This link will be saved as the resource.</span>}
                </label>
                {uploadedFile ? (
                  <input type="hidden" name="url" value={uploadedFile.url} />
                ) : (
                  <Field label="URL" name="url" type="url" required wide />
                )}
                <Field label="Audience Roles" name="audienceRoles" options={ownerRoleOptions} defaultValue="all" wide />
                <Field label="Tags" name="tags" wide />
                <Field label="Description" name="description" textarea wide />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Publish Resource</button>
              </form>
            )}
            <div className={`${styles.card} ${data.capabilities.canManageResources ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Resource Library</h2>
                  <p className={styles.muted}>Sort and filter role-visible resources by file type.</p>
                </div>
                <div className={styles.toolbar}>
                  <select className={styles.select} style={{ maxWidth: 170 }} value={resourceTypeFilter} onChange={(event) => setResourceTypeFilter(event.target.value)}>
                    <option value="all">All types</option>
                    {["Link", "PDF", "Excel", "PowerPoint", "Document", "Image", "Video", "Other"].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <select className={styles.select} style={{ maxWidth: 150 }} value={sortResources} onChange={(event) => {
                    setSortResources(event.target.value);
                    refresh(event.target.value);
                  }}>
                    <option value="newest">Newest</option>
                    <option value="title">Title</option>
                    <option value="type">Type</option>
                  </select>
                </div>
              </div>
              <div className={styles.resourceCardGrid}>{filteredResources.length === 0 ? <div className={styles.emptyState}>No matching resources.</div> : filteredResources.map((resource) => {
                const renderIcon = () => {
                  switch (resource.resourceType) {
                    case "Link": return "🔗";
                    case "PDF": return "📄";
                    case "Excel": return "📊";
                    case "PowerPoint": return "📉";
                    case "Document": return "📝";
                    case "Image": return "🖼️";
                    case "Video": return "🎥";
                    default: return "📁";
                  }
                };
                return (
                  <div className={styles.resourceCard} key={resource.id}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div className={styles.rowHeader} style={{ alignItems: "flex-start", gap: 8, marginBottom: 0 }}>
                        <strong style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{renderIcon()}</span>
                          {resource.title}
                        </strong>
                        <span className={styles.pill}>{resource.resourceType}</span>
                      </div>
                      <p className={styles.muted} style={{ fontSize: "0.82rem", margin: 0 }}>
                        Visible to: {displayRole(resource.audienceRoles)} {resource.tags ? `• ${resource.tags}` : ""}
                      </p>
                      {resource.description && (
                        <p className={styles.muted} style={{ fontSize: "0.85rem", marginTop: 4, background: "var(--bg-shell)", padding: "8px 12px", borderRadius: 8, borderLeft: "3px solid var(--border-color)", lineHeight: "1.4" }}>
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <a className={styles.button} href={resource.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "6px 14px", minHeight: 34, display: "inline-flex", alignItems: "center" }}>
                          Open / Download
                        </a>
                        {data.capabilities.canManageResources && (
                          <button className={styles.ghostButton} style={{ fontSize: "0.8rem", padding: "6px 14px", minHeight: 34, color: "#f87171" }} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "resource", id: resource.id.toString() }))}>
                            Delete
                          </button>
                        )}
                      </div>
                      {data.capabilities.canManageResources && (
                        <details className={styles.editPanel} style={{ marginTop: 8 }}>
                          <summary style={{ fontSize: "0.78rem" }}>Edit resource</summary>
                          <form className={styles.formGrid} onSubmit={submit(saveResource)} style={{ marginTop: 8 }}>
                            <input type="hidden" name="id" value={resource.id} />
                            <Field label="Title" name="title" defaultValue={resource.title} required />
                            <Field label="Type" name="resourceType" options={["Link", "PDF", "Excel", "PowerPoint", "Document", "Image", "Video", "Other"]} defaultValue={resource.resourceType} />
                            <Field label="URL" name="url" type="url" defaultValue={resource.url} required wide />
                            <Field label="Audience Roles" name="audienceRoles" options={audienceOptionsForValue(resource.audienceRoles)} defaultValue={resource.audienceRoles} wide />
                            <Field label="Tags" name="tags" defaultValue={resource.tags || ""} wide />
                            <Field label="Description" name="description" textarea defaultValue={resource.description || ""} wide />
                            <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Resource</button>
                          </form>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}</div>
            </div>
          </section>
        )}

        {tab === "access" && (
          <PrivilegesTab
            data={data}
            runAction={runAction}
            formatPortalDateTime={formatPortalDateTime}
            selectedRoleKey={selectedRoleKey}
            setSelectedRoleKey={setSelectedRoleKey}
            isCreatingRole={isCreatingRole}
            setIsCreatingRole={setIsCreatingRole}
            setError={setError}
            setNotice={setNotice}
            startTransition={startTransition}
            setData={setData}
            mergePortalData={mergePortalData}
            simplePortalError={simplePortalError}
          />
        )}

        {tab === "admin" && (
          <EmployeesTab
            data={data}
            runAction={runAction}
            copyApplicationLink={copyApplicationLink}
            applicationLink={applicationLink}
            submit={submit}
            formatPortalDateTime={formatPortalDateTime}
            downloadCsv={downloadCsv}
            importEmployees={importEmployees}
            openPortalTab={openPortalTab}
            setUserManagementOpen={setUserManagementOpen}
            activeEmployeeMenuId={activeEmployeeMenuId}
            setActiveEmployeeMenuId={setActiveEmployeeMenuId}
            confirmDelete={confirmDelete}
            currentUserId={currentUserId}
          />
        )}
      </main>
    </div>
  );
}
