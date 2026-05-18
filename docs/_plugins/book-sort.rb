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

module Jekyll
  module BookSort
    # Liquid passes page objects through filters as either Jekyll::Page
    # (when the input came straight from site.pages) or Drops (when it
    # has been through other filters first). Pages and Drops both have
    # a `url` method; the `[]` accessor is available on both but reads
    # frontmatter data on a Page (no `url` key) and dispatches to the
    # method on a Drop. Always go through the method to cover both.
    def sort_by_nav_order(pages)
      pages = pages.uniq

      indexes, leaves = pages.partition { |p| p.url.end_with?("/") }
      indexes_sorted = indexes.sort_by(&:url)

      with_order, without_order = leaves.partition { |p| !p["nav_order"].nil? }

      with_order_sorted = with_order.sort_by do |p|
        [p["nav_order"], (p["title"] || "").to_s.downcase]
      end
      without_order_sorted = without_order.sort_by do |p|
        (p["title"] || "").to_s.downcase
      end

      indexes_sorted + with_order_sorted + without_order_sorted
    end
  end
end

Liquid::Template.register_filter(Jekyll::BookSort)
