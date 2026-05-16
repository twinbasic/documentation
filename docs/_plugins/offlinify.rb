# frozen_string_literal: true

require "fileutils"
require "pathname"
require "set"

# Produces a `file://`-browsable copy of the rendered site. Two modes
# that produce byte-equivalent offline output (the only difference
# between them is whether `_site/` is also written):
#
#   1. Combined mode (default; `also_build_offline: true` in
#      `_config.yml`). Plain `bundle exec jekyll build` writes the
#      online site to `site.dest` (`_site/`) as usual, then this plugin
#      copies the tree to `<site.dest>-offline` (`_site-offline/`),
#      rewrites every URL to a page-relative form, patches a couple of
#      just-the-docs JS issues, and wires up the search index to load
#      from a `<script src=>` instead of XHR. One Jekyll pipeline run,
#      two outputs.
#
#   2. Standalone mode (`offline_build: true` from `_config_offline.yml`,
#      via `build-offline.bat`). Jekyll renders directly to
#      `_site-offline/` with no `_site/` produced, and the plugin
#      rewrites in place. Faster than combined mode when only the
#      offline copy is wanted; the result is identical to what combined
#      mode writes to `_site-offline/`.
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
# Reads `site.dest`, `site.config['offline_build']`, and
# `site.config['also_build_offline']`. In combined mode writes a fresh
# `<site.dest>-offline/` tree (wiping any prior contents); in
# standalone mode writes back into `site.dest`. Touches no files
# outside those.
#
# If the plugin is removed: the combined build silently stops
# producing `_site-offline/` (Jekyll's normal `_site/` output is
# unaffected); the standalone build produces a `_site-offline/` with
# unrewritten root-absolute URLs that don't resolve under `file://`,
# a search box that fires a failed XHR for `search-data.json`, and a
# nav whose active-section highlighting collapses on every navigation.

