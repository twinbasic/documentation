# Offlinify

`_plugins/offlinify.rb` produces a `file://`-browsable copy of the rendered site. The plugin hooks into Jekyll's render pipeline per page: it captures each rendered `page.output` in memory, rewrites every page-to-page link to a page-relative path with an explicit file extension, and writes the result straight to `_site-offline/<rel>` — no detour through disk. After Jekyll's WRITE phase, a final hook copies static files (images, fonts, the just-the-docs.js theme asset), patches the two just-the-docs JS functions that break under `file://`, and rewires the lunr search index to load from a `<script src=>` instead of an XHR call. The result is a fully self-contained tree that opens cleanly when you double-click `index.html` on disk — no HTTP server required.

This file sits in `_plugins/` for two reasons: it lives next to the code it documents, and Jekyll's `_plugins/` folder is plugin-only territory, so this Markdown never gets rendered into the public site.

## Why post-process at all?

Three things in a stock Jekyll/just-the-docs build assume an HTTP server is in front of the files:

1. **Root-absolute URLs.** Every `href` and `src` in the rendered HTML starts with `/`, e.g. `/assets/css/just-the-docs-combined.css`. Under `file://` a leading slash resolves against the filesystem root, not the site root, so the asset never loads.

2. **Extensionless permalinks.** The site uses `permalink:` frontmatter like `/tB/Core/Const`, which Jekyll writes to `_site/tB/Core/Const.html`. The HTML refers to it as `/tB/Core/Const` and the server is expected to map that to `Const.html`. Browsers do no such mapping under `file://`.

3. **just-the-docs JS.** `navLink()` matches the active nav entry by string-comparing `document.location.pathname` against link `href` attribute values; under `file://` the pathname is a filesystem path that no link matches, so the sidebar collapses on every navigation. `initSearch()` fires an `XMLHttpRequest` for `/assets/js/search-data.json`; browsers block `file://` XHR for file resources.

Pure Jekyll can't fix any of these. `relative_url` is site-relative, not page-relative — it has no access to the source page's URL when rendering a link, so it can't decide how many `../`s to prepend. Per-page `permalink:` frontmatter overrides any global URL-shape change. And the upstream theme's JS is out of our hands. The fix has to come after render.

## When it runs

Activated by `also_build_offline: true` (the default in `_config.yml`). The plugin registers four hooks that fire across the build:

```ruby
Jekyll::Hooks.register :site, :pre_render do |site|
  next unless site.config["also_build_offline"]
  Offlinify.setup(site)
end

Jekyll::Hooks.register :pages, :post_render do |page|
  Offlinify.process_page(page)
end

Jekyll::Hooks.register :documents, :post_render do |doc|
  Offlinify.process_page(doc)
end

Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["also_build_offline"]
  Offlinify.finish(site)
end
```

`Offlinify.setup` reads from `site.config` and the in-memory `site.pages + site.static_files + site.documents`, wipes `<site.dest>-offline/`, and seeds per-build state on the module's `@state` ivar. The per-page hooks transform `page.output` and write straight to `_site-offline/`. `Offlinify.finish` reads static files from `site.dest` (`_site/`, now fully written by Jekyll's WRITE phase) and copies them across, then patches `just-the-docs.js` and writes `search-data.js`.

One Jekyll invocation produces `_site/`, `_site-offline/` (this plugin), and `_site-pdf/` (via `pdfify.rb`). Flip the flag to `false` if you only want the online site.

**Incremental mode (`--incremental`) is not supported.** The per-page write model writes only the changed pages while the pre_render hook still wipes the offline tree — net result: an incomplete offline build. `setup` detects the flag and emits a warning instead of running. Use plain `jekyll build` for the offline tree.

## The build flow

Three phases, four hook callbacks.

### Phase 1: setup

Fires at `:site, :pre_render` — once at the start of the build, after Jekyll has read the source tree and generated all pages (including jekyll-redirect-from stubs and SCSS-derived CSS pages) but before any page renders.

1. **Bail on `--incremental`.** Set `@state = nil` and emit a warning. The per-page write model would leave the offline tree incomplete — the wipe runs unconditionally, but only changed pages re-fire their post_render hook.

2. **Wipe the output directory's *contents***. The directory itself is preserved across builds — recreating it makes Jekyll's watcher report a bare `_site-offline` change event (no trailing slash, since the directory is momentarily absent at notification time) that the YAML exclude entry `_site-offline` doesn't match (jekyll-watch auto-appends a trailing slash to directory excludes, turning the rule into the regex `_site-offline/`), and the result is an infinite rebuild loop on `jekyll serve`.

3. **Build `site_paths`** from Jekyll's in-memory model (`site.pages + site.static_files + site.documents`). Each item's `destination(site.dest)` gives the absolute file path Jekyll will write; converting to a site-rooted forward-slash form yields keys like `/tB/Core/Const.html`. The keys are *decoded* — filesystem names like `Form Designer.html` go in literally, not `Form%20Designer.html`. Resolution in `compute_relative` is then an O(1) `Set#include?` probe per candidate, instead of 2-3 `File.file?` syscalls each (very slow on Windows).

4. **Normalise `baseurl`.** Read `site.config["baseurl"]`, strip trailing slashes, prepend a leading slash if missing. The result matches the prefix `relative_url` actually emits in the rendered HTML — e.g. `/twinBASIC-docs` on a GitHub Pages project site. Used during URL resolution to strip the prefix before probing `site_paths`.

