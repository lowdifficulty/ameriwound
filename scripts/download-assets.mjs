#!/usr/bin/env node
/**
 * Download wp-content assets referenced in processed mirror HTML to public/assets/.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { posix as pathPosix } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIRROR_DIR = path.join(ROOT, "mirror", "html");
const PUBLIC_ASSETS = path.join(ROOT, "public", "assets");

const SITE_ORIGIN = "https://ameriwound.com";
const USER_AGENT = "AmeriWoundAssets/1.0";
const RATE_LIMIT_MS = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {string} html */
function extractAssetPaths(html) {
  /** @type {Set<string>} */
  const paths = new Set();

  const patterns = [
    /\/assets\/wp-content\/[^\s"'>)]+/gi,
    /https?:\/\/(?:www\.)?ameriwound\.com\/wp-content\/[^\s"'>)]+/gi,
    /(?:https?:)?\/\/ameriwound\.com\/wp-content\/[^\s"'>)]+/gi,
    /<source\s+src=["'](\/assets\/wp-content\/[^"']+)["']/gi,
  ];

  for (const re of patterns) {
    for (const match of html.matchAll(re)) {
      let value = match[1] ?? match[0];
      value = value.replace(/^https?:\/\/(?:www\.)?ameriwound\.com/i, "");
      if (value.startsWith("/assets/wp-content/")) {
        value = value.replace(/^\/assets/, "");
      }
      if (value.startsWith("/wp-content/")) {
        const clean = value.split("?")[0].split("#")[0];
        // Skip directory-only paths (no file extension)
        if (/\.[a-z0-9]{2,5}$/i.test(clean)) {
          paths.add(clean);
        }
      }
    }
  }

  return paths;
}

/** @param {string} css @param {string} cssWpPath e.g. /wp-content/plugins/.../file.css */
function extractCssAssetPaths(css, cssWpPath) {
  /** @type {Set<string>} */
  const paths = new Set();
  const baseDir = pathPosix.dirname(cssWpPath);

  for (const match of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    let url = match[1].trim();
    if (url.startsWith("data:")) continue;

    const clean = url.split("?")[0].split("#")[0];
    if (!/\.[a-z0-9]{2,5}$/i.test(clean)) continue;

    if (url.startsWith("/assets/wp-content/")) {
      paths.add(clean.replace(/^\/assets/, ""));
    } else if (/^https?:\/\/(?:www\.)?ameriwound\.com\/wp-content\//i.test(url)) {
      paths.add(clean.replace(/^https?:\/\/(?:www\.)?ameriwound\.com/i, ""));
    } else if (url.startsWith("/wp-content/")) {
      paths.add(clean);
    } else if (!/^https?:/i.test(url)) {
      const resolved = pathPosix.normalize(pathPosix.join(baseDir, clean));
      if (resolved.startsWith("/wp-content/")) paths.add(resolved);
    }
  }

  return paths;
}

/** @param {string} dir */
async function walkCssFiles(dir) {
  /** @type {string[]} */
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkCssFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(full);
    }
  }
  return files;
}

/** @param {string} dir */
async function walkHtmlFiles(dir) {
  /** @type {string[]} */
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkHtmlFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

const WEBPACK_RUNTIME_PATHS = [
  "/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js",
  "/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js",
];

/** @param {string} runtimeJs */
function extractWebpackChunkFiles(runtimeJs) {
  /** @type {Set<string>} */
  const files = new Set();
  for (const match of runtimeJs.matchAll(/\d+===e\?"([^"]+\.bundle\.min\.js)"/g)) {
    files.add(match[1]);
  }
  return files;
}

/** @param {Set<string>} paths */
async function collectWebpackChunkPaths(paths) {
  for (const runtimePath of WEBPACK_RUNTIME_PATHS) {
    const diskPath = path.join(PUBLIC_ASSETS, runtimePath.replace(/^\//, ""));
    let runtimeJs;
    try {
      runtimeJs = await fs.readFile(diskPath, "utf8");
    } catch {
      const result = await downloadAsset(runtimePath);
      if (result.status === "failed") continue;
      runtimeJs = await fs.readFile(diskPath, "utf8");
    }

    const dir = path.posix.dirname(runtimePath);
    for (const file of extractWebpackChunkFiles(runtimeJs)) {
      paths.add(`${dir}/${file}`);
    }
  }
}

/** @param {string} wpPath */
async function downloadAsset(wpPath) {
  const dest = path.join(PUBLIC_ASSETS, wpPath.replace(/^\//, ""));
  try {
    await fs.access(dest);
    return { wpPath, status: "skipped" };
  } catch {
    // continue
  }

  // Remove stale file blocking directory creation
  const parent = path.dirname(dest);
  try {
    const parentStat = await fs.stat(parent);
    if (!parentStat.isDirectory()) {
      await fs.unlink(parent);
      await fs.mkdir(parent, { recursive: true });
    }
  } catch {
    await fs.mkdir(parent, { recursive: true });
  }

  const url = `${SITE_ORIGIN}${wpPath}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    return { wpPath, status: "failed", error: `HTTP ${res.status}` };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  return { wpPath, status: "downloaded", bytes: buf.length };
}

async function main() {
  try {
    await fs.access(MIRROR_DIR);
  } catch {
    console.error("mirror/html not found. Run: npm run mirror && npm run postmirror");
    process.exit(1);
  }

  const files = await walkHtmlFiles(MIRROR_DIR);
  /** @type {Set<string>} */
  const allPaths = new Set();
  for (const file of files) {
    const html = await fs.readFile(file, "utf8");
    for (const p of extractAssetPaths(html)) allPaths.add(p);
  }

  const wpContentDir = path.join(PUBLIC_ASSETS, "wp-content");
  const cssFiles = await walkCssFiles(wpContentDir);
  for (const cssFile of cssFiles) {
    const rel = path.relative(wpContentDir, cssFile).replace(/\\/g, "/");
    const cssWpPath = `/wp-content/${rel}`;
    const css = await fs.readFile(cssFile, "utf8");
    for (const p of extractCssAssetPaths(css, cssWpPath)) allPaths.add(p);
  }

  const bundleDir = path.join(PUBLIC_ASSETS, "bundles");
  const bundleFiles = await walkCssFiles(bundleDir);
  for (const cssFile of bundleFiles) {
    const css = await fs.readFile(cssFile, "utf8");
    for (const match of css.matchAll(/\/\* (\/assets\/wp-content\/[^\s*]+) \*\//g)) {
      const sourceHref = match[1].split("?")[0].replace(/\/+/g, "/");
      const cssWpPath = sourceHref.replace(/^\/assets/, "");
      for (const p of extractCssAssetPaths(css, cssWpPath)) allPaths.add(p);
    }
    for (const p of extractAssetPaths(css)) allPaths.add(p);
  }

  await collectWebpackChunkPaths(allPaths);
  console.log(`Found ${allPaths.size} unique asset paths`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const sorted = [...allPaths].sort();
  for (const wpPath of sorted) {
    const result = await downloadAsset(wpPath);
    if (result.status === "downloaded") {
      downloaded++;
      if (downloaded % 50 === 0) console.log(`  downloaded ${downloaded}…`);
    } else if (result.status === "skipped") {
      skipped++;
    } else {
      failed++;
      console.warn(`  FAIL ${wpPath}: ${result.error}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
