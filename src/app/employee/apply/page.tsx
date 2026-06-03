import { getEmployeeApplicationRoleOptions } from "@/app/actions/employee-portal";
import ApplyClient from "./ApplyClient";

export default async function EmployeeApplyPage() {
  const roleOptions = await getEmployeeApplicationRoleOptions();
  return <ApplyClient roleOptions={roleOptions} />;
}
