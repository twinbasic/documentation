// Phase 8 WRITE PDF: produce the sparse `<destRoot>-pdf/` tree that
// pagedjs-cli consumes when rendering the PDF book. See builder/PLAN-8.md
// for the full spec and docs/_plugins/pdfify.rb for the canonical
// Jekyll reference.
//
// One entry point: writePdf(pages, staticFiles, site, destRoot,
// { tolerateMissingImages }). The pure-compute helper deriveBookOutputs is also
// exported so `_diff.mjs --book` / `_triage.mjs auditBook*` can derive
// expected bytes without touching disk.
//
// Internal sections:
//
//   §A  Top-level orchestration (writePdf entry point)
//   §B  Image-path extraction (port of pdfify.rb's IMG_SRC_RE)
//   §C  Static-file lookup
//   §D  Setup pass (wipe + recreate pdfRoot)
//   §E  Copy pass (book.html + CSS + images)
//   §F  Missing-image reporting (port of pdfify.rb's strict mode)

import { promises as fs } from "node:fs";

import path from "node:path";

import { assembleBook } from "./book.mjs";
import {
  WRITE_LIMIT,
  isUnderProject,
  mkdirRec,
  runLimited,
  safeWrite,
  writeFileMkdirp,
} from "./write.mjs";

const PDF_SUFFIX = "-pdf";
const REQUIRED_CSS = ["assets/css/print.css", "assets/css/tb-highlight.css"];
const LIMIT = WRITE_LIMIT;

// ---------------------------------------------------------------------------
// §A  Top-level orchestration
// ---------------------------------------------------------------------------

export async function writePdf(pages, staticFiles, site, destRoot, { tolerateMissingImages = false, highlightCss = null } = {}) {
  if (!destRoot) {
    throw new Error("writePdf requires a destRoot");
  }
  const pdfRoot = destRoot + PDF_SUFFIX;

  resolveBookPage(pages); // existence check; throws if missing or duplicated

  const { bookHtml, imagePaths } = deriveBookOutputs(pages, site);

  const staticByDestRel = new Map(
    staticFiles.map(s => [s.destRel.replaceAll("\\", "/"), s]),
  );
  await setupPdfDest(pdfRoot);

  const counters = { bookBytes: 0, html: 0, css: 0, images: 0, missing: 0 };
  const missingPaths = [];

  await Promise.all([
    writePdfBook(bookHtml, pdfRoot, counters),
    copyPdfCss(staticByDestRel, highlightCss, pdfRoot, counters),
    copyPdfImages(imagePaths, staticByDestRel, pdfRoot, counters, missingPaths),
  ]);

  reportMissingImages(missingPaths, tolerateMissingImages, counters);
  return counters;
}

// PLAN-8 §4 deps assembly: pure-compute helper. Returns the assembled
// book.html string + the list of relative image paths it references.
// Used by the writer (writePdf above) and by the diff tools.
//
// PLAN-9 §5.9: image-path collection is folded into the assembly
// itself (book.mjs's emitChapter populates a Set as it goes); the
// post-pass `extractImagePaths(bookHtml)` regex sweep is gone.
// `extractImagePaths` is retained below as a fallback/diagnostic
// export for the bulk-triage tools.
export function deriveBookOutputs(pages, site) {
  return assembleBook(site, pages);
}

// PLAN-8 §5.1: locate the one `layout: book-combined` page. Throws on
// zero or multiple matches. Held for assertion only -- the actual
// assembly walks `site.bookData` directly.
function resolveBookPage(pages) {
  const matches = pages.filter(p => p.frontmatter?.layout === "book-combined");
  if (matches.length === 0) {
    throw new Error(
      "Phase 8: no page with `layout: book-combined` found. " +
      "Expected docs/book.html with this frontmatter; check the source tree.",
    );
  }
  if (matches.length > 1) {
    const list = matches.map(p => p.srcRel).join(", ");
    throw new Error(
      `Phase 8: multiple pages with \`layout: book-combined\` found: ${list}. ` +
      "Only one is supported.",
    );
  }
  return matches[0];
}

// ---------------------------------------------------------------------------
// §B  Image-path extraction (port of pdfify.rb's IMG_SRC_RE)
// ---------------------------------------------------------------------------

