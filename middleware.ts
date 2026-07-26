import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/ameriwound-ai/dashboard") ||
    pathname.startsWith("/ameriwound-ai/admin")
  ) {
    if (!(await isAuthenticated())) {
      return NextResponse.redirect(new URL("/ameriwound-ai/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ameriwound-ai/dashboard/:path*", "/ameriwound-ai/admin/:path*"],
};
