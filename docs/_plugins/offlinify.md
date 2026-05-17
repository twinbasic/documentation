# Offlinify

`_plugins/offlinify.rb` produces a `file://`-browsable copy of the rendered site. Every page-to-page link is rewritten to a page-relative path with an explicit file extension; the two just-the-docs JS functions that break under `file://` are patched; the lunr search index is rewired to load from a `<script src=>` instead of an XHR call. The result is a fully self-contained tree that opens cleanly when you double-click `index.html` on disk — no HTTP server required.

This file sits in `_plugins/` for two reasons: it lives next to the code it documents, and Jekyll's `_plugins/` folder is plugin-only territory, so this Markdown never gets rendered into the public site.

## Why post-process at all?

Three things in a stock Jekyll/just-the-docs build assume an HTTP server is in front of the files:

1. **Root-absolute URLs.** Every `href` and `src` in the rendered HTML starts with `/`, e.g. `/assets/css/just-the-docs-combined.css`. Under `file://` a leading slash resolves against the filesystem root, not the site root, so the asset never loads.

2. **Extensionless permalinks.** The site uses `permalink:` frontmatter like `/tB/Core/Const`, which Jekyll writes to `_site/tB/Core/Const.html`. The HTML refers to it as `/tB/Core/Const` and the server is expected to map that to `Const.html`. Browsers do no such mapping under `file://`.

3. **just-the-docs JS.** `navLink()` matches the active nav entry by string-comparing `document.location.pathname` against link `href` attribute values; under `file://` the pathname is a filesystem path that no link matches, so the sidebar collapses on every navigation. `initSearch()` fires an `XMLHttpRequest` for `/assets/js/search-data.json`; browsers block `file://` XHR for file resources.

Pure Jekyll can't fix any of these. `relative_url` is site-relative, not page-relative — it has no access to the source page's URL when rendering a link, so it can't decide how many `../`s to prepend. Per-page `permalink:` frontmatter overrides any global URL-shape change. And the upstream theme's JS is out of our hands. The fix has to come after render.

## When it runs

Activated by `also_build_offline: true` (the default in `_config.yml`). Reads from `site.dest` (i.e. `_site/`) and writes to `<site.dest>-offline/`. The hook at the bottom of `offlinify.rb`:

```ruby
Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["also_build_offline"]
  Offlinify.run(site, site.dest, "#{site.dest}-offline")
end
```

One Jekyll invocation produces `_site/`, `_site-offline/` (this plugin), and `_site-pdf/` (via `pdfify.rb`). Flip the flag to `false` if you only want the online site.

## The build flow

After Jekyll's WRITE phase completes, the hook fires `Offlinify.run(site, src_dest, out_dest)`, which does the following:

1. **Wipe the output directory's *contents***. The directory itself is preserved across builds — recreating it makes Jekyll's watcher report a bare `_site-offline` change event (no trailing slash, since the directory is momentarily absent at notification time) that the YAML exclude entry `_site-offline` doesn't match (jekyll-watch auto-appends a trailing slash to directory excludes, turning the rule into the regex `_site-offline/`), and the result is an infinite rebuild loop on `jekyll serve`.

2. **Build `site_paths`.** Walk `src_dest` once and bucket every file under its site-rooted forward-slash path (`/tB/Core/Const.html`, `/assets/js/just-the-docs.js`, etc.). The keys are *decoded* — filesystem names like `Form Designer.html` go in literally, not `Form%20Designer.html`. Resolution in `compute_relative` is then an O(1) `Set#include?` probe per candidate, instead of 2-3 `File.file?` syscalls each (very slow on Windows). Without this, the offlinify pass takes ~30 s on this site; with it, the pass is ~3 s.

3. **Normalise `baseurl`.** Read `site.config["baseurl"]`, strip trailing slashes, prepend a leading slash if missing. The result matches the prefix `relative_url` actually emits in the rendered HTML — e.g. `/twinBASIC-docs` on a GitHub Pages project site. Used during URL resolution to strip the prefix before probing `site_paths`.

