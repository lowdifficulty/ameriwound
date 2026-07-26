import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  isValidCredentials,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "").trim();

  if (!isValidCredentials(username, password)) {
    return NextResponse.json(
      { success: false, message: "Invalid username or password." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "authenticated", sessionCookieOptions());
  return response;
}
