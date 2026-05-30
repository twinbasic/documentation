// Phase 4 TEMPLATE: wrap each page's renderedContent in the just-the-docs
// layout chrome. Direct string concatenation replaces Liquid; HTML
// compression replaces vendor/compress.html. See builder/PLAN-4.md.
//
// Inputs: each page's Phase 1/2/3 fields (frontmatter, permalink, srcRel,
// renderedContent, navPath, breadcrumbs, children, navLevels, seoTitle,
// seoFullTitle, seoCanonical, seoIsHome) plus site.{config, navTree,
// seoSiteTitle, seoLogoUrl}. Mutates each page in place, adding page.html
// (a complete HTML document) -- except book.html, which Phase 8 handles
// directly from page.renderedContent.
//
// Ports the project shadows under docs/_includes (head, head_seo, head_custom,
// title, components/{breadcrumbs,children_nav,footer,site_nav,nav/links},
// footer_custom) plus the upstream just-the-docs theme's components/{sidebar,
// header,aux_nav,search_header,search_footer}, _includes/icons/*, and the
// _layouts/default.html outer wrap. Activation CSS ports
// _includes/css/activation.scss.liquid.

import { compressHtml } from "./compress.mjs";

export async function templatePhase(pages, site, initData) {
  if (site.config.just_the_docs?.collections) {
    throw new Error(
      "site.config.just_the_docs.collections is set; Phase 4 (and Phase 2) "
      + "do not support collections. Update _config.yml or extend the port.",
    );
  }

  const init = initData ?? buildInit(site);

  await Promise.all(pages.map(async (page) => {
    if (page.frontmatter.layout === "book-combined") return;
    page.html = templatePage(page, site, init);
  }));
}

// One-time per-build constants: pre-rendered SVG sprite, sidebar HTML,
// header static parts, aux-nav, search-footer, mermaid script, favicon
// link, GA snippet. Per §4 init order.
// Exported as buildInitFn for the scheduler's main-thread buildInit task.
export { buildInit as buildInitFn };
function buildInit(site) {
  return {
    svgSprites: buildSvgSprites(site.config),
    sidebar: renderSidebar(site),
    header: renderHeader(site),
    searchFooter: renderSearchFooter(site),
    mermaidScript: renderMermaidScript(site),
    faviconLink: buildFaviconLink(site.config),
    gaSnippet: buildGaSnippet(site.config),
    searchEnabled: site.config.search_enabled !== false,
  };
}

// ---------- §5.1 templatePage --------------------------------------------

function templatePage(page, site, init) {
  const supportedLayouts = new Set(["default", "home", "page", undefined, null]);
  const layout = page.frontmatter.layout;
  if (!supportedLayouts.has(layout) && layout !== "book-combined") {
    throw new Error(`Unsupported layout "${layout}" on ${page.srcRel}`);
  }

  const lang = site.config.lang ?? "en-US";
  const baseurl = String(site.config.baseurl ?? "");

  // Compose. The literal newlines + indentation are for source clarity;
  // compress collapses them to single spaces. The body assembly mirrors
  // _layouts/default.html: skip-to-main link, icon sprite, sidebar,
  // <div class="main">, header, breadcrumbs, <main> wrapping body +
  // children-nav, footer, then per-page-search-footer, then mermaid.
  const html =
    `<!DOCTYPE html>\n` +
    `<html lang="${escAttr(lang)}">\n` +
    renderHead(page, site, init) +
    `<body>\n` +
    `  <a class="skip-to-main" href="#main-content">Skip to main content</a>\n` +
    init.svgSprites + `\n` +
    init.sidebar + `\n` +
    `  <div class="main" id="page-top">\n` +
    init.header + `\n` +
    `    <div class="main-content-wrap">\n` +
    renderBreadcrumbs(page, baseurl) +
    `      <div id="main-content" class="main-content">\n` +
    `        <main>\n` +
    injectAnchorHeadings(page.renderedContent) +
    renderChildrenNav(page, baseurl) +
    `        </main>\n` +
    renderFooter(page, site) +
    `      </div>\n` +
    `    </div>\n` +
    (init.searchEnabled ? init.searchFooter + `\n` : "") +
    `  </div>\n` +
    (init.mermaidScript ? init.mermaidScript + `\n` : "") +
    `</body>\n` +
    `</html>\n`;

  return compressHtml(html);
}

// ---------- §5.2 renderHead ----------------------------------------------

