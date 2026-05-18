# frozen_string_literal: true

# BOOKPLAN.md Phase 2.2 cross-reference rewrites for the PDF book.
#
# Walks each <article id="ch-..."> chapter body in the rendered
# /book.html, resolves relative-path hrefs to absolute URLs, and
# looks the absolute up in the permalink -> chapter-anchor map built
# from `_data/book.yml` and `site.pages`. On hit, rewrites the href
# to an in-book `#ch-...` (or `#ch-...-frag` for a heading fragment);
# on miss, the href is left alone (per BOOKPLAN.md: "probably broken
# markdown or a link to a page that didn't make it into the book").
#
# Replaces a Liquid implementation that used to live inline in
# book.html. The Liquid version peaked at ~21 s of render-phase
# overhead -- mostly Liquid filter dispatch from a per-(chapter *
# permalink) inner loop. Pre-computation (Option A) and a gate
# contains check (Option B) brought that to ~3.6 s; this Ruby pass
# closes the rest, using one URI.merge per href and one Hash lookup
# per resolved path.
#
# Hooked into `:pages, :post_render` so it sees each page's final
# rendered HTML (after Liquid + layout) and can mutate `page.output`
# in place before Jekyll writes the file. Filters to the `book.html`
# source path so non-book pages incur no cost. Matches the BOOKPLAN
# build-time tooling policy carve-out for render concerns that need
# tighter integration with Jekyll than Liquid can give -- the same
# shape as `_plugins/offlinify.rb`.

require "uri"

