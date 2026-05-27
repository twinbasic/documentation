# PLAN-5: Phase 5 — WRITE ONLINE (`write.mjs`)

Detailed implementation plan for the fifth phase of the tbdocs builder.
Read this together with [PLAN.md](PLAN.md) (the architecture overview),
[PLAN-1.md](PLAN-1.md) (DISCOVER), [PLAN-2.md](PLAN-2.md) (COMPUTE),
[PLAN-3.md](PLAN-3.md) (RENDER), and [PLAN-4.md](PLAN-4.md) (TEMPLATE).

The WRITE ONLINE phase has one job: take everything the prior four
phases assembled in memory -- per-page `page.html`, the static file
inventory, and the prebuilt theme assets under `builder/assets/` --
and **materialise the online site tree on disk** at the destination
the orchestrator was pointed at (`docs/_site-new/` during the port,
`docs/_site/` once tbdocs replaces Jekyll). No transformation, no
URL rewriting, no auxiliaries -- pure filesystem I/O.

What Phase 5 does NOT do:

- Render markdown, compute nav, wrap chrome (Phases 1-4 already did).
- Generate redirect stub pages from `frontmatter.redirect_from` (Phase 6).
- Generate `sitemap.xml`, `robots.txt`, or `assets/js/search-data.json` (Phase 6).
- Rewrite URLs for the offline tree (`_site-offline/`) -- that's Phase 7.
- Patch `just-the-docs.js` or inject `search-data.js` -- Phase 7.
- Assemble or write `book.html` for the PDF tree (`_site-pdf/`) -- Phase 8.
- Validate links (run `check_links.mjs` against the output -- that's a
  post-build harness, not a phase).

Measured: **~345-465 ms wall time** for the full write set on the
current Windows dev machine, depending on whether `prepareDestination`
pays the recursive-delete cost of an existing tree. Inventory: 837
page HTML writes (838 pages minus `book.html`), 7 prebuilt theme
asset files from `builder/assets/` (the README.md sibling is filtered
out -- §5.3), 234 static files from `staticFiles[]` -- roughly
**~1,078 file operations**. Jekyll's equivalent WRITE phase runs in
~600 ms on the same machine; the JS port hovers under that by
matching Jekyll's per-file write speed and skipping the build
artifacts (per-scheme CSS variants + source maps -- see §7.D9)
Jekyll emits and we don't.

---

## 1. Inputs

### From Phase 1 / Phase 2 / Phase 3 / Phase 4

The `{ pages, staticFiles, site }` object the orchestrator carries
after Phase 4. Phase 5 reads:

| Field | Why |
|---|---|
| `page.destPath` | Output path relative to the destination root. Always ends in `.html` / `.htm` / `.xml`. Set by Phase 1. |
| `page.html` | Complete HTML document string. Set by Phase 4. May be `undefined` for `book.html` (which has `frontmatter.layout: book-combined` and is handled by Phase 8). |
| `staticFile.srcPath` | Absolute source path to the file. |
| `staticFile.destRel` | Path relative to the destination root, POSIX separators. |
| `staticFile.size` | File size in bytes from Phase 1's `fs.stat`. Used for optional progress logging; not load-bearing. |

Phase 5 does NOT read `page.frontmatter`, `page.rawContent`,
`page.renderedContent`, `page.navPath`, `page.breadcrumbs`,
`page.children`, `page.navLevels`, `page.seo*` -- every per-page
derivation Phase 2-4 produced has already been baked into `page.html`.

Phase 5 also does NOT read `site.*` directly for any write decision
-- the page-level `destPath` and `html` are everything the write
needs. The orchestrator passes `site` only so the per-build constants
(destination root, dry-run flag) can be looked up from one place.

### From the prebuilt `builder/assets/` tree

The static theme assets extracted once from Jekyll's output (per
PLAN.md "Static Asset Extraction" §3 and PLAN-4 §1):

```
builder/assets/
  css/
    just-the-docs-combined.css   (288 KB; the compiled theme with custom colours baked in)
    just-the-docs-head-nav.css   (287 B; the per-page nav-prefix override)
    print.css                    (18 KB; the @media print sheet, used by the PDF tree too)
    rouge.css                    (2.3 KB; the syntax-highlight scope-to-colour rules)
  js/
    just-the-docs.js             (19.5 KB; the runtime that wires sidebar/search/copy-button)
    theme-switch.js              (1.2 KB; the dark-mode toggle)
    vendor/
      lunr.min.js                (31 KB; the search runtime)
```

Total: 7 files, ~360 KB on disk. Phase 5 copies the whole tree
verbatim to `<dest>/assets/`. The 7 paths under `assets/` are baked
into the template's `<link rel="stylesheet">` and `<script src="...">`
tags (PLAN-4 §1); changing any path would break the chrome.

### From the destination root (filesystem state)

Whatever was there before. Phase 5 has to decide between three
strategies for handling an existing destination:

1. **Clean-then-write** -- delete the destination directory entirely, then create from scratch.
2. **Merge** -- write over existing files; leave unrelated files alone.
3. **Diff-write** -- only touch files whose content changed.

The recommended choice is §5.1's clean-then-write (matches Jekyll's
behaviour exactly). See §7.D1 for the rationale and §5.1 for the
algorithm.

### From the orchestrator

Two values:

| Value | Default | Source |
|---|---|---|
| `destRoot` | `path.resolve(srcRoot, "..", "_site-new")` during the port; `path.resolve(srcRoot, "..", "_site")` once tbdocs replaces Jekyll. Either way, a sibling of `docs/_data/` and `docs/_plugins/`. | `--dest <path>` CLI flag (extends the existing `--src` flag in `index.mjs`); falls back to the default sibling. |
| `dryRun` | `false` | `--dry-run` CLI flag. When true, Phase 5 logs every intended operation but writes nothing. Useful for verification harnesses and CI smoke tests. |

The orchestrator resolves both at startup and passes them down via
the `site` object (`site.destRoot`, `site.dryRun`) or via direct
arguments to the phase entry point.

### Assumption: the destination root is writable

Phase 5 doesn't check filesystem permissions ahead of time -- it
attempts the write and lets Node throw `EACCES` / `EPERM` if not.
That throw propagates up to the orchestrator's top-level `.catch()`,
which prints and exits non-zero (same as Jekyll's behaviour).

### Assumption: the source tree has not changed since Phase 1

`staticFile.srcPath` was captured at Phase 1; Phase 5 reads each
file fresh from disk for the copy. If a static file was deleted or
modified between Phase 1 and Phase 5, the copy will fail (ENOENT) or
will see new bytes. Both are acceptable -- Phases 1 and 5 typically
run in the same process, sub-second apart, on a content tree the
user isn't actively editing.

If a defensive read becomes desirable later, Phase 1 could optionally
stash file bytes in memory and Phase 5 could write from the buffers
instead of re-reading. Currently not warranted -- the disk read is
fast and the per-file `fs.stat → fs.readFile` round-trip is
indistinguishable from a single `fs.copyFile` call at the OS level.

---

## 2. Outputs

Phase 5 produces a fully populated destination directory on disk.
The shape, after a clean Phase 5 run with current content:

```
<destRoot>/                              ~1,080 files, ~25 MB total
  index.html                             from page.destPath "index.html"
  404.html                               from page.destPath "404.html"
  CNAME                                  from staticFiles[]
  favicon.png                            from staticFiles[]
  Reference.html                         from page.destPath "Reference.html"
                                          (permalink /Reference; no
                                          trailing slash, so the leaf
                                          lands at Reference.html, not
                                          Reference/index.html)
  Reference/
    Operators.html
    ...
    Core/
      Const.html
      ...
    VBA/
      Strings/
        Len.html
        ...
  tB/
    Core/
      Const.html                         (the canonical permalink; redirect_from
                                          /tB/Core/<symbol> on the VBA versions is
                                          a Phase 6 concern)
      ...
  Tutorials/
    ...
  Features/
    ...
  ...
  assets/
    css/
      just-the-docs-combined.css         from builder/assets/
      just-the-docs-head-nav.css         from builder/assets/
      print.css                          from builder/assets/
      rouge.css                          from builder/assets/
    js/
      just-the-docs.js                   from builder/assets/
      theme-switch.js                    from builder/assets/
      vendor/
        lunr.min.js                      from builder/assets/
    images/
      mmd/
        *.svg                            from staticFiles[]
  lib/
    *.mjs                                from staticFiles[]
  render-book.mjs                        from staticFiles[]
```

Three categories of file, written from three sources:

1. **HTML pages** -- one per `page.html` (except `book.html`, which is
   skipped). 837 files on the current site.
2. **Theme assets** -- 7 files from `builder/assets/` copied verbatim.
3. **Static files** -- 234 files from `staticFiles[]` (Phase 1 inventory):
   204 PNG / 3 SVG / 1 GIF content images (`favicon.png` is one of the
   PNGs), `CNAME`, `render-book.mjs` + 23 `.mjs` / `.js` files under
   `lib/`, and the `assets/images/mmd/*` pair (one `.mmd` source + one
   rendered `.svg` -- the SVG is counted in the 3 SVGs above).

### What's NOT in Phase 5's output

The auxiliary files generated by Phase 6 -- `sitemap.xml`,
`robots.txt`, `assets/js/search-data.json` -- are NOT written by
Phase 5. They get written during Phase 6, against the same
destination root, after Phase 5 has finished.

Similarly, `redirect_from` stub pages (every page with a `redirect_from:`
list in its frontmatter generates one or more stub HTML files) are
NOT in Phase 5's output -- Phase 6 (`redirects.mjs`) handles them.

The dead-code CSS files that Jekyll currently emits (the per-scheme
`just-the-docs-{dark,default,light}.css` plus their `.map` files,
plus `just-the-docs-combined.css.map`) are NOT shipped by tbdocs.
See §7.D9 for the rationale and the acceptance-divergence note. The
chrome doesn't reference them, so the only verification cost is a
known-divergence allowance in `diff -rq`.

### Side effects

Filesystem mutations only. Phase 5 doesn't shell out, doesn't
mutate any in-memory data structure, doesn't network. The single
side effect is "the destination tree on disk now matches the
intended output."

### Why no in-memory output

PLAN.md's verification strategy is `diff -rq _site/ _site-new/`. The
diff is over on-disk trees. An in-memory output object would have to
be materialised eventually; doing it once at the end is the same
work. Phase 5 owns the materialisation.

---

## 3. Module split

One new file:

```
builder/
  write.mjs    ~220 lines as shipped. Page writer, asset-tree copy,
               static-file copy, destination cleanup, concurrency
               limiter, progress logging. Single export
               `writePhase(pages, staticFiles, { destRoot, dryRun })`.
               The `site` object isn't passed -- every per-page
               derivation Phases 2-4 produced is already baked into
               `page.html`, and the two per-build constants
               (`destRoot`, `dryRun`) come directly from the
               orchestrator's CLI parser.
```

### Why one module, not three (`pages.mjs` + `assets.mjs` + `static.mjs`)

The three write surfaces share the same concerns:

- **Concurrency limiter.** Every write goes through the same
  `Promise.all`-with-cap pattern (§6.2). Splitting into three modules
  would force each to import or duplicate the limiter.
- **Directory creation.** The page writer needs `mkdir -p` for nested
  paths like `tB/Core/Const.html`; the asset copier needs it for
  `assets/css/`; the static-file copier needs it for
  `assets/images/mmd/`. One helper, used by all three.
- **Error handling.** All three surfaces benefit from the same
  "include the destination path in the error message" wrapper
  (§5.6).

~250 lines is short enough that splitting buys nothing. Reviewer
load is lower with one file.

If a future maintainer wants to split, the per-surface functions
(`writePages`, `copyAssets`, `copyStaticFiles`) are mechanically
extractable. Each takes `(items, destRoot, options)` and returns a
`Promise<void>`.

### Why no `fs-extra` or `cpy` dependency

The three operations Phase 5 needs -- recursive directory create,
file copy, file write -- are all in Node's stdlib (`fs.mkdir` with
`recursive: true`, `fs.copyFile`, `fs.writeFile`). The optional
`fs.cp` (Node 16.7+, stable since Node 22) provides recursive
copying in one call. Both `fs-extra` and `cpy` add a transitive
dependency tree (~15 packages combined) for what reduces to ~30
lines of stdlib code.

