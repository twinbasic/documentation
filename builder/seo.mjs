// Phase 2 SEO precompute. Per-page seoTitle / seoFullTitle / seoCanonical
// / seoIsHome, plus site-level seoSiteTitle / seoLogoUrl. The values are
// the exact text the head_seo.html template plugs into <title>, <meta>,
// canonical, and JSON-LD attributes.
//
// Mirrors `text | markdownify | strip_html | normalize_whitespace |
// escape_once` byte-for-byte: 834 of 836 page titles on this site are
// plain ASCII strings where the pipeline reduces to a straight
// escape_once(title); the 2 titles with markdown-active characters
// (`&, &=` and `\, \=` via Concat.md / LineContinuation analogues) get
// the same `<p>...</p>` wrap-and-strip as Jekyll produces.
//
// See builder/PLAN-2.md §5.7 + §6.3. Ports: _plugins/seo-precompute.rb.

// Constants ported verbatim from Liquid::StandardFilters so the
// strip/escape steps use the same regex characters Liquid would.
const STRIP_HTML_BLOCKS = /<script.*?<\/script>|<!--.*?-->|<style.*?<\/style>/gms;
const STRIP_HTML_TAGS = /<\/?[^>]+>/g;
const HTML_ESCAPE_ONCE_REGEXP = /["><']|&(?!(?:[a-zA-Z]+|#\d+);)/g;
const HTML_ESCAPE = {
  "&": "&amp;",
  ">": "&gt;",
  "<": "&lt;",
  '"': "&quot;",
  "'": "&#39;",
};

// jekyll-seo-tag's HOMEPAGE_OR_ABOUT_REGEX expanded; toggles JSON-LD
// @type between WebSite and WebPage.
const HOMEPAGE_URLS = new Set([
  "/", "/index.html", "/index.htm",
  "/about/", "/about/index.html", "/about/index.htm",
]);

export function precomputeSeo(pages, config, markdown) {
  // The markdown-it instance is shared with Phase 3's body renderer
  // (see render.mjs's createMarkdownIt). The plugin stack adds attrs /
  // deflist / footnote / header-id / TOC / relative-links / block-HTML
  // recursion / smart-dash + smart-quote helpers; none of those plugins
  // fire on the bare-text titles this site uses (no `{:` attribute
  // syntax, no `term\n: definition`, no `[^N]` footnote ref, no
  // heading, no `{:toc}` marker, no <a> token, no html_block with
  // markdown="1"). The visible effect of the shared instance is
  // identical to the previous standalone `new MarkdownIt({ html:
  // true, typographer: true })` for every title on the site.
  if (!markdown) {
    throw new Error("precomputeSeo requires a markdown-it instance (build via render.mjs's createMarkdownIt)");
  }

  const seoSiteTitle = renderTitle(config.title, markdown);
  const logo = config.logo;
  const seoLogoUrl = logo != null
    ? uriEscape(absoluteUrl(String(logo), config))
    : null;

  for (const page of pages) {
    const rawTitle = page.frontmatter.title;
    const seoTitle = isNonEmpty(rawTitle) ? renderTitle(rawTitle, markdown) : seoSiteTitle;
    page.seoTitle = seoTitle;
    page.seoFullTitle = seoTitle === seoSiteTitle
      ? seoTitle
      : `${seoTitle} | ${seoSiteTitle}`;

    const url = String(page.permalink);
    const canonicalInput = url.replace(/\/index\.html$/, "/");
    page.seoCanonical = absoluteUrl(canonicalInput, config);
    page.seoIsHome = HOMEPAGE_URLS.has(url);
  }

  return { seoSiteTitle, seoLogoUrl };
}

// `text | markdownify | strip_html | normalize_whitespace | escape_once`,
// matching the Ruby pipeline byte-for-byte. markdown-it.render() adds a
// trailing \n; normalize_whitespace's /\s+/ + trim strips it back out.
export function renderTitle(text, markdown) {
  if (text == null) return "";
  const s = String(text);
  if (s === "") return "";
  const html = markdown.render(s);
  const stripped = stripHtml(html);
  const collapsed = stripped.replace(/\s+/g, " ").trim();
  return collapsed.replace(HTML_ESCAPE_ONCE_REGEXP, m => HTML_ESCAPE[m]);
}

// Liquid's `strip_html` filter: drop <script>/<style> blocks and HTML
// comments outright, then strip the remaining tag delimiters. Exported
// for Phase 6's search-index content sanitiser (search.mjs).
export function stripHtml(s) {
  return String(s ?? "")
    .replace(STRIP_HTML_BLOCKS, "")
    .replace(STRIP_HTML_TAGS, "");
}

// Mirrors `Jekyll::Filters::URLFilters#absolute_url`. Already-absolute
// inputs pass through; otherwise concatenate site.url + relative_url
// and let Node's URL parse + normalise.
export function absoluteUrl(input, config) {
  if (input == null) return null;
  const s = String(input);
  if (isAbsoluteUrl(s)) return s;

  const siteUrl = String(config.url || "");
  const rel = relativeUrl(s, config);
  if (siteUrl === "") return rel;

  return new URL(siteUrl + rel).href;
}

// Mirrors `Jekyll::Filters::URLFilters#relative_url`. baseurl is empty
// on this site; the helper still composes correctly for non-empty
// baseurl by stripping a trailing "/" and slash-prefixing both parts
// before concatenation.
export function relativeUrl(input, config) {
  const s = String(input);
  if (isAbsoluteUrl(s)) return s;

  const baseurl = String(config.baseurl || "").replace(/\/$/, "");
  return ensureLeadingSlash(baseurl) + ensureLeadingSlash(s);
}

function ensureLeadingSlash(input) {
  if (input === "" || input.startsWith("/")) return input;
  return "/" + input;
}

// Mirrors `Jekyll::Filters#uri_escape` (=
// `Addressable::URI.normalize_component`). For the inputs this site
// produces (absolute https URLs whose components are already safe
// ASCII), encodeURI is equivalent: it leaves alphanumerics + the
// unreserved set + reserved-but-safe characters (/:?#@ etc.) intact.
function uriEscape(input) {
  if (input == null) return null;
  return encodeURI(String(input));
}

function isAbsoluteUrl(s) {
  return /^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(s);
}

function isNonEmpty(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0;
  return true;
}
