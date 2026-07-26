#!/usr/bin/env node
/**
 * Mirror ameriwound.com HTML into mirror/html/ via sitemap discovery.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIRROR_DIR = path.join(ROOT, "mirror", "html");
const MANIFEST_PATH = path.join(ROOT, "mirror", "manifest.json");

const SITE_ORIGIN = "https://ameriwound.com";
const USER_AGENT = "AmeriWoundMirror/1.0 (+https://github.com/lowdifficulty/ameriwound)";
const RATE_LIMIT_MS = 200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {string} url */
function urlToRoute(url) {
  const parsed = new URL(url);
  if (parsed.origin !== SITE_ORIGIN) return null;
  return parsed.pathname.replace(/\/+$/, "") || "/";
}

/** @param {string} route */
function routeToFilePath(route) {
  if (route === "/") return path.join(MIRROR_DIR, "index.html");
  const segments = route.replace(/^\//, "").split("/");
  return path.join(MIRROR_DIR, ...segments, "index.html");
}

/** @param {string} url */
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** @param {Set<string>} urls */
async function loadSitemapUrls(urls) {
  const sitemapIndexUrl = `${SITE_ORIGIN}/sitemap_index.xml`;
  try {
    const indexXml = await fetchHtml(sitemapIndexUrl);
    await sleep(RATE_LIMIT_MS);

    const childSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(
      (m) => m[1].trim()
    );

    for (const sitemapUrl of childSitemaps) {
      if (!sitemapUrl.endsWith(".xml")) continue;
      try {
        const xml = await fetchHtml(sitemapUrl);
        await sleep(RATE_LIMIT_MS);
        const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) =>
          m[1].trim()
        );
        for (const loc of locs) {
          if (loc.startsWith(SITE_ORIGIN)) urls.add(loc);
        }
        console.log(`Sitemap ${sitemapUrl}: ${locs.length} URLs`);
      } catch (err) {
        console.warn(`Failed child sitemap ${sitemapUrl}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Sitemap discovery failed: ${err.message}`);
  }
}

/** @param {string} html @param {string} filePath */
async function writeHtml(html, filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, html, "utf8");
}

async function main() {
  console.log("AmeriWound mirror — starting");
  await fs.mkdir(MIRROR_DIR, { recursive: true });

  const urls = new Set([`${SITE_ORIGIN}/`]);
  await loadSitemapUrls(urls);
  console.log(`Total URLs: ${urls.size}`);

  /** @type {{ route: string, url: string, file: string }[]} */
  const manifest = [];
  let ok = 0;
  let failed = 0;

  const sortedUrls = [...urls].sort();
  for (const url of sortedUrls) {
    const route = urlToRoute(url);
    if (!route) continue;

    const fetchUrl = route === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${route}/`;
    const filePath = routeToFilePath(route);
    const relFile = path.relative(ROOT, filePath).split(path.sep).join("/");

    try {
      process.stdout.write(`Fetching ${fetchUrl} … `);
      const html = await fetchHtml(fetchUrl);
      await writeHtml(html, filePath);
      manifest.push({ route, url: fetchUrl, file: relFile });
      ok++;
      console.log("OK");
    } catch (err) {
      failed++;
      console.log(`FAIL (${err.message})`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  manifest.sort((a, b) => a.route.localeCompare(b.route));
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), site: SITE_ORIGIN, total: manifest.length, routes: manifest },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\nDone: ${ok} saved, ${failed} failed`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
