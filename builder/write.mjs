// Phase 5 WRITE ONLINE: materialise the in-memory page set, the prebuilt
// theme assets, and the static-file inventory onto disk under the
// configured destination root. See builder/PLAN-5.md for the full spec.
//
// One entry point: writePhase(pages, staticFiles, { destRoot, dryRun }).
// Three write surfaces in parallel after a clean-then-write prepare:
//
//   * writePages       -- page.destPath ← page.html (book.html skipped).
//   * copyTheme        -- builder/assets/ → <destRoot>/assets/.
//   * copyStaticFiles  -- each staticFile.srcPath → <destRoot>/<destRel>.
//
// No URL rewriting, no auxiliaries (sitemap / robots / search index),
// no redirect stubs, no offline / PDF tree -- those are Phases 6-8.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILDER_ASSETS = path.join(__dirname, "assets");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const LIMIT = 64;

export const WRITE_LIMIT = LIMIT;

// Per-build mkdir cache (cleared at writePhase entry). Avoids ~76% of
// mkdir syscalls on the current ~1,080-file inventory.
const mkdirCache = new Set();
const mkdirInflight = new Map();

export async function writePhase(pages, staticFiles, { destRoot, dryRun = false } = {}) {
  if (!destRoot) {
    throw new Error("writePhase requires a destRoot");
  }

  mkdirCache.clear();
  mkdirInflight.clear();

  assertNoDestinationCollisions(pages, staticFiles);
  await prepareDestination(destRoot, dryRun);

  if (dryRun) {
    const pagesToWrite = pages.filter(p => p.html !== undefined).length;
    const skipped = pages.length - pagesToWrite;
    console.log(`[dry-run] would write ${pagesToWrite} pages (${skipped} skipped), ` +
                `theme assets from ${BUILDER_ASSETS}, ${staticFiles.length} static files ` +
                `to ${destRoot}`);
    return {
      pages: { written: pagesToWrite, skipped },
      theme: { copied: 0 },
      staticFiles: { copied: 0 },
    };
  }

  const [pagesStats, themeStats, staticStats] = await Promise.all([
    writePages(pages, destRoot, LIMIT),
    copyTheme(BUILDER_ASSETS, destRoot, LIMIT),
    copyStaticFiles(staticFiles, destRoot, LIMIT),
  ]);

  return {
    pages: pagesStats,
    theme: themeStats,
    staticFiles: staticStats,
  };
}

// ---------- §5.1 prepareDestination -------------------------------------

async function prepareDestination(destRoot, dryRun) {
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

async function copyTheme(builderAssetsRoot, destRoot, limit) {
  const destAssets = path.join(destRoot, "assets");
  // README.md is meta-documentation for the builder itself (see
  // builder/assets/README.md -- the re-extraction procedure + CSS
  // class contract); it's not a deployable asset. Skip it so it
  // doesn't show up at <destRoot>/assets/README.md.
  return copyTree(builderAssetsRoot, destAssets, limit, name => name !== "README.md");
}

// ---------- §5.4 copyStaticFiles ----------------------------------------

async function copyStaticFiles(staticFiles, destRoot, limit) {
  let copied = 0;
  await runLimited(staticFiles, limit, async (file) => {
    const dest = path.join(destRoot, file.destRel);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.copyFile(file.srcPath, dest));
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

async function copyTree(src, dest, limit, filter = null) {
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
  await runLimited(files, limit, async (f) => {
    await safeWrite(f.destAbs, () => fs.copyFile(f.srcAbs, f.destAbs));
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