// Three top-level alternatives, same as pdfify.rb's:
//   1. <code\b[^>]*>...</code>  -- code block; consumed atomically.
//   2. <pre\b[^>]*>...</pre>    -- pre block; same.
//   3. \bsrc=(["'])URL\1        -- a real attribute, page-relative URL
//      only (no leading `/`, `#`, or `scheme:`).
// The code/pre branches make `m[1]` undefined; the loop skips them.
const IMG_SRC_RE =
  /<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>|\bsrc=(["'])((?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\1/g;

export function extractImagePaths(html) {
  const seen = new Set();
  const out = [];
  for (const m of html.matchAll(IMG_SRC_RE)) {
    if (m[1] === undefined) continue;
    const url = m[2];
    const path = url.split(/[?#]/, 1)[0];
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

// ---------------------------------------------------------------------------
// §D  Setup pass
// ---------------------------------------------------------------------------

// PLAN-8 §5.4 + §7.D1: unlike Phase 7's wipe-contents-keep-directory
// pattern, Phase 8 wipes the entire <pdfRoot>/. Mirrors pdfify.rb's
// `rm_rf(dest)` + `mkdir_p(dest)`.
async function setupPdfDest(pdfRoot) {
  if (!isUnderProject(pdfRoot)) {
    throw new Error(`refusing to clean ${pdfRoot}: not under the project tree`);
  }
  await fs.rm(pdfRoot, { recursive: true, force: true });
  await fs.mkdir(pdfRoot, { recursive: true });
}

// ---------------------------------------------------------------------------
// §E  Copy pass
// ---------------------------------------------------------------------------

// PLAN-8 §5.5: write the assembled book.html.
async function writePdfBook(bookHtml, pdfRoot, counters) {
  const dest = path.join(pdfRoot, "book.html");
  await writeFileMkdirp(dest, bookHtml);
  counters.html = 1;
  counters.bookBytes = Buffer.byteLength(bookHtml, "utf8");
  return counters.bookBytes;
}

// Copy the two required CSS files into <pdfRoot>/assets/css/.
// tb-highlight.css is written from the in-memory highlightCss string
// (generated by highlight-theme.mjs during markdownInit); print.css is
// copied from its source path via the staticFiles inventory. Neither
// requires _site/ to exist, so writePdf can run before the write task.
async function copyPdfCss(staticByDestRel, highlightCss, pdfRoot, counters) {
  const warnings = [];
  await runLimited(REQUIRED_CSS, LIMIT, async (rel) => {
    const dest = path.join(pdfRoot, rel);
    await mkdirRec(path.dirname(dest));
    const key = rel.replaceAll("\\", "/");
    if (key === "assets/css/tb-highlight.css" && highlightCss) {
      await safeWrite(dest, () => fs.writeFile(dest, highlightCss, "utf8"));
    } else {
      const sf = staticByDestRel.get(key);
      if (!sf) {
        warnings.push(`missing required asset ${rel}; pagedjs render may break`);
        return;
      }
      await safeWrite(dest, () => fs.copyFile(sf.srcPath, dest));
    }
    counters.css++;
  });
  for (const w of warnings) console.warn(`pdf: ${w}`);
}

// PLAN-8 §5.7: copy every image referenced from book.html to its
// mirrored location under <pdfRoot>/. Missing source paths land in
// missingPaths for the strict-mode reporter.
async function copyPdfImages(imagePaths, staticByDestRel, pdfRoot, counters, missingPaths) {
  await runLimited(imagePaths, LIMIT, async (rel) => {
    const key = rel.replaceAll("\\", "/");
    const staticFile = staticByDestRel.get(key);
    if (!staticFile) {
      missingPaths.push(rel);
      return;
    }
    const dest = path.join(pdfRoot, rel);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.copyFile(staticFile.srcPath, dest));
    counters.images++;
  });
}

// ---------------------------------------------------------------------------
// §F  Missing-image reporting (port of pdfify.rb's strict mode)
// ---------------------------------------------------------------------------

// PLAN-8 §5.8: per-path error log, then throw if !tolerateMissingImages.
// Mirrors pdfify.rb's strict mode -- `jekyll build` aborts on a non-zero
// missing count, `jekyll serve` warns only. `--tolerate-missing-images`
// (PLAN-12 §7.D5) flips the throw to a warning for iterative work.
function reportMissingImages(missingPaths, tolerateMissingImages, counters) {
  counters.missing = missingPaths.length;
  for (const rel of missingPaths) {
    console.error(`pdf: missing image ${rel} (referenced from book.html, not present under source tree)`);
  }
  if (missingPaths.length === 0) return;
  if (tolerateMissingImages) {
    console.warn(`pdf: ${missingPaths.length} image reference(s) missing; PDF render will show broken-image placeholders`);
    return;
  }
  throw new Error(
    `pdf: ${missingPaths.length} image reference(s) in book.html missing under source tree -- see error log above`,
  );
}
