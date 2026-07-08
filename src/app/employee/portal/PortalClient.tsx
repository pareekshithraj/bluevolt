"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, ChevronRight, ClipboardList, Code2, FileText, Handshake, LogOut, Menu, MessageCircle, Moon, PenLine, RefreshCw, RotateCw, Star, Sun, Target, UserCheck, Users, Video, WalletCards, X } from "lucide-react";
import {
  approveCrmSheet,
  approveEmployeeDocument,
  changeEmployeePassword,
  clockInEmployee,
  clockOutEmployee,
  deleteEmployeeEntity,
  getEmployeePortalData,
  logoutEmployee,
  markAllNotificationsRead,
  markNotificationRead,
  saveAnnouncement,
  saveAttendance,
  saveEmployeeDocument,
  saveEmployeeUser,
  saveExpenseClaim,
  saveGroupChatMessage,
  saveLeaveRequest,
  saveMeeting,
  savePayrollInput,
  savePerformanceReview,
  saveResource,
  saveTask,
  updateCrmSheetRowData,
  updateCrmSheetRowStatus,
  updateEmployeeRecordStatus,
} from "@/app/actions/employee-portal";
import styles from "../portal.module.css";
import CrmTab from "@/components/portal/CrmTab";
import ApplicantsTab from "@/components/portal/ApplicantsTab";
import EmployeesTab from "@/components/portal/EmployeesTab";
import PrivilegesTab from "@/components/portal/PrivilegesTab";
import Modal from "@/components/portal/Modal";

type PortalData = Awaited<ReturnType<typeof getEmployeePortalData>>;
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
  { id: "today", label: "Today", icon: Target },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "approvals", label: "Approvals", icon: ClipboardList },
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
  { id: "chat", label: "Group Chat", icon: MessageCircle },
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

