# frozen_string_literal: true

require "fileutils"
require "pathname"
require "set"

# Produces a `file://`-browsable copy of the rendered site. Activated
# by `also_build_offline: true` in `_config.yml` (the default). For
# each page Jekyll renders, this plugin captures the in-memory output
# and writes a URL-rewritten copy straight to `<site.dest>-offline`
# (`_site-offline/`) -- no detour through disk. After Jekyll's WRITE
# phase completes, static files (images, fonts, the just-the-docs.js
# theme asset, etc.) get copied across, the just-the-docs.js navigation
# and search bodies get patched, and `search-data.js` is generated.
# One Jekyll invocation produces both `_site/` and `_site-offline/`
# (and, via `_plugins/pdfify.rb`, `_site-pdf/`).
#
# === Why post-process at all? ===
#
# The site uses `permalink:` frontmatter that produces extensionless,
# root-absolute URLs (e.g. `/tB/Core/Const`), and the just-the-docs
# theme emits asset references and nav links via the `relative_url`
# Liquid filter -- root-absolute when `baseurl` is empty. Two
# consequences make the default `_site/` unusable for `file://`
# browsing:
#
#   1. A leading slash resolves against the filesystem root under
#      `file://`, not against the built site directory, so
#      `<link href="/assets/css/...">` and every nav link 404
#      immediately.
#   2. Pretty URLs have no `.html` extension; only an HTTP server knows
#      to serve `/FAQ` as `/FAQ.html`. Browsers do not auto-rewrite for
#      `file://`.
#
# Pure Jekyll cannot fix either: `relative_url` is site-relative, not
# page-relative -- it has no access to the source page's URL when
# rendering links -- and per-page `permalink:` frontmatter overrides
# any global URL-shape change. The fix has to come after render.
#
# === Build flow ===
#
# Three Jekyll hooks orchestrate the build:
#
#   1. `:site, :pre_render` -- builds `site_paths` from
#      `site.pages + site.static_files + site.documents`, wipes the
#      contents of `_site-offline/`, initialises per-build state
#      (caches, counters, normalised baseurl) on the module's `@state`
#      ivar so the later hooks can read it, and starts the async
#      write pool.
#
#   2. `:pages, :post_render` and `:documents, :post_render` -- fire
#      once per page after Jekyll renders it. `page.output` is the
#      final HTML/CSS/etc bytes; the plugin transforms it and enqueues
#      the rewritten content on a small thread pool that does the
#      actual `mkdir_p` + `binwrite` to `_site-offline/<rel>` off the
#      main thread. The writes overlap with Jekyll's next-page render
#      and our own rewrite of subsequent pages. Jekyll's WRITE phase
#      writes the same `page.output` to `_site/<rel>` a moment later,
#      so the online and offline files come from the same in-memory
#      string -- no re-read.
#
#   3. `:site, :post_write` -- once Jekyll has finished writing
#      `_site/`, this hook drains the async write pool (so all
#      per-page writes are flushed before any read from
#      `_site-offline/`), copies static files (images, fonts, raw
#      JS/JSON the theme ships verbatim, the just-the-docs.js asset)
#      from `_site/` into `_site-offline/`, patches
#      `_site-offline/assets/js/just-the-docs.js`, and generates
#      `_site-offline/assets/js/search-data.js` from the
#      `search-data.json` produced in phase 2.
#
# Two payoffs over the older single-pass walk of `_site/` at
# `:site, :post_write`:
#
#   * Full builds skip the per-page HTML re-read (one File.binread
#     per rendered page, eliminated).
#   * `jekyll serve` rebuilds inherit the same speedup -- the
#     post-write file walk is gone.
#
# Incremental mode (`--incremental`) is not supported: pre_render
# fires and wipes `_site-offline/`, but only changed pages re-fire
# their post_render hook, so unchanged pages would disappear from
# the offline tree. The setup hook detects the flag and skips the
# offline build with a warning.
#
# === URL rewriting ===
#
# For each HTML file: regex-substitute every `href="..."` / `src="..."`
# whose value starts with `/` (and is not protocol-relative `//`).
# For each CSS file: same for `url(...)` references (just-the-docs
# ships a `background-image: url("/favicon.png")` rule for the site
# logo). The substitution:
#
#   1. Splits the value into `path`, optional `?query`, optional
#      `#fragment`.
#   2. Percent-decodes the path to obtain the filesystem candidate
#      (e.g. `Form%20Designer` -> `Form Designer`).
#   3. Probes up to three candidates against the site's file set:
#        `<path>` as-is             -- e.g. `/assets/css/foo.css`
#        `<path>.html`              -- e.g. `/FAQ` -> `/FAQ.html`
#        `<path>/index.html`        -- e.g. `/Tutorials/CEF/`
#                                      -> `/Tutorials/CEF/index.html`
#      The first hit wins.
#   4. Computes the page-relative URL via a longest-common-prefix walk
#      between the source file's directory segments and the target's
#      path segments, re-encodes the segments, and emits
#      `<rel><query><fragment>`.
#
# Two caches keep the per-match work to a single Hash lookup once
# warm: a global `(file_dir, raw)` -> final URL cache, and a global
# `site_path` -> `[decoded_segs, encoded_segs]` cache (both arrays
# share strings for URL-safe segments).
#
# === just-the-docs JS patches + offline search wiring ===
#
# `assets/js/just-the-docs.js` has two pieces that don't survive the
# move to `file://`:
#
#   * `navLink()` matches the active nav entry by string-comparing
#     `document.location.pathname` against link `href` attribute
#     strings. Online both are root-absolute; offline pathname is a
#     filesystem path (`/D:/.../tB/Core/Const.html`) and hrefs are
#     page-relative (`Const.html`) -- no match, no nav-list-item gets
#     `class="active"`, sidebar collapses on every navigation. Patched:
#     replace the function body with a comparison of the resolved
#     `link.href` DOM property (an absolute URL the browser produced
#     from the relative attribute) against `window.location.href`.
#
#   * `initSearch()` fires an `XMLHttpRequest` for
#     `/assets/js/search-data.json`. Browsers block `file://` XHR for
#     file resources by default; the request fails silently in the
#     `request.onerror` handler. Patched: replace the function body
#     to read the index data from `window.SEARCH_DATA` (populated by
#     a sibling `search-data.js` that wraps the JSON in a global
#     assignment and is loaded as a `<script src=>` -- script tags
#     are not subject to the file:// XHR ban). Then rewrite each
#     `doc.url` from a root-absolute permalink (`/tB/Core/Const`) to
#     a page-relative path that lands on the actual file
#     (`<root>tB/Core/Const.html`), prefixing with the per-page
#     `window.OFFLINE_SITE_ROOT` constant the plugin also injects.
#     Trailing-slash URLs map to `index.html`; URLs without an
#     extension get `.html`; `#fragment` is preserved. The search
#     index is built and handed to `searchLoaded(index, docs)` exactly
#     as upstream does -- which sets `link.href = doc.url`, so the
#     rewritten URLs are what users click.
#
# Each rendered HTML page gets two `<script>` tags injected right
# before the existing `<script src="...just-the-docs.js">`:
#
#   <script>window.OFFLINE_SITE_ROOT="../../";</script>
#   <script src="../../assets/js/search-data.js"></script>
#
# `OFFLINE_SITE_ROOT` is the per-page relative prefix from the
# page's directory to the offline site root (computed from the same
# `file_segs` the URL rewriter uses; empty string at root,
# `"../../"` at depth 2, etc.). The JS-wrapped index data
# (`search-data.js`) is generated once per build from the rendered
# `search-data.json`.
#
# === Output parity ===
#
# URL substitution only touches attribute values that start with a
# single `/`. Fragment-only (`#main-content`), protocol-relative
# (`//cdn...`), absolute (`http://...`, `mailto:...`), and already-
# relative URLs are left untouched. Targets that fail to resolve to
# any file in the site are also left untouched, with a count emitted
# in the summary log line. The rewrite is a string substitution, not
# a parse -- attribute values containing literal unescaped `<`, `>`,
# or the matched quote character would defeat the regex, but no
# rendered page on this site contains them in href/src positions.
#
# === Compatibility ===
#
# Reads `site.dest`, `site.config['also_build_offline']`,
# `site.config['baseurl']`, `site.config['offline_exclude']`, and
# `site.config['incremental']` (the last to bail out with a warning).
# Reads each rendered page's `page.output` in memory; reads static
# files from `site.dest` after WRITE. Writes a fresh
# `<site.dest>-offline/` tree (wiping any prior contents at the start
# of the build). Touches no files outside that.
#
# If the plugin is removed: the build silently stops producing
# `_site-offline/`; Jekyll's normal `_site/` output is unaffected.

