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

    # Pre-walk the destination once and bucket every file under its
    # site-rooted forward-slash path. The same nav appears on every
    # page, so a URL like `/FAQ` is resolved ~1100 times -- without
    # this cache each one is 2-3 File.file? syscalls (very slow on
    # Windows). With the cache, each lookup is an O(1) Set probe.
    site_paths = Set.new
    dest_pn = Pathname.new(dest)
    Dir.glob(File.join(dest, "**", "*"), File::FNM_DOTMATCH).each do |p|
      next unless File.file?(p)
      rel = Pathname.new(p).relative_path_from(dest_pn).to_s.tr("\\", "/")
      site_paths << "/#{rel}"
    end

    rewritten_html = 0
    rewritten_css  = 0
    unresolved = 0
    resolve_cache = {}

    Dir.glob(File.join(dest, HTML_GLOB)).each do |path|
      content = File.binread(path)
      changed, misses = rewrite!(content, HTML_ATTR_RE, path, dest, site_paths, resolve_cache, mode: :html)
      unresolved += misses
      next unless changed
      File.binwrite(path, content)
      rewritten_html += 1
    end

    Dir.glob(File.join(dest, CSS_GLOB)).each do |path|
      content = File.binread(path)
      changed, misses = rewrite!(content, CSS_URL_RE, path, dest, site_paths, resolve_cache, mode: :css)
      unresolved += misses
      next unless changed
      File.binwrite(path, content)
      rewritten_css += 1
    end

    js_patched = patch_jtd_js!(dest)

    summary = "rewrote #{rewritten_html} HTML and #{rewritten_css} CSS file(s)"
    summary += " (#{unresolved} unresolved link(s) left as-is)" if unresolved.positive?
    summary += "; patched just-the-docs.js navLink()" if js_patched
    Jekyll.logger.info "Offlinify:", summary
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

  # Mutates `content` in place via gsub!. Returns
  # `[changed_bool, unresolved_count]`.
  def self.rewrite!(content, regex, file_path, dest, site_paths, resolve_cache, mode:)
    file_dir = File.dirname(file_path)
    misses = 0
    changed = false

    new_content = content.gsub(regex) do
      match = Regexp.last_match
      raw = mode == :html ? match[3] : match[2]
      site_target = resolve_cache.fetch(raw) do
        resolve_cache[raw] = resolve_to_site_path(raw, site_paths)
      end
      if site_target.nil?
        misses += 1
        match[0]  # leave the match unchanged
      else
        changed = true
        rel = relative_url(site_target, file_dir, dest)
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

  # Resolve `raw` (a root-absolute URL, possibly with `?query`/
  # `#fragment`) to the canonical site-rooted file path (e.g. `/FAQ`
  # -> `/FAQ.html`, `/Tutorials/CEF/` -> `/Tutorials/CEF/index.html`)
  # plus the original query/fragment tail. Returns
  # `[site_path, sep_and_tail]` or nil when no candidate matches.
  def self.resolve_to_site_path(raw, site_paths)
    path, sep, tail = raw.partition(/[?#]/)
    fs_path = decode(path)

    candidates = [fs_path]
    candidates << "#{fs_path}.html" unless fs_path.end_with?("/") || fs_path.include?(".")
    candidates << (fs_path.end_with?("/") ? "#{fs_path}index.html" : "#{fs_path}/index.html")

    candidates.each do |c|
      return [c, "#{sep}#{tail}"] if site_paths.include?(c)
    end
    nil
  end

  # Build the page-relative URL from `from_dir` to `site_target`
  # (a `[site_path, tail]` pair returned by resolve_to_site_path).
  def self.relative_url(site_target, from_dir, dest)
    site_path, tail = site_target
    target_abs = File.join(dest, site_path)
    rel = Pathname.new(target_abs).relative_path_from(Pathname.new(from_dir)).to_s.tr("\\", "/")
    "#{encode_path(rel)}#{tail}"
  end

  # Percent-decode a URL path. Path components do not use `+` for space
  # (that is form-encoding), so a plain `%XX` -> byte decode is correct.
  def self.decode(path)
    path.gsub(/%([0-9A-Fa-f]{2})/) { [Regexp.last_match(1)].pack("H*") }
        .force_encoding("UTF-8")
  end

  # Re-encode each path segment, leaving `/` between segments unencoded.
  def self.encode_path(path)
    path.split("/", -1).map do |seg|
      seg.b.gsub(PATH_SAFE_RE) { |c| format("%%%02X", c.ord) }
    end.join("/")
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["offline_build"]
  Offlinify.run(site)
end
