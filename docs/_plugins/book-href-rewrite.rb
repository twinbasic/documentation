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

  # `url.gsub('/', '-').sub(/^-/, '').sub(/-$/, '')` then prepend "ch-".
  # Matches the chapter anchor scheme established in BOOKPLAN.md 1.5b.
  def self.chapter_anchor(url)
    "ch-" + url.gsub("/", "-").sub(/\A-/, "").sub(/-\z/, "")
  end

  # Parent URL for the chapter -- the URL itself when it already ends
  # in '/' (folder-style index), otherwise the URL with the trailing
  # segment stripped (single-file leaf).
  def self.parent_url_of(url)
    url.end_with?("/") ? url : url.sub(/[^\/]+\z/, "")
  end

  # Build the permalink -> chapter-anchor map. Folder-style index
  # pages (URL ending in '/') also get an alt entry without the
  # trailing slash, since source authors sometimes drop it
  # (`[CheckBox](../CheckBox)` instead of `[CheckBox](../CheckBox/)`)
  # and the PDF can't rely on the live site's trailing-slash redirect.
  def self.build_url_to_anchor(site)
    map = {}
    manifest = site.data["book"]
    return map unless manifest && manifest["parts"]
    manifest["parts"].each do |part|
      (part["prefixes"] || []).each do |prefix|
        site.pages.each do |page|
          next unless page.url.start_with?(prefix)
          anchor = chapter_anchor(page.url)
          map[page.url] = anchor
          map[page.url.chomp("/")] = anchor if page.url.end_with?("/")
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
    manifest = site.data["book"]
    return map unless manifest && manifest["parts"]
    manifest["parts"].each do |part|
      (part["prefixes"] || []).each do |prefix|
        site.pages.each do |page|
          next unless page.url.start_with?(prefix)
          map[chapter_anchor(page.url)] = parent_url_of(page.url)
        end
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
  def self.rewrite_body(body, parent_url, url_to_anchor)
    body.gsub(/href="([^"]*)"/) do |whole_match|
      href = Regexp.last_match(1)
      next whole_match if EXTERNAL_PREFIXES.any? { |pfx| href.start_with?(pfx) }

      abs = resolve_href(href, parent_url)
      next whole_match unless abs && abs.start_with?("/")

      path_part, frag_part = abs.split("#", 2)
      target = url_to_anchor[path_part]
      if target
        frag_part ? %(href="##{target}-#{frag_part}") : %(href="##{target}")
      else
        %(href="#{abs}")
      end
    end
  end

  def self.process(page)
    site = page.site
    url_to_anchor = build_url_to_anchor(site)
    return if url_to_anchor.empty?
    parent_map = build_anchor_to_parent(site)
    return if parent_map.empty?

    rewritten = 0
    page.output = page.output.gsub(/(<article[^>]*id="(ch-[^"]+)"[^>]*>)(.*?)(<\/article>)/m) do
      article_open = Regexp.last_match(1)
      anchor_id    = Regexp.last_match(2)
      body         = Regexp.last_match(3)
      article_end  = Regexp.last_match(4)

      parent_url = parent_map[anchor_id]
      if parent_url
        new_body = rewrite_body(body, parent_url, url_to_anchor)
        rewritten += 1 if new_body != body
        body = new_body
      end

      "#{article_open}#{body}#{article_end}"
    end
    Jekyll.logger.info "BookHrefRewrite:", "rewrote #{rewritten} chapter bodies"
  end
end

Jekyll::Hooks.register :pages, :post_render do |page|
  next unless page.path == "book.html"
  BookHrefRewrite.process(page)
end
