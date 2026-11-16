// /llms.txt, the site's index for language models, in the shape llmstxt.org proposes: a
// level-1 heading, a one-paragraph summary as a blockquote, a paragraph and a list of pages,
// then a level-2 section of links for each part of the site, and last `## Optional`, which a
// reader short of room may skip. Written into the online tree alone, beside sitemap.xml, by the
// writeAux task.
//
// The parts are the nav tree's top level: each top-level page that has children is a section,
// listing that page and its children, in nav order; the top-level pages with none are the list
// above the first section. A link goes to the page's markdown copy (markdown-copy.mjs), and its
// note is the page's first sentence, which the documentation's own rule puts directly under
// the heading (WIP.md, Plain-English prose).
//
// _config.yml's `llms_txt` gives the summary and names the top-level pages whose sections go
// under `## Optional`. A name there that is no top-level page fails the build, rather than
// quietly listing that part with the rest.

import path from "node:path";
import { markdownCopyUrl } from "./markdown-copy.mjs";
import { stripHtml } from "./seo.mjs";
import { absoluteUrl } from "./url.mjs";
import { writeFileMkdirp } from "./write.mjs";

export const LLMS_TXT_REL = "llms.txt";

// A note longer than this is cut at a word and ends in an ellipsis.
const NOTE_MAX = 240;

/**
 * Write /llms.txt into `destRoot`. `pages` have their renderedContent; `site` has its config
 * and navTree.
 *
 * @returns {Promise<{links: number, sections: number}>}
 */
export async function writeLlmsTxt(pages, site, destRoot) {
  const { text, links, sections } = renderLlmsTxt(pages, site);
  await writeFileMkdirp(path.join(destRoot, LLMS_TXT_REL), text);
  return { links, sections };
}

/** The file's text, and how many links and sections it has. */
export function renderLlmsTxt(pages, site) {
  const config = site.config ?? {};
  const settings = config.llms_txt ?? {};
  const byPermalink = new Map(pages.map((p) => [p.permalink, p]));
  const tree = site.navTree ?? [];

  const optionalTitles = [].concat(settings.optional ?? []).map(String);
  const topTitles = new Set(tree.map((n) => n.title));
  const unknown = optionalTitles.filter((t) => !topTitles.has(t));
  if (unknown.length) {
    throw new Error(
      `llms_txt.optional in _config.yml names ${unknown.map((t) => `"${t}"`).join(", ")}, ` +
        `which ${unknown.length === 1 ? "is" : "are"} not a top-level page's title; ` +
        `the top-level pages are ${[...topTitles].map((t) => `"${t}"`).join(", ")}`,
    );
  }
  const optional = new Set(optionalTitles);

  let links = 0;
  const entry = (node) => {
    const page = byPermalink.get(node.url);
    const url = page ? markdownCopyUrl(page) : null;
    if (!url) return null;
    links++;
    let note = page ? firstSentence(page.renderedContent) : "";
    if (note.replace(/[.:]$/, "").toLowerCase() === String(node.title).toLowerCase()) note = "";
    return `- [${escapeLinkText(node.title)}](${absoluteUrl(url, config)})${note ? `: ${note}` : ""}`;
  };
  const list = (nodes) => nodes.map(entry).filter(Boolean).join("\n");

  const out = [`# ${config.title ?? "Documentation"}`, ""];
  if (settings.summary) out.push(`> ${String(settings.summary).trim().replace(/\s+/g, " ")}`, "");
  out.push(
    "Every page of this site is also published as markdown, at the page's URL with `.md` added, " +
      "or `index.md` where the URL ends in `/`. The links below go to the markdown, and each page's " +
      'HTML names its own in `<link rel="alternate" type="text/markdown">`. A relative link in the ' +
      "markdown resolves as it does on the page.",
    "",
  );

  const leaves = tree.filter((n) => !n.children?.length && !optional.has(n.title));
  const parts = tree.filter((n) => n.children?.length && !optional.has(n.title));
  const optionals = tree.filter((n) => optional.has(n.title));

  if (leaves.length) out.push(list(leaves), "");
  let sections = 0;
  for (const node of parts) {
    out.push(`## ${node.title}`, "", list([node, ...node.children]), "");
    sections++;
  }
  if (optionals.length) {
    out.push("## Optional", "", list(optionals.flatMap((n) => [n, ...(n.children ?? [])])), "");
    sections++;
  }
  return { text: `${out.join("\n").trimEnd()}\n`, links, sections };
}

// ── notes ───────────────────────────────────────────────────────────────

const PARAGRAPH = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
const ENTITY = /&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi;
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * The first sentence of the first paragraph with text in a page's introduction, the part above
 * its first level-2 heading, as plain text; or "" when the introduction has none, as the
 * Glossary's has not, whose first paragraph defines its first term. A sentence ends at `.`, `!`
 * or `?` before white space and a capital letter, or at the paragraph's end.
 */
export function firstSentence(html) {
  const page = String(html ?? "");
  const h2 = page.search(/<h2[\s>]/);
  for (const m of (h2 < 0 ? page : page.slice(0, h2)).matchAll(PARAGRAPH)) {
    const text = decode(stripHtml(m[1])).replace(/\s+/g, " ").trim();
    if (!text) continue;
    const end = /[.!?](?=\s+[A-Z])/.exec(text);
    return shorten(end ? text.slice(0, end.index + 1) : text);
  }
  return "";
}

function shorten(text) {
  if (text.length <= NOTE_MAX) return text;
  const cut = text.lastIndexOf(" ", NOTE_MAX - 1);
  return `${text.slice(0, cut > 0 ? cut : NOTE_MAX - 1).replace(/[\s,;:]+$/, "")}\u{2026}`;
}

function decode(s) {
  return s.replace(ENTITY, (_, e) => {
    const k = e.toLowerCase();
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return NAMED[k];
  });
}

// A title is link text: a bracket in it would end the link.
function escapeLinkText(title) {
  return String(title).replace(/[[\]\\]/g, "\\$&");
}
