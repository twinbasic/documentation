# PLAN-1: Phase 1 — DISCOVER (`discover.mjs`)

Detailed implementation plan for the first phase of the tbdocs builder
(`builder/tbdocs.mjs` orchestrator → `discover.mjs`). The builder lives at
the repo root (sibling of `docs/`), not inside it. Read this together with
[PLAN.md](PLAN.md) — it stays the authoritative architecture overview.

The DISCOVER phase has one job: walk the source tree once and produce a
**normalized inventory** that every later phase consumes. No markdown
rendering, no nav computation, no templating. Just files in, structured
records out.

Target: ~50 ms wall time for the current 836 content pages + ~700 static
files on the existing dev machine.

---

## 1. Inputs

### Source root

`docs/` — the directory containing `_config.yml`, `index.md`, `_plugins/`, …
The builder is invoked from the repo root as `node builder/tbdocs.mjs`, with
`docs/` (relative to CWD) as the default source root. An explicit `--src`
flag lets the orchestrator point elsewhere for tests.

Phase 1 accepts an explicit `srcRoot` argument rather than computing it from
`import.meta.url` or `process.cwd()`. This keeps the module pure and
testable. The orchestrator in `tbdocs.mjs` is responsible for resolving the
absolute path (typically `path.resolve(process.cwd(), "docs")`) and passing
it down.

### What we walk

Everything under `srcRoot`, with the exclusion rules below applied.

### Exclusion rules

These rules combine three categories: Jekyll's hardcoded conventions, the
project's `_config.yml` `exclude:` list, and tbdocs-specific opt-outs.

**Excluded directories** (anywhere in the tree, matched by exact basename):

| Path pattern | Why |
|---|---|
| `_*` (any directory whose basename starts with `_`) | Jekyll convention. Catches `_site/`, `_site-offline/`, `_site-pdf/`, `_pdf/`, `_data/`, `_includes/`, `_layouts/`, `_sass/`, `_plugins/`, `_profile/`, and every `_Images/` directory (mermaid source + Affinity Photo `.af` files). The builder itself lives at `../builder/` (outside `docs/`) and isn't part of this walk. |
| `.jekyll-cache` / `.sass-cache` | Jekyll/Sass build caches. |
| `.git` | Just in case fast-glob is pointed at the repo root by accident. |
| `node_modules` | npm convention. |

**Excluded top-level files** (basename match at `srcRoot`):

| File | Why |
|---|---|
| `_config.yml` | Jekyll config, not content. |
| `Gemfile`, `Gemfile.lock` | Ruby toolchain. |
| `.gitignore` | VCS. |
| `*.bat` | Per `_config.yml exclude:` — `build.bat`, `serve.bat`, `check.bat`, `book.bat`, `profile-rbspy.bat`, `profile-rubyprof.bat`. |
| `redirects.json` | Per `_config.yml exclude:`. Note: doesn't currently exist in the tree, but the entry is there to be defensive against future regressions. |

**Excluded patterns — tbdocs-specific:**

| Pattern | Why |
|---|---|
| `**/*.scss` | SCSS sources fed into [`scss.mjs`](scss.mjs) (the only entry point currently lives at `docs/assets/css/just-the-docs-combined.scss`, with partials under `docs/_sass/custom/`). The compiled output is emitted on `generatedAssets` and written by Phase 5's `writeGeneratedAssets`, so letting Phase 1 enumerate the source `.scss` would shadow the generator output. |
| `**/*.mmd` | Mermaid diagram sources fed into [`mermaid.mjs`](mermaid.mjs)'s preprocessor. The `.svg` siblings are kept --- content pages reference those. |

`assets/css/` and `assets/js/` themselves are **not** excluded any more ---
the project-owned theme files now live there (`assets/css/print.css`,
`assets/css/just-the-docs-head-nav.css`, `assets/js/theme-switch.js`) and
ride the normal static-file copy pipeline into `_site/`. Vendored
just-the-docs JS lives under `builder/vendor/just-the-docs/assets/` and
is copied separately by Phase 5's `copyTheme`.

