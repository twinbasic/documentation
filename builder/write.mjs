// Phase 5 WRITE ONLINE: materialise the in-memory page set, the vendored
// just-the-docs JS, and the static-file inventory onto disk under the
// configured destination root. See builder/PLAN-5.md for the full spec.
//
// One entry point: writePhase(pages, staticFiles, { destRoot, dryRun }).
// Three write surfaces in parallel after a clean-then-write prepare:
//
//   * writePages       -- page.destPath ← page.html (book.html skipped).
//   * copyTheme        -- builder/vendor/just-the-docs/assets/ → <destRoot>/assets/.
//                          Project-owned theme assets (head-nav.css, print.css,
//                          theme-switch.js) live under docs/assets/ and ride
//                          the static-file copy path instead.
//   * copyStaticFiles  -- each staticFile.srcPath → <destRoot>/<destRel>.
//
// No URL rewriting, no auxiliaries (sitemap / robots / search index),
// no redirect stubs, no offline / PDF tree -- those are Phases 6-8.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Vendored just-the-docs runtime JS (just-the-docs.js + vendor/lunr.min.js).
// Everything else the site serves under /assets/ now comes from docs/assets/
// (handled by the static-file copy in copyStaticFiles).
const BUILDER_ASSETS = path.join(__dirname, "vendor", "just-the-docs", "assets");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const LIMIT = 64;

export const WRITE_LIMIT = LIMIT;

// Per-build mkdir cache (cleared at writePhase entry). Avoids ~76% of
// mkdir syscalls on the current ~1,080-file inventory.
const mkdirCache = new Set();
const mkdirInflight = new Map();

export async function writePhase(pages, staticFiles, { destRoot, dryRun = false, generatedAssets = [], baseurl = "" } = {}) {
  if (!destRoot) {
    throw new Error("writePhase requires a destRoot");
  }

  mkdirCache.clear();
  mkdirInflight.clear();

  assertNoDestinationCollisions(pages, staticFiles);

  if (dryRun) {
    const pagesToWrite = pages.filter(p => p.html !== undefined).length;
    const skipped = pages.length - pagesToWrite;
    console.log(`[dry-run] would write ${pagesToWrite} pages (${skipped} skipped), ` +
                `theme assets from ${BUILDER_ASSETS}, ${generatedAssets.length} generated assets, ` +
                `${staticFiles.length} static files to ${destRoot}`);
    return {
      pages: { written: pagesToWrite, skipped },
      theme: { copied: 0 },
      staticFiles: { copied: 0 },
    };
  }

  // Pages, theme assets, and static files run in parallel.
  // Generated assets run after copyTheme as a defensive sequence: should a
  // generated asset ever land at the same rel as a vendored file, the
  // generated content wins. No such collision exists today.
  const [pagesStats, themeStats, staticStats] = await Promise.all([
    writePages(pages, destRoot, LIMIT),
    copyTheme(BUILDER_ASSETS, destRoot, LIMIT, baseurl),
    copyStaticFiles(staticFiles, destRoot, LIMIT, baseurl),
  ]);
  await writeGeneratedAssets(generatedAssets, destRoot, LIMIT, baseurl);

  return {
    pages: pagesStats,
    theme: themeStats,
    staticFiles: staticStats,
  };
}

// ---------- Generated assets (Phase 11 B2) ------------------------------

// Build-time-generated files (`tb-highlight.css` from highlight-theme.mjs
// and `just-the-docs-combined.css` from scss.mjs) written under <destRoot>/.
// Generated CSS goes through the same baseurl rewrite the theme-asset copy
// applies, so `url("/favicon.png")` (from the SCSS `$logo` setting) resolves
// correctly on sub-path deployments.
async function writeGeneratedAssets(assets, destRoot, limit, baseurl) {
  const cssTransform = baseurl ? cssBaseurlTransformer(baseurl) : null;
  await runLimited(assets, limit, async ({ rel, content }) => {
    const out = cssTransform && rel.endsWith(".css") ? cssTransform(content) : content;
    const dest = path.join(destRoot, rel);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.writeFile(dest, out, "utf8"));
  });
}

// ---------- §5.1 prepareDestination -------------------------------------

