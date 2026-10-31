// The HTML pieces the pages about screenshots are made of: the page itself, a picture's
// card, a figure, a thumbnail, a line of the contents and a meter. scripts/svgshot/sheets.mjs
// builds the two static sheets from them, and the screenshot review tool is to build its
// pages from the same pieces, with its actions added (WIP.ShotReview.md).
//
// Each takes text where it says text, and escapes it, and HTML where it says HTML, which
// it puts in as it is. Nothing here reads or writes a file.

/** `s` as text in HTML, in an element or in an attribute's quotes. */
export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The id of a picture's card, from its path. */
export const anchor = (out) => `p-${out.replace(/[^A-Za-z0-9]+/g, "-")}`;

/** A picture's size ([w, h] in device pixels, or null) as text. */
export const sizeText = (size) => (size ? `${size[0]} x ${size[1]} px` : "size unknown");

/** A share of the pixels, as text: two decimals, and "under 0.01" for what would round to none. */
export const pctText = (pct) => (pct === 0 ? "0" : pct < 0.01 ? "under 0.01" : pct.toFixed(2));

const PAGE_STYLE = `:root{color-scheme:light dark;--bg:#fff;--fg:#1b1b1b;--mut:#666;--line:#ccc;--card:#f6f6f6;--bar:#d33;--lim:#080;--link:#2a6ed8}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1b;--fg:#e6e6e6;--mut:#a0a0a0;--line:#444;--card:#262626;--bar:#e55;--lim:#4c4;--link:#7aaaff}}
body{margin:0 auto;max-width:1500px;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,Segoe UI,sans-serif}
h1{margin-top:0}h3{margin:0 0 4px;word-break:break-all}a{color:var(--link)}
section{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:12px;margin:16px 0}
.meta{margin:0 0 6px;color:var(--mut)}
.trio{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
.trio figure{margin:0;flex:1 1 30%;min-width:260px}
.trio img{max-width:100%;max-height:520px;border:1px solid var(--line);background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px;display:block}
figcaption{font-size:12px;color:var(--mut);margin-top:2px;word-break:break-all}
.bar{position:relative;display:block;height:10px;max-width:500px;border:1px solid var(--line);margin:2px 0 8px}
.bar i{position:absolute;left:0;top:0;bottom:0;background:var(--bar)}
.bar b{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--lim)}
.pct{color:var(--mut)}
.thumbs{display:flex;flex-wrap:wrap;gap:12px}
.thumb{margin:0;width:230px}.thumb img{max-width:230px;max-height:150px;border:1px solid var(--line);background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px}
table{border-collapse:collapse}td,th{border:1px solid var(--line);padding:3px 10px;text-align:left}
`;

/**
 * A page: the head with `generator` in its <meta name="generator"> (by which a folder is
 * known to hold a page of that tool), and `head` (HTML) after its style, the `title` (text)
 * and `intro` (HTML), the `summary` table ([[label, value]], text), the `contents` (the
 * <li>s of the list, HTML), and `body` (HTML). A page with no `summary` has no table, and one
 * with no `contents` no list.
 */
export function pageHtml({ generator, title, intro, summary, contents, body, head = "" }) {
  const table = summary
    ? `<table>
${summary.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("\n")}
</table>
`
    : "";
  const list =
    contents === undefined
      ? ""
      : `<h2>Contents</h2>
<ol>
${contents}
</ol>
`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="${generator}">
<title>${esc(title)}</title>
<style>
${PAGE_STYLE}</style>${head}</head><body>
<h1>${esc(title)}</h1>
<p>${intro}</p>
${table}${list}${body}
</body></html>
`;
}

/** A chip: a short `text` (text) with the classes `classes` and the tooltip `title` (text). */
export const chipHtml = (text, classes = "", title = "") =>
  `<span class="chip${classes ? ` ${classes}` : ""}"${title ? ` title="${esc(title)}"` : ""}>${esc(text)}</span>`;

/**
 * For files in `folder`, relative to the page: `href`, a file's link; `figure`, a linked
 * picture with its caption (text), for a card; `thumb`, a linked thumbnail with its alt
 * text and caption (text).
 */
export function figuresIn(folder) {
  const href = (name) => `${folder}/${encodeURIComponent(name)}`;
  const figure = (name, caption) =>
    `<figure><a href="${href(name)}"><img src="${href(name)}" loading="lazy" alt="${esc(caption)}"></a><figcaption>${esc(caption)}</figcaption></figure>`;
  const thumb = (name, alt, caption) =>
    `<figure class="thumb"><a href="${href(name)}"><img src="${href(name)}" loading="lazy" alt="${esc(alt)}"></a><figcaption>${esc(caption)}</figcaption></figure>`;
  return { href, figure, thumb };
}

/** A bar `pct` of the way to `full` percent, with a mark at `mark` percent; `title` is its tooltip (text). */
export const meterHtml = (pct, full, mark, title) =>
  `<span class="bar" title="${esc(title)}"><i style="width:${Math.min(100, (pct / full) * 100)}%"></i><b style="left:${(mark / full) * 100}%"></b></span>`;

/**
 * A picture's card, with the id `anchor(out)`: its path `out` (text) as the heading, the
 * line of facts `meta` (HTML), a `meter` (HTML, or "") and the `figures` (HTML, one each).
 */
export const cardHtml = ({ out, meta, meter = "", figures }) => `<section id="${anchor(out)}">
<h3>${esc(out)}</h3>
<p class="meta">${meta}</p>
${meter}
<div class="trio">${figures.join("\n")}</div>
</section>`;

/** A line of the contents: a link to the card of `out`, and `note` (text) after it. */
export const tocItem = (out, note) =>
  `<li><a href="#${anchor(out)}">${esc(out)}</a> <span class="pct">${esc(note)}</span></li>`;