function renderHead(page, site, init) {
  // Order matches docs/_includes/head.html: charset, X-UA, dark-mode
  // early script, theme-switch.js (deferred), CSS combined, CSS head-
  // nav, activation <style>, GA snippet, lunr.min.js (when search on),
  // just-the-docs.js, viewport, head_seo, head_custom (favicon link).
  // The favicon AFTER head_seo is intentional (D2 of PLAN-4).
  // The `<meta IE=Edge>` is directly followed by `<script>` (no
  // whitespace) because head.html has `{%- comment -%}...{%- endcomment -%}`
  // between them that strips surrounding whitespace.
  const bu = String(site.config.baseurl ?? "");
  return `<head>\n` +
    `  <meta charset="UTF-8">\n` +
    `  <meta http-equiv="X-UA-Compatible" content="IE=Edge"><script>\n` +
    `    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark-mode');\n` +
    `  </script>\n` +
    `  <script type="text/javascript" src="${escAttr(relativeUrl("/assets/js/theme-switch.js", bu))}" defer></script>\n` +
    `  <link rel="stylesheet" href="${escAttr(relativeUrl("/assets/css/just-the-docs-combined.css", bu))}">\n` +
    `  <link rel="stylesheet" href="${escAttr(relativeUrl("/assets/css/tb-highlight.css", bu))}">\n` +
    `  <link rel="stylesheet" href="${escAttr(relativeUrl("/assets/css/just-the-docs-head-nav.css", bu))}" id="jtd-head-nav-stylesheet">\n` +
    `  <style id="jtd-nav-activation">\n` +
    navActivationCss(page) +
    `\n  </style>\n` +
    (init.gaSnippet ? init.gaSnippet + `\n` : "") +
    (init.searchEnabled ? `  <script src="${escAttr(relativeUrl("/assets/js/vendor/lunr.min.js", bu))}"></script>\n` : "") +
    (bu ? `  <script>window.jtdBaseurl=${JSON.stringify(bu)};</script>\n` : "") +
    `  <script src="${escAttr(relativeUrl("/assets/js/just-the-docs.js", bu))}"></script>\n` +
    `  <meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    headSeoBlock(page, site) +
    init.faviconLink +
    `</head>\n`;
}

// Port of docs/_includes/head_seo.html. Verbatim byte parity with
// jekyll-seo-tag v2.8.0 for this site's configuration.
//
// `seoTitle` / `seoFullTitle` / `seoSiteTitle` are already HTML-
// escaped by Phase 2's seo.mjs (`escape_once` pipeline output), so
// they go in verbatim. Escaping again would double-encode `&` to
// `&amp;amp;` on titles like `&, &=`.
function headSeoBlock(page, site) {
  return `<!-- Begin Jekyll SEO tag v2.8.0 -->\n` +
    `<title>${page.seoFullTitle ?? ""}</title>\n` +
    `<meta name="generator" content="Jekyll v4.4.1" />\n` +
    `<meta property="og:title" content="${page.seoTitle ?? ""}" />\n` +
    `<meta property="og:locale" content="en_US" />\n` +
    `<link rel="canonical" href="${escAttr(page.seoCanonical ?? "")}" />\n` +
    `<meta property="og:url" content="${escAttr(page.seoCanonical ?? "")}" />\n` +
    `<meta property="og:site_name" content="${site.seoSiteTitle ?? ""}" />\n` +
    `<meta property="og:type" content="website" />\n` +
    `<meta name="twitter:card" content="summary" />\n` +
    `<meta property="twitter:title" content="${page.seoTitle ?? ""}" />\n` +
    `<script type="application/ld+json">\n` +
    jsonLd(page, site) +
    `</script>\n` +
    `<!-- End Jekyll SEO tag -->\n`;
}

// JSON.stringify matches Liquid's `| jsonify` -- compact, no extra
// whitespace, double-quoted keys. Two variants: WebSite for the
// homepage / about pages, WebPage for everything else.
function jsonLd(page, site) {
  if (page.seoIsHome) {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      headline: page.seoTitle,
      name: site.seoSiteTitle,
      publisher: {
        "@type": "Organization",
        logo: { "@type": "ImageObject", url: site.seoLogoUrl },
      },
      url: page.seoCanonical,
    });
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    headline: page.seoTitle,
    publisher: {
      "@type": "Organization",
      logo: { "@type": "ImageObject", url: site.seoLogoUrl },
    },
    url: page.seoCanonical,
  });
}

// Port of docs/_includes/head_custom.html. The rendered output has the
// trailing space-before-`>` artifact from the Liquid source's
// multi-line `<link ... href="..." >` shape (compress collapses the
// internal whitespace to a single space).
function buildFaviconLink(config) {
  const bu = String(config.baseurl ?? "");
  return `<link rel="shortcut icon" type="image/png" href="${relativeUrl("/favicon.png", bu)}" >\n`;
}

// Currently unset in _config.yml; emits empty string. When set, mirror
// the head.html template's gtag.js loader pattern.
function buildGaSnippet(config) {
  if (!config.ga_tracking) return "";
  const ids = String(config.ga_tracking).split(",");
  const primary = ids[0];
  const configCalls = ids
    .map(id =>
      `      gtag('config', '${id}'${config.ga_tracking_anonymize_ip != null ? ", { 'anonymize_ip': true }" : ""});\n`,
    )
    .join("");
  return `    <script async src="https://www.googletagmanager.com/gtag/js?id=${primary}"></script>\n` +
    `    <script>\n` +
    `      window.dataLayer = window.dataLayer || [];\n` +
    `      function gtag(){dataLayer.push(arguments);}\n` +
    `      gtag('js', new Date());\n` +
    configCalls +
    `    </script>`;
}

// ---------- §5.3 SVG icon sprite -----------------------------------------

const SVG_SYMBOL_LINK = `<symbol id="svg-link" viewBox="0 0 24 24">
  <title>Link</title>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-link">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
</symbol>`;

const SVG_SYMBOL_MENU = `<symbol id="svg-menu" viewBox="0 0 24 24">
  <title>Menu</title>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-menu">
    <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
</symbol>`;

const SVG_SYMBOL_EXPAND = `<symbol id="svg-arrow-right" viewBox="0 0 24 24">
  <title>Expand</title>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
</symbol>
<!-- Feather. MIT License: https://github.com/feathericons/feather/blob/master/LICENSE -->
<symbol id="svg-external-link" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-external-link">
  <title id="svg-external-link-title">(external link)</title>
  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>
</symbol>`;

const SVG_SYMBOL_DOC = `<symbol id="svg-doc" viewBox="0 0 24 24">
  <title>Document</title>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>
  </svg>
</symbol>
<symbol id="svg-search" viewBox="0 0 24 24">
  <title>Search</title>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-search">
    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
</symbol>`;

const SVG_SYMBOLS_COPY = `<!-- Bootstrap Icons. MIT License: https://github.com/twbs/icons/blob/main/LICENSE.md -->
<symbol id="svg-copy" viewBox="0 0 16 16">
  <title>Copy</title>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
  </svg>
</symbol>
<symbol id="svg-copied" viewBox="0 0 16 16">
  <title>Copied</title>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard-check-fill" viewBox="0 0 16 16">
    <path d="M6.5 0A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3Zm3 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3Z"/>
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1A2.5 2.5 0 0 1 9.5 5h-3A2.5 2.5 0 0 1 4 2.5v-1Zm6.854 7.354-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708.708Z"/>
  </svg>
</symbol>`;

// Port of theme's _includes/icons/icons.html. The search icon is
// conditional; the copy-code icons ship unconditionally.
function buildSvgSprites(config) {
  const searchEnabled = config.search_enabled !== false;
  const parts = [
    `  <svg xmlns="http://www.w3.org/2000/svg" class="d-none">`,
    SVG_SYMBOL_LINK,
    SVG_SYMBOL_MENU,
    SVG_SYMBOL_EXPAND,
  ];
  if (searchEnabled) parts.push(SVG_SYMBOL_DOC);
  parts.push(SVG_SYMBOLS_COPY);
  parts.push(`</svg>`);
  return parts.join("\n");
}

// ---------- §5.4 sidebar + recursive nav ---------------------------------

function renderSidebar(site) {
  const config = site.config;
  const baseurl = String(config.baseurl ?? "");
  return `  <div class="side-bar">\n` +
    `    <div class="site-header" role="banner">\n` +
    `      <a href="${escAttr(relativeUrl("/", baseurl))}" class="site-title lh-tight">${renderSiteTitle(config)}</a>\n` +
    `      <button id="menu-button" class="site-button btn-reset" aria-label="Toggle menu" aria-pressed="false">\n` +
    `        <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><use xlink:href="#svg-menu"></use></svg>\n` +
    `      </button>\n` +
    `    </div>\n` +
    `    <nav aria-label="Main" id="site-nav" class="site-nav">` +
    renderNavTree(site.navTree, [], baseurl) +
    renderNavExternalLinks(config) +
    `</nav>\n` +
    // Upstream sidebar.html: when nav_footer_custom.html is empty
    // (it is on this site), the else-branch emits the "Just the Docs"
    // fallback footer. The site doesn't override nav_footer_custom.html,
    // so the upstream default applies verbatim.
    `    <footer class="site-footer">\n` +
    `      This site uses <a href="https://github.com/just-the-docs/just-the-docs">Just the Docs</a>, a documentation theme originally for Jekyll.\n` +
    `    </footer>\n` +
    `  </div>`;
}

// Port of docs/_includes/title.html: when site.logo is set, the title
// renders as a logo div; with logo_with_title also set, append the
// title text after the logo. Leading space matches the source-side
// whitespace between `<a class="site-title">` and the include body
// (compress collapses to one space).
function renderSiteTitle(config) {
  const title = String(config.title ?? "");
  if (config.logo) {
    let out = ` <div class="site-logo" role="img" aria-label="${escAttr(title)}"></div>`;
    if (config.logo_with_title) {
      // The Liquid source has `{{ site.title }}` on its own indented
      // line; compress collapses surrounding whitespace to single spaces.
      out += ` ${title} `;
    }
    return out;
  }
  return ` ${title} `;
}

// Port of docs/_includes/components/nav/links.html. Cycle defence by
// title matches the upstream visual: a page that shares a title with
// one of its ancestors renders as an infinity link without recursion.
//
// Liquid `{{ node.title }}` does NOT HTML-escape -- titles with `&` /
// `<` / `>` (the operator pages: `&, &=`, `<<, <<=`, `>>, >>=`) render
// literal in Jekyll. Mirror that here so byte parity holds.
//
// A trailing `\n` after the recursive call's `</ul>` comes from the
// included file's trailing newline (survives Liquid trim semantics --
// see test in PLAN-4 §5.4 notes). Compress collapses to one space,
// producing `</ul> </li>` rather than `</ul></li>`.
function renderNavTree(nodes, ancestorTitles, baseurl) {
  if (!nodes || nodes.length === 0) return `<ul class="nav-list"></ul>\n`;
  let out = `<ul class="nav-list">`;
  for (const node of nodes) {
    out += `<li class="nav-list-item">`;
    if (ancestorTitles.includes(node.title)) {
      out += `<a href="${escAttr(relativeUrl(node.url, baseurl))}" class="nav-list-link"> &#8734; </a>`;
    } else {
      const hasChildren = node.children && node.children.length > 0;
      if (hasChildren) {
        // The upstream emits the button + svg across multiple source
        // lines; compress collapses to single spaces.
        out += `<button class="nav-list-expander btn-reset" aria-label="toggle items in ${escAttr(String(node.title))} category" aria-pressed="false"> ` +
          `<svg viewBox="0 0 24 24" aria-hidden="true"><use xlink:href="#svg-arrow-right"></use></svg>` +
          ` </button>`;
      }
      out += `<a href="${escAttr(relativeUrl(node.url, baseurl))}" class="nav-list-link">${String(node.title)}</a>`;
      if (hasChildren) {
        out += renderNavTree(node.children, [...ancestorTitles, node.title], baseurl);
      }
    }
    out += `</li>`;
  }
  out += `</ul>\n`;
  return out;
}

