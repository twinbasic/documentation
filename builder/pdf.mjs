// Phase 8 WRITE PDF: produce the sparse `<destRoot>-pdf/` tree that
// pagedjs-cli consumes when rendering the PDF book. See builder/PLAN-8.md
// for the full spec and docs/_plugins/pdfify.rb for the canonical
// Jekyll reference.
//
// One entry point: writePdf(pages, staticFiles, site, destRoot,
// { tolerateMissingImages }). Its pure-compute half, deriveBookOutputs,
// assembles book.html and lists the images it uses without touching
// disk.
//
// Internal sections:
//
//   §A  Top-level orchestration (writePdf entry point)
//   §C  Static-file lookup
//   §D  Copy pass (book.html + CSS + images)
//   §E  Missing-image reporting (port of pdfify.rb's strict mode)

import { promises as fs } from "node:fs";

import path from "node:path";

import { assembleBook, bookCoverage, formatBookCoverage } from "./book.mjs";
import {
  WRITE_LIMIT,
  mkdirRec,
  runLimited,
  safeWrite,
  writeFileMkdirp,
} from "./write.mjs";

const PDF_SUFFIX = "-pdf";
const REQUIRED_CSS = ["assets/css/print.css", "assets/css/tb-highlight.css"];

// The six faces print.css declares, copied into the sparse tree so its
// `url("../fonts/...")` resolves under the file:// URL render-book.mjs loads.
// This list has to stay in step with the @font-face block at the top of
// print.css.
const REQUIRED_FONTS = [
  "assets/fonts/source-serif-4-variable.woff2",
  "assets/fonts/source-serif-4-variable-italic.woff2",
  "assets/fonts/inter-variable.woff2",
  "assets/fonts/inter-variable-italic.woff2",
  "assets/fonts/cascadia-mono-variable.woff2",
  "assets/fonts/cascadia-mono-variable-italic.woff2",
];
const LIMIT = WRITE_LIMIT;

// ---------------------------------------------------------------------------
// §A  Top-level orchestration
// ---------------------------------------------------------------------------

export async function writePdf(pages, staticFiles, site, destRoot, { tolerateMissingImages = false, highlightCss = null, check = false } = {}) {
  if (!destRoot) {
    throw new Error("writePdf requires a destRoot");
  }
  const pdfRoot = destRoot + PDF_SUFFIX;

  resolveBookPage(pages); // existence check; throws if missing or duplicated

  const { bookHtml, imagePaths } = deriveBookOutputs(pages, site);

  const staticByDestRel = new Map(
    staticFiles.map(s => [s.destRel.replaceAll("\\", "/"), s]),
  );
  const counters = { bookBytes: 0, html: 0, css: 0, fonts: 0, images: 0, missing: 0 };
  const missingPaths = [];

  await Promise.all([
    writePdfBook(bookHtml, pdfRoot, counters),
    copyPdfCss(staticByDestRel, highlightCss, pdfRoot, counters),
    copyPdfFonts(staticByDestRel, pdfRoot, counters),
    copyPdfImages(imagePaths, staticByDestRel, pdfRoot, counters, missingPaths),
  ]);

  reportMissingImages(missingPaths, tolerateMissingImages, counters);

  // A page with no _book.yml entry, or an entry with no page: lines for
  // tbdocs to print under the pdf summary. Warnings, never a failure --
  // the book this build wrote is complete for the manifest it was given.
  counters.coverage = formatBookCoverage(bookCoverage(site.bookData, pages));

  // --check: hand the assembled book and the tree's exact contents to
  // the link check rather than making it read 6.5 MB back off disk.
  // `missingPaths` are the images that were NOT copied, so they must
  // not appear in the index -- a reference to one is a broken link and
  // the check should say so.
  if (check) {
    const missing = new Set(missingPaths);
    counters.checkBook = {
      html: bookHtml,
      rels: ["book.html", ...REQUIRED_CSS, ...REQUIRED_FONTS,
             ...imagePaths.filter(r => !missing.has(r))],
    };
  }
  return counters;
}

// PLAN-8 §4 deps assembly: pure-compute helper. Returns the assembled
// book.html string + the list of relative image paths it references.
//
// PLAN-9 §5.9: image-path collection is folded into the assembly
// itself (book.mjs's emitChapter populates a Set as it goes), so there
// is no separate pass over book.html looking for images.
function deriveBookOutputs(pages, site) {
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
// §D  Copy pass
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

// Copy the webfaces print.css declares into <pdfRoot>/assets/fonts/.
//
// This throws where copyPdfCss warns and copyPdfImages collects, because a
// missing face is not a degradation the output survives: the book would set
// that text in whatever the rendering machine happens to own, and embed it,
// which is precisely the machine-dependent artifact self-hosting exists to
// prevent. Downstream would only catch some of it -- the forked paged.js
// rejects a face whose fetch errored, but a declared face the layout never
// exercises is never fetched at all and passes silently. Failing here names
// the path instead.
async function copyPdfFonts(staticByDestRel, pdfRoot, counters) {
  await runLimited(REQUIRED_FONTS, LIMIT, async (rel) => {
    const sf = staticByDestRel.get(rel);
    if (!sf) {
      throw new Error(
        `pdf: required font ${rel} is not in the source tree. Run ` +
        `\`python scripts/build_fonts.py\` and commit docs/assets/fonts/.`,
      );
    }
    const dest = path.join(pdfRoot, rel);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.copyFile(sf.srcPath, dest));
    counters.fonts++;
  });
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
// §E  Missing-image reporting (port of pdfify.rb's strict mode)
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
