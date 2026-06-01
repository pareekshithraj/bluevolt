import { redirect } from "next/navigation";
import { getEmployeePortalData } from "@/app/actions/employee-portal";
import PortalClient from "./PortalClient";

export default async function EmployeePortalPage() {
  try {
    const data = await getEmployeePortalData();
    return <PortalClient initialData={data} />;
  } catch {
    redirect("/employee/login");
  }
}