// Port of the site_nav.html shadow's nav_external_links branch.
function renderNavExternalLinks(config) {
  const list = config.nav_external_links;
  if (!list || list.length === 0) return "";
  const items = list.map(node => {
    const opensNewTab = node.opens_in_new_tab === true
      || (node.opens_in_new_tab == null && config.nav_external_links_new_tab);
    // The Liquid source has a multi-line `<a ... class="..." {% if ...
    // %}target="..." rel="..."{% endif %}>` shape; with target absent,
    // compress collapses the whitespace inside the open tag to a single
    // space, leaving `class="nav-list-link external" >` (note the
    // trailing space before `>`). Mirror the exact byte form.
    const targetAttrs = opensNewTab ? `target="_blank" rel="noopener noreferrer" ` : ``;
    const url = absoluteUrl(node.url, config);
    const svg = node.hide_icon ? ""
      : ` <svg viewBox="0 0 24 24" aria-labelledby="svg-external-link-title"><use xlink:href="#svg-external-link"></use></svg>`;
    return `<li class="nav-list-item external"> ` +
      `<a href="${escAttr(url)}" class="nav-list-link external" ${targetAttrs}>` +
      ` ${escText(String(node.title))}${svg} ` +
      `</a> ` +
      `</li>`;
  }).join("");
  // No trailing whitespace: the Liquid source's `{%- endif -%}</nav>`
  // strips between the closing `</ul>` and the outer `</nav>`.
  return `<ul class="nav-list">${items}</ul>`;
}