module Offlinify
  # Single-pass HTML rewrite regex. Three top-level alternatives:
  #
  #   1. `<code\b[^>]*>.*?</code>`  -- a `<code>` block. Matched
  #      atomically, returned verbatim by the callback. Group 1 is
  #      nil for this branch.
  #   2. `<pre\b[^>]*>.*?</pre>`    -- a `<pre>` block. Same. Group 1
  #      nil.
  #   3. `\b(href|src)=(...)...`    -- a real href/src attribute.
  #      Group 1 is "href" or "src"; group 2 is the quote char; group
  #      3 is the URL.
  #
  # The URL (group 3) is one of:
  #   - an absolute path (`/foo`) that does not start `//` (protocol-
  #     relative); produced by `relative_url`. Goes through
  #     `compute_relative` to become a page-relative URL.
  #   - a page-relative path (`Foo`, `Foo#section`) that does not
  #     start with `/`, `#`, or a URL scheme. These come from
  #     markdown sources verbatim and go through `compute_rel_url`
  #     to gain the `.html` / `/index.html` suffix needed under
  #     `file://`.
  #
  # Excluded by the second URL alternative's lookahead:
  #   `#...`                    fragment-only (same-page anchors)
  #   `/...` / `//...`          handled by the first alternative
  #   `mailto:`, `http:`, etc.  any RFC 3986 URL scheme
  #
  # The code-block branches use no backreference for the closing
  # tag (just literal `</code>` / `</pre>`), which lets the regex
  # engine fast-skip to the closing tag instead of remembering which
  # group matched. Folding them into the same pass as the href/src
  # match eliminates a separate `<(code|pre)…</\1>` precompute
  # scan and the per-match `in_code_block?` linear check inside the
  # gsub callback. Rouge's syntax highlighter HTML-escapes `<` and
  # `>` inside code but leaves `"` alone, so `src="/script.js"`
  # survives as a literal substring inside `<code>` bodies that
  # would otherwise match the href/src alternative -- the atomic
  # consumption of the code-block alternatives is what makes the
  # tutorial code samples come through unrewritten.
  #
  # Captures (when matched): 1=attribute name, 2=quote char, 3=URL.
  HTML_COMBINED_RE = %r{<code\b[^>]*>.*?</code>|<pre\b[^>]*>.*?</pre>|\b(href|src)=(["'])(\/(?!\/)[^"']*|(?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\2}m.freeze

  # Matches `url(...)` in CSS where the URL starts with a single slash.
  # The URL may be bare or wrapped in single/double quotes. Captures:
  # 1=quote char (or empty), 2=URL.
  CSS_URL_RE = /url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)/.freeze

  # Characters safe in a URL path segment (RFC 3986 unreserved + sub-
  # delims that don't need encoding in a path). Everything else is
  # percent-encoded byte-by-byte.
  PATH_SAFE_RE = /[^A-Za-z0-9\-_.~!$&'()*+,;=:@]/.freeze

  # Matches the jekyll-seo-tag plugin's output, bracketed by the
  # `Begin Jekyll SEO tag vX.Y.Z` / `End Jekyll SEO tag` comments
  # the plugin emits unconditionally. Inside the block live a
  # `<title>`, generator/OpenGraph/Twitter-Card meta tags, a
  # `<link rel="canonical">` pointing at the live site, and a
  # JSON-LD structured-data `<script>`. The whole block is ~900
  # bytes per page; the contents do nothing offline (search-engine
  # crawlers and social-media link previewers never see
  # `_site-offline/`) so all but the `<title>` (the browser tab
  # label) is stripped. The block is single-line in just-the-docs's
  # rendered output but the regex uses `.*?` with multiline mode
  # in case future theme versions reformat it.
  SEO_BLOCK_RE = /<!-- Begin Jekyll SEO tag.*?<!-- End Jekyll SEO tag -->/m.freeze

  # Matches the `<title>...</title>` tag inside the SEO block,
  # preserved verbatim into the stripped output.
  TITLE_RE = /<title>.*?<\/title>/m.freeze

  # Matches the just-the-docs sidebar nav block in a rendered page.
  # Anchored on `<nav ... id="site-nav" ...>` (a stable opener in
  # just-the-docs 0.10.x) and the first subsequent `</nav>`. The
  # block is ~112 KB per page on the current site and carries ~750
  # of each page's ~860 href/src matches -- the bulk of
  # `rewrite_html`'s per-match callback work lives inside it. The
  # input nav HTML is identical across all pages (Jekyll emits
  # root-absolute URLs that don't depend on the source page), and
  # the *output* nav after URL rewriting is identical across all
  # pages within a single source directory (the relative-path
  # transform depends on `file_dir` and nothing else). The
  # per-file_dir cache exploits both facts: substitute a placeholder
  # before the gsub, run the rewrite on the (much smaller) remainder,
  # then splice the cached rewritten nav back. See
  # `NAV_PLACEHOLDER`.
  NAV_RE = /<nav\b[^>]*id="site-nav"[^>]*>.*?<\/nav>/m.freeze

  # Sentinel that takes the nav block's place in `content` during
  # the gsub! pass when a rewritten nav is already cached for the
  # current `file_dir`. Chosen as an HTML comment so it (a) cannot
  # match `HTML_COMBINED_RE` (which only looks at href/src
  # attributes and `<code>` / `<pre>` blocks), and (b) is impossible
  # to confuse with content the just-the-docs theme actually emits.
  # If the placeholder ever appears verbatim in source content the
  # final `content.sub!` will still find it -- the risk is benign
  # so long as the string is unique enough not to occur naturally.
  NAV_PLACEHOLDER = "<!--OFFLINIFY_NAV_PLACEHOLDER-->"

  # Path of the just-the-docs JS file relative to the site root.
  JTD_JS_REL = "assets/js/just-the-docs.js"

  # Number of worker threads in the async write pool. The pool drains
  # the per-page output writes off the main thread so they overlap
  # with Jekyll's next-page render and our own rewrite of subsequent
  # pages. MRI releases the GIL on IO syscalls (`open`, `write`,
  # `close`, `stat`, `mkdir`), so the workers actually parallelise at
  # the OS level. See `write_worker_loop` and `drain_write_pool!`.
  WRITE_POOL_SIZE = 4

  # Matches the upstream `navLink()` function body. Anchored on the
  # function signature and the closing `return null;` comment (a
  # stable trailer in just-the-docs 0.10.x). A miss leaves the file
  # untouched and emits a warning -- a likely signal that just-the-
  # docs has shipped a new version of the function and the regex
  # needs updating.
  JTD_NAVLINK_RE = /function navLink\(\) \{.*?return null; \/\/ avoids `undefined`\s*\}/m

  # Replacement body. Compares the link's resolved `.href` DOM
  # property (an absolute URL the browser produced from the relative
  # attribute, taking the document base into account) against the
  # document URL with hash and query stripped. Works in both online
  # and offline modes.
  JTD_NAVLINK_REPLACEMENT = <<~JS.chomp
    function navLink() {
      // Patched by _plugins/offlinify.rb for file:// compatibility.
      // Compare resolved a.href against window.location.href so the
      // active link resolves correctly under both http(s):// and file://.
      var here = window.location.href.split('#')[0].split('?')[0];
      var links = document.getElementById('site-nav').querySelectorAll('a.nav-list-link');
      for (var i = 0; i < links.length; i++) {
        if (links[i].href === here) return links[i];
      }
      return null;
    }
  JS

  # Matches the upstream `initSearch()` function body. The original
  # fires `XMLHttpRequest` for `/assets/js/search-data.json` (blocked
  # by browsers under file://) and on success builds a lunr index
  # from the response. Anchored on the function signature and the
  # closing `request.send();` line (a stable trailer in just-the-docs
  # 0.10.x). A miss leaves the file untouched and emits a warning.
  JTD_INITSEARCH_FN_RE = /function initSearch\(\) \{.*?request\.send\(\);\s*\}/m

  # Replacement body. Reads the index data from `window.SEARCH_DATA`
  # (populated by `search-data.js`, which is generated from the
  # rendered `search-data.json` and loaded as a `<script src=>` -- a
  # classic script tag is allowed under file:// where XHR is not).
  # Then rewrites each `doc.url` from a root-absolute permalink
  # (`/tB/Core/Const`) to a page-relative path that lands on the
  # actual file (`../../tB/Core/Const.html`), prefixing with the
  # per-page `window.OFFLINE_SITE_ROOT` (also injected by this
  # plugin). The URL transformation mirrors the rules in
  # `compute_relative` Ruby-side: trailing slash -> `index.html`, no
  # extension -> `.html`, preserve `#fragment`. Finally builds the
  # lunr index with the same parameters as upstream and hands it to
  # `searchLoaded(index, docs)` -- which sets `link.href = doc.url`,
  # so the rewritten URLs are what users click.
  JTD_INITSEARCH_FN_REPLACEMENT = <<~JS.chomp
    function initSearch() {
      // Patched by _plugins/offlinify.rb for file:// compatibility.
      // The upstream version fires XMLHttpRequest for search-data.json,
      // which browsers block under file://. We instead read the index
      // from a global the offline copy preloads via <script src=>.
      var docs = window.SEARCH_DATA;
      if (!docs) {
        console.log('Offlinify: window.SEARCH_DATA not found; ensure search-data.js loads before just-the-docs.js');
        return;
      }
      // Rebuild each doc.url from doc.relUrl (no baseurl prefix) so
      // search-result clicks land on the right file regardless of
      // whatever baseurl the site was built with. Upstream sets
      // `link.href = doc.url`, so this is the value users navigate
      // to.
      var siteRoot = window.OFFLINE_SITE_ROOT || '';
      for (var i in docs) {
        var rel = docs[i].relUrl;
        if (typeof rel === 'string' && rel.charAt(0) === '/') {
          var hash = '';
          var hashIdx = rel.indexOf('#');
          if (hashIdx !== -1) {
            hash = rel.slice(hashIdx);
            rel = rel.slice(0, hashIdx);
          }
          rel = rel.slice(1); // strip leading /
          if (rel.endsWith('/')) {
            rel = rel + 'index.html';
          } else {
            var lastSlash = rel.lastIndexOf('/');
            var lastSeg = lastSlash === -1 ? rel : rel.slice(lastSlash + 1);
            if (lastSeg.indexOf('.') === -1) rel = rel + '.html';
          }
          docs[i].url = siteRoot + rel + hash;
        }
      }

      lunr.tokenizer.separator = /[\\s\\-\\/]+/;

      var index = lunr(function(){
        this.ref('id');
        this.field('title', { boost: 200 });
        this.field('content', { boost: 2 });
        this.field('relUrl');
        this.metadataWhitelist = ['position'];

        for (var i in docs) {
          this.add({
            id: i,
            title: docs[i].title,
            content: docs[i].content,
            relUrl: docs[i].relUrl
          });
        }
      });

      searchLoaded(index, docs);
    }
  JS

  # Matches the just-the-docs `<script src="...just-the-docs.js">`
  # tag in a rendered HTML page (after URL rewrite, so the `src`
  # value is page-relative -- e.g. `../../assets/js/just-the-docs.js`).
  # The captured group is everything in the src up to and excluding
  # the `just-the-docs.js` filename, used as the relative-path prefix
  # for the sibling `search-data.js` we generate. Anchored on
  # `<script src="..."` to skip incidental occurrences in code
  # blocks or string literals.
  JTD_SCRIPT_TAG_RE = /<script\s+src="([^"]*)just-the-docs\.js"/

  # Path of the just-the-docs search index (rendered by Jekyll when
  # `search_enabled` is true) and the JS-wrapped form we produce.
  SEARCH_DATA_JSON_REL = "assets/js/search-data.json"
  SEARCH_DATA_JS_REL   = "assets/js/search-data.js"

  # True when `rel` (a file's site-rooted forward-slash path) matches
  # any of the configured offline-exclude patterns. The patterns come
  # from `site.config['offline_exclude']` in `_config.yml`; an empty
  # or missing entry leaves the offline tree untouched. Matched with
  # `File::FNM_PATHNAME`, so `*` does not cross directory separators
  # (e.g. `*.bat` excludes only top-level .bat files, while
  # `**/*.bat` would exclude them at any depth).
  def self.offline_excluded?(rel, patterns)
    patterns.any? { |pat| File.fnmatch(pat, rel, File::FNM_PATHNAME) }
  end

  # Time the given block and accumulate its elapsed ms into
  # `@state[key]`, then return the block's value. When the build
  # was not started with `--profile`, this is a pass-through that
  # just calls the block -- no clock reads, no map writes. Callsites
  # therefore pay only one boolean check + one block yield when
  # profiling is off (negligible at the per-page rate).
  #
  # Usage:
  #   content = tick(:time_dispatch_dup) { page.output.dup }
  #   _changed, misses = tick(:time_rewrite_html) { rewrite_html!(...) }
  def self.tick(key)
    return yield unless @state[:profile]
    t = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    result = yield
    @state[key] += (Process.clock_gettime(Process::CLOCK_MONOTONIC) - t) * 1000
    result
  end

  # Per-build state, populated in `setup` and cleared in `finish`.
  # The :pages, :post_render and :site, :post_write hooks read it
  # via `@state`. Nil between builds, and nil during a build that
  # opted out (e.g. when `--incremental` is set).
  @state = nil

  # `:site, :pre_render` hook entry. Builds the URL-resolution set,
  # wipes the offline tree, and seeds the per-build state. Bails out
  # cleanly when incremental mode is on -- the per-page write model
  # would leave stale files for pages Jekyll chose not to re-render.
  def self.setup(site)
    if site.config["incremental"]
      @state = nil
      Jekyll.logger.warn "Offlinify:",
        "incremental mode is not supported; _site-offline/ will not be " \
        "updated this build. Disable also_build_offline or rebuild " \
        "without --incremental."
      return
    end

    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    out_dest = "#{site.dest}-offline"
    exclude_patterns = Array(site.config["offline_exclude"]).map(&:to_s)

    @state = {
      dest: site.dest,
      # Pre-normalised forward-slash form of site.dest. Used to
      # compute `rel` from `page.destination(dest)` via a plain
      # string slice in process_page -- much faster than wrapping
      # both in Pathname and calling relative_path_from per page
      # (Pathname is notably slow on Windows).
      dest_root_fs: site.dest.tr("\\", "/"),
      out_dest: out_dest,
      baseurl: normalize_baseurl(site.config["baseurl"]),
      # `site.url` with any trailing slash stripped. Used by the
      # redirect-stub branch in process_page to recognise and rewrite
      # the absolute `<site.url><path>` URLs that jekyll-redirect-from
      # bakes into each stub's meta-refresh, canonical link,
      # `<script>location=`, and fallback `<a>`. Empty when `url:` is
      # not configured -- the rewrite step short-circuits in that
      # case and the stub is written verbatim.
      site_url: site.config["url"].to_s.sub(%r{/+\z}, ""),
      exclude_patterns: exclude_patterns,
      site_paths: build_site_paths(site, exclude_patterns),
      # Lazy cache: `site_path -> [decoded_segs, encoded_segs]`.
      # Decoded drives the LCP walk against filesystem-derived
      # `file_segs`; encoded is what gets emitted in the output URL.
      seg_cache: {},
      # Lazy cache: `raw -> [sep, tail, site_path]` for absolute URLs.
      # `site_path` is nil when no candidate resolved against
      # site_paths. The expensive part of compute_relative (the
      # `partition`, `decode`, baseurl strip, and up-to-three-way
      # candidate probe) is independent of the source file, so it
      # runs once per unique `raw` URL across the whole build
      # regardless of how many files reference it. The LCP walk
      # itself stays in `compute_relative` because its output depends
      # on `file_segs`.
      raw_resolution_cache: {},
      # Nested lazy cache: `file_dir -> { raw -> final_rel_url or nil }`.
      # Each unique `(file_dir, raw)` pair is resolved exactly once
      # across the build. Per-page the outer lookup happens once
      # (yielding the inner hash for that source directory) and the
      # per-match work is a single hash lookup on the short `raw`
      # key -- no composite cache-key string allocation. Shared
      # between the absolute-URL and page-relative dispatches inside
      # the combined HTML pass -- the `raw` shapes are disjoint
      # (absolute starts with `/`, relative doesn't), so there's no
      # collision in the inner hash.
      result_cache: {},
      # Lazy cache: `file_dir -> rewritten_nav_html`. Populated on
      # the first page processed in each source directory; reused
      # for every subsequent page in the same directory. Each entry
      # is ~112 KB of pre-rewritten nav HTML. The cache size is
      # bounded by the number of unique source directories
      # (typically ~200), so total memory is ~25 MB during a build.
      # See `NAV_RE` and `NAV_PLACEHOLDER`.
      nav_cache: {},
      # Async write pool state. `write_queue` carries `[out_path,
      # content, time_key]` tuples enqueued by process_page; workers
      # pop and execute the `mkdir_p` + `binwrite`. Errors land on
      # `write_errors` and are surfaced by `drain_write_pool!` in
      # finish. `write_time_ms` accumulates per-key worker self-time
      # under `write_time_mutex` -- rolled into the corresponding
      # `@state[time_key]` during drain so the profile breakdown
      # keeps its per-extension granularity even though the actual
      # writes happened off-thread. `write_workers` is set after
      # the @state hash is built (see below).
      write_queue: Queue.new,
      write_errors: Queue.new,
      write_time_mutex: Mutex.new,
      write_time_ms: Hash.new(0.0),
      write_workers: nil,
      rewritten_html: 0,
      rewritten_css: 0,
      rewritten_redirects: 0,
      seo_stripped: 0,
      copied_files: 0,
      excluded_files: 0,
      unresolved: 0,
      # Cumulative time-in-Offlinify-hooks. Tracks self-time across
      # setup/process_page/finish so the reported number reflects
      # Offlinify's work alone -- not the wall-clock between
      # pre_render and post_write (which includes Jekyll's render
      # and write phases between our hooks).
      cumulative_ms: 0.0,
      # When true (the `--profile` build flag is set), the `tick`
      # helper measures each instrumented operation and the finish
      # hook emits a per-operation breakdown alongside Jekyll's own
      # render-stats table. When false, `tick` is a no-op pass-through
      # and the per-operation accumulators stay at zero.
      profile: !!site.config["profile"],
      time_setup: 0.0,
      time_strip_seo: 0.0,
      time_rewrite_html: 0.0,
      time_resolve: 0.0,
      time_inject_search: 0.0,
      time_write_html: 0.0,
      time_rewrite_css: 0.0,
      time_write_css: 0.0,
      time_rewrite_redirect: 0.0,
      time_write_redirect: 0.0,
      time_write_other: 0.0,
      time_write_drain: 0.0,
      time_dispatch_dup: 0.0,
      time_dest_path: 0.0,
      time_copy_static: 0.0,
      time_patch_jtd: 0.0,
      time_search_data: 0.0,
      # rewrite_html callback counters. Aggregated per page from
      # locals to keep the per-match cost a register-bump rather
      # than a hash lookup. Used by the profile-only details
      # breakdown emitted after the time rows.
      count_matches_href_src: 0,
      count_matches_code_block: 0,
      count_cache_misses: 0,
      count_compute_relative: 0,
      count_compute_rel_url: 0,
      count_nav_cache_hits: 0,
      count_nav_cache_misses: 0,
      count_pages_without_nav: 0,
    }

    wipe_out_dest_contents(out_dest)
    @state[:write_workers] = WRITE_POOL_SIZE.times.map { Thread.new { write_worker_loop } }
    elapsed = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000
    @state[:cumulative_ms] += elapsed
    @state[:time_setup] += elapsed if @state[:profile]
  end

  # Normalise the configured baseurl to either empty string or
  # `/segment...` with no trailing slash, matching the form
  # `relative_url` actually prepends to URLs in rendered HTML.
  # `relative_url` strips a configured trailing slash and adds a
  # leading one; we mirror that so the offline rewrite handles
  # both configurations.
  def self.normalize_baseurl(raw_baseurl)
    baseurl = (raw_baseurl || "").to_s.sub(%r{/+\z}, "")
    baseurl = "/#{baseurl}" if !baseurl.empty? && !baseurl.start_with?("/")
    baseurl
  end

  # Build the `site_paths` Set from Jekyll's in-memory page set
  # (pages + static_files + documents). Each item's `destination(dest)`
  # returns the absolute file path it will be written to; stripping
  # the site.dest prefix yields the site-rooted forward-slash form
  # the URL resolver expects (e.g. `/tB/Core/Const.html`). Keys are
  # decoded -- they mirror filesystem names, so `Form Designer.html`
  # goes in literally, not `Form%20Designer.html`.
  #
  # Uses a string slice rather than `Pathname#relative_path_from`,
  # which is ~200x slower on Windows -- ~30ns vs ~5µs per item, and
  # there are 1300+ items.
  def self.build_site_paths(site, exclude_patterns)
    paths = Set.new
    dest_root_fs = site.dest.tr("\\", "/")
    prefix_len = dest_root_fs.length + 1
    items = site.pages + site.static_files + site.documents
    items.each do |item|
      abs = item.destination(site.dest).tr("\\", "/")
      rel = abs[prefix_len..]
      next if offline_excluded?(rel, exclude_patterns)
      paths << "/#{rel}"
    end
    paths
  end

  # Wipe the offline output tree but keep the `_site-offline/`
  # directory itself in place. Deleting and recreating the directory
  # surfaces in jekyll-watch as a bare `_site-offline` change event
  # -- no trailing slash, since the directory was momentarily absent
  # at notification time -- which the exclude entry's auto-generated
  # `_site\-offline\/` regex does not match. Result: an infinite
  # rebuild loop on `jekyll serve`. Cleaning contents in place keeps
  # every event under `_site-offline/...` where the exclude matches.
  def self.wipe_out_dest_contents(out_dest)
    if Dir.exist?(out_dest)
      Dir.glob(File.join(out_dest, "*"), File::FNM_DOTMATCH).each do |entry|
        basename = File.basename(entry)
        next if basename == "." || basename == ".."
        FileUtils.rm_rf(entry)
      end
    else
      FileUtils.mkdir_p(out_dest)
    end
  end

  # `:pages, :post_render` / `:documents, :post_render` hook entry.
  # Called once per rendered page or document. Reads `page.output`
  # in memory and writes the offline copy straight to
  # `_site-offline/<rel>` -- no detour through `_site/`. Dispatches
  # on output extension: .html runs the combined URL rewrite + the
  # search-setup injection; .css runs the url() rewrite; anything
  # else (XML, JSON, etc.) is written verbatim.
  def self.process_page(page)
    return unless @state
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    # page.destination returns the absolute file path Jekyll will
    # write (joining site.dest with the URL-unescaped url). Strip
    # the dest prefix with a plain string slice rather than a
    # Pathname round-trip -- Pathname#relative_path_from is roughly
    # 2ms per call on Windows and would dominate per-page cost on a
    # 1000+ page build.
    dest_path, rel = tick(:time_dest_path) do
      dp = page.destination(@state[:dest]).tr("\\", "/")
      [dp, dp[(@state[:dest_root_fs].length + 1)..]]
    end

    if offline_excluded?(rel, @state[:exclude_patterns])
      @state[:excluded_files] += 1
    elsif page.class.name == "JekyllRedirectFrom::RedirectPage"
      # jekyll-redirect-from stubs are tiny HTML files whose
      # meta-refresh, canonical link, `<script>location=`, and
      # fallback `<a>` all reference an absolute
      # `https://<site.url>/<path>` URL produced by `absolute_url`.
      # Online these redirect to the canonical page; offline they
      # would require network access and land on the live site,
      # defeating the offline scenario. Some source pages (notably
      # `Miscellaneous/Documentation Development.md`) intentionally
      # link via redirect_from URLs as a stable-URL pattern, so the
      # stubs need to be reachable from inside `_site-offline/`.
      #
      # Rewrite each `<site_url><path>` occurrence to its resolved
      # page-relative form via the same `compute_relative` the main
      # HTML pass uses. Unresolved matches fall back to the original
      # absolute URL -- lychee will then flag the source as broken,
      # which is the right behaviour for a real bug. If `site.url`
      # is unset (empty), write the stub verbatim: lychee against
      # _site-offline/ will still find the path-portion targets in
      # the same way the main HTML pass does, so the stub passes
      # link-check even though it won't navigate locally.
      #
      # Class-name string check rather than `is_a?` so the plugin
      # still loads if jekyll-redirect-from is removed.
      out_path = File.join(@state[:out_dest], rel)
      file_dir = File.dirname(out_path)
      content = tick(:time_dispatch_dup) { page.output.dup }
      site_url = @state[:site_url]
      content = tick(:time_rewrite_redirect) do
        if site_url.empty?
          content
        else
          file_segs = file_dir_segs_from_rel(rel)
          prefix_re = /#{Regexp.escape(site_url)}(\/[^"' >]*)/
          page_cache = (@state[:result_cache][file_dir] ||= {})
          content.gsub(prefix_re) do
            raw = Regexp.last_match(1)
            rel_url = page_cache.fetch(raw) do
              page_cache[raw] =
                compute_relative(raw, file_segs, @state[:site_paths], @state[:seg_cache], @state[:baseurl], @state[:raw_resolution_cache])
            end
            rel_url || "#{site_url}#{raw}"
          end
        end
      end
      @state[:write_queue] << [out_path, content, :time_write_redirect]
      @state[:rewritten_redirects] += 1
    else
      out_path = File.join(@state[:out_dest], rel)
      file_dir = File.dirname(out_path)
      file_segs = file_dir_segs_from_rel(rel)

      case File.extname(dest_path).downcase
      when ".html"
        content = tick(:time_dispatch_dup) { page.output.dup }
        tick(:time_strip_seo) { @state[:seo_stripped] += 1 if strip_seo!(content) }
        _changed, misses = tick(:time_rewrite_html) do
          rewrite_html!(content, file_dir, file_segs, @state[:site_paths], @state[:seg_cache], @state[:result_cache], @state[:baseurl], @state[:raw_resolution_cache], @state[:nav_cache])
        end
        @state[:unresolved] += misses
        tick(:time_inject_search) { inject_search_setup!(content, file_segs) }
        @state[:write_queue] << [out_path, content, :time_write_html]
        @state[:rewritten_html] += 1
      when ".css"
        content = tick(:time_dispatch_dup) { page.output.dup }
        _changed, misses = tick(:time_rewrite_css) do
          rewrite_css!(content, file_dir, file_segs, @state[:site_paths], @state[:seg_cache], @state[:result_cache], @state[:baseurl], @state[:raw_resolution_cache])
        end
        @state[:unresolved] += misses
        @state[:write_queue] << [out_path, content, :time_write_css]
        @state[:rewritten_css] += 1
      else
        @state[:write_queue] << [out_path, page.output, :time_write_other]
        @state[:copied_files] += 1
      end
    end

    @state[:cumulative_ms] += (Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000
  end

  # `:site, :post_write` hook entry. Static files don't fire
  # `:pages, :post_render`, so we copy them from `_site/` here, after
  # Jekyll's WRITE has populated it. Also patches just-the-docs.js
  # and generates search-data.js from the search index Jekyll wrote
  # during the per-page phase. Logs the summary and elapsed time
  # and clears `@state`.
  def self.finish(site)
    return unless @state
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    # Drain async writes before any read from `_site-offline/`.
    # build_search_data_js! below reads `assets/js/search-data.json`,
    # which process_page enqueued via the write_other branch -- if a
    # worker hasn't flushed it yet, the read would see an incomplete
    # file. The drain also surfaces any worker exception that occurred
    # mid-build.
    tick(:time_write_drain) { drain_write_pool! }

    tick(:time_copy_static) do
      site.static_files.each do |sf|
        dest_path = sf.destination(@state[:dest]).tr("\\", "/")
        rel = dest_path[(@state[:dest_root_fs].length + 1)..]
        if offline_excluded?(rel, @state[:exclude_patterns])
          @state[:excluded_files] += 1
          next
        end
        out_path = File.join(@state[:out_dest], rel)
        copy_asset!(dest_path, out_path)
        @state[:copied_files] += 1
      end
    end

    js_patches = tick(:time_patch_jtd) { patch_jtd_js!(@state[:out_dest]) }
    search_data_built = tick(:time_search_data) { build_search_data_js!(@state[:out_dest]) }

    @state[:cumulative_ms] += (Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000

    summary = "rewrote #{@state[:rewritten_html]} HTML and #{@state[:rewritten_css]} CSS file(s), copied #{@state[:copied_files]} asset(s)"
    summary += ", rewrote #{@state[:rewritten_redirects]} redirect stub(s)" if @state[:rewritten_redirects].positive?
    summary += ", stripped SEO block from #{@state[:seo_stripped]} page(s)" if @state[:seo_stripped].positive?
    summary += ", excluded #{@state[:excluded_files]} file(s)" if @state[:excluded_files].positive?
    summary += " (#{@state[:unresolved]} unresolved link(s) left as-is)" if @state[:unresolved].positive?
    Jekyll.logger.info "Offlinify:", summary
    Jekyll.logger.info "Offlinify:", "patched just-the-docs.js (#{js_patches.join(", ")})" unless js_patches.empty?
    Jekyll.logger.info "Offlinify:", "wrote #{SEARCH_DATA_JS_REL} (#{search_data_built} bytes)" if search_data_built
    Jekyll.logger.info "Offlinify:", "Offlinifier ran in #{@state[:cumulative_ms].round(0)}ms."
    log_profile_breakdown if @state[:profile]

    @state = nil
  end

  # Per-operation timing breakdown emitted at the end of `finish`
  # when the build was started with `--profile`. The labels match
  # the `tick(:time_*)` keys spread across setup, process_page, and
  # finish. The sum of the listed rows is close to (but not exactly
  # equal to) `cumulative_ms` -- the difference is the per-hook
  # plumbing (state lookups, dispatch, `tick` overhead, file_dir
  # computation) that isn't itself wrapped in a `tick`.
  BREAKDOWN_KEYS = [
    [:time_setup,            "setup"],
    [:time_dest_path,        "dest_path"],
    [:time_dispatch_dup,     "page.output.dup"],
    [:time_strip_seo,        "strip_seo"],
    [:time_rewrite_html,     "rewrite_html"],
    [:time_resolve,          "  (of which time_resolve)"],
    [:time_inject_search,    "inject_search"],
    [:time_write_html,       "write_html"],
    [:time_rewrite_css,      "rewrite_css"],
    [:time_write_css,        "write_css"],
    [:time_rewrite_redirect, "rewrite_redirect"],
    [:time_write_redirect,   "write_redirect"],
    [:time_write_other,      "write_other"],
    [:time_write_drain,      "write_drain"],
    [:time_copy_static,      "copy_static"],
    [:time_patch_jtd,        "patch_jtd"],
    [:time_search_data,      "search_data"],
  ].freeze

  def self.log_profile_breakdown
    BREAKDOWN_KEYS.each do |key, label|
      Jekyll.logger.info "Offlinify:", format("  %-26s %7.1fms", label, @state[key])
    end
    href_src = @state[:count_matches_href_src]
    code_block = @state[:count_matches_code_block]
    misses = @state[:count_cache_misses]
    hits = href_src - misses
    cr = @state[:count_compute_relative]
    cru = @state[:count_compute_rel_url]
    nav_hits = @state[:count_nav_cache_hits]
    nav_misses = @state[:count_nav_cache_misses]
    no_nav = @state[:count_pages_without_nav]
    Jekyll.logger.info "Offlinify:",
      "  rewrite_html details:    matches=#{href_src + code_block} (href/src=#{href_src}, code/pre=#{code_block})"
    Jekyll.logger.info "Offlinify:",
      "                           result_cache: hits=#{hits}, misses=#{misses}#{hit_rate_str(hits, href_src)}"
    Jekyll.logger.info "Offlinify:",
      "                           resolver calls: compute_relative=#{cr}, compute_rel_url=#{cru}"
    Jekyll.logger.info "Offlinify:",
      "                           nav_cache: hits=#{nav_hits}, misses=#{nav_misses}, no-nav pages=#{no_nav}"
  end

  def self.hit_rate_str(hits, total)
    return "" if total.zero?
    format(" (%.1f%% hit rate)", 100.0 * hits / total)
  end

  # Copy a file from src to out, creating intermediate directories.
  # Used for everything in `_site/` that didn't need URL rewriting.
  def self.copy_asset!(src_path, out_path)
    FileUtils.mkdir_p(File.dirname(out_path))
    FileUtils.cp(src_path, out_path)
  end

  # Body of each async-write worker thread. Pops `[out_path, content,
  # time_key]` tuples off the shared queue, does the `mkdir_p` +
  # `binwrite`, and (when profiling is on) accumulates self-time into
  # `write_time_ms[time_key]` under `write_time_mutex`. A `nil` task
  # is the shutdown sentinel pushed by `drain_write_pool!`. Exceptions
  # land on `write_errors`; `drain_write_pool!` raises the first one
  # after joining the workers. Workers only touch fields established
  # in setup (the queue, the errors queue, the time mutex/hash, the
  # profile flag) -- no other @state mutation -- so the main thread's
  # counters (rewritten_html, unresolved, caches, etc.) stay safely
  # single-threaded.
  def self.write_worker_loop
    queue = @state[:write_queue]
    errors = @state[:write_errors]
    time_mutex = @state[:write_time_mutex]
    time_ms = @state[:write_time_ms]
    profile = @state[:profile]
    loop do
      task = queue.pop
      break if task.nil?
      out_path, content, time_key = task
      begin
        if profile
          t = Process.clock_gettime(Process::CLOCK_MONOTONIC)
          FileUtils.mkdir_p(File.dirname(out_path))
          File.binwrite(out_path, content)
          elapsed = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - t) * 1000
          time_mutex.synchronize { time_ms[time_key] += elapsed }
        else
          FileUtils.mkdir_p(File.dirname(out_path))
          File.binwrite(out_path, content)
        end
      rescue => e
        errors << [out_path, e]
      end
    end
  end

  # Shut down the write pool: push one `nil` sentinel per worker,
  # join them all, then roll the per-key worker self-time into
  # `@state[time_key]` so the profile breakdown still shows
  # `time_write_html`, `time_write_css`, etc. as the actual write
  # cost (just done on workers rather than the main thread). Raises
  # the first worker exception if any are pending -- a failed write
  # must abort the build rather than silently produce a half-populated
  # `_site-offline/` tree. Called once, at the top of `finish`,
  # before any read from `_site-offline/`.
  def self.drain_write_pool!
    workers = @state[:write_workers]
    return unless workers
    workers.length.times { @state[:write_queue] << nil }
    workers.each(&:join)
    @state[:write_workers] = nil

    if @state[:profile]
      @state[:write_time_ms].each { |key, ms| @state[key] += ms }
    end

    return if @state[:write_errors].empty?
    out_path, err = @state[:write_errors].pop
    raise "Offlinify async write failed for #{out_path}: " \
          "#{err.class}: #{err.message}\n#{err.backtrace.join("\n")}"
  end

  # Apply both JS patches to `assets/js/just-the-docs.js` under
  # `out_dest`. Returns the list of patch labels applied (for the
  # summary log line). Each substitution is independent; a missing
  # match leaves the corresponding piece unpatched and emits a
  # warning -- a likely signal that just-the-docs has shipped a new
  # function shape.
  def self.patch_jtd_js!(out_dest)
    js_path = File.join(out_dest, JTD_JS_REL)
    return [] unless File.file?(js_path)

    src = File.binread(js_path)
    out = src.dup
    patches = []

    new_out = out.sub(JTD_NAVLINK_RE, JTD_NAVLINK_REPLACEMENT)
    if new_out != out
      patches << "navLink()"
      out = new_out
    else
      Jekyll.logger.warn "Offlinify:",
        "could not locate navLink() in #{JTD_JS_REL} -- nav-active " \
        "detection will be broken under file://. Update " \
        "JTD_NAVLINK_RE to match the current just-the-docs version."
    end

    new_out = out.sub(JTD_INITSEARCH_FN_RE, JTD_INITSEARCH_FN_REPLACEMENT)
    if new_out != out
      patches << "initSearch()"
      out = new_out
    else
      Jekyll.logger.warn "Offlinify:",
        "could not locate initSearch() body in #{JTD_JS_REL} -- " \
        "offline search will not work and a failed XHR for " \
        "search-data.json will be logged to the console. Update " \
        "JTD_INITSEARCH_FN_RE to match the current just-the-docs " \
        "version."
    end

    File.binwrite(js_path, out) unless patches.empty?
    patches
  end

  # Inject the offline-search setup script tags into a rendered HTML
  # page. Two `<script>` elements are inserted right before the
  # existing `<script src="...just-the-docs.js">` tag:
  #
  #   1. `<script>window.OFFLINE_SITE_ROOT="...";</script>` -- the
  #      per-page relative prefix from the page's directory to the
  #      offline site root. The patched `initSearch()` reads this to
  #      rewrite `doc.url` from `/tB/Core/Const` to
  #      `<root>tB/Core/Const.html` so a search-result click lands on
  #      the actual file under file://.
  #   2. `<script src="<prefix>search-data.js"></script>` -- loads
  #      the lunr index data into `window.SEARCH_DATA`. Classic
  #      script tags are allowed under file://; the upstream XHR is
  #      not.
  #
  # Both run in source order before just-the-docs.js, so the globals
  # are set when `initSearch()` fires inside the document-ready
  # callback. Returns true when the injection happened, false when
  # the just-the-docs.js script tag wasn't found in the page (e.g.
  # the 404 redirect stubs that omit the full layout).
  def self.inject_search_setup!(content, file_segs)
    new_content = content.sub(JTD_SCRIPT_TAG_RE) do |match|
      prefix = Regexp.last_match(1)
      site_root = file_segs.empty? ? "" : "../" * file_segs.length
      <<~HTML.chomp + match
        <script>window.OFFLINE_SITE_ROOT="#{site_root}";</script>
        <script src="#{prefix}search-data.js"></script>
      HTML
    end
    return false if new_content == content
    content.replace(new_content)
    true
  end

  # Strip the jekyll-seo-tag plugin's output block, keeping only the
  # `<title>` tag (the browser tab label). The block is ~900 bytes
  # per page and the rest -- generator tag, OpenGraph/Twitter Card
  # meta, canonical link pointing at the live site, JSON-LD
  # structured data -- exists for search-engine crawlers and
  # social-media link previewers that never see `_site-offline/`.
  # Stripping also removes ~3 of the `https://docs.twinbasic.com`
  # references per page that would otherwise need to be carved
  # around by any "no live-site links" check.
  #
  # Runs before the URL rewrite so the rewrite isn't doing work on
  # URLs we're about to delete, and before the code-block scan so
  # the byte offsets it produces are valid against the post-strip
  # content. Returns true when the strip happened, false when the
  # block wasn't found (e.g. a page without the layout, or a future
  # build where the plugin is removed).
  def self.strip_seo!(content)
    return false unless content.include?("<!-- Begin Jekyll SEO tag")
    new_content = content.sub(SEO_BLOCK_RE) do |block|
      title = block.match(TITLE_RE)
      title ? title[0] : ""
    end
    return false if new_content == content
    content.replace(new_content)
    true
  end

  # Convert the rendered `assets/js/search-data.json` into a sibling
  # `assets/js/search-data.js` that assigns the data to a global. The
  # JS file is loaded as a `<script src=>` from each page (see
  # inject_search_setup!) so the data is available synchronously when
  # `initSearch()` runs. Returns the byte size of the written JS file
  # (for the summary log line) or false when there is no
  # search-data.json to convert (e.g. a build that disabled
  # `search_enabled`).
  def self.build_search_data_js!(out_dest)
    json_path = File.join(out_dest, SEARCH_DATA_JSON_REL)
    return false unless File.file?(json_path)

    json = File.binread(json_path)
    js = "window.SEARCH_DATA = #{json};\n"
    js_path = File.join(out_dest, SEARCH_DATA_JS_REL)
    File.binwrite(js_path, js)
    js.bytesize
  end

  # Mutates `content` in place via a single gsub matching three
  # disjoint shapes: a `<code>` block, a `<pre>` block, or an
  # `href|src=` attribute carrying an absolute (`/...`) or page-
  # relative (`Foo`, `Foo#frag`) URL. Returns
  # `[changed_bool, unresolved_count]`. Per-match work for a real
  # href/src is a single Hash lookup in `result_cache` -- the heavy
  # lifting (URL resolution, LCP walk, segment encoding) runs only
  # on cache miss.
  #
  # The code-block alternatives are consumed atomically by the regex
  # engine and returned verbatim from the callback (the engine never
  # tries the href/src alternative inside a code block, so example
  # URLs in tutorial code samples are not rewritten and don't count
  # as unresolved). Group 1 of the match is nil on those branches;
  # an early `next match[0]` short-circuits before any cache work.
  #
  # Dispatches inside the gsub block on whether `raw` starts with
  # `/`: absolute URLs go through `compute_relative` (resolves to a
  # page-relative form), page-relative ones go through
  # `compute_rel_url` (probes the filesystem for `<rel>`,
  # `<rel>.html`, `<rel>/index.html` and re-attaches the matching
  # suffix). Both share `result_cache` since their cache keys are
  # disjoint -- absolute starts with `/`, relative doesn't.
  #
  # `compute_rel_url` may return the input unchanged when the file
  # already exists at the relative path verbatim (e.g. `Foo.html`
  # from a sibling markdown source); this is treated as "no rewrite
  # needed, not a miss".
  #
  # Nav-block caching: the just-the-docs sidebar nav (~112 KB,
  # ~750 of each page's ~860 href matches) is identical in the
  # rendered `_site/` output across all pages (Jekyll emits root-
  # absolute URLs that don't depend on the source page) and its
  # rewritten form depends only on `file_dir`. The first page in
  # each source directory does the full gsub including the nav and
  # caches the rewritten nav in `nav_cache[file_dir]`. Every
  # subsequent page in the same directory swaps the input nav for
  # `NAV_PLACEHOLDER` before the gsub, runs the rewrite on the
  # remaining ~25 KB of content, then splices the cached nav back
  # in place of the placeholder. Skips ~750 gsub callbacks per
  # cache-hit page.
  def self.rewrite_html!(content, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, raw_resolution_cache, nav_cache)
    misses = 0
    changed = false
    profile = @state[:profile]
    # Hoist the outer-cache lookup once per page. The inner hash
    # accumulates entries for every URL seen from this source
    # directory; per-match work is then a single hash lookup keyed
    # by the short `raw` string, with no composite-cache-key
    # allocation.
    page_cache = (result_cache[file_dir] ||= {})
    # Per-page locals aggregated into @state at the end of the
    # method. Keeps the inner-loop counter bumps register-local
    # rather than a hash lookup per match, and zeroes the overhead
    # when --profile is off (the `if profile` checks fold to nothing
    # under a constant-true branch predictor).
    matches_href_src = 0
    matches_code_block = 0
    cache_misses = 0
    compute_relative_calls = 0
    compute_rel_url_calls = 0

    # Nav-block caching. If we have a rewritten nav for this
    # source directory, substitute the input nav with a placeholder
    # before the gsub so the engine doesn't scan ~112 KB of nav
    # body for ~750 href matches we already know the answer for.
    # `String#sub!` returns the modified string on success and nil
    # otherwise; that's the signal that we need to splice the
    # cached nav back after the gsub.
    cached_nav = nav_cache[file_dir]
    placeholder_inserted = false
    if cached_nav
      placeholder_inserted = !content.sub!(NAV_RE, NAV_PLACEHOLDER).nil?
      @state[:count_nav_cache_hits] += 1 if profile && placeholder_inserted
    end

    # `gsub!` mutates `content` in place and returns `nil` when no
    # substitution occurred. The callback returns the literal match
    # body on every short-circuit path (code/pre blocks, unresolved,
    # already-correct), so the only "real" changes are the
    # interpolated replacement strings on the final `else` branch.
    # `changed` tracks this so the caller knows whether anything
    # actually moved -- the return value of `gsub!` itself is unused.
    content.gsub!(HTML_COMBINED_RE) do
      match = Regexp.last_match
      attr_name = match[1]
      if attr_name.nil?  # <code>/<pre> block — leave verbatim
        matches_code_block += 1 if profile
        next match[0]
      end
      matches_href_src += 1 if profile

      raw = match[3]
      rel = page_cache.fetch(raw) do
        cache_misses += 1 if profile
        page_cache[raw] =
          if raw.start_with?("/")
            compute_relative_calls += 1 if profile
            tick(:time_resolve) { compute_relative(raw, file_segs, site_paths, seg_cache, baseurl, raw_resolution_cache) }
          else
            compute_rel_url_calls += 1 if profile
            tick(:time_resolve) { compute_rel_url(raw, file_segs, site_paths) }
          end
      end

      if rel.nil?
        misses += 1
        match[0]
      elsif rel == raw
        # File exists at the relative path verbatim; the link is
        # already correct (relative branch only -- compute_relative
        # never returns the input unchanged).
        match[0]
      else
        changed = true
        %(#{attr_name}=#{match[2]}#{rel}#{match[2]})
      end
    end

    # Splice the cached nav back where the placeholder lives, or,
    # if this is the first page seen in `file_dir`, extract the
    # just-rewritten nav from the output and seed the cache for
    # subsequent pages in the same directory.
    if placeholder_inserted
      content.sub!(NAV_PLACEHOLDER, cached_nav)
      changed = true
    elsif (output_nav_match = NAV_RE.match(content))
      nav_cache[file_dir] = output_nav_match[0]
      @state[:count_nav_cache_misses] += 1 if profile
    elsif profile
      @state[:count_pages_without_nav] += 1
    end

    if profile
      @state[:count_matches_href_src] += matches_href_src
      @state[:count_matches_code_block] += matches_code_block
      @state[:count_cache_misses] += cache_misses
      @state[:count_compute_relative] += compute_relative_calls
      @state[:count_compute_rel_url] += compute_rel_url_calls
    end
    [changed, misses]
  end

  # Mutates `content` in place via gsub over `url(...)` references
  # that start with `/`. Returns `[changed_bool, unresolved_count]`.
  # Per-match work is a single Hash lookup in `result_cache` -- the
  # heavy lifting (URL resolution, LCP walk, segment encoding) runs
  # only on cache miss. CSS has no code-block concept, so there is
  # no need to gate matches by offset the way `rewrite_html!` does.
  def self.rewrite_css!(content, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, raw_resolution_cache)
    misses = 0
    changed = false
    page_cache = (result_cache[file_dir] ||= {})

    new_content = content.gsub(CSS_URL_RE) do
      match = Regexp.last_match
      raw = match[2]
      quote = match[1]
      rel = page_cache.fetch(raw) do
        page_cache[raw] = compute_relative(raw, file_segs, site_paths, seg_cache, baseurl, raw_resolution_cache)
      end
      if rel.nil?
        misses += 1
        match[0]
      else
        changed = true
        "url(#{quote}#{rel}#{quote})"
      end
    end

    content.replace(new_content) if changed
    [changed, misses]
  end

  # Resolve a page-relative URL `raw` against the current file's
  # directory segments `file_segs` (relative to dest). Probes the
  # filesystem (via `site_paths`) for the target file. If found,
  # returns the original `raw` with the matching suffix (`.html`,
  # `/index.html`, or none) appended to its path portion -- the
  # `#fragment` / `?query` tail is preserved verbatim. Returns nil
  # when no candidate matches.
  #
  # Example: from a file at `tB/Core/Const.html`, raw
  # `Attributes#description`:
  #   file_segs    = ["tB", "Core"]
  #   path/sep/tail = "Attributes" / "#" / "description"
  #   probed paths  = /tB/Core/Attributes,
  #                   /tB/Core/Attributes.html,    <- matches
  #                   /tB/Core/Attributes/index.html
  #   returns "Attributes.html#description"
  def self.compute_rel_url(raw, file_segs, site_paths)
    path, sep, tail = raw.partition(/[?#]/)
    return nil if path.empty?

    decoded = decode(path)
    trailing_slash = decoded.end_with?("/")
    segs = file_segs + decoded.split("/", -1)
    stack = []
    segs.each do |seg|
      case seg
      when "", "."
        # current dir / consecutive slashes -- skip
      when ".."
        stack.pop
      else
        stack.push(seg)
      end
    end

    probe_path = "/#{stack.join("/")}"
    probe_path = "#{probe_path}/" if trailing_slash && !probe_path.end_with?("/")

    candidates = if probe_path.end_with?("/")
      [["", probe_path], ["index.html", "#{probe_path}index.html"]]
    elsif probe_path.include?(".")
      [["", probe_path], ["/index.html", "#{probe_path}/index.html"]]
    else
      [["", probe_path], [".html", "#{probe_path}.html"], ["/index.html", "#{probe_path}/index.html"]]
    end

    candidates.each do |suffix, full|
      if site_paths.include?(full)
        return "#{path}#{suffix}#{sep}#{tail}"
      end
    end
    nil
  end

  # Resolve `raw` to a page-relative URL string from a file whose
  # directory is the segment array `file_segs`. Returns nil when no
  # candidate file exists in `site_paths`.
  #
  # Steps:
  #   1. Split off `?query` / `#fragment`.
  #   2. Percent-decode the path.
  #   3. Probe up to three candidates against `site_paths` in order:
  #      `<path>` as-is, `<path>.html`, `<path>/index.html` (with
  #      sensible variants for paths that already end with `/` or
  #      contain a `.`).
  #   4. Look up the resolved site_path in `seg_cache`, getting back
  #      a pair of `[decoded_segs, encoded_segs]` arrays (the cache
  #      lazily populates on first reference).
  #   5. Walk the longest common prefix between `file_segs` (decoded
  #      directory segments of the source file, relative to dest) and
  #      `decoded_segs` (decoded path segments of the target).
  #   6. Build `"../" * (file_depth - common) + encoded_segs[common..]
  #      .join("/")` and re-attach the tail.
  def self.compute_relative(raw, file_segs, site_paths, seg_cache, baseurl, raw_resolution_cache)
    sep, tail, site_path = raw_resolution_cache.fetch(raw) do
      raw_resolution_cache[raw] = resolve_raw(raw, site_paths, baseurl)
    end
    return nil if site_path.nil?

    decoded_segs, encoded_segs = seg_cache.fetch(site_path) do
      seg_cache[site_path] = build_segs(site_path)
    end

    common = 0
    fs_len = file_segs.length
    ts_len = decoded_segs.length
    common += 1 while common < fs_len && common < ts_len && file_segs[common] == decoded_segs[common]

    ascend = "../" * (fs_len - common)
    descend = encoded_segs[common..].join("/")
    rel = ascend + descend
    rel = "./" if rel.empty?
    "#{rel}#{sep}#{tail}"
  end

  # File-dir-independent half of `compute_relative`: parses `raw`,
  # strips any configured baseurl, probes site_paths for the target
  # file. Returns `[sep, tail, site_path]` -- `site_path` is the
  # resolved key into `seg_cache` (a string like
  # `/tB/Core/Const.html`), or `nil` when no candidate exists in
  # the page set. `sep` and `tail` are the `?query` / `#fragment`
  # split from raw, preserved verbatim by the caller.
  #
  # Called once per unique `raw` URL across the build, via the
  # `raw_resolution_cache.fetch { ... }` block in `compute_relative`.
  # The per-page LCP walk + URL build stays in `compute_relative`
  # because both depend on the source file's `file_segs`.
  def self.resolve_raw(raw, site_paths, baseurl)
    path, sep, tail = raw.partition(/[?#]/)
    fs_path = decode(path)

    # Strip the baseurl prefix the `relative_url` filter prepended.
    # Two forms can occur: an exact match (`/<baseurl>`) or a normal
    # subpath (`/<baseurl>/foo`). Without this step, `/<baseurl>/foo`
    # never matches the site_paths entry `/foo.html` and the rewrite
    # would leave every link as-is.
    unless baseurl.empty?
      if fs_path == baseurl
        fs_path = "/"
      elsif fs_path.start_with?("#{baseurl}/")
        fs_path = fs_path[baseurl.length..]
      end
    end

    candidates = if fs_path.end_with?("/")
      [fs_path, "#{fs_path}index.html"]
    elsif fs_path.include?(".")
      [fs_path, "#{fs_path}/index.html"]
    else
      [fs_path, "#{fs_path}.html", "#{fs_path}/index.html"]
    end

    site_path = candidates.find { |c| site_paths.include?(c) }
    [sep, tail, site_path]
  end

  # Build the cached `[decoded_segs, encoded_segs]` pair for a
  # site-rooted path. Decoded segments drive the LCP comparison
  # against filesystem-derived `file_segs`; encoded segments are what
  # ends up in the output URL. For URL-safe segments the two arrays
  # share strings -- only segments containing reserved characters
  # (e.g. spaces) get a separately-allocated encoded form.
  def self.build_segs(site_path)
    decoded = site_path[1..].split("/", -1)
    encoded = decoded.map do |seg|
      if seg.match?(PATH_SAFE_RE)
        seg.b.gsub(PATH_SAFE_RE) { |c| format("%%%02X", c.ord) }
      else
        seg
      end
    end
    [decoded, encoded]
  end

  # Compute a file's directory segments from its relative-to-dest
  # path string, used as the LCP-comparison input for
  # compute_relative. Returns an empty array for files at the root
  # of dest.
  def self.file_dir_segs_from_rel(rel)
    rel = rel.tr("\\", "/")
    dir = File.dirname(rel)
    return [] if dir == "." || dir.empty?
    dir.split("/")
  end

  # Percent-decode a URL path. Path components do not use `+` for
  # space (that is form-encoding), so a plain `%XX` -> byte decode is
  # correct.
  def self.decode(path)
    path.gsub(/%([0-9A-Fa-f]{2})/) { [Regexp.last_match(1)].pack("H*") }
        .force_encoding("UTF-8")
  end
end

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