`assets/images/` is also not excluded --- it carries the rendered mermaid
SVGs (`assets/images/mmd/*.svg`) referenced by content pages, plus the
favicon and any content images.

### Assumption: the exclude list is complete

The set above is derived from `_config.yml`, Jekyll's documented defaults,
and a one-time tree audit (`find docs/ -type f -not -path '*/_*'`). The
assumption is that no future content file gets added under
`assets/css/`, `assets/js/`, or any of the `_`-prefixed directories. If
that assumption breaks, Phase 1 will silently drop it — there is no
"shouldn't this have been content?" check.

To detect drift later, the orchestrator should also assert
`pages.length >= 836` after Phase 1 runs (current count). A drop would
indicate either a regression in the exclusion logic or a real content
deletion; either case warrants a look.

---

## 2. Outputs

Phase 1 returns a single object:

```js
{
  pages: Page[],         // Markdown / HTML with frontmatter
  staticFiles: StaticFile[],  // Everything else (images, render-book.mjs, lib/, …)
}
```

### `Page` shape

```js
{
  srcPath: string,        // Absolute path to source file.
  srcRel: string,         // Path relative to srcRoot, POSIX separators.
                          // e.g. "Reference/Core/Const.md", "index.md".
  ext: string,            // ".md" or ".html".
  frontmatter: object,    // Parsed YAML object from gray-matter.
                          //   - Always contains at least { title }.
                          //   - Common keys: title, permalink, parent,
                          //     grand_parent, nav_order, redirect_from,
                          //     vba_attribution, has_toc, layout, sitemap,
                          //     has_children.
                          //   - Values keep their YAML types: numbers stay
                          //     numbers, booleans stay booleans, lists stay
                          //     arrays, strings stay strings.
  rawContent: string,     // Body after frontmatter, exactly as on disk
                          // (LF or CRLF preserved). No transformation.
  permalink: string,      // The canonical URL for the page, starting with
                          // "/". Always set, even when frontmatter omits
                          // permalink — derived from srcRel (see §4).
  destPath: string,       // Output path relative to _site/, POSIX separators
                          // with forward slashes. Always ends in ".html".
                          // See §4 for derivation rules.
  layoutDefault: boolean, // True when the global "layout: default" default
                          // from _config.yml applies (i.e. frontmatter
                          // doesn't override layout). Set here once so
                          // Phase 4 doesn't re-implement defaults logic.
  imageScope: boolean,    // True for files inside any "Images/" path
                          // segment. Mirrors the _config.yml `image: true`
                          // default scope for "*/Images". Currently no page
                          // reads this — included because the default is in
                          // _config.yml and dropping it silently would be a
                          // semantic change.
}
```

### `StaticFile` shape

```js
{
  srcPath: string,        // Absolute source path.
  srcRel: string,         // Path relative to srcRoot, POSIX.
  destRel: string,        // Path relative to _site/, POSIX. By default
                          // equals srcRel — Phase 5 may override but Phase 1
                          // doesn't need to know.
  size: number,           // File size in bytes from stat(). Used by Phase 5
                          // for optional incremental-build heuristics; not
                          // load-bearing.
}
```

### Why these two arrays, not one

Pages and static files have different downstream consumers:

- **Pages** flow through Phase 2 (nav tree), Phase 3 (render), Phase 4
  (template), Phase 5 (write HTML).
- **Static files** only flow through Phase 5 (copy).

Splitting at discover time means downstream phases iterate the right list
without filtering. Phase 2 doesn't need to skip `.png` files; Phase 5's
copy loop doesn't need to skip pages.

---

## 3. Module API

```js
// discover.mjs

/**
 * Walk the source tree and return the inventory.
 *
 * @param {string} srcRoot  Absolute path to the docs/ directory.
 * @returns {Promise<{pages: Page[], staticFiles: StaticFile[]}>}
 */
export async function discover(srcRoot) { … }
```