// ---------- §5.5 navActivationCss ----------------------------------------

const COLLECTION_PREFIX = ".site-nav > ul.nav-list:first-child";
const OTHER_COLLECTION_PREFIX = ".site-nav > ul.nav-list:not(:first-child)";

export function navActivationCss(page) {
  const levels = page.navLevels;
  if (!levels) {
    // Fallback for pages not in the nav (no title, nav_exclude, or
    // unresolved parent chain). Matches _site/404.html exactly.
    return `    .site-nav ul li a {\n      background-image: none;\n    }`;
  }

  // levels[0] = 1 (collection-prefix, always 1 on this site).
  // levels[1..depth] = 1-based child positions for each ancestor + leaf.
  // depth = navLevels.length - 1.
  const depth = levels.length - 1;
  const active = levels[depth];

  // ---- Rule 1: background-image: none for non-active links ----
  // Verbatim port of activation.scss.liquid lines 65-77.
  //
  // Three parts:
  //   (a) ancestor selectors (only when depth >= 2):
  //       prefix > li > a,
  //       prefix > li > ul > li > a,
  //       ... up to (depth - 1) levels deep.
  //   (b) current page's siblings (li at depth, excluding the active one):
  //       prefix > (li > ul > ){depth-1 times} li:not(:nth-child(N)) > a
  //   (c) current page's descendants:
  //       prefix > (li > ul > ){depth times} li a
  const noBg = [];
  if (depth >= 2) {
    for (let i = 1; i <= depth - 1; i++) {
      let s = COLLECTION_PREFIX + " >";
      for (let j = 2; j <= i; j++) s += ` li > ul >`;
      s += ` li > a`;
      noBg.push(s);
    }
  }
  {
    let s = COLLECTION_PREFIX + " >";
    for (let i = 1; i <= depth - 1; i++) s += ` li > ul >`;
    s += ` li:not(:nth-child(${active})) > a`;
    noBg.push(s);
  }
  {
    let s = COLLECTION_PREFIX + " >";
    for (let i = 1; i <= depth; i++) s += ` li > ul >`;
    s += ` li a`;
    noBg.push(s);
  }

  let css =
    `    ${noBg.join(",\n    ")} {\n` +
    `      background-image: none;\n` +
    `    }\n\n`;

  // ---- Rule 2: trailer for other collections + externals (constant) ----
  css +=
    `    .site-nav > ul.nav-list:not(:first-child) a,\n` +
    `    .site-nav li.external a {\n` +
    `      background-image: none;\n` +
    `    }\n\n`;

  // ---- Rule 3: bolding the active leaf link ----
  // Liquid: `prefix > li:nth-child(N1)` then `for i in (2..depth)`
  // appends ` > ul > li:nth-child(Ni)`, then ` > a`.
  {
    let s = `    ${COLLECTION_PREFIX} > li:nth-child(${levels[1]})`;
    for (let i = 2; i <= depth; i++) {
      s += ` > ul > li:nth-child(${levels[i]})`;
    }
    s += ` > a`;
    css += `${s} {\n      font-weight: 600;\n      text-decoration: none;\n    }`;
  }

  // ---- Rule 4: expander icon rotation (button svg), depth selectors ----
  // Liquid:
  //   prefix > li:nth-child(N1) > button svg
  //   prefix > li:nth-child(N1) > ul > li:nth-child(N2) > button svg
  //   ...
  // No leading newline before the first rule -- the upstream Liquid
  // has `{%- if site.just_the_docs.collections %}...{% endif -%}` that
  // strips the surrounding whitespace, so this rule abuts the previous
  // `}` with no separator.
  {
    const sels = [];
    for (let i = 1; i <= depth; i++) {
      let s = `${COLLECTION_PREFIX} > li:nth-child(${levels[1]})`;
      // Liquid: outer is at i=1 unconditional, inner loop for j in (2..i)
      // appends ` > ul > li:nth-child(Nj)`, then ` button svg` (with
      // single space before button when inner loop fires, else just one
      // ` > button svg`). For i=1: `prefix > li:nth-child(N1) > button svg`.
      // For i=2: `prefix > li:nth-child(N1) > ul > li:nth-child(N2) > button svg`.
      for (let j = 2; j <= i; j++) {
        s += ` > ul > li:nth-child(${levels[j]})`;
      }
      s += ` > button svg`;
      sels.push(s);
    }
    css += sels.join(",\n    ");
    css += ` {\n      transform: rotate(-90deg);\n    }`;
  }

  // ---- Rule 5: collection display (ul.nav-list display: block) ----
  // Same shape as Rule 4 but classed (`li.nav-list-item:nth-child(N)`)
  // and ul.nav-list terminals. Like Rule 4, no separator from previous.
  {
    const sels = [];
    for (let i = 1; i <= depth; i++) {
      let s = `${COLLECTION_PREFIX} > li.nav-list-item:nth-child(${levels[1]})`;
      for (let j = 2; j <= i; j++) {
        s += ` > ul.nav-list > li.nav-list-item:nth-child(${levels[j]})`;
      }
      s += ` > ul.nav-list`;
      sels.push(s);
    }
    css += sels.join(",\n    ");
    css += ` {\n      display: block;\n    }`;
  }

  // Prepend a leading 4-space indent on the first non-blank line of
  // each major rule above. The Liquid source has 4-space indentation;
  // compress preserves all single spaces (collapsing runs to one).
  return css;
}

