import { cookies } from "next/headers";

export const AUTH_COOKIE = "aw_session";

/** Named demo accounts (username match is case-insensitive). */
const DEMO_ACCOUNTS: Array<{ username: string; password: string }> = [
  { username: "matthew", password: "Fresh2026!!" },
  { username: "1", password: "1" },
];

export function isValidCredentials(username: string, password: string): boolean {
  const user = username.trim();
  const pass = password.trim();

  if (!user || !pass) return false;

  const userLower = user.toLowerCase();
  if (
    DEMO_ACCOUNTS.some(
      (account) =>
        account.username.toLowerCase() === userLower && account.password === pass
    )
  ) {
    return true;
  }

  // Demo mode: any other non-empty username/password (e.g. 111111) is accepted.
  return true;
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