The cost of NOT taking the dependency is one helper function
(`copyTree`, §6.3). Worth it.

### Why no stream-based writes

Files are small (~average 28 KB per HTML page; ~9 KB per asset).
Stream pipelines add boilerplate without saving wall time at this
size. `fs.writeFile(path, buffer)` is the right primitive.

---

## 4. Pipeline ordering within Phase 5

```
{ pages, staticFiles, site, options }
   │
   ▼
 [1] assertNoDestinationCollisions(pages, staticFiles)  ← §6.4
       (throws on any page.destPath == staticFile.destRel;
        runs BEFORE prepareDestination so a collision aborts
        without wiping the previous destination)
   │
   ▼
 [2] prepareDestination(destRoot, dryRun)       ← §5.1
       (delete + recreate, or skip if dry-run)
   │
   ▼
 [3] In parallel (Promise.all):
       writePages(pages, destRoot, limit)        ← §5.2
       copyTheme(builderAssetsRoot, destRoot, limit)  ← §5.3
       copyStaticFiles(staticFiles, destRoot, limit)  ← §5.4
   │
   ▼
 [4] summarise(totals)              ← §5.5
       (file counts, byte counts, timing; one log line)
```

Three independent write surfaces, all reading immutable inputs and
writing to disjoint destination subtrees:

- **Pages** write to top-level `<file>.html` or
  `<dir>/.../<file>.html`. Never under `assets/`.
- **Theme assets** write only under `<dest>/assets/css/` and
  `<dest>/assets/js/`. Never elsewhere.
- **Static files** write to `<staticFile.destRel>` -- which is
  whatever the source tree had. The current inventory hits
  `assets/images/mmd/`, top-level `CNAME` / `favicon.png`,
  `render-book.mjs`, `lib/*.mjs`. None overlap with the page-write
  or theme-asset destinations.

The disjointness lets us issue the three in parallel without lock
coordination. The concurrency limiter (§6.2) is per-surface, so the
combined inflight count is `3 × limit` -- which is still bounded.

### Per-write parallelism

Each surface internally uses `Promise.all` with a concurrency cap.
Default cap: **64** concurrent file ops per surface (192 total
across the three). On Windows, libuv's default thread pool is 4
threads, but `fs.writeFile` / `fs.copyFile` are kernel-async on
modern Windows -- the thread pool doesn't bottleneck at this scale.
The 64 cap protects against EMFILE (file descriptor exhaustion) on
constrained systems; on the dev machine, no cap at all also works
(profiled at 0% change in wall time vs cap=64).

If profiling shows the cap is too low (write throughput < expected),
bump it. The arg lives at the top of `write.mjs` as a constant.

### Why prepare-destination is sequential before the parallel writes

Two reasons:

1. **Correctness.** The clean step deletes the existing tree. The
   parallel writers would race the delete if it ran concurrently --
   a page write could land before the matching directory is removed,
   then the delete would either fail (`ENOTEMPTY`) or destroy the
   freshly-written file.
2. **Predictability.** A user-facing error from `prepareDestination`
   (e.g. "destination is locked by another process") has a clean
   single-source point. If it raced with writes, the error message
   would be one of dozens of `EBUSY`s with no obvious culprit.

The prepare step is ~50 ms (recursive delete of a tree with ~1,080
files + recreate). Sequencing it costs that 50 ms; parallelising
would save it but risk the failure modes above.

### Phase 5 init order (one-time)

```js
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILDER_ASSETS = path.join(__dirname, "assets");
const LIMIT = 64;
```

Three lines. Nothing dynamic.

**Why `fileURLToPath`.** `import.meta.url` is a `file://` URL string
(e.g. `file:///D:/OCP/wc/twinBASIC-documentation/builder/write.mjs`),
NOT a filesystem path. Passing it to `path.resolve` or `path.join`
without conversion treats it as a literal directory name and
produces garbage. `fileURLToPath` is the supported conversion.

The same idiom appears in `isUnderProject` (§5.1) -- both spots
need it.

---

## 5. Per-substep specifications

### 5.1. `prepareDestination(destRoot, dryRun)`

**Purpose.** Ensure the destination directory exists and is empty
when Phase 5 begins writing.

**Algorithm.**

```js
async function prepareDestination(destRoot, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would clean ${destRoot}`);
    return;
  }
  // Defensive: refuse to clean a destination outside our project tree.
  // A misconfigured --dest pointing at "/" would otherwise wipe the
  // user's machine.
  if (!isUnderProject(destRoot)) {
    throw new Error(`refusing to clean ${destRoot}: not under the project tree`);
  }
  await fs.rm(destRoot, { recursive: true, force: true });
  await fs.mkdir(destRoot, { recursive: true });
}

// __dirname here is `<repo>/builder` (resolved via fileURLToPath
// at module load; see §4 "Phase 5 init order"). The repo root --
// which is what we want to gate writes against -- is its parent.
const PROJECT_ROOT = path.resolve(__dirname, "..");

