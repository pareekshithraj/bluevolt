import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 2000;

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    const firstName = sanitize(payload.firstName);
    const lastName = sanitize(payload.lastName);
    const email = sanitize(payload.email).toLowerCase();
    const organization = sanitize(payload.organization);
    const interest = sanitize(payload.interest);
    const message = sanitize(payload.message);
    const website = sanitize(payload.website);

    if (website) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!firstName || !lastName || !email || !organization || !interest) {
      return NextResponse.json(
        { success: false, error: "Please fill all required fields." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid work email." },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Message is too long. Max ${MAX_MESSAGE_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    await prisma.contactInquiry.create({
      data: {
        firstName,
        lastName,
        email,
        organization,
        interest,
        message: message || null,
        source: "website_contact_form",
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to submit your request right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
