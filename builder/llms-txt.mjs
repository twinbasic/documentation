// /llms.txt, the site's index for language models, in the shape llmstxt.org proposes: a
// level-1 heading, a one-paragraph summary as a blockquote, a paragraph and a list of pages,
// then a level-2 section of links for each part of the site, and last `## Optional`, which a
// reader short of room may skip. Written into the online tree alone, beside sitemap.xml, by the
// writeAux task.
//
// The parts are the nav tree's top level: each top-level page that has children is a section,
// listing that page and its children, in nav order; the top-level pages with none are the list
// above the first section. A link goes to the page's markdown copy (markdown-copy.mjs), and its
// note is the page's summary, the sentence its `<meta name="description">` holds (seo.mjs,
// pageSummary). The paragraph above the lists names the symbol index (tB/symbols.json) and
// nav.html, the whole nav tree.
//
// _config.yml's `llms_txt` gives the summary and names the top-level pages whose sections go
// under `## Optional`. A name there that is no top-level page fails the build, rather than
// quietly listing that part with the rest.

import path from "node:path";
import { markdownCopyUrl } from "./markdown-copy.mjs";
import { pageSummary } from "./seo.mjs";
import { SYMBOL_INDEX_REL } from "./symbols.mjs";
import { NAV_TREE_REL } from "./template.mjs";
import { absoluteUrl } from "./url.mjs";
import { writeFileMkdirp } from "./write.mjs";

export const LLMS_TXT_REL = "llms.txt";

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
    const note = pageSummary(page);
    return `- [${escapeLinkText(node.title)}](${absoluteUrl(url, config)})${note ? `: ${note}` : ""}`;
  };
  const list = (nodes) => nodes.map(entry).filter(Boolean).join("\n");

  const out = [`# ${config.title ?? "Documentation"}`, ""];
  if (settings.summary) out.push(`> ${String(settings.summary).trim().replace(/\s+/g, " ")}`, "");
  out.push(
    "Every page of this site is also published as markdown, at the page's URL with `.md` added, " +
      "or `index.md` where the URL ends in `/`. The links below go to the markdown, and so do the " +
      "markdown's links to other pages. Each page's HTML names its own markdown in " +
      '`<link rel="alternate" type="text/markdown">`.',
    "",
    `To find the page that documents a name, read ${absoluteUrl(`/${SYMBOL_INDEX_REL}`, config)}: ` +
      "every name the reference documents of the language (its statements, keywords, operators, " +
      "attributes, directives and data types) and of the default and built-in packages (their " +
      "modules, classes, controls, members, events, enumerations and their values), each with the " +
      "URL of the page or the heading that documents it. For the markdown, add `.md` to the URL as " +
      "above, before any `#` fragment. The contributed packages are not in it: the Contributed " +
      "Packages page, linked below, lists their sections. " +
      `${absoluteUrl(`/${NAV_TREE_REL}`, config)} lists every page, in the order of the site's navigation.`,
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

// A title is link text: a bracket in it would end the link.
function escapeLinkText(title) {
  return String(title).replace(/[[\]\\]/g, "\\$&");
}
