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

const WP_CONTENT_JSON_ESCAPED_RE = new RegExp(
  `https?:\\\\/\\\\/(?:${SITE_HOSTS.join("|")})\\\\/wp-content\\\\/`,
  "gi"
);

const JQUERY_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js";
const JQUERY_MIGRATE_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/jquery-migrate/3.4.1/jquery-migrate.min.js";

const STATIC_HERO_STYLE = `<style id="aw-static-hero-css">
.aw-static-hero{position:relative;width:100%;overflow:hidden;background:#e8eef3}
.aw-hero-slides{position:relative;width:100%;height:350px}
@media(min-width:778px){.aw-hero-slides{height:500px}}
@media(min-width:1024px){.aw-hero-slides{height:650px}}
@media(min-width:1240px){.aw-hero-slides{height:830px}}
.aw-hero-slide{position:absolute;inset:0;background:center/cover no-repeat;opacity:0;transition:opacity .8s ease}
.aw-hero-slide.active{opacity:1;z-index:1}
.aw-hero-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.82) 0%,rgba(255,255,255,.55) 45%,rgba(255,255,255,.1) 100%);z-index:2}
.aw-hero-content{position:relative;z-index:3;display:flex;flex-direction:column;justify-content:center;height:100%;max-width:1300px;margin:0 auto;padding:2rem 2.5rem;box-sizing:border-box}
.aw-hero-tag{display:inline-block;font-family:Quicksand,Montserrat,sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;color:#990066;letter-spacing:.04em;margin-bottom:.75rem;position:relative;padding-bottom:.35rem}
.aw-hero-tag::after{content:"";position:absolute;left:0;bottom:0;width:174px;height:30px;background:rgba(153,0,102,.12);border-radius:3px}
.aw-hero-title{font-family:Quicksand,Montserrat,sans-serif;font-size:clamp(22px,5vw,64px);font-weight:600;line-height:1.12;color:#003366;text-transform:capitalize;margin:0 0 1.25rem;max-width:820px}
.aw-hero-desc{font-family:Montserrat,sans-serif;font-size:16px;line-height:2;color:#888;max-width:654px;margin:1.25rem 0 0}
.aw-hero-btn{display:inline-flex;align-items:center;gap:.5rem;width:fit-content;padding:15px 30px;background:#cc3;border-radius:3px;color:#fff!important;font-family:Quicksand,sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;text-decoration:none!important;transition:background .2s}
.aw-hero-btn:hover{background:#036}
.aw-hero-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:50px;height:100px;border:none;border-radius:50%;background:rgba(0,0,0,.1);color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.aw-hero-nav:hover{background:rgba(0,0,0,.25)}
.aw-hero-prev{left:12px}
.aw-hero-next{right:12px}
.aw-hero-dots{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:4;display:flex;gap:8px}
.aw-hero-dot{width:12px;height:12px;border-radius:50%;border:0;background:#14457b;opacity:.5;cursor:pointer;padding:0}
.aw-hero-dot.active{opacity:1;background:#2490eb}
.wp-block-themepunch-revslider{display:none!important}
</style>`;

const STATIC_HERO_HTML = `<div class="aw-static-hero" id="aw-static-hero">
<div class="aw-hero-slides">
<div class="aw-hero-slide active" style="background-image:url(/assets/wp-content/uploads/2024/11/slider1.jpg)">
<div class="aw-hero-overlay"></div>
<div class="aw-hero-content">
<span class="aw-hero-tag">Passion for healing</span>
<h1 class="aw-hero-title">Superior Wound Care Management &amp; Treatment</h1>
<a href="/contact-us/" class="aw-hero-btn">Contact Us <span aria-hidden="true">+</span></a>
<p class="aw-hero-desc">AmeriWound affiliated physicians are highly trained wound care providers who assess, diagnose, treat, monitor and heal patient wounds.</p>
</div></div>
<div class="aw-hero-slide" style="background-image:url(/assets/wp-content/uploads/2024/11/slider2.jpg)">
<div class="aw-hero-overlay"></div>
<div class="aw-hero-content">
<span class="aw-hero-tag">highest level of care</span>
<h1 class="aw-hero-title">Compassionate &amp; Motivated Physicians</h1>
<a href="/about-ameriwound/" class="aw-hero-btn">Learn more <span aria-hidden="true">+</span></a>
<p class="aw-hero-desc">AmeriWound's physicians, nurse practitioners, and physician assistants coordinate with your facility's need to respond timely to wound care issues.</p>
</div></div>
<button class="aw-hero-nav aw-hero-prev" aria-label="Previous slide">&#8249;</button>
<button class="aw-hero-nav aw-hero-next" aria-label="Next slide">&#8250;</button>
<div class="aw-hero-dots"><button class="aw-hero-dot active" aria-label="Slide 1"></button><button class="aw-hero-dot" aria-label="Slide 2"></button></div>
</div></div>`;

