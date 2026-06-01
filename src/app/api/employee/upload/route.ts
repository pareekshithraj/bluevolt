import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getEmployeeSession } from "@/lib/employee/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getEmployeeSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Employee login required." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const fileName = `${Date.now()}-${safeName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "employee");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);

  return NextResponse.json({
    success: true,
    url: `/uploads/employee/${fileName}`,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
}
