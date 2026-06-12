import { NextResponse } from "next/server";
import { saveLeaveRequest } from "@/app/actions/employee-portal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await saveLeaveRequest({
      leaveType: typeof body.leaveType === "string" ? body.leaveType : "Casual Leave",
      startsAt: typeof body.startsAt === "string" ? body.startsAt : "",
      endsAt: typeof body.endsAt === "string" ? body.endsAt : "",
      reason: typeof body.reason === "string" ? body.reason : "",
      status: "Pending",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Employee save leave request failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const isLoginRequired = message.toLowerCase().includes("login required");
    return NextResponse.json(
      { success: false, error: message },
      { status: isLoginRequired ? 401 : 500 }
    );
  }
}