5. **Seed state** on the module's `@state` ivar so the per-page and finish hooks can pick up where setup left off: caches (`seg_cache`, `result_cache`), counters, normalised baseurl, exclude patterns, dest paths, cumulative timer. Cleared at the end of `finish` so a fresh build starts clean.

### Phase 2: process_page

Fires at `:pages, :post_render` and `:documents, :post_render` — once per page after Jekyll renders it. `page.output` is the final HTML/CSS/etc bytes; the plugin transforms it and writes the result to `_site-offline/<rel>`. Jekyll's WRITE phase writes the same `page.output` to `_site/<rel>` a moment later, so the online and offline files come from the same in-memory string — no re-read.

For each page:

1. **Compute `rel`** from `page.destination(@state[:dest])` via a plain string slice (`dest_path[(@state[:dest_root_fs].length + 1)..]`) rather than a Pathname round-trip. `Pathname#relative_path_from` is roughly 2 ms per call on Windows and would dominate per-page cost on a 1000+ page build.

2. **Check `offline_exclude`** (see [Exclude list](#exclude-list)). Matched files increment the `excluded_files` counter and skip the write.

3. **Detect jekyll-redirect-from stubs** by class-name string check (`page.class.name == "JekyllRedirectFrom::RedirectPage"`). The stubs are tiny HTML files whose meta-refresh, canonical link, `<script>location=`, and fallback `<a>` all reference an absolute `https://<site.url>/<path>` URL produced by `absolute_url`. Online these redirect to the canonical page; offline they would require network access and land on the live site rather than the local file — defeating the offline scenario. Rewrite each `<site.url><path>` occurrence to its resolved page-relative form via the same `compute_relative` the main HTML pass uses, then write the stub. Counted under `rewritten_redirects` in the summary log line. Some source pages (notably `Miscellaneous/Documentation Development.md`) intentionally link via `redirect_from` URLs as a stable-URL pattern, so the rewritten stubs let those source links navigate locally instead of failing. The class-name string check is used rather than `is_a?` so the plugin still loads if jekyll-redirect-from is removed. If `site.url` is unset (empty) the stub is written verbatim — the path-portion targets still resolve under lychee's offline check the same way the main HTML pass's link targets do.

4. **Dispatch on output extension:**
   - `.html`: dup `page.output`, strip the jekyll-seo-tag block (see [SEO block stripping](#seo-block-stripping)), scan for code-block ranges, run the combined HTML URL rewrite (see [HTML URL rewriting](#html-url-rewriting)), inject the search-setup script tags, write.
   - `.css`: dup `page.output`, run the `url()` rewrite (see [CSS `url()` rewriting](#css-url-rewriting)), write.
   - Anything else (XML feeds, JSON, etc.): write `page.output` verbatim.

5. **Accumulate self-time** into `@state[:cumulative_ms]`. The reported total at the end is just Offlinify's CPU time across all hook invocations, not the wall-clock between pre_render and post_write (which would include Jekyll's render and write phases between our hooks).

### Phase 3: finish

Fires at `:site, :post_write` — once after Jekyll's WRITE phase has populated `_site/`.

1. **Copy static files** (`site.static_files`) from `_site/` to `_site-offline/`. Static files don't fire `:pages, :post_render`, so they're handled here. The `offline_exclude` check runs again for each.

2. **Patch `assets/js/just-the-docs.js`** in `_site-offline/`. Replace the `navLink()` and `initSearch()` function bodies with offline-friendly versions.

3. **Generate `assets/js/search-data.js`.** Read the `search-data.json` that Phase 2 wrote (the jekyll-search Page object renders the JSON, which `process_page` captures and writes verbatim), wrap in `window.SEARCH_DATA = {...};`, write next to the JSON.

4. **Log the summary.** Three or four lines under the `Offlinify:` topic prefix, ending with `Offlinifier ran in Xms.` (cumulative self-time, not wall-clock).

5. **Clear `@state`** so a subsequent build starts with no leftover counters or caches.

## Transformation passes

### SEO block stripping

The jekyll-seo-tag plugin emits a ~900-byte block at the top of every page's `<head>`, bracketed by `<!-- Begin Jekyll SEO tag vX.Y.Z -->` and `<!-- End Jekyll SEO tag -->` comments. Inside live a `<title>`, a generator tag, OpenGraph and Twitter Card meta, a `<link rel="canonical">` pointing at the live site, and a JSON-LD structured-data `<script>`. All of it exists for search-engine crawlers and social-media link previewers that never see `_site-offline/`.

The whole block is stripped, except the `<title>` (the browser tab label, the only thing in the block a local reader actually uses). The bracketing comments go away too. On the current ~830-page site, the strip saves roughly 750 KB across the offline tree and removes three of the four `https://docs.twinbasic.com` references each page would otherwise contain (the fourth, the JSON-LD `"url"` field, is also inside the SEO block).

Runs first in the `.html` branch of `process_page` so the URL rewrite isn't doing work on URLs we're about to delete, and so the code-block scan's byte offsets are valid against the post-strip content.

### HTML URL rewriting

A single combined regex matches both absolute and page-relative URLs in `href`/`src` attributes:

`\b(href|src)=(["'])(\/(?!\/)[^"']*|(?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\2`

The third capture (the URL) has two alternatives:

- **Absolute** (`\/(?!\/)[^"']*`): starts with a single `/`, not `//` (protocol-relative). Produced by `relative_url`. Goes through `compute_relative`.
- **Page-relative** (`(?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+`): does not start with `#` (fragment-only — leave alone), `/` (handled by the first alternative), or a `scheme:` prefix (`http:`, `mailto:`, `tel:`, `javascript:`, etc.). Comes from markdown sources verbatim (`[Description](Attributes#description)`-style); Jekyll passes these through without applying `relative_url`, so they reach the rendered HTML without a baseurl prefix. Goes through `compute_rel_url`.

The two alternatives are disjoint at the start of the URL, so a single `gsub` handles both. Inside the block, dispatch on `raw.start_with?("/")`. (An earlier two-regex design ran two full gsubs and re-scanned the file for code-block ranges between them; combining them halved the per-file regex work — see [Performance](#performance).)

#### Absolute-URL path: `compute_relative`

For each absolute-URL match, the steps are:

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

#### Page-relative-URL path: `compute_rel_url`

For each page-relative match (e.g. `Attributes#description` in `Const.html`), the steps are:

1. **Normalise the relative path** against the current page's directory segments. `..` pops the stack, `.` and consecutive slashes are skipped, anything else is pushed. The result is an absolute site path (`/tB/Core/Attributes` for the `Attributes` example, starting from `tB/Core/Const.html`).

2. **Probe the same three candidates** as the absolute path.

3. **Append the matching suffix to the *original* relative URL.** Crucially, the output is the original raw plus the suffix that worked — not a freshly computed relative path. From the `Attributes#description` example: the path is already correctly relative to the current page (same directory), the only fix needed is `.html`. So `Attributes` → `Attributes.html` and the original `#description` tail is reattached, giving `Attributes.html#description`.

If the original is already correct (e.g. `href="foo.html"` where `foo.html` exists), the probe of `<path>` matches and the suffix is empty — the URL is left untouched and the match doesn't contribute to the "changed" count. If no candidate matches, the URL is left as-is and the unresolved counter is incremented.

#### Code-block skip

The rewrite regex carries two leading alternatives — `<code\b[^>]*>.*?</code>` and `<pre\b[^>]*>.*?</pre>` — placed before the href/src alternative. The regex engine consumes any `<code>` or `<pre>` block atomically and never tries the href/src alternative inside it. The gsub callback distinguishes the two outcomes by checking whether the href/src capture group is nil; when it is, the match was a code block, and the callback returns it verbatim. The skip has two consequences:

- Example URLs in tutorial code samples (e.g. `<script src="/script.js">` displayed verbatim in a CEF page) are not rewritten and **don't count toward the "unresolved" counter**. The unresolved counter is a real bug signal: anything it reports is either a broken source link or an upstream-theme change.
- Rouge's syntax highlighter HTML-escapes `<` and `>` inside code but leaves `"` alone, so `src="/foo"` survives literally inside `<code>` bodies and would otherwise match the URL regex. The code-block skip is what makes this invisible.

An earlier design ran a separate `<(code|pre)\b[^>]*>(.*?)<\/\1>` regex over the content to produce a list of `[start, end]` byte ranges, then checked each href/src match's offset against the ranges inside the gsub callback. That added a second full-content regex pass plus a linear scan per match. The fused single-regex approach above eliminates both — see the bullet under [Performance](#performance) for the saving.

#### Nav-block caching

The just-the-docs sidebar nav is a ~112 KB block injected into every page by the theme's layout. In the rendered `_site/` output it is byte-identical across the whole build (Jekyll emits root-absolute URLs, and the active-link highlighting is done in patched JS rather than in the markup). Its rewritten form depends only on `file_dir`: the relative paths emerge from the LCP walk between the current page's directory and the link target's path. On a site with ~837 pages and ~200 unique source directories, the same rewritten nav serves an average of ~4 pages.

The optimization is keyed on those two facts. Before the gsub, `rewrite_html!` checks `nav_cache[file_dir]`:

- **Cache hit**: `content.sub!(NAV_RE, NAV_PLACEHOLDER)` swaps the nav body for a tiny HTML comment (`<!--OFFLINIFY_NAV_PLACEHOLDER-->`). The gsub then runs on a ~25 KB string instead of a ~140 KB one. After the gsub, a second `sub!` splices the cached rewritten nav back where the placeholder lives.

- **Cache miss** (first page in this `file_dir`, or no nav at all): the gsub runs on the full content as before. After it completes, `NAV_RE.match(content)` extracts the just-rewritten nav from the output and stores it in `nav_cache[file_dir]` for the rest of the pages in the same directory.

Pages without a nav (the 404 stub, jekyll-redirect-from stubs) fall through to the no-nav branch and are counted under `count_pages_without_nav` so the breakdown shows them separately from real misses.

The placeholder is a literal HTML comment, chosen so that (a) it cannot match `HTML_COMBINED_RE` (which only looks at href/src attributes and code blocks), and (b) it is unlikely to collide with any source content. If it ever did collide, the final `sub!` would still find its placeholder before the colliding string in document order; the failure mode is benign so long as the placeholder string is unique.

This is the single biggest optimization in `rewrite_html` — it eliminates ~84% of gsub callback work (~600 k of the original 720 k per-match callbacks). See the corresponding bullet under [Performance](#performance).

### Search-setup injection (HTML)

Two `<script>` elements are inserted right before the existing `<script src="...just-the-docs.js">` tag in each rendered HTML:

```html
<script>window.OFFLINE_SITE_ROOT="../../";</script>
<script src="../../assets/js/search-data.js"></script>
```

- `window.OFFLINE_SITE_ROOT` is the per-page relative prefix from the page's directory to the offline site root. Computed from the same `file_segs` the URL rewriter uses — empty string at root, `"../../"` at depth 2, etc. The patched `initSearch()` reads this to convert search-result URLs into page-relative paths.

- `<script src="...search-data.js">` loads the lunr index data into `window.SEARCH_DATA`. Loaded as a classic script tag, which browsers allow under `file://` (the same-origin restriction is on `fetch`/`XHR`, not script execution).

Both run in source order before `just-the-docs.js`, so the globals are populated before the document-ready callback fires `initSearch()`.

The injection finds the just-the-docs.js script tag via a regex that captures the relative-path prefix in the existing tag's `src` attribute (e.g. `../../assets/js/`). The same prefix is reused for the new `search-data.js` reference. This works because the HTML URL rewriting pass has already converted the just-the-docs.js `src` from root-absolute to page-relative form by the time the injection runs.

### CSS `url()` rewriting

The just-the-docs theme ships `background-image: url("/favicon.png")` for the site logo. Without rewriting, this would fail under `file://`.

The regex `url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)` matches `url(...)` references whose URL starts with a single slash, optionally wrapped in quotes. The rewrite uses the same `compute_relative` as the HTML absolute-URL path.

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

A missing or empty `offline_exclude` entry skips the pattern check entirely.

The exclude check runs in two places:

1. **Inside `build_site_paths` in `setup`**, so URL-resolution candidates can't point at an excluded target (a stray `<a href="/sitemap.xml">` in the source would simply fail to resolve, instead of resolving to a now-missing file).
2. **Inside `process_page` and the static-file loop in `finish`**, where the write is skipped so the file never appears in `_site-offline/`.

In addition to the pattern-based excludes, **jekyll-redirect-from stubs get their absolute URLs rewritten** to page-relative form rather than being excluded (detected by the `JekyllRedirectFrom::RedirectPage` class-name check in `process_page`). The stubs contain only a meta-refresh / canonical link / `<script>location=` / fallback `<a>`, all referencing `https://<site.url>/<path>`. Left alone, following one offline would require network access and land on the live site. Each `<site.url><path>` occurrence is run through the same `compute_relative` the main HTML pass uses and replaced with the resolved relative path, so the stub navigates locally instead. The rewritten stubs are reachable from the offline tree, which matters for source pages (notably `Miscellaneous/Documentation Development.md`) that intentionally link via `redirect_from` URLs as a stable-URL pattern. Counted under `rewritten_redirects` in the summary log line, distinct from the pattern-matched `excluded_files`.

The summary log line reports both counts: `… rewrote N redirect stub(s) … excluded M file(s) …`.

## Caches

Five caches keep the per-match work to a single Hash lookup once warmed up:

1. **`site_paths`** (`Set` of strings). Built once in `setup` from `site.pages + site.static_files + site.documents`. Every file path that Jekyll will write, keyed by its site-rooted forward-slash form (`/tB/Core/Const.html`). Used by `compute_relative` and `compute_rel_url` to probe candidate paths.

2. **`seg_cache`** (`Hash` of `site_path` → `[decoded_segs, encoded_segs]`). Lazily populated. For each unique target site path that the URL rewriter resolves to, this holds the decoded path segments (used for LCP comparison against filesystem-derived `file_segs`) and the URL-encoded segments (joined for the output URL). Most segments are URL-safe and share strings between the two arrays.

3. **`raw_resolution_cache`** (`Hash` of `raw` → `[sep, tail, site_path]`). Lazily populated by `compute_relative` through `resolve_raw`. Holds the file-dir-independent half of URL resolution: the `?query` / `#fragment` split, the percent-decoded path, the baseurl-stripped form, and the resolved `site_path` (or `nil` when no candidate matched). Independent of the source file, so each unique `raw` URL runs `resolve_raw` exactly once across the whole build; every other reference to the same `raw` from any other source dir hits this cache and skips straight to the LCP walk.

4. **`result_cache`** (nested `Hash[file_dir] → Hash[raw → final_rel_url or nil]`). The end-to-end cache. Composes the work of caches 1-3 plus the per-source-dir LCP walk so each unique `(file_dir, raw)` pair is computed exactly once across the build. The nested shape means per-match work in `rewrite_html!` is one hash lookup on the short `raw` key, after a single outer lookup hoisted to the top of the method that yields the inner hash for the current source directory. Within-page same-URL repeats (e.g. the same nav link referenced from multiple places in a page's rendered HTML) hit the inner hash directly. Without this cache the offlinify pass takes ~7× longer.

5. **`nav_cache`** (`Hash[file_dir] → rewritten_nav_html`). Stores the ~112 KB rewritten just-the-docs sidebar nav per source directory. The first page in each `file_dir` runs the full gsub (including the nav, populating `result_cache` for every nav link) and seeds `nav_cache[file_dir]` from the rewritten output via a second `NAV_RE.match`. Every subsequent page in the same `file_dir` substitutes the input nav with `NAV_PLACEHOLDER` before the gsub, runs the rewrite on the remaining ~25 KB, and splices the cached nav back in place of the placeholder. Skips ~750 gsub callbacks per cache-hit page; the dominant single optimization in `rewrite_html`. Memory footprint: ~25 MB at the current ~200 unique source directories.

The inner hash in `result_cache` is shared between the absolute-URL and page-relative-URL dispatches inside the combined HTML pass — the `raw` shapes are disjoint (absolute starts with `/`, relative doesn't), so there's no collision.

## File layout

The offline build touches the following files:

| Path | Role |
|------|------|
| `docs/_plugins/offlinify.rb` | The plugin. Hooks `:site, :pre_render` (setup), `:pages, :post_render` + `:documents, :post_render` (per-page write), `:site, :post_write` (static files, JS patches, search-data.js). |
| `docs/_plugins/offlinify.md` | This file. |
| `docs/_config.yml` | `also_build_offline: true` (default-on) and `exclude: [_site-offline]` (keeps Jekyll's watcher from rebuilding on the plugin's own output). |
| `docs/build.bat` | Plain `bundle exec jekyll build` — produces `_site/`, `_site-offline/`, and (via `pdfify.rb`) `_site-pdf/` in one run. |
| `docs/serve.bat` | `bundle exec jekyll serve` — watcher-friendly thanks to the exclude. |
| `docs/check.bat` | Local link check (CI runs the same three passes via the workflows). Three steps: `scripts/check_links.py` permissive on `_site/`, `scripts/check_links.py` strict on `_site-offline/`, and `scripts/check_offline_live_links.py` against `_site-offline/`. Exits non-zero on any failure. |
| `scripts/check_offline_live_links.py` | Flags any `https://docs.twinbasic.com/<path>` reference that survived offlinify in `_site-offline/` HTML, outside `<code>` / `<pre>` blocks. Skips the bare root (`https://docs.twinbasic.com[/]`) since intentional "go to the live site" links are allowed. Run by `check.bat` locally and by both CI workflows after the offline link check. |
| `docs/.gitignore` | `_site`, `_site-offline`, and `_site-pdf` all excluded from git. |
| `.github/workflows/jekyll-gh-pages.yml` | Deploy workflow (push to `staging`, manual dispatch). Builds, runs lychee against `_site/`, runs `scripts/check_links.py` against `_site-offline/`, runs `scripts/check_offline_live_links.py` against `_site-offline/`, deploys to Pages, and (on manual dispatch) packages `_site-offline/` as a release artifact. |
| `.github/workflows/checks.yml` | PR-gating workflow (pull-request to `main`, manual dispatch). Same three link-check steps as the deploy workflow; no deploy or release. |

## CI integration

`bundle exec jekyll build` in CI passes `--baseurl "${{ steps.pages.outputs.base_path }}"` from `actions/configure-pages`. For a Pages site with a custom domain (CNAME), base_path is empty. For a project page without a custom domain, it's `/repo-name`. Offlinify handles both cases — `normalize_baseurl` in `setup` produces the right prefix to strip.

The workflow has three link-check steps after the build:

1. **Lychee against `_site/`**, with `--fallback-extensions html` and a `--remap` that strips the base_path prefix. This mirrors what GitHub Pages does at request time — extensionless URLs like `/FAQ` get served as `/FAQ.html`. Without `--fallback-extensions html`, every pretty permalink would appear broken in this check. Lychee (not `scripts/check_links.py`) handles the online tree because `--remap` isn't implemented in the Python checker; the offline tree below has all baseurl prefixes already stripped by offlinify and doesn't need it.

2. **`scripts/check_links.py` against `_site-offline/`**, strict — no extension fallback (`--index-files index.html` only; the online check also accepts the bare directory via `,.`). Every link must resolve to a real file as written. This catches relative links in markdown sources whose permalink shape doesn't match the rendered filename (e.g. `[Foo](Foo/)` when Jekyll wrote `Foo.html`, not `Foo/index.html`) — the kind of breakage the online check above hides behind both the fallback and the bare-directory acceptance. The Python checker is roughly 25× faster than lychee on this workload and a bit stricter (catches missing `<script src>` targets and trailing slashes on file-shaped URLs).

3. **`scripts/check_offline_live_links.py` against `_site-offline/`**, flagging any surviving `https://docs.twinbasic.com/<path>` reference outside `<code>` / `<pre>` blocks (the bare root is exempt — see [Failure modes: Surviving live-site links](#failure-modes)).

All three steps fail the build on the first non-zero exit, blocking the Pages deploy and the release upload. After they succeed and Pages is deployed, the release job (gated to manual dispatch only) downloads the offline-site workflow artifact, computes a tag like `docs-YYYY-MM-DD-HHMM` (UTC), and creates a GitHub release with `twinbasic-docs-offline.zip` attached via `softprops/action-gh-release@v2`.

## Failure modes

The plugin surfaces several conditions in its summary log lines:

- **Unresolved links.** `rewrote 837 HTML and 4 CSS file(s), copied 516 asset(s) (N unresolved link(s) left as-is)`. Each match the regex picked up but couldn't resolve against `site_paths` increments the counter. The [code-block skip](#code-block-skip) keeps example URLs inside `<code>`/`<pre>` off this counter, so a non-zero value here is a real bug signal — usually a broken source link, or an upstream-theme change that broke a regex.

- **JS regex misses.** `could not locate navLink() in assets/js/just-the-docs.js` (or the equivalent for `initSearch()`). The corresponding patch is skipped. Means just-the-docs has shipped a new version of the function and the regex constant needs updating. The plugin emits a warning pointing at the specific constant to update.

- **Missing `search-data.json`.** Silent — the search-data.js generation step is a no-op. The per-page script tag injection still runs, so each page will request `search-data.js` and the browser will log a 404. The patched `initSearch()` will hit its `window.SEARCH_DATA not found` branch and log a console message.

- **Real broken links in markdown sources.** Caught by the strict lychee step in CI (or by `check.bat` locally). These don't surface in the offlinify summary because the rewrite passes correctly identify them as unresolvable and leave them alone — that's the right behavior, the source markdown needs fixing. Source markdown linking at a `redirect_from` URL is reachable in the offline tree (the redirect stub is rewritten to navigate locally), but a stub that itself references a missing target falls back to the original `https://<site.url>/...` URL and lychee will then surface it as broken — same right-thing-to-do behaviour.

- **`_site-offline/` triggering `jekyll serve` rebuilds.** Was a problem; now handled by two things in combination: `exclude: [_site-offline]` in `_config.yml`, and the "clean contents but keep the directory" trick in the wipe step (which keeps all watcher events under `_site-offline/...` where the exclude matches).

- **Surviving live-site links.** The [SEO block stripping](#seo-block-stripping) pass removes the bulk of `https://docs.twinbasic.com` references each page contains (canonical link, OpenGraph URL, JSON-LD `url`). Anything left in `_site-offline/` is a source link that points at the live docs site -- usually a markdown author writing `https://docs.twinbasic.com/<path>` instead of a relative link or `/tB/...` permalink, which would silently navigate the offline reader back online. `scripts/check_offline_live_links.py` flags these; the bare root `https://docs.twinbasic.com[/]` is exempt since intentional "go to the live site" links are allowed. Run locally by `check.bat` and in CI by both workflows after the offline link check.

## Performance

The optimization story is captured in the commit history. Briefly:

- **Naïve first version** (per-file `File.file?` probes for each candidate): ~30 s.
- **+ `site_paths` Set** (O(1) lookup): down to ~10 s, before further work.
- **+ `result_cache`, `seg_cache`, manual LCP** (replaced `Pathname.relative_path_from` per match with a string-segment comparison): down to ~7 s as the site grew past 800 pages.
- **+ combined HTML regex** (single gsub matching both absolute and page-relative URLs in one pass — eliminating the second full file scan and the interim re-scan of code-block ranges that used to sit between two separate passes): down to ~4 s. Roughly 40% off the HTML walk.
- **+ per-page hook architecture** (`:pages, :post_render` consumes `page.output` in memory rather than re-reading the rendered HTML from `_site/` at `:site, :post_write`): the per-file `File.binread` is eliminated. Cumulative self-time across hooks is ~5-6 s on the current ~830-page site. The ~290 jekyll-redirect-from stubs go through a much cheaper code path than the main HTML pass (a single regex over a few hundred bytes, no code-block scan, no search-setup injection) so they're a small slice of the total.
- **+ fused code-block skip** (folded the `<code>` / `<pre>` skip into the same regex as the href/src rewrite as two extra leading alternatives, eliminating the separate `code_block_ranges` precompute pass and the per-match `in_code_block?` linear scan inside the gsub callback): another ~800 ms off the HTML walk. The regex engine consumes any `<code>…</code>` or `<pre>…</pre>` block atomically and never tries the href/src alternative inside, so example URLs in tutorial code samples stay verbatim and don't reach the rewrite logic. Cumulative ~5.4 s.
- **+ split resolution cache** (extracted the file-dir-independent half of `compute_relative` into `resolve_raw`, keyed by `raw` alone, so the `partition`/`decode`/baseurl-strip/candidate-probe work runs once per unique URL across the whole build instead of once per `(file_dir, raw)` pair): a further ~50-100 ms off the HTML walk. The saving is modest because the resolution work itself is cheap (a few regex and hash operations); the bigger benefit is structural -- the two halves of URL resolution are now clearly separated, and the per-match cost on a `result_cache` miss is dominated by the LCP walk + string build rather than the resolution probe. Cumulative ~5.3 s.
- **+ nested `result_cache`** (replaced the composite `Hash[(file_dir, raw)] → rel` with a two-level `Hash[file_dir] → Hash[raw → rel]`, hoisted the outer lookup once per page so per-match work is a single hash lookup on the short `raw` key with no composite-cache-key string allocation): ~280 ms off the HTML walk. The win wasn't visible until adding callback-level instrumentation showed the per-page match count was 854 (not 50): with ~720k callback invocations across the build, the per-match `"#{file_dir}\x00#{raw}"` allocation alone was the dominant unaddressed cost. Cumulative ~5.1 s.
- **+ misc quick wins** (replaced `Pathname#relative_path_from` in `build_site_paths` with a plain string slice ~200× faster, switched `gsub` to `gsub!` in `rewrite_html!` to mutate in place): ~100 ms across setup + the HTML walk. Cumulative ~5.0 s.
- **+ per-dir nav-block caching** (the just-the-docs sidebar nav is ~112 KB of identical input HTML on every page and ~750 of each page's ~860 href matches; its rewritten output depends only on `file_dir`. Substitute the nav with an HTML-comment placeholder before the gsub when a cached rewritten nav exists for the current `file_dir`; run the gsub on the remaining ~25 KB; splice the cached nav back. First page in each `file_dir` runs the full gsub including the nav and seeds the cache; every subsequent page short-circuits 750 callbacks): **~1900 ms off the HTML walk**, the biggest single win. Cumulative ~3.1 s. Total Offlinify time has dropped from the original ~6.2 s to ~3.1 s (~50% faster).

### Profiling

The plugin carries an opt-in per-operation timing breakdown, gated on Jekyll's existing `--profile` build flag. Running `bundle exec jekyll build --profile` adds 16 rows under the `Offlinify:` topic prefix after the existing summary lines, e.g.:

```
Offlinify: Offlinifier ran in 3088ms.
Offlinify:   setup                       305.9ms
Offlinify:   dest_path                     6.6ms
Offlinify:   page.output.dup               1.2ms
Offlinify:   strip_seo                    31.2ms
Offlinify:   rewrite_html               2033.0ms
Offlinify:     (of which time_resolve)   266.4ms
Offlinify:   inject_search                30.7ms
Offlinify:   write_html                  509.6ms
Offlinify:   rewrite_css                   0.5ms
Offlinify:   write_css                     2.9ms
Offlinify:   rewrite_redirect              4.9ms
Offlinify:   write_redirect               65.4ms
Offlinify:   write_other                   3.8ms
Offlinify:   copy_static                 106.3ms
Offlinify:   patch_jtd                     0.4ms
Offlinify:   search_data                   2.4ms
Offlinify:   rewrite_html details: matches=115568 (href/src=110279, code/pre=5289)
Offlinify:                         result_cache: hits=11040, misses=99239 (10.0% hit rate)
Offlinify:                         resolver calls: compute_relative=96192, compute_rel_url=3047
Offlinify:                         nav_cache: hits=723, misses=114, no-nav pages=0
```

The detail rows under `rewrite_html details:` are populated from per-callback counters in `rewrite_html!` (aggregated to `@state` once per page to keep the inner-loop work register-local). They expose four useful ratios: how many real href/src matches versus code-block matches, the `result_cache` hit rate, the split between absolute-URL and page-relative-URL resolvers, and the `nav_cache` hits/misses (one miss per unique source dir on its first page; one hit per subsequent page in the same dir). The `(of which time_resolve)` row is the cumulative time spent inside `compute_relative` + `compute_rel_url`; the rest of `rewrite_html` is regex scanning, callback dispatch, hash lookups, and replacement-string construction.

Note that after nav caching the `result_cache` hit rate drops from ~86% to ~10%: nearly all the within-build URL repetition came from the nav, and the nav is now skipped on cache hits. The remaining 10% comes from inline links repeated across pages (footer, header, the few links inside each page's main content that point at common targets like the home page). The absolute number of callback work, not the hit rate percentage, is what matters: 720k callbacks (pre-nav-cache) at 86% hit rate vs 115k callbacks (post-nav-cache) at 10% hit rate is an 84% reduction in real work done.

The row labels match the `tick(:time_*)` keys spread across `setup`, `process_page`, and `finish`. The sum of the rows is within ~20 ms of `cumulative_ms` — the gap is hook plumbing not wrapped in a `tick` (the extension dispatch, the `file_dir` computation, the `case` itself).

The instrumentation lives behind a `tick(key) { ... }` helper. With `--profile` off, the helper is a single boolean check plus a block yield — negligible at the per-page rate. With `--profile` on, each callsite reads the monotonic clock twice and accumulates the elapsed ms into `@state[key]`. The breakdown is emitted by `log_profile_breakdown` at the end of `finish`, which walks the `BREAKDOWN_KEYS` constant table.

### Hot spots (current site shape)

After nav-block caching the picture is much flatter:

- **`rewrite_html`** at ~66% of all Offlinify time. The gsub callback fires ~115k times per build (not 720k — the nav cache short-circuits ~600k of them). Per-match work is still ~17 µs on the cache-miss side and ~5 µs on the cache-hit side; with ~115k total, that's ~2 s. `time_resolve` (the resolver block inside) is ~13% of `rewrite_html`, the rest is regex scanning, callback dispatch, and replacement-string construction.

- **`write_html`** at ~16%: 837 `File.binwrite` calls. Windows NTFS file-creation cost dominates over the byte write. Lowering the file count is not an option (each page is a separate file).

- **`setup`** at ~10%: now the largest non-rewrite phase. `wipe_out_dest_contents` clears the previous `_site-offline/` tree (variable cost depending on how full the tree was) and `build_site_paths` iterates ~1300 in-memory items.

- **`copy_static`** at ~3%: 221 `FileUtils.cp` calls in `finish` for binary assets that didn't need rewriting.

The two regex passes in `rewrite_html` (the full-content scan on first-page-in-dir, the partial scan on subsequent-pages-in-dir) are now the floor: avoiding them would require either a structural change to how Jekyll lays out pages, or hand-rolled `String#scan`-based rewriting that's unlikely to beat MRI's C-implemented `gsub!`. The natural next levers are (a) widening the nav cache to capture other large boilerplate blocks (header, footer, head section — each smaller than the nav but still meaningful), and (b) chipping at `write_html` if Windows file-creation cost can be shaved (asynchronous writes? batched directory creation? small wins likely).

## Known limitations

- **Source-only broken links**, where the markdown points at a permalink shape that doesn't match the rendered filename, can't be fixed by the plugin — `compute_rel_url` correctly identifies the target as nonexistent and leaves the link unchanged. The strict lychee step in CI surfaces these as real errors so they get fixed at the source.

- **`<a href>` values inside `<code>` blocks** *were* not distinguishable from real links at the regex level; example URLs in tutorial code samples surfaced as false-positive entries in the unresolved counter. The [code-block skip](#code-block-skip) now suppresses them — both the rewrite and the counter increment. Worth keeping an eye on if the upstream syntax highlighter (Rouge) ever switches away from wrapping highlighted code in `<code>` / `<pre>`.

- **The search index is hefty.** `search-data.js` is ~2.8 MB (mostly text content for every page on the site, pretty-printed). It's loaded fresh on every page navigation under `file://` since browsers don't cache aggressively across `file://` documents. The size is acceptable on SSDs but could be a couple-second delay on spinning disks. Minifying the JSON before wrapping would save ~30-40%; the plugin currently doesn't.

- **The plugin is regex-based, not AST-based.** This is fast and has no external dependencies, but means we rely on stable shapes for the just-the-docs.js function signatures. A warning is emitted on a regex miss, which is the early-warning signal that the upstream theme has changed.

## Reference: the most important functions

In source order in [`offlinify.rb`](offlinify.rb):

- `setup(site)` — `:site, :pre_render` hook entry. Builds `site_paths` from the in-memory page set, wipes the offline tree, seeds per-build state on `@state`. Bails out with a warning if `--incremental` is set.
- `normalize_baseurl(raw_baseurl)` — helper for `setup`. Coerces the configured baseurl to either empty string or `/segment...` with no trailing slash, matching the form `relative_url` actually prepends.
- `build_site_paths(site, exclude_patterns)` — helper for `setup`. Iterates `site.pages + site.static_files + site.documents` and builds the URL Set from each item's `destination(site.dest)`, decoded and forward-slash-normalised.
- `wipe_out_dest_contents(out_dest)` — helper for `setup`. Removes the offline tree contents while leaving the directory itself in place (see [Phase 1](#phase-1-setup)).
- `tick(key) { ... }` — opt-in timing helper. When `--profile` is set on the build, wraps the block in two monotonic-clock reads and accumulates the elapsed ms into `@state[key]`; otherwise a pass-through `yield`. Used by every measurable code path in `setup`, `process_page`, and `finish`. See [Profiling](#profiling).
- `process_page(page)` — `:pages, :post_render` and `:documents, :post_render` hook entry. Transforms `page.output` and writes the offline copy. Dispatches on output extension and on page class (jekyll-redirect-from stubs get a dedicated branch that rewrites their absolute `<site.url>/<path>` URLs to page-relative form).
- `finish(site)` — `:site, :post_write` hook entry. Copies static files from `_site/` to `_site-offline/`, patches just-the-docs.js, generates search-data.js, logs the summary (with the per-operation breakdown when `--profile` is set, via `log_profile_breakdown`), clears `@state`.
- `rewrite_html!(content, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, raw_resolution_cache, nav_cache)` — the combined HTML pass. Before the gsub: if `nav_cache[file_dir]` is set, substitute the input nav with `NAV_PLACEHOLDER` so the gsub doesn't scan it. Hoists `page_cache = result_cache[file_dir] ||= {}` once. Runs one `gsub!` per file over `HTML_COMBINED_RE`, which carries three alternatives: a `<code>` block, a `<pre>` block, or an `href|src=` attribute. The first two are returned verbatim from the gsub callback (group 1 is nil on those branches); the third dispatches on `raw.start_with?("/")` — absolute URLs go through `compute_relative`, page-relative URLs through `compute_rel_url`. Single `page_cache` lookup per real match. After the gsub: splice the cached nav back into the placeholder, or, on first-page-in-dir, extract the rewritten nav from the output and seed `nav_cache[file_dir]`.
- `rewrite_css!(content, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, raw_resolution_cache)` — the CSS pass. Same `page_cache` hoist as `rewrite_html!`. One `gsub` per file over `CSS_URL_RE`, dispatched to `compute_relative` (CSS only carries absolute URLs in this codebase). No code-block handling — CSS has no equivalent concept.
- `inject_search_setup!(content, file_segs)` — the second HTML transformation. Single regex substitution per file: finds the just-the-docs.js script tag and prepends the two new ones.
- `strip_seo!(content)` — removes the jekyll-seo-tag plugin's output block from a page's `<head>`, keeping only the `<title>` tag. Runs first in the `.html` branch of `process_page` so the rewrite regex sees the post-strip content.
- `compute_relative(raw, file_segs, site_paths, seg_cache, baseurl, raw_resolution_cache)` — the absolute-URL resolver. Looks up the file-dir-independent half via `raw_resolution_cache.fetch { resolve_raw(...) }`, then walks the LCP against `file_segs` and emits the final URL.
- `resolve_raw(raw, site_paths, baseurl)` — the file-dir-independent half of `compute_relative`: parses raw, strips baseurl, probes candidates. Returns `[sep, tail, site_path]` with `site_path` nil when no candidate resolved. Called once per unique `raw` across the build via `raw_resolution_cache`.
- `compute_rel_url(raw, file_segs, site_paths)` — the page-relative-URL resolver. Normalise against the current page's dir, probe candidates, return original raw plus matching suffix.
- `patch_jtd_js!(out_dest)` — does the `navLink()` and `initSearch()` body substitutions.
- `build_search_data_js!(out_dest)` — generates `search-data.js` from `search-data.json`.

Together these are ~280 lines of Ruby plus inline JS replacement strings. The rest of the file is doc comments.
