// The page the two diagram tools measure text in, scripts/check_dot_fit.mjs
// and scripts/build_dot_metrics.mjs: a blank page that paints with the site's
// own Inter, loaded from docs/assets/fonts.
//
// The fonts are file:// URLs, so the page is a file:// page too: it is written
// to docs/_<name>-host.html, loaded, and removed at once, and the leading
// underscore keeps a build that runs meanwhile from reading it as source. A
// face that fails to load rejects the tool's document.fonts.load(), so the
// tool exits 2 rather than measuring a fallback font.

import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DOCS_DIR } from "../../lib/repo-paths.mjs";

/**
 * Opens a new page in `browser` with Inter declared, `css` after the
 * @font-face rules and `body` after the stylesheet, and returns it once loaded.
 */
export async function openInterPage(browser, name, { css = "", body = "" } = {}) {
  const fontDirUrl = pathToFileURL(path.join(DOCS_DIR, "assets", "fonts")).href;
  const html = `<!doctype html><meta charset="utf-8"><title>${name}</title><style>
@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable.woff2") format("woff2")}
@font-face{font-family:"Inter";font-style:italic;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable-italic.woff2") format("woff2")}
${css}</style>${body}`;

  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  const host = path.join(DOCS_DIR, `_${name}-host.html`);
  await fs.writeFile(host, html, "utf8");
  try {
    await page.goto(pathToFileURL(host).href, { waitUntil: "load" });
  } finally {
    await fs.rm(host, { force: true });
  }
  return page;
}