const STATIC_HERO_SCRIPT = `<script id="aw-static-hero-js">
(function(){var i=0,s=document.querySelectorAll('.aw-hero-slide'),d=document.querySelectorAll('.aw-hero-dot'),p=document.querySelector('.aw-hero-prev'),n=document.querySelector('.aw-hero-next');if(!s.length)return;function go(x){i=(x+s.length)%s.length;for(var j=0;j<s.length;j++){s[j].classList.toggle('active',j===i);if(d[j])d[j].classList.toggle('active',j===i)}}if(p)p.onclick=function(){go(i-1)};if(n)n.onclick=function(){go(i+1)};for(var k=0;k<d.length;k++)(function(x){d[x].onclick=function(){go(x)}})(k);setInterval(function(){go(i+1)},6500)})();
</script>`;

/** @param {string} html */
function rewriteWpContent(html) {
  let out = html.replace(WP_CONTENT_RE, "/assets$1");
  out = out.replace(WP_CONTENT_JSON_ESCAPED_RE, "/assets/wp-content/");
  return out;
}

/** @param {string} html */
function rewriteExternalScripts(html) {
  return html
    .replace(
      /<script[^>]*src=["']https?:\/\/(?:www\.)?ameriwound\.com\/wp-includes\/js\/jquery\/jquery\.min\.js[^"']*["'][^>]*><\/script>/gi,
      `<script src="${JQUERY_CDN}" crossorigin="anonymous"></script>`
    )
    .replace(
      /<script[^>]*src=["']https?:\/\/(?:www\.)?ameriwound\.com\/wp-includes\/js\/jquery\/jquery-migrate\.min\.js[^"']*["'][^>]*><\/script>/gi,
      `<script src="${JQUERY_MIGRATE_CDN}" crossorigin="anonymous"></script>`
    )
    .replace(
      /<script[^>]*src=["']https?:\/\/(?:www\.)?ameriwound\.com\/wp-includes\/js\/jquery\/ui\/core\.min\.js[^"']*["'][^>]*><\/script>/gi,
      ""
    );
}

/** @param {string} html */
function fixSliderLazyImages(html) {
  return html.replace(
    /<img([^>]*)\bdata-src=(["'])(\/assets\/wp-content\/[^"']+)\2([^>]*)>/gi,
    (match, before, quote, src, after) => {
      if (/\bsrc=/.test(before + after)) return match;
      return `<img${before}src=${quote}${src}${quote} data-src=${quote}${src}${quote}${after}>`;
    }
  );
}

/** @param {string} html */
function normalizeEscapedAssetPaths(html) {
  return html.replace(
    /\/assets\/wp-content\/uploads\\\/[^"']+/g,
    (match) => match.replace(/\\\//g, "/")
  );
}

/** @param {string} html */
function removeLegacyHeroFallback(html) {
  return html
    .replace(/<style id="aw-hero-fallback">[\s\S]*?<\/style>\s*/gi, "")
    .replace("<style id=\"aw-static-hero\">", "<style id=\"aw-static-hero-css\">");
}

/** @param {string} html */
function injectHeroFallback(html) {
  if (!html.includes('id="SR7_15_1"') || html.includes('<div class="aw-static-hero"')) {
    return html;
  }
  let out = html.replace(/<head[^>]*>/i, (m) => m + "\n" + STATIC_HERO_STYLE);
  out = out.replace(
    /<div class="wp-block-themepunch-revslider">[\s\S]*?<\/div>\s*(?=<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="elementor-section)/,
    STATIC_HERO_HTML + "\n"
  );
  out = out.replace(/<\/body>/i, STATIC_HERO_SCRIPT + "\n</body>");
  return out;
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
  out = normalizeEscapedAssetPaths(out);
  out = rewriteInternalLinks(out);
  out = rewriteExternalScripts(out);
  out = fixSliderLazyImages(out);
  out = removeLegacyHeroFallback(out);
  out = injectHeroFallback(out);
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
