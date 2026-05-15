# frozen_string_literal: true

require "fileutils"
require "pathname"
require "set"

# Produces a `file://`-browsable copy of the rendered site. Two modes:
#
#   1. Combined mode (default; `also_build_offline: true` in
#      `_config.yml`). Plain `bundle exec jekyll build` writes the
#      online site to `site.dest` (`_site/`) as usual, then this plugin
#      copies the tree to `<site.dest>-offline` (`_site-offline/`),
#      rewrites every URL to a page-relative form, patches a couple of
#      just-the-docs JS issues, and hides the (file://-broken) search
#      box. One Jekyll pipeline run, two outputs.
#
#   2. Standalone mode (`offline_build: true` from `_config_offline.yml`,
#      via `build-offline.bat`). Jekyll renders directly to
#      `_site-offline/` with `search_enabled: false`, no `_site/` is
#      produced, and the plugin rewrites in place. Faster than combined
#      mode when only the offline copy is wanted.
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
# === just-the-docs JS patches ===
#
# `assets/js/just-the-docs.js` has two pieces that don't survive the
# move to `file://`:
#
#   * `navLink()` matches the active nav entry by string-comparing
#     `document.location.pathname` against link `href` attribute
#     strings. Online both are root-absolute; offline pathname is a
#     filesystem path (`/D:/.../tB/Core/Const.html`) and hrefs are
#     page-relative (`Const.html`) -- no match, no nav-list-item gets
#     `class="active"`, sidebar collapses on every navigation. Patched
#     in both modes: replace the function body with a comparison of
#     the resolved `link.href` DOM property (an absolute URL the
#     browser produced from the relative attribute) against
#     `window.location.href`.
#
#   * `initSearch()` (combined mode only -- standalone mode renders
#     with `search_enabled: false`, which omits initSearch from the JS
#     file entirely) fires an `XMLHttpRequest` for
#     `/assets/js/search-data.json`. Browsers block `file://` XHR for
#     file resources by default; the request fails silently in the
#     `request.onerror` handler. Patched in combined mode: comment
#     out the `initSearch();` call site so the function never runs
#     (no failed XHR, no console noise). The search box markup is
#     left in place -- search functionality is expected to be wired
#     up by some other mechanism downstream.
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
# unrewritten root-absolute URLs that don't resolve under `file://`.

module Offlinify
  # Matches `href="..."` / `href='...'` / `src=...` attribute values
  # whose URL starts with a single slash (not protocol-relative `//`).
  # Captures: 1=attribute name, 2=quote char, 3=URL.
  HTML_ATTR_RE = /\b(href|src)=(["'])(\/(?!\/)[^"']*)\2/.freeze

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

  # Matches the `initSearch();` call inside the document-ready
  # callback. Combined-mode only -- standalone mode's JS is rendered
  # without the search code at all.
  JTD_INITSEARCH_CALL_RE = /^(\s*)initSearch\(\);$/

  # Comment-out replacement for the call site. The function
  # definition remains in the file but is now unreachable, so no
  # XMLHttpRequest for search-data.json is fired (browsers block that
  # under file:// for file resources). The search box markup itself
  # is left in place -- the assumption is that search functionality
  # will be wired up downstream via a different mechanism.
  JTD_INITSEARCH_CALL_REPLACEMENT = '\1// initSearch(); -- offlinify: disabled (file:// XHR for search-data.json fails)'

  def self.run(site, src_dest, out_dest)
    return unless Dir.exist?(src_dest)

    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    combined = (src_dest != out_dest)

    # In combined mode, wipe the offline output tree and recreate it
    # empty. (In-place mode: out_dest IS the dest Jekyll already
    # cleaned and wrote; nothing to do.)
    if combined
      FileUtils.rm_rf(out_dest)
      FileUtils.mkdir_p(out_dest)
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
    unresolved = 0

    Dir.glob(File.join(src_dest, "**", "*"), File::FNM_DOTMATCH).each do |src_path|
      next unless File.file?(src_path)
      rel = src_path[src_dest.length + 1..]
      out_path = combined ? File.join(out_dest, rel) : src_path

      case File.extname(src_path).downcase
      when ".html"
        content = File.binread(src_path)
        file_dir  = File.dirname(out_path)
        file_segs = file_dir_segs_from_rel(rel)
        changed, misses = rewrite!(content, HTML_ATTR_RE, file_dir, file_segs, site_paths, seg_cache, result_cache, mode: :html)
        unresolved += misses
        if changed
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
        changed, misses = rewrite!(content, CSS_URL_RE, file_dir, file_segs, site_paths, seg_cache, result_cache, mode: :css)
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

    js_patches = patch_jtd_js!(out_dest, disable_search: combined)

    summary = "rewrote #{rewritten_html} HTML and #{rewritten_css} CSS file(s)"
    summary += ", copied #{copied_assets} asset(s)" if combined
    summary += " (#{unresolved} unresolved link(s) left as-is)" if unresolved.positive?
    Jekyll.logger.info "Offlinify:", summary
    Jekyll.logger.info "Offlinify:", "patched just-the-docs.js (#{js_patches.join(", ")})" unless js_patches.empty?

    elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(0)
    Jekyll.logger.info "Offlinify:", "Offlinifier ran in #{elapsed_ms}ms."
  end

  # Copy a file from src to out, creating intermediate directories.
  # Used in combined mode for everything except modified HTML/CSS.
  def self.copy_asset!(src_path, out_path)
    FileUtils.mkdir_p(File.dirname(out_path))
    FileUtils.cp(src_path, out_path)
  end

  # Apply the JS patches to `assets/js/just-the-docs.js` under
  # `out_dest`. Returns the list of patch labels applied (for the
  # summary log line). Always attempts navLink; only attempts the
  # initSearch call-site comment-out when `disable_search:` is true
  # (combined mode -- in standalone mode the JS file has no
  # initSearch in it to begin with).
  def self.patch_jtd_js!(out_dest, disable_search:)
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

    if disable_search
      new_out = out.sub(JTD_INITSEARCH_CALL_RE, JTD_INITSEARCH_CALL_REPLACEMENT)
      if new_out != out
        patches << "initSearch() call site"
        out = new_out
      else
        Jekyll.logger.warn "Offlinify:",
          "could not locate initSearch() call in #{JTD_JS_REL} -- " \
          "the failed XHR for search-data.json will appear in the " \
          "browser console under file:// (harmless, but noisy). " \
          "Update JTD_INITSEARCH_CALL_RE to match the current " \
          "just-the-docs version."
      end
    end

    File.binwrite(js_path, out) unless patches.empty?
    patches
  end

  # Mutates `content` in place via gsub. Returns
  # `[changed_bool, unresolved_count]`. Per-match work is a single
  # Hash lookup in `result_cache` -- the heavy lifting (URL
  # resolution, LCP walk, segment encoding) runs only on cache miss.
  def self.rewrite!(content, regex, file_dir, file_segs, site_paths, seg_cache, result_cache, mode:)
    misses = 0
    changed = false

    new_content = content.gsub(regex) do
      match = Regexp.last_match
      raw = mode == :html ? match[3] : match[2]
      cache_key = "#{file_dir}\x00#{raw}"
      rel = result_cache.fetch(cache_key) do
        result_cache[cache_key] = compute_relative(raw, file_segs, site_paths, seg_cache)
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
  def self.compute_relative(raw, file_segs, site_paths, seg_cache)
    path, sep, tail = raw.partition(/[?#]/)
    fs_path = decode(path)

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