Single public export. Internal helpers (`parseFrontmatter`,
`computePermalink`, `computeDestPath`, `isExcluded`) stay un-exported.

The function is async because file I/O is async. Internally it should:

1. Glob the tree (one call, with exclusion patterns).
2. `Promise.all`-fan-out the per-file read + frontmatter parse.
3. Compute permalinks/destPaths.
4. Return the assembled object.

No streaming — the dataset is ~3 MB total and fits trivially in memory.

### Determinism

`pages` and `staticFiles` are sorted by `srcRel` (POSIX-collated ASCII).
This makes diffs against subsequent runs stable and gives nav-precompute
a consistent input. fast-glob's order isn't guaranteed cross-platform;
sort explicitly.

---

## 4. Permalink and destPath derivation

### Permalink

For each page:

1. If `frontmatter.permalink` is a non-empty string, use it verbatim. This
   matches Jekyll exactly. (Don't normalize trailing slashes — the trailing
   slash is semantic; see §4.destPath.)
2. Otherwise, derive from `srcRel`:
   - Strip the extension (`.md` or `.html`).
   - Prepend `/`.
   - Replace OS separators with `/` (already POSIX in `srcRel`, but defensive).
   - Append `.html`.

Example for the two pages currently lacking explicit permalink:

| `srcRel` | Derived permalink |
|---|---|
| `Features/Compiler-IDE/CodeLens.md` | `/Features/Compiler-IDE/CodeLens.html` |
| `Features/Standard-Library/File-IO.md` | `/Features/Standard-Library/File-IO.html` |

These match what Jekyll currently produces (verified by `Test-Path
_site/Features/Compiler-IDE/CodeLens.html`).

**Assumption:** the project intent is to eventually add explicit permalinks
to those two pages; the derived URL above matches the path Jekyll already
ships, so existing inbound links don't break.

### destPath

Given a `permalink`, compute `destPath` (relative to `_site/`):

| Permalink form | destPath |
|---|---|
| `/` | `index.html` |
| `/FAQ` (no trailing slash, no extension) | `FAQ.html` |
| `/Features/Advanced/` (trailing slash) | `Features/Advanced/index.html` |
| `/tB/Core/Const` | `tB/Core/Const.html` |
| `/404.html` (extension already present) | `404.html` |
| `/book.html` | `book.html` |
| `/Features/Compiler-IDE/CodeLens.html` (derived) | `Features/Compiler-IDE/CodeLens.html` |

Algorithm:

```js
function computeDestPath(permalink) {
  let path = permalink.startsWith("/") ? permalink.slice(1) : permalink;
  if (path === "") return "index.html";
  if (path.endsWith("/")) return path + "index.html";
  // If the last segment has a recognized HTML-ish extension, leave alone.
  const last = path.split("/").pop();
  if (/\.(html?|xml)$/i.test(last)) return path;
  return path + ".html";
}
```

