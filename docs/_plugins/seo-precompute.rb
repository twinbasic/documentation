# frozen_string_literal: true

# Precomputes per-page SEO values that `_includes/head_seo.html`
# previously derived in Liquid via the `markdownify | strip_html |
# normalize_whitespace | escape_once` pipeline + `absolute_url` +
# `uri_escape`.
#
# === Problem ===
#
# `head_seo.html` rendered ~837 times per build. On every render it
# ran two `markdownify` filter chains (`page.title` and `site.title`),
# one `absolute_url` for the canonical URL, plus the same chain again
# for `site.logo`. ~1,674 of the 1,802 `Jekyll::Filters#markdownify`
# filter invocations across the whole build came from this template,
# costing ruby-prof ~4.0 s of `Liquid::Strainer#invoke` time. The
# kramdown converter's own work hits Jekyll's internal cache for the
# repeated `site.title` input but still pays the Liquid filter
# dispatch and cache-lookup overhead per call.
#
# Of the 836 page titles on the site, only 2 (`*, *=` and `\, \=`)
# contain markdown-active characters. The other 834 paths through
# `markdownify | strip_html | normalize_whitespace | escape_once`
# reduce to a straight `escape_once(title)` -- the markdownify step
# wraps the text in a `<p>` tag that `strip_html` immediately
# removes, `normalize_whitespace` collapses no internal whitespace,
# and `escape_once` HTML-escapes the same handful of characters.
# Pulling all of that into one Ruby pass at `:site, :pre_render`
# pays the kramdown / regex cost once per unique title in a tight
# loop instead of via the Liquid dispatch path 1,674 times per
# build.
#
# === Approach ===
#
# At `:site, :pre_render`, walk every page and stash these
# precomputed values on `page.data`:
#
#   _seo_page_title    -- markdownify-pipeline output of `page.title`,
#                         or the site title if `page.title` is empty.
#   _seo_full_title    -- "<page title> | <site title>", collapsing to
#                         just the page title when the two match.
#   _seo_canonical     -- `page.url` with `/index.html` stripped, then
#                         `absolute_url`'d via the same Addressable
#                         normalisation Jekyll's URLFilters uses.
#   _seo_is_home       -- boolean: page is the homepage / about page
#                         in the small fixed list jekyll-seo-tag
#                         recognises (the JSON-LD `@type` toggles
#                         between WebSite and WebPage on this flag).
#
# Plus on site.config:
#
#   _seo_site_title    -- markdownify-pipeline output of `site.title`,
#                         constant across the build.
#   _seo_logo_url      -- `absolute_url(site.logo) | uri_escape`,
#                         constant across the build.
#
# `head_seo.html` then reads these as `page._seo_*` (PageDrop's
# `fallback_data` resolves the keys against `page.data`) and
# `site._seo_*` (SiteDrop's fallback resolves against `site.config`).
#
# Filter logic mirrors the standard Liquid / Jekyll implementations
# byte-for-byte: `Liquid::StandardFilters::STRIP_HTML_BLOCKS` /
# `STRIP_HTML_TAGS` / `HTML_ESCAPE_ONCE_REGEXP` / `HTML_ESCAPE`
# constants are pulled by reference so the strip and escape steps use
# the same regex objects Liquid would. `absolute_url` follows the
# `Jekyll::Filters::URLFilters#absolute_url` recipe -- parse, fall
# back to `relative_url` when `site.url` is empty, otherwise
# `Addressable::URI.parse(site_url + rel).normalize.to_s`.
# `uri_escape` is the Jekyll filter's one-liner
# `Addressable::URI.normalize_component`.
#
# === When it runs ===
#
# `:site, :pre_render`, the same phase as
# `_plugins/book-resolve-chapters.rb`. By that point Jekyll has read
# all pages and run every Generator, so `page.url` and `page.data`
# are populated. `head_seo.html` itself doesn't render until later
# in the RENDER phase, so the precomputed keys are visible by then.
#
# === Verification ===
#
# Byte-identical output is the bar -- `diff -rq` clean against a
# pre-precompute snapshot of `_site/` / `_site-offline/` /
# `_site-pdf/`. Any divergence in the filter logic above (e.g. an
# `Addressable::URI` version that normalises differently) would show
# up as a counted mismatch in the diff, not as a silent regression.

