# frozen_string_literal: true

# Liquid filter for ordering a chapter's content pages in book.html.
#
# Folder-style index pages (URL ending in `/`) sort first in URL order
# so each chapter opens with its intro and the include's sub-page
# state machine sees the index before its siblings. The remaining
# pages follow just-the-docs `nav_order` semantics:
#
#   1. Pages with `nav_order` come first, sorted by nav_order ascending,
#      ties broken by title (case-insensitive).
#   2. Pages without `nav_order` follow, sorted alphabetically by title
#      (case-insensitive).
#
# Used in `book.html` in place of `sort: "url"` for prefix-swept
# chapter content lists.
#
# Type tolerance: Liquid passes page-like objects through filters in
# three flavours depending on what filters ran upstream:
#   1. Jekyll::Page          -- straight from `site.pages`. `.url` is
#                               a method; Page#[] reads frontmatter
#                               data and does NOT expose `url`.
#   2. Jekyll::Drops::PageDrop -- when an intermediate filter has
#                               already wrapped the page. Both `.url`
#                               and `["url"]` resolve.
#   3. Hash                   -- the result of `Drop#to_h` (or a manual
#                               hash). Mixed in alongside Pages once
#                               other plugins precompute nav data: the
#                               hash carries frontmatter PLUS the
#                               drop's method-returned values (url,
#                               content, name, ...). Access through
#                               the helpers below so the filter works
#                               uniformly across all three.

module Jekyll
  module BookSort
    def sort_by_nav_order(pages)
      pages = pages.uniq

      indexes, leaves = pages.partition { |p| page_url(p).to_s.end_with?("/") }
      indexes_sorted = indexes.sort_by { |p| page_url(p).to_s }

      with_order, without_order = leaves.partition { |p| !page_attr(p, "nav_order").nil? }

      with_order_sorted = with_order.sort_by do |p|
        [page_attr(p, "nav_order"), page_attr(p, "title").to_s.downcase]
      end
      without_order_sorted = without_order.sort_by do |p|
        page_attr(p, "title").to_s.downcase
      end

      indexes_sorted + with_order_sorted + without_order_sorted
    end

    private

    # Page#url is a method, not a data key, so Page#[] returns nil.
    # Hashes and Drops both expose "url" via the `[]` accessor; Drops
    # also via the method. Branch on Hash explicitly so the Page case
    # falls through to the method call.
    def page_url(p)
      return p["url"] if p.is_a?(Hash)
      p.url if p.respond_to?(:url)
    end

    # `nav_order`, `title`, `nav_path`, etc. live in frontmatter data
    # and are exposed via `[]` on all three carrier types -- Page
    # delegates to `data[]`, Drop invokes its method, Hash reads
    # directly.
    def page_attr(p, name)
      p[name]
    end
  end
end

Liquid::Template.register_filter(Jekyll::BookSort)