// ---------- §5.6 renderHeader + auxNav -----------------------------------

function renderHeader(site) {
  const config = site.config;
  const searchEnabled = config.search_enabled !== false;
  const auxLinks = config.aux_links;
  return `    <div id="main-header" class="main-header">\n` +
    (searchEnabled
      ? renderSearchInput(config)
      : `      <div></div>\n`) +
    (auxLinks ? renderAuxNav(config) : "") +
    `    </div>`;
}

function renderSearchInput(config) {
  // Search placeholder (port of upstream search_placeholder_custom.html):
  // `Search ${site.title}`, then strip_html + strip. The site title is
  // plain text so strip_html is a no-op.
  const placeholder = `Search ${escAttr(String(config.title ?? ""))}`;
  return `      <div class="search" role="search">\n` +
    `        <div class="search-input-wrap">\n` +
    `          <input type="text" id="search-input" class="search-input" tabindex="0" placeholder="${placeholder}" aria-label="${placeholder}" autocomplete="off">\n` +
    `          <label for="search-input" class="search-label"><svg viewBox="0 0 24 24" class="search-icon"><use xlink:href="#svg-search"></use></svg></label>\n` +
    `        </div>\n` +
    `        <div id="search-results" class="search-results"></div>\n` +
    `      </div>\n`;
}