require "addressable/uri"
require "liquid"
require "set"

module Jekyll
  module SeoPrecompute
    extend self

    # URLs that jekyll-seo-tag's `HOMEPAGE_OR_ABOUT_REGEX` matches
    # (the gem uses a regex; Liquid has no regex match operator so
    # head_seo.html was enumerating the six values inline -- this
    # `Set#include?` lookup replaces the chain of `or` comparisons).
    HOMEPAGE_URLS = Set[
      "/", "/index.html", "/index.htm",
      "/about/", "/about/index.html", "/about/index.htm"
    ].freeze

    STRIP_HTML_BLOCKS       = Liquid::StandardFilters::STRIP_HTML_BLOCKS
    STRIP_HTML_TAGS         = Liquid::StandardFilters::STRIP_HTML_TAGS
    HTML_ESCAPE_ONCE_REGEXP = Liquid::StandardFilters::HTML_ESCAPE_ONCE_REGEXP
    HTML_ESCAPE             = Liquid::StandardFilters::HTML_ESCAPE

    def precompute!(site)
      markdown = site.find_converter_instance(Jekyll::Converters::Markdown)

      site_title = render_title(site.config["title"], markdown)
      site.config["_seo_site_title"] = site_title

      logo = site.config["logo"]
      site.config["_seo_logo_url"] =
        logo ? uri_escape(absolute_url(logo, site)) : nil

      site.pages.each do |page|
        raw_title = page.data["title"]
        page_title = if raw_title && !raw_title.to_s.empty?
          render_title(raw_title, markdown)
        else
          site_title
        end
        page.data["_seo_page_title"] = page_title
        page.data["_seo_full_title"] =
          page_title == site_title ? page_title : "#{page_title} | #{site_title}"

        url = page.url.to_s
        canonical_input = url.sub(%r!/index\.html\z!, "/")
        page.data["_seo_canonical"] = absolute_url(canonical_input, site)
        page.data["_seo_is_home"]   = HOMEPAGE_URLS.include?(url)
      end
    end

    # `text | markdownify | strip_html | normalize_whitespace |
    # escape_once`, mirroring head_seo.html's pipeline byte-for-byte.
    # `Jekyll::Converters::Markdown#convert` is cached internally, so
    # `site.title` (a constant) hits the cache from the second call
    # onwards; page titles are unique but tiny.
    def render_title(text, markdown)
      return "" if text.nil?
      s = text.to_s
      return "" if s.empty?
      html      = markdown.convert(s)
      stripped  = html.gsub(STRIP_HTML_BLOCKS, "").gsub(STRIP_HTML_TAGS, "")
      collapsed = stripped.gsub(%r!\s+!, " ").tap(&:strip!)
      collapsed.gsub(HTML_ESCAPE_ONCE_REGEXP, HTML_ESCAPE)
    end

    # Mirrors `Jekyll::Filters::URLFilters#absolute_url`. When
    # `site.url` is unset the result is just the relative URL,
    # matching the filter's behaviour.
    def absolute_url(input, site)
      return nil if input.nil?
      s = input.to_s
      return s if Addressable::URI.parse(s).absolute?
      site_url = site.config["url"].to_s
      rel = relative_url(s, site)
      return rel if site_url.empty?
      Addressable::URI.parse(site_url + rel).normalize.to_s
    end

    # Mirrors `Jekyll::Filters::URLFilters#relative_url`.
    def relative_url(input, site)
      s = input.to_s
      return s if Addressable::URI.parse(s).absolute?
      baseurl = site.config["baseurl"].to_s.chomp("/")
      parts = [baseurl, s].map { |p| ensure_leading_slash(p) }
      Addressable::URI.parse(parts.join).normalize.to_s
    end

    def ensure_leading_slash(input)
      return input if input.empty? || input.start_with?("/")
      "/#{input}"
    end

    # Mirrors `Jekyll::Filters#uri_escape`.
    def uri_escape(input)
      Addressable::URI.normalize_component(input)
    end
  end
end

Jekyll::Hooks.register :site, :pre_render do |site|
  Jekyll::SeoPrecompute.precompute!(site)
end
