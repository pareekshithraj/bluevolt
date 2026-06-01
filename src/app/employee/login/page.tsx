import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee/session";
import LoginClient from "./LoginClient";

export default async function EmployeeLoginPage() {
  const session = await getEmployeeSession();
  if (session) redirect("/employee/portal");
  return <LoginClient />;
}