// Port of docs/_includes/components/aux_nav.html. The sun/moon SVG
// sprite lives INSIDE the aux-nav wrapper (D8: byte parity).
function renderAuxNav(config) {
  const links = config.aux_links || {};
  // YAML hash → ordered [title, urls[]] pairs. `link.first` in Liquid
  // is the key; `link.last` is the value (first url).
  const items = Object.entries(links).map(([title, urls]) => {
    const url = Array.isArray(urls) ? urls[0] : urls;
    const targetAttrs = config.aux_links_new_tab ? ` target="_blank" rel="noopener noreferrer"` : ``;
    // Liquid source has a multi-line `<a ... {% if ... %}...{% endif %}>`
    // shape; with new_tab absent, compress collapses the whitespace
    // inside the open tag to a single space, leaving `class="site-button" >`.
    // Liquid `{{ link.first }}` doesn't escape -- emit title verbatim.
    return `      <li class="aux-nav-list-item">\n` +
      `        <a href="${escAttr(String(url ?? ""))}" class="site-button"${targetAttrs}\n` +
      `        >\n` +
      `          ${String(title)}\n` +
      `        </a>\n` +
      `      </li>`;
  }).join("\n");
  return `      <nav aria-label="Auxiliary" class="aux-nav">` +
    AUX_NAV_SUN_MOON_SVG +
    `        <ul class="aux-nav-list">\n` +
    `          <li class="aux-nav-list-item">\n` +
    `            <span id="theme-toggle" class="site-button"><svg width='18px' height='18px'><use href="#svg-sun"></use></svg></span>\n` +
    `          </li>\n` +
    items + `\n` +
    `        </ul>\n` +
    `      </nav>\n`;
}

// No leading whitespace: docs/_includes/components/aux_nav.html has a
// `{%- comment -%}...{%- endcomment -%}` between `<nav>` and `<svg>`
// that strips it. Concatenated tight against the opening `<nav>`.
const AUX_NAV_SUN_MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
          <symbol id="svg-sun" viewBox="0 0 24 24">
            <title>Light mode</title>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather-sun">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          </symbol>
          <symbol id="svg-moon" viewBox="0 0 24 24">
            <title>Dark mode</title>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon-tabler-moon">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
            </svg>
          </symbol>
        </svg>