export async function prepareDestination(destRoot, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would clean ${destRoot}`);
    return;
  }
  if (!isUnderProject(destRoot)) {
    throw new Error(`refusing to clean ${destRoot}: not under the project tree`);
  }
  await fs.rm(destRoot, { recursive: true, force: true });
  await fs.mkdir(destRoot, { recursive: true });
}

export function isUnderProject(destRoot) {
  const rel = path.relative(PROJECT_ROOT, destRoot);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

// ---------- §5.2 writePages ---------------------------------------------

async function writePages(pages, destRoot, limit) {
  let written = 0;
  let skipped = 0;
  await runLimited(pages, limit, async (page) => {
    if (page.html === undefined) {
      // book.html (layout: book-combined) -- Phase 8 owns it.
      skipped++;
      return;
    }
    const dest = path.join(destRoot, page.destPath);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.writeFile(dest, page.html, "utf8"));
    written++;
  });
  return { written, skipped };
}

// ---------- §5.3 copyTheme ----------------------------------------------

async function copyTheme(builderAssetsRoot, destRoot, limit, baseurl) {
  const destAssets = path.join(destRoot, "assets");
  // README.md and other meta-docs in the vendor tree are not deployable
  // assets; the name filter keeps them out of <destRoot>/assets/ should one
  // ever appear under builder/vendor/just-the-docs/assets/.
  return copyTree(
    builderAssetsRoot,
    destAssets,
    limit,
    (name) => name !== "README.md",
    baseurl
      ? { transform: cssBaseurlTransformer(baseurl), extensions: [".css"] }
      : null,
  );
}

// Build-time CSS rewriter for non-empty baseurl deployments. Root-
// absolute `url("/path")` references (e.g. the .site-logo background-
// image's `url("/favicon.png")` in just-the-docs-combined.css) resolve
// to the wrong location when GitHub Pages serves the site under a
// sub-path. Prepending the baseurl makes them resolve correctly without
// requiring a re-extraction of the vendored CSS.
//
// Protocol-relative URLs (`url("//cdn.../foo")`) are left alone via
// the negative lookahead.
function cssBaseurlTransformer(baseurl) {
  return (css) => css.replace(
    /url\((["']?)\/(?!\/)([^)"']*)\1\)/g,
    (whole, q, rest) => `url(${q}${baseurl}/${rest}${q})`,
  );
}

// ---------- §5.4 copyStaticFiles ----------------------------------------

async function copyStaticFiles(staticFiles, destRoot, limit, baseurl) {
  const cssTransform = baseurl ? cssBaseurlTransformer(baseurl) : null;
  let copied = 0;
  await runLimited(staticFiles, limit, async (file) => {
    const dest = path.join(destRoot, file.destRel);
    await mkdirRec(path.dirname(dest));
    if (cssTransform && file.destRel.endsWith(".css")) {
      const raw = await fs.readFile(file.srcPath, "utf8");
      await safeWrite(dest, () => fs.writeFile(dest, cssTransform(raw), "utf8"));
    } else {
      await safeWrite(dest, () => fs.copyFile(file.srcPath, dest));
    }
    copied++;
  });
  return { copied };
}

// ---------- §6.4 assertNoDestinationCollisions --------------------------

function assertNoDestinationCollisions(pages, staticFiles) {
  const pageDests = new Set(
    pages.filter(p => p.html !== undefined).map(p => p.destPath),
  );
  const collisions = staticFiles.filter(s => pageDests.has(s.destRel));
  if (collisions.length > 0) {
    const detail = collisions
      .map(c => `  ${c.destRel} (from ${c.srcPath})`)
      .join("\n");
    throw new Error(
      `destination collision: ${collisions.length} static files would overwrite pages:\n${detail}`,
    );
  }
}

// ---------- §6.1 mkdirRec with cache + inflight collapse ----------------

export async function mkdirRec(dir) {
  if (mkdirCache.has(dir)) return;
  const pending = mkdirInflight.get(dir);
  if (pending) return pending;
  const p = fs.mkdir(dir, { recursive: true }).then(() => {
    mkdirCache.add(dir);
    mkdirInflight.delete(dir);
  });
  mkdirInflight.set(dir, p);
  return p;
}

// ---------- §6.2 runLimited ---------------------------------------------

export async function runLimited(items, limit, fn) {
  if (items.length === 0) return;
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
}

// Phase 6 substeps (redirects, sitemap, search) share this one-shot
// "ensure parent dir then write the file" helper. Centralised so the
// mkdir cache is shared across the orchestrator's later writes too.
export async function writeFileMkdirp(filePath, content) {
  await mkdirRec(path.dirname(filePath));
  await safeWrite(filePath, () => fs.writeFile(filePath, content));
}

// ---------- §6.3 copyTree -----------------------------------------------

async function copyTree(src, dest, limit, filter = null, transformSpec = null) {
  const entries = await collectTreeEntries(src, dest, filter);
  // Directories first, sorted shallow-to-deep, so all mkdir lands before
  // any copyFile.
  const dirs = entries
    .filter(e => e.isDir)
    .sort((a, b) => a.destAbs.length - b.destAbs.length);
  for (const d of dirs) {
    await mkdirRec(d.destAbs);
  }
  const files = entries.filter(e => e.isFile);
  const transformExts = transformSpec ? new Set(transformSpec.extensions) : null;
  await runLimited(files, limit, async (f) => {
    if (transformExts && transformExts.has(path.extname(f.srcAbs))) {
      const raw = await fs.readFile(f.srcAbs, "utf8");
      const out = transformSpec.transform(raw);
      await safeWrite(f.destAbs, () => fs.writeFile(f.destAbs, out, "utf8"));
    } else {
      await safeWrite(f.destAbs, () => fs.copyFile(f.srcAbs, f.destAbs));
    }
  });
  return { copied: files.length };
}

async function collectTreeEntries(src, dest, filter) {
  const out = [];
  async function walk(relPath) {
    const dirents = await fs.readdir(path.join(src, relPath), { withFileTypes: true });
    for (const d of dirents) {
      if (filter && !filter(d.name)) continue;
      const childRel = relPath === "" ? d.name : path.join(relPath, d.name);
      const srcAbs = path.join(src, childRel);
      const destAbs = path.join(dest, childRel);
      if (d.isDirectory()) {
        out.push({ srcAbs, destAbs, isDir: true });
        await walk(childRel);
      } else if (d.isFile()) {
        out.push({ srcAbs, destAbs, isFile: true });
      }
      // Skip sockets, FIFOs, devices, symlinks (defensive).
    }
  }
  await walk("");
  return out;
}

// ---------- §5.6 safeWrite ----------------------------------------------

export async function safeWrite(dest, fn) {
  try {
    return await fn();
  } catch (err) {
    throw new Error(`failed at ${dest}: ${err.message}`, { cause: err });
  }
}
