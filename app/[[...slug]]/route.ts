import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const MIRROR_ROOT = path.join(process.cwd(), "mirror", "html");

/** Live site uses /about/; mirror slug is about-ameriwound. */
const ROUTE_ALIASES: Record<string, string> = {
  "/about": "/about-ameriwound",
};

function normalizeRoute(slug?: string[]): string {
  if (!slug || slug.length === 0) return "/";
  const joined = slug.filter(Boolean).join("/");
  return `/${joined.replace(/^\/+|\/+$/g, "")}`;
}

function htmlFileForRoute(route: string): string {
  if (route === "/") {
    return path.join(MIRROR_ROOT, "index.html");
  }
  const segments = route.replace(/^\//, "").split("/");
  return path.join(MIRROR_ROOT, ...segments, "index.html");
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  let route = normalizeRoute(slug);
  route = ROUTE_ALIASES[route] ?? route;
  const htmlPath = htmlFileForRoute(route);

  try {
    const html = await readFile(htmlPath, "utf8");
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
