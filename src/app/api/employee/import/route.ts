import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession, hasEmployeeRole } from "@/lib/employee/session";
import { hashPassword } from "@/lib/employee/password";
import { EMPLOYEE_ROLES } from "@/lib/employee/roles";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (currentRow.length > 0 || currentVal !== "") {
        currentRow.push(currentVal);
        rows.push(currentRow.map((val) => val.trim()));
        currentRow = [];
        currentVal = "";
      }
    } else {
      currentVal += char;
    }
  }

  if (currentRow.length > 0 || currentVal !== "") {
    currentRow.push(currentVal);
    rows.push(currentRow.map((val) => val.trim()));
  }

  return rows;
}

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
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return NextResponse.json({ success: false, error: "Empty CSV file." }, { status: 400 });
  }

  const [headers, ...dataRows] = rows;
  let imported = 0;

  // Fetch all allowed roles from database + config
  const allowedRoles = new Set<string>(EMPLOYEE_ROLES);
  try {
    const dbRoles = await prisma.$queryRaw<{ key: string }[]>`SELECT "key" FROM "EmployeeRoleDefinition"`;
    if (Array.isArray(dbRoles)) {
      for (const r of dbRoles) {
        allowedRoles.add(r.key);
      }
    }
  } catch (e) {
    console.warn("Failed to fetch dynamic roles from database, using static roles", e);
  }

  for (const cells of dataRows) {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    if (!row.email || !row.name) continue;
    const email = row.email.toLowerCase();

    let role = (row.role || "").trim();
    if (!allowedRoles.has(role)) {
      role = "employee";
    }

    const existing = await prisma.employeeUser.findUnique({ where: { email } });
    const employee = await prisma.employeeUser.upsert({
      where: { email },
      update: {
        name: row.name,
        role: role,
        department: row.department || "General",
        title: row.title || "Team Member",
        employeeType: row.employeeType || "Full-time",
        compensationStatus: row.compensationStatus === "Unpaid" ? "Unpaid" : "Paid",
      },
      create: {
        name: row.name,
        email,
        password: hashPassword(row.password || "ChangeMe123!"),
        role: role,
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
