import { NextResponse } from "next/server";
import { getEmployeePortalData } from "@/app/actions/employee-portal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeTab = searchParams.get("tab") || "dashboard";
    const sort = searchParams.get("sort") || "newest";

    const data = await getEmployeePortalData(sort, activeTab);
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("Employee portal GET failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const isLoginRequired = message.toLowerCase().includes("login required");
    return NextResponse.json(
      { success: false, error: message },
      { status: isLoginRequired ? 401 : 500 }
    );
  }
}