module Offlinify
  # Matches `href="..."` / `href='...'` / `src=...` attribute values
  # whose URL starts with a single slash (not protocol-relative `//`).
  # Captures: 1=attribute name, 2=quote char, 3=URL.
  HTML_ATTR_RE = /\b(href|src)=(["'])(\/(?!\/)[^"']*)\2/.freeze

  # Matches `href`/`src` attribute values that are page-relative --
  # they do not start with `/`, `#`, or a URL scheme. Used to catch
  # links that come from markdown sources verbatim (e.g.
  # `[Foo](Foo#section)`), which Jekyll passes through unmodified
  # and therefore do not get the baseurl prefix that `relative_url`
  # would have added. These need their `.html` extension added so
  # they resolve under `file://`.
  #
  # Excluded by the lookahead:
  #   `#...`                    fragment-only (same-page anchors)
  #   `/...` / `//...`          absolute / protocol-relative (HTML_ATTR_RE)
  #   `mailto:`, `http:`, etc.  any RFC 3986 URL scheme
  HTML_REL_HREF_RE = %r{\b(href|src)=(["'])((?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\2}.freeze

  # Matches `url(...)` in CSS where the URL starts with a single slash.
  # The URL may be bare or wrapped in single/double quotes. Captures:
  # 1=quote char (or empty), 2=URL.
  CSS_URL_RE = /url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)/.freeze

  # Characters safe in a URL path segment (RFC 3986 unreserved + sub-
  # delims that don't need encoding in a path). Everything else is
  # percent-encoded byte-by-byte.
  PATH_SAFE_RE = /[^A-Za-z0-9\-_.~!$&'()*+,;=:@]/.freeze

  # Path of the just-the-docs JS file relative to the site root.
  JTD_JS_REL = "assets/js/just-the-docs.js"

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

  # Matches `<code>...</code>` and `<pre>...</pre>` blocks, capturing
  # the BODY between the tags (group 2). Used to identify regions of
  # rendered HTML the URL rewrite passes should leave alone -- the
  # example URLs in tutorial code samples (e.g. `<script src="/script.js">`
  # shown verbatim in a CEF page) would otherwise be picked up by the
  # href/src regex even though they aren't real links. Rouge's syntax
  # highlighter HTML-escapes `<` and `>` inside code but leaves `"`
  # alone, so `src="/script.js"` survives as a literal substring that
  # the rewrite regex matches.
  #
  # Non-greedy + backreference matches the first closing tag of the
  # same name. Nested `<code>` doesn't occur in just-the-docs output;
  # the typical structure is `<pre class="highlight"><code>...</code></pre>`
  # and matching either outer tag is enough to cover everything
  # inside.
  CODE_BLOCK_RE = /<(code|pre)\b[^>]*>(.*?)<\/\1>/m.freeze

  # Sentinel for callers (CSS rewrite) that don't have code-block
  # context. Avoids allocating a throwaway array per file.
  EMPTY_RANGES = [].freeze

  # Returns an array of `[body_start, body_end]` byte ranges for every
  # code-block body in `content`. Empty when there are no code blocks.
  # Used in conjunction with `in_code_block?` to gate the rewrite
  # regexes -- matches whose offset falls inside any of these ranges
  # are left as-is and not counted as unresolved.
  def self.code_block_ranges(content)
    ranges = []
    content.scan(CODE_BLOCK_RE) do
      m = Regexp.last_match
      ranges << [m.begin(2), m.end(2)]
    end
    ranges
  end

  # True when `offset` falls inside any of the code-block ranges. The
  # ranges array is typically small (a handful per page) so a linear
  # scan is fine; sorting/bisecting would be overkill.
  def self.in_code_block?(offset, ranges)
    ranges.any? { |s, e| offset >= s && offset < e }
  end

  def self.run(site, src_dest, out_dest)
    return unless Dir.exist?(src_dest)

    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    combined = (src_dest != out_dest)

    # Jekyll's `relative_url` filter prepends `site.baseurl` to every
    # URL it produces, so when baseurl is non-empty (e.g. on a Pages
    # project site without a custom domain, where configure-pages
    # outputs a `/repo-name` base_path), the rendered HTML hrefs look
    # like `/<baseurl>/foo` while files in site_paths are stored
    # without the prefix. Strip the prefix during resolution so the
    # offline rewrite works regardless of baseurl. Normalised to
    # either empty string or `/segment...` with no trailing slash.
    # Normalise to either empty or `/segment...` with no trailing
    # slash, matching the form `relative_url` prepends to URLs in the
    # rendered HTML. The configured value may lack a leading slash
    # (Jekyll adds one when emitting), and may carry a trailing slash
    # the rendered URLs don't have.
    baseurl = (site.config["baseurl"] || "").to_s.sub(%r{/+\z}, "")
    baseurl = "/#{baseurl}" if !baseurl.empty? && !baseurl.start_with?("/")

    # Patterns for files Jekyll wrote into _site/ that have no purpose
    # in the offline tree (Pages CNAME, sitemap, robots, etc.). Loaded
    # from `site.config['offline_exclude']` so the policy lives in
    # _config.yml; an empty / missing entry skips this step entirely.
    exclude_patterns = Array(site.config["offline_exclude"]).map(&:to_s)

    # In combined mode, wipe the offline output tree but keep the
    # `_site-offline/` directory itself in place. (Deleting and
    # recreating the directory surfaces in jekyll-watch as a bare
    # `_site-offline` change event -- no trailing slash, since the
    # directory was momentarily absent at notification time -- which
    # the exclude entry's auto-generated `_site\-offline\/` regex
    # does not match. The result was an infinite rebuild loop on
    # `jekyll serve`. Cleaning contents in place keeps every event
    # under `_site-offline/...`, where the exclude does match.)
    # In-place mode: out_dest IS the dest Jekyll already cleaned and
    # wrote; nothing to do.
    if combined
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

    # Pre-walk the source tree once and bucket every file under its
    # site-rooted forward-slash path (decoded -- the keys mirror
    # filesystem names, so `/Tutorials/CustomControls/Form Designer.html`
    # not `Form%20Designer`). Resolution in compute_relative becomes an
    # O(1) Set probe per candidate, instead of 2-3 File.file? syscalls
    # each (very slow on Windows).
    site_paths = Set.new
    src_pn = Pathname.new(src_dest)
    Dir.glob(File.join(src_dest, "**", "*"), File::FNM_DOTMATCH).each do |p|
      next unless File.file?(p)
      rel = Pathname.new(p).relative_path_from(src_pn).to_s.tr("\\", "/")
      next if offline_excluded?(rel, exclude_patterns)
      site_paths << "/#{rel}"
    end

    # Lazy global cache: `site_path -> [decoded_segs, encoded_segs]`.
    # Filled on first reference. Decoded segments drive the LCP walk
    # (compared against filesystem-derived `file_segs`); encoded
    # segments are what we emit in the output URL.
    seg_cache = {}

    # Lazy global cache: `"#{file_dir}\x00#{raw}" -> final_rel_url`
    # (or nil for unresolvable). Subsumes step 1 (raw -> site_path)
    # and step 2 (site_path -> page-relative URL) so each unique
    # `(file_dir, raw)` pair is computed exactly once across the build.
    result_cache = {}

    rewritten_html = 0
    rewritten_css  = 0
    copied_assets  = 0
    excluded_files = 0
    unresolved = 0

    Dir.glob(File.join(src_dest, "**", "*"), File::FNM_DOTMATCH).each do |src_path|
      next unless File.file?(src_path)
      rel = src_path[src_dest.length + 1..]

      if offline_excluded?(rel.tr("\\", "/"), exclude_patterns)
        # Combined mode: src_dest is _site/, out_dest is _site-offline/.
        # Skipping the file means it never gets copied, leaving the
        # online _site/ untouched.
        # Standalone mode: src_dest IS out_dest. Jekyll already wrote
        # the file; delete it so the offline-only tree comes out
        # equivalent to what combined mode produces.
        File.delete(src_path) unless combined
        excluded_files += 1
        next
      end

      out_path = combined ? File.join(out_dest, rel) : src_path

      case File.extname(src_path).downcase
      when ".html"
        content = File.binread(src_path)
        file_dir  = File.dirname(out_path)
        file_segs = file_dir_segs_from_rel(rel)
        # Compute code-block byte ranges before each rewrite pass.
        # Pass 1 may shift downstream offsets (it rewrites href/src
        # attribute values, which usually grow), so Pass 2 needs a
        # fresh scan against the post-Pass-1 content.
        code_ranges = code_block_ranges(content)
        changed_url, misses = rewrite!(content, HTML_ATTR_RE, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, code_ranges, mode: :html)
        unresolved += misses
        code_ranges = code_block_ranges(content) if changed_url
        changed_rel, rel_misses = rewrite_rel!(content, file_dir, file_segs, site_paths, result_cache, code_ranges)
        unresolved += rel_misses
        changed_search = inject_search_setup!(content, file_segs)
        if changed_url || changed_rel || changed_search
          FileUtils.mkdir_p(File.dirname(out_path)) if combined
          File.binwrite(out_path, content)
          rewritten_html += 1
        elsif combined
          copy_asset!(src_path, out_path)
          copied_assets += 1
        end
      when ".css"
        content = File.binread(src_path)
        file_dir  = File.dirname(out_path)
        file_segs = file_dir_segs_from_rel(rel)
        changed, misses = rewrite!(content, CSS_URL_RE, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, EMPTY_RANGES, mode: :css)
        unresolved += misses
        if changed
          FileUtils.mkdir_p(File.dirname(out_path)) if combined
          File.binwrite(out_path, content)
          rewritten_css += 1
        elsif combined
          copy_asset!(src_path, out_path)
          copied_assets += 1
        end
      else
        if combined
          copy_asset!(src_path, out_path)
          copied_assets += 1
        end
      end
    end

    js_patches = patch_jtd_js!(out_dest)
    search_data_built = build_search_data_js!(out_dest)

    summary = "rewrote #{rewritten_html} HTML and #{rewritten_css} CSS file(s)"
    summary += ", copied #{copied_assets} asset(s)" if combined
    summary += ", excluded #{excluded_files} file(s)" if excluded_files.positive?
    summary += " (#{unresolved} unresolved link(s) left as-is)" if unresolved.positive?
    Jekyll.logger.info "Offlinify:", summary
    Jekyll.logger.info "Offlinify:", "patched just-the-docs.js (#{js_patches.join(", ")})" unless js_patches.empty?
    Jekyll.logger.info "Offlinify:", "wrote #{SEARCH_DATA_JS_REL} (#{search_data_built} bytes)" if search_data_built

    elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(0)
    Jekyll.logger.info "Offlinify:", "Offlinifier ran in #{elapsed_ms}ms."
  end

  # Copy a file from src to out, creating intermediate directories.
  # Used in combined mode for everything except modified HTML/CSS.
  def self.copy_asset!(src_path, out_path)
    FileUtils.mkdir_p(File.dirname(out_path))
    FileUtils.cp(src_path, out_path)
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

  # Mutates `content` in place via gsub. Returns
  # `[changed_bool, unresolved_count]`. Per-match work is a single
  # Hash lookup in `result_cache` -- the heavy lifting (URL
  # resolution, LCP walk, segment encoding) runs only on cache miss.
  #
  # `code_ranges` is an array of `[start, end]` byte ranges covering
  # the bodies of `<code>` / `<pre>` blocks in `content`; matches
  # whose offset falls in any range are left untouched and do not
  # count as unresolved. Pass an empty array (or omit `code_ranges`
  # for the CSS mode, which has no such concept).
  def self.rewrite!(content, regex, file_dir, file_segs, site_paths, seg_cache, result_cache, baseurl, code_ranges, mode:)
    misses = 0
    changed = false

    new_content = content.gsub(regex) do
      match = Regexp.last_match
      next match[0] if !code_ranges.empty? && in_code_block?(match.begin(0), code_ranges)

      raw = mode == :html ? match[3] : match[2]
      cache_key = "#{file_dir}\x00#{raw}"
      rel = result_cache.fetch(cache_key) do
        result_cache[cache_key] = compute_relative(raw, file_segs, site_paths, seg_cache, baseurl)
      end
      if rel.nil?
        misses += 1
        match[0]
      else
        changed = true
        if mode == :html
          %(#{match[1]}=#{match[2]}#{rel}#{match[2]})
        else
          quote = match[1]
          "url(#{quote}#{rel}#{quote})"
        end
      end
    end

    content.replace(new_content) if changed
    [changed, misses]
  end

  # Companion to `rewrite!` for page-relative URLs that didn't go
  # through `relative_url` (e.g. links that came straight from
  # markdown sources like `[Foo](Foo#section)`). Mutates `content`
  # in place. Returns `[changed_bool, unresolved_count]`. Shares the
  # `result_cache` with the absolute-URL pass since the keyed `raw`
  # values are disjoint (absolute URLs start with `/`, relative ones
  # don't). `code_ranges` excludes matches inside `<code>` / `<pre>`
  # blocks (same handling as `rewrite!`).
  def self.rewrite_rel!(content, file_dir, file_segs, site_paths, result_cache, code_ranges)
    misses = 0
    changed = false

    new_content = content.gsub(HTML_REL_HREF_RE) do
      match = Regexp.last_match
      next match[0] if !code_ranges.empty? && in_code_block?(match.begin(0), code_ranges)

      raw = match[3]
      cache_key = "#{file_dir}\x00#{raw}"
      rel = result_cache.fetch(cache_key) do
        result_cache[cache_key] = compute_rel_url(raw, file_segs, site_paths)
      end
      if rel.nil?
        misses += 1
        match[0]
      elsif rel == raw
        # File already exists at the relative path verbatim; the
        # link is correct as-is (e.g. `Foo.html` from a sibling
        # markdown source).
        match[0]
      else
        changed = true
        %(#{match[1]}=#{match[2]}#{rel}#{match[2]})
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
  def self.compute_relative(raw, file_segs, site_paths, seg_cache, baseurl)
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
    return nil unless site_path

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

Jekyll::Hooks.register :site, :post_write do |site|
  if site.config["offline_build"]
    # Standalone mode: site.dest IS the offline copy; rewrite in place.
    Offlinify.run(site, site.dest, site.dest)
  elsif site.config["also_build_offline"]
    # Combined mode: site.dest is the online copy; produce the offline
    # variant alongside it at <site.dest>-offline.
    Offlinify.run(site, site.dest, "#{site.dest}-offline")
  end
end
