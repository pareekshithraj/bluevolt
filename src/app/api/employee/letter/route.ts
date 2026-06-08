import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession, hasEmployeeRole } from "@/lib/employee/session";

const companyLegalName = "BLUEVOLT GROUPS PRIVATE LIMITED";
const companyWebsite = "bluevolt.group";
const companyPhone = "+91 9110893850";
const companyEmail = "pareekshithraj@schools24.in";
const companyAddress =
  "C/O SWATHI K N, A BLOCK, NARSAPUR ROAD, Kolar, Kolar, Karnataka - 563157, India";
const signatoryName = "K. N. Swathi";
const signatoryTitle = "Director & Authorized Signatory";
const signatorySignatureUrl = "/Assets/signatures/swathi_kn-removebg-preview.png";
const localFallbackEnabled =
  process.env.BLUEVOLT_ALLOW_LOCAL_FALLBACK === "true" ||
  process.env.NODE_ENV !== "production";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value?: Date | null) {
  const date = value || new Date();
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(value?: Date | null) {
  const date = value || new Date();
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isInternType(employeeType: string) {
  return employeeType.toLowerCase().includes("intern");
}

function workDaysText(employeeType: string) {
  return isInternType(employeeType) ? "5 days per week" : "As per assigned working calendar";
}

function benefitsText(employeeType: string) {
  return isInternType(employeeType)
    ? "Internship certificate and Letter of Recommendation based on performance"
    : "Employee portal access, role-based resources, and applicable company benefits";
}

function modeText(employeeType: string) {
  return isInternType(employeeType) ? "Remote / Hybrid" : "As assigned by reporting manager";
}

function contactIcon(type: "phone" | "mail" | "web" | "location") {
  const paths = {
    phone:
      '<path d="M22 16.92v2.18a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 3.4 2 2 0 0 1 4.11 1.22h2.18a2 2 0 0 1 2 1.72c.12.91.33 1.8.62 2.65a2 2 0 0 1-.45 2.11L7.56 8.6a16 16 0 0 0 7.84 7.84l.9-.9a2 2 0 0 1 2.11-.45c.85.29 1.74.5 2.65.62A2 2 0 0 1 22 16.92Z"/>',
    mail:
      '<path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="m22 7-10 6L2 7"/>',
    web:
      '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
    location:
      '<path d="M20 10c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  };

  return `<svg class="contact-svg" viewBox="0 0 24 24" aria-hidden="true">${paths[type]}</svg>`;
}

type LocalLetterEmployee = {
  id: number;
  name: string;
  email?: string;
  title: string;
  department: string;
  employeeType: string;
  compensationStatus: string;
  employmentStart: string | null;
  employmentEnd?: string | null;
  workStartTime: string;
  workEndTime: string;
};

async function localEmployeeById(id: number) {
  if (!localFallbackEnabled) return null;

  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".bluevolt-employee-store.json"), "utf8");
    const store = JSON.parse(raw) as { users?: LocalLetterEmployee[] };
    const employee = store.users?.find((user) => user.id === id);
    if (!employee) return null;
    return {
      ...employee,
      employmentStart: employee.employmentStart ? new Date(employee.employmentStart) : null,
      employmentEnd: employee.employmentEnd ? new Date(employee.employmentEnd) : null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const session = await getEmployeeSession();
  if (!session) return new NextResponse("Forbidden", { status: 403 });

  const employeeId = Number(request.nextUrl.searchParams.get("employeeId"));
  if (!Number.isFinite(employeeId)) return new NextResponse("Invalid employee", { status: 400 });

  const requestedType = request.nextUrl.searchParams.get("type") || "Offer Letter";
  let employee:
    | Awaited<ReturnType<typeof prisma.employeeUser.findUnique>>
    | Awaited<ReturnType<typeof localEmployeeById>> = null;

  try {
    employee = await prisma.employeeUser.findUnique({ where: { id: employeeId } });
  } catch {
    employee = await localEmployeeById(employeeId);
  }

  if (!employee) return new NextResponse("Employee not found", { status: 404 });

  const canReviewLetters = hasEmployeeRole(session, [
    "super_admin",
    "director",
    "authorized_signatory",
    "admin",
    "hr",
  ]);

  if (String(employee.id) !== session.userId && !canReviewLetters) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (String(employee.id) === session.userId && !canReviewLetters) {
    try {
      const document = await prisma.employeeDocument.findFirst({
        where: { employeeId, url: { contains: `/api/employee/letter?employeeId=${employeeId}` } },
        orderBy: { updatedAt: "desc" },
      });
      if (!document?.notes?.includes("Approval status: Approved")) {
        return new NextResponse("This document is waiting for director approval.", { status: 403 });
      }
    } catch {
      return new NextResponse("This document is waiting for director approval.", { status: 403 });
    }
  }

  const employeeStart = employee.employmentStart ? new Date(employee.employmentStart) : null;
  const employeeEnd = "employmentEnd" in employee && employee.employmentEnd ? new Date(employee.employmentEnd) : null;
  const employeeEmail = "email" in employee && employee.email ? employee.email : "";
  const intern = isInternType(employee.employeeType) || requestedType.toLowerCase().includes("internship");
  const letterType = requestedType === "Offer Letter" && intern ? "Internship Offer Letter" : requestedType;
  const subjectRole = employee.title || (intern ? "Intern" : "Employee");
  const compensationText =
    employee.compensationStatus === "Unpaid"
      ? "Unpaid engagement"
      : "As per company payroll record / separately issued compensation schedule";
  const engagementText = intern ? "internship" : "employment";
  const endText = employeeEnd ? ` and continue until ${formatShortDate(employeeEnd)}` : "";

  let bodyContent = "";
  if (letterType === "Offer Letter" || letterType === "Internship Offer Letter") {
    bodyContent = `
      <p>We are pleased to welcome you to <strong>Schools24</strong>, a brand of <strong>${companyLegalName}</strong>, for the role of <strong>${escapeHtml(subjectRole)}</strong>.</p>
      <p>Your ${engagementText} will begin on <strong>${formatShortDate(employeeStart)}</strong>${endText}. This offer is subject to company policies, confidentiality requirements, assigned responsibilities, and satisfactory completion of onboarding formalities.</p>

      <section class="detail-panel">
        <h2>Work Details</h2>
        <div class="detail-grid">
          <div><span>Role</span><strong>${escapeHtml(subjectRole)}</strong></div>
          <div><span>Department</span><strong>${escapeHtml(employee.department)}</strong></div>
          <div><span>Employee Type</span><strong>${escapeHtml(employee.employeeType)}</strong></div>
          <div><span>Working Days</span><strong>${workDaysText(employee.employeeType)}</strong></div>
          <div><span>Working Hours</span><strong>${escapeHtml(employee.workStartTime)} to ${escapeHtml(employee.workEndTime)}</strong></div>
          <div><span>Mode</span><strong>${modeText(employee.employeeType)}</strong></div>
          <div><span>Compensation</span><strong>${escapeHtml(compensationText)}</strong></div>
          <div><span>Benefits</span><strong>${benefitsText(employee.employeeType)}</strong></div>
        </div>
      </section>

      <p>You are expected to complete assigned work responsibly, coordinate through the employee portal, and maintain confidentiality regarding company materials, client information, internal systems, and operational processes.</p>
      <p>Please confirm your acceptance by acknowledging this letter through the employee portal or by replying to the issuing authority.</p>
    `;
  } else if (letterType === "Appraisal Letter") {
    bodyContent = `
      <p>This letter formally acknowledges your performance and contribution as <strong>${escapeHtml(employee.title)}</strong> in the <strong>${escapeHtml(employee.department)}</strong> function.</p>
      <p>Your progress, ownership, and contribution to assigned work have been noted. We appreciate your continued effort and look forward to your growth with ${companyLegalName}.</p>
      <section class="detail-panel">
        <h2>Review Summary</h2>
        <div class="detail-grid">
          <div><span>Current Role</span><strong>${escapeHtml(employee.title)}</strong></div>
          <div><span>Department</span><strong>${escapeHtml(employee.department)}</strong></div>
          <div><span>Review Date</span><strong>${formatDate(new Date())}</strong></div>
          <div><span>Employee Type</span><strong>${escapeHtml(employee.employeeType)}</strong></div>
        </div>
      </section>
    `;
  } else if (letterType === "Promotion Letter") {
    bodyContent = `
      <p>Congratulations. We are pleased to confirm your promotion to <strong>${escapeHtml(employee.title)}</strong> in the <strong>${escapeHtml(employee.department)}</strong> function.</p>
      <p>This promotion reflects our confidence in your ability to handle higher ownership and responsibility.</p>
      <section class="detail-panel">
        <h2>Promotion Details</h2>
        <div class="detail-grid">
          <div><span>New Role</span><strong>${escapeHtml(employee.title)}</strong></div>
          <div><span>Effective Date</span><strong>${formatDate(new Date())}</strong></div>
          <div><span>Department</span><strong>${escapeHtml(employee.department)}</strong></div>
          <div><span>Compensation</span><strong>${escapeHtml(compensationText)}</strong></div>
        </div>
      </section>
    `;
  } else if (letterType === "Termination Letter") {
    bodyContent = `
      <p>This letter serves as formal notice regarding the termination of your engagement as <strong>${escapeHtml(employee.title)}</strong> with ${companyLegalName}, effective as communicated by the company.</p>
      <p>Please coordinate with the HR or reporting authority for final clearance, settlement, and return of any company material or access credentials.</p>
    `;
  } else {
    bodyContent = `
      <p>This letter is issued to confirm that <strong>${escapeHtml(employee.name)}</strong> is associated with ${companyLegalName} as <strong>${escapeHtml(employee.title)}</strong> in the <strong>${escapeHtml(employee.department)}</strong> function.</p>
      <section class="detail-panel">
        <h2>Employment Details</h2>
        <div class="detail-grid">
          <div><span>Employee Type</span><strong>${escapeHtml(employee.employeeType)}</strong></div>
          <div><span>Department</span><strong>${escapeHtml(employee.department)}</strong></div>
          <div><span>Start Date</span><strong>${formatDate(employeeStart)}</strong></div>
          <div><span>Work Hours</span><strong>${escapeHtml(employee.workStartTime)} to ${escapeHtml(employee.workEndTime)}</strong></div>
        </div>
      </section>
    `;
  }

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(letterType)} - ${escapeHtml(employee.name)}</title>
  <style>
    @page { size: A4; margin: 0; }
    :root {
      --ink: #111827;
      --muted: #4b5563;
      --line: #d7dde8;
      --blue: #0ea5e9;
      --deep: #101827;
      --purple: #6d5dfc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 30px 18px;
      background: #eef2f8;
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      justify-content: center;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      position: relative;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
    }
    .top-rule {
      height: 8px;
      background: linear-gradient(90deg, var(--deep) 0 12%, var(--blue) 12% 30%, var(--purple) 30% 100%);
    }
    .corner-block {
      position: absolute;
      width: 32mm;
      height: 18mm;
      background: var(--blue);
      opacity: 0.9;
      left: 19mm;
      top: 8px;
    }
    .bottom-block {
      position: absolute;
      width: 32mm;
      height: 8mm;
      background: var(--blue);
      left: 19mm;
      bottom: 0;
    }
    .bottom-rule {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 8px;
      background: var(--deep);
    }
    .watermark {
      position: absolute;
      right: -8mm;
      bottom: 24mm;
      width: 58mm;
      opacity: 0.06;
      transform: rotate(-28deg);
    }
    .content {
      position: relative;
      z-index: 1;
      padding: 28mm 20mm 24mm;
    }
    .header {
      display: grid;
      grid-template-columns: 1fr 0.95fr;
      gap: 24px;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1.5px solid var(--ink);
      margin-bottom: 24px;
    }
    .logo {
      width: 42mm;
      height: auto;
      display: block;
    }
    .contact {
      display: grid;
      gap: 8px;
      color: #263244;
      font-size: 11px;
      line-height: 1.35;
      justify-self: end;
      max-width: 78mm;
    }
    .contact-row {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 9px;
      align-items: start;
    }
    .contact-icon {
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #2f5183;
    }
    .contact-svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      display: block;
    }
    .contact-value {
      color: #172033;
      overflow-wrap: anywhere;
    }
    .date-row {
      text-align: right;
      font-size: 13px;
      font-weight: 800;
      margin: 0 0 22px;
    }
    .recipient {
      color: var(--ink);
      font-size: 13px;
      line-height: 1.45;
      margin-bottom: 18px;
    }
    .subject {
      margin: 18px 0 18px;
      font-size: 13px;
      line-height: 1.45;
    }
    .body p {
      font-size: 13px;
      line-height: 1.62;
      margin: 0 0 13px;
      color: #161d2a;
    }
    .detail-panel {
      margin: 18px 0 18px;
      padding: 16px;
      border: 1px solid #dbe4f0;
      border-radius: 18px;
      background: linear-gradient(135deg, #f8fbff, #ffffff);
    }
    .detail-panel h2 {
      margin: 0 0 12px;
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .detail-grid div {
      min-height: 54px;
      padding: 10px 12px;
      border: 1px solid #e3e8f0;
      border-radius: 12px;
      background: #fff;
    }
    .detail-grid span {
      display: block;
      margin-bottom: 5px;
      color: #667085;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .detail-grid strong {
      display: block;
      color: var(--ink);
      font-size: 12px;
      line-height: 1.35;
    }
    .sign-section {
      margin-top: 28px;
      width: 70mm;
    }
    .signature-img {
      width: 44mm;
      height: 18mm;
      object-fit: contain;
      object-position: left center;
      display: block;
      margin-bottom: 2px;
    }
    .sign-name {
      font-size: 12px;
      font-weight: 800;
      margin: 0 0 3px;
    }
    .sign-title,
    .sign-company {
      font-size: 11px;
      font-weight: 800;
      margin: 0;
    }
    .footer {
      position: absolute;
      left: 20mm;
      right: 20mm;
      bottom: 12mm;
      z-index: 1;
      padding-top: 8px;
      border-top: 1px solid #d7dde8;
      color: #64748b;
      font-size: 9px;
      line-height: 1.45;
      text-align: center;
    }
    .print-btn {
      position: fixed;
      right: 18px;
      top: 18px;
      z-index: 5;
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      background: #0f172a;
      color: #fff;
      font: 800 13px Arial, Helvetica, sans-serif;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
      cursor: pointer;
    }
    @media print {
      body { display: block; padding: 0; background: #fff; }
      .page { width: 210mm; min-height: 297mm; box-shadow: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
  <main class="page">
    <div class="top-rule"></div>
    <div class="corner-block"></div>
    <img class="watermark" src="/logo.png" alt="" />
    <section class="content">
      <header class="header">
        <img class="logo" src="/logo.png" alt="BlueVolt Groups" />
        <div class="contact" aria-label="Company contact details">
          <div class="contact-row"><span class="contact-icon">${contactIcon("phone")}</span><span class="contact-value">${escapeHtml(companyPhone)}</span></div>
          <div class="contact-row"><span class="contact-icon">${contactIcon("mail")}</span><span class="contact-value">${escapeHtml(companyEmail)}</span></div>
          <div class="contact-row"><span class="contact-icon">${contactIcon("web")}</span><span class="contact-value">${escapeHtml(companyWebsite)}</span></div>
          <div class="contact-row"><span class="contact-icon">${contactIcon("location")}</span><span class="contact-value">${escapeHtml(companyAddress)}</span></div>
        </div>
      </header>

      <p class="date-row">${formatDate(new Date())}</p>

      <section class="recipient">
        <div>To,</div>
        <strong>${escapeHtml(employee.name)}</strong>
        ${employeeEmail ? `<div><strong>Email:</strong> ${escapeHtml(employeeEmail)}</div>` : ""}
      </section>

      <p class="subject"><strong>Subject:</strong> ${escapeHtml(letterType)} - ${escapeHtml(subjectRole)}</p>

      <section class="body">
        <p>Dear ${escapeHtml(employee.name)},</p>
        ${bodyContent}
        <p>We look forward to your contribution.</p>
      </section>

      <section class="sign-section">
        <p style="font-size: 12px; font-weight: 800; margin: 0 0 8px;">Sincerely,</p>
        <img class="signature-img" src="${signatorySignatureUrl}" alt="${escapeHtml(signatoryName)} signature" />
        <p class="sign-name">${escapeHtml(signatoryName)}</p>
        <p class="sign-title">${escapeHtml(signatoryTitle)}</p>
        <p class="sign-company">${companyLegalName}</p>
      </section>
    </section>
    <footer class="footer">
      This document is generated by ${companyLegalName}. Signatory: ${escapeHtml(signatoryName)} on ${formatDate(new Date())}. Document type: ${escapeHtml(titleCase(letterType))}.
    </footer>
    <div class="bottom-block"></div>
    <div class="bottom-rule"></div>
  </main>
</body>
</html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
