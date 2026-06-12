import { NextResponse } from "next/server";
import { saveGroupChatMessage } from "@/app/actions/employee-portal";

export async function POST(request: Request) {
  try {
    const bodyObj = await request.json();
    const result = await saveGroupChatMessage(bodyObj);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Employee chat API failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
