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
@font-face{font-family:revicons;src:url(/assets/hero/revicons.woff) format("woff");font-weight:400;font-style:normal;font-display:swap}
.aw-static-hero{position:relative;width:100%;overflow:hidden;background:#e8eef3}
.aw-hero-slides{position:relative;width:100%;height:350px}
@media(min-width:778px){.aw-hero-slides{height:500px}}
@media(min-width:1024px){.aw-hero-slides{height:650px}}
@media(min-width:1240px){.aw-hero-slides{height:830px}}
.aw-hero-slide{position:absolute;inset:0;opacity:0;transition:opacity .8s cubic-bezier(.645,.045,.355,1);overflow:hidden;pointer-events:none}
.aw-hero-slide.active{opacity:1;z-index:1;pointer-events:auto}
.aw-hero-bg{position:absolute;inset:0;background:center/cover no-repeat;transform:scale(1.05);z-index:0}
.aw-hero-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.82) 0%,rgba(255,255,255,.55) 45%,rgba(255,255,255,.1) 100%);z-index:2}
.aw-hero-content{position:relative;z-index:3;display:flex;flex-direction:column;justify-content:center;height:100%;max-width:1300px;margin:0 auto;padding:2rem 2.5rem;box-sizing:border-box}
.aw-hero-tag{display:inline-block;font-family:Quicksand,Montserrat,sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;color:#990066;letter-spacing:.04em;margin-bottom:.75rem;position:relative;padding-bottom:.35rem;opacity:0;transform:translateX(17px)}
.aw-hero-tag::after{content:"";position:absolute;left:0;bottom:0;width:174px;height:30px;background:rgba(153,0,102,.12);border-radius:3px;opacity:0;transform:translateX(17px)}
.aw-hero-title{font-family:Quicksand,Montserrat,sans-serif;font-size:clamp(22px,5vw,64px);font-weight:600;line-height:1.12;color:#003366;text-transform:capitalize;margin:0 0 1.25rem;max-width:820px;opacity:0;transform:translateX(17px)}
.aw-hero-desc{font-family:Montserrat,sans-serif;font-size:16px;line-height:2;color:#888;max-width:654px;margin:1.25rem 0 0;opacity:0;transform:translateX(13px)}
.aw-hero-btn{display:inline-flex;align-items:center;gap:.5rem;width:fit-content;padding:15px 30px;background:#cc3;border-radius:3px;color:#fff!important;font-family:Quicksand,sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;text-decoration:none!important;transition:background .2s;opacity:0;transform:translateX(17px)}
.aw-hero-btn:hover{background:#036}
@media(min-width:778px){.aw-hero-tag,.aw-hero-tag::after,.aw-hero-title,.aw-hero-btn{transform:translateX(29px)}.aw-hero-desc{transform:translateX(22px)}}
@media(min-width:1240px){.aw-hero-tag,.aw-hero-tag::after,.aw-hero-title,.aw-hero-btn{transform:translateX(50px)}.aw-hero-desc{transform:translateX(50px)}}
@keyframes aw-hero-in{from{opacity:0;transform:translateX(var(--aw-hero-x,50px))}to{opacity:1;transform:translateX(0)}}
.aw-hero-slide.active.aw-hero-playing .aw-hero-tag{--aw-hero-x:17px;animation:aw-hero-in 1s cubic-bezier(.645,.045,.355,1) .3s forwards}
.aw-hero-slide.active.aw-hero-playing .aw-hero-tag::after{--aw-hero-x:17px;animation:aw-hero-in 1s cubic-bezier(.645,.045,.355,1) .3s forwards}
.aw-hero-slide.active.aw-hero-playing .aw-hero-title{--aw-hero-x:17px;animation:aw-hero-in 1s cubic-bezier(.645,.045,.355,1) .5s forwards}
.aw-hero-slide.active.aw-hero-playing .aw-hero-desc{--aw-hero-x:13px;animation:aw-hero-in 1s cubic-bezier(.645,.045,.355,1) .7s forwards}
.aw-hero-slide.active.aw-hero-playing .aw-hero-btn{--aw-hero-x:17px;animation:aw-hero-in 1s cubic-bezier(.645,.045,.355,1) .89s forwards}
@media(min-width:778px){
.aw-hero-slide.active.aw-hero-playing .aw-hero-tag,.aw-hero-slide.active.aw-hero-playing .aw-hero-tag::after,.aw-hero-slide.active.aw-hero-playing .aw-hero-title,.aw-hero-slide.active.aw-hero-playing .aw-hero-btn{--aw-hero-x:29px}
.aw-hero-slide.active.aw-hero-playing .aw-hero-desc{--aw-hero-x:22px}
}
@media(min-width:1240px){
.aw-hero-slide.active.aw-hero-playing .aw-hero-tag,.aw-hero-slide.active.aw-hero-playing .aw-hero-tag::after,.aw-hero-slide.active.aw-hero-playing .aw-hero-title,.aw-hero-slide.active.aw-hero-playing .aw-hero-btn,.aw-hero-slide.active.aw-hero-playing .aw-hero-desc{--aw-hero-x:50px}
}
@media(prefers-reduced-motion:reduce){
.aw-hero-tag,.aw-hero-tag::after,.aw-hero-title,.aw-hero-desc,.aw-hero-btn{opacity:1!important;transform:none!important;animation:none!important}
}
.aw-hero-slide:not(.active) .aw-hero-tag,.aw-hero-slide:not(.active) .aw-hero-tag::after,.aw-hero-slide:not(.active) .aw-hero-title,.aw-hero-slide:not(.active) .aw-hero-desc,.aw-hero-slide:not(.active) .aw-hero-btn{opacity:0!important;animation:none!important}
.aw-static-hero .aw-hero-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:70px;height:70px;min-width:70px;min-height:70px;padding:0;margin:0;border:none!important;border-radius:50%;overflow:hidden;background:rgba(0,0,0,.1)!important;color:transparent!important;cursor:pointer;display:none;box-shadow:none!important;font:inherit;text-transform:none!important;letter-spacing:normal!important;appearance:none;-webkit-appearance:none}
.aw-static-hero .aw-hero-nav::before{font-family:revicons!important;font-size:20px!important;color:#fff!important;display:block;line-height:70px;text-align:center;width:70px;height:70px;position:relative;z-index:2}
.aw-static-hero .aw-hero-prev{left:0}
.aw-static-hero .aw-hero-prev::before{content:"\\e824"}
.aw-static-hero .aw-hero-next{right:0}
.aw-static-hero .aw-hero-next::before{content:"\\e825"}
.aw-static-hero .aw-hero-nav:hover{background:rgba(0,0,0,.25)!important}
@media(min-width:1240px){.aw-static-hero .aw-hero-nav{display:block}}
.aw-hero-dots{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:4;display:none;gap:5px}
@media(min-width:778px){.aw-hero-dots{display:flex}}
.aw-hero-dot{width:12px;height:12px;border-radius:50%;border:0;background:#14457b;opacity:.5;cursor:pointer;padding:0;box-sizing:content-box}
.aw-hero-dot.active{opacity:1;background:#2490eb}
.wp-block-themepunch-revslider{display:none!important}
</style>`;

const SITE_FIXES_STYLE = `<style id="aw-site-fixes-css">
/* Header — reduce excess top spacing above nav */
.elementor-location-header .elementor-element-088c329 {
  display: none !important;
  min-height: 0 !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.elementor-location-header .elementor-element-9e34fa0,
.elementor-location-header .elementor-element-17df919,
.elementor-location-header .elementor-element-f0a42c3,
.elementor-location-header .elementor-element-eb418f0,
.elementor-location-header .elementor-element-6f03d4e,
.elementor-location-header .elementor-element-49bdf44 {
  padding-top: 4px !important;
}

/* Home careers section — keep copy off the viewport edge */
.elementor-element-2c66bffa > .elementor-container {
  max-width: 1300px;
  margin-left: auto;
  margin-right: auto;
  padding-left: clamp(1.25rem, 4vw, 2.5rem);
  padding-right: clamp(1.25rem, 4vw, 2.5rem);
  box-sizing: border-box;
}
</style>`;

const STATIC_HERO_HTML = `<div class="aw-static-hero" id="aw-static-hero">
<div class="aw-hero-slides">
<div class="aw-hero-slide active">
<div class="aw-hero-bg" style="background-image:url(/assets/wp-content/uploads/2024/11/slider1.jpg)"></div>
<div class="aw-hero-overlay"></div>
<div class="aw-hero-content">
<span class="aw-hero-tag">Passion for healing</span>
<h1 class="aw-hero-title">Superior Wound Care Management &amp; Treatment</h1>
<a href="/contact-us/" class="aw-hero-btn">Contact Us <i class="ion ion-plus-round"></i></a>
<p class="aw-hero-desc">AmeriWound affiliated physicians are highly trained wound care providers who assess, diagnose, treat, monitor and heal patient wounds.</p>
</div></div>
<div class="aw-hero-slide">
<div class="aw-hero-bg" style="background-image:url(/assets/wp-content/uploads/2024/11/slider2.jpg)"></div>
<div class="aw-hero-overlay"></div>
<div class="aw-hero-content">
<span class="aw-hero-tag">highest level of care</span>
<h1 class="aw-hero-title">Compassionate &amp; Motivated Physicians</h1>
<a href="/about-ameriwound/" class="aw-hero-btn">Learn more <i class="ion ion-plus-round"></i></a>
<p class="aw-hero-desc">AmeriWound's physicians, nurse practitioners, and physician assistants coordinate with your facility's need to respond timely to wound care issues.</p>
</div></div>
<button type="button" class="aw-hero-nav aw-hero-prev" aria-label="Previous slide"></button>
<button type="button" class="aw-hero-nav aw-hero-next" aria-label="Next slide"></button>
<div class="aw-hero-dots"><button class="aw-hero-dot active" aria-label="Slide 1"></button><button class="aw-hero-dot" aria-label="Slide 2"></button></div>
</div></div>`;

const STATIC_HERO_SCRIPT = `<script id="aw-static-hero-js">
(function(){var i=0,timer,slides=document.querySelectorAll('.aw-hero-slide'),dots=document.querySelectorAll('.aw-hero-dot'),prev=document.querySelector('.aw-hero-prev'),next=document.querySelector('.aw-hero-next');if(!slides.length)return;function play(slide){if(!slide)return;slide.classList.remove('aw-hero-playing');requestAnimationFrame(function(){slide.classList.add('aw-hero-playing')})}function go(x){var prevSlide=slides[i];if(prevSlide)prevSlide.classList.remove('aw-hero-playing','active');i=(x+slides.length)%slides.length;for(var j=0;j<slides.length;j++){slides[j].classList.toggle('active',j===i);if(dots[j])dots[j].classList.toggle('active',j===i)}play(slides[i]);resetAuto()}function resetAuto(){clearInterval(timer);timer=setInterval(function(){go(i+1)},6500)}if(prev)prev.onclick=function(){go(i-1)};if(next)next.onclick=function(){go(i+1)};for(var k=0;k<dots.length;k++)(function(x){dots[x].onclick=function(){go(x)}})(k);play(slides[i]);resetAuto()})();
</script>`;

const NAV_MENU_FIX_SCRIPT = `<script id="aw-nav-menu-fix">
(function(){function initNavMenus(){if(typeof elementorFrontend==='undefined'||typeof jQuery==='undefined'||!jQuery.fn.smartmenus)return;document.querySelectorAll('.elementor-widget-nav-menu').forEach(function(el){try{elementorFrontend.elementsHandler.runReadyTrigger(el);}catch(e){}});}window.addEventListener('load',initNavMenus);if(typeof jQuery!=='undefined')jQuery(window).on('elementor/frontend/init',initNavMenus);})();
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
function upsertStaticHeroStyle(html) {
  const without = html.replace(/<style id="aw-static-hero(?:-css)?">[\s\S]*?<\/style>\s*/i, "");
  return without.replace(/<\/head>/i, STATIC_HERO_STYLE + "\n</head>");
}

/** @param {string} html */
function refreshStaticHero(html) {
  if (!html.includes('<div class="aw-static-hero"')) return html;
  let out = upsertStaticHeroStyle(html);
  out = out.replace(
    /<div class="aw-static-hero" id="aw-static-hero">[\s\S]*?<div class="aw-hero-dots">[\s\S]*?<\/button><\/div>\s*<\/div>\s*<\/div>/,
    STATIC_HERO_HTML.trim()
  );
  out = out.replace(/<script id="aw-static-hero-js">[\s\S]*?<\/script>/, STATIC_HERO_SCRIPT);
  return out;
}

/** @param {string} html */
function injectHeroFallback(html) {
  if (!html.includes('id="SR7_15_1"') || html.includes('<div class="aw-static-hero"')) {
    return html;
  }
  let out = upsertStaticHeroStyle(html);
  out = out.replace(
    /<div class="wp-block-themepunch-revslider">[\s\S]*?<\/div>\s*(?=<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="elementor-section)/,
    STATIC_HERO_HTML + "\n"
  );
  out = out.replace(/<\/body>/i, STATIC_HERO_SCRIPT + "\n</body>");
  return out;
}

/** @param {string} html */
function rewriteInternalLinks(html) {
  const bareDomainRe = new RegExp(
    `https?:\\/\\/(?:${SITE_HOSTS.join("|")})(?=["'\\s>])`,
    "gi"
  );
  let out = html.replace(bareDomainRe, "/");

  out = out.replace(INTERNAL_LINK_RE, (match, pathname) => {
    if (pathname.startsWith("/wp-content/")) return `/assets${pathname}`;
    if (pathname.startsWith("/wp-json/")) return match;
    if (pathname.startsWith("/wp-includes/")) return match;
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  });

  return out;
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
function injectSiteFixes(html) {
  if (html.includes('id="aw-site-fixes-css"')) {
    return html.replace(/<style id="aw-site-fixes-css">[\s\S]*?<\/style>\s*/i, SITE_FIXES_STYLE + "\n");
  }
  return html.replace(/<\/head>/i, SITE_FIXES_STYLE + "\n</head>");
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
  out = refreshStaticHero(out);
  out = injectAiMenuItem(out);
  out = injectSiteFixes(out);
  out = removeCloudflareArtifacts(out);
  if (!out.includes("aw-nav-menu-fix")) {
    out = out.replace(/<\/body>/i, NAV_MENU_FIX_SCRIPT + "\n</body>");
  }
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
