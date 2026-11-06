// The HTML pieces the screenshot review tool's pages are made of (shot-pages.mjs,
// WIP.ShotReview.md): the page itself, a chip and a picture's allowances.
//
// Each takes text where it says text, and escapes it, and HTML where it says HTML, which
// it puts in as it is. Nothing here reads or writes a file.

import { pngRule, svgRule } from "./shot-policy.mjs";

/** `s` as text in HTML, in an element or in an attribute's quotes. */
export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The id of a picture's card, from its path. */
export const anchor = (out) => `p-${out.replace(/[^A-Za-z0-9]+/g, "-")}`;

/** A picture's size ([w, h] in device pixels, or null) as text. */
export const sizeText = (size) => (size ? `${size[0]} x ${size[1]} px` : "size unknown");

const rectsNote = (rects) => (rects.length ? `, ${rects.length} rectangle${rects.length > 1 ? "s" : ""} left out` : "");

/**
 * The allowances of a picture's entry in the manifest (or null), as text: {png, svg}, each the
 * rule it is judged by when an allowance changes it, else null.
 */
export function allowancesOf(entry) {
  let png = null;
  let svg = null;
  if (entry?.png?.noise || entry?.png?.ignore?.length) {
    const r = pngRule(entry);
    png = `PNG allowance: within noise when no pixel is more than ${r.levels} levels off and at most ${+(r.share * 100).toFixed(4)}% are off at all${rectsNote(r.rects)}`;
  }
  if (entry?.svg?.bar || entry?.svg?.ignore?.length) {
    const r = svgRule(entry);
    svg = `SVG allowance: written below ${r.share}% of the pixels ${r.levels} levels or more off${rectsNote(r.rects)}`;
  }
  return { png, svg };
}

const PAGE_STYLE = `:root{color-scheme:light dark;--bg:#fff;--fg:#1b1b1b;--mut:#666;--line:#ccc;--card:#f6f6f6;--bar:#d33;--link:#2a6ed8}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1b;--fg:#e6e6e6;--mut:#a0a0a0;--line:#444;--card:#262626;--bar:#e55;--link:#7aaaff}}
body{margin:0 auto;max-width:1500px;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,Segoe UI,sans-serif}
h1{margin-top:0}h3{margin:0 0 4px;word-break:break-all}a{color:var(--link)}
section{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:12px;margin:16px 0}
.meta{margin:0 0 6px;color:var(--mut)}
.trio{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
.trio figure{margin:0;flex:1 1 30%;min-width:260px}
.trio img{max-width:100%;max-height:520px;border:1px solid var(--line);background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px;display:block}
figcaption{font-size:12px;color:var(--mut);margin-top:2px;word-break:break-all}
table{border-collapse:collapse}td,th{border:1px solid var(--line);padding:3px 10px;text-align:left}
`;

/**
 * A page: the head with `generator` in its <meta name="generator"> and `head` (HTML) after its
 * style, the `title` (text) and `intro` (HTML), the `summary` table ([[label, value]], text), the
 * `contents` (the <li>s of the list, HTML), and `body` (HTML). A page with no `summary` has no
 * table, and one with no `contents` no list.
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
