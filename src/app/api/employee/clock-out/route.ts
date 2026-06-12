import { NextResponse } from "next/server";
import { clockOutEmployee } from "@/app/actions/employee-portal";

export async function POST() {
  try {
    const result = await clockOutEmployee();
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: unknown) {
    console.error("Employee clock-out failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const isLoginRequired = message.toLowerCase().includes("login required");
    return NextResponse.json(
      { success: false, error: message },
      { status: isLoginRequired ? 401 : 500 }
    );
  }
}
