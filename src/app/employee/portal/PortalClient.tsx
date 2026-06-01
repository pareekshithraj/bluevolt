"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Briefcase, CalendarDays, ClipboardList, Clock3, Code2, FileText, Handshake, LogOut, PenLine, Search, Star, Target, UserCheck, Users, Video, WalletCards } from "lucide-react";
import {
  clockInEmployee,
  clockOutEmployee,
  approveCrmSheet,
  deleteEmployeeEntity,
  getEmployeePortalData,
  logoutEmployee,
  markNotificationRead,
  saveAnnouncement,
  saveApplicant,
  saveAttendance,
  saveCrmRecord,
  saveCrmSheetRequest,
  saveEmployeeDocument,
  saveEmployeeRoleDefinition,
  saveEmployeeUser,
  saveExpenseClaim,
  saveDepartment,
  saveLeaveRequest,
  saveMeeting,
  savePayrollInput,
  savePerformanceReview,
  saveResource,
  saveTask,
  updateCrmSheetRowStatus,
  updateCrmSheetRowData,
  updateEmployeeRecordStatus,
} from "@/app/actions/employee-portal";
import styles from "../portal.module.css";

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
  { id: "crm", label: "CRM", icon: Handshake },
  { id: "applicants", label: "Applicants", icon: Users },
  { id: "ops", label: "Work Ops", icon: ClipboardList },
  { id: "expenses", label: "Expenses", icon: WalletCards },
  { id: "payroll", label: "Payroll", icon: WalletCards },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "meetings", label: "Meetings", icon: Video },
  { id: "resources", label: "Resources", icon: FileText },
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
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
}

type SaveHandler = (payload: any) => Promise<{ success: boolean; error?: string }>;
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

function formatPortalNumber(value: number) {
  return portalNumberFormatter.format(value);
}

function formatWorkHours(value: number) {
  return `${value.toFixed(2)} hrs`;
}

function mergePortalData(previous: PortalData, incoming: PortalData, activeTab: PortalTab): PortalData {
  return {
    ...previous,
    ...incoming,
    users: ["dashboard", "admin", "ops"].includes(activeTab) ? incoming.users : previous.users,
    crmRecords: ["dashboard", "crm"].includes(activeTab) ? incoming.crmRecords : previous.crmRecords,
    crmSheets: activeTab === "crm" ? incoming.crmSheets : previous.crmSheets,
    applicants: activeTab === "applicants" ? incoming.applicants : previous.applicants,
    meetings: ["dashboard", "meetings"].includes(activeTab) ? incoming.meetings : previous.meetings,
    resources: ["dashboard", "resources"].includes(activeTab) ? incoming.resources : previous.resources,
    attendance: ["dashboard", "ops"].includes(activeTab) ? incoming.attendance : previous.attendance,
    leaveRequests: activeTab === "ops" ? incoming.leaveRequests : previous.leaveRequests,
    tasks: ["dashboard", "ops"].includes(activeTab) ? incoming.tasks : previous.tasks,
    payrollInputs: activeTab === "payroll" ? incoming.payrollInputs : previous.payrollInputs,
    reviews: activeTab === "reviews" ? incoming.reviews : previous.reviews,
    documents: ["dashboard", "documents"].includes(activeTab) ? incoming.documents : previous.documents,
    announcements: ["dashboard", "announcements"].includes(activeTab) ? incoming.announcements : previous.announcements,
    comments: activeTab === "ops" ? incoming.comments : previous.comments,
    departments: activeTab === "admin" ? incoming.departments : previous.departments,
    roleDefinitions: activeTab === "admin" ? incoming.roleDefinitions : previous.roleDefinitions,
    notifications: ["dashboard", "admin"].includes(activeTab) ? incoming.notifications : previous.notifications,
    expenses: activeTab === "expenses" ? incoming.expenses : previous.expenses,
    auditEvents: activeTab === "admin" ? incoming.auditEvents : previous.auditEvents,
  };
}