module BookHrefRewrite
  EXTERNAL_PREFIXES = ["http://", "https://", "mailto:", "#"].freeze
  # Landing pages live inside a chaptered Part, where the include applies
  # 1.5a + 1.9-extra-shift to every chapter body by default. The source H1
  # therefore arrives at the post-render HTML as an <h3>. Stripping the
  # first <h3> keeps the chapter-divider's H2 as the chapter's sole
  # outline entry at depth 2 -- without this strip the landing would emit
  # a redundant H3 with the same title text, just one level deeper.
  #
  # When the chapter or its containing part sets `no_heading_shift`, the
  # landing's source H1 lands at a different depth (H2 if one shift is
  # skipped, H1 if both are), so the strip target is computed per
  # chapter in `build_landing_strip_targets`.

  # `url.gsub('/', '-').sub(/^-/, '').sub(/-$/, '')` then prepend "ch-".
  # Matches the chapter anchor scheme established in BOOKPLAN.md 1.5b.
  #
  # The root URL `/` collapses to an empty path under the default
  # derivation; fall back to a slug of `fallback_title` (the matching
  # book.yml entry's `title:`) so the anchor reads `ch-introduction`
  # instead of just `ch-`. book.html applies the same fallback for
  # front-matter chapters at `/`.
  def self.chapter_anchor(url, fallback_title = nil)
    seed = url.gsub("/", "-").sub(/\A-/, "").sub(/-\z/, "")
    if seed.empty? && fallback_title && !fallback_title.empty?
      seed = fallback_title.downcase.gsub(" ", "-")
    end
    "ch-" + seed
  end

  # Parent URL for the chapter -- the URL itself when it already ends
  # in '/' (folder-style index), otherwise the URL with the trailing
  # segment stripped (single-file leaf).
  def self.parent_url_of(url)
    url.end_with?("/") ? url : url.sub(/[^\/]+\z/, "")
  end

  # Iterates the book manifest's front-matter entries, the parts'
  # forewords (1.9), and the parts themselves -- both flat parts
  # (`prefixes:`/`page:` directly on the part) and chaptered parts'
  # individual chapter entries (`part.chapters` list, 1.9). Each
  # yielded entry has the same shape as far as URL gathering goes:
  # any combination of `page:`, `landing_page:`, and `prefixes:`.
  def self.book_entries(site)
    manifest = site.data["book"]
    return [] unless manifest
    entries = []
    entries.concat(manifest["front_matter"] || [])
    (manifest["parts"] || []).each do |part|
      if part["page"] || part["nav_page"] || part["prefixes"] || part["nav_prefixes"] || part["landing_page"]
        entries << part
      end
      if part["foreword_page"]
        entries << { "page" => part["foreword_page"], "title" => part["title"] }
      end
      (part["chapters"] || []).each { |ch| entries << ch }
    end
    entries
  end

  # Pages matched by a single book.yml entry. An entry may set any
  # of `page:` (exact URL match, one-chapter sections like the FAQ
  # or the root index), `nav_page:` (exact match against
  # `page.data["nav_path"]`; the nav-tree counterpart of `page:`),
  # `landing_page:` (the chapter's intro page in a chaptered part;
  # treated like `page:` for map-building), `prefixes:` (starts-with
  # match against page.url), and `nav_prefixes:` (starts-with match
  # against page.data["nav_path"], populated by _plugins/nav-path.rb).
  # The union is returned de-duplicated since the landing typically
  # also matches one of the prefixes (e.g. `/tB/Packages/VBRUN/`
  # landing matches the prefix `/tB/Packages/VBRUN/`), and a page can
  # be picked up by both a URL and a nav-path selector.
  def self.entry_pages(entry, site)
    pages = []
    if entry["page"]
      pages.concat(site.pages.select { |p| p.url == entry["page"] })
    end
    if entry["nav_page"]
      pages.concat(site.pages.select { |p| p["nav_path"] == entry["nav_page"] })
    end
    if entry["landing_page"]
      pages.concat(site.pages.select { |p| p.url == entry["landing_page"] })
    end
    if entry["prefixes"]
      entry["prefixes"].each do |prefix|
        pages.concat(site.pages.select { |p| p.url.start_with?(prefix) })
      end
    end
    if entry["nav_prefixes"]
      entry["nav_prefixes"].each do |np|
        pages.concat(site.pages.select { |p|
          nav_path = p["nav_path"]
          nav_path && nav_path.start_with?(np)
        })
      end
    end
    pages.uniq
  end

  # Map of chapter-anchor -> heading-tag-to-strip for landing pages
  # that need their redundant top-of-body heading removed. Two
  # flavours of landing carry the same redundancy:
  #
  #   * Part-level `landing_page:` on a flat part. The part divider's
  #     H1 carries the part title; the landing's source H1 would
  #     repeat it one level deeper (H2 after the 1.5a shift, or H1
  #     when `no_heading_shift` skips the shift).
  #   * Chapter-level `landing_page:` on a chaptered-part chapter.
  #     The chapter divider's H2 carries the chapter title; the
  #     landing's source H1 lands at h3 by default (1.5a + 1.9 extra
  #     shifts) and is stripped so the chapter divider's H2 is the
  #     chapter's sole outline entry at depth 2.
  #
  # The strip is skipped entirely when the carrying entry sets
  # `no_outline_entry: true` -- without the divider's heading in the
  # outline, the landing's first heading IS the entry's bookmark
  # target and must stay.
  #
  # Strip target tag for a part-level landing:
  #   default:                  strip h2
  #   part.no_heading_shift:    strip h1
  #
  # Strip target tag for a chapter-level landing:
  #   default (both shifts apply):                            strip h3
  #   ch_entry.no_heading_shift (skip 1.9 extra shift only):  strip h2
  #   part.no_heading_shift     (skip 1.5a base shift only):  strip h2
  #   both flags set (no shifts applied):                     strip h1
  def self.build_landing_strip_targets(site)
    map = {}
    manifest = site.data["book"]
    return map unless manifest
    (manifest["parts"] || []).each do |part|
      part_skip_base = !!part["no_heading_shift"]

      if part["landing_page"] && !part["no_outline_entry"]
        level = part_skip_base ? 1 : 2
        anchor = chapter_anchor(part["landing_page"], part["title"])
        map[anchor] = "h#{level}"
      end

      (part["chapters"] || []).each do |ch|
        next unless ch["landing_page"]
        next if ch["no_outline_entry"]
        ch_skip_extra = !!ch["no_heading_shift"]
        level = 1
        level += 1 unless part_skip_base
        level += 1 unless ch_skip_extra
        anchor = chapter_anchor(ch["landing_page"], ch["title"])
        map[anchor] = "h#{level}"
      end
    end
    map
  end

  # Build the permalink -> chapter-anchor map. Folder-style index
  # pages (URL ending in '/') also get an alt entry without the
  # trailing slash, since source authors sometimes drop it
  # (`[CheckBox](../CheckBox)` instead of `[CheckBox](../CheckBox/)`)
  # and the PDF can't rely on the live site's trailing-slash redirect.
  #
  # The `.html` suffix is also symmetrized: pages without explicit
  # `permalink:` frontmatter end up at `/X.html`, while pages with
  # an explicit permalink usually end up at `/X` (no extension).
  # Source markdown is inconsistent about which form it writes in
  # links, and the live site smooths over the mismatch with server
  # config the PDF doesn't have. Adding both the `/X` and `/X.html`
  # forms to the map covers it.
  def self.build_url_to_anchor(site)
    map = {}
    book_entries(site).each do |entry|
      entry_pages(entry, site).each do |page|
        anchor = chapter_anchor(page.url, entry["title"])
        map[page.url] = anchor
        if page.url.end_with?("/")
          map[page.url.chomp("/")] = anchor
        elsif page.url.end_with?(".html")
          map[page.url.sub(/\.html\z/, "")] = anchor
        else
          map[page.url + ".html"] = anchor
        end
      end
    end
    map
  end

  # The article id in the rendered HTML is `ch-...` -- a lossy
  # transform of the chapter URL (slashes collapse to dashes, so a
  # URL with hyphens in its segments can't be recovered by reversal).
  # Build a parallel anchor -> parent-URL map from the same source
  # the anchor was derived from.
  def self.build_anchor_to_parent(site)
    map = {}
    book_entries(site).each do |entry|
      entry_pages(entry, site).each do |page|
        map[chapter_anchor(page.url, entry["title"])] = parent_url_of(page.url)
      end
    end
    map
  end

  # Resolve a (relative or absolute) href against the chapter's URL
  # parent and return the absolute path with optional fragment. Uses
  # URI.merge with a dummy scheme/host so RFC-3986 path normalization
  # (`../`, `./`, bare `.`/`..`, fragment-only) is handled by the
  # standard library rather than re-implemented inline.
  #
  # Returns nil on URI parse failure -- the caller treats that as a
  # miss and leaves the href untouched.
  def self.resolve_href(href, parent_url)
    return href if href.start_with?("/")
    base = URI("http://x" + parent_url)
    merged = base.merge(URI(href))
    merged.fragment ? "#{merged.path}##{merged.fragment}" : merged.path
  rescue URI::InvalidURIError, ArgumentError
    nil
  end

  # Normalise `site.config["baseurl"]` to either "" or "/segment..."
  # (no trailing slash) -- the exact prefix `relative_url` actually
  # injects into rendered HTML. Mirrors `Offlinify.normalize_baseurl`;
  # duplicated rather than cross-required to keep plugins independent.
  def self.normalize_baseurl(raw_baseurl)
    baseurl = (raw_baseurl || "").to_s.sub(%r{/+\z}, "")
    baseurl = "/#{baseurl}" if !baseurl.empty? && !baseurl.start_with?("/")
    baseurl
  end

  # Strip the baseurl prefix from a root-absolute path so the result
  # matches the keys in `url_to_anchor` (which are built from
  # `page.url` -- baseurl-less). Two forms are handled: the exact
  # baseurl alone (`/twinBASIC-docs` -> `/`), and a normal subpath
  # (`/twinBASIC-docs/foo` -> `/foo`). Anything else passes through.
  def self.strip_baseurl(path, baseurl)
    return path if baseurl.empty?
    return "/" if path == baseurl
    return path[baseurl.length..] if path.start_with?(baseurl + "/")
    path
  end

  # Rewrite every `href="..."` in the article body. External and
  # already-in-book anchor hrefs (`http`, `mailto:`, `#...`) pass
  # through unchanged; the `#...` form has already been chapter-anchor
  # prefixed by the 1.5b Liquid chain in book.html so `#ch-...` is
  # what we see here, not raw `#anchor`.
  #
  # On map miss the resolved absolute URL is emitted, not the original
  # relative form. Both are equally dead in the PDF reader, but the
  # absolute form matches what the previous Liquid implementation
  # produced (its relative-resolution chain ran unconditionally and
  # only the map-lookup step was selective). Keeps build output
  # byte-comparable and makes broken out-of-book links easier to grep
  # for during verification.
  #
  # `baseurl` is the normalised `site.config["baseurl"]`; when CI runs
  # `jekyll build --baseurl /<repo>` the `relative_url`-emitted hrefs
  # carry that prefix and must be stripped before the lookup, since
  # `url_to_anchor` keys come from `page.url` (baseurl-less).
  def self.rewrite_body(body, parent_url, url_to_anchor, baseurl)
    body.gsub(/href="([^"]*)"/) do |whole_match|
      href = Regexp.last_match(1)
      next whole_match if EXTERNAL_PREFIXES.any? { |pfx| href.start_with?(pfx) }

      abs = resolve_href(href, parent_url)
      next whole_match unless abs && abs.start_with?("/")

      path_part, frag_part = abs.split("#", 2)
      lookup_path = strip_baseurl(path_part, baseurl)
      target = url_to_anchor[lookup_path]
      if target
        frag_part ? %(href="##{target}-#{frag_part}") : %(href="##{target}")
      else
        # Out-of-book target: emit the baseurl-stripped form so the
        # URL the PDF reader displays is stable across local builds
        # and the `--baseurl /<repo>` CI deploy path. Dead in the PDF
        # either way, but the canonical (baseurl-less) form is what
        # matches the live site URL when read offline.
        miss_path = frag_part ? "#{lookup_path}##{frag_part}" : lookup_path
        %(href="#{miss_path}")
      end
    end
  end

  def self.process(page)
    site = page.site
    url_to_anchor = build_url_to_anchor(site)
    return if url_to_anchor.empty?
    parent_map = build_anchor_to_parent(site)
    return if parent_map.empty?
    landing_strip_targets = build_landing_strip_targets(site)
    baseurl = normalize_baseurl(site.config["baseurl"])

    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    rewritten = 0
    landings_stripped = 0
    page.output = page.output.gsub(/(<article[^>]*id="(ch-[^"]+)"[^>]*>)(.*?)(<\/article>)/m) do
      article_open = Regexp.last_match(1)
      anchor_id    = Regexp.last_match(2)
      body         = Regexp.last_match(3)
      article_end  = Regexp.last_match(4)

      if (level = landing_strip_targets[anchor_id])
        regex = /<#{level}\b[^>]*>.*?<\/#{level}>/m
        stripped_body = body.sub(regex, "")
        if stripped_body != body
          body = stripped_body
          landings_stripped += 1
        end
      end

      parent_url = parent_map[anchor_id]
      if parent_url
        new_body = rewrite_body(body, parent_url, url_to_anchor, baseurl)
        rewritten += 1 if new_body != body
        body = new_body
      end

      "#{article_open}#{body}#{article_end}"
    end
    Jekyll.logger.info "BookHrefRewrite:", "rewrote #{rewritten} chapter bodies, stripped #{landings_stripped} landing heading(s)"

    elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(0)
    Jekyll.logger.info "BookHrefRewrite:", "BookHrefRewriter ran in #{elapsed_ms}ms."
  end
end

Jekyll::Hooks.register :pages, :post_render do |page|
  next unless page.path == "book.html"
  BookHrefRewrite.process(page)
end
