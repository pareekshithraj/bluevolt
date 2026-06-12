import { NextResponse } from "next/server";
import { updateEmployeeRecordStatus } from "@/app/actions/employee-portal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await updateEmployeeRecordStatus({
      entityType: typeof body.entityType === "string" ? body.entityType : "",
      id: typeof body.id === "string" ? body.id : "",
      status: typeof body.status === "string" ? body.status : "",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Employee update status failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const isLoginRequired = message.toLowerCase().includes("login required");
    return NextResponse.json(
      { success: false, error: message },
      { status: isLoginRequired ? 401 : 500 }
    );
  }
}