export default function PortalClient({ initialData }: { initialData: PortalData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<PortalTab>("dashboard");
  const [loadingTab, setLoadingTab] = useState<PortalTab | "">("");
  const [error, setError] = useState("");
  const [sortResources, setSortResources] = useState("newest");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState("all");
  const [workHoursEmployeeId, setWorkHoursEmployeeId] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [crmSheetPaste, setCrmSheetPaste] = useState("");
  const [crmSheetFileName, setCrmSheetFileName] = useState("");
  const [crmPanel, setCrmPanel] = useState<"none" | "source" | "record">("none");
  const [activeCrmSheetId, setActiveCrmSheetId] = useState<number | null>(null);
  const [selectedCrmRowId, setSelectedCrmRowId] = useState<number | null>(null);
  const [selectedCrmCell, setSelectedCrmCell] = useState<SelectedCrmCell | null>(null);
  const [clockOverride, setClockOverride] = useState<"working" | "off" | "">("");
  const [clockSaving, setClockSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string; fileSize: string; mimeType: string } | null>(null);

  useEffect(() => {
    setSelectedCrmRowId(null);
    setSelectedCrmCell(null);
  }, [activeCrmSheetId]);

  const visibleTabs = useMemo(() => tabs.filter((item) => {
    if (item.id === "crm") return data.capabilities.canRequestCrmSource || data.capabilities.canUseCrm;
    if (item.id === "applicants") return data.capabilities.canManageApplicants;
    if (item.id === "admin") return data.capabilities.canManage;
    return true;
  }), [data.capabilities]);

  const refresh = (sort = sortResources, currentTab = tab) => startTransition(async () => {
    const newData = await getEmployeePortalData(sort, currentTab);
    setData(prev => mergePortalData(prev, newData, currentTab));
  });

  const openPortalTab = (nextTab: PortalTab) => {
    if (nextTab === "crm") {
      setLoadingTab("crm");
      startTransition(async () => {
        const newData = await getEmployeePortalData(sortResources, "crm");
        setData(prev => mergePortalData(prev, newData, "crm"));
        setTab("crm");
        setLoadingTab("");
      });
      return;
    }
    setTab(nextTab);
    refresh(sortResources, nextTab);
  };

  const employees = data.users as EmployeeListItem[];
  const filteredEmployees = employees.filter((user) => {
    const searchText = `${user.name} ${user.email} ${user.department} ${user.title} ${user.role}`.toLowerCase();
    const matchesSearch = searchText.includes(employeeSearch.toLowerCase());
    const matchesType = employeeTypeFilter === "all" || user.employeeType === employeeTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredResources = data.resources.filter((resource) => (
    resourceTypeFilter === "all" || resource.resourceType === resourceTypeFilter
  ));

  const onlineEmployees = employees.filter((user) => user.isOnline).length;
  const workingEmployees = employees.filter((user) => user.isWithinWorkHours).length;
  const employeeOptions = employees.map((user) => ({ label: `${user.name} (${user.email})`, value: user.id.toString() }));
  const roleDefinitions = data.roleDefinitions || [];
  const activeRoleOptions = roleDefinitions
    .filter((role) => role.status !== "Inactive")
    .map((role) => ({ label: `${role.label} (${role.key})`, value: role.key }));
  const roleOptions = activeRoleOptions.length ? activeRoleOptions : [{ label: "Employee (employee)", value: "employee" }];
  const ownerRoleOptions = [{ label: "All roles", value: "all" }, ...roleOptions];
  const roleNameByKey = new Map(roleDefinitions.map((role) => [role.key, role.label]));
  const displayRole = (role: string) => roleNameByKey.get(role) || role.replace(/_/g, " ");
  const roleLabel = displayRole(data.session.role);
  const openTasks = data.tasks.filter((task) => task.status !== "Done");
  const blockedTasks = data.tasks.filter((task) => task.status === "Blocked");
  const dueSoonTasks = data.tasks.filter((task) => task.dueAt && task.status !== "Done" && new Date(task.dueAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000);
  const hotLeads = data.crmRecords.filter((record) => record.leadRating === "Hot" || record.priority === "High");
  const salesRecords = data.crmRecords.filter((record) => record.ownerRole === "sales");
  const contentRecords = data.crmRecords.filter((record) => record.ownerRole === "content");
  const upcomingMeetings = data.meetings.filter((meeting) => new Date(meeting.startsAt).getTime() >= Date.now()).slice(0, 4);
  const recentResources = data.resources.slice(0, 4);
  const activeCrmSheet = activeCrmSheetId ? data.crmSheets.find((sheet) => sheet.id === activeCrmSheetId) : null;
  const canEditCrmSheet = data.session.role === "super_admin";
  const currentUserId = Number(data.session.userId);
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

  const submit = (handler: SaveHandler, onSuccessOptimistic?: () => void) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("Processing your request...");
    const form = event.currentTarget;
    const formValues = values(form);
    if (onSuccessOptimistic) onSuccessOptimistic();
    startTransition(async () => {
      const result = await handler(formValues);
      if (!result.success) {
        setError(result.error || "Save failed.");
        return;
      }
      form.reset();
      setUploadedFile(null);
      setCrmSheetPaste("");
      setCrmSheetFileName("");
      setNotice("Saved successfully.");
      const newData = await getEmployeePortalData(sortResources, tab);
      setData(prev => mergePortalData(prev, newData, tab));
    });
  };

  const runAction = (handler: () => Promise<{ success: boolean; error?: string }>) => {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await handler();
      if (!result.success) setError(result.error || "Action failed.");
      else setNotice("Updated successfully.");
      const newData = await getEmployeePortalData(sortResources, tab);
      setData(prev => mergePortalData(prev, newData, tab));
    });
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
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
      const result = await clockInEmployee();
      if (!result.success) {
        setError(result.error || "Clock in failed.");
        setClockOverride("off");
      }
      setClockSaving(false);
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
      const result = await clockOutEmployee();
      if (!result.success) {
        setError(result.error || "Clock out failed.");
        setClockOverride("working");
      }
      setClockSaving(false);
    });
  };

  const handleUpdateCrmRowStatus = (rowId: number, status: string) => {
    setData(prev => {
        const crmSheets = [...prev.crmSheets];
        const sheetIndex = crmSheets.findIndex(s => s.id === activeCrmSheetId);
        if (sheetIndex !== -1) {
            const rows = [...crmSheets[sheetIndex].rows];
            const rowIndex = rows.findIndex(r => r.id === rowId);
            if (rowIndex !== -1) {
                rows[rowIndex] = { ...rows[rowIndex], status, statusColor: status === "Done" ? "green" : status === "Callback" ? "blue" : status === "Not Interested" ? "amber" : status === "Invalid" ? "red" : "none" };
                crmSheets[sheetIndex] = { ...crmSheets[sheetIndex], rows };
            }
        }
        return { ...prev, crmSheets };
    });
    runAction(() => updateCrmSheetRowStatus({ rowId: rowId.toString(), status, reason: status }));
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
  };

  const letterUrlFor = (user: EmployeeListItem) => {
    const type = user.employeeType === "Intern" ? "Internship Offer Letter" : "Offer Letter";
    return `/api/employee/letter?employeeId=${user.id}&type=${encodeURIComponent(type)}`;
  };

  const mailtoFor = (user: EmployeeListItem) => {
    const type = user.employeeType === "Intern" ? "internship offer letter" : "offer letter";
    const url = letterUrlFor(user);
    const subject = encodeURIComponent(`BlueVolt ${type}`);
    const body = encodeURIComponent(`Hi ${user.name},\n\nYour BlueVolt ${type} is ready here:\n${url}\n\nPlease review it and confirm acceptance.\n\nRegards,\nBlueVolt HR`);
    return `mailto:${user.email}?subject=${subject}&body=${body}`;
  };

  const idCardUrlFor = (user: EmployeeListItem, download = false) => (
    `/api/employee/id-card?employeeId=${user.id}${download ? "&download=1" : ""}`
  );

  const loadCrmSheetFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setCrmSheetFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv" || extension === "tsv" || extension === "txt") {
      setCrmSheetPaste(await file.text());
      return;
    }
    if (extension === "xlsx" || extension === "xls") {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName], { FS: "\t" });
      setCrmSheetPaste(csv);
      return;
    }
    setError("Upload an Excel, CSV, TSV, or text file.");
  };

  const sheetColumns = (sheet: PortalData["crmSheets"][number]) => (
    Array.isArray(sheet.columns) && sheet.columns.every((column) => typeof column === "string")
      ? sheet.columns as string[]
      : ["Company", "Contact", "Email", "Phone", "Next Action"]
  );

  const columnName = (index: number) => {
    let value = "";
    let cursor = index + 1;
    while (cursor > 0) {
      const remainder = (cursor - 1) % 26;
      value = String.fromCharCode(65 + remainder) + value;
      cursor = Math.floor((cursor - 1) / 26);
    }
    return value;
  };

  const cellReference = (rowIndex: number, columnIndex: number) => `${columnName(columnIndex)}${rowIndex + 2}`;

  const isPhoneColumn = (column: string) => {
    const value = column.toLowerCase();
    return value.includes("phone") || value.includes("mobile") || value.includes("contact number") || value.includes("call number");
  };

  const formatPhoneValue = (value: string) => {
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
  };

  const displayCellValue = (column: string, value: string) => (
    isPhoneColumn(column) ? formatPhoneValue(value) : value
  );

  const rowData = (row: PortalData["crmSheets"][number]["rows"][number]) => {
    if (!row.data) return {};
    if (typeof row.data === "string") {
      try {
        return JSON.parse(row.data) as Record<string, string>;
      } catch {
        return {};
      }
    }
    return typeof row.data === "object" && !Array.isArray(row.data) ? row.data as Record<string, string> : {};
  };

  const rowTint = (status: string) => {
    if (status === "Done") return styles.crmDone;
    if (status === "Callback") return styles.crmCallback;
    if (status === "Not Interested") return styles.crmNotInterested;
    if (status === "Invalid") return styles.crmInvalid;
    return "";
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.eyebrow}>Internal Console</div>
        <div className={styles.brand}>BlueVolt Employee</div>
        <div className={styles.muted}>{data.session.name}</div>
        <div className={styles.pill} style={{ marginTop: 10 }}>{data.session.role.replace("_", " ")}</div>
        <nav className={styles.nav}>
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`${styles.navButton} ${tab === item.id ? styles.navButtonActive : ""}`} onClick={() => {
                openPortalTab(item.id);
              }} type="button">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon size={15} /> {loadingTab === item.id ? "Loading..." : item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className={styles.ghostButton} type="button" onClick={() => startTransition(async () => {
          await logoutEmployee();
          router.push("/employee/login");
        })}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><LogOut size={15} /> Logout</span>
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.title}>Employee Portal</h1>
            <p className={styles.muted}>People operations, CRM, applicants, meetings, and resources in one private workspace.</p>
          </div>
          <div className={styles.workIsland}>
            <div className={styles.workIslandMeta}>
              <span className={`${styles.workDot} ${isWorking ? styles.workDotOn : ""}`} />
              <div>
                <strong>{isWorking ? "Working now" : "Off work"}</strong>
                <span>{currentEmployee?.workStartTime || "09:00"} - {currentEmployee?.workEndTime || "18:00"} {clockSaving ? "saving..." : ""}</span>
              </div>
            </div>
            <button className={`${styles.workSwitch} ${isWorking ? styles.workSwitchOn : ""}`} type="button" onClick={isWorking ? handleClockOut : handleClockIn} aria-pressed={isWorking} disabled={clockSaving}>
              <span>{isWorking ? "Working" : "Off"}</span>
              <i />
            </button>
            <button className={styles.refreshIconButton} type="button" onClick={() => refresh(sortResources, tab)} disabled={pending} aria-label="Refresh portal">R</button>
          </div>
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}
        {loadingTab && <div className={styles.notice}>Loading {loadingTab === "crm" ? "CRM sheets" : loadingTab}...</div>}

        {tab === "dashboard" && (
          <section className={styles.grid}>
            <div className={`${styles.card} ${styles.span12} ${styles.dashboardHero}`}>
              <div>
                <span className={styles.eyebrow}>Today Command Center</span>
                <h2 className={styles.heroTitle}>Work queue for {roleLabel}</h2>
                <p className={styles.muted}>Tasks, meetings, resources, and team signals grouped for engineering, content, and sales workflows.</p>
              </div>
              <div className={styles.heroActions}>
                <button className={styles.button} type="button" onClick={() => openPortalTab("ops")}>Open tasks</button>
                {data.capabilities.canUseCrm && <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("crm")}>Open CRM</button>}
                <button className={styles.ghostButton} type="button" onClick={() => openPortalTab("resources")}>Resources</button>
                {currentEmployee && <a className={styles.ghostButton} href={idCardUrlFor(currentEmployee)} target="_blank" rel="noopener noreferrer">My ID card</a>}
              </div>
            </div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}><h2 className={styles.cardTitle}>Open Tasks</h2><span className={styles.metricValue}>{openTasks.length}</span><p className={styles.muted}>{blockedTasks.length} blocked, {dueSoonTasks.length} due soon.</p></div>
            <div className={`${styles.card} ${styles.span3} ${styles.metricCard}`}><h2 className={styles.cardTitle}>Hot Leads</h2><span className={styles.metricValue}>{hotLeads.length}</span><p className={styles.muted}>High priority sales/content opportunities.</p></div>
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
                <span className={styles.pill}>{contentRecords.length} records</span>
              </div>
              <div className={styles.list}>
                {contentRecords.slice(0, 3).map((record) => (
                  <div className={styles.row} key={record.id}>
                    <div className={styles.rowHeader}><strong>{record.company}</strong><span className={styles.pill}>{record.stage}</span></div>
                    <p className={styles.muted}>{record.nextAction || "No next action set."}</p>
                  </div>
                ))}
                {contentRecords.length === 0 && <div className={styles.emptyState}>No content pipeline items.</div>}
              </div>
            </div>
            <div className={`${styles.card} ${styles.span4}`}>
              <div className={styles.rowHeader}>
                <h2 className={styles.cardTitle}><Target size={16} /> Sales</h2>
                <span className={styles.pill}>{salesRecords.length} records</span>
              </div>
              <div className={styles.list}>
                {salesRecords.slice(0, 3).map((record) => (
                  <div className={styles.row} key={record.id}>
                    <div className={styles.rowHeader}><strong>{record.company}</strong><span className={record.leadRating === "Hot" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{record.leadRating}</span></div>
                    <p className={styles.muted}>{record.stage} - {record.nextAction || "Follow up not set."}</p>
                  </div>
                ))}
                {salesRecords.length === 0 && <div className={styles.emptyState}>No sales pipeline items.</div>}
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

        {tab === "crm" && (
          <section className={styles.grid}>
            <div className={`${styles.card} ${styles.span12} ${styles.crmCommandBar}`}>
              <div>
                <h2 className={styles.cardTitle}>CRM Sheets</h2>
                <p className={styles.muted}>{canEditCrmSheet ? "Open a source list, work it like a sheet, and mark each row by call outcome." : "Open approved source lists in read-only mode."}</p>
              </div>
              <div className={styles.toolbar}>
                {canEditCrmSheet && (
                  <>
                    <button className={styles.button} type="button" onClick={() => { setActiveCrmSheetId(null); setCrmPanel(crmPanel === "source" ? "none" : "source"); }}>Import sheet</button>
                    <button className={styles.ghostButton} type="button" onClick={() => { setActiveCrmSheetId(null); setCrmPanel(crmPanel === "record" ? "none" : "record"); }}>Add CRM card</button>
                  </>
                )}
                {activeCrmSheet && <button className={styles.ghostButton} type="button" onClick={() => setActiveCrmSheetId(null)}>Back to list</button>}
              </div>
            </div>

            {!activeCrmSheet && canEditCrmSheet && crmPanel === "source" && (
              <form className={`${styles.card} ${styles.span12} ${styles.formGrid}`} onSubmit={submit(saveCrmSheetRequest, () => setCrmPanel("none"))}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Create / Import CRM Sheet</h2>
                <p className={`${styles.muted} ${styles.fieldWide}`}>Upload or paste Excel/CSV data. Only super admin can create or change sheets.</p>
                <Field label="Sheet Title" name="title" placeholder="e.g. May leads - Bengaluru" required wide />
                <input type="hidden" name="sourceName" value="Imported Data" />
                <input type="hidden" name="ownerRole" value={data.session.role} />
                <input type="hidden" name="audienceRoles" value="all" />
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Upload Excel / CSV</span>
                  <input className={styles.input} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(event) => loadCrmSheetFile(event.target.files?.[0])} />
                  {crmSheetFileName && <span className={styles.muted}>{crmSheetFileName} loaded into the source box.</span>}
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Paste Excel / CSV Rows</span>
                  <textarea className={styles.textarea} name="pasteData" value={crmSheetPaste} onChange={(event) => setCrmSheetPaste(event.target.value)} placeholder={"Company\tContact\tEmail\tPhone\tNext Action\nAcme Pvt Ltd\tRavi\travi@example.com\t9999999999\tCall today"} required />
                </label>
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Create Sheet</button>
              </form>
            )}

            {!activeCrmSheet && canEditCrmSheet && crmPanel === "record" && (
              <form className={`${styles.card} ${styles.span12} ${styles.formGrid}`} onSubmit={submit(saveCrmRecord, () => setCrmPanel("none"))}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Add CRM Card</h2>
                <Field label="Company" name="company" required />
                <Field label="Contact" name="contactName" required />
                <Field label="Email" name="email" type="email" />
                <Field label="Phone" name="phone" />
                <Field label="Owner Role" name="ownerRole" options={roleOptions} />
                <Field label="Stage" name="stage" options={["New", "Qualified", "Proposal", "Won", "Lost"]} />
                <Field label="Source" name="source" defaultValue="Manual" />
                <Field label="Priority" name="priority" options={["High", "Medium", "Low"]} />
                <Field label="Lead Rating" name="leadRating" options={["Hot", "Warm", "Cold"]} />
                <Field label="Estimated Value" name="estimatedValue" type="number" />
                <Field label="Reminder At" name="reminderAt" type="datetime-local" />
                <Field label="Next Action" name="nextAction" wide />
                <Field label="Notes" name="notes" textarea wide />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save CRM Card</button>
              </form>
            )}

            {!activeCrmSheet && (
              <>
                <div className={`${styles.card} ${styles.span8}`}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.cardTitle}>Sheet List</h2>
                      <p className={styles.muted}>Click any approved or pending source to open the spreadsheet workspace.</p>
                    </div>
                    <span className={styles.pill}>{data.crmSheets.length} sheets</span>
                  </div>
                  <div className={styles.sheetList}>{data.crmSheets.length === 0 ? <div className={styles.emptyState}>No sheets yet{canEditCrmSheet ? ". Use Import sheet above." : "."}</div> : data.crmSheets.map((sheet) => {
                    const totalRows = sheet.rows.length;
                    const doneRows = sheet.rows.filter((row) => row.status === "Done").length;
                    const percent = totalRows ? Math.round((doneRows / totalRows) * 100) : 0;
                    return (
                      <button className={styles.sheetListItem} key={sheet.id} type="button" onClick={() => { setCrmPanel("none"); setActiveCrmSheetId(sheet.id); }}>
                        <div>
                          <strong>{sheet.title}</strong>
                          <p className={styles.muted}>{sheet.sourceName || "Source not named"} - requested by {sheet.requestedByName || "Unknown"}</p>
                        </div>
                        <div className={styles.sheetMetaGrid}>
                          <span className={sheet.status === "Approved" ? `${styles.pill} ${styles.pillSuccess}` : sheet.status === "Rejected" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{sheet.status}{sheet.locked ? " / Locked" : ""}</span>
                          <span className={styles.pill}>{doneRows}/{totalRows} done</span>
                          <span className={styles.pill}>{percent}%</span>
                        </div>
                      </button>
                    );
                  })}</div>
                </div>
                <div className={`${styles.card} ${styles.span4}`}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.cardTitle}>CRM Cards</h2>
                      <p className={styles.muted}>Quick pipeline records separate from imported sheets.</p>
                    </div>
                    <span className={styles.pill}>{data.crmRecords.length} records</span>
                  </div>
                  <div className={styles.list}>{data.crmRecords.length === 0 ? <div className={styles.emptyState}>No CRM cards yet.</div> : data.crmRecords.slice(0, 8).map((record) => (
                    <div className={styles.row} key={record.id}>
                      <div className={styles.rowHeader}><strong>{record.company}</strong><span className={styles.pill}>{record.stage}</span></div>
                      <p className={styles.muted}>{record.contactName} {record.email ? `- ${record.email}` : ""}</p>
                      <div className={styles.compactMeta}>
                        <span className={styles.pill}>{displayRole(record.ownerRole)}</span>
                        <span className={record.priority === "High" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{record.priority}</span>
                        <span className={record.leadRating === "Hot" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{record.leadRating}</span>
                      </div>
                    </div>
                  ))}</div>
                </div>
              </>
            )}

            {activeCrmSheet && (() => {
              const columns = sheetColumns(activeCrmSheet);
              const totalRows = activeCrmSheet.rows.length;
              const doneRows = activeCrmSheet.rows.filter((row) => row.status === "Done").length;
              const callbackRows = activeCrmSheet.rows.filter((row) => row.status === "Callback").length;
              const openRows = activeCrmSheet.rows.filter((row) => row.status === "Open").length;
              const sheetRows = activeCrmSheet.rows;
              const selectedCrmRow = sheetRows.find((row) => row.id === selectedCrmRowId) || sheetRows[0] || null;
              const canMarkRows = canEditCrmSheet && data.capabilities.canUpdateCrmSheetRows && !activeCrmSheet.locked && Boolean(selectedCrmRow);
              const selectedReference = selectedCrmCell ? cellReference(selectedCrmCell.rowIndex, selectedCrmCell.columnIndex) : "A1";
              const selectedValue = selectedCrmCell ? selectedCrmCell.value : "";
              const blankRowCount = Math.max(80 - sheetRows.length, 30);
              const markSelectedRow = (status: string) => {
                if (!selectedCrmRow || !canMarkRows) return;
                handleUpdateCrmRowStatus(selectedCrmRow.id, status);
              };
              return (
                <div className={styles.fullSheetApp}>
                  <div className={styles.sheetAppHeader}>
                    <button className={styles.sheetLogoButton} type="button" onClick={() => setActiveCrmSheetId(null)} aria-label="Back to CRM sheets">
                      <img src="/Assets/Logos/BLUEVOLT.png" alt="BlueVolt" className={styles.bluevoltSheetLogo} />
                    </button>
                    <div className={styles.sheetTitleBlock}>
                      <div className={styles.sheetDocumentName}>{activeCrmSheet.title || "Untitled spreadsheet"} <span>*</span></div>
                      <div className={styles.sheetSubTitle}>{activeCrmSheet.sourceName || "BlueVolt CRM source"} - {doneRows}/{totalRows} done</div>
                    </div>
                    <div className={styles.sheetHeaderActions}>
                      <span className={activeCrmSheet.status === "Approved" ? `${styles.sheetStatusPill} ${styles.sheetStatusApproved}` : styles.sheetStatusPill}>{activeCrmSheet.status}{activeCrmSheet.locked ? " / Locked" : ""}</span>
                      {!canEditCrmSheet && <span className={styles.sheetStatusPill}>Read only</span>}
                      {canEditCrmSheet && activeCrmSheet.status === "Pending" && (
                        <>
                          <button className={styles.sheetToolbarButton} type="button" onClick={() => runAction(() => approveCrmSheet({ id: activeCrmSheet.id.toString(), status: "Approved" }))}>Approve</button>
                          <button className={styles.sheetToolbarButton} type="button" onClick={() => runAction(() => approveCrmSheet({ id: activeCrmSheet.id.toString(), status: "Rejected" }))}>Reject</button>
                        </>
                      )}
                      {canEditCrmSheet && (
                        <button className={styles.sheetToolbarButton} type="button" onClick={() => {
                          if (confirm("Are you sure you want to delete this sheet and all its rows?")) {
                            setActiveCrmSheetId(null);
                            runAction(() => deleteEmployeeEntity({ entityType: "crmSheet", id: activeCrmSheet.id.toString() }));
                          }
                        }}>Delete sheet</button>
                      )}
                    </div>
                  </div>
                  <div className={styles.sheetMarkingToolbar}>
                    <div className={styles.sheetMarkSummary}>
                      <strong>{canEditCrmSheet ? "Mark selected row" : "Selected row"}</strong>
                      <span>{selectedCrmRow ? `Row ${sheetRows.findIndex((row) => row.id === selectedCrmRow.id) + 2}: ${selectedCrmRow.status}` : "Select a row in the sheet"}</span>
                    </div>
                    {canEditCrmSheet && (
                      <div className={styles.sheetMarkButtons}>
                        {[
                          { status: "Open", label: "Open" },
                          { status: "Done", label: "Done" },
                          { status: "Callback", label: "Callback" },
                          { status: "Not Interested", label: "Not Interested" },
                          { status: "Invalid", label: "Invalid" },
                        ].map((item) => (
                          <button
                            className={`${styles.sheetMarkButton} ${item.status === "Done" ? styles.sheetMarkDone : item.status === "Callback" ? styles.sheetMarkCallback : item.status === "Not Interested" ? styles.sheetMarkNotInterested : item.status === "Invalid" ? styles.sheetMarkInvalid : ""}`}
                            key={item.status}
                            type="button"
                            onClick={() => markSelectedRow(item.status)}
                            disabled={!canMarkRows}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={styles.sheetStatusStats}>
                      <span>{openRows} open</span>
                      <span>{callbackRows} callback</span>
                      <span>{doneRows} done</span>
                    </div>
                  </div>

                  <div className={styles.sheetFormulaRow}>
                    <span>{selectedReference}</span>
                    <span>fx</span>
                    <input className={styles.sheetFormulaInput} readOnly value={selectedValue} placeholder="Select a cell to preview its value" />
                  </div>

                  <div className={styles.sheetGridShell}>
                    <table className={styles.googleSheetGrid}>
                      <thead>
                        <tr>
                          <th className={styles.sheetCornerCell}></th>
                          {["Status", ...columns].map((column, index) => <th key={column}>{columnName(index)}</th>)}
                        </tr>
                        <tr>
                          <th className={styles.sheetRowNumber}>1</th>
                          <th>Status</th>
                          {columns.map((column) => <th key={column}>{column}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetRows.length === 0 ? (
                          Array.from({ length: 36 }).map((_, rowIndex) => (
                            <tr key={`blank-${rowIndex}`}>
                              <td className={styles.sheetRowNumber}>{rowIndex + 2}</td>
                              {["Status", ...columns].map((column, colIndex) => (
                                <td
                                  className={(selectedCrmCell?.rowId === 0 && selectedCrmCell.rowIndex === rowIndex && selectedCrmCell.column === column) || (!selectedCrmCell && rowIndex === 0 && colIndex === 0) ? styles.sheetSelectedCell : ""}
                                  key={`${rowIndex}-${column}`}
                                  onClick={() => setSelectedCrmCell({ rowId: 0, rowIndex, column, columnIndex: colIndex, value: "" })}
                                ></td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          sheetRows.map((row, rowIndex) => {
                            const cells = rowData(row);
                            return (
                              <tr className={`${rowTint(row.status)} ${selectedCrmRow?.id === row.id ? styles.sheetSelectedRow : ""}`} key={row.id} onClick={() => setSelectedCrmRowId(row.id)}>
                                <td className={styles.sheetRowNumber}>{rowIndex + 2}</td>
                                <td className={selectedCrmCell?.rowId === row.id && selectedCrmCell.column === "Status" ? styles.sheetSelectedCell : ""} onClick={() => {
                                  setSelectedCrmRowId(row.id);
                                  setSelectedCrmCell({ rowId: row.id, rowIndex, column: "Status", columnIndex: 0, value: row.status });
                                }}>
                                  <div className={styles.statusCell}>
                                    <span className={styles.pill}>{row.status}</span>
                                  </div>
                                </td>
                                {columns.map((column, colIndex) => {
                                  const rawValue = cells[column] || "";
                                  const shownValue = displayCellValue(column, rawValue);
                                  const columnIndex = colIndex + 1;
                                  return (
                                  <td className={selectedCrmCell?.rowId === row.id && selectedCrmCell.column === column ? styles.sheetSelectedCell : ""} key={`${row.id}-${column}`}>
                                    {activeCrmSheet.locked || !canEditCrmSheet ? (
                                      <div
                                        className={styles.sheetCellReadOnly}
                                        onClick={() => {
                                          setSelectedCrmRowId(row.id);
                                          setSelectedCrmCell({ rowId: row.id, rowIndex, column, columnIndex, value: shownValue });
                                        }}
                                      >
                                        {shownValue}
                                      </div>
                                    ) : (
                                      <input 
                                        className={styles.sheetCellInput}
                                        type="text" 
                                        defaultValue={shownValue}
                                        onFocus={() => {
                                          setSelectedCrmRowId(row.id);
                                          setSelectedCrmCell({ rowId: row.id, rowIndex, column, columnIndex, value: shownValue });
                                        }}
                                        onChange={(e) => {
                                          setSelectedCrmCell({ rowId: row.id, rowIndex, column, columnIndex, value: displayCellValue(column, e.target.value) });
                                        }}
                                        onBlur={(e) => {
                                          const nextValue = displayCellValue(column, e.target.value);
                                          if (nextValue !== shownValue) {
                                            handleCellChange(row.id, column, nextValue);
                                          }
                                        }}
                                      />
                                    )}
                                  </td>
                                );})}
                              </tr>
                            );
                          })
                        )}
                        {Array.from({ length: blankRowCount }).map((_, blankIndex) => (
                          <tr key={`blank-after-${blankIndex}`}>
                            <td className={styles.sheetRowNumber}>{sheetRows.length + blankIndex + 2}</td>
                            {["Status", ...columns].map((column, colIndex) => (
                              <td
                                className={selectedCrmCell?.rowId === 0 && selectedCrmCell.rowIndex === sheetRows.length + blankIndex && selectedCrmCell.column === column ? styles.sheetSelectedCell : ""}
                                key={`blank-after-${blankIndex}-${column}`}
                                onClick={() => setSelectedCrmCell({
                                  rowId: 0,
                                  rowIndex: sheetRows.length + blankIndex,
                                  column,
                                  columnIndex: colIndex,
                                  value: "",
                                })}
                              ></td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={styles.sheetBottomBar}>
                    <span className={styles.sheetTab}>Sheet1</span>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {tab === "applicants" && (
          <section className={styles.grid}>
            <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveApplicant)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Add Applicant</h2>
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone" name="phone" />
              <Field label="Role Applied" name="roleApplied" required />
              <Field label="Stage" name="stage" options={["New", "Screening", "Interview", "Offer", "Rejected"]} />
              <Field label="Source" name="source" defaultValue="Manual" />
              <Field label="Meet URL" name="meetUrl" type="url" wide />
              <Field label="Notes" name="notes" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Applicant</button>
            </form>
            <div className={`${styles.card} ${styles.span8}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Applicant Board</h2>
                  <p className={styles.muted}>Track hiring stages and interview links separately from CRM.</p>
                </div>
                <span className={styles.pill}>{data.applicants.length} applicants</span>
              </div>
              <div className={styles.list}>{data.applicants.length === 0 ? <div className={styles.emptyState}>No applicants yet.</div> : data.applicants.map((applicant) => (
                <div className={styles.row} key={applicant.id}>
                  <div className={styles.rowHeader}><strong>{applicant.name}</strong><span className={styles.pill}>{applicant.stage}</span></div>
                  <p className={styles.muted}>{applicant.roleApplied} - {applicant.email}</p>
                  {applicant.meetUrl && <a href={applicant.meetUrl} target="_blank" rel="noopener noreferrer">Open Meet</a>}
                </div>
              ))}</div>
            </div>
          </section>
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
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "payroll" && (
          <section className={styles.grid}>
            {data.capabilities.canManagePayroll && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(savePayrollInput)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Payroll Input</h2>
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
            )}
            <div className={`${styles.card} ${data.capabilities.canManagePayroll ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Payroll Inputs</h2>
                  <p className={styles.muted}>Salary/stipend, unpaid leave, bonus, deductions, and payment status.</p>
                </div>
                <span className={styles.pill}>{data.payrollInputs.length} records</span>
              </div>
              <div className={styles.list}>{data.payrollInputs.length === 0 ? <div className={styles.emptyState}>No payroll records yet.</div> : data.payrollInputs.map((payroll) => (
                <div className={styles.row} key={payroll.id}>
                  <div className={styles.rowHeader}><strong>{payroll.employeeName}</strong><span className={styles.pill}>{payroll.status}</span></div>
                  <p className={styles.muted}>{payroll.payPeriod} - {payroll.payType} - Rs. {formatPortalNumber(payroll.amount)}</p>
                  <p className={styles.muted}>Working days: {payroll.workingDays} - Unpaid leave: {payroll.unpaidLeaveDays} - Bonus: {payroll.bonus} - Deductions: {payroll.deductions}</p>
                  {data.capabilities.canManagePayroll && <div className={styles.toolbar}>{["Ready", "Paid", "Hold"].map((status) => <button className={styles.ghostButton} key={status} type="button" onClick={() => runAction(() => updateEmployeeRecordStatus({ entityType: "payroll", id: payroll.id.toString(), status }))}>{status}</button>)}</div>}
                </div>
              ))}</div>
            </div>
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
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "documents" && (
          <section className={styles.grid}>
            {data.capabilities.canManageOps && (
              <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveEmployeeDocument)}>
                <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Employee Document</h2>
                <Field label="Employee" name="employeeId" options={[{ label: "General document", value: "" }, ...employeeOptions]} wide />
                <Field label="Title" name="title" required />
                <Field label="Type" name="documentType" options={["Offer Letter", "NDA", "ID Proof", "Resume", "Certificate", "Payslip", "General"]} />
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Upload File</span>
                  <input className={styles.input} type="file" onChange={(event) => uploadFile(event.target.files?.[0])} />
                </label>
                <Field label="URL" name="url" type="url" defaultValue={uploadedFile?.url || ""} wide />
                {uploadedFile && <input type="hidden" name="url" value={uploadedFile.url} />}
                <input type="hidden" name="fileName" value={uploadedFile?.fileName || ""} />
                <input type="hidden" name="fileSize" value={uploadedFile?.fileSize || ""} />
                <input type="hidden" name="mimeType" value={uploadedFile?.mimeType || ""} />
                <Field label="Visibility Roles" name="visibilityRoles" defaultValue="super_admin,admin,hr" wide />
                <Field label="Notes" name="notes" textarea wide />
                <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Document</button>
              </form>
            )}
            <div className={`${styles.card} ${data.capabilities.canManageOps ? styles.span8 : styles.span12}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Employee Documents</h2>
                  <p className={styles.muted}>Offer letters, NDA, ID proof, resumes, certificates, payslips, and private links.</p>
                </div>
                <span className={styles.pill}>{data.documents.length} documents</span>
              </div>
              <div className={styles.list}>{data.documents.length === 0 ? <div className={styles.emptyState}>No documents yet.</div> : data.documents.map((document) => (
                <div className={styles.row} key={document.id}>
                  <div className={styles.rowHeader}><strong>{document.title}</strong><span className={styles.pill}>{document.documentType}</span></div>
                  <p className={styles.muted}>{document.employeeName || "General"} - {document.visibilityRoles}</p>
                  <a href={document.url} target="_blank" rel="noopener noreferrer">Open document</a>
                  {data.capabilities.canManageOps && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "document", id: document.id.toString() }))}>Delete</button>}
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
                <Field label="Audience Roles" name="audienceRoles" defaultValue="all" wide />
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
              <div className={styles.list}>{data.announcements.length === 0 ? <div className={styles.emptyState}>No announcements yet.</div> : data.announcements.map((announcement) => (
                <div className={styles.row} key={announcement.id}>
                  <div className={styles.rowHeader}><strong>{announcement.title}</strong><span className={announcement.priority === "Urgent" ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{announcement.priority}</span></div>
                  <p>{announcement.body}</p>
                  <p className={styles.muted}>{announcement.audienceRoles} - {formatPortalDateTime(announcement.createdAt)}</p>
                  {data.capabilities.canPublishAnnouncements && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "announcement", id: announcement.id.toString() }))}>Delete</button>}
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
                <Field label="Audience Roles" name="audienceRoles" defaultValue="all" wide />
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
              <div className={styles.list}>{data.meetings.length === 0 ? <div className={styles.emptyState}>No visible meetings yet.</div> : data.meetings.map((meeting) => (
                <div className={styles.row} key={meeting.id}>
                  <div className={styles.rowHeader}><strong>{meeting.title}</strong><span className={styles.pill}>{meeting.audienceRoles}</span></div>
                  <p className={styles.muted}>{formatPortalDateTime(meeting.startsAt)} - {formatPortalDateTime(meeting.endsAt)}</p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {meeting.meetUrl && <a href={meeting.meetUrl} target="_blank" rel="noopener noreferrer">Open Google Meet</a>}
                    <a href={meeting.calendarUrl} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
                  </div>
                </div>
              ))}</div>
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
                <Field label="URL" name="url" type="url" required wide />
                <Field label="Audience Roles" name="audienceRoles" defaultValue="all" wide />
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
              <div className={styles.list}>{filteredResources.length === 0 ? <div className={styles.emptyState}>No matching resources.</div> : filteredResources.map((resource) => (
                <div className={styles.row} key={resource.id}>
                  <div className={styles.rowHeader}><strong>{resource.title}</strong><span className={styles.pill}>{resource.resourceType}</span></div>
                  <p className={styles.muted}>{resource.audienceRoles} {resource.tags ? `- ${resource.tags}` : ""}</p>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">Open Resource</a>
                  {data.capabilities.canManageResources && <button className={styles.ghostButton} type="button" onClick={() => runAction(() => deleteEmployeeEntity({ entityType: "resource", id: resource.id.toString() }))}>Delete</button>}
                </div>
              ))}</div>
            </div>
          </section>
        )}

        {tab === "admin" && (
          <section className={styles.grid}>
            <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveEmployeeRoleDefinition)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>1. Create Role</h2>
              <p className={`${styles.muted} ${styles.fieldWide}`}>Create the access role first, then assign employees to that role below.</p>
              <Field label="Role Name" name="label" placeholder="Content Lead" required />
              <Field label="Role Key" name="key" placeholder="content_lead" />
              <Field label="Status" name="status" options={["Active", "Inactive"]} />
              <Field label="Permissions / Access Notes" name="permissions" textarea wide />
              <Field label="Description" name="description" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Role</button>
            </form>
            <div className={`${styles.card} ${styles.span8}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Created Roles</h2>
                  <p className={styles.muted}>Use the role key when importing employees by CSV.</p>
                </div>
                <span className={styles.pill}>{roleDefinitions.length} roles</span>
              </div>
              <div className={styles.list}>{roleDefinitions.length === 0 ? <div className={styles.emptyState}>No roles yet.</div> : roleDefinitions.map((role) => (
                <div className={styles.row} key={role.key}>
                  <div className={styles.rowHeader}>
                    <strong>{role.label}</strong>
                    <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span className={styles.pill}>{role.key}</span>
                      <span className={role.status === "Active" ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillMuted}`}>{role.status}</span>
                    </span>
                  </div>
                  <p className={styles.muted}>{role.description}</p>
                  <p className={styles.muted}>{role.permissions}</p>
                </div>
              ))}</div>
            </div>
            <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveEmployeeUser)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>2. Register Employee</h2>
              <p className={`${styles.muted} ${styles.fieldWide}`}>Pick from the roles created above, then set employee type, paid status, and work hours.</p>
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" />
              <Field label="Role" name="role" options={roleOptions} defaultValue={roleOptions.some((role) => role.value === "employee") ? "employee" : roleOptions[0]?.value} />
              <Field label="Department" name="department" defaultValue="General" />
              <Field label="Department Record" name="departmentId" options={[{ label: "No department record", value: "" }, ...data.departments.map((dept) => ({ label: dept.name, value: dept.id.toString() }))]} />
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
            <div className={`${styles.card} ${styles.span8}`}>
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
                    <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span className={styles.pill}>{displayRole(user.role)}</span>
                      <span className={styles.pill}>{user.employeeType}</span>
                      <span className={user.compensationStatus === "Paid" ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillWarn}`}>{user.compensationStatus}</span>
                      <span className={user.isOnline ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillMuted}`}>{user.isOnline ? "Logged in now" : "Offline"}</span>
                      <span className={user.isWithinWorkHours ? `${styles.pill} ${styles.pillSuccess}` : `${styles.pill} ${styles.pillWarn}`}>{user.isWithinWorkHours ? "Within work hours" : "Outside work hours"}</span>
                    </span>
                  </div>
                  <p className={styles.muted}>{user.email} - {user.department} - {user.title} - {user.status}</p>
                  <p className={styles.muted}>
                    Duration: {user.durationLabel} - Work hours: {user.workStartTime} to {user.workEndTime}
                    {user.lastSeenAt ? ` - Last seen: ${formatPortalDateTime(user.lastSeenAt)}` : " - Last seen: never"}
                  </p>
                  <div className={styles.toolbar}>
                    <a className={styles.ghostButton} href={letterUrlFor(user)} target="_blank" rel="noopener noreferrer">Open letter</a>
                    <a className={styles.ghostButton} href={mailtoFor(user)}>Send letter email</a>
                    <a className={styles.ghostButton} href={idCardUrlFor(user)} target="_blank" rel="noopener noreferrer">Open ID card</a>
                    <a className={styles.ghostButton} href={idCardUrlFor(user, true)}>Download ID card</a>
                  </div>
                </div>
              ))}</div>
            </div>
            <div className={`${styles.card} ${styles.span12}`}>
              <h2 className={styles.cardTitle}>Bulk Employee Import</h2>
              <p className={styles.muted}>CSV headers: name,email,password,role,department,title,employeeType,compensationStatus. Role must match a Role Key from Created Roles. New accounts get default offer/internship letter access through Documents.</p>
              <input className={styles.input} type="file" accept=".csv,text/csv" onChange={(event) => importEmployees(event.target.files?.[0])} />
            </div>
            <form className={`${styles.card} ${styles.span4} ${styles.formGrid}`} onSubmit={submit(saveDepartment)}>
              <h2 className={`${styles.cardTitle} ${styles.fieldWide}`}>Department</h2>
              <Field label="Name" name="name" required />
              <Field label="Manager" name="managerId" options={[{ label: "No manager", value: "" }, ...employeeOptions]} />
              <Field label="Status" name="active" options={["Active", "Inactive"]} />
              <Field label="Description" name="description" textarea wide />
              <button className={`${styles.button} ${styles.fieldWide}`} type="submit">Save Department</button>
            </form>
            <div className={`${styles.card} ${styles.span8}`}>
              <h2 className={styles.cardTitle}>Audit Logs</h2>
              <div className={styles.list}>{data.auditEvents.length === 0 ? <div className={styles.emptyState}>No audit events yet.</div> : data.auditEvents.map((event) => (
                <div className={styles.row} key={event.id}>
                  <div className={styles.rowHeader}><strong>{event.action}</strong><span className={styles.pill}>{event.entityType}</span></div>
                  <p className={styles.muted}>{event.actorName || "System"} - {formatPortalDateTime(event.createdAt)}</p>
                </div>
              ))}</div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

