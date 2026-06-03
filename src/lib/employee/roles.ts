export const EMPLOYEE_ROLES = [
  "super_admin",
  "director",
  "authorized_signatory",
  "admin",
  "sales",
  "content",
  "hr",
  "operations",
  "employee",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const EMPLOYEE_PORTAL_FEATURES = [
  { id: "dashboard", label: "Dashboard", description: "Home dashboard, own work status, ID card, and personal overview." },
  { id: "crm", label: "CRM View", description: "Open CRM records and approved CRM sheets." },
  { id: "crm_manage", label: "CRM Manage", description: "Create, edit, approve, and mark CRM sheets." },
  { id: "applicants", label: "Applicants", description: "Manage applicant records and hiring pipeline." },
  { id: "ops", label: "Work Ops", description: "Attendance, leave, tasks, and team work operations." },
  { id: "expenses", label: "Expenses", description: "Submit and review expense claims." },
  { id: "payroll", label: "Payroll", description: "Payroll inputs and payment readiness." },
  { id: "reviews", label: "Reviews", description: "Performance review records." },
  { id: "documents", label: "Documents", description: "Employee documents, offer letters, joining letters, and ID files." },
  { id: "announcements", label: "Announcements", description: "Company announcements and notices." },
  { id: "meetings", label: "Meetings", description: "Google Meet scheduling and meeting list." },
  { id: "resources", label: "Resources", description: "Resource library, PDFs, spreadsheets, slides, and links." },
  { id: "employees", label: "Employees & Roles", description: "Employee registration, role setup, access mapping, departments, and audit logs." },
  { id: "access", label: "Privileges", description: "Role creation, feature access mapping, and portal permission changes." },
  { id: "sign_documents", label: "Document Signing", description: "Approve and sign employee offer, joining, and HR documents." },
] as const;

export type EmployeePortalFeature = (typeof EMPLOYEE_PORTAL_FEATURES)[number]["id"];

export const DEFAULT_ROLE_FEATURE_ACCESS: Record<(typeof EMPLOYEE_ROLES)[number], EmployeePortalFeature[]> = {
  super_admin: EMPLOYEE_PORTAL_FEATURES.map((feature) => feature.id),
  director: EMPLOYEE_PORTAL_FEATURES.map((feature) => feature.id),
  authorized_signatory: EMPLOYEE_PORTAL_FEATURES.map((feature) => feature.id),
  admin: ["dashboard", "crm", "applicants", "ops", "expenses", "payroll", "reviews", "documents", "announcements", "meetings", "resources", "employees"],
  sales: ["dashboard", "crm", "ops", "expenses", "documents", "meetings", "resources"],
  content: ["dashboard", "crm", "ops", "expenses", "documents", "announcements", "meetings", "resources"],
  hr: ["dashboard", "applicants", "ops", "expenses", "payroll", "reviews", "documents", "announcements", "meetings", "resources", "employees"],
  operations: ["dashboard", "ops", "expenses", "documents", "announcements", "meetings", "resources"],
  employee: ["dashboard", "ops", "expenses", "documents", "announcements", "meetings", "resources"],
};
