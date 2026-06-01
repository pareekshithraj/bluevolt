import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession, hasEmployeeRole } from "@/lib/employee/session";
import { hashPassword } from "@/lib/stores24/password";

export async function POST(request: NextRequest) {
  const session = await getEmployeeSession();
  if (!session || !hasEmployeeRole(session, ["admin", "hr"])) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Upload a CSV file." }, { status: 400 });
  }

  const text = await file.text();
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",").map((value) => value.trim());
  let imported = 0;

  for (const line of lines) {
    const cells = line.split(",").map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    if (!row.email || !row.name) continue;
    const email = row.email.toLowerCase();
    const existing = await prisma.employeeUser.findUnique({ where: { email } });
    const employee = await prisma.employeeUser.upsert({
      where: { email: row.email.toLowerCase() },
      update: {
        name: row.name,
        role: row.role || "employee",
        department: row.department || "General",
        title: row.title || "Team Member",
        employeeType: row.employeeType || "Full-time",
        compensationStatus: row.compensationStatus === "Unpaid" ? "Unpaid" : "Paid",
      },
      create: {
        name: row.name,
        email,
        password: hashPassword(row.password || "ChangeMe123!"),
        role: row.role || "employee",
        department: row.department || "General",
        title: row.title || "Team Member",
        employeeType: row.employeeType || "Full-time",
        compensationStatus: row.compensationStatus === "Unpaid" ? "Unpaid" : "Paid",
      },
    });
    if (!existing) {
      const letterType = employee.employeeType === "Intern" ? "Internship Offer Letter" : "Offer Letter";
      const letterUrl = `/api/employee/letter?employeeId=${employee.id}&type=${encodeURIComponent(letterType)}`;
      await prisma.employeeDocument.create({
        data: {
          employeeId: employee.id,
          employeeName: employee.name,
          title: letterType,
          documentType: letterType,
          url: letterUrl,
          visibilityRoles: "super_admin,admin,hr",
          notes: "Auto-generated when the employee account was imported.",
          uploadedBy: Number(session.userId),
        },
      });
      await prisma.employeeNotification.create({
        data: {
          employeeId: employee.id,
          title: letterType,
          body: `Your ${letterType.toLowerCase()} is available in the Documents section.`,
          createdBy: Number(session.userId),
        },
      });
    }
    imported += 1;
  }

  return NextResponse.json({ success: true, imported });
}