`;

// ---------- §5.7 renderBreadcrumbs ---------------------------------------

function renderBreadcrumbs(page, baseurl) {
  if (page.permalink === "/" || !page.frontmatter.parent || !page.frontmatter.title) {
    return "";
  }
  const chain = page.breadcrumbs || [];
  // Liquid `{{ entry.title }}` and `{{ page.title }}` do NOT escape.
  // Operator titles like `&, &=` render literal in Jekyll's breadcrumb;
  // escaping here would emit `&amp;, &amp;=` instead.
  const items = chain.map(entry =>
    `        <li class="breadcrumb-nav-list-item"><a href="${escAttr(relativeUrl(entry.url, baseurl))}">${String(entry.title)}</a></li>`
  ).join("\n");
  return `      <nav aria-label="Breadcrumb" class="breadcrumb-nav">\n` +
    `        <ol class="breadcrumb-nav-list">\n` +
    (items ? items + "\n" : "") +
    `          <li class="breadcrumb-nav-list-item"><span>${String(page.frontmatter.title)}</span></li>\n` +
    `        </ol>\n` +
    `      </nav>\n`;
}

// ---------- §5.8 injectAnchorHeadings ------------------------------------

const HEADING_REGEX = /<(h[1-6])(\s[^>]*?)?>([\s\S]*?)<\/\1>/g;
const ID_ATTR_REGEX = /\bid="([^"]+)"/;
const ANCHOR_SVG_TPL = (id) =>
  `<a href="#${id}" class="anchor-heading" aria-labelledby="${id}"><svg viewBox="0 0 16 16" aria-hidden="true"><use xlink:href="#svg-link"></use></svg></a>`;

export function injectAnchorHeadings(html) {
  return html.replace(HEADING_REGEX, (_, tag, attrs = "", body) => {
    const idMatch = attrs ? attrs.match(ID_ATTR_REGEX) : null;
    if (idMatch) {
      const id = idMatch[1];
      return `<${tag}${attrs}> ${ANCHOR_SVG_TPL(id)} ${body} </${tag}>`;
    }
    return `<${tag}${attrs}> ${body} </${tag}>`;
  });
}

// ---------- §5.9 renderChildrenNav ---------------------------------------

function renderChildrenNav(page, baseurl) {
  const children = page.children;
  if (!children || children.length === 0) return "";
  if (page.frontmatter.has_toc === false) return "";
  // Liquid `{{ nav_child.title }}` / `{{ nav_child.summary }}` do NOT
  // escape -- emit titles and summaries verbatim.
  const items = children.map(child => {
    const summary = child.summary != null && child.summary !== ""
      ? ` - ${String(child.summary)}`
      : "";
    return `  <li>\n` +
      `    <a href="${escAttr(relativeUrl(child.url, baseurl))}">${String(child.title)}</a>${summary}\n` +
      `  </li>`;
  }).join("\n");
  return `\n<hr>\n` +
    `<h2 class="text-delta">Table of contents</h2>\n` +
    `<ul>\n` +
    items + `\n` +
    `</ul>\n\n`;
}

// ---------- §5.11 renderFooter -------------------------------------------

function renderFooter(page, site) {
  const config = site.config;
  const footerCustom = renderFooterCustom(page, config);
  const editAndOffline = renderEditAndOfflineBlock(page, config);
  const showFooter =
    footerCustom !== "" ||
    config.last_edit_timestamp ||
    config.gh_edit_link ||
    config.gh_offline_link ||
    config.back_to_top;
  if (!showFooter) return "";

  const backToTop = config.back_to_top
    ? `        <p><a href="#page-top" id="back-to-top">${escText(String(config.back_to_top_text ?? "Back to top"))}</a></p>\n`
    : "";

  return `      <hr>\n` +
    `      <footer>\n` +
    backToTop +
    footerCustom +
    editAndOffline +
    `      </footer>\n`;
}

// Port of docs/_includes/footer_custom.html. Both `<p>` blocks use
// `{%- if -%}` / `{%- endif -%}` trimming, so they concatenate tight
// (no whitespace between `</p>` and the next `<p>`) when both fire.
// Caller renderFooter handles the outer indentation -- this returns
// the inner content directly.
function renderFooterCustom(page, config) {
  let out = "";
  if (config.footer_content) {
    // Emitted verbatim, NOT escaped: the current value contains `&copy;`
    // which is the desired HTML entity; escaping would double-encode it.
    out += `<p class="text-small mb-0">${config.footer_content}</p>`;
  }
  if (page.frontmatter.vba_attribution) {
    // Verbatim port of the include's literal anchor markup. Note the
    // two-space gaps between "</a>" + "Code license:" and "</a>" +
    // "Attribution:" in the source -- compress collapses to one space.
    out += `<p class="text-small mb-0">License: <a href="https://github.com/MicrosoftDocs/VBA-Docs/blob/main/LICENSE">CC-BY-4.0</a>  Code license: <a href="https://github.com/MicrosoftDocs/VBA-Docs/blob/main/LICENSE-CODE">MIT</a>  Attribution: <a href="https://github.com/MicrosoftDocs/VBA-Docs/tree/main">VBA-Docs</a></p>`;
  }
  return out;
}

function renderEditAndOfflineBlock(page, config) {
  const showEdit = config.gh_edit_link && config.gh_edit_link_text && config.gh_edit_repository
    && config.gh_edit_branch && config.gh_edit_view_mode;
  const showOffline = config.gh_offline_link && config.gh_offline_link_text && config.gh_offline_link_url;
  const showLastModified = config.last_edit_timestamp && config.last_edit_time_format
    && page.frontmatter.last_modified_date;

  if (!showEdit && !showOffline && !showLastModified
    && !config.last_edit_timestamp && !config.gh_edit_link && !config.gh_offline_link) {
    return "";
  }

  let inner = "";
  if (showLastModified) {
    const formatted = formatDate(page.frontmatter.last_modified_date, config.last_edit_time_format);
    inner += `        <p class="text-small text-grey-dk-000 mb-0 mr-2">\n` +
      `          Page last modified: <span class="d-inline-block">${escText(formatted)}</span>.\n` +
      `        </p>\n`;
  }
  if (showEdit) {
    const href = ghEditHref(page, config);
    const cls = `text-small text-grey-dk-000 mb-0${showOffline ? " mr-2" : ""}`;
    inner += `        <p class="${cls}">\n` +
      `          <a href="${escAttr(href)}" id="edit-this-page">${escText(String(config.gh_edit_link_text))}</a>\n` +
      `        </p>\n`;
  }
  if (showOffline) {
    inner += `        <p class="text-small text-grey-dk-000 mb-0">\n` +
      `          <a href="${escAttr(String(config.gh_offline_link_url))}" id="download-offline">${escText(String(config.gh_offline_link_text))}</a>\n` +
      `        </p>\n`;
  }

  return `        <div class="d-flex mt-2">\n` + inner + `        </div>\n`;
}

// `gh_edit_repository` keeps its trailing slash (D9). The Liquid
// template concatenates `repo + "/" + view_mode`, producing a
// double-slash like `/tree/`. GitHub redirects through it; matching
// the byte form is the goal.
function ghEditHref(page, config) {
  const repo = String(config.gh_edit_repository ?? "");
  const view = String(config.gh_edit_view_mode ?? "");
  const branch = String(config.gh_edit_branch ?? "");
  const source = config.gh_edit_source ? `/${config.gh_edit_source}` : "";
  // page.collection is unused on this site (no collections); skip.
  // page.path in Jekyll is the source-relative path with the leading
  // collection dir collapsed; for non-collection pages it's the same
  // as srcRel.
  return `${repo}/${view}/${branch}${source}/${page.srcRel.replace(/\\/g, "/")}`;
}

// ---------- §5.12 renderSearchFooter -------------------------------------

function renderSearchFooter(site) {
  const config = site.config;
  if (config.search_enabled === false) return "";
  const button = config.search?.button
    ? `    <button id="search-button" class="search-button btn-reset" aria-label="Focus on search">\n` +
      `      <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><use xlink:href="#svg-search"></use></svg>\n` +
      `    </button>\n`
    : "";
  return button + `    <div class="search-overlay"></div>`;
}

// ---------- §5.13 renderMermaidScript ------------------------------------

function renderMermaidScript(site) {
  const m = site.config.mermaid;
  if (!m) return "";
  const version = m.version ?? "latest";
  const extra = site.config.mermaid_config ?? "";
  return `  <script src="https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.min.js"></script>\n` +
    `  <script>\n` +
    `    mermaid.initialize({ startOnLoad: true });\n` +
    (extra ? `    ${extra}\n` : "") +
    `  </script>`;
}

// ---------- §6.2 / §6.3 URL helpers --------------------------------------

// Port of Jekyll's `relative_url` filter. URL-encodes spaces to `%20`
// (matches the upstream's Addressable::URI normalisation); other
// characters left alone since paths on this site don't contain
// anything else that needs encoding.
function relativeUrl(url, baseurl) {
  if (typeof url !== "string") return "";
  if (url.startsWith("/") && !url.startsWith("//")) {
    return encodeSpaces(`${baseurl}${url}`);
  }
  return url;
}

function encodeSpaces(s) {
  return s.includes(" ") ? s.replace(/ /g, "%20") : s;
}

function absoluteUrl(url, config) {
  if (typeof url !== "string") return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(url)) return url;
  const siteUrl = String(config.url ?? "");
  const rel = relativeUrl(url, String(config.baseurl ?? ""));
  if (siteUrl === "") return rel;
  return new URL(siteUrl + rel).href;
}

// ---------- §6.4 strftime formatter --------------------------------------

const STRFTIME_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STRFTIME_DAYS_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STRFTIME_MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const STRFTIME_MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Implements the tokens the project's last_edit_time_format actually
// uses (`%b %e %Y at %I:%M %p`), plus the common companions Liquid's
// `date` filter supports. Throws on unknown tokens so a future format
// change surfaces immediately.
function formatDate(input, format) {
  const d = parseDate(input);
  if (!d) return "";
  const pad2 = (n) => String(n).padStart(2, "0");
  return format.replace(/%(.)/g, (_, t) => {
    switch (t) {
      case "a": return STRFTIME_DAYS_ABBR[d.getDay()];
      case "A": return STRFTIME_DAYS[d.getDay()];
      case "b": return STRFTIME_MONTHS_ABBR[d.getMonth()];
      case "B": return STRFTIME_MONTHS[d.getMonth()];
      case "d": return pad2(d.getDate());
      case "e": return String(d.getDate()).padStart(2, " ");
      case "H": return pad2(d.getHours());
      case "I": return pad2(((d.getHours() + 11) % 12) + 1);
      case "j": {
        const start = new Date(d.getFullYear(), 0, 0);
        return pad2(Math.floor((d - start) / 86400000));
      }
      case "m": return pad2(d.getMonth() + 1);
      case "M": return pad2(d.getMinutes());
      case "p": return d.getHours() < 12 ? "AM" : "PM";
      case "S": return pad2(d.getSeconds());
      case "y": return pad2(d.getFullYear() % 100);
      case "Y": return String(d.getFullYear());
      case "%": return "%";
      default:
        throw new Error(`Unsupported strftime token: %${t}`);
    }
  });
}

function parseDate(input) {
  if (input instanceof Date) return input;
  if (typeof input === "string") {
    const d = new Date(input);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

// ---------- §5.15 escape helpers -----------------------------------------

const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const HTML_ESCAPE_RE = /[&<>"']/g;

function escText(s) {
  return String(s).replace(HTML_ESCAPE_RE, (c) => HTML_ESCAPE[c]);
}
function escAttr(s) {
  return String(s).replace(HTML_ESCAPE_RE, (c) => HTML_ESCAPE[c]);
}
