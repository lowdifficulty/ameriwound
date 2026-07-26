#!/usr/bin/env node
/**
 * Post-process mirrored HTML: rewrite asset paths, internal links, inject AmeriWound AI menu.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIRROR_DIR = path.join(ROOT, "mirror", "html");

const SITE_HOSTS = ["ameriwound.com", "www.ameriwound.com"];

const WP_CONTENT_RE = new RegExp(
  `(?:https?:)?\\/\\/(?:${SITE_HOSTS.join("|")})(\\/wp-content\\/[^\\s"'>)]+)`,
  "gi"
);

const INTERNAL_LINK_RE = new RegExp(
  `https?:\\/\\/(?:${SITE_HOSTS.join("|")})(\\/[^\\s"'#>]*)`,
  "gi"
);

const AI_MENU_ITEM =
  '<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-aw-ai">' +
  '<a href="/ameriwound-ai/" class="elementor-sub-item">AmeriWound AI</a></li>';

const AI_MENU_ITEM_TAB =
  '<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-aw-ai">' +
  '<a href="/ameriwound-ai/" class="elementor-sub-item" tabindex="-1">AmeriWound AI</a></li>';

/** @param {string} html */
function rewriteWpContent(html) {
  return html.replace(WP_CONTENT_RE, "/assets$1");
}

/** @param {string} html */
function rewriteInternalLinks(html) {
  return html.replace(INTERNAL_LINK_RE, (match, pathname) => {
    if (pathname.startsWith("/wp-content/")) return `/assets${pathname}`;
    if (pathname.startsWith("/wp-json/")) return match;
    if (pathname.startsWith("/wp-includes/")) return match;
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  });
}

/** @param {string} html */
function injectAiMenuItem(html) {
  if (html.includes("menu-item-aw-ai")) return html;

  let out = html;
  out = out.replace(
    /(<li class="menu-item[^"]*menu-item-17851"[^>]*>[\s\S]*?Facility Records Portal<\/a><\/li>)/gi,
    `$1\n\t${AI_MENU_ITEM}`
  );
  out = out.replace(
    /(<li class="menu-item[^"]*menu-item-18744"[^>]*>[\s\S]*?Facility Records Portal<\/a><\/li>)/gi,
    `$1\n<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-aw-ai"><a href="/ameriwound-ai/" class="elementor-item">AmeriWound AI</a></li>`
  );
  out = out.replace(
    /(<li class="menu-item[^"]*menu-item-18126"[^>]*>[\s\S]*?Facility Records Portal<\/a><\/li>)/gi,
    `$1\n<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-aw-ai"><a href="/ameriwound-ai/" class="elementor-item">AmeriWound AI</a></li>`
  );

  if (!out.includes("menu-item-aw-ai")) {
    out = out.replace(
      /(Health Records Portal[\s\S]*?Facility Records Portal<\/a><\/li>)/i,
      `$1\n\t${AI_MENU_ITEM}`
    );
  }

  return out;
}

/** @param {string} html */
function removeCloudflareArtifacts(html) {
  return html
    .replace(/<script[^>]*\/cdn-cgi\/[^>]*>[\s\S]*?<\/script>\s*/gi, "")
    .replace(/<script[^>]*cloudflareinsights\.com[^>]*>[\s\S]*?<\/script>\s*/gi, "");
}

/** @param {string} html */
function processHtml(html) {
  let out = html;
  out = rewriteWpContent(out);
  out = rewriteInternalLinks(out);
  out = injectAiMenuItem(out);
  out = removeCloudflareArtifacts(out);
  return out;
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

async function main() {
  try {
    await fs.access(MIRROR_DIR);
  } catch {
    console.error("mirror/html not found. Run: npm run mirror");
    process.exit(1);
  }

  const files = await walkHtmlFiles(MIRROR_DIR);
  console.log(`Processing ${files.length} HTML files…`);

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const processed = processHtml(raw);
    if (processed !== raw) {
      await fs.writeFile(file, processed, "utf8");
    }
    console.log(`  ${path.relative(ROOT, file)}`);
  }

  console.log("HTML processing complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