function isUnderProject(destRoot) {
  const rel = path.relative(PROJECT_ROOT, destRoot);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
```

**Defensive guard.** The `isUnderProject` check ensures `--dest /`
or `--dest C:\` can't accidentally wipe the user's machine. The
check resolves the destination against the project root (`builder/`'s
parent) and refuses any path that isn't under it. The `rel !== ""`
clause also refuses the project root itself as a destination --
`--dest .` would otherwise wipe the entire repo. Matches common
safety conventions for `rm -rf` wrapper scripts.

**`force: true` on `fs.rm`** suppresses `ENOENT` when the destination
doesn't exist yet (first-ever build). Other errors (EACCES, EBUSY)
propagate.

**Why delete rather than write-over.** Jekyll cleans `_site/` at the
start of every build (`config.keep_files` controls exceptions; not
set on this site). A diff between two builds with different page
sets would show stale files left over from the previous build if we
didn't clean. The clean step is part of "the destination matches the
intended output" -- a stale file is a divergence too.

**Edge case: destination is a symlink.** `fs.rm` with `recursive:
true` follows symlinks and deletes the target tree. If `_site-new`
is a symlink to elsewhere, the elsewhere gets nuked. The
`isUnderProject` guard catches the obvious cases, but a maliciously
constructed symlink could escape. Acceptable risk for a build tool;
users who symlink their build destinations across drive boundaries
are on their own.

**Edge case: file in the destination is locked by another process**
(e.g. Jekyll's `bundle exec jekyll serve` is running and holding
some files open). `fs.rm` raises `EBUSY` / `EPERM`. Propagate the
error with the offending path; the user fixes by stopping the other
process.

### 5.2. `writePages(pages, destRoot, limit)`

**Purpose.** Write each page's `page.html` to `<destRoot>/<page.destPath>`.

**Algorithm.**

```js
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
    await fs.writeFile(dest, page.html, "utf8");
    written++;
  });
  return { written, skipped };
}
```

**`mkdirRec(dir)`** wraps `fs.mkdir(dir, { recursive: true })` with
a small cache so repeated mkdirs against the same directory don't
re-cross the kernel boundary. The cache is per-phase (cleared at
`writePhase` entry); ~200 unique parent dirs across 837 pages means
the cache keeps ~76% of mkdir calls in user-space.

```js
const mkdirCache = new Set();
const mkdirInflight = new Map();
async function mkdirRec(dir) {
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
```

The `mkdirInflight` Map covers a small but real race: when
multiple concurrent workers hit the same uncached path at the
same time, all of them would otherwise call `fs.mkdir` before
the first one's resolution lands in `mkdirCache`. `recursive:
true` makes the redundant calls harmless, but the inflight map
collapses them to one syscall and actually delivers the ~76%
cache-hit ratio the next paragraph claims.

**Encoding.** `utf8`. Matches Jekyll's default (Ruby's `File.write`
uses UTF-8 unless overridden). No BOM, LF line endings (the
`page.html` string the template produced has LF newlines from the
template literal source -- see PLAN-4 §5.1).

**Why `page.html === undefined` is the book bypass.** Per PLAN-4
§5.10, `templatePage` early-returns for `book.html`, leaving
`page.html` as the implicit `undefined`. Phase 5 detects the
sentinel and skips. No throw -- it's an expected condition.

**Why `for (page of pages)` isn't used directly.** A naive sequential
loop is ~10× slower than the throttled parallel pattern. 837 writes
at 0.5 ms each is ~420 ms sequential; with concurrency 64, the
dispatch overhead drops the wall time to ~50-80 ms.

**Edge case: two pages with the same `destPath`.** Phase 1's
acceptance checklist (PLAN-1 §9 item 5) catches this at discover
time. By Phase 5 it can't happen; if it ever did, the second write
would overwrite the first silently. The defensive layer is at Phase 1.

**Edge case: `destPath` of `index.html` and a sibling directory
named `index`.** The Phase 1 derivation never produces such a path
(no current page has both), but if a future page set `permalink:
/index/` (creating `index/index.html`) and another set `permalink:
/index.html`, the writes would land at incompatible paths -- a file
can't be both a directory and a leaf. Node throws `EEXIST` /
`ENOTDIR` on the second write. Acceptable: surface the error.

### 5.3. `copyTheme(builderAssetsRoot, destRoot, limit)`

**Purpose.** Copy `builder/assets/` recursively to `<destRoot>/assets/`,
preserving the subtree structure (css/, js/, js/vendor/) verbatim.

**Algorithm.**

```js
async function copyTheme(builderAssetsRoot, destRoot, limit) {
  const destAssets = path.join(destRoot, "assets");
  // README.md is meta-documentation, not a deployable asset.
  return copyTree(builderAssetsRoot, destAssets, limit,
    name => name !== "README.md");
}
```

The actual recursion lives in §6.3's `copyTree` helper. The two
arguments resolve to `D:\OCP\wc\twinBASIC-documentation\builder\assets`
and `D:\OCP\wc\twinBASIC-documentation\docs\_site-new\assets` on
the current dev machine.

**Why recurse rather than enumerate the 7 known files explicitly.**
A future static-asset add (e.g. a new vendor library, a font file,
an icon SVG) shouldn't require a builder code change. The tree
shape is what's authoritative -- "everything under
`builder/assets/`" is the contract.

**The README filter.** `builder/assets/README.md` documents the
re-extraction procedure and the CSS-class contract (per PLAN-4
§12); it sits next to the assets it documents but should NOT ship
into the rendered site. `copyTheme` passes a per-name filter to
`copyTree` (§6.3) that excludes `README.md` at any depth. Anything
else under `builder/assets/` still ships verbatim -- if a future
contributor adds e.g. a `NOTES.md` or `.DS_Store`, it WILL appear
at `<destRoot>/assets/<name>` unless the filter is extended.

**Optional alternative: `fs.cp(src, dest, { recursive: true })`.**
Available in Node 16.7+ (stable since Node 22). A one-liner:

```js
await fs.cp(builderAssetsRoot, destAssets, { recursive: true, force: true });
```

The trade-off: `fs.cp`'s internal parallelism isn't documented, and
its concurrency cap can't be tuned. For 7 files that's fine; for
the much larger `copyStaticFiles` it's worth checking. Recommended:
use `fs.cp` for `copyTheme` (smaller surface, simpler), use the
custom `copyTree` for `copyStaticFiles` (more files, want explicit
concurrency control). See §6.3 for the custom helper.

**Edge case: `builder/assets/` doesn't exist.** Throws `ENOENT`. The
fix is to extract the assets per PLAN-4 §12. The orchestrator's
top-level `.catch()` surfaces the error with the missing path.

**Edge case: a file under `builder/assets/` is in use by another
process.** `fs.copyFile` raises `EBUSY`. Propagate.

### 5.4. `copyStaticFiles(staticFiles, destRoot, limit)`

**Purpose.** Copy every entry in the Phase 1 `staticFiles[]` inventory
to its `destRel` under `destRoot`.

**Algorithm.**

```js
async function copyStaticFiles(staticFiles, destRoot, limit) {
  let copied = 0;
  await runLimited(staticFiles, limit, async (file) => {
    const dest = path.join(destRoot, file.destRel);
    await mkdirRec(path.dirname(dest));
    await fs.copyFile(file.srcPath, dest);
    copied++;
  });
  return { copied };
}
```

**Why `copyFile`, not `readFile` + `writeFile`.** `fs.copyFile` on
modern Linux/macOS uses the `copy_file_range` syscall (zero-copy);
on Windows it uses `CopyFileExW` (also kernel-level, single syscall
for small files). Both are 2-3× faster than the read+write pattern
for files >4 KB, which describes most of the inventory (PNG / SVG
images, the lunr.min.js vendor bundle).

**Inventory composition** (current production tree, 234 files;
exact counts from running discover.mjs):

| Category | Count | Notes |
|---|---|---|
| Content PNG images (`Tutorials/*/Images/*.png`, `Features/Images/*.png`, `favicon.png`, etc.) | 204 | The bulk. |
| PDF-rendering helpers (`render-book.mjs` + `lib/*.mjs` + `lib/*.js`) | 24 | `render-book.mjs` at the root plus 21 `.mjs` files and 2 `.js` files under `lib/` (paged.js + helpers). The `.js` versus `.mjs` extension split is historical; both ship verbatim. |
| Content SVGs (the two `MonacoArchitecture.svg` plus the one rendered mermaid diagram under `assets/images/mmd/`) | 3 | |
| Mermaid source (`assets/images/mmd/<hash>.mmd`) | 1 | Ships alongside its rendered SVG for reproducibility. Phase 1 includes it; a future cleanup could drop it via the exclude list. |
| Content GIFs (`Tutorials/WebView2/Images/tbWebView2InAForm.gif`) | 1 | |
| `CNAME` (no extension, top-level) | 1 | DNS record for GitHub Pages. |

**Total: 204 + 24 + 3 + 1 + 1 + 1 = 234 files.**

**Edge case: a static file's destination overlaps with a page's
destination.** Phase 1's exclude list ensures `assets/css/` and
`assets/js/` aren't enumerated -- so no static file lands under
`<dest>/assets/css/` or `<dest>/assets/js/`. Pages with permalinks
under `assets/` don't exist on the current site. The defensive
layer is at Phase 1's exclude list and Phase 5's per-write
operations (which would overwrite silently if a true conflict
existed). The unlikely-but-possible failure mode is: a static file
has `destRel = "index.html"` and a page also writes there. Phase 1's
exclude list catches this for the canonical assets; future drift
would need an explicit cross-check at Phase 5 init.

**Optional: cross-check.** A startup assertion in `writePhase` that
no `staticFile.destRel` collides with a `page.destPath` would catch
the drift case for ~1 ms. Recommended; placed in §6.4.

### 5.5. Summary logging

**Purpose.** Print one line summarising what Phase 5 did. Mirrors
the Phase 1-4 per-phase summary lines already in `index.mjs`.

The orchestrator wraps the per-surface counts and the resolved
destination root in a two-line preamble before the existing
`makeTimer` lap line. As shipped:

```
Phase 1+2+3+4+5 done: 838 pages, 234 static files
  wrote: 837 pages (1 skipped), 7 theme assets, 234 static files -> D:\...\docs\_site-new
discover=88ms nav=21ms seo=14ms book=8ms buildInfo=0ms render=1954ms template=584ms write=391ms
```

Implementation: `writePhase` returns the `{ pages, theme,
staticFiles }` counts; the orchestrator's `main` formats and prints
them after `t.lap("write")`. No new logger dependency.

**Verbose mode (`--verbose-write`).** Per-file path log lines for
debugging. Off by default. The shape would be:

```
[write] index.html (12 KB)
[write] tB/Core/Const.html (24 KB)
[copy ] assets/css/just-the-docs-combined.css (288 KB)
[copy ] favicon.png (4 KB)
[skip ] book.html (layout: book-combined)
```

837 + 7 + 234 = 1,078 lines per build. Useful for triage; obnoxious
in normal CI logs. Gate behind the flag.

### 5.6. Error handling

Every filesystem call wraps in a try/catch that re-throws with the
destination path attached:

```js
async function safeWrite(dest, fn) {
  try {
    return await fn();
  } catch (err) {
    throw new Error(`failed at ${dest}: ${err.message}`, { cause: err });
  }
}
```

Used inside each per-write callback. Adds ~50 ns per call (Node's
async-error attribution overhead) -- negligible at this scale.

**Why include the destination in every message.** A bare `EACCES`
or `EBUSY` from Node tells you which syscall failed but not which
of the 1,078 files in the batch. The wrapper makes failures
self-describing without grepping the orchestrator output.

**Why `cause:` and not message concatenation alone.** Preserves
the underlying error code (`err.code`) and stack trace for tooling
that walks the cause chain (Node's default `console.error` printer
does, as of Node 16.9).

---

## 6. Shared helpers

### 6.1. `mkdirRec(dir)` with cache

See §5.2 algorithm. One global `Set` per phase invocation. The cache
is invalidated at `writePhase` entry (not retained across builds,
since the destination may have been cleaned between builds).

Trade-off vs. uncached: ~80% reduction in mkdir syscalls on the
current site (~200 unique parents across 1,078 files). Wall-time
saving on the dev machine: ~20-40 ms. Worth the ~12 lines (cache
Set + inflight Map + the function body).

### 6.2. `runLimited(items, limit, fn)`

Bounded concurrency over an array, returning when all callbacks
resolve. Pure-stdlib implementation:

```js
async function runLimited(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}
```

Each "worker" is a long-lived async function that pulls the next
item via a shared `next` index until the array is exhausted.
`Math.min` handles the case where there are fewer items than the
limit (don't spawn idle workers). The `i = next++` read-and-increment
is safe without an atomic -- JS's single-threaded model guarantees
no two workers see the same `next` value between the read and the
increment.

**Why not `p-limit`.** A 10-line stdlib implementation has no
dependency cost and is fast enough at our scale. `p-limit` is
~30 KB with its deps; not worth it.

**Why FIFO via an index pointer rather than `shift`.** Order
doesn't matter for correctness, but FIFO keeps the progress log
readable (early-listed items log first). `Array.prototype.shift`
is O(n) where n is the current queue length, so processing N
items via repeated `shift` is O(N²) -- ~350K element moves for
N=837 pages. At ~10 ns per move that's ~3-5 ms total, negligible
in absolute terms but easy to avoid:

```js
async function runLimited(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}
```

The shared `next` counter is JS-single-threaded (no atomic
needed); each worker reads-and-increments synchronously inside
the `while` head, then awaits its callback. Result: O(N) total
work, plus the FIFO property preserved.

### 6.3. `copyTree(src, dest, limit)`

Recursive directory copy with bounded concurrency. Used by
`copyTheme` (small tree) and as an option for `copyStaticFiles`
(if the implementer prefers it over the per-file `runLimited` of
`copyFile`).

```js
async function copyTree(src, dest, limit, filter = null) {
  const entries = await collectTreeEntries(src, dest, filter);
  // entries: Array<{ srcAbs, destAbs, isFile, isDir }>
  // Directories first, sorted shallow-to-deep, so all mkdir lands
  // before any copyFile.
  const dirs = entries
    .filter(e => e.isDir)
    .sort((a, b) => a.destAbs.length - b.destAbs.length);
  for (const d of dirs) {
    await mkdirRec(d.destAbs);
  }
  const files = entries.filter(e => e.isFile);
  await runLimited(files, limit, async (f) => {
    await fs.copyFile(f.srcAbs, f.destAbs);
  });
}

async function collectTreeEntries(src, dest, filter) {
  const out = [];
  async function walk(relPath) {
    const dirents = await fs.readdir(path.join(src, relPath), { withFileTypes: true });
    for (const d of dirents) {
      if (filter && !filter(d.name)) continue;
      const childRel = path.join(relPath, d.name);
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
```

The optional `filter` is a per-name predicate (called with the
dirent's basename) that returns true to include, false to skip.
`copyTheme` uses it to exclude `README.md`; `copyStaticFiles`
doesn't call `copyTree` at all (it iterates the Phase 1 inventory
directly), so the filter is currently `copyTheme`-only.

Both `src` and `dest` are passed explicitly down the closure chain.
The flag fields (`isDir` / `isFile`) are set only when truthy;
consumers check with `e.isFile` / `e.isDir` rather than via a
discriminator string.

**Why sequential mkdirs.** The mkdir cache (§6.1) already
deduplicates; the remaining mkdirs are at distinct paths but
parent-then-child ordered. `mkdir -p` is idempotent enough that
issuing all of them in parallel works too, but the parent-then-child
ordering rules out a rare race where a parent's mkdir lands after a
child's `fs.copyFile` initiates (Node's mkdir is atomic per-call,
but the underlying syscall isn't atomic if the parent doesn't
exist on Linux/Windows -- though `recursive: true` handles that).
Sequential is simpler.

**Why skip non-regular files.** Defensive. `builder/assets/` doesn't
contain symlinks or special files today; if a future maintainer adds
one (e.g. a `.gitkeep` symlink), the copy walks past it. If the user
explicitly wants symlink propagation, that's a different feature
(`fs.cp` has a `verbatimSymlinks` option).

### 6.4. `assertNoDestinationCollisions(pages, staticFiles)`

Startup assertion to surface the unlikely "page dest collides with
static file dest" case (§5.4 edge case):

```js
function assertNoDestinationCollisions(pages, staticFiles) {
  const pageDests = new Set(pages.filter(p => p.html !== undefined).map(p => p.destPath));
  const collisions = staticFiles.filter(s => pageDests.has(s.destRel));
  if (collisions.length > 0) {
    const detail = collisions.map(c => `  ${c.destRel} (from ${c.srcPath})`).join("\n");
    throw new Error(`destination collision: ${collisions.length} static files would overwrite pages:\n${detail}`);
  }
}
```

Called from `writePhase` **before** `prepareDestination`. The order
matters: a collision detected after the clean step would have
already wiped the previous `_site-new/` contents, leaving the user
no way to investigate the previous state. Running the assertion
first means a collision aborts the build without any destructive
I/O. Fast (set membership check over ~1,080 entries; <1 ms).

---

## 7. Design decisions and assumptions

### D1. Clean-then-write, not merge-with-existing

Per §5.1. Reasons:

- **Matches Jekyll.** Jekyll cleans `_site/` at the start of every
  build (`config.keep_files` not set on this site). A user
  comparing the two outputs side-by-side expects identical trees
  for identical inputs. Merge semantics would leave Jekyll's
  artefacts (e.g. the per-scheme CSS files we don't ship -- §D9)
  intact in `_site-new/`, polluting the diff.
- **Stale-file correctness.** A page renamed or deleted in the
  source should disappear from the output. Merge semantics would
  silently leave the old file. Clean-then-write makes the output a
  pure function of the input.
- **Predictability.** "Did this file come from this build?" is
  trivially YES under clean-then-write. Under merge, it's a stat-
  vs-build-time check.

Trade-off: a partial-build incremental-write strategy (diff-write,
§1 option 3) would be ~5× faster for tiny edits. We don't have one
yet because (a) cold-build wall time is already ~2-3 s combined and
(b) the existing Jekyll incremental-build mode is rarely used. If
incremental becomes important, layer it on top of Phase 5 with a
`--incremental` flag that swaps the strategy.

### D2. Destination root is `_site-new/` during the port, `_site/` after

Per PLAN.md "Verification Strategy". The flow:

```
1. Jekyll builds  →  docs/_site/         (canonical until cutover)
2. tbdocs builds  →  docs/_site-new/     (during port)
3. diff -rq docs/_site/ docs/_site-new/  (verification)
4. After cutover: tbdocs builds → docs/_site/, Jekyll step retired.
```

The implementer should default to `_site-new/` and add a comment in
the CLI parser noting the cutover plan. The flip is a one-line
config change; nothing in Phase 5's algorithm depends on it.

### D3. Concurrency cap = 64 per surface, 192 across surfaces

Per §4. The number is a defensive cap, not an optimisation. As
shipped at cap=64, the measured wall time on the dev machine is
345-465 ms across consecutive runs -- 50-100 ms of that is
`prepareDestination`'s recursive delete of the previous tree on
subsequent builds (no delete on first build). Earlier draft
projections of ~200 ms (no cap) / ~240 ms (cap=64) / ~360 ms
(cap=8) were optimistic; the implementer-tuning suggestion stands.
Difference between no-cap and cap=64 is within run-to-run noise.
Cap=8 is noticeably slower. 64 remains the sweet spot: well above the
"performance starts to suffer" threshold, well below the OS fd
limit on the most constrained system we care about (Windows
default is ~512 open handles per process for the default heap).

### D4. UTF-8 encoding, LF line endings, no BOM

Per §5.2. Matches Jekyll's output exactly. Jekyll's File.write uses
Ruby's `IO.write(path, content)` which defaults to system encoding
(UTF-8 on the dev machine's PowerShell) and respects the line
endings in the source string. The page strings have LF newlines
from the template literal source; we don't translate to CRLF on
Windows.

A user opening `_site-new/<page>.html` in Notepad on Windows sees
soft-wrapped content (no \r\n line breaks). All modern browsers
parse both. The bytes match Jekyll's output, which is the
verification criterion.

If a future requirement is "the output must match Windows line
endings", flip the writes to use a transform. Currently no use case
demands it.

### D5. `book.html` is detected by `page.html === undefined`, not by `frontmatter.layout`

Per §5.2. Two layers of detection would couple Phase 5 to Phase 4's
internal layout name. The sentinel approach is decoupled: Phase 4
decides which pages to bypass; Phase 5 trusts the decision.

If a future page wants to bypass Phase 5 for a different reason
(e.g. a page that's only used by Phase 6's redirect generation),
the same sentinel works -- Phase 4 just sets `page.html` to
`undefined` and Phase 5 skips. No new conditional needed.

### D6. No `--keep-existing` flag

Per D1. The flag would suggest the destination can have legitimate
pre-existing content that survives a build, which is incompatible
with the clean-then-write semantics. If a user wants to merge
outputs, they should use a higher-level tool (e.g. `rsync`) after
each build.

### D7. No `--watch` mode in Phase 5

Watch-mode incremental rebuilds are a separate feature, not a
Phase 5 concern. The implementer should not bake watch semantics
into `write.mjs`; they belong in a wrapper that re-invokes the
orchestrator. Jekyll's `jekyll serve` is its watch wrapper; tbdocs'
equivalent would be a similar wrapper that calls `index.mjs` in a
loop with debounce.

### D8. The destination guard (`isUnderProject`) is mandatory, not opt-in

Per §5.1. Wiping a wrong directory is catastrophic; the guard adds
~10 lines and 100 ns. The cost-to-protection ratio is overwhelming
in favour of mandatory. There's no user-facing scenario where the
guard prevents a legitimate operation (the user can still point
`--dest` at any subdirectory of the project).

If a future use case demands writes outside the project tree (e.g.
publishing directly to a network share), it should be a separate
phase or a separate tool with its own guards. Not Phase 5's
business.

### D9. Don't ship the per-scheme CSS variants or source maps

Jekyll currently emits 7 extra files under `_site/assets/css/`:

- `just-the-docs-combined.css.map` (CSS source map for the combined sheet)
- `just-the-docs-default.css` (the light-scheme-only CSS)
- `just-the-docs-default.css.map`
- `just-the-docs-dark.css` (the dark-scheme-only CSS)
- `just-the-docs-dark.css.map`
- `just-the-docs-light.css` (the explicit-light-scheme CSS)
- `just-the-docs-light.css.map`

None are referenced by the rendered HTML, the theme JavaScript, or
the inline `<style>` blocks (verified by `grep` in
`docs/_site/index.html` and the two JS files -- zero hits). They
exist because Jekyll's Sass pipeline renders every `.scss` file
under `assets/css/` separately, regardless of whether the output
gets linked.

tbdocs takes the prebuilt `just-the-docs-combined.css` from
`builder/assets/` and skips the per-scheme variants. The bytes
saved are ~440 KB (uncompressed); the load-time impact on
unreferenced files is zero.

**Acceptance-divergence implication.** `diff -rq _site/ _site-new/`
will report these 7 files as "Only in _site". Add them to
`accepted-divergences.mjs` (or wherever Phase 3 introduced the
divergence allow-list) under a comment explaining "dead-code Sass
artefacts; not referenced by any HTML / JS in the chrome."

If a future requirement is "ship them anyway for forward compat",
the fix is to extract them into `builder/assets/css/` -- one-time
copy, no code change.

### D10. Theme assets ship from `builder/assets/`, not from a Sass recompile

Per PLAN.md "Static Asset Extraction". The CSS is compiled once
manually with `sass` when the custom colour scheme changes; the
output bytes live in `builder/assets/css/`. Phase 5 copies them.

Reasons:

- Adding Sass to the JS build would add ~50 MB of deps (dart-sass
  or libsass binding), an order of magnitude more than the rest of
  the tool combined.
- The colour scheme changes rarely (~once a year). One-time recompile
  is cheap.
- The recompile output is deterministic and reviewable -- diffable
  in git.

The recompile procedure should live in `builder/assets/README.md`
(per PLAN-4 §12). A representative invocation:

```sh
cd docs
bundle exec sass _sass/just-the-docs-combined.scss ../builder/assets/css/just-the-docs-combined.css --no-source-map --style=compressed
```

(The exact invocation depends on how the upstream theme exposes the
SCSS entry point; the implementer should iterate.)

### D11. The `assets/images/mmd/` mermaid renders ship as static files

Per Phase 1 (`assets/images/` is NOT excluded -- PLAN-1 §1
"Excluded directories"). The mermaid SVG renders sit alongside their
`.mmd` sources under `docs/assets/images/mmd/`. Phase 1 inventories
both as static files; Phase 5 copies both. The `.mmd` sources are
extra bytes but the build tool shouldn't decide what's "user-facing"
vs "source-only" -- that's a content-side concern.

If a future cleanup wants to ship only the rendered `.svg`s, the
fix is at Phase 1 (extend the exclude list to `assets/images/**/*.mmd`).
Not Phase 5's responsibility.

### D12. `--dry-run` writes nothing, including the destination directory

The `dryRun` flag short-circuits `prepareDestination` and every
write callback. No file mutations occur. Useful for:

- CI smoke tests that want to verify "Phase 5 wouldn't crash" without
  spending the wall time on actual writes.
- Verification harnesses (§10) that check `pages[]` and
  `staticFiles[]` are in a writable state without modifying disk.

The flag does NOT skip the in-memory computation (page assembly,
asset enumeration). Use `--phases=1-4` for that if a phase-skipping
flag ever lands.

### D13. The verification harness owns the post-write checks

Per §10. `writePhase` itself does NOT run `check_links.mjs` or
`diff -rq` -- those are the harness's job. Reasons:

- Separation of concerns: Phase 5 writes; the harness verifies.
- A `--verify` flag inside Phase 5 would mix the two concerns and
  force every build to pay the verification cost.
- The harness can run additional checks (link integrity, search
  index roundtrip, sitemap shape) that Phase 5 has no reason to
  know about.

The harness invokes Phase 5 (via `index.mjs`), then runs its
own checks against the on-disk output.

### D14. The page-write loop reads `page.html` once

`page.html` is a string in V8's heap. Phase 5 passes it directly to
`fs.writeFile` -- no `.toString()`, no `Buffer.from()`, no
intermediate encoding step. Node's `fs.writeFile(path, string,
"utf8")` is implemented as a single buffer encode + write -- the
fastest path. The string is ~28 KB average; the encode is ~20 µs
per page.

If a future optimisation wants to skip the per-write encode (e.g.
by pre-encoding every page's HTML into a Buffer at template time),
the savings are bounded by ~30 ms total (~36 µs × 837 pages). Not
worth complicating the page-level data shape for. Re-evaluate if
Phase 5 ever shows up as the build bottleneck.

### D15. Throw on any I/O error

Per §5.6. No "best-effort" partial writes. If Phase 5 can't write
to one destination, it shouldn't claim success for the others --
that would mask a real problem. The user fixes the error (e.g.
unlocks a file held by another process), re-runs the build.

A previous draft considered catching per-file errors and reporting
a "soft failure list" at the end. Rejected because:

- The CI runner has no way to distinguish "the build succeeded with
  warnings" from "the build succeeded" without parsing logs. A
  non-zero exit code is the universal signal.
- A partial Phase 5 output is unusable -- the offline tree (Phase 7)
  reads it; auxiliary phases (Phase 6, 8) read parts of it. Letting
  a half-built tree downstream is a bigger bug than the original
  I/O error.

### D16. The mkdir cache lives at module scope, cleared at `writePhase` entry

Per §6.1. Alternatives considered:

1. **Phase-scoped cache** (per `writePhase` call) -- current choice.
2. **Process-scoped cache** -- never cleared. Trade-off: persists
   across the rare second `writePhase` call in the same process
   (none currently), but bloats memory if the build is called in a
   long-lived process.
3. **No cache, rely on `recursive: true` idempotence** -- correct
   but slow (~85% redundant syscalls).

The choice is (1). The cache is small (~200 strings × ~40 chars =
~8 KB); clearing at phase entry costs ~1 µs.

### D17. No file modes / permissions are set

`fs.writeFile` and `fs.copyFile` default to the OS umask. On Windows,
that's effectively 644-equivalent (readable by everyone, writable
by owner). On Linux/macOS, the umask is whatever the user's shell
inherits.

Jekyll behaves the same way -- it doesn't `chmod` written files.
The cost of matching is zero; the cost of NOT matching would be a
permissions divergence in the `diff -rq` output (well, `diff -rq`
doesn't check perms by default; the divergence would only surface
if the destination is served via a strict web server). Acceptable
as-is.

### D18. The destination root path is normalised before any I/O

`destRoot` from CLI flags can come in any form (trailing slash,
backslash separators on Windows, relative path). The orchestrator
normalises with `path.resolve()` before passing to `writePhase`:

```js
const destRoot = path.resolve(process.cwd(), opts.dest ?? "../docs/_site-new");
```

Result: absolute path with platform-native separators. Every
downstream `path.join(destRoot, ...)` produces consistent paths,
and the `isUnderProject` guard (D8) works regardless of the input
form.

---

## 8. Edge cases (cross-cutting)

### Pages

| Case | Handling |
|---|---|
| `page.html === undefined` (book.html) | Skip; increment `skipped` counter. No error, no log line (unless `--verbose-write`). |
| `page.html === ""` (defensive: empty body) | Write the empty file. Matches Jekyll. No current page on this site has empty HTML; the case is defensive. |
| `page.destPath` ends in `.xml` or `.htm` | Treated like `.html` -- Phase 1 forbids overlaps and the write is identical. |
| `page.destPath` with leading `/` | Phase 1 strips the leading `/` from `destPath` (per PLAN-1 §4). If a future Phase 1 regression reintroduces it, `path.join(destRoot, "/x")` returns `/x` on POSIX (escaping `destRoot`) and `D:\` on Windows. The `isUnderProject` guard catches the escape; the per-file write fails with a clear path. |
| Two pages with the same `destPath` | Phase 1 acceptance checklist catches this. If it slipped through, the second `writeFile` silently overwrites; no error. |
| Page with a Unicode character in `destPath` | `path.join` handles UTF-8 transparently on all platforms. The current site has no such page; `Reference/Procedures and Functions.md` has spaces but no non-ASCII characters. |
| Page whose parent directory creation race-fails | `mkdirRec` with `recursive: true` is idempotent; multiple workers can hit the same `mkdir` call and only one succeeds (others get `EEXIST` which Node 18+ converts to a no-op when `recursive: true`). |

### Static files

| Case | Handling |
|---|---|
| Source file disappears between Phase 1 and Phase 5 | `fs.copyFile` raises `ENOENT`. Propagate with the source path. |
| Source file is a symlink | `fs.copyFile` copies the target's contents (Node's default; `COPYFILE_FICLONE` etc. don't change this). No current static file is a symlink. |
| Destination directory exists with conflicting content | The Phase 5.1 clean step has already removed the destination; this can't happen during a normal run. If the clean was skipped (manual override), `fs.copyFile` overwrites the existing file. |
| Source file is 0 bytes | Copied as 0 bytes. No special case. |
| `.gitkeep` or other dotfiles under `staticFiles[]` | Phase 1 excludes dot-files (`dot: false`), so they're absent from the inventory. If a future user adds a dot-file content asset (e.g. `.htaccess`), Phase 1 has to be reconfigured first. |

### Theme assets

| Case | Handling |
|---|---|
| `builder/assets/` is empty | `copyTree` walks an empty tree; nothing is copied. No error. The chrome's `<link>` and `<script>` tags then 404 in the rendered site. Mitigation: §10 acceptance check that `<dest>/assets/css/just-the-docs-combined.css` exists after the phase. |
| A new file added under `builder/assets/` | Picked up automatically by the recursive walk. Ships into the output. The implementer should be deliberate about what lands here. |
| A file under `builder/assets/` is open in an editor | `fs.copyFile` on Windows raises `EBUSY` if the source is in use exclusively, which is rare for content files (Notepad doesn't hold an exclusive lock). The error propagates; user closes the editor and re-runs. |

### Destination cleanup

| Case | Handling |
|---|---|
| Destination doesn't exist | `fs.rm` with `force: true` no-ops; `fs.mkdir` with `recursive: true` creates the chain. First-build path. |
| Destination is locked by another process | `fs.rm` raises `EBUSY`. Propagate with the destination path. Common cause: `bundle exec jekyll serve` is running and holding handles. |
| Destination is a file, not a directory | `fs.rm` deletes it; `fs.mkdir` creates the directory. Phase 5 continues. The "lost" file would be a divergence the user notices in their next git status. Mitigation is the `isUnderProject` guard (catches accidental `--dest some-file.txt` invocations). |
| Destination is `/` (root) | The `isUnderProject` guard throws before any I/O. |
| Destination contains a `.git/` directory | `fs.rm` recursively deletes it. Mitigation: the `isUnderProject` guard limits the blast radius to within the project tree; the project's `_site-new/` should not contain a `.git/`. If it does (e.g. `docs/_site/` somehow has a nested git repo), the user fixes the setup. |

### Filesystem-level

| Case | Handling |
|---|---|
| Disk full (`ENOSPC`) | Propagate. The error message is self-explanatory. |
| Read-only filesystem (`EROFS`) | Propagate. |
| `fs.copyFile` triggers Windows Defender / antivirus scan | The scan can stall the write briefly. No special handling; just runs slower. |
| Long path (`> 260` chars on Windows without long-path support) | `fs.writeFile` may fail with `ENAMETOOLONG`. The current deepest path is `docs/_site-new/tB/Packages/WinNativeCommonCtls/Enumerations/MonthViewDayBoldingConstants.html` -- ~95 chars. Headroom is generous; if a future page has a very long URL, the implementer adds the `\\?\` prefix on Windows. |

---

## 9. What's NOT in Phase 5

These belong in later phases. Mentioned here so the implementer
doesn't get tempted.

- **Redirect stub pages from `frontmatter.redirect_from`.** Phase 6
  (`redirects.mjs`). The stub HTML is a different layout (meta-refresh
  + minimal body); generating it is conceptually a "render" task,
  not a "copy" task.
- **`sitemap.xml` generation.** Phase 6 (`sitemap.mjs`). Reads
  `permalink` and `frontmatter.sitemap` (the latter to exclude
  `book.html`); produces one XML document.
- **`robots.txt` generation.** Phase 6 (could live in `sitemap.mjs`
  since the two are related). Trivial single-line content with a
  Sitemap reference.
- **`assets/js/search-data.json` generation.** Phase 6 (`search.mjs`).
  Walks rendered pages, strips HTML tags, splits by headings, emits
  the Lunr-compatible JSON.
- **Offline-tree generation (`_site-offline/`).** Phase 7 (`offline.mjs`).
  Reads Phase 5's output, copies + rewrites URLs.
- **PDF tree generation (`_site-pdf/`).** Phase 8 (`pdf.mjs`).
  Assembles `book.html` from `bookData._chapters`; writes a sparse
  copy of the assets and referenced images.
- **Link checking.** External (`check_links.mjs` in `docs/scripts/`).
  Runs after Phase 5+6 land, against the on-disk output.
- **HTML validation.** Out of scope. The chrome's HTML is built from
  templates that match Jekyll's output byte-for-byte; if Jekyll's
  output validates, ours does too (and vice versa).
- **Compression of output files.** Phase 5 writes uncompressed bytes.
  The deployment toolchain (GitHub Pages) handles gzip on the wire.
- **Cache headers / ETag generation.** Web server's job, not the build
  tool's.

---

## 10. Verification

### Acceptance checklist for "Phase 5 is done"

1. After `node builder/index.mjs` runs on the production tree
   pointed at `docs/_site-new/`:
   - The directory `docs/_site-new/` exists and is non-empty.
   - It contains exactly **837 HTML pages** (838 total minus
     `book.html`). Verify by `find docs/_site-new -name '*.html' | wc -l`.
   - It contains the 7 theme assets at the expected paths:
     - `docs/_site-new/assets/css/just-the-docs-combined.css`
     - `docs/_site-new/assets/css/just-the-docs-head-nav.css`
     - `docs/_site-new/assets/css/print.css`
     - `docs/_site-new/assets/css/rouge.css`
     - `docs/_site-new/assets/js/just-the-docs.js`
     - `docs/_site-new/assets/js/theme-switch.js`
     - `docs/_site-new/assets/js/vendor/lunr.min.js`
   - It contains the static files at their expected paths
     (`favicon.png`, `CNAME`, `render-book.mjs`, `lib/*.mjs`,
     `assets/images/mmd/*.svg`).
2. `docs/_site-new/book.html` does NOT exist (Phase 5 skips it;
   Phase 8 will write it later under `_site-pdf/`).
3. `docs/_site-new/sitemap.xml` does NOT exist (Phase 6 writes it
   later).
4. `docs/_site-new/robots.txt` does NOT exist (Phase 6).
5. `docs/_site-new/assets/js/search-data.json` does NOT exist
   (Phase 6).
6. For a curated set of pages, `docs/_site-new/<destPath>` matches
   `docs/_site/<destPath>` byte-for-byte modulo the accepted
   divergences from Phase 3 / Phase 4. The set:
   - `index.html` (homepage)
   - `404.html` (special-case layout)
   - `tB/Core/Const.html` (representative reference page)
   - `Reference.html` (parent page with children-nav; permalink
     `/Reference` with no trailing slash renders as `Reference.html`,
     not `Reference/index.html`)
   - `Reference/Operators.html` (mid-depth nav page)
7. Full-tree `diff -rq docs/_site/ docs/_site-new/` returns:
   - Zero `Only in _site-new` entries (no extra files we produce).
   - **~300** `Only in _site` entries, all accounted for by §7.D9
     (dead-code CSS) and the Phase 6 pending outputs:
     - **3** Phase 6 auxiliaries not yet written: `sitemap.xml`,
       `robots.txt`, `assets/js/search-data.json`. These clear once
       Phase 6 ships `sitemap.mjs` / `search.mjs`.
     - **~290** Phase 6 redirect stubs not yet written -- one per
       URL listed in each page's `frontmatter.redirect_from`. The
       count varies with the source (~290 on the current site, from
       162 source pages with `redirect_from` lists; PLAN §13). These
       clear once Phase 6 ships `redirects.mjs`. The harness
       computes the expected stub set by mapping each
       `redirect_from` URL through the same `computeDestPath` logic
       Phase 1 uses for `permalink`s.
     - **7** dead-code CSS files: `just-the-docs-combined.css.map`,
       `just-the-docs-dark.css`, `just-the-docs-dark.css.map`,
       `just-the-docs-default.css`, `just-the-docs-default.css.map`,
       `just-the-docs-light.css`, `just-the-docs-light.css.map`.
       These remain permanent accepted divergences -- the chrome
       never references them.
   - **8** `Files differ` entries for HTML pages: all in
     `ACCEPTED_DIVERGENCES` from Phase 3 (non-tB syntax highlighting
     differences). The harness counts these as `diff (accepted)` and
     fails the run only if any non-accepted HTML page differs.
   - Up to **7** `Files differ` entries for `assets/css/*` and
     `assets/js/*` paths: every prebuilt theme asset that has drifted
     from Jekyll's current `_site/assets/` output. These are not a
     Phase 5 bug -- Phase 5 copies whatever bytes are in
     `builder/assets/`. The fix is to re-run the extraction
     procedure in [`builder/assets/README.md`](assets/README.md) so
     the bundled bytes match Jekyll's again. On the current dev
     machine the count is 4 (`just-the-docs-combined.css`,
     `just-the-docs-head-nav.css`, `just-the-docs.js`, `lunr.min.js`),
     all because the assets were last extracted before recent
     just-the-docs / SCSS edits.
8. **(Deferred until Phase 6 lands.)** `check_links.mjs` (in
   `docs/scripts/`) runs cleanly against `docs/_site-new/`. Phase 5
   alone leaves ~290 redirect-stub destinations missing, so
   running the link check now would surface ~290 false positives;
   the harness skips it. After Phase 6 ships `redirects.mjs`, wire
   the call into the harness.
9. Re-running `node builder/index.mjs` against the same source tree
   produces byte-identical output (idempotency): `diff -rq
   _site-new/ _site-new-rerun/` is empty.
10. Performance: full Phase 5 write of ~1,080 files completes in
    **under 500 ms** on the current dev machine. Measured range
    345-465 ms across consecutive runs -- the lower end is a fresh
    `_site-new/` (no `fs.rm` cost in `prepareDestination`), the
    upper end is a subsequent build (must recursively delete ~1,080
    files first; ~50-100 ms on Windows). Target: 240 ms
    (aspirational, currently not hit); soft warning at 240 ms;
    regression alarm at 500 ms.
11. With `--dry-run`: no files are created or modified; stdout
    shows the intended operation counts.
12. With `--dest` pointing at an invalid path (e.g.
    `--dest /tmp/totally-outside-project`): `isUnderProject`
    throws before any I/O.

### Verification harness

`builder/verify-phase5.mjs` follows the verify-phase4 pattern.
It:

1. Runs discover → nav → seo → book → buildInfo → render → template
   → write into a scratch directory (`docs/_site-verify/`).
2. Asserts every item in the checklist above.
3. Walks both trees (`docs/_site/` and `docs/_site-verify/`) and
   diffs them in-process via `fs.readFile` + `Buffer.equals` (no
   shell-out to `diff -rq`), filtering through the three local
   allow-lists (`DEAD_CSS`, `PHASE_6_PENDING_AUX`,
   `collectExpectedRedirectStubs`) plus `ACCEPTED_DIVERGENCES` for
   HTML page content.
4. Re-runs `writePhase` into a sibling scratch
   (`docs/_site-verify-rerun/`) and asserts byte-identical
   idempotency.
5. Exercises the `isUnderProject` guard and the `--dry-run` branch
   directly via the exported `writePhase`.
6. Cleans up both scratch directories on success.
7. Exits non-zero on any required failure.

Estimated harness wall time: ~6-8 s on the current dev machine,
dominated by the per-page byte comparison of all 837 HTML pages and
the idempotency re-run (`writePhase` runs twice; render / template
once). `check_links.mjs` is NOT invoked by the harness -- it's a
separate post-build step that runs against the final `_site-new/`
once Phase 6 has populated the redirect stubs (otherwise it would
fire ~290 false positives for the not-yet-written stubs).

### Triage tooling

The existing `_diff.mjs` / `_diff_all.mjs` scripts (built for
Phase 3 / Phase 4) already compare against `_site/`. After Phase 5
ships, extend them with a `--against-disk` mode that reads from
`docs/_site-new/<destPath>` instead of from in-memory `page.html`.
The scripts already do that for the Jekyll side; the new mode just
flips the comparison target.

Extension:

- `_diff.mjs --against-disk <url>` -- diff
  `docs/_site-new/<destPath>` against `docs/_site/<destPath>`.
- `_diff_all.mjs --against-disk` -- walk every page and diff its
  on-disk form against Jekyll's.

The point is to triage post-write divergences (e.g. a missed
file mode, a hidden BOM that crept in) that the in-memory diff
wouldn't catch.

### Accepted divergences for Phase 5

Phase 5 introduced **no entries in `accepted-divergences.mjs`**.
That module is for per-page HTML content divergences -- the bucket
Phase 3 owns. The file-level divergences Phase 5 surfaces (extra
files in Jekyll's output, missing Phase 6 auxiliaries, missing
redirect stubs) are tracked inside `verify-phase5.mjs` as three
local allow-lists / one helper:

1. **`DEAD_CSS`** -- the 7 per-scheme CSS variants and source maps
   from §7.D9. Permanent.
2. **`PHASE_6_PENDING_AUX`** -- `sitemap.xml`, `robots.txt`,
   `assets/js/search-data.json`. Cleared when Phase 6 lands.
3. **`collectExpectedRedirectStubs(pages)`** -- derives the expected
   stub destinations from each page's `frontmatter.redirect_from`
   list via the same `computeDestPath` shape Phase 1 uses for
   `permalink`s. Cleared when Phase 6 lands.

The current expectation is **zero new Phase 5 accepted divergences
on HTML page content** -- if a page differs, the fix is in Phase 3
or Phase 4, not Phase 5. The 8 currently-differing HTML pages are
all already in `accepted-divergences.mjs` from Phase 3.

If a future divergence is genuinely a file-level thing (e.g. Jekyll
ships another dead-code artefact), add it to the appropriate
`verify-phase5.mjs` allow-list with an inline comment explaining
why.

### Performance smoke check

The orchestrator's `makeTimer().lap("write")` prints a per-phase
ms line:

```
$ node builder/index.mjs
Phase 1+2+3+4+5 done: 838 pages, 234 static files
  wrote: 837 pages (1 skipped), 7 theme assets, 234 static files -> D:\...\docs\_site-new
discover=88ms nav=21ms seo=14ms book=8ms buildInfo=0ms render=1954ms template=584ms write=391ms
```

The harness prints a `WARN` if `write > 240 ms` (soft target) and a
louder `WARN` if `write > 500 ms` (regression cap). Measured
345-465 ms range on the current dev machine -- under the cap,
above the aspirational target. Per PLAN §15 ("don't optimise
prematurely"), left as-is.

### Byte-for-byte parity (the goal)

Phase 5 is the phase where `diff -rq _site/ _site-new/` becomes
the canonical verification, because the per-page output finally
lives on disk in a form `diff` can read. A clean diff on all 837
HTML pages + 7 theme assets + 234 static files (modulo the
accepted divergences listed above) is the bar for "Phase 5 is done."

After Phase 6 lands (the 3 auxiliaries + ~290 redirect stubs), the
"Only in _site" count drops to 7 (the dead-code CSS only).
"Files differ" goes to 8 (the Phase 3 accepted-divergence HTML
pages) plus however many prebuilt theme assets have drifted from
Jekyll's current output; re-running the extraction procedure in
[`builder/assets/README.md`](assets/README.md) clears the asset
drift.

---

## 11. Dependencies needed for this phase only

Phase 5 adds **zero** new dependencies. Cumulative after Phase 5:

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "shiki": "^1.0"
  }
}
```

Everything Phase 5 needs is in Node's stdlib (`node:fs`, `node:path`,
`node:url`). No I/O library, no concurrency library, no recursive
copy package.

---

## 12. File layout after Phase 5

```
<repo root>/
  builder/
    PLAN.md             — architecture overview
    PLAN-1.md           — Phase 1 spec
    PLAN-2.md           — Phase 2 spec
    PLAN-3.md           — Phase 3 spec
    PLAN-4.md           — Phase 4 spec
    PLAN-5.md           — this file
    package.json        — unchanged (no new deps)
    discover.mjs        — Phase 1 (shipped)
    nav.mjs             — Phase 2 (shipped)
    seo.mjs             — Phase 2 (shipped)
    book.mjs            — Phase 2 (shipped); Phase 8 renderer later
    build-info.mjs      — Phase 2 (shipped)
    render.mjs          — Phase 3 (shipped)
    highlight.mjs       — Phase 3 (shipped)
    twinbasic.tmLanguage.json   — Phase 3 (shipped)
    accepted-divergences.mjs    — unchanged by Phase 5 (file-level
                          allow-lists live inside verify-phase5.mjs;
                          see §10 "Accepted divergences for Phase 5")
    template.mjs        — Phase 4 (shipped)
    compress.mjs        — Phase 4 (shipped)
    write.mjs           — §3 + §5 + §6 (~220 lines, NEW)
    index.mjs           — orchestrator extended (CLI: --dest, --dry-run)
    verify-phase1.mjs   — Phase 1 harness (retired Phase 10)
    verify-phase2.mjs   — Phase 2 harness (retired Phase 10)
    verify-phase3.mjs   — Phase 3 harness (retired Phase 10)
    verify-phase4.mjs   — Phase 4 harness (retired Phase 10)
    verify-phase5.mjs   — §10 acceptance harness (NEW) (retired Phase 10)
    _triage.mjs / _diff.mjs / _diff_all.mjs / _spot.mjs   — unchanged;
                          --against-disk mode deferred until a
                          verification scenario actually needs it
    assets/
      README.md         — re-extraction procedure + CSS-class
                          contract (shipped during Phase 5 to close
                          out the Phase 4 §12 TODO)
      css/
        just-the-docs-combined.css
        just-the-docs-head-nav.css
        rouge.css
        print.css
      js/
        just-the-docs.js
        theme-switch.js
        vendor/
          lunr.min.js
  docs/                 — unchanged source
    _site/              — Jekyll's output (canonical until cutover)
    _site-new/          — tbdocs' output (NEW; created by Phase 5)
```

### Extended `index.mjs` orchestrator

```js
import { writePhase } from "./write.mjs";

function parseArgs(argv) {
  const args = { src: "docs", dest: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src") args.src = argv[++i];
    else if (a.startsWith("--src=")) args.src = a.slice("--src=".length);
    else if (a === "--dest") args.dest = argv[++i];
    else if (a.startsWith("--dest=")) args.dest = a.slice("--dest=".length);
    else if (a === "--dry-run") args.dryRun = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

async function main() {
  const { src, dest, dryRun } = parseArgs(process.argv.slice(2));
  const srcRoot = path.resolve(process.cwd(), src);
  // Default dest = sibling of src named _site-new during the port,
  // _site once tbdocs replaces Jekyll. The implementer flips the
  // default in one place when the cutover happens.
  const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site-new"));

  // ... Phase 1 + Phase 2 + Phase 3 + Phase 4 as before ...

  const writeStats = await writePhase(pages, staticFiles, { destRoot, dryRun });
  t.lap("write");

  console.log(`Phase 1+2+3+4+5 done: ${pages.length} pages, ${staticFiles.length} static files`);
  console.log(`  wrote: ${writeStats.pages.written} pages (${writeStats.pages.skipped} skipped), ` +
              `${writeStats.theme.copied} theme assets, ${writeStats.staticFiles.copied} static files`);
  console.log(t.summary());

  return { pages, staticFiles, site, destRoot };
}
```

`writePhase(pages, staticFiles, { destRoot, dryRun })`:

1. Calls `assertNoDestinationCollisions(pages, staticFiles)` (§6.4).
2. Calls `prepareDestination(destRoot, dryRun)` (§5.1).
3. `Promise.all`-fans `writePages`, `copyTheme`, `copyStaticFiles`
   (§5.2 / §5.3 / §5.4).
4. Returns `{ pages: {written, skipped}, theme: {copied}, staticFiles: {copied} }`.

The orchestrator's return value gains `destRoot` so Phase 6 / Phase 7
/ Phase 8 know where to write or read.

---

## 13. What a "done" Phase 5 enables

After Phase 5 lands, the destination tree on disk is a functional
copy of what Jekyll produces (modulo the accepted divergences).
Specifically:

- **`check_links.mjs` runs against `docs/_site-new/`** and validates
  internal link integrity. Until Phase 6 lands, links to redirect
  stubs (~290 of them, from `frontmatter.redirect_from` lists)
  will report as broken; that's expected.
- **A browser can open `file://docs/_site-new/index.html`** and
  navigate the site. Search won't work (the lunr script tag points
  at `/assets/js/search-data.json` which Phase 6 generates), but
  every other interaction works.
- **The deployment toolchain (GitHub Pages serving from `/docs/_site/`)
  can swap to serving from `/docs/_site-new/`** once Phase 6 fills
  in `sitemap.xml`, `robots.txt`, and `search-data.json`. After
  the swap, Jekyll can be retired.

Phase 6 (auxiliaries) writes alongside Phase 5's output:

- **`redirects.mjs`** generates stub pages from
  `frontmatter.redirect_from` and writes them to `destRoot`.
- **`sitemap.mjs`** generates `sitemap.xml` and writes it to
  `destRoot/sitemap.xml`.
- **`search.mjs`** walks Phase 4's `page.html` (or Phase 5's on-disk
  HTML; either works) and writes `destRoot/assets/js/search-data.json`.
- **`robots.txt`** writes a constant string to `destRoot/robots.txt`.

Phase 7 (offline) reads Phase 5's output and copies + rewrites to
`docs/_site-offline/`. Phase 8 (PDF) reads `page.renderedContent`
(in memory) and writes the sparse `docs/_site-pdf/` tree, bypassing
Phase 5 entirely.

### The cutover

The single-commit cutover from Jekyll to tbdocs is captured in
[FUTURE-WORK.md](FUTURE-WORK.md) §C1 (sequenced after every phase
verify is clean on the production tree). Phase 5's role is to make
the `_site-new/` vs `_site/` on-disk diff possible in the first
place -- that's the boundary at which Jekyll's output and tbdocs'
output become directly comparable.

---

## 14. Implementation order

Suggested order for the next session. Each step is independently
verifiable.

1. **Bootstrap `write.mjs` with a stub `writePhase` that throws
   "not implemented".** Wire into the orchestrator. Verify the
   orchestrator picks it up.

2. **Implement `prepareDestination` (§5.1) and `isUnderProject`
   (§5.1 guard).** Test with three cases:
   - Destination doesn't exist (first build).
   - Destination exists and contains stale files (subsequent build).
   - Destination outside the project tree (should throw).

3. **Implement `runLimited` (§6.2) and `mkdirRec` (§6.1).** Unit
   tests aren't strictly required but the implementer should
   sanity-check that:
   - `runLimited([1,2,3,4,5], 2, async x => x*2)` runs 2-at-a-time.
   - `mkdirRec("a/b/c")` followed by `mkdirRec("a/b/d")` only
     calls `fs.mkdir` once per unique path.

4. **Implement `writePages` (§5.2).** Verify by:
   - Running on the production tree pointing at a scratch directory.
   - Confirming `find <scratch> -name '*.html' | wc -l` returns 837.
   - Spot-checking `<scratch>/index.html` matches
     `docs/_site/index.html` byte-for-byte.

5. **Implement `copyTheme` (§5.3) + `copyTree` (§6.3).** Verify by:
   - Confirming `<scratch>/assets/css/just-the-docs-combined.css`
     exists and matches `builder/assets/css/just-the-docs-combined.css`
     byte-for-byte (`fc /b` on Windows, `cmp` on POSIX).
   - Same for the other 6 theme files.

6. **Implement `copyStaticFiles` (§5.4).** Verify by:
   - Confirming `<scratch>/favicon.png` matches `docs/favicon.png`.
   - Confirming `<scratch>/CNAME` matches `docs/CNAME`.
   - Confirming a representative mermaid SVG matches its source.

7. **Implement `assertNoDestinationCollisions` (§6.4).** Sanity:
   no collisions on the current site (the assertion is a no-op
   negative check).

8. **Wire `--dest` and `--dry-run` CLI flags into `index.mjs`.**
   Test with:
   - `node builder/index.mjs --dry-run` (logs only, no I/O).
   - `node builder/index.mjs --dest /tmp/foo` (should fail with
     the isUnderProject guard).
   - `node builder/index.mjs --dest docs/_site-verify` (custom
     scratch dest).

9. **Wire `verify-phase5.mjs`** with the items in §10. Iterate
   until all checks pass.

10. **(Skipped in practice.)** The PLAN draft expected
    Phase 5 to extend `accepted-divergences.mjs` with dead-code-CSS
    and Phase-6-pending buckets. In the shipped harness the three
    file-level allow-lists live as locals inside `verify-phase5.mjs`
    instead (see §10 "Accepted divergences for Phase 5"), keeping
    `accepted-divergences.mjs` focused on per-page HTML content.

11. **Extend `_diff.mjs` / `_diff_all.mjs` with `--against-disk`
    mode.** Optional, but valuable for triage of post-write
    divergences. Not landed alongside the initial Phase 5 ship;
    tracked in [FUTURE-WORK.md](FUTURE-WORK.md) §B12.

12. **Run the full `diff -rq docs/_site/ docs/_site-new/`** and
    iterate on any surfaced byte differences. Most should be in
    the accepted-divergences buckets; any unexpected diff is a bug
    in Phase 3 / Phase 4 / Phase 5 (in order of likelihood) and
    should be tracked back to its source.

Steps 1-7 are mostly mechanical. Step 8 is config plumbing. Step 9
is the verification loop. Step 12 is the triage / cleanup pass.

---

## 15. Notes for the implementer

- **Read PLAN.md's "Verification Strategy" first.** The whole point
  of Phase 5 is to make the on-disk diff possible. The diff is the
  truth; everything else is process.
- **Run `node builder/index.mjs --dry-run` early and often.** It
  catches "I broke the orchestrator wiring" without spending
  seconds on actual I/O.
- **Use absolute paths everywhere.** Phase 5 receives `srcRoot`
  and `destRoot` from the orchestrator and joins via `path.join`.
  Avoid `process.chdir` -- it's brittle and side-effecty.
- **Don't optimise prematurely.** Measured wall time on the dev
  machine is 345-465 ms. The 240 ms aspirational target was a
  projection; the simple-code implementation lands above it but
  comfortably under the 500 ms regression cap. Optimise only if it
  regresses past 500 ms.
- **Watch for Windows line endings.** Node's `fs.writeFile(path,
  string, "utf8")` preserves whatever `\n` / `\r\n` the source
  string has. The template literals in Phase 4 use `\n` only; any
  `\r\n` in the output would indicate a contamination from earlier
  in the pipeline.
- **The 837 vs 838 count discrepancy is the `book.html` bypass.**
  Don't try to "fix" it. PLAN-4 §5.10 explains.
- **Don't write `sitemap.xml` or `robots.txt` from Phase 5 "just
  to be helpful".** Phase 6 owns them. Mixing concerns now makes
  the Phase 6 cutover harder.
- **The `_site-new/` destination is a working directory, not a
  deployment target.** Don't add it to `.gitignore`'s
  allow-list, don't commit it. After cutover, `_site-new/` is
  deleted entirely.
- **Byte parity is the bar.** If `diff -rq` surfaces a 1-byte
  divergence on an HTML page, fix it -- don't accept it. The
  accepted-divergences list is for systemic differences (dead-code
  CSS, Phase 6 dependencies), not per-page byte drift.
- **Phase 5 is "boring" by design.** The hardest decisions
  (clean-vs-merge, concurrency cap, dead-code CSS) are made once
  and don't recur. If the implementation grows beyond ~300 lines,
  something is off -- step back and check the design doc.
