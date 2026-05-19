# frozen_string_literal: true

# Precomputes book.yml's chapter page lists at `:site, :pre_render` so
# `book.html` doesn't re-resolve them in Liquid on every render.
#
# === Problem ===
#
# `book.html` and `_includes/book-collect-matches.html` previously used
# `site.pages | where_exp: "p", "p.url contains prefix"` (or its
# `nav_path` cousin) per URL prefix to sweep pages into each
# front-matter entry, part, and chapter. Each `where_exp` call walks
# ~837 `site.pages` evaluating a Liquid expression per element. On a
# build with ~37 such sweeps, ruby-prof attributes ~1.5 s to
# `Jekyll::Filters#where_exp` -- ~40 ms per call.
#
# `book-collect-matches.html` is included once per entry, the same
# sweep is followed by a landing-page exclusion filter
# (`where_exp: "p", "p.url != landing"`) and a `sort_by_nav_order`
# Liquid filter call. Even though `sort_by_nav_order` is itself Ruby
# (`_plugins/book-sort.rb`), the surrounding orchestration is all
# Liquid -- the include alone costs ~0.7 s of wall-clock per build
# at the current site size.
#
# === Approach ===
#
# Walk `_data/book.yml` once at `:site, :pre_render` and resolve every
# entry's chapter list to an `Array<Jekyll::Page>` stored on the entry
# hash as `_chapters`. The resolver applies the same selector schema
# (page / pages / nav_page / nav_pages / no_descent), the same
# landing-page-first ordering, and the same `sort_by_nav_order` sort
# the templates were producing in Liquid -- but in one O(n) Ruby pass
# per entry instead of one O(n * Liquid-expression-cost) sweep per
# URL prefix.
#
# `book.html` then reads `entry._chapters` directly. No `where_exp`,
# no `book-collect-matches.html` include.
#
# === When it runs ===
#
# `:site, :pre_render` rather than as a `Generator` because
# `_plugins/nav-path.rb` is a `Generator` with `priority :low` that
# populates `page.data["nav_path"]`. Hooks fire after all generators,
# so by the time this hook runs `nav_path` is set on every page and
# the `nav_page` / `nav_pages` selectors can use it.
#
# === Output shape ===
#
# For each entry that emits chapters in `book.html`:
#
#   front_matter[i]["_chapters"]      -- Array<Jekyll::Page>
#   parts[i]["_chapters"]             -- flat parts only; chaptered
#                                        parts leave this nil
#   parts[i]["chapters"][j]["_chapters"]  -- chaptered parts only
#
# The Liquid template reads these as plain Hash accesses on the YAML-
# loaded data: `fm._chapters`, `part._chapters`, `ch_entry._chapters`.
# Each element is a `Jekyll::Page` -- the same object type `site.pages`
# iteration produces -- so the inner `for chapter in ..._chapters`
# loop in `book.html` sees no behavioural difference from the old
# `assign collected = ... | sort_by_nav_order` chain.

require_relative "book-sort"

module Jekyll
  module BookResolveChapters
    extend self

    def resolve!(site)
      book = site.data["book"]
      return unless book

      pages = site.pages
      sorter = ChapterSorter.new

      (book["front_matter"] || []).each do |fm|
        # Front-matter entries have no landing concept -- they're just
        # a flat prefix sweep + sort.
        fm["_chapters"] = sorter.sort_by_nav_order(collect_matches(fm, pages))
      end

      (book["parts"] || []).each do |part|
        if part["chapters"]
          # Chaptered part: each chapter has its own _chapters. The
          # part's own landing_page / foreword_page are still resolved
          # inline in book.html via cheap `where: "url"` filter calls
          # (only 6 such calls total across the build, no precompute
          # needed).
          part["chapters"].each do |ch|
            ch["_chapters"] = build_chapter_list(ch, pages, sorter)
          end
        else
          # Flat part: build the part's own _chapters with the
          # landing_page (if any) emitted first.
          part["_chapters"] = build_chapter_list(part, pages, sorter)
        end
      end
    end

    # Landing first (if any), then prefix-swept rest with landing
    # excluded, sorted by nav order. Mirrors the assembly book.html
    # was doing in Liquid via `chapters = landing | concat: rest`.
    def build_chapter_list(entry, pages, sorter)
      list = []
      landing_url = entry["landing_page"]
      if landing_url
        landing = pages.find { |p| p.url == landing_url }
        list << landing if landing
      end
      rest = collect_matches(entry, pages)
      rest = rest.reject { |p| p.url == landing_url } if landing_url
      list.concat(sorter.sort_by_nav_order(rest))
      list
    end

    # Same selector schema as `_includes/book-collect-matches.html`:
    #
    #   page          single URL prefix; shorthand for [page] in `pages`
    #   pages         list of URL prefixes; `contains` match
    #   nav_page      single nav-path prefix; shorthand for [np]
    #   nav_pages     list of nav-path prefixes; `contains` match
    #   no_descent    switch every match from `contains` to `==`
    #
    # Liquid's `contains` on a String is substring match; `==` is
    # exact equality. Ruby equivalents: `include?` and `==`. The
    # `nav_path` data field may be nil on pages without a `title`
    # (`_plugins/nav-path.rb` only populates titled pages), so the
    # `nav_path` branches `.to_s` the value before the comparison so
    # a nil value yields an empty-string match (matches nothing in
    # `include?`, matches `np == ""` only when `np` itself is "").
    private def collect_matches(entry, pages)
      out = []
      no_descent = entry["no_descent"]

      url_specs = []
      url_specs << entry["page"] if entry["page"]
      url_specs.concat(entry["pages"]) if entry["pages"]
      url_specs.each do |prefix|
        if no_descent
          pages.each { |p| out << p if p.url == prefix }
        else
          pages.each { |p| out << p if p.url.include?(prefix) }
        end
      end

      nav_specs = []
      nav_specs << entry["nav_page"] if entry["nav_page"]
      nav_specs.concat(entry["nav_pages"]) if entry["nav_pages"]
      nav_specs.each do |np|
        if no_descent
          pages.each { |p| out << p if p.data["nav_path"] == np }
        else
          pages.each { |p| out << p if p.data["nav_path"].to_s.include?(np) }
        end
      end

      out
    end

    # Reuse `Jekyll::BookSort#sort_by_nav_order` (from book-sort.rb).
    # The module's methods don't depend on any state; instantiating
    # a stateless class that `include`s it lets us call the method
    # directly, the same way Liquid's strainer would.
    class ChapterSorter
      include BookSort
    end
  end
end

Jekyll::Hooks.register :site, :pre_render do |site|
  Jekyll::BookResolveChapters.resolve!(site)
end
