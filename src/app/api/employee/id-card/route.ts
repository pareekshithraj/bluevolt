import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession, hasEmployeeRole } from "@/lib/employee/session";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value?: Date | null) {
  return value
    ? value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Not set";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "BV";
}

function employeeCode(id: number) {
  return `BV-${String(id).padStart(5, "0")}`;
}

export async function GET(request: NextRequest) {
  const session = await getEmployeeSession();
  if (!session) return new NextResponse("Forbidden", { status: 403 });

  const employeeId = Number(request.nextUrl.searchParams.get("employeeId"));
  if (!Number.isFinite(employeeId)) return new NextResponse("Invalid employee", { status: 400 });

  const employee = await prisma.employeeUser.findUnique({ where: { id: employeeId } });
  if (!employee) return new NextResponse("Employee not found", { status: 404 });

  if (String(employee.id) !== session.userId && !hasEmployeeRole(session, ["admin", "hr"])) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const code = employeeCode(employee.id);
  const safeName = escapeHtml(employee.name);
  const download = request.nextUrl.searchParams.get("download") === "1";
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ID Card - ${safeName}</title>
  <style>
    @page { size: 90mm 138mm; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #eef4ff, #ffffff);
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      padding: 28px;
    }
    .actions {
      position: fixed;
      top: 18px;
      right: 18px;
      display: flex;
      gap: 10px;
    }
    .actions button {
      border: 0;
      border-radius: 999px;
      padding: 11px 18px;
      background: #111827;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 16px 32px rgba(17, 24, 39, 0.16);
    }
    .card {
      width: 340px;
      min-height: 520px;
      border-radius: 28px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #dbe5ff;
      box-shadow: 0 30px 70px rgba(15, 23, 42, 0.18);
    }
    .top {
      min-height: 164px;
      padding: 22px;
      color: #ffffff;
      background:
        radial-gradient(circle at 85% 20%, rgba(14, 165, 233, 0.55), transparent 30%),
        linear-gradient(135deg, #111827, #4f46e5 60%, #0ea5e9);
      position: relative;
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-size: 12px;
    }
    .logo {
      width: 74px;
      height: 38px;
      object-fit: contain;
      background: #ffffff;
      border-radius: 10px;
      padding: 4px;
    }
    .avatar {
      width: 104px;
      height: 104px;
      border-radius: 28px;
      display: grid;
      place-items: center;
      margin: 22px auto -54px;
      background: #ffffff;
      color: #4f46e5;
      border: 6px solid rgba(255,255,255,0.42);
      box-shadow: 0 18px 34px rgba(15, 23, 42, 0.22);
      font-size: 34px;
      font-weight: 900;
    }
    .body {
      padding: 68px 24px 24px;
      text-align: center;
    }
    h1 {
      margin: 0;
      font-size: 25px;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .title {
      color: #4f46e5;
      font-weight: 800;
      margin-top: 7px;
      font-size: 14px;
    }
    .code {
      display: inline-flex;
      margin: 18px 0;
      padding: 8px 13px;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      font-weight: 900;
      letter-spacing: 0.08em;
      font-size: 12px;
    }
    .details {
      display: grid;
      gap: 10px;
      margin-top: 8px;
      text-align: left;
    }
    .line {
      display: grid;
      grid-template-columns: 94px 1fr;
      gap: 10px;
      align-items: start;
      padding: 10px 0;
      border-bottom: 1px solid #eef2f7;
      font-size: 13px;
    }
    .line span:first-child {
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 10px;
      font-weight: 900;
    }
    .line span:last-child {
      color: #111827;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .footer {
      margin-top: 18px;
      border-radius: 18px;
      padding: 14px;
      background: #f8fafc;
      color: #64748b;
      font-size: 11px;
      line-height: 1.45;
    }
    @media print {
      body { min-height: auto; padding: 0; background: #fff; }
      .actions { display: none; }
      .card { width: 90mm; min-height: 138mm; border-radius: 0; box-shadow: none; border: 0; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <article class="card">
    <section class="top">
      <div class="brand">
        <img class="logo" src="/Assets/Logos/BLUEVOLT.png" alt="BlueVolt" />
        <span>Employee ID</span>
      </div>
      <div class="avatar">${escapeHtml(initials(employee.name))}</div>
    </section>
    <section class="body">
      <h1>${safeName}</h1>
      <div class="title">${escapeHtml(employee.title)}</div>
      <div class="code">${code}</div>
      <div class="details">
        <div class="line"><span>Email</span><span>${escapeHtml(employee.email)}</span></div>
        <div class="line"><span>Role</span><span>${escapeHtml(employee.role.replace("_", " "))}</span></div>
        <div class="line"><span>Dept</span><span>${escapeHtml(employee.department)}</span></div>
        <div class="line"><span>Type</span><span>${escapeHtml(employee.employeeType)} / ${escapeHtml(employee.compensationStatus)}</span></div>
        <div class="line"><span>Valid</span><span>${formatDate(employee.employmentStart)} to ${formatDate(employee.employmentEnd)}</span></div>
        <div class="line"><span>Hours</span><span>${escapeHtml(employee.workStartTime)} to ${escapeHtml(employee.workEndTime)}</span></div>
      </div>
      <div class="footer">
        This ID card is valid only while the employee status is active in the BlueVolt employee portal.
      </div>
    </section>
  </article>
</body>
</html>`;

  const headers: Record<string, string> = { "content-type": "text/html; charset=utf-8" };
  if (download) {
    headers["content-disposition"] = `attachment; filename="${code}-${employee.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-id-card.html"`;
  }

  return new NextResponse(html, { headers });
}
