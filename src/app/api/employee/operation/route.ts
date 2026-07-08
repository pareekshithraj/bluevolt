import { NextResponse } from "next/server";
import {
  saveMeeting,
  saveResource,
  saveEmployeeRoleDefinition,
  saveEmployeeUser,
  deleteEmployeeEntity,
  changeEmployeePassword,
  saveTask,
  saveAnnouncement,
  updateCrmSheetRowStatus,
  saveCrmSheetRequest,
  approveCrmSheet,
  approveEmployeeDocument,
  saveDepartment,
} from "@/app/actions/employee-portal";
import { friendlyEmployeeError } from "@/lib/employee/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, payload } = body;

    if (!operation) {
      return NextResponse.json({ success: false, error: "Missing operation parameter" }, { status: 400 });
    }

    if (operation === "saveMeeting") {
      const result = await saveMeeting(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "saveResource") {
      const result = await saveResource(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "saveRoleDefinition") {
      const result = await saveEmployeeRoleDefinition(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "saveEmployeeUser") {
      const result = await saveEmployeeUser(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "deleteEmployeeEntity") {
      const result = await deleteEmployeeEntity(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "changeEmployeePassword") {
      const result = await changeEmployeePassword(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "saveTask") {
      const result = await saveTask(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "saveAnnouncement") {
      const result = await saveAnnouncement(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "updateCrmSheetRowStatus") {
      const result = await updateCrmSheetRowStatus(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "saveCrmSheetRequest") {
      const result = await saveCrmSheetRequest(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "approveCrmSheet") {
      const result = await approveCrmSheet(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "approveEmployeeDocument") {
      const result = await approveEmployeeDocument(payload);
      return NextResponse.json(result, { status: 200 });
    } else if (operation === "saveDepartment") {
      const result = await saveDepartment(payload);
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json({ success: false, error: `Unsupported operation: ${operation}` }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Employee operation failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const isLoginRequired = message.toLowerCase().includes("login required");
    const friendlyError = friendlyEmployeeError(error, "Operation failed. Please try again.");
    return NextResponse.json(
      { success: false, error: friendlyError },
      { status: isLoginRequired ? 401 : 500 }
    );
  }
}
