import { NextResponse } from "next/server";
import { loginEmployee } from "@/app/actions/employee-portal";
import { createEmployeeSessionToken } from "@/lib/employee/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginEmployee({
      email: typeof body.email === "string" ? body.email : "",
      password: typeof body.password === "string" ? body.password : "",
    });

    if (result.success && result.user) {
      const token = await createEmployeeSessionToken({
        userId: result.user.id.toString(),
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      });
      return NextResponse.json({
        success: true,
        token,
        redirectTo: result.redirectTo,
        user: result.user
      }, { status: 200 });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Employee login API failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "The employee portal is temporarily unavailable. Please try again in a minute.",
      },
      { status: 503 },
    );
  }
}