The extension allow-list is `html`, `htm`, `xml`. The single current page
that hits this branch is `book.html` (and via redirect_from stubs, but
those are Phase 6's problem). If a future page sets `permalink: /foo.txt`,
this rule would let it through unchanged — which matches Jekyll's behavior.

### Why not strip and recompute

A previous draft of this plan considered always treating the permalink as
"a directory" and appending `index.html`. That would change the output
shape for every non-trailing-slash permalink (~730 pages) and break
external inbound links. Don't.

---

## 5. Algorithm

```js
import fg from "fast-glob";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export async function discover(srcRoot) {
  // 1. Glob everything except excluded paths.
  //    fast-glob's `ignore` patterns are gitignore-style.
  const allFiles = await fg("**/*", {
    cwd: srcRoot,
    dot: false,            // Skip dot-files at any level (handles
                           // .gitignore, .jekyll-cache automatically).
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: [
      "_*/**",             // Underscored directories at the root.
      "**/_*/**",          // …and at any depth (catches _Images).
      "**/.git/**",
      "**/node_modules/**",
      "**/*.scss",         // SCSS sources -- compiled by scss.mjs.
      "**/*.mmd",          // Mermaid sources -- compiled by mermaid.mjs.
      // Top-level Jekyll/toolchain files:
      "Gemfile",
      "Gemfile.lock",
      "_config.yml",       // Belt-and-suspenders: _* glob already catches.
      "*.bat",
      "redirects.json",
    ],
  });

  // 2. Sort for determinism.
  allFiles.sort();

  // 3. For each file, decide: page or static?
  const pages = [];
  const staticFiles = [];

  await Promise.all(allFiles.map(async (srcRel) => {
    const srcPath = path.join(srcRoot, srcRel);
    const ext = path.extname(srcRel).toLowerCase();

    if (ext === ".md" || ext === ".html") {
      const raw = await fs.readFile(srcPath, "utf8");
      const parsed = parseFrontmatter(raw, srcRel);
      if (parsed) {
        pages.push(buildPage(srcRel, ext, parsed));
        return;
      }
      // Fall through: .md/.html with no frontmatter is treated as static.
      // (Currently no such files exist in the tree; defensive.)
    }

    const stat = await fs.stat(srcPath);
    staticFiles.push({
      srcPath,
      srcRel: toPosix(srcRel),
      destRel: toPosix(srcRel),
      size: stat.size,
    });
  }));

  // 4. Re-sort the partitioned arrays (Promise.all loses order).
  pages.sort((a, b) => a.srcRel.localeCompare(b.srcRel));
  staticFiles.sort((a, b) => a.srcRel.localeCompare(b.srcRel));

  return { pages, staticFiles };
}
```

### `parseFrontmatter(raw, srcRel)`

Wraps gray-matter. Returns `null` if there's no frontmatter block
(content doesn't start with `---\n`). Otherwise returns gray-matter's
`{ data, content }` plus a hand-rolled `frontmatterPresent` flag.

Gray-matter behavior worth being explicit about:

- It uses `js-yaml` under the hood with safe defaults.
- Numbers stay numbers (`nav_order: 5` → `5`, not `"5"`).
- Booleans stay booleans (`vba_attribution: true` → `true`).
- Lists stay arrays (`redirect_from: [...]` → `[…]`).
- Unquoted strings starting with `#` or `&` (e.g. `title: "&, &="`) require
  quoting in YAML — the source already does this correctly for the four
  affected pages (`Concat.md`, `Multiply.md`, `RightShift.md`,
  `Topic-Preprocessor.md`).

### `buildPage(srcRel, ext, { data, content })`

```js
function buildPage(srcRel, ext, { data, content }) {
  const permalink = computePermalink(data.permalink, srcRel, ext);
  const destPath = computeDestPath(permalink);
  return {
    srcPath: path.join(srcRoot, srcRel),
    srcRel: toPosix(srcRel),
    ext,
    frontmatter: data,
    rawContent: content,
    permalink,
    destPath,
    layoutDefault: data.layout === undefined || data.layout === null,
    imageScope: /(^|\/)Images\//.test(toPosix(srcRel)),
  };
}
```

---

## 6. Design decisions and assumptions

Each item below is a decision the next session would otherwise have to make
in flight. They're called out so they can be revisited deliberately.

### D1. gray-matter, not a hand-rolled parser

Three reasons:

- It matches the YAML semantics Jekyll uses (both go through `safe_load`
  / `safeLoad` family), so frontmatter parse results align without
  per-page workarounds.
- It handles the corner cases (CRLF, BOM, escaped frontmatter delimiters
  inside the body) so we don't have to.
- It's ~50 KB and zero runtime overhead at our scale.

**Trade-off:** adds a dependency. Mitigated by the fact that PLAN.md
already lists it.

### D2. Single-pass discovery of pages and static files

Per the user's choice during planning. Reasons:

- One tree walk is cheaper than two.
- Phase 5's static-file copy needs the same exclude list — duplicating it
  in a second walker invites drift.
- Easier to reason about "did Phase 1 see this file?" — there's one
  answer.

**Trade-off:** discover.mjs has to know about two output shapes. Mitigated
by the clean Page/StaticFile split.

### D3. Permalink defaulting matches Jekyll exactly

Per the user's choice. Reasons:

- Existing inbound links to `/Features/Compiler-IDE/CodeLens.html` stay
  working without a content-side fix.
- Verification by `diff -rq _site/ _site-new/` (per PLAN.md) requires
  byte-equivalent paths.

If a future cleanup adds explicit permalinks to the two affected pages,
the derivation branch becomes dead code — harmless, can be removed when
noticed.

### D4. `_data/book.yml` is NOT loaded in Phase 1

Per the user's choice. Reasons:

- `book.mjs` (Phase 8) is the only consumer. Keeping the read local to
  its module avoids passing data through every intermediate phase.
- Phase 1 stays narrowly focused: file discovery only.

The orchestrator (`tbdocs.mjs`) is responsible for invoking `book.mjs`
with the source root so it can read `_data/book.yml` itself.

### D5. Source-vs-output split is by extension, not by directory

`**/*.scss` and `**/*.mmd` are excluded because they're inputs to
[`scss.mjs`](scss.mjs) and [`mermaid.mjs`](mermaid.mjs) respectively ---
both run before Phase 1 and write either to `generatedAssets` (CSS) or
back under `srcRoot` (the `.svg` siblings the Mermaid preprocessor
emits). Letting Phase 1 enumerate the `.scss` sources would race the
generator output at write time; letting it enumerate the `.mmd` sources
would publish a non-deployable artifact.

The broader `assets/` tree is **not** excluded. Project-owned theme files
(`assets/css/print.css`, `assets/css/just-the-docs-head-nav.css`,
`assets/js/theme-switch.js`) live there and ride the normal static-file
copy pipeline; `assets/images/` carries content images plus the rendered
mermaid SVGs. The vendored just-the-docs runtime JS lives outside
`docs/` under `builder/vendor/just-the-docs/assets/` and Phase 5's
`copyTheme` carries it across separately.

**Risk:** if someone adds a new content asset under `assets/css/` or
`assets/js/` (an inline icon, a tiny utility script), Phase 1 will drop
it silently. The audit assertion in §1 ("Phase 1 page count ≥ 836")
covers page drift but not asset drift. Phase 5's planner should add an
equivalent assertion for the static-file count.

### D6. `lib/` and `render-book.mjs` are kept (treated as static)

These are PDF-rendering Node helpers. They aren't intentionally hosted,
but Jekyll copies them today, so removing them from the output would be a
diff-noise regression. Carry them through unchanged. A future cleanup
might `.gitignore`-style exclude them, but that's out of scope for the
port.

### D7. Frontmatter values are passed through verbatim

Phase 1 does not normalize, lowercase, type-coerce, or validate any
frontmatter field beyond `permalink` (which gets the derivation logic
above). In particular:

- `nav_order` keeps its YAML-parsed type (number vs string), because the
  nav sort logic (Phase 2) bucketizes by type.
- `redirect_from` keeps its array shape (or string, if a page used the
  single-string form).
- `vba_attribution: true` stays the boolean `true`.
- Unknown keys (`has_children`, the single `sitemap: false` on
  `book.html`) are preserved without warning.

### D8. `Page.frontmatterPresent` is implicit, not stored

Every entry in `pages[]` has frontmatter by construction (we only put it
in `pages[]` if `parseFrontmatter` returned a non-null result). So a
separate boolean is redundant.

### D9. No async-throttling or batching

The dataset is ~836 page reads × ~3.6 KB average. Node's libuv pool
handles this in one go. No need for `p-limit` or similar.

If profiling shows file-descriptor exhaustion on a constrained system,
the simplest fix is to switch from `Promise.all` to sequential reads —
still well under the 50 ms target on warm caches.

### D10. POSIX path separators in `srcRel` / `destPath` / `permalink`

The builder runs on Windows (per the environment block in CLAUDE.md);
`fast-glob` and `node:path` on Windows produce backslash separators.
URLs and Jekyll-style permalinks use forward slashes everywhere. Phase 1
converts to forward slashes at the boundary (`toPosix(p) = p.replace(/\\/g, "/")`)
so every downstream phase can treat paths as URL-compatible without
re-checking.

`srcPath` (absolute) keeps the OS-native form because Node's `fs`
functions accept either on Windows but `srcPath` is only used as an
argument to those.

---

## 7. Edge cases

| Case | Handling |
|---|---|
| File with `.md` extension but no frontmatter | Treated as static. (No such files currently; defensive.) |
| File with `.html` extension and frontmatter (`404.html`, `book.html`) | Treated as a page. |
| File with `.html` extension and no frontmatter | Treated as static. (No such files outside `_*` currently.) |
| Page with frontmatter but no `permalink` | Derived from `srcRel` per §4. |
| Page with `permalink: /` (the root) | `destPath = "index.html"`. |
| Page with explicit-extension permalink (`permalink: /404.html`) | Kept as-is; not double-suffixed. |
| Page with `permalink: /tB/Packages/Assert/` (trailing slash) | `destPath = "tB/Packages/Assert/index.html"`. |
| Filenames with spaces (e.g. `Reference/Procedures and Functions.md`, `IDE/Call Stack.md`) | gray-matter and `fs.readFile` both handle them. The derived permalink, if needed, would also contain spaces — but every such file in this tree has an explicit `permalink:` without spaces, so the derivation branch never sees them. |
| YAML frontmatter parse error | Re-throw with the offending file's `srcRel` in the message. Don't silently treat as static — a malformed page is a bug worth surfacing. |
| Symbolic links | Not followed (`followSymbolicLinks: false`). None exist in the tree. |
| Hidden files (dot-files) | Skipped (`dot: false`). |
| Mixed line endings | gray-matter normalises internally; `rawContent` preserves whatever's on disk so downstream markdown rendering sees the same bytes Jekyll's kramdown does. |
| `index.md` files | No special-casing; they're regular pages whose frontmatter `permalink` happens to end in `/`. |

---

## 8. Out of scope (do NOT do in Phase 1)

These belong in later phases. Mentioned here so the implementer doesn't
get tempted.

- **Nav tree, breadcrumbs, nav levels.** Phase 2 (`nav.mjs`).
- **Markdown → HTML rendering.** Phase 3 (`render.mjs`).
- **Liquid / template expansion.** Phase 4 (`template.mjs`).
- **Markdown body content modifications** (heading anchors, admonition
  rewrites, etc.). Phases 3 / 4.
- **`_data/book.yml` parsing.** Phase 8 (`book.mjs`).
- **SEO precompute** (`_seo_full_title` etc.). Phase 2 (`seo.mjs`).
- **Redirect stub generation.** Phase 6 (`redirects.mjs`).
- **Sitemap generation.** Phase 6 (`sitemap.mjs`).
- **`page.url`** in the Jekyll-Liquid sense — the `Page.permalink` field
  here is the canonical URL (always starts with `/`), which is what
  Jekyll exposes as `page.url`. Aliased as needed in later phases; not a
  separate field in Phase 1.
- **Last-modified timestamps.** Only relevant in Phase 4 footer; can be
  read from `fs.stat()` then, no need to plumb through Phase 1.

---

## 9. Verification

### Acceptance checklist for "Phase 1 is done"

1. `discover(srcRoot)` returns an object with `pages` and `staticFiles`
   arrays.
2. `pages.length` equals the current source page count (run
   `find docs -name '*.md' -not -path '*/_*' | wc -l` plus the two HTML
   pages with frontmatter — currently **838**: 836 .md + `404.html` +
   `book.html`).
3. Every entry in `pages` has all six required fields (`srcRel`, `ext`,
   `frontmatter`, `rawContent`, `permalink`, `destPath`).
4. Every `permalink` starts with `/`; every `destPath` is non-empty and
   ends in `.html` (or `.htm`/`.xml` if any future page opts in).
5. No two pages share the same `destPath` (would otherwise overwrite
   silently in Phase 5).
6. No two pages share the same `permalink`.
7. `staticFiles` contains, at minimum: `favicon.png`, `CNAME`,
   `render-book.mjs`, every `Features/Images/*.png`, every
   `lib/*.mjs`, every `Tutorials/*/Images/*.{png,svg}`, every
   `assets/images/mmd/*.{svg,mmd}`.
8. `staticFiles` does **not** contain: anything under `_*/` directories,
   anything under `assets/css/` or `assets/js/`, any `.bat` file, the
   `Gemfile`, the `_config.yml`.

### Recommended test fixtures

A self-contained test (`builder/discover.test.mjs` or wherever the
project lands its tests) should cover at least:

| Fixture | Asserts |
|---|---|
| `Reference/Core/Const.md` (frontmatter with `permalink`, `vba_attribution`, `parent`) | All four kept verbatim; `destPath === "tB/Core/Const.html"`. |
| `Features/Advanced/index.md` (trailing-slash permalink) | `destPath === "Features/Advanced/index.html"`. |
| `index.md` (root permalink, custom layout) | `destPath === "index.html"`; `permalink === "/"`; `layoutDefault === false`. |
| `404.html` (HTML page with frontmatter, explicit-extension permalink) | Picked up as a page; `destPath === "404.html"`. |
| `book.html` (HTML page with `sitemap: false`) | Picked up as a page; `frontmatter.sitemap === false` preserved. |
| `Features/Compiler-IDE/CodeLens.md` (no permalink) | Permalink derived to `/Features/Compiler-IDE/CodeLens.html`. |
| `Reference/Core/Concat.md` (`title: "&, &="`) | Title kept exactly. |
| `_plugins/html-compress.md` (inside `_*` dir) | NOT in either output. |
| `assets/css/print.css` | NOT in either output. |
| `assets/images/mmd/*.svg` | In `staticFiles`. |
| `favicon.png` | In `staticFiles`. |

### Manual smoke check

Run from the repo root:

```sh
node -e "import('./builder/discover.mjs').then(m => m.discover(require('path').resolve('docs'))).then(r => console.log('pages=' + r.pages.length, 'static=' + r.staticFiles.length))"
```

Expected: `pages=838 static=<around 700>`. Exact static count depends on
the current image inventory; spot-check a representative subset.

### Performance smoke check

```sh
node -e "import('./builder/discover.mjs').then(async m => { const t=Date.now(); await m.discover(require('path').resolve('docs')); console.log(Date.now()-t,'ms'); })"
```

Target: **under 100 ms cold, under 50 ms warm.** On a typical dev SSD,
836 small-file reads + 836 YAML parses is in the 30-50 ms range.

If significantly slower, profile gray-matter — it's the only non-trivial
CPU work in the phase.

---

## 10. Dependencies needed for this phase only

Bring in just these (subset of PLAN.md's six):

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3"
  }
}
```

The other four (`markdown-it`, `markdown-it-attrs`, `shiki`, `lunr`) come
in later phases and don't need to be installed yet — but installing all six
at once is fine if the implementer prefers to do `npm install` once.

---

## 11. File layout after Phase 1

```
<repo root>/
  builder/
    PLAN.md         (existing, unchanged)
    PLAN-1.md       (this file)
    package.json    (new — gray-matter + fast-glob deps; "type": "module")
    discover.mjs    (new — the Phase 1 implementation)
    tbdocs.mjs       (new — minimal stub that calls discover() and logs
                     counts; later phases extend it)
  docs/             (the Jekyll source tree; unchanged)
```

Phase 1 deliberately leaves `tbdocs.mjs` as a thin shim. Real orchestration
arrives with Phase 2.

---

## 12. What a "done" Phase 1 enables

After Phase 1 lands, the next session can implement Phase 2 (`nav.mjs`,
`seo.mjs`) consuming `pages[]` without touching the filesystem. That
clean handoff is the whole point of having a discover phase as a
standalone step.
