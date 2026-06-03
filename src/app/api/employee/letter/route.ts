import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession, hasEmployeeRole } from "@/lib/employee/session";

const companyLegalName = "BLUEVOLT GROUPS PRIVATE LIMITED";
const companyWebsite = "bluevolt.group";
const companyPhone = "+91 9110893850";
const signatorySignatureUrl = "/Assets/signatures/swathi_kn-removebg-preview.png";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value?: Date | null) {
  return value
    ? value.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

type LocalLetterEmployee = {
  id: number;
  name: string;
  title: string;
  department: string;
  employeeType: string;
  compensationStatus: string;
  employmentStart: string | null;
  workStartTime: string;
  workEndTime: string;
};

async function localEmployeeById(id: number) {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".bluevolt-employee-store.json"), "utf8");
    const store = JSON.parse(raw) as { users?: LocalLetterEmployee[] };
    const employee = store.users?.find((user) => user.id === id);
    if (!employee) return null;
    return {
      ...employee,
      employmentStart: employee.employmentStart ? new Date(employee.employmentStart) : null,
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
  const type = request.nextUrl.searchParams.get("type") || "Offer Letter";
  let employee: Awaited<ReturnType<typeof prisma.employeeUser.findUnique>> | Awaited<ReturnType<typeof localEmployeeById>> = null;
  try {
    employee = await prisma.employeeUser.findUnique({ where: { id: employeeId } });
  } catch {
    employee = await localEmployeeById(employeeId);
  }
  if (!employee) return new NextResponse("Employee not found", { status: 404 });

  const canReviewLetters = hasEmployeeRole(session, ["super_admin", "director", "authorized_signatory", "admin", "hr"]);
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

  const title = escapeHtml(type);
  const isIntern = employee.employeeType.toLowerCase() === "intern";
  const joiningText = isIntern ? "internship engagement" : "employment";
  const compensationText = employee.compensationStatus === "Unpaid"
    ? "This is currently recorded as an unpaid engagement unless separately updated in writing."
    : "Your compensation details will be governed by the payroll record and any separate compensation schedule issued by BLUEVOLT GROUPS PRIVATE LIMITED.";

  let bodyContent = "";
  if (type === "Offer Letter") {
    bodyContent = `
      <p>We are pleased to offer you the role of <strong>${escapeHtml(employee.title)}</strong> in the <strong>${escapeHtml(employee.department)}</strong> function at ${companyLegalName}.</p>
      <table class="meta-table">
        <tr><td>Employee Type</td><td>${escapeHtml(employee.employeeType)}</td></tr>
        <tr><td>Paid Status</td><td>${escapeHtml(employee.compensationStatus)}</td></tr>
        <tr><td>Expected Start</td><td>${formatDate(employee.employmentStart)}</td></tr>
        <tr><td>Work Hours</td><td>${escapeHtml(employee.workStartTime)} to ${escapeHtml(employee.workEndTime)}</td></tr>
      </table>
      <p>This ${joiningText} is subject to company policies, confidentiality obligations, assigned responsibilities, and satisfactory completion of onboarding requirements.</p>
      <p>${compensationText}</p>
      <p>Please confirm your acceptance by replying to the issuing authority or acknowledging this letter through the employee portal.</p>
    `;
  } else if (type === "Appraisal Letter") {
    bodyContent = `
      <p>This letter is to formally acknowledge your performance and contributions in the role of <strong>${escapeHtml(employee.title)}</strong> within the <strong>${escapeHtml(employee.department)}</strong> department.</p>
      <p>Your ongoing dedication to the team's objectives has been noted. We appreciate your continued efforts and look forward to your future growth with ${companyLegalName}.</p>
      <table class="meta-table">
        <tr><td>Current Role</td><td>${escapeHtml(employee.title)}</td></tr>
        <tr><td>Review Date</td><td>${formatDate(new Date())}</td></tr>
      </table>
    `;
  } else if (type === "Promotion Letter") {
    bodyContent = `
      <p>Congratulations! We are thrilled to inform you of your promotion to the role of <strong>${escapeHtml(employee.title)}</strong> within the <strong>${escapeHtml(employee.department)}</strong> department.</p>
      <p>Your hard work and dedication have been exemplary. This promotion reflects our confidence in your abilities to take on these new responsibilities.</p>
      <table class="meta-table">
        <tr><td>New Role</td><td>${escapeHtml(employee.title)}</td></tr>
        <tr><td>Effective Date</td><td>${formatDate(new Date())}</td></tr>
      </table>
      <p>${compensationText}</p>
    `;
  } else if (type === "Termination Letter") {
    bodyContent = `
      <p>This letter serves as formal notice regarding the termination of your employment as <strong>${escapeHtml(employee.title)}</strong> at ${companyLegalName}, effective immediately.</p>
      <p>Please contact the HR department for instructions regarding your final settlement, clearance process, and exit procedures.</p>
    `;
  } else {
    bodyContent = `
      <p>This letter is issued to <strong>${escapeHtml(employee.name)}</strong>, currently holding the position of <strong>${escapeHtml(employee.title)}</strong> in the <strong>${escapeHtml(employee.department)}</strong> department.</p>
      <p>This document serves as an official confirmation of employment details as per our records.</p>
    `;
  }

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - ${escapeHtml(employee.name)}</title>
  <style>
    @page { size: A4; margin: 0; }
    body { font-family: 'Times New Roman', serif; color: #111; margin: 0; background: #e2e8f0; display: flex; justify-content: center; padding: 40px 20px; }
    .page { width: 210mm; min-height: 297mm; background: #fff; padding: 25mm; box-sizing: border-box; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand-name { font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; }
    .company-details { font-family: Arial, sans-serif; font-size: 11px; color: #475569; text-align: right; line-height: 1.4; }
    .title { text-align: center; font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 20px 0 40px; letter-spacing: 2px; text-decoration: underline; }
    p { line-height: 1.6; font-size: 15px; margin-bottom: 16px; text-align: justify; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 14px; font-family: Arial, sans-serif; }
    .meta-table td { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .meta-table td:first-child { font-weight: bold; width: 35%; color: #334155; }
    .sign-block { margin-top: 80px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; }
    .sign-box { width: 260px; }
    .signature-img { width: 180px; height: 72px; object-fit: contain; object-position: left center; display: block; margin-bottom: 4px; }
    .sign-line { border-top: 1px solid #111; margin-top: 60px; padding-top: 8px; font-size: 14px; font-weight: bold; }
    .footer { position: absolute; bottom: 20mm; left: 25mm; right: 25mm; text-align: center; font-family: Arial, sans-serif; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #0ea5e9; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: Arial; font-weight: bold; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); transition: background 0.2s; }
    .print-btn:hover { background: #0284c7; }
    @media print { body { padding: 0; background: none; display: block; } .page { box-shadow: none; width: auto; min-height: auto; padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <div class="page">
    <div class="header">
      <div class="brand-name" style="display: flex; align-items: center; gap: 12px;">
        <img src="/logo.png" alt="BlueVolt Logo" style="height: 48px;" />
      </div>
      <div class="company-details">
        <strong>${companyLegalName}</strong><br/>
        Bengaluru, Karnataka, India<br/>
        ${companyWebsite}<br/>
        ${companyPhone}
      </div>
    </div>
    
    <p><strong>Date:</strong> ${formatDate(new Date())}</p>
    
    <div class="title">${title}</div>
    
    <p>Dear <strong>${escapeHtml(employee.name)}</strong>,</p>
    
    ${bodyContent}
    
    <div class="sign-block">
      <div class="sign-box">
        <img class="signature-img" src="${signatorySignatureUrl}" alt="Authorized Signatory Signature" />
        <div class="sign-line">For ${companyLegalName}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">Authorized Signatory</div>
      </div>
    </div>

    <div class="footer">
      This is a digitally generated document. ${companyLegalName} is registered in India.
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
