// Phase 6 AUXILIARIES -- redirect stubs. Port of jekyll-redirect-from's
// Generator: for each page whose frontmatter declares `redirect_from:`,
// emit one tiny HTML stub at the redirected URL's filesystem location.
// Each stub combines a `<script>location=...` JS hop, a
// `<meta http-equiv="refresh">` static-HTML hop, and a visible `<a>`
// link as the no-JS / no-meta-refresh last-resort fallback. The
// `<link rel="canonical">` and `<meta name="robots" content="noindex">`
// keep crawlers focused on the real URL.
//
// See builder/PLAN-6.md §5.1 + §6.6 + §7.D2. Reads:
//   - page.frontmatter.redirect_from -- string or string[]; absent on
//     most pages.
//   - page.permalink -- the canonical destination.
//   - page.destPath  -- used for collision detection against real pages.
//   - site.config.url -- origin for the absolute target URL.
//
// Writes ~290 files into destRoot/ on the current tree, in parallel
// under the Phase 5 concurrency limit.

import path from "node:path";

import { permalinkToDestPath } from "./paths.mjs";
import { absoluteUrl } from "./seo.mjs";
import { runLimited, writeFileMkdirp, WRITE_LIMIT } from "./write.mjs";

export async function writeRedirects(pages, site, destRoot) {
  const stubs = deriveRedirectStubs(pages, site);
  await runLimited(stubs, WRITE_LIMIT, async (s) => {
    await writeFileMkdirp(path.join(destRoot, s.destPath), s.html);
  });
  return { written: stubs.length, stubs };
}

// Pure-compute derivation: produces the redirect-stub list (destPath +
// HTML + source page reference) without writing to disk. Used by
// writeRedirects above and by `_triage.mjs` / `_diff.mjs` to derive
// the expected output in-memory for byte comparison against Jekyll's
// `_site/`. Throws on collision (§7.D2) -- the build would fail
// anyway if it tried to write the conflicting stub, so surfacing it
// from the derivation step is the right place.
export function deriveRedirectStubs(pages, site) {
  const config = site.config;

  // §7.D2: build the set of every real page's on-disk path so a bad
  // redirect_from entry that would overwrite a page surfaces with a
  // clear error rather than silently clobbering.
  const pageDestPaths = new Map();
  for (const p of pages) {
    if (p.html !== undefined) pageDestPaths.set(p.destPath, p);
  }

  const stubs = [];
  const seen = new Map();
  for (const page of pages) {
    const from = page.frontmatter?.redirect_from;
    if (from == null) continue;

    const fromList = Array.isArray(from) ? from : [from];
    const target = absoluteUrl(page.permalink, config);

    for (const fromPath of fromList) {
      if (typeof fromPath !== "string" || fromPath === "") continue;

      const destPath = permalinkToDestPath(fromPath);

      const colliding = pageDestPaths.get(destPath);
      if (colliding) {
        throw new Error(
          `redirect_from collision in ${page.srcRel}: ` +
            `entry "${fromPath}" → ${destPath} would overwrite the page ${colliding.srcRel} ` +
            `(permalink ${colliding.permalink}). Remove the redirect_from entry or the conflicting page.`,
        );
      }

      const previous = seen.get(destPath);
      if (previous && previous.srcRel !== page.srcRel) {
        throw new Error(
          `redirect_from collision: ${page.srcRel} declares "${fromPath}" but ` +
            `${previous.srcRel} already declared the same destination ${destPath}. ` +
            `Only one page may own a given redirect.`,
        );
      }
      seen.set(destPath, page);

      stubs.push({ destPath, html: renderRedirectStub(target), sourcePage: page, fromPath });
    }
  }

  return stubs;
}

// Stub template (PLAN-6 §2.Redirect-stubs). The target URL appears at
// four positions: canonical link, JS location, meta refresh, and the
// visible <a>. The href in the meta refresh content attribute is bare
// (no quotes); the others use double-quoted attribute syntax.
function renderRedirectStub(target) {
  return `<!DOCTYPE html>
<html lang="en-US">
  <meta charset="utf-8">
  <title>Redirecting&hellip;</title>
  <link rel="canonical" href="${target}">
  <script>location="${target}"</script>
  <meta http-equiv="refresh" content="0; url=${target}">
  <meta name="robots" content="noindex">
  <h1>Redirecting&hellip;</h1>
  <a href="${target}">Click here if you are not redirected.</a>
</html>
`;
}
