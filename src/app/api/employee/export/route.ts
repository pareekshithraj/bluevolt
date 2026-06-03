import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession, hasEmployeeRole } from "@/lib/employee/session";

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  const session = await getEmployeeSession();
  if (!session || !hasEmployeeRole(session, ["admin", "hr"])) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type") || "employees";
  let rows: Record<string, unknown>[] = [];

  if (type === "attendance") {
    rows = await prisma.employeeAttendance.findMany({ orderBy: { workDate: "desc" } });
  } else if (type === "payroll") {
    rows = await prisma.employeePayrollInput.findMany({ orderBy: { updatedAt: "desc" } });
  } else if (type === "crm") {
    rows = await prisma.employeeCrmRecord.findMany({ orderBy: { updatedAt: "desc" } });
  } else if (type === "expenses") {
    rows = await prisma.employeeExpenseClaim.findMany({ orderBy: { updatedAt: "desc" } });
  } else {
    rows = (await prisma.employeeUser.findMany({ orderBy: { createdAt: "desc" } })).map((user) => {
      const row: Record<string, unknown> = { ...user };
      delete row.password;
      return row;
    });
  }

  return new NextResponse(csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="employee-${type}.csv"`,
    },
  });
}
