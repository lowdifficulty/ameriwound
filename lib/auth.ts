import { cookies } from "next/headers";

export const AUTH_COOKIE = "aw_session";
const VALID_USER = "1";
const VALID_PASS = "1";

export function isValidCredentials(username: string, password: string): boolean {
  return username === VALID_USER && password === VALID_PASS;
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE);
  return session?.value === "authenticated";
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
