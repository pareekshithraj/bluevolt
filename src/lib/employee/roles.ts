export const EMPLOYEE_ROLES = [
  "super_admin",
  "admin",
  "sales",
  "content",
  "hr",
  "operations",
  "employee",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];
