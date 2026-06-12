import { NextResponse } from "next/server";
import { saveExpenseClaim } from "@/app/actions/employee-portal";

export async function POST(request: Request) {
  try {
    const bodyObj = await request.json();
    const result = await saveExpenseClaim(bodyObj);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Employee expense API failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
