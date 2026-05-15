# frozen_string_literal: true

require "pathname"
require "set"

# Rewrites root-absolute URLs in the built site to page-relative URLs so
# that the output can be browsed directly off disk via `file://`, with
# no HTTP server required. Activated only when
# `site.config['offline_build']` is truthy (set in `_config_offline.yml`);
# dormant on the standard online build.
#
# === Problem ===
#
# The site uses `permalink:` frontmatter that produces extensionless,
# root-absolute URLs (e.g. `/tB/Core/Const`), and the just-the-docs
# theme emits asset references and nav links via the `relative_url`
# Liquid filter, which prepends `site.baseurl` -- root-absolute when
# baseurl is empty. Two consequences make the default `_site/` unusable
# for `file://` browsing:
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
# rendering links -- and per-page `permalink:` frontmatter overrides any
# global URL-shape change.
#
# === Approach ===
#
# A `:site, :post_write` hook walks the built tree once everything is on
# disk. For each `.html` file, regex-substitute every `href="..."` /
# `src="..."` whose value starts with `/` (and is not protocol-relative
# `//`). For each `.css` file, do the same for `url(...)` references
# (just-the-docs ships a `background-image: url("/favicon.png")` rule
# for the site logo).
#
# The substitution:
#
#   1. Splits the value into `path`, optional `?query`, optional
#      `#fragment`.
#   2. Percent-decodes the path to obtain the filesystem candidate
#      (e.g. `Form%20Designer` -> `Form Designer`).
#   3. Probes three candidates against `site.dest`:
#        a. `<path>` as-is              -- e.g. `/assets/css/foo.css`
#        b. `<path>.html`               -- e.g. `/FAQ` -> `/FAQ.html`
#        c. `<path>/index.html`         -- e.g. `/Tutorials/CEF/`
#                                         -> `/Tutorials/CEF/index.html`
#      The first existing file wins.
#   4. Computes the relative path from the directory holding the current
#      file to the resolved target, re-encodes the path segments, and
#      emits `<rel><query><fragment>`.
#
# === Output parity ===
#
# The substitution only changes attribute values that start with a
# single `/`. Fragment-only (`#main-content`), protocol-relative
# (`//cdn...`), absolute (`http://...`, `https://...`, `mailto:...`),
# and already-relative URLs are left untouched. Targets that fail to
# resolve to any file under `site.dest` are also left untouched, with a
# count emitted in the summary log line.
#
# === Compatibility ===
#
# Reads `site.dest` and `site.config['offline_build']`. Writes back into
# `site.dest`; touches no files outside it. The HTML/CSS rewrite is a
# string substitution, not a parse -- attribute values containing
# literal unescaped `<`, `>`, or the matched quote character would
# defeat the regex, but no rendered page on this site contains them in
# href/src positions.
#
# If the plugin is removed, the offline build degrades to producing
# unrewritten root-absolute URLs in `_site-offline/` -- the build still
# succeeds but the output is not usable under `file://`.