4. **Walk the source tree.** For each file:
   - If the file matches a pattern in `site.config["offline_exclude"]` (see [Exclude list](#exclude-list)): skip the copy so the online `_site/` keeps it and the offline tree doesn't.
   - `.html`: read once, run three transformation passes in order (absolute-URL rewrite, relative-URL rewrite, search-setup injection), write back if any pass changed content.
   - `.css`: read, run the `url()` rewrite, write back.
   - Anything else (images, fonts, JSON, JS): plain `FileUtils.cp` into the offline tree.

5. **Patch `assets/js/just-the-docs.js`.** Replace the `navLink()` and `initSearch()` function bodies with offline-friendly versions.

6. **Generate `assets/js/search-data.js`.** Read the rendered `search-data.json` (it's only present when `search_enabled` is true, which is the default in `_config.yml`), wrap in `window.SEARCH_DATA = {...};`, write next to the JSON.

7. **Log the summary.** Three or four lines under the `Offlinify:` topic prefix, ending with `Offlinifier ran in Xms.` — same shape as the `build-phase-timing.rb` plugin's lines, so the cost shows up next to Jekyll's own phase timings.

## Transformation passes

### Pass 1: absolute URL rewriting (HTML)

Regex: `\b(href|src)=(["'])(\/(?!\/)[^"']*)\2` — captures `href` or `src` attribute values that start with a single `/` (not `//`, which is protocol-relative).

For each match, `compute_relative` does the following:

1. **Split off query/fragment.** `#section` and `?foo=bar` are preserved verbatim onto the rewritten URL.

2. **Percent-decode the path.** `/Tutorials/CustomControls/Form%20Designer` becomes `/Tutorials/CustomControls/Form Designer` so it can be compared against the literal filesystem-derived keys in `site_paths`.

3. **Strip the baseurl prefix.** If `baseurl` is `/twinBASIC-docs` and the URL is `/twinBASIC-docs/tB/Core/Const`, the path becomes `/tB/Core/Const`. Two forms are handled: an exact match (`/twinBASIC-docs` → `/`) and a normal subpath (`/twinBASIC-docs/foo` → `/foo`).

4. **Probe three candidates against `site_paths`.** In priority order:
   - `<path>` as-is — e.g. `/assets/css/just-the-docs-combined.css` matches its own file.
   - `<path>.html` — e.g. `/FAQ` → `/FAQ.html`. Only tried if the path has no extension and doesn't end with `/`.
   - `<path>/index.html` — e.g. `/Tutorials/CEF/` → `/Tutorials/CEF/index.html`.

   First hit wins. A miss means the URL stays as-is and the unresolved counter increments (reported in the build summary).

5. **Compute the page-relative URL.** Find the longest common prefix between the source file's directory segments (computed once per file by `file_dir_segs_from_rel`) and the target's path segments (cached globally by `seg_cache`). Emit `"../" * (depth - common) + encoded_segs[common..].join("/")`. Re-encode only path segments that contain reserved characters; URL-safe segments pass through verbatim and share strings between the decoded and encoded arrays.

6. **Reattach the query/fragment tail.**

Worked example: from `_site-offline/tB/Core/Const.html`, the input URL is `/twinBASIC-docs/Tutorials/CustomControls/Form%20Designer#section`.

```
raw           = "/twinBASIC-docs/Tutorials/CustomControls/Form%20Designer#section"
path/sep/tail = "/twinBASIC-docs/Tutorials/CustomControls/Form%20Designer" / "#" / "section"
decoded       = "/twinBASIC-docs/Tutorials/CustomControls/Form Designer"
after strip   = "/Tutorials/CustomControls/Form Designer"
candidates    = ["/Tutorials/CustomControls/Form Designer",
                 "/Tutorials/CustomControls/Form Designer.html",
                 "/Tutorials/CustomControls/Form Designer/index.html"]
matched       = "/Tutorials/CustomControls/Form Designer.html"
file_segs     = ["tB", "Core"]
target_segs   = ["Tutorials", "CustomControls", "Form Designer.html"]   (decoded)
encoded_segs  = ["Tutorials", "CustomControls", "Form%20Designer.html"]
common        = 0
ascend        = "../../"
descend       = "Tutorials/CustomControls/Form%20Designer.html"
result        = "../../Tutorials/CustomControls/Form%20Designer.html#section"
```

**Code-block skip.** Before the rewrite regex runs, the file's content is scanned once for `<code>…</code>` and `<pre>…</pre>` blocks. The byte ranges of their bodies are passed to the regex callback, which returns the match verbatim when the match offset falls inside any range. The skip has two consequences:

- Example URLs in tutorial code samples (e.g. `<script src="/script.js">` displayed verbatim in a CEF page) are not rewritten and **don't count toward the "unresolved" counter**. The unresolved counter is now a real bug signal: anything it reports is either a broken source link or an upstream-theme change.
- Rouge's syntax highlighter HTML-escapes `<` and `>` inside code but leaves `"` alone, so `src="/foo"` survives literally inside `<code>` bodies and would otherwise match the absolute-URL regex. The code-block skip is what makes this invisible.

The same skip applies to Pass 2 (relative URLs).

### Pass 2: relative URL rewriting (HTML)

Some links come from markdown sources verbatim, e.g. `[Description](Attributes#description)` in `Const.md`. Jekyll passes these through without applying `relative_url`, so they reach the rendered HTML as page-relative URLs (no leading slash) without a baseurl prefix. The absolute-URL regex from Pass 1 doesn't match them — its alternation requires `\/(?!\/)` at the start.

Pass 2 catches them. The regex `\b(href|src)=(["'])((?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\2` matches attribute values that:

- Do **not** start with `#` (fragment-only, leave alone).
- Do **not** start with `/` (handled by Pass 1).
- Do **not** start with `scheme:` (where `scheme` is any valid RFC 3986 scheme: `http:`, `mailto:`, `tel:`, `javascript:`, etc.).
- Have at least one character.

`compute_rel_url` resolves the match in three steps:

1. **Normalise the relative path** against the current page's directory segments. `..` pops the stack, `.` and consecutive slashes are skipped, anything else is pushed. The result is an absolute site path (`/tB/Core/Attributes` for the `Attributes` example, starting from `tB/Core/Const.html`).

2. **Probe the same three candidates** as Pass 1.

3. **Append the matching suffix to the *original* relative URL.** Crucially, the output is the original raw plus the suffix that worked — not a freshly computed relative path. From the `Attributes#description` example: the path is already correctly relative to the current page (same directory), the only fix needed is `.html`. So `Attributes` → `Attributes.html` and the original `#description` tail is reattached, giving `Attributes.html#description`.

If the original is already correct (e.g. `href="foo.html"` where `foo.html` exists), the probe of `<path>` matches and the suffix is empty — the URL is left untouched and the match doesn't contribute to the "changed" count. If no candidate matches, the URL is left as-is and the unresolved counter is incremented.

Matches inside code-block bodies are skipped here too (see the note above Pass 2's heading).

### Pass 3: search-setup injection (HTML)

Two `<script>` elements are inserted right before the existing `<script src="...just-the-docs.js">` tag in each rendered HTML:

```html
<script>window.OFFLINE_SITE_ROOT="../../";</script>
<script src="../../assets/js/search-data.js"></script>
```

- `window.OFFLINE_SITE_ROOT` is the per-page relative prefix from the page's directory to the offline site root. Computed from the same `file_segs` the URL rewriter uses — empty string at root, `"../../"` at depth 2, etc. The patched `initSearch()` reads this to convert search-result URLs into page-relative paths.

- `<script src="...search-data.js">` loads the lunr index data into `window.SEARCH_DATA`. Loaded as a classic script tag, which browsers allow under `file://` (the same-origin restriction is on `fetch`/`XHR`, not script execution).

Both run in source order before `just-the-docs.js`, so the globals are populated before the document-ready callback fires `initSearch()`.

The injection finds the just-the-docs.js script tag via a regex that captures the relative-path prefix in the existing tag's `src` attribute (e.g. `../../assets/js/`). The same prefix is reused for the new `search-data.js` reference. This works because Pass 1 has already converted the just-the-docs.js `src` from root-absolute to page-relative form by the time Pass 3 runs.

### CSS `url()` rewriting

The just-the-docs theme ships `background-image: url("/favicon.png")` for the site logo. Without rewriting, this would fail under `file://`.

The regex `url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)` matches `url(...)` references whose URL starts with a single slash, optionally wrapped in quotes. The rewrite uses the same `compute_relative` as Pass 1.

In the CSS file the source dir is `_site-offline/assets/css/` so the rewrite emits `url("../../favicon.png")`.

### JS patches

Both patches go into `_site-offline/assets/js/just-the-docs.js`. Each is a full function-body replacement matched by a regex anchored on the upstream function signature and a stable trailer. A miss emits a warning that points at the constant to update — the early-warning signal that just-the-docs has shipped a new version of the function.

**`navLink()` patch.** The upstream version matches the active nav entry by string-comparing `document.location.pathname` against link `href` attribute values. Under `file://`, `pathname` is the document's filesystem path (`/D:/.../Const.html`) and the nav `href` attributes are page-relative (`Const.html`). No selector matches, so no nav-list-item gets `class="active"` and the sidebar appears collapsed on every navigation.

The patched version compares the link's resolved `.href` DOM property (an absolute URL the browser produced from the relative attribute) against `window.location.href`:

```js
function navLink() {
  var here = window.location.href.split('#')[0].split('?')[0];
  var links = document.getElementById('site-nav').querySelectorAll('a.nav-list-link');
  for (var i = 0; i < links.length; i++) {
    if (links[i].href === here) return links[i];
  }
  return null;
}
```

Works in both online (`https://...`) and offline (`file:///...`) contexts.

**`initSearch()` patch.** The upstream version fires `XMLHttpRequest` for `/assets/js/search-data.json` and builds a lunr index from the response. Browsers block `file://` XHR for file resources, so the request fails silently in `request.onerror` and the search box is non-functional.

The patched version reads `window.SEARCH_DATA` directly (preloaded by the per-page `<script src="search-data.js">` tag), rewrites each `doc.url` from a root-absolute permalink (`/tB/Core/Const`) to a page-relative path (`<OFFLINE_SITE_ROOT>tB/Core/Const.html`), then builds the lunr index and hands it to `searchLoaded(index, docs)`. The URL transformation mirrors the rules in the Ruby `compute_relative`: trailing slash → `index.html`, no extension → `.html`, `#fragment` preserved. `searchLoaded` is left unchanged — it just reads the now-modified `doc.url` values as click targets.

A subtle but important detail: the patched code reads `doc.relUrl`, not `doc.url`, as the *source* of the rewrite. `search-data.json` contains both fields — `url` has the baseurl prefix (since `absolute_url` produced it), `relUrl` does not. By using `relUrl` we avoid having to also strip a baseurl prefix that varies between deployments.

### search-data.js generation

After the per-file walk, `build_search_data_js!` reads `_site-offline/assets/js/search-data.json` and writes a sibling `search-data.js` containing:

```js
window.SEARCH_DATA = { ...the JSON contents... };
```

A single line is prepended to the JSON contents; the structure is otherwise unchanged. The `.json` file is left in place — it's no longer used by the offline build but removing it has no benefit and keeps the offline tree closer to the online layout.

If `search-data.json` doesn't exist (e.g. someone has set `search_enabled: false` in a custom config overlay), the step is a no-op. The per-page script injection still inserts the `<script src="...search-data.js">` tag; under `file://` it'll 404 silently and the patched `initSearch()` will log a console message and return early.

## Exclude list

Some files Jekyll writes to `_site/` make sense on a live HTTP-served deployment but are pointless under `file://`:

- `CNAME` is GitHub Pages' custom-domain config.
- `sitemap.xml` and `robots.txt` are for search-engine crawlers.
- `redirects.json` is jekyll-redirect-from's machine-readable output.
- `*.bat` are Windows build helpers Jekyll picks up from the source directory and copies into `_site/` because it doesn't know they aren't content.

The offline copy drops these. The list lives in `_config.yml` as `offline_exclude:`, so editing the policy doesn't require touching the plugin:

```yaml
offline_exclude:
  - CNAME
  - robots.txt
  - sitemap.xml
  - redirects.json
  - "*.bat"
```

Patterns are `File.fnmatch`-style with `File::FNM_PATHNAME`, matched against each file's site-rooted forward-slash path. `*` does **not** cross directory separators, so `*.bat` catches only top-level `.bat` files; use `**/*.bat` to match at any depth. Specific paths like `subdir/foo.txt` also work and match exactly.

A missing or empty `offline_exclude` entry skips the step entirely — the offline tree gets every file Jekyll produced.

The exclude check runs in two places:

1. **Before** the `site_paths` Set is built, so URL-resolution candidates can't point at an excluded target (a stray `<a href="/sitemap.xml">` in the source would simply fail to resolve, instead of resolving to a now-missing file).
2. **Inside** the main file walk, where the copy is skipped so the file never appears in `_site-offline/`.

The summary log line reports the count: `… excluded 7 file(s) …`.

## Caches

Three caches keep the per-match work to a single Hash lookup once warmed up:

1. **`site_paths`** (`Set` of strings). Built once at the start of `run`. Every file path under `src_dest`, keyed by its site-rooted forward-slash form (`/tB/Core/Const.html`). Used by `compute_relative` and `compute_rel_url` to probe candidate paths.

2. **`seg_cache`** (`Hash` of `site_path` → `[decoded_segs, encoded_segs]`). Lazily populated. For each unique target site path that the URL rewriter resolves to, this holds the decoded path segments (used for LCP comparison against filesystem-derived `file_segs`) and the URL-encoded segments (joined for the output URL). Most segments are URL-safe and share strings between the two arrays.

3. **`result_cache`** (`Hash` of `"#{file_dir}\x00#{raw}"` → `final_rel_url` or `nil`). The big win. Subsumes step 1 (raw → site_path) and step 2 (site_path → page-relative URL) so each unique `(file_dir, raw)` pair is computed exactly once across the build. Every page shares its nav and aux-nav with every other page — those links resolve once on the first page and hit cache on every subsequent page. Without this cache the offlinify pass takes ~7× longer.

The cache is shared between the absolute-URL pass (Pass 1) and the relative-URL pass (Pass 2) — the `raw` shapes are disjoint (absolute starts with `/`, relative doesn't), so there's no collision. The `\x00` separator between `file_dir` and `raw` prevents path-name collisions inside the cache key.

## File layout

The offline build touches the following files:

| Path | Role |
|------|------|
| `docs/_plugins/offlinify.rb` | The plugin. Hooks `:site, :post_write`, runs all the passes. |
| `docs/_plugins/offlinify.md` | This file. |
| `docs/_config.yml` | `also_build_offline: true` (default-on) and `exclude: [_site-offline]` (keeps Jekyll's watcher from rebuilding on the plugin's own output). |
| `docs/build.bat` | Plain `bundle exec jekyll build` — produces `_site/`, `_site-offline/`, and (via `pdfify.rb`) `_site-pdf/` in one run. |
| `docs/serve.bat` | `bundle exec jekyll serve` — watcher-friendly thanks to the exclude. |
| `docs/check.bat` | Dual lychee — strict on `_site-offline/`, permissive (`--fallback-extensions html`) on `_site/`. |
| `docs/.gitignore` | `_site`, `_site-offline`, and `_site-pdf` all excluded from git. |
| `.github/workflows/jekyll-gh-pages.yml` | CI workflow. Builds, runs lychee against both trees, deploys to Pages, and (on manual dispatch) packages `_site-offline/` as a release artifact. |

## CI integration

`bundle exec jekyll build` in CI passes `--baseurl "${{ steps.pages.outputs.base_path }}"` from `actions/configure-pages`. For a Pages site with a custom domain (CNAME), base_path is empty. For a project page without a custom domain, it's `/repo-name`. Offlinify handles both cases — the baseurl normalisation at the start of `run` produces the right prefix to strip.

The workflow has two lychee steps after the build:

1. **Against `_site/`**, with `--fallback-extensions html` and a `--remap` that strips the base_path prefix. This mirrors what GitHub Pages does at request time — extensionless URLs like `/FAQ` get served as `/FAQ.html`. Without `--fallback-extensions html`, every pretty permalink would appear broken in this check.

2. **Against `_site-offline/`**, strict — no extension fallback (`--index-files 'index.html'` only; the online check also accepts the bare directory via `,.`). Every link must resolve to a real file as written. This catches relative links in markdown sources whose permalink shape doesn't match the rendered filename (e.g. `[Foo](Foo/)` when Jekyll wrote `Foo.html`, not `Foo/index.html`) — the kind of breakage the online check above hides behind both the fallback and the bare-directory acceptance.

Both checks set `fail: true`. Any unresolved link fails the build, blocks the Pages deploy, and blocks the release upload. After both lychee runs succeed and Pages is deployed, the release job (gated to manual dispatch only) downloads the offline-site workflow artifact, computes a tag like `docs-YYYY-MM-DD-HHMM` (UTC), and creates a GitHub release with `twinbasic-docs-offline.zip` attached via `softprops/action-gh-release@v2`.

## Failure modes

The plugin surfaces several conditions in its summary log lines:

- **Unresolved links.** `rewrote 837 HTML and 4 CSS file(s), copied 516 asset(s) (N unresolved link(s) left as-is)`. Each match the regex picked up but couldn't resolve against `site_paths` increments the counter. The code-block skip described under [Pass 1](#pass-1-absolute-url-rewriting-html) keeps example URLs inside `<code>`/`<pre>` off this counter, so a non-zero value here is a real bug signal — usually a broken source link, or an upstream-theme change that broke a regex.

- **JS regex misses.** `could not locate navLink() in assets/js/just-the-docs.js` (or the equivalent for `initSearch()`). The corresponding patch is skipped. Means just-the-docs has shipped a new version of the function and the regex constant needs updating. The plugin emits a warning pointing at the specific constant to update.

- **Missing `search-data.json`.** Silent — the search-data.js generation step is a no-op. The per-page script tag injection still runs, so each page will request `search-data.js` and the browser will log a 404. The patched `initSearch()` will hit its `window.SEARCH_DATA not found` branch and log a console message.

- **Real broken links in markdown sources.** Caught by the strict lychee step in CI (or by `check.bat` locally). These don't surface in the offlinify summary because the rewrite passes correctly identify them as unresolvable and leave them alone — that's the right behavior, the source markdown needs fixing.

- **`_site-offline/` triggering `jekyll serve` rebuilds.** Was a problem; now handled by two things in combination: `exclude: [_site-offline]` in `_config.yml`, and the "clean contents but keep the directory" trick in the wipe step (which keeps all watcher events under `_site-offline/...` where the exclude matches).

## Performance

The optimization story is captured in the commit history. Briefly:

- **Naïve first version** (per-file `File.file?` probes for each candidate): ~30 s.
- **+ `site_paths` Set** (O(1) lookup): down to ~10 s, before further work.
- **+ `result_cache`, `seg_cache`, manual LCP** (replaced `Pathname.relative_path_from` per match with a string-segment comparison): down to ~3 s.

That's a ~10× total speedup compared to the naïve version. The remaining ~3 s is dominated by file I/O — reading, regex-substituting, and writing across ~1100 HTML files — plus the regex pass over the SCSS-compiled `just-the-docs-combined.css`.

There's an additional ~1-2 s of `FileUtils.cp` for the binary assets (images, fonts, etc.) that don't need rewriting.

## Known limitations

- **Source-only broken links**, where the markdown points at a permalink shape that doesn't match the rendered filename, can't be fixed by the plugin — `compute_rel_url` correctly identifies the target as nonexistent and leaves the link unchanged. The strict lychee step in CI surfaces these as real errors so they get fixed at the source.

- **`<a href>` values inside `<code>` blocks** *were* not distinguishable from real links at the regex level; example URLs in tutorial code samples surfaced as false-positive entries in the unresolved counter. The Pass-1/Pass-2 code-block skip (see above) now suppresses them — both the rewrite and the counter increment. Worth keeping an eye on if the upstream syntax highlighter (Rouge) ever switches away from wrapping highlighted code in `<code>` / `<pre>`.

- **The search index is hefty.** `search-data.js` is ~2.8 MB (mostly text content for every page on the site, pretty-printed). It's loaded fresh on every page navigation under `file://` since browsers don't cache aggressively across `file://` documents. The size is acceptable on SSDs but could be a couple-second delay on spinning disks. Minifying the JSON before wrapping would save ~30-40%; the plugin currently doesn't.

- **The plugin is regex-based, not AST-based.** This is fast and has no external dependencies, but means we rely on stable shapes for the just-the-docs.js function signatures. A warning is emitted on a regex miss, which is the early-warning signal that the upstream theme has changed.

## Reference: the most important functions

In source order in [`offlinify.rb`](offlinify.rb):

- `run(site, src_dest, out_dest)` — orchestrator. Wipes contents, builds `site_paths`, normalises baseurl, walks the source tree, dispatches files by extension, kicks off the JS patch and search-data.js generation, logs the summary.
- `rewrite!(content, regex, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, mode:)` — Pass 1 (HTML absolute) and the CSS pass. One `gsub` per file with cache lookup per match.
- `rewrite_rel!(content, file_dir, file_segs, site_paths, result_cache)` — Pass 2 (HTML relative). Same shape as `rewrite!` but uses `HTML_REL_HREF_RE` and `compute_rel_url`. Shares `result_cache` with Pass 1.
- `inject_search_setup!(content, file_segs)` — Pass 3. Single regex substitution per file: finds the just-the-docs.js script tag and prepends the two new ones.
- `compute_relative(raw, file_segs, site_paths, seg_cache, baseurl)` — the absolute-URL resolver. Strip baseurl, probe candidates, compute LCP, return final URL.
- `compute_rel_url(raw, file_segs, site_paths)` — the relative-URL resolver. Normalise against the current page's dir, probe candidates, return original raw plus matching suffix.
- `patch_jtd_js!(out_dest)` — does the `navLink()` and `initSearch()` body substitutions.
- `build_search_data_js!(out_dest)` — generates `search-data.js` from `search-data.json`.

Together these are ~250 lines of Ruby plus inline JS replacement strings. The rest of the file is doc comments.