function documentMeta(notes: string | null | undefined, label: string) {
  const match = (notes || "").match(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.*)$`, "im"));
  return match?.[1]?.trim() || "";
}

function documentWorkflowStatus(notes?: string | null) {
  const workflow = documentMeta(notes, "Workflow status");
  if (workflow) return workflow;
  if (documentApproved(notes)) return "Released to Employee";
  if (documentPending(notes)) return "Pending Director Approval";
  return "Draft";
}

function cleanDocumentNotes(notes?: string | null) {
  return (notes || "")
    .split(/\r?\n/)
    .filter((line) => (
      !line.startsWith("Approval status:") &&
      !line.startsWith("Workflow status:") &&
      !line.startsWith("Approved by:") &&
      !line.startsWith("Signed at:") &&
      !line.startsWith("Released at:") &&
      !line.startsWith("Sent status:") &&
      !line.startsWith("Downloaded status:") &&
      !line.startsWith("Signature:")
    ))
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
    users: ["dashboard", "today", "notifications", "admin", "ops", "reports", "crm", "approvals"].includes(activeTab) ? incoming.users : previous.users,
    crmRecords: ["dashboard", "today", "notifications", "crm", "reports"].includes(activeTab) ? incoming.crmRecords : previous.crmRecords,
    crmSheets: ["dashboard", "today", "notifications", "crm", "approvals"].includes(activeTab) ? incoming.crmSheets : previous.crmSheets,
    applicants: ["applicants", "admin", "reports", "approvals"].includes(activeTab) ? incoming.applicants : previous.applicants,
    meetings: ["dashboard", "today", "notifications", "meetings", "reports"].includes(activeTab) ? incoming.meetings : previous.meetings,
    resources: ["dashboard", "today", "notifications", "resources", "reports", "approvals"].includes(activeTab) ? incoming.resources : previous.resources,
    attendance: ["dashboard", "today", "notifications", "ops", "reports", "approvals"].includes(activeTab) ? incoming.attendance : previous.attendance,
    leaveRequests: ["dashboard", "today", "notifications", "ops", "approvals", "profile"].includes(activeTab) ? incoming.leaveRequests : previous.leaveRequests,
    tasks: ["dashboard", "today", "notifications", "ops"].includes(activeTab) ? incoming.tasks : previous.tasks,
    payrollInputs: ["payroll", "reports", "profile"].includes(activeTab) ? incoming.payrollInputs : previous.payrollInputs,
    reviews: ["reviews", "reports", "dashboard", "profile"].includes(activeTab) ? incoming.reviews : previous.reviews,
    documents: ["dashboard", "today", "notifications", "documents", "reports", "approvals"].includes(activeTab) ? incoming.documents : previous.documents,
    announcements: ["dashboard", "today", "notifications", "announcements", "reports", "approvals"].includes(activeTab) ? incoming.announcements : previous.announcements,
    comments: activeTab === "ops" ? incoming.comments : previous.comments,
    departments: activeTab === "admin" ? incoming.departments : previous.departments,
    roleDefinitions: ["admin", "access"].includes(activeTab) ? incoming.roleDefinitions : previous.roleDefinitions,
    notifications: ["dashboard", "today", "notifications", "admin", "access", "approvals"].includes(activeTab) ? incoming.notifications : previous.notifications,
    expenses: ["today", "notifications", "expenses", "reports", "approvals"].includes(activeTab) ? incoming.expenses : previous.expenses,
    auditEvents: ["dashboard", "today", "notifications", "admin", "access", "reports", "approvals"].includes(activeTab) ? incoming.auditEvents : previous.auditEvents,
    chatMessages: ["dashboard", "chat"].includes(activeTab) ? incoming.chatMessages : previous.chatMessages,
  };
}

export default function PortalClient({ initialData }: { initialData: PortalData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<PortalTab>("dashboard");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatInputText, setChatInputText] = useState("");
  const [loadingTab, setLoadingTab] = useState<PortalTab | "">("");
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState<{ id: string; payload?: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ } | null>(null);
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
  const [visibleDashboardAttendance, setVisibleDashboardAttendance] = useState(5);
  const [visibleOpsAttendance, setVisibleOpsAttendance] = useState(5);
  const [visibleOpsLeave, setVisibleOpsLeave] = useState(5);


  const [showCrmCloseConfirm, setShowCrmCloseConfirm] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [now, setNow] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("bluevolt-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
    const savedSidebar = localStorage.getItem("bluevolt-sidebar-collapsed");
    if (savedSidebar === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bluevolt-sidebar-collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
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
        setShowCrmCloseConfirm(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCrmSheetId]);

  // Close mobile sidebar on tab change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [tab]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (tab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [tab, data.chatMessages]);

  // Silent group chat message polling
  useEffect(() => {
    if (tab !== "chat") return;
    const interval = setInterval(async () => {
      try {
        const newData = await getEmployeePortalData(sortResources, "chat");
        setData(prev => mergePortalData(prev, newData, "chat"));
      } catch {
        // Ignore silent update errors
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [tab, sortResources]);

  // Close employee actions menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveEmployeeMenuId(null);
      setProfileDropdownOpen(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const visibleTabs = useMemo(() => tabs.filter((item) => {
    if (item.id === "dashboard") return true;
    if (item.id === "today") return true;
    if (item.id === "notifications") return true;
    if (item.id === "approvals") return data.capabilities.canUseSuperiorDashboard || data.capabilities.canManage;
    if (item.id === "crm") return data.capabilities.canRequestCrmSource || data.capabilities.canUseCrm;
    if (item.id === "applicants") return data.capabilities.canManageApplicants;
    if (item.id === "ops") return data.capabilities.canManageOps;
    if (item.id === "expenses") return data.capabilities.canManageExpenses;
    if (item.id === "payroll") return data.capabilities.canManagePayroll;
    if (item.id === "reports") return data.capabilities.canUseSuperiorDashboard && (data.capabilities.canManage || data.capabilities.canManagePayroll || data.capabilities.canManageApplicants);
    if (item.id === "profile") return true;
    if (item.id === "reviews") return data.capabilities.canReviewPerformance;
    if (item.id === "documents") return data.capabilities.canViewDocuments || data.capabilities.canManageDocuments;
    if (item.id === "announcements") return data.capabilities.canViewAnnouncements || data.capabilities.canPublishAnnouncements;
    if (item.id === "meetings") return data.capabilities.canViewMeetings || data.capabilities.canScheduleMeetings;
    if (item.id === "resources") return data.capabilities.canViewResources || data.capabilities.canManageResources;
    if (item.id === "chat") return data.capabilities.canUseChat;
    if (item.id === "access") return data.capabilities.canManageAccess;
    if (item.id === "admin") return data.capabilities.canViewEmployees || data.capabilities.canManage;
    return true;
  }), [data.capabilities]);

  const filteredVisibleTabs = useMemo(() => {
    if (!sidebarSearchQuery) return visibleTabs;
    return visibleTabs.filter(item => item.label.toLowerCase().includes(sidebarSearchQuery.toLowerCase()));
  }, [visibleTabs, sidebarSearchQuery]);

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
    setTab(nextTab);
    setLoadingTab(nextTab);
    startTransition(async () => {
      try {
        const newData = await getEmployeePortalData(sortResources, nextTab);
        setData(prev => mergePortalData(prev, newData, nextTab));
      } catch (tabError) {
        setError(simplePortalError(tabError));
      } finally {
        setLoadingTab("");
      }
    });
  };

  const handleSetActiveCrmSheetId = (id: number | null) => {
    if (id === null && activeCrmSheetId !== null) {
      setShowCrmCloseConfirm(true);
    } else {
      setActiveCrmSheetId(id);
    }
  };

  const confirmCloseCrmSheet = () => {
    setActiveCrmSheetId(null);
    setShowCrmCloseConfirm(false);
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
  const salesAssignedSheets = data.crmSheets.filter((sheet) => sheet.status === "Approved");
  const salesCallbackRows = data.crmSheets.flatMap((sheet) => sheet.rows).filter((row) => row.status === "Callback");
  const salesDoneRows = data.crmSheets.flatMap((sheet) => sheet.rows).filter((row) => row.status === "Done");
  const salesFollowUpsDueToday = data.crmSheets.flatMap((sheet) => sheet.rows).filter((row) => row.status === "Callback" || (row.reason || "").toLowerCase().includes("today"));
  const upcomingMeetings = data.meetings.filter((meeting) => new Date(meeting.startsAt).getTime() >= Date.now()).slice(0, 4);
  const recentResources = data.resources.slice(0, 4);
  const canEditCrmSheet = data.session.role === "super_admin";
  const currentEmployee = employees.find((user) => user.id === currentUserId);
  const todayKey = portalDateFormatter.format(now);
  const activeAttendance = data.attendance.find((entry) => entry.employeeId === currentUserId && entry.loginAt && !entry.logoutAt && portalDateFormatter.format(validDate(entry.workDate) || now) === todayKey);
  
  let autoClockedOut = false;
  if (activeAttendance && activeAttendance.loginAt) {
    const loginTime = new Date(activeAttendance.loginAt).getTime();
    if (Date.now() - loginTime > 8 * 60 * 60 * 1000) {
      autoClockedOut = true;
    }
  }
  const isWorking = clockOverride ? clockOverride === "working" : (Boolean(activeAttendance) && !autoClockedOut);
  const recentAttendance = data.attendance.slice(0, visibleDashboardAttendance);
  const selectedHoursEmployeeId = Number(workHoursEmployeeId || currentUserId);
  const selectedHoursEmployee = employees.find((user) => user.id === selectedHoursEmployeeId) || currentEmployee;
  const teamWorkHours = data.attendance.reduce((total, entry) => total + Number(entry.totalHours || 0), 0);
  const selectedEmployeeWorkHours = data.attendance
    .filter((entry) => entry.employeeId === selectedHoursEmployeeId)
    .reduce((total, entry) => total + Number(entry.totalHours || 0), 0);
  const completedSessions = data.attendance.filter((entry) => entry.logoutAt).length;
  const selectedEmployeeSessions = data.attendance.filter((entry) => entry.employeeId === selectedHoursEmployeeId).length;
  const payrollTotal = data.payrollInputs.reduce((total, item) => total + Number(item.amount || 0), 0);
  const payrollReady = data.payrollInputs.filter((item) => ["Pending Approval", "Approved", "Ready"].includes(item.status)).length;
  const payrollPaid = data.payrollInputs.filter((item) => item.status === "Paid").length;
  const canManageExpenseClaims = data.capabilities.canUseSuperiorDashboard && data.capabilities.canManageExpenses;
  const pendingDocuments = data.documents.filter((document) => documentPending(document.notes) && !documentApproved(document.notes));
  const pendingCrmSheets = data.crmSheets.filter((sheet) => sheet.status === "Pending");
  const pendingApplicants = data.applicants.filter((applicant) => !["Offer", "Appointed", "Rejected"].includes(applicant.stage));
  const pendingLeaveRequests = data.leaveRequests.filter((leave) => leave.status === "Pending");
  const pendingExpenseClaims = data.expenses.filter((expense) => expense.status === "Pending");
  const hasTodayAttendance = data.attendance.some((entry) => entry.employeeId === currentUserId && portalDateFormatter.format(validDate(entry.workDate) || now) === todayKey);
  const todaysTasks = myOpenTasks.filter((task) => task.dueAt && portalDateFormatter.format(validDate(task.dueAt) || now) === todayKey);
  const todaysMeetings = data.meetings.filter((meeting) => portalDateFormatter.format(validDate(meeting.startsAt) || now) === todayKey);
  const todaysCrmCallbacks = data.crmSheets.flatMap((sheet) => sheet.rows).filter((row) => row.status === "Callback");
  const attendanceIssues = data.attendance.filter((entry) => ["Absent", "Late", "Half-day"].includes(entry.status));
  const pendingApprovalCount = pendingDocuments.length + pendingCrmSheets.length + pendingApplicants.length + pendingLeaveRequests.length + pendingExpenseClaims.length;
  const notificationFeed = [
    ...data.notifications.filter((item) => !item.readAt).map((item) => ({
      id: `notification-${item.id}`,
      category: "Alert",
      title: item.title,
      body: item.body,
      time: item.createdAt,
      unread: !item.readAt,
      actionLabel: "Mark read",
      action: () => runAction(() => markNotificationRead({ id: item.id.toString() })),
      openAction: () => openPortalTab("today"),
    })),
    ...data.announcements.slice(0, 5).map((item) => ({
      id: `announcement-${item.id}`,
      category: "Announcement",
      title: "New announcement",
      body: item.title,
      time: item.createdAt,
      unread: false,
      actionLabel: "Open",
      action: () => openPortalTab("announcements"),
      openAction: () => openPortalTab("announcements"),
    })),
    ...upcomingMeetings.slice(0, 4).map((item) => ({
      id: `meeting-${item.id}`,
      category: "Meeting",
      title: "Meeting assigned",
      body: item.title,
      time: item.startsAt,
      unread: false,
      actionLabel: "Open",
      action: () => openPortalTab("meetings"),
      openAction: () => openPortalTab("meetings"),
    })),
    ...data.documents.filter((item) => documentApproved(item.notes)).slice(0, 4).map((item) => ({
      id: `document-${item.id}`,
      category: "Document",
      title: "Document approved",
      body: item.title,
      time: item.updatedAt,
      unread: false,
      actionLabel: "Open",
      action: () => openPortalTab("documents"),
      openAction: () => openPortalTab("documents"),
    })),
    ...salesAssignedSheets.slice(0, 4).map((item) => ({
      id: `sheet-${item.id}`,
      category: "CRM",
      title: "CRM sheet assigned",
      body: item.title,
      time: item.updatedAt,
      unread: false,
      actionLabel: "Open CRM",
      action: () => {
        setActiveCrmSheetId(item.id);
        openPortalTab("crm");
      },
      openAction: () => {
        setActiveCrmSheetId(item.id);
        openPortalTab("crm");
      },
    })),
    ...dueSoonTasks.slice(0, 4).map((item) => ({
      id: `task-${item.id}`,
      category: "Task",
      title: "Task due soon",
      body: item.title,
      time: item.dueAt || item.updatedAt,
      unread: false,
      actionLabel: "Open tasks",
      action: () => openPortalTab("ops"),
      openAction: () => openPortalTab("ops"),
    })),
    ...(!isWorking && !hasTodayAttendance ? [{
      id: "attendance-issue",
      category: "Attendance",
      title: "Attendance issue",
      body: "No check-in found for today.",
      time: now,
      unread: false,
      actionLabel: "Open Work Ops",
      action: () => openPortalTab("ops"),
      openAction: () => openPortalTab("ops"),
    }] : []),
  ].sort((a, b) => (validDate(b.time)?.getTime() || 0) - (validDate(a.time)?.getTime() || 0));
  const unreadBellCount = notificationFeed.filter((item) => item.unread).length;
  const notificationGroups = ["Alert", "Announcement", "Meeting", "Document", "CRM", "Task", "Attendance"]
    .map((category) => ({ category, items: notificationFeed.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
  const roleFocusCards = normalizedRole.includes("sales")
    ? [
      ["Assigned CRM sheets", salesAssignedSheets.length, "Open approved sheets and move rows by status."],
      ["Follow-ups due today", salesFollowUpsDueToday.length, "Callback queue and due follow-ups."],
      ["Done rows", salesDoneRows.length, "Completed sales rows visible to you."],
      ["Callback queue", salesCallbackRows.length, "Rows needing another contact attempt."],
    ]
    : normalizedRole.includes("content")
      ? [
        ["Content tasks", myOpenTasks.length, "Assigned content and delivery work."],
        ["Resources", recentResources.length, "Role-visible files, links, decks, and sheets."],
        ["Meetings", upcomingMeetings.length, "Upcoming sessions assigned to you."],
        ["Documents", data.documents.filter((document) => documentApproved(document.notes)).length, "Released documents available to download."],
      ]
      : [
        ["My tasks", myOpenTasks.length, "Assigned tasks and due work."],
        ["Meetings", upcomingMeetings.length, "Upcoming sessions assigned to you."],
        ["Resources", recentResources.length, "Files and links visible to your role."],
        ["My hours", formatWorkHours(selectedEmployeeWorkHours), `${selectedEmployeeSessions} work sessions recorded.`],
      ];
  const calendarItems = [
    ...data.attendance.slice(0, 10).map((entry) => ({
      id: `attendance-${entry.id}`,
      title: entry.employeeName,
      meta: `${entry.status} - ${Number(entry.totalHours || 0).toFixed(2)} hrs`,
      date: entry.workDate,
      kind: "Attendance",
    })),
    ...data.leaveRequests.slice(0, 10).map((leave) => ({
      id: `leave-${leave.id}`,
      title: leave.employeeName,
      meta: `${leave.leaveType} - ${leave.status}`,
      date: leave.startsAt,
      kind: "Leave",
    })),
  ].sort((a, b) => (validDate(b.date)?.getTime() || 0) - (validDate(a.date)?.getTime() || 0)).slice(0, 12);
  const recentAuditEvents = data.auditEvents.slice(0, 8);

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

  const handleSendChatMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const body = chatInputText.trim();
    if (!body) return;

    setChatInputText("");

    const optimisticId = -Date.now();
    const optimisticMsg = {
      id: optimisticId,
      employeeId: currentUserId,
      employeeName: data.session.name,
      employeeRole: data.session.role,
      body: body,
      createdAt: new Date(),
      sending: true,
    };

    setData(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, optimisticMsg]
    }));

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      const res = await saveGroupChatMessage({ body });
      if (!res.success) {
        setError(res.error || "Failed to send message.");
        setData(prev => ({
          ...prev,
          chatMessages: prev.chatMessages.filter(m => m.id !== optimisticId)
        }));
        return;
      }
      const newData = await getEmployeePortalData(sortResources, "chat");
      setData(prev => mergePortalData(prev, newData, "chat"));
    } catch (err) {
      setError(simplePortalError(err, "Failed to send message."));
      setData(prev => ({
        ...prev,
        chatMessages: prev.chatMessages.filter(m => m.id !== optimisticId)
      }));
    }
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
    let previousData: Record<string, string> | null = null;
    setData(prev => {
        const crmSheets = [...prev.crmSheets];
        const sheetIndex = crmSheets.findIndex(s => s.id === activeCrmSheetId);
        if (sheetIndex !== -1) {
            const rows = [...crmSheets[sheetIndex].rows];
            const rowIndex = rows.findIndex(r => r.id === rowId);
            if (rowIndex !== -1) {
                let originalData: Record<string, string> = {};
                if (typeof rows[rowIndex].data === "string") {
                  try {
                    originalData = JSON.parse(rows[rowIndex].data) as Record<string, string>;
                  } catch {
                    originalData = {};
                  }
                } else if (rows[rowIndex].data && typeof rows[rowIndex].data === "object" && !Array.isArray(rows[rowIndex].data)) {
                  originalData = rows[rowIndex].data as Record<string, string>;
                }
                previousData = originalData;
                const newData = { ...originalData, [colName]: newValue };
                rows[rowIndex] = { ...rows[rowIndex], data: newData };
                crmSheets[sheetIndex] = { ...crmSheets[sheetIndex], rows };
                updateCrmSheetRowData({ rowId: rowId.toString(), data: newData }).then((result) => {
                  if (!result.success) {
                    setError(result.error || "Cell save failed. The value was restored.");
                    if (previousData) {
                      setData((latest) => ({
                        ...latest,
                        crmSheets: latest.crmSheets.map((sheet) => sheet.id === activeCrmSheetId ? {
                          ...sheet,
                          rows: sheet.rows.map((row) => row.id === rowId ? { ...row, data: previousData } : row),
                        } : sheet),
                      }));
                    }
                  }
                }).catch((saveError) => {
                  setError(simplePortalError(saveError, "Cell save failed. The value was restored."));
                  if (previousData) {
                    setData((latest) => ({
                      ...latest,
                      crmSheets: latest.crmSheets.map((sheet) => sheet.id === activeCrmSheetId ? {
                        ...sheet,
                        rows: sheet.rows.map((row) => row.id === rowId ? { ...row, data: previousData } : row),
                      } : sheet),
                    }));
                  }
                });
            }
        }
        return { ...prev, crmSheets };
    });
  };

  const handleCrmRowStatusChange = (rowId: number, status: string) => {
    const previousRow = data.crmSheets.flatMap((sheet) => sheet.rows).find((row) => row.id === rowId) || null;
    const restorePreviousRow = () => {
      if (!previousRow) return;
      setData((latest) => ({
        ...latest,
        crmSheets: latest.crmSheets.map((sheet) => ({
          ...sheet,
          rows: sheet.rows.map((row) => row.id === rowId ? previousRow : row),
        })),
      }));
    };
    setData(prev => ({
      ...prev,
      crmSheets: prev.crmSheets.map((sheet) => ({
        ...sheet,
        rows: sheet.rows.map((row) => row.id === rowId ? {
          ...row,
          status,
          reason: status,
          doneAt: status === "Done" ? new Date() : null,
          updatedBy: currentUserId,
          updatedByName: data.session.name,
          updatedAt: new Date(),
        } : row),
      })),
    }));
    startTransition(async () => {
      try {
        const result = await updateCrmSheetRowStatus({ rowId: rowId.toString(), status, reason: status });
        if (!result.success) {
          restorePreviousRow();
          setError(result.error || "Could not update CRM row.");
        }
      } catch (statusError) {
        restorePreviousRow();
        setError(simplePortalError(statusError, "Could not update CRM row."));
      }
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
      const message = `BLUEVOLT application link:\n${applicationLink}\n\nPlease fill this form if you are applying for an employee or internship role.`;
      await navigator.clipboard.writeText(message);
      setNotice("Application link copied. Paste it in WhatsApp.");
    } catch {
      setError("Copy failed. Please copy the link manually.");
    }
  };

  const idCardUrlFor = (user: EmployeeListItem, download = false) => (
    `/api/employee/id-card?employeeId=${user.id}${download ? "&download=1" : ""}`
  );


  const userInitials = data.session.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const confirmDelete = (entityType: string, id: string, name?: string) => {
    const label = name || entityType;
    if (!confirm(`Delete this ${label}? This action cannot be undone.`)) return;
    runAction(() => deleteEmployeeEntity({ entityType, id }));
  };

  return (
    <div className={`${styles.shell} ${theme === "light" ? styles.themeLight : styles.themeDark} ${sidebarCollapsed ? styles.shellCollapsed : ""} ${tab === "crm" && activeCrmSheetId ? styles.sheetMode : ""}`}>
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
              <div className={`${styles.notice} ${styles.fieldWide}`} style={{ marginTop: '16px' }}>Default password: abc123. User will be warned to change it after first login.</div>
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Create User Access</button>
            </form>
          </div>
        </div>
      )}

      {showCrmCloseConfirm && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Confirm closing sheet">
          <div className={styles.modalPanel} style={{ maxWidth: 450 }}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.cardTitle}>Unsaved Work</h2>
                <p className={styles.muted}>Are you sure you want to close this sheet? Any unsaved edits will be lost.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <button className={styles.ghostButton} type="button" onClick={() => setShowCrmCloseConfirm(false)}>Cancel</button>
              <button className={styles.button} type="button" onClick={confirmCloseCrmSheet}>Close Sheet</button>
            </div>
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

        {!sidebarCollapsed && (
          <div style={{ padding: "0 12px 24px 12px", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.08em", color: "var(--text-primary)" }}>
            BLUEVOLT
          </div>
        )}

        <nav className={styles.nav}>
          {filteredVisibleTabs.map((item) => {
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
                <Icon size={14} className={styles.navButtonIcon} /> 
                {!sidebarCollapsed && (
                  <span className={styles.navButtonLabel}>
                    {loadingTab === item.id ? "Loading..." : item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          {/* Vercel-style Left Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={styles.vercelBreadcrumbProject} style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>BlueVolt Groups</span>
            <span className={styles.vercelBreadcrumbSlash} style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>/</span>
            <span className={styles.vercelBreadcrumbActive} style={{ fontWeight: 500, fontSize: "0.88rem", color: "var(--text-muted)" }}>
              {tabs.find(t => t.id === tab)?.label || "Overview"}
            </span>
          </div>

          {/* Vercel-style Right Tools */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Work Switch knob */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 12, borderRight: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {isWorking ? "Working" : "Off Duty"}
              </span>
              <button 
                className={`${styles.workSwitch} ${isWorking ? styles.workSwitchOn : ""}`} 
                type="button" 
                onClick={isWorking ? handleClockOut : handleClockIn} 
                aria-pressed={isWorking} 
                disabled={clockSaving}
                title={isWorking ? "Clock Out" : "Clock In"}
                style={{ scale: "0.82", transformOrigin: "right" }}
              >
                <span>{isWorking ? "Working" : "Off"}</span>
                <i />
              </button>
            </div>

            {/* Theme, Notifications, Refresh, Profile Avatar dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
              {/* Theme Toggle */}
              <button type="button" className={styles.refreshIconButton} onClick={() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                setTheme(newTheme);
                localStorage.setItem("bluevolt-theme", newTheme);
              }} aria-label="Toggle Theme">
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Notification Popover Trigger */}
              <button type="button" className={styles.refreshIconButton} onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); }} aria-label="Notifications" style={{ position: "relative" }}>
                <Bell size={16} />
                {notificationFeed.length > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 2, width: 6, height: 6, background: "#ef4444", borderRadius: "50%" }} />
                )}
              </button>

              {/* Notifications Popover */}
              {notificationsOpen && (
                <div className={styles.notificationPopover} style={{ zIndex: 90 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>Notifications</strong>
                      <p className={styles.muted} style={{ margin: "3px 0 0", fontSize: "0.72rem" }}>{notificationFeed.length} actionable updates</p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {unreadBellCount > 0 && (
                        <button
                          className={styles.ghostButton}
                          style={{ padding: "4px 8px", minHeight: 24, fontSize: "0.75rem" }}
                          type="button"
                          onClick={() => runAction(() => markAllNotificationsRead())}
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        className={styles.ghostButton}
                        style={{ padding: "4px 8px", minHeight: 24, fontSize: "0.75rem" }}
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {notificationFeed.length === 0 ? (
                      <div className={styles.muted} style={{ fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No new notifications</div>
                    ) : (
                      notificationFeed.slice(0, 18).map((item) => (
                        <div
                          key={item.id} 
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            item.openAction?.();
                            setNotificationsOpen(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              item.openAction?.();
                              setNotificationsOpen(false);
                            }
                          }}
                          style={{ 
                            textAlign: "left",
                            padding: 10, 
                            borderRadius: 8, 
                            background: item.unread ? "var(--pill-bg)" : "transparent", 
                            border: "1px solid var(--border-color)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            cursor: "pointer"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: item.unread ? "var(--text-brand)" : "var(--text-primary)" }}>{item.title}</span>
                            <span className={styles.pill} style={{ fontSize: "0.62rem", minHeight: 20 }}>{item.category}</span>
                            {item.actionLabel && item.action && (
                              <button 
                                className={styles.ghostButton} 
                                style={{ padding: "2px 6px", minHeight: 20, fontSize: "0.7rem", flexShrink: 0 }}
                                type="button" 
                                onClick={(event) => {
                                  event.stopPropagation();
                                  item.action?.();
                                  if (item.actionLabel !== "Mark read") setNotificationsOpen(false);
                                }}
                              >
                                {item.actionLabel}
                              </button>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{item.body}</p>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{formatPortalTimeAgo(item.time)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Refresh button */}
              <button className={styles.refreshIconButton} type="button" onClick={() => refresh(sortResources, tab)} disabled={pending} aria-label="Refresh portal"><RefreshCw size={14} className={pending ? styles.spinning : ""} /></button>

              {/* User dropdown switcher avatar */}
              <div style={{ position: "relative" }}>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setProfileDropdownOpen(!profileDropdownOpen); }} 
                  aria-label="Profile Menu"
                  style={{ padding: 0, width: 28, height: 28, borderRadius: "50%", background: "var(--text-primary)", color: "var(--text-inverse)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: "0.75rem", border: 0, cursor: "pointer" }}
                >
                  {userInitials}
                </button>
                {profileDropdownOpen && (
                  <div className={styles.profilePopover} style={{ position: "absolute", top: 38, right: 0, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 0", width: 180, boxShadow: "var(--shadow-md)", zIndex: 100 }}>
                    <div style={{ padding: "8px 16px", fontSize: "0.82rem" }}>
                      <strong style={{ display: "block", color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{data.session.name}</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", display: "block" }}>{data.session.email}</span>
                    </div>
                    <div style={{ height: 1, background: "var(--border-color)", margin: "6px 0" }} />
                    <button 
                      className={styles.profilePopoverItem} 
                      onClick={() => {
                        openPortalTab("profile");
                        setProfileDropdownOpen(false);
                      }}
                      type="button"
                      style={{ width: "100%", textAlign: "left", padding: "6px 16px", background: "transparent", border: 0, color: "var(--text-primary)", cursor: "pointer", fontSize: "0.82rem" }}
                    >
                      My Profile
                    </button>
                    <div style={{ height: 1, background: "var(--border-color)", margin: "6px 0" }} />
                    <button 
                      className={styles.profilePopoverItem} 
                      onClick={() => startTransition(async () => {
                        await logoutEmployee();
                        router.push("/employee/login");
                      })}
                      type="button"
                      style={{ width: "100%", textAlign: "left", padding: "6px 16px", background: "transparent", border: 0, color: "#ef4444", cursor: "pointer", fontSize: "0.82rem", fontWeight: 500 }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
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

        {tab === "notifications" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Notification Center</div>
              <div style={{ flex: 1 }} />
              <div className={styles.vercelToolbarActions}>
                <button className={styles.ghostButton} type="button" onClick={() => refresh(sortResources, "notifications")}>Refresh</button>
                <button className={styles.vercelButtonPrimary} type="button" onClick={() => runAction(() => markAllNotificationsRead())} disabled={unreadBellCount === 0}>
                  Mark all read
                </button>
              </div>
            </div>

            <div className={styles.vercelCard} style={{ marginBottom: 24 }}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Updates by Category</h2>
                  <p className={styles.muted}>{notificationFeed.length} current updates. Read alerts disappear after they are marked read.</p>
                </div>
                <span className={styles.pill}>{unreadBellCount} unread</span>
              </div>
              
              <div className={styles.notificationCenterGrid} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginTop: 16 }}>
                {notificationGroups.length === 0 ? (
                  <div className={styles.emptyState} style={{ gridColumn: "1 / -1" }}>No updates waiting right now.</div>
                ) : (
                  notificationGroups.map((group) => (
                    <div className={styles.vercelCard} key={group.category} style={{ border: "1px solid var(--border-color)", padding: 16 }}>
                      <div className={styles.rowHeader} style={{ marginBottom: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                        <strong style={{ fontSize: "1rem" }}>{group.category}</strong>
                        <span className={styles.pill}>{group.items.length}</span>
                      </div>
                      <div className={styles.list} style={{ gap: 12, display: "flex", flexDirection: "column" }}>
                        {group.items.map((item) => (
                          <button 
                            className={styles.notificationRow} 
                            type="button" 
                            key={item.id} 
                            onClick={item.openAction}
                            style={{ textAlign: "left", padding: 12, background: "var(--bg-shell)", borderRadius: 6, display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                          >
                            <span className={item.unread ? `${styles.notificationDot} ${styles.notificationDotUnread}` : styles.notificationDot} style={{ marginTop: 6 }} />
                            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                              <strong style={{ fontSize: "0.9rem", color: "var(--text-color)" }}>{item.title}</strong>
                              <small style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{item.body}</small>
                              <em style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>{formatPortalTimeAgo(item.time)}</em>
                            </span>
                            <span className={styles.actionStack} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                              <span className={styles.pill} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{item.actionLabel || "Open"}</span>
                              {item.unread && item.action && (
                                <span
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    item.action();
                                  }}
                                  style={{ color: "var(--accent-color)", fontSize: "0.8rem", textDecoration: "underline" }}
                                >
                                  Mark read
                                </span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}


        {tab === "today" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Daily Command Center</div>
              <div style={{ flex: 1 }} />
              <div className={styles.vercelToolbarActions}>
                <button className={isWorking ? styles.ghostButton : styles.vercelButtonPrimary} type="button" onClick={isWorking ? handleClockOut : handleClockIn} disabled={clockSaving} style={isWorking ? {} : { padding: "8px 16px" }}>
                  {isWorking ? "Check out" : "Check in"}
                </button>
                {data.capabilities.canUseCrm && <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("crm")}>CRM</button>}
                {data.capabilities.canUseSuperiorDashboard && <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("approvals")}>Approvals</button>}
              </div>
            </div>

            <div className={styles.vercelStatGrid} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                ["Check-in", isWorking ? "Working" : "Off", currentEmployee ? `${currentEmployee.workStartTime} to ${currentEmployee.workEndTime}` : "Work window not set"],
                ["Tasks due today", todaysTasks.length, `${dueSoonTasks.length} due soon, ${blockedTasks.length} blocked`],
                ["Meetings today", todaysMeetings.length, "Visible sessions assigned to you"],
                ["CRM callbacks", todaysCrmCallbacks.length, "Rows waiting for follow-up"],
                ["Pending approvals", pendingApprovalCount, "Documents, CRM, applicants, leave, expenses"],
                ["Attendance issues", attendanceIssues.length, "Late, absent, or half-day records"],
              ].map(([label, value, hint]) => (
                <div className={styles.vercelCard} key={String(label)}>
                  <div className={styles.vercelCardHeader}>
                    <h3 style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>{label}</h3>
                  </div>
                  <div className={styles.metricValue} style={{ fontSize: "1.8rem", fontWeight: 700, margin: "8px 0" }}>{value}</div>
                  <p className={styles.muted} style={{ fontSize: "0.78rem", margin: 0 }}>{hint}</p>
                </div>
              ))}
            </div>

            <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
              
              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader} style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className={styles.cardTitle} style={{ margin: 0 }}>Tasks Due Today</h3>
                  <button className={styles.ghostButton} style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "unset" }} type="button" onClick={() => openPortalTab("ops")}>Open Work Ops</button>
                </div>
                <div className={styles.list}>
                  {todaysTasks.length === 0 ? <div className={styles.emptyState}>No task due today.</div> : todaysTasks.slice(0, 8).map((task) => (
                    <div className={styles.row} key={`today-task-${task.id}`} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 12 }}>
                      <div className={styles.rowHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <strong>{task.title}</strong>
                        <span className={task.status === "Blocked" ? `${styles.pill} ${styles.pillWarn}` : styles.pill} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{task.status}</span>
                      </div>
                      <p className={styles.muted} style={{ fontSize: "0.85rem", margin: 0 }}>{task.description || "No notes."}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader} style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className={styles.cardTitle} style={{ margin: 0 }}>Meetings Today</h3>
                  <button className={styles.ghostButton} style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "unset" }} type="button" onClick={() => openPortalTab("meetings")}>Open Meetings</button>
                </div>
                <div className={styles.list}>
                  {todaysMeetings.length === 0 ? <div className={styles.emptyState}>No meeting today.</div> : todaysMeetings.slice(0, 8).map((meeting) => (
                    <div className={styles.row} key={`today-meeting-${meeting.id}`} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 12 }}>
                      <div className={styles.rowHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <strong>{meeting.title}</strong>
                        <span className={styles.pill} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{formatPortalTime(meeting.startsAt)}</span>
                      </div>
                      <p className={styles.muted} style={{ fontSize: "0.85rem", margin: "0 0 8px 0" }}>{meeting.notes || "Scheduled meeting."}</p>
                      {meeting.meetUrl && <a className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 8px", minHeight: "unset" }} href={meeting.meetUrl} target="_blank" rel="noopener noreferrer">Join</a>}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader} style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className={styles.cardTitle} style={{ margin: 0 }}>CRM Callbacks</h3>
                  <button className={styles.ghostButton} style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "unset" }} type="button" onClick={() => openPortalTab("crm")}>Open CRM</button>
                </div>
                <div className={styles.list}>
                  {todaysCrmCallbacks.length === 0 ? <div className={styles.emptyState}>No callback rows.</div> : todaysCrmCallbacks.slice(0, 6).map((row) => {
                    const cells = row.data && typeof row.data === "object" ? row.data as Record<string, string> : {};
                    return (
                      <div className={styles.row} key={`today-callback-${row.id}`} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 12 }}>
                        <div className={styles.rowHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <strong>{cells["School Name"] || cells.Company || `Row ${row.rowNumber}`}</strong>
                          <span className={`${styles.pill} ${styles.pillWarn}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Callback</span>
                        </div>
                        <p className={styles.muted} style={{ fontSize: "0.85rem", margin: 0 }}>{cells["Phone Number"] || cells.Phone || row.reason || "Call back."}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader} style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className={styles.cardTitle} style={{ margin: 0 }}>Announcements</h3>
                  <button className={styles.ghostButton} style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "unset" }} type="button" onClick={() => openPortalTab("announcements")}>Open</button>
                </div>
                <div className={styles.list}>
                  {data.announcements.length === 0 ? <div className={styles.emptyState}>No announcements.</div> : data.announcements.slice(0, 5).map((announcement) => (
                    <div className={styles.row} key={`today-announcement-${announcement.id}`} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 12 }}>
                      <div className={styles.rowHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <strong>{announcement.title}</strong>
                        <span className={announcement.priority === "Urgent" ? `${styles.pill} ${styles.pillWarn}` : styles.pill} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{announcement.priority}</span>
                      </div>
                      <p className={styles.muted} style={{ fontSize: "0.85rem", margin: 0 }}>{announcement.body}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {recentAuditEvents.length > 0 && data.capabilities.canUseSuperiorDashboard && (
              <div className={styles.vercelCard} style={{ marginTop: 24 }}>
                <div className={styles.vercelCardHeader} style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className={styles.cardTitle} style={{ margin: 0 }}>Recent Audit Trail</h3>
                  <button className={styles.ghostButton} style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "unset" }} type="button" onClick={() => openPortalTab("notifications")}>Open Notification Center</button>
                </div>
                <div className={styles.auditTimeline}>
                  {recentAuditEvents.map((event) => (
                    <div className={styles.auditItem} key={`today-audit-${event.id}`} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 12 }}>
                      <span className={styles.pill} style={{ fontSize: "0.7rem", padding: "2px 6px", minWidth: 80, textAlign: "center" }}>{event.entityType}</span>
                      <strong style={{ fontSize: "0.85rem" }}>{event.action}</strong>
                      <p className={styles.muted} style={{ fontSize: "0.8rem", margin: 0 }}>{event.actorName || "System"} - {formatPortalTimeAgo(event.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "dashboard" && (
          <div className={styles.vercelDashboard}>
            {/* Toolbar Header */}
            <div className={styles.vercelToolbar}>

              <div className={styles.vercelToolbarActions}>
                {isSuperiorDashboard ? (
                  <button className={styles.button} type="button" onClick={() => setUserManagementOpen(true)}>
                    Add New User
                  </button>
                ) : (
                  <button className={styles.button} type="button" onClick={() => openPortalTab("profile")}>
                    View Profile
                  </button>
                )}
              </div>
            </div>

            {/* KPI Stat Cards Grid */}
            <div className={styles.vercelStatGrid} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>
                    {isSuperiorDashboard ? "Team Work Hours" : "My Work Hours"}
                  </h3>
                </div>
                <div className={styles.metricValue}>
                  {isSuperiorDashboard ? formatWorkHours(teamWorkHours) : formatWorkHours(selectedEmployeeWorkHours)}
                </div>
                <p className={styles.muted} style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
                  {isSuperiorDashboard ? `${completedSessions} work sessions logged` : `${selectedEmployeeSessions} sessions recorded`}
                </p>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>
                    {isSuperiorDashboard ? "Global Open Tasks" : "Assigned Tasks"}
                  </h3>
                </div>
                <div className={styles.metricValue}>
                  {isSuperiorDashboard ? data.tasks.filter(t => t.status !== "Done").length : myOpenTasks.filter(t => t.status !== "Done").length}
                </div>
                <p className={styles.muted} style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
                  {isSuperiorDashboard ? `${blockedTasks.length} tasks blocked` : `${myOpenTasks.filter(t => t.status === "Blocked").length} blocked`}
                </p>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>
                    CRM Actionable Leads
                  </h3>
                </div>
                <div className={styles.metricValue}>
                  {isSuperiorDashboard ? actionableCrmRows.length : roleActionableCrmRows.length}
                </div>
                <p className={styles.muted} style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
                  {isSuperiorDashboard ? `${data.crmSheets.length} active sheets` : "Rows needing callback"}
                </p>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>
                    {isSuperiorDashboard ? "Pending Approvals" : "My Shift Status"}
                  </h3>
                </div>
                {isSuperiorDashboard ? (
                  <div className={styles.metricValue}>
                    {pendingLeaveRequests.length + pendingExpenseClaims.length + pendingCrmSheets.length + pendingDocuments.length + pendingApplicants.length}
                  </div>
                ) : (
                  <div className={styles.metricValue} style={{ fontSize: "1.5rem", marginTop: 22, fontWeight: 600 }}>
                    {isWorking ? "Active Now" : "Off Duty"}
                  </div>
                )}
                <p className={styles.muted} style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
                  {isSuperiorDashboard ? "Requires leadership review" : isWorking ? "Active session running" : "Toggle switch to start work"}
                </p>
              </div>
            </div>

            {/* Split Screen Layout */}
            <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
              {/* Left Column: Today & Quick Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className={styles.vercelCard}>
                  <div className={styles.vercelCardHeader} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Today&apos;s Summary</h3>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <strong style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Duty Status</strong>
                      <p style={{ margin: "4px 0", fontWeight: 500 }}>{isWorking ? "Working (Clocked In)" : "Clocked Out"}</p>
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Tasks Due</strong>
                      <p style={{ margin: "4px 0", fontWeight: 500 }}>{todaysTasks.length} tasks due today</p>
                    </div>
                  </div>

                  {/* Quick Action Buttons Group */}
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                    <strong style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
                      Quick Actions
                    </strong>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!isSuperiorDashboard && (
                        <button 
                          className={styles.ghostButton} 
                          type="button" 
                          onClick={() => {
                            setClockSaving(true);
                            startTransition(async () => {
                              try {
                                if (isWorking) {
                                  await clockOutEmployee();
                                } else {
                                  await clockInEmployee();
                                }
                                refresh();
                              } catch (err) {
                                setError(simplePortalError(err));
                              } finally {
                                setClockSaving(false);
                              }
                            });
                          }}
                          disabled={clockSaving}
                        >
                          {clockSaving ? "Saving..." : isWorking ? "Clock Out" : "Clock In"}
                        </button>
                      )}
                      <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("chat")}>Group Chat</button>
                      {data.capabilities.canUseCrm && (
                        <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("crm")}>CRM sheets</button>
                      )}
                      {data.capabilities.canRequestCrmSource && (
                        <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("ops")}>Work Ops</button>
                      )}
                      {isSuperiorDashboard && (
                        <>
                          <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("approvals")}>Approvals Queue</button>
                          <a className={styles.ghostButton} href="/api/employee/export?type=employees">Export Roster</a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Recent Activity (Audit trail) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className={styles.vercelCard}>
                  <div className={styles.vercelCardHeader} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Recent Activity</h3>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {recentAuditEvents.length === 0 ? (
                      <p className={styles.muted} style={{ fontSize: "0.85rem", margin: 0 }}>No recent audit events.</p>
                    ) : (
                      recentAuditEvents.map((event) => (
                        <div key={event.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, borderBottom: "1px solid var(--border-color)", fontSize: "0.82rem" }}>
                          <div>
                            <strong style={{ display: "block", color: "var(--text-primary)" }}>{event.action}</strong>
                            <span style={{ color: "var(--text-muted)" }}>{event.actorName || "System"}</span>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                            {formatPortalTimeAgo(event.createdAt)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>My Profile & Security</div>
              <div style={{ flex: 1 }} />
              {currentEmployee && <a className={styles.ghostButton} href={idCardUrlFor(currentEmployee)} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", minHeight: "unset" }}>Open ID Card</a>}
              {currentEmployee && <a className={styles.vercelButtonPrimary} href={idCardUrlFor(currentEmployee, true)} style={{ padding: "6px 12px", minHeight: "unset" }}>Download ID Card</a>}
            </div>

            <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 16, marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Profile Summary</h3>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
                  <div className={styles.avatar} style={{ width: 56, height: 56, fontSize: "1.2rem", background: "var(--text-brand)", color: "#fff" }}>
                    {data.session.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: "1.1rem", display: "block" }}>{data.session.name}</strong>
                    <p className={styles.muted} style={{ margin: "2px 0 6px" }}>{data.session.email}</p>
                    <span className={styles.pill}>{roleLabel}</span>
                  </div>
                </div>

                {currentEmployee && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span className={styles.muted}>Department</span>
                      <strong style={{ fontFamily: "var(--font-mono)" }}>{currentEmployee.department}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span className={styles.muted}>Employee Type</span>
                      <strong style={{ fontFamily: "var(--font-mono)" }}>{currentEmployee.employeeType}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span className={styles.muted}>Work Window</span>
                      <strong style={{ fontFamily: "var(--font-mono)" }}>{currentEmployee.workStartTime} to {currentEmployee.workEndTime}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.vercelCardHeader} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 16, marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Security & Password</h3>
                </div>
                <form className={styles.formGrid} onSubmit={submit(changeEmployeePassword)}>
                  <p className={styles.muted} style={{ margin: "0 0 16px", fontSize: "0.85rem", gridColumn: "1 / -1", lineHeight: 1.5 }}>
                    Default password for new accounts is <strong>abc123</strong>. Replace it with a private password after your first login to secure your account.
                  </p>
                  <Field label="Current Password" name="currentPassword" type="password" required wide />
                  <Field label="New Password" name="newPassword" type="password" required wide />
                  <Field label="Confirm Password" name="confirmPassword" type="password" required wide />
                  <div className={styles.fieldWide} style={{ marginTop: 8 }}>
                    <button className={styles.button} style={{ width: "100%" }} type="submit">Update Password</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {tab === "crm" && (
          <CrmTab
            data={data}
            runAction={runAction}
            activeCrmSheetId={activeCrmSheetId}
            setActiveCrmSheetId={handleSetActiveCrmSheetId}
            selectedCrmRowId={selectedCrmRowId}
            setSelectedCrmRowId={setSelectedCrmRowId}
            selectedCrmCell={selectedCrmCell}
            setSelectedCrmCell={setSelectedCrmCell}
            setError={setError}
            submit={submit}
            handleCellChange={handleCellChange}
            handleRowStatusChange={handleCrmRowStatusChange}
            activeModal={activeModal}
            setActiveModal={setActiveModal}
          />
        )}

        {tab === "approvals" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Leadership Queue</div>
              <div style={{ flex: 1 }} />
              <div className={styles.vercelToolbarActions}>
                <button className={styles.ghostButton} type="button" onClick={() => refresh(sortResources, "approvals")}>Refresh Queue</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
              {[
                ["Documents", pendingDocuments.length, "Pending director/signatory approval."],
                ["CRM Sheets", pendingCrmSheets.length, "Waiting for source approval."],
                ["Applicants", pendingApplicants.length, "Awaiting accept/reject decision."],
                ["Leave", pendingLeaveRequests.length, "Pending leave approvals."],
                ["Expenses", pendingExpenseClaims.length, "Pending claim approvals."],
              ].map(([title, count, hint]) => (
                <div className={styles.vercelCard} key={String(title)} style={{ padding: 24 }}>
                  <h2 className={styles.cardTitle}>{title}</h2>
                  <span className={styles.metricValue}>{count}</span>
                  <p className={styles.muted} style={{ fontSize: "0.85rem" }}>{hint}</p>
                </div>
              ))}
            </div>

            <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div className={styles.vercelCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle} style={{ margin: 0 }}>Document Approvals</h2>
                  <span className={styles.pill}>{pendingDocuments.length} pending</span>
                </div>
                <div className={styles.list}>
                  {pendingDocuments.length === 0 ? <div className={styles.emptyState}>No documents waiting for approval.</div> : pendingDocuments.map((document) => (
                    <div className={styles.row} key={`approval-document-${document.id}`}>
                      <div className={styles.rowHeader}><strong>{document.title}</strong><span className={styles.pill}>{document.documentType}</span></div>
                      <p className={styles.muted}>{document.employeeName || "General document"} - {documentWorkflowStatus(document.notes)} - {cleanDocumentNotes(document.notes) || "Pending signatory action."}</p>
                      <div className={styles.toolbar}>
                        <a className={styles.ghostButton} href={document.url} target="_blank" rel="noopener noreferrer">View File</a>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => approveEmployeeDocument({ id: document.id.toString() }))}>Approve</button>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "document", id: document.id.toString(), status: "Rejected" }))}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle}>CRM Source Approvals</h2>
                  <span className={styles.pill}>{pendingCrmSheets.length} pending</span>
                </div>
                <div className={styles.list}>
                  {pendingCrmSheets.length === 0 ? <div className={styles.emptyState}>No CRM requests.</div> : pendingCrmSheets.map((sheet) => (
                    <div className={styles.row} key={`approval-crm-${sheet.id}`}>
                      <div className={styles.rowHeader}><strong>{sheet.title}</strong><span className={styles.pill}>{sheet.status}</span></div>
                      <p className={styles.muted}>Role: {displayRole(sheet.ownerRole)} - Requested By: {sheet.requestedByName || "Unknown"}</p>
                      <div className={styles.toolbar}>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => approveCrmSheet({ id: sheet.id.toString(), status: "Approved" }))}>Approve Upload</button>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "crmSheet", id: sheet.id.toString(), status: "Rejected" }))}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle}>Applicants</h2>
                  <span className={styles.pill}>{pendingApplicants.length} pending</span>
                </div>
                <div className={styles.list}>
                  {pendingApplicants.length === 0 ? <div className={styles.emptyState}>No applicants.</div> : pendingApplicants.map((applicant) => (
                    <div className={styles.row} key={`approval-applicant-${applicant.id}`}>
                      <div className={styles.rowHeader}><strong>{applicant.name}</strong><span className={styles.pill}>{applicant.roleApplied}</span></div>
                      <p className={styles.muted}>{applicant.email} {applicant.phone || ""}</p>
                      <div className={styles.toolbar}>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "applicant", id: applicant.id.toString(), status: "Offer" }))}>Accept</button>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "applicant", id: applicant.id.toString(), status: "Rejected" }))}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle}>Leave & Expenses</h2>
                  <span className={styles.pill}>{pendingLeaveRequests.length + pendingExpenseClaims.length} pending</span>
                </div>
                <div className={styles.list}>
                  {pendingLeaveRequests.map((leave) => (
                    <div className={styles.row} key={`approval-leave-${leave.id}`}>
                      <div className={styles.rowHeader}><strong>{leave.employeeName}</strong><span className={styles.pill}>Leave</span></div>
                      <p className={styles.muted}>{leave.leaveType} - {formatPortalDate(leave.startsAt)} to {formatPortalDate(leave.endsAt)}</p>
                      <div className={styles.toolbar}>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "leave", id: leave.id.toString(), status: "Approved" }))}>Approve</button>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "leave", id: leave.id.toString(), status: "Rejected" }))}>Reject</button>
                      </div>
                    </div>
                  ))}
                  {pendingExpenseClaims.map((claim) => (
                    <div className={styles.row} key={`approval-expense-${claim.id}`}>
                      <div className={styles.rowHeader}><strong>{claim.employeeName}</strong><span className={styles.pill}>Expense</span></div>
                      <p className={styles.muted}>{claim.category} - Rs. {formatPortalNumber(claim.amount)}</p>
                      <div className={styles.toolbar}>
                        {claim.receiptUrl && <a className={styles.ghostButton} href={claim.receiptUrl} target="_blank" rel="noopener noreferrer">Receipt</a>}
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "expense", id: claim.id.toString(), status: "Approved" }))}>Approve</button>
                        <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "expense", id: claim.id.toString(), status: "Rejected" }))}>Reject</button>
                      </div>
                    </div>
                  ))}
                  {pendingLeaveRequests.length + pendingExpenseClaims.length === 0 && <div className={styles.emptyState}>No leave or expense approvals.</div>}
                </div>
              </div>
            </div>
          </div>
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
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Work Operations</div>
              <div style={{ flex: 1 }} />
              <div className={styles.vercelToolbarActions}>
                {data.capabilities.canUseSuperiorDashboard && data.capabilities.canManageOps && (
                  <>
                    <button className={styles.ghostButton} type="button" onClick={() => setActiveModal({ id: "create-attendance" })}>Add Attendance</button>
                    <button className={styles.ghostButton} type="button" onClick={() => setActiveModal({ id: "create-leave" })}>Add Leave</button>
                    <button className={styles.vercelButtonPrimary} type="button" onClick={() => setActiveModal({ id: "create-task" })}>Assign Task +</button>
                  </>
                )}
              </div>
            </div>

            <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 24 }}>
              <div className={styles.vercelCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle} style={{ margin: 0 }}>Leave & Attendance Calendar</h2>
                  <span className={styles.pill}>{calendarItems.length} items</span>
                </div>
                <div className={styles.calendarStrip} style={{ display: "flex", gap: 12, overflowX: "auto", padding: "16px 0", msOverflowStyle: "none", scrollbarWidth: "none" }}>
                  {calendarItems.length === 0 ? <div className={styles.emptyState} style={{ width: "100%" }}>No calendar activity yet.</div> : calendarItems.map((item) => (
                    <div className={styles.calendarItem} key={item.id} style={{ minWidth: 200, padding: 16, background: "var(--bg-shell)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                      <span className={styles.label} style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>{formatPortalDate(item.date)}</span>
                      <strong style={{ display: "block", marginBottom: 4 }}>{item.title}</strong>
                      <p className={styles.muted} style={{ fontSize: "0.8rem", margin: 0 }}>{item.kind} - {item.meta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.vercelContentGrid} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div className={styles.vercelCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle} style={{ margin: 0 }}>Attendance & Timesheets</h2>
                  <span className={styles.pill}>{data.attendance.length} records</span>
                </div>
                <div className={styles.list}>
                  {data.attendance.length === 0 ? <div className={styles.emptyState}>No attendance records yet.</div> : data.attendance.slice(0, visibleOpsAttendance).map((entry) => (
                    <div className={styles.row} key={entry.id}>
                      <div className={styles.rowHeader}>
                        <strong>{entry.employeeName}</strong>
                        <span className={entry.logoutAt ? styles.pill : `${styles.pill} ${styles.pillSuccess}`}>{entry.logoutAt ? entry.status : "Working now"}</span>
                      </div>
                      <p className={styles.muted} style={{ fontSize: '0.85rem' }}>
                        {formatPortalDate(entry.workDate)} | In: {formatPortalTime(entry.loginAt)} | Out: {entry.logoutAt ? formatPortalTime(entry.logoutAt) : "Live"} | {entry.totalHours.toFixed(2)} hrs
                      </p>
                      {entry.notes && <p style={{ fontSize: '0.8rem', padding: '6px', background: 'var(--bg-shell)', borderRadius: '4px', margin: 0 }}>{entry.notes}</p>}
                      {data.capabilities.canUseSuperiorDashboard && data.capabilities.canManageOps && (
                        <div className={styles.toolbar}>
                          <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "attendance", id: entry.id.toString() }))}>Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {data.attendance.length > visibleOpsAttendance && (
                  <button className={styles.ghostButton} type="button" onClick={() => setVisibleOpsAttendance(v => v + 5)} style={{ width: '100%', marginTop: '16px' }}>Show More (5)</button>
                )}
              </div>

              <div className={styles.vercelCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle} style={{ margin: 0 }}>Leave Board</h2>
                  <span className={styles.pill}>{data.leaveRequests.length} requests</span>
                </div>
                <div className={styles.list}>
                  {data.leaveRequests.length === 0 ? <div className={styles.emptyState}>No leave requests yet.</div> : data.leaveRequests.slice(0, visibleOpsLeave).map((leave) => (
                    <div className={styles.row} key={leave.id}>
                      <div className={styles.rowHeader}>
                        <strong>{leave.employeeName}</strong>
                        <span className={leave.status === "Approved" ? `${styles.pill} ${styles.pillSuccess}` : leave.status === "Rejected" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{leave.status}</span>
                      </div>
                      <p className={styles.muted} style={{ fontSize: '0.85rem' }}>{leave.leaveType} | {formatPortalDate(leave.startsAt)} to {formatPortalDate(leave.endsAt)}</p>
                      {leave.reason && <p style={{ fontSize: '0.8rem', padding: '6px', background: 'var(--bg-shell)', borderRadius: '4px', margin: 0 }}>{leave.reason}</p>}
                      {data.capabilities.canUseSuperiorDashboard && data.capabilities.canManageOps && (
                        <div className={styles.toolbar}>
                          <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "leave", id: leave.id.toString(), status: "Approved" }))}>Approve</button>
                          <button className={styles.ghostButton} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "leave", id: leave.id.toString(), status: "Rejected" }))}>Reject</button>
                          <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "leave", id: leave.id.toString() }))}>Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {data.leaveRequests.length > visibleOpsLeave && (
                  <button className={styles.ghostButton} type="button" onClick={() => setVisibleOpsLeave(v => v + 5)} style={{ width: '100%', marginTop: '16px' }}>Show More (5)</button>
                )}
              </div>

              <div className={styles.vercelCard} style={{ gridColumn: "1 / -1" }}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.cardTitle} style={{ margin: 0 }}>Task Tracker</h2>
                  <span className={styles.pill}>{data.tasks.length} visible</span>
                </div>
                <div className={styles.list}>
                  {data.tasks.length === 0 ? <div className={styles.emptyState}>No tasks yet.</div> : data.tasks.map((task) => (
                    <div className={styles.row} key={task.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
                      <div>
                        <div className={styles.rowHeader}><strong>{task.title}</strong><span className={task.priority === "High" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{task.priority}</span></div>
                        <p className={styles.muted}>{task.assignedName || displayRole(task.ownerRole)} - {task.status}{task.dueAt ? ` - Due ${formatPortalDateTime(task.dueAt)}` : ""}</p>
                        {task.proofUrl && <a href={task.proofUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem" }}>Open proof</a>}
                      </div>
                      <div className={styles.toolbar} style={{ flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["Pending", "Needs Review", "Blocked", "Done"].map((status) => <button className={styles.ghostButton} key={status} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "task", id: task.id.toString(), status }))}>{status}</button>)}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {data.capabilities.canUseSuperiorDashboard && data.capabilities.canManageOps && (
                            <>
                              <button className={styles.ghostButton} type="button" onClick={() => setActiveModal({ id: "edit-task", payload: task })}>Edit</button>
                              <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "task", id: task.id.toString() }))}>Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


        {tab === "expenses" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>{canManageExpenseClaims ? "Expense Desk" : "My Claims"}</div>
              <div style={{ flex: 1 }} />
              <button 
                className={styles.vercelButtonPrimary} 
                type="button" 
                onClick={() => setActiveModal({ id: "create-expense" })}
              >
                {canManageExpenseClaims ? "Record Claim +" : "Submit Claim +"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
              <div className={styles.vercelCard} style={{ padding: 24, borderTop: "3px solid var(--text-brand)" }}>
                <h2 className={styles.cardTitle}>Total Value</h2>
                <span className={styles.metricValue}>Rs. {formatPortalNumber(data.expenses.reduce((sum, claim) => sum + Number(claim.amount || 0), 0))}</span>
                <p className={styles.muted} style={{ fontSize: "0.85rem" }}>Visible claims.</p>
              </div>
              <div className={styles.vercelCard} style={{ padding: 24 }}>
                <h2 className={styles.cardTitle}>Pending</h2>
                <span className={styles.metricValue}>{data.expenses.filter((claim) => claim.status === "Pending").length}</span>
                <p className={styles.muted} style={{ fontSize: "0.85rem" }}>Claims awaiting review.</p>
              </div>
              <div className={styles.vercelCard} style={{ padding: 24 }}>
                <h2 className={styles.cardTitle}>Approved</h2>
                <span className={styles.metricValue}>{data.expenses.filter((claim) => claim.status === "Approved").length}</span>
                <p className={styles.muted} style={{ fontSize: "0.85rem" }}>Accepted but not paid.</p>
              </div>
              <div className={styles.vercelCard} style={{ padding: 24 }}>
                <h2 className={styles.cardTitle}>Paid</h2>
                <span className={styles.metricValue}>{data.expenses.filter((claim) => claim.status === "Paid").length}</span>
                <p className={styles.muted} style={{ fontSize: "0.85rem" }}>Completed reimbursements.</p>
              </div>
            </div>

            <div className={styles.vercelCard}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.cardTitle} style={{ margin: 0 }}>Expense Claims</h3>
                <span className={styles.pill}>{data.expenses.length} claims</span>
              </div>
              
              <div className={styles.list}>
                {data.expenses.length === 0 ? (
                  <div className={styles.emptyState}>No expense claims yet.</div>
                ) : (
                  data.expenses.map((claim) => (
                    <div className={styles.row} key={claim.id}>
                      <div className={styles.rowHeader}>
                        <strong>{claim.employeeName}</strong>
                        <span className={styles.pill}>{claim.status}</span>
                      </div>
                      <p className={styles.muted}>{claim.category} - Rs. {formatPortalNumber(claim.amount)} - {formatPortalDate(claim.claimDate)}</p>
                      {claim.receiptUrl && <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer">Open receipt</a>}
                      
                      <div className={styles.toolbar}>
                        {canManageExpenseClaims && (
                          ["Approved", "Rejected", "Paid"].map((status) => (
                            <button className={styles.ghostButton} key={status} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "expense", id: claim.id.toString(), status }))}>{status}</button>
                          ))
                        )}
                        {canManageExpenseClaims && (
                          <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "expense", id: claim.id.toString() }))}>Delete</button>
                        )}
                        {(canManageExpenseClaims || claim.status === "Pending") && (
                          <button 
                            className={styles.ghostButton} 
                            type="button" 
                            onClick={() => setActiveModal({ id: "edit-expense", payload: claim })}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}


        {tab === "payroll" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Salary Management</div>
              <div style={{ flex: 1 }} />
              <button className={styles.ghostButton} type="button" onClick={() => downloadCsv("bluevolt-payroll.csv", payrollRows)} style={{ padding: "6px 12px", minHeight: "unset", fontSize: "0.85rem" }}>Export CSV</button>
              {data.capabilities.canManagePayroll && null}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
              <div className={styles.vercelCard} style={{ padding: 24, borderTop: "3px solid var(--text-brand)" }}>
                <span className={styles.muted} style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Total Payroll</span>
                <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>Rs. {formatPortalNumber(payrollTotal)}</div>
              </div>
              <div className={styles.vercelCard} style={{ padding: 24, borderTop: "3px solid #f59e0b" }}>
                <span className={styles.muted} style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Ready to Pay</span>
                <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{payrollReady}</div>
              </div>
              <div className={styles.vercelCard} style={{ padding: 24, borderTop: "3px solid #10b981" }}>
                <span className={styles.muted} style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Paid</span>
                <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{payrollPaid}</div>
              </div>
              <div className={styles.vercelCard} style={{ padding: 24, borderTop: "3px solid #6366f1" }}>
                <span className={styles.muted} style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Employees</span>
                <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{employees.length}</div>
              </div>
            </div>

            <div className={styles.vercelCard} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Payroll Records</h3>
                  <p className={styles.muted} style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>Salary/stipend, unpaid leave, bonus, deductions, and payment status.</p>
                </div>
                <span className={styles.pill}>{data.payrollInputs.length} records</span>
              </div>
              
              <div className={styles.smartTable} style={{ margin: 0, border: "none", borderRadius: 0 }}>
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
                      <span className={styles.avatar} style={{ width: 36, height: 36, fontSize: "0.9rem" }}>{payroll.employeeName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <strong style={{ fontSize: "0.95rem" }}>{payroll.employeeName}</strong>
                        <small style={{ color: "var(--text-muted)" }}>{payroll.workingDays} days worked, {payroll.unpaidLeaveDays} unpaid leave</small>
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>{payroll.payPeriod}</span>
                    <span className={styles.pill} style={{ justifySelf: "flex-start", background: "var(--bg-shell)" }}>{payroll.payType}</span>
                    <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)" }}>Rs. {formatPortalNumber(payroll.amount)}</strong>
                    <span className={payroll.status === "Paid" ? `${styles.pill} ${styles.pillSuccess}` : payroll.status === "Hold" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{payroll.status}</span>
                    {data.capabilities.canManagePayroll && null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "reports" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Reports & Exports</div>
              <div style={{ flex: 1 }} />
              <button className={styles.vercelButtonPrimary} type="button" onClick={() => {
                downloadCsv("bluevolt-all-reports-summary.csv", [
                  { report: "employees", records: employees.length },
                  { report: "applicants", records: data.applicants.length },
                  { report: "attendance", records: data.attendance.length },
                  { report: "payroll", records: data.payrollInputs.length },
                  { report: "resources", records: data.resources.length },
                  { report: "documents", records: data.documents.length },
                  { report: "expenses", records: data.expenses.length },
                ]);
              }}>Export All Summary</button>
            </div>
            
            <div className={styles.vercelProjectsGrid}>
              {[
                { title: "Employee Report", hint: "Roster, roles, work type, paid/unpaid status", count: employees.length, action: () => downloadCsv("bluevolt-employees.csv", employeeRows) },
                { title: "Applicant Report", hint: "Public form submissions and decisions", count: data.applicants.length, action: () => downloadCsv("bluevolt-applicants.csv", applicantRows) },
                { title: "Attendance Report", hint: "Check-in, check-out, and total hours", count: data.attendance.length, action: () => downloadCsv("bluevolt-attendance.csv", attendanceRows) },
                { title: "Payroll Report", hint: "Salary/stipend inputs and status", count: data.payrollInputs.length, action: () => downloadCsv("bluevolt-payroll.csv", payrollRows) },
                { title: "Resource Report", hint: "Links, files, tags, and role visibility", count: data.resources.length, action: () => downloadCsv("bluevolt-resources.csv", data.resources.map((item) => ({ title: item.title, type: item.resourceType, url: item.url, audience: item.audienceRoles, tags: item.tags || "" }))) },
                { title: "Expense Report", hint: "Claims, receipts, amounts, and status", count: data.expenses.length, action: () => downloadCsv("bluevolt-expenses.csv", data.expenses.map((item) => ({ employee: item.employeeName, category: item.category, amount: item.amount, date: formatPortalDate(item.claimDate), status: item.status, receipt: item.receiptUrl || "" }))) },
              ].map((report) => (
                <div className={styles.vercelProjectCard} key={report.title}>
                  <div className={styles.vercelProjectHeader} style={{ paddingBottom: 16 }}>
                    <div>
                      <h4 style={{ fontSize: "1.05rem" }}>{report.title}</h4>
                      <span className={styles.muted} style={{ fontSize: "0.85rem", marginTop: 4, display: "block" }}>{report.hint}</span>
                    </div>
                  </div>
                  <div className={styles.vercelProjectFooter} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                    <span className={styles.pill}>{report.count} records</span>
                    <button className={styles.ghostButton} type="button" onClick={report.action} style={{ padding: "6px 12px", minHeight: "unset" }}>Download CSV</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Performance Reviews</div>
              <div style={{ flex: 1 }} />
              {data.capabilities.canReviewPerformance && null}
            </div>

            <div className={styles.vercelProjectsGrid}>
              {data.reviews.length === 0 ? <div className={styles.emptyState} style={{ gridColumn: "1 / -1" }}>No performance reviews found.</div> : data.reviews.map((review) => (
                <div className={styles.vercelProjectCard} key={review.id}>
                  <div className={styles.vercelProjectHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className={styles.avatar} style={{ width: 36, height: 36 }}>{review.employeeName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                      <div>
                        <h4>{review.employeeName}</h4>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{review.reviewPeriod}</span>
                      </div>
                    </div>
                    <span className={styles.vercelCardTag} style={{ background: "var(--bg-shell)", fontWeight: 700 }}>{review.score}/10</span>
                  </div>
                  <div className={styles.vercelProjectDesc} style={{ minHeight: 60 }}>
                    {review.kpiSummary ? <p style={{ fontSize: "0.85rem", lineHeight: 1.5, margin: 0 }}>{review.kpiSummary}</p> : <p className={styles.muted} style={{ fontSize: "0.85rem", margin: 0, fontStyle: "italic" }}>No KPI summary provided.</p>}
                  </div>
                  <div className={styles.vercelProjectFooter} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span className={review.status === "Final" ? `${styles.pill} ${styles.pillSuccess}` : styles.pill}>{review.status}</span>
                    {data.capabilities.canReviewPerformance && null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "documents" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Employee Documents</div>
              <div style={{ flex: 1 }} />
              {data.capabilities.canManageDocuments && null}
            </div>

            <div className={styles.vercelProjectsGrid}>
              {data.documents.length === 0 ? <div className={styles.emptyState}>No documents yet.</div> : data.documents.map((document) => (
                <div className={styles.vercelProjectCard} key={document.id}>
                  <div className={styles.vercelProjectHeader}>
                    <div className={styles.vercelProjectMeta}>
                      <h4>{document.title}</h4>
                      <span>{document.employeeName || "General"} - {document.visibilityRoles}</span>
                    </div>
                    <div className={documentApproved(document.notes) ? styles.vercelProjectStatusIndicatorActive : documentPending(document.notes) ? styles.vercelProjectStatusIndicatorWarning : styles.vercelAlertIndicatorRed} title={documentWorkflowStatus(document.notes)} />
                  </div>
                  <div className={styles.vercelProjectDesc}>
                    <p style={{ margin: "0 0 8px" }}><strong>Type:</strong> <span className={styles.vercelCardTag}>{document.documentType}</span></p>
                    <div className={styles.compactMeta} style={{ margin: "8px 0" }}>
                      <span className={styles.pill}>Signatory: {documentMeta(document.notes, "Approved by") || "Not signed"}</span>
                      <span className={styles.pill}>Signed: {documentMeta(document.notes, "Signed at") ? formatPortalDateTime(documentMeta(document.notes, "Signed at")) : "Pending"}</span>
                    </div>
                    {cleanDocumentNotes(document.notes) && <p>{cleanDocumentNotes(document.notes)}</p>}
                  </div>
                  <div className={styles.vercelProjectFooter} style={{ flexWrap: "wrap", gap: 8 }}>
                    <a href={document.url} target="_blank" rel="noopener noreferrer" className={styles.button} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }}>Open</a>
                    {data.capabilities.canSignDocuments && !documentApproved(document.notes) && (
                      <button className={styles.button} type="button" style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", background: "#10b981", color: "white", borderColor: "#10b981" }} onClick={() => runAction(() => approveEmployeeDocument({ id: document.id.toString() }))}>Approve</button>
                    )}
                    {data.capabilities.canManageDocuments && <button className={styles.ghostButton} type="button" style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", color: "#ef4444" }} onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "document", id: document.id.toString() }))}>Delete</button>}
                    {data.capabilities.canManageDocuments && null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "announcements" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Announcements</div>
              <div style={{ flex: 1 }} />
              {data.capabilities.canPublishAnnouncements && (
                <button className={styles.vercelButtonPrimary} style={{ margin: 0, padding: "8px 12px", minHeight: "unset" }} onClick={() => setActiveModal({ id: "create-announcement" })}>
                  New Announcement +
                </button>
              )}
            </div>

            <div className={styles.vercelProjectsGrid}>
              {data.announcements.length === 0 ? <div className={styles.emptyState}>No announcements yet.</div> : data.announcements.map((announcement) => (
                <div className={styles.vercelProjectCard} key={announcement.id} style={announcement.priority === "Urgent" ? { borderColor: "rgba(239, 68, 68, 0.5)", background: "var(--error-bg)" } : {}}>
                  <div className={styles.vercelProjectHeader}>
                    <div className={styles.vercelProjectMeta}>
                      <h4>{announcement.title}</h4>
                      <span>Visible to: {displayRole(announcement.audienceRoles)}</span>
                    </div>
                    <div className={announcement.priority === "Urgent" ? styles.vercelAlertIndicatorRed : announcement.priority === "Important" ? styles.vercelAlertIndicatorOrange : styles.vercelAlertIndicatorGreen} title={announcement.priority} />
                  </div>
                  <div className={styles.vercelProjectDesc}>
                    <p style={{ margin: "8px 0", lineHeight: "1.5", color: "var(--text-primary)" }}>{announcement.body}</p>
                    <p className={styles.muted} style={{ fontSize: "0.75rem", marginTop: 12 }}>
                      {formatPortalTimeAgo(announcement.createdAt)}
                    </p>
                  </div>
                  <div className={styles.vercelProjectFooter} style={{ flexWrap: "wrap", gap: 8 }}>
                    {data.capabilities.canPublishAnnouncements && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", color: "#ef4444" }} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "announcement", id: announcement.id.toString() }))}>
                        Delete
                      </button>
                    )}
                    {data.capabilities.canPublishAnnouncements && (
                      <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }} type="button" onClick={() => setActiveModal({ id: "edit-announcement", payload: announcement })}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "meetings" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Meeting Schedule</div>
              <div style={{ flex: 1 }} />
              {data.capabilities.canScheduleMeetings && (
                <button className={styles.vercelButtonPrimary} style={{ margin: 0, padding: "8px 12px", minHeight: "unset" }} onClick={() => setActiveModal({ id: "create-meeting" })}>
                  Schedule Meeting +
                </button>
              )}
            </div>

            <div className={styles.vercelProjectsGrid}>
              {data.meetings.length === 0 ? (
                <div className={styles.emptyState}>No visible meetings yet.</div>
              ) : (
                data.meetings.map((meeting) => (
                  <div className={styles.vercelProjectCard} key={meeting.id}>
                    <div className={styles.vercelProjectHeader}>
                      <div className={styles.vercelProjectMeta}>
                        <h4>{meeting.title}</h4>
                        <span>{displayRole(meeting.audienceRoles)}</span>
                      </div>
                      <div className={styles.vercelProjectStatusIndicatorActive} title="Scheduled" />
                    </div>
                    <div className={styles.vercelProjectDesc}>
                      <p style={{ margin: "0 0 12px", color: "var(--text-primary)", fontWeight: 500 }}>
                        {formatPortalDateTime(meeting.startsAt)} – {formatPortalDateTime(meeting.endsAt)}
                      </p>
                      {meeting.notes && (
                        <p className={styles.muted} style={{ fontSize: "0.84rem", background: "var(--bg-shell)", padding: "10px 14px", borderRadius: 8, borderLeft: "3px solid var(--border-color)" }}>
                          {meeting.notes}
                        </p>
                      )}
                    </div>
                    <div className={styles.vercelProjectFooter} style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      {meeting.meetUrl && (
                        <a className={styles.button} href={meeting.meetUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", background: "#10b981", color: "white", borderColor: "#10b981", textDecoration: "none" }}>
                          Join Meet
                        </a>
                      )}
                      <a className={styles.ghostButton} href={meeting.calendarUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", textDecoration: "none" }}>
                        Add to Calendar
                      </a>
                      {data.capabilities.canScheduleMeetings && (
                        <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", color: "#ef4444" }} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "meeting", id: meeting.id.toString() }))}>
                          Delete
                        </button>
                      )}
                      {data.capabilities.canScheduleMeetings && (
                          <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }} type="button" onClick={() => setActiveModal({ id: "edit-meeting", payload: meeting })}>
                            Edit
                          </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "resources" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>Resource Library</div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
                {data.capabilities.canManageResources && (
                <button className={styles.vercelButtonPrimary} style={{ margin: 0, padding: "8px 12px", minHeight: "unset" }} onClick={() => setActiveModal({ id: "create-resource" })}>
                  Publish Resource +
                </button>
                )}
              </div>
            </div>

            <div className={styles.vercelProjectsGrid}>
              {filteredResources.length === 0 ? <div className={styles.emptyState}>No matching resources.</div> : filteredResources.map((resource) => {
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
                  <div className={styles.vercelProjectCard} key={resource.id}>
                    <div className={styles.vercelProjectHeader}>
                      <div className={styles.vercelProjectMeta} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.2rem" }}>{renderIcon()}</span>
                        <div>
                          <h4>{resource.title}</h4>
                          <span>Visible to: {displayRole(resource.audienceRoles)} {resource.tags ? `• ${resource.tags}` : ""}</span>
                        </div>
                      </div>
                      <span className={styles.vercelCardTag}>{resource.resourceType}</span>
                    </div>
                    <div className={styles.vercelProjectDesc}>
                      {resource.description && (
                        <p style={{ fontSize: "0.85rem", lineHeight: "1.4", margin: "8px 0", color: "var(--text-primary)" }}>
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <div className={styles.vercelProjectFooter} style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      <a className={styles.button} href={resource.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", background: "var(--text-primary)", color: "var(--text-inverse)", borderColor: "var(--text-primary)" }}>
                        Open / Download
                      </a>
                      {data.capabilities.canManageResources && (
                        <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset", color: "#ef4444" }} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "resource", id: resource.id.toString() }))}>
                          Delete
                        </button>
                      )}
                      {data.capabilities.canManageResources && (
                          <button className={styles.ghostButton} style={{ fontSize: "0.75rem", padding: "4px 10px", minHeight: "unset" }} type="button" onClick={() => setActiveModal({ id: "edit-resource", payload: resource })}>
                            Edit
                          </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div className={styles.vercelDashboard}>
            <div className={styles.vercelToolbar}>
              <div className={styles.vercelBreadcrumbProject}>BLUEVOLT team room</div>
              <div style={{ flex: 1 }} />
              <div className={styles.vercelToolbarActions}>
                <span className={styles.pill}>{data.chatMessages.length} messages</span>
                <button className={styles.ghostButton} type="button" onClick={() => refresh(sortResources, "chat")}>Refresh</button>
              </div>
            </div>

            <div className={styles.vercelCard} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", padding: 0, overflow: "hidden" }}>
              <div className={styles.chatMessagesArea} style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                {data.chatMessages.length === 0 ? (
                  <div className={styles.emptyState}>No messages yet. Start the conversation!</div>
                ) : (
                  data.chatMessages.map((message) => {
                    const isMine = message.employeeId === currentUserId;
                    const initials = message.employeeName
                      ? message.employeeName
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0].toUpperCase())
                          .join("")
                      : "??";

                    return (
                      <div
                        key={message.id}
                        className={`${styles.chatMessageRow} ${isMine ? styles.chatMessageRowMine : ""}`}
                        style={{ display: "flex", gap: 12, marginBottom: 16, flexDirection: isMine ? "row-reverse" : "row" }}
                      >
                        {!isMine && (
                          <div className={styles.chatAvatar} title={message.employeeName} style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 600 }}>
                            {initials}
                          </div>
                        )}
                        <div className={styles.chatBubbleContent} style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                          <div className={`${styles.chatMeta} ${isMine ? styles.chatMetaMine : ""}`} style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4, display: "flex", gap: 8 }}>
                            <span className={styles.chatSenderName} style={{ fontWeight: 600 }}>
                              {isMine ? "You" : message.employeeName}
                            </span>
                            <span className={styles.chatSenderRole}>
                              {displayRole(message.employeeRole)}
                            </span>
                            <span>{formatPortalTimeAgo(message.createdAt)}</span>
                          </div>
                          <div
                            className={`${styles.chatBubbleNew} ${isMine ? styles.chatBubbleNewMine : ""} ${
                              (message as { sending?: boolean }).sending ? styles.chatBubbleSending : ""
                            }`}
                            style={{ 
                              background: isMine ? "var(--text-brand)" : "var(--bg-shell)", 
                              color: isMine ? "#fff" : "var(--text-primary)", 
                              border: isMine ? "none" : "1px solid var(--border-color)",
                              padding: "10px 14px",
                              borderRadius: 12,
                              borderTopRightRadius: isMine ? 4 : 12,
                              borderTopLeftRadius: isMine ? 12 : 4,
                              fontSize: "0.9rem",
                              opacity: (message as { sending?: boolean }).sending ? 0.7 : 1
                            }}
                          >
                            <p style={{ margin: 0 }}>{message.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: 16, borderTop: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
                <form
                  className={styles.chatInputContainer}
                  onSubmit={handleSendChatMessage}
                  style={{ display: "flex", gap: 12, alignItems: "flex-end" }}
                >
                  <div className={styles.chatInputWrapper} style={{ flex: 1, position: "relative" }}>
                    <textarea
                      className={styles.chatTextarea}
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChatMessage();
                        }
                      }}
                      rows={1}
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 20, border: "1px solid var(--border-color)", background: "var(--bg-input)", resize: "none", minHeight: 44, maxHeight: 120, outline: "none", fontSize: "0.95rem" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.chatSendButton}
                    disabled={!chatInputText.trim()}
                    title="Send Message"
                    style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--text-brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: chatInputText.trim() ? "pointer" : "not-allowed", opacity: chatInputText.trim() ? 1 : 0.5, flexShrink: 0 }}
                  >
                    <MessageCircle size={20} />
                  </button>
                </form>
              </div>
            </div>
          </div>
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
            importEmployees={importEmployees}
            openPortalTab={openPortalTab}
            setUserManagementOpen={setUserManagementOpen}
            activeEmployeeMenuId={activeEmployeeMenuId}
            setActiveEmployeeMenuId={setActiveEmployeeMenuId}
            confirmDelete={confirmDelete}
            currentUserId={currentUserId}
          />
        )}

        {activeModal?.id === "create-expense" && (
          <Modal title={canManageExpenseClaims ? "Create / Record Claim" : "New Expense Claim"} subtitle={canManageExpenseClaims ? "Select an employee only when recording a claim on behalf of someone else." : `This claim will be submitted as ${data.session.name}.`} onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveExpenseClaim, () => setActiveModal(null))}>
              {canManageExpenseClaims && <Field label="Employee" name="employeeId" options={employeeOptions} wide />}
              <Field label="Category" name="category" options={["Travel", "Food", "Software", "Office", "General"]} />
              <Field label="Amount" name="amount" type="number" required />
              <Field label="Claim Date" name="claimDate" type="date" required />
              <Field label="Receipt URL" name="receiptUrl" type="url" wide />
              {canManageExpenseClaims && <Field label="Status" name="status" options={["Pending", "Approved", "Rejected", "Paid"]} />}
              <Field label="Notes" name="notes" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">{canManageExpenseClaims ? "Save Claim" : "Submit Claim"}</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "edit-expense" && activeModal.payload && (
          <Modal title="Edit Expense" subtitle="Update claim details." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveExpenseClaim, () => setActiveModal(null))}>
              <input type="hidden" name="id" value={activeModal.payload.id} />
              {canManageExpenseClaims && <Field label="Employee" name="employeeId" options={employeeOptions} defaultValue={activeModal.payload.employeeId.toString()} wide />}
              <Field label="Category" name="category" options={["Travel", "Food", "Software", "Office", "General"]} defaultValue={activeModal.payload.category} />
              <Field label="Amount" name="amount" type="number" defaultValue={activeModal.payload.amount.toString()} required />
              <Field label="Claim Date" name="claimDate" type="date" defaultValue={inputDate(activeModal.payload.claimDate)} required />
              <Field label="Receipt URL" name="receiptUrl" type="url" defaultValue={activeModal.payload.receiptUrl || ""} wide />
              {canManageExpenseClaims && <Field label="Status" name="status" options={["Pending", "Approved", "Rejected", "Paid"]} defaultValue={activeModal.payload.status} />}
              <Field label="Notes" name="notes" textarea defaultValue={activeModal.payload.notes || ""} wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Expense</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "create-attendance" && (
          <Modal title="Attendance Entry" subtitle="Add or adjust attendance." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveAttendance, () => setActiveModal(null))}>
              <Field label="Employee" name="employeeId" options={employeeOptions} required wide />
              <Field label="Work Date" name="workDate" type="date" required />
              <Field label="Login At" name="loginAt" type="datetime-local" />
              <Field label="Logout At" name="logoutAt" type="datetime-local" />
              <Field label="Total Hours" name="totalHours" type="number" />
              <Field label="Status" name="status" options={["Present", "Absent", "Late", "Half-day", "Remote"]} />
              <Field label="Notes" name="notes" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Attendance</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "create-leave" && (
          <Modal title="Leave Request" subtitle="Apply for or record a leave." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveLeaveRequest, () => setActiveModal(null))}>
              {data.capabilities.canUseSuperiorDashboard && data.capabilities.canManageOps && <Field label="Employee" name="employeeId" options={employeeOptions} wide />}
              <Field label="Leave Type" name="leaveType" options={["Casual", "Sick", "Unpaid", "Emergency", "Comp Off"]} />
              <Field label="Starts" name="startsAt" type="date" required />
              <Field label="Ends" name="endsAt" type="date" required />
              <Field label="Reason" name="reason" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Leave</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "create-task" && (
          <Modal title="Assign Task" subtitle="Create a new task." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveTask, () => setActiveModal(null))}>
              <Field label="Title" name="title" required wide />
              <Field label="Assign To" name="assignedTo" options={[{ label: "Role based / unassigned", value: "" }, ...employeeOptions]} wide />
              <Field label="Owner Role" name="ownerRole" options={ownerRoleOptions} />
              <Field label="Priority" name="priority" options={["High", "Medium", "Low"]} />
              <Field label="Status" name="status" options={["Pending", "Needs Review", "Blocked", "Done"]} />
              <Field label="Due At" name="dueAt" type="datetime-local" />
              <Field label="Proof URL" name="proofUrl" type="url" wide />
              <Field label="Description" name="description" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Task</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "edit-task" && activeModal.payload && (
          <Modal title="Edit Task" subtitle="Update task details." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveTask, () => setActiveModal(null))}>
              <input type="hidden" name="id" value={activeModal.payload.id} />
              <Field label="Title" name="title" defaultValue={activeModal.payload.title} required wide />
              <Field label="Assign To" name="assignedTo" options={[{ label: "Role based / unassigned", value: "" }, ...employeeOptions]} defaultValue={activeModal.payload.assignedTo?.toString() || ""} wide />
              <Field label="Owner Role" name="ownerRole" options={ownerRoleOptions} defaultValue={activeModal.payload.ownerRole} />
              <Field label="Priority" name="priority" options={["High", "Medium", "Low"]} defaultValue={activeModal.payload.priority} />
              <Field label="Status" name="status" options={["Pending", "Needs Review", "Blocked", "Done"]} defaultValue={activeModal.payload.status === "Open" ? "Pending" : activeModal.payload.status} />
              <Field label="Due At" name="dueAt" type="datetime-local" defaultValue={inputDateTime(activeModal.payload.dueAt)} />
              <Field label="Proof URL" name="proofUrl" type="url" defaultValue={activeModal.payload.proofUrl || ""} wide />
              <Field label="Description" name="description" textarea defaultValue={activeModal.payload.description || ""} wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Task</button>
            </form>
          </Modal>
        )}
        {activeModal?.id === "create-announcement" && (
          <Modal title="New Announcement" subtitle="Broadcast a message to the team." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveAnnouncement, () => setActiveModal(null))}>
              <Field label="Title" name="title" required wide />
              <Field label="Body" name="body" textarea required wide />
              <Field label="Important" name="isImportant" options={[{ label: "No", value: "false" }, { label: "Yes", value: "true" }]} defaultValue="false" />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Publish</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "edit-announcement" && activeModal.payload && (
          <Modal title="Edit Announcement" subtitle="Update broadcast message." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveAnnouncement, () => setActiveModal(null))}>
              <input type="hidden" name="id" value={activeModal.payload.id} />
              <Field label="Title" name="title" defaultValue={activeModal.payload.title} required wide />
              <Field label="Body" name="body" textarea defaultValue={activeModal.payload.body} required wide />
              <Field label="Important" name="isImportant" options={[{ label: "No", value: "false" }, { label: "Yes", value: "true" }]} defaultValue={activeModal.payload.isImportant ? "true" : "false"} />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "create-meeting" && (
          <Modal title="Schedule Meeting" subtitle="Create a new event." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveMeeting, () => setActiveModal(null))}>
              <Field label="Title" name="title" required wide />
              <Field label="Description" name="description" textarea wide />
              <Field label="Time" name="time" type="datetime-local" required />
              <Field label="Duration (min)" name="durationMinutes" type="number" defaultValue="30" required />
              <Field label="Type" name="meetingType" options={["Sync", "1-on-1", "All Hands", "Client", "Training"]} />
              <Field label="Meet URL" name="meetUrl" type="url" wide />
              <Field label="Location" name="location" />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Schedule</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "edit-meeting" && activeModal.payload && (
          <Modal title="Edit Meeting" subtitle="Update event details." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveMeeting, () => setActiveModal(null))}>
              <input type="hidden" name="id" value={activeModal.payload.id} />
              <Field label="Title" name="title" defaultValue={activeModal.payload.title} required wide />
              <Field label="Description" name="description" textarea defaultValue={activeModal.payload.description || ""} wide />
              <Field label="Time" name="time" type="datetime-local" defaultValue={inputDateTime(activeModal.payload.time)} required />
              <Field label="Duration (min)" name="durationMinutes" type="number" defaultValue={activeModal.payload.durationMinutes.toString()} required />
              <Field label="Type" name="meetingType" options={["Sync", "1-on-1", "All Hands", "Client", "Training"]} defaultValue={activeModal.payload.meetingType} />
              <Field label="Meet URL" name="meetUrl" type="url" defaultValue={activeModal.payload.meetUrl || ""} wide />
              <Field label="Location" name="location" defaultValue={activeModal.payload.location || ""} />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Meeting</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "create-resource" && (
          <Modal title="Publish Resource" subtitle="Share a learning resource." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveResource, () => setActiveModal(null))}>
              <Field label="Title" name="title" required />
              <Field label="Description" name="description" textarea required wide />
              <Field label="URL" name="url" type="url" required wide />
              <Field label="Type" name="resourceType" options={["Video", "Article", "Course", "Tool"]} />
              <Field label="Required Role" name="requiredRole" options={[{ label: "Everyone", value: "" }, ...ownerRoleOptions]} />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Publish Resource</button>
            </form>
          </Modal>
        )}

        {activeModal?.id === "edit-resource" && activeModal.payload && (
          <Modal title="Edit Resource" subtitle="Update resource link." onClose={() => setActiveModal(null)}>
            <form className={styles.formGrid} onSubmit={submit(saveResource, () => setActiveModal(null))}>
              <input type="hidden" name="id" value={activeModal.payload.id} />
              <Field label="Title" name="title" defaultValue={activeModal.payload.title} required />
              <Field label="Description" name="description" textarea defaultValue={activeModal.payload.description || ""} required wide />
              <Field label="URL" name="url" type="url" defaultValue={activeModal.payload.url} required wide />
              <Field label="Type" name="resourceType" options={["Video", "Article", "Course", "Tool"]} defaultValue={activeModal.payload.resourceType} />
              <Field label="Required Role" name="requiredRole" options={[{ label: "Everyone", value: "" }, ...ownerRoleOptions]} defaultValue={activeModal.payload.requiredRole || ""} />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Update Resource</button>
            </form>
          </Modal>
        )}

      </main>
    </div>
  );
}