module Offlinify
  # Matches `href="..."` / `href='...'` / `src=...` attribute values
  # whose URL starts with a single slash (not protocol-relative `//`).
  # Captures: 1=attribute name, 2=quote char, 3=URL.
  HTML_ATTR_RE = /\b(href|src)=(["'])(\/(?!\/)[^"']*)\2/.freeze

  # Matches `url(...)` in CSS where the URL starts with a single slash.
  # The URL may be bare or wrapped in single/double quotes. Captures:
  # 1=quote char (or empty), 2=URL.
  CSS_URL_RE = /url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)/.freeze

  HTML_GLOB = "**/*.html"
  CSS_GLOB  = "**/*.css"

  # Characters safe in a URL path segment (RFC 3986 unreserved + sub-
  # delims that don't need encoding in a path). Everything else is
  # percent-encoded byte-by-byte.
  PATH_SAFE_RE = /[^A-Za-z0-9\-_.~!$&'()*+,;=:@]/.freeze

  # Path of the just-the-docs JS file relative to `site.dest`. The
  # bundled version's `navLink()` matches `document.location.pathname`
  # against link `href` attribute strings -- works online (both are
  # root-absolute URLs) but breaks under file:// (pathname is a
  # filesystem path; hrefs are page-relative after rewriting). With no
  # match, no nav-list-item gets `class="active"` and the sidebar
  # collapses on every navigation. Patched out by `patch_jtd_js!`.
  JTD_JS_REL = "assets/js/just-the-docs.js"

  # Matches the upstream `navLink()` function body verbatim. Anchored
  # on the function signature and the closing `return null;` comment
  # (a stable-looking trailer in just-the-docs 0.10.x). Failure to
  # match leaves the file untouched and emits a warning -- a likely
  # signal that just-the-docs has shipped a new version of the function
  # and the regex needs updating.
  JTD_NAVLINK_RE = /function navLink\(\) \{.*?return null; \/\/ avoids `undefined`\s*\}/m

  # Replacement body. Compares the link's resolved `.href` DOM property
  # (an absolute URL the browser produced from the relative attribute,
  # taking the document base into account) against the document URL
  # with hash and query stripped. Works in both online (https://...)
  # and offline (file://...) modes.
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

  def self.run(site)
    dest = site.dest
    return unless Dir.exist?(dest)

    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    # Pre-walk the destination once and bucket every file under its
    # site-rooted forward-slash path (decoded -- the keys mirror
    # filesystem names, so `/Tutorials/CustomControls/Form Designer.html`
    # not `Form%20Designer`). Resolution becomes an O(1) Set probe per
    # candidate, instead of 2-3 File.file? syscalls each (very slow on
    # Windows).
    site_paths = Set.new
    dest_pn = Pathname.new(dest)
    Dir.glob(File.join(dest, "**", "*"), File::FNM_DOTMATCH).each do |p|
      next unless File.file?(p)
      rel = Pathname.new(p).relative_path_from(dest_pn).to_s.tr("\\", "/")
      site_paths << "/#{rel}"
    end

    # Lazy global cache: `site_path -> [decoded_segs, encoded_segs]`.
    # Filled on first reference. Decoded segments drive the LCP walk
    # (compared against filesystem-derived `file_segs`); encoded
    # segments are what we emit in the output URL. Most nav targets
    # are shared across pages, so this hits cache for the bulk of
    # matches after the first handful of pages.
    seg_cache = {}

    # Lazy global cache: `"#{file_dir}\x00#{raw}" -> final_rel_url`
    # (or nil for unresolvable). Subsumes step 1 (raw -> site_path)
    # and step 2 (site_path -> page-relative URL) so each unique
    # `(file_dir, raw)` pair is computed exactly once across the build.
    result_cache = {}

    rewritten_html = 0
    rewritten_css  = 0
    unresolved = 0

    Dir.glob(File.join(dest, HTML_GLOB)).each do |path|
      content = File.binread(path)
      file_dir  = File.dirname(path)
      file_segs = file_dir_segs(path, dest)
      changed, misses = rewrite!(content, HTML_ATTR_RE, file_dir, file_segs, site_paths, seg_cache, result_cache, mode: :html)
      unresolved += misses
      next unless changed
      File.binwrite(path, content)
      rewritten_html += 1
    end

    Dir.glob(File.join(dest, CSS_GLOB)).each do |path|
      content = File.binread(path)
      file_dir  = File.dirname(path)
      file_segs = file_dir_segs(path, dest)
      changed, misses = rewrite!(content, CSS_URL_RE, file_dir, file_segs, site_paths, seg_cache, result_cache, mode: :css)
      unresolved += misses
      next unless changed
      File.binwrite(path, content)
      rewritten_css += 1
    end

    js_patched = patch_jtd_js!(dest)

    summary = "rewrote #{rewritten_html} HTML and #{rewritten_css} CSS file(s)"
    summary += " (#{unresolved} unresolved link(s) left as-is)" if unresolved.positive?
    Jekyll.logger.info "Offlinify:", summary
    Jekyll.logger.info "Offlinify:", "patched just-the-docs.js navLink()" if js_patched

    elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(0)
    Jekyll.logger.info "Offlinify:", "Offlinifier ran in #{elapsed_ms}ms."
  end

  # Replace the bundled `navLink()` function in just-the-docs.js with
  # an offline-safe version. Returns true on a successful patch, false
  # when the file is missing or the upstream function shape no longer
  # matches the regex (a new just-the-docs version may have changed
  # it).
  def self.patch_jtd_js!(dest)
    js_path = File.join(dest, JTD_JS_REL)
    return false unless File.file?(js_path)

    src = File.binread(js_path)
    new_src = src.sub(JTD_NAVLINK_RE, JTD_NAVLINK_REPLACEMENT)

    if new_src == src
      Jekyll.logger.warn "Offlinify:",
        "could not locate navLink() in #{JTD_JS_REL} -- nav-active " \
        "detection will be broken under file://. Update JTD_NAVLINK_RE " \
        "to match the current just-the-docs version."
      return false
    end

    File.binwrite(js_path, new_src)
    true
  end

  # Mutates `content` in place via gsub. Returns
  # `[changed_bool, unresolved_count]`. Per-match work is a single
  # Hash lookup in `result_cache` -- the heavy lifting (URL resolution,
  # LCP walk, segment encoding) runs only on cache miss.
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

  # Compute a file's directory segments relative to `dest` (the site
  # root), used as the LCP-comparison input for compute_relative.
  # Returns an empty array for files at the root of dest.
  def self.file_dir_segs(file_path, dest)
    rel = Pathname.new(file_path).relative_path_from(Pathname.new(dest)).to_s.tr("\\", "/")
    dir = File.dirname(rel)
    return [] if dir == "." || dir.empty?
    dir.split("/")
  end

  # Percent-decode a URL path. Path components do not use `+` for space
  # (that is form-encoding), so a plain `%XX` -> byte decode is correct.
  def self.decode(path)
    path.gsub(/%([0-9A-Fa-f]{2})/) { [Regexp.last_match(1)].pack("H*") }
        .force_encoding("UTF-8")
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["offline_build"]
  Offlinify.run(site)
end
