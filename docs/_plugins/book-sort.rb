# frozen_string_literal: true

# Liquid filter for ordering a chapter's content pages in book.html.
#
# Pages are grouped by their parent folder URL so an index page (URL
# ending in `/`) and all its leaves stay together in the iteration --
# the include's sub-page state machine depends on each index appearing
# in the stream immediately before its sub-pages, otherwise a stray
# leaf from a different folder will reset the state mid-group and the
# rest of the index's sub-pages will be promoted to top-level
# chapters.
#
# Group key:
#   * index (URL ends in `/`)   -> its own URL
#   * leaf  (no trailing slash) -> the URL up to and including the
#                                  last slash (the parent folder URL)
#
# So /Features/Language/, /Features/Language/Alias-Types, and
# /Features/Language/Data-Types all key on /Features/Language/ and
# form one group, while /Features/Attributes-Intro keys on /Features/
# and is in a different group.
#
# Within a group:
#   1. The index (at most one per group) emits first, in URL order.
#   2. Leaves with `nav_order` follow, sorted by nav_order ascending,
#      ties broken by title (case-insensitive).
#   3. Leaves without `nav_order` follow, sorted alphabetically by
#      title (case-insensitive).
#
# Group order: each group's "lead" item (the first item after the
# in-group sort -- the index if present, else the first nav_order
# leaf, else the first by-title leaf) carries the group's position.
# Groups are sorted by `[lead.nav_order, lead.title]` with a missing
# nav_order treated as infinity, so a folder whose index has
# `nav_order: 2` (just-the-docs's parent-positioning convention)
# sorts among its sibling chapters by 2, not by its leaves' values.
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

      groups = pages.group_by { |p| group_key_of(p) }

      sorted_groups = {}
      groups.each do |key, members|
        sorted_groups[key] = sort_within_group(members)
      end

      ordered_keys = sorted_groups.keys.sort_by do |key|
        lead = sorted_groups[key].first
        nav_order = page_attr(lead, "nav_order")
        title     = page_attr(lead, "title").to_s.downcase
        [nav_order.nil? ? Float::INFINITY : nav_order, title]
      end

      ordered_keys.flat_map { |key| sorted_groups[key] }
    end

    private

    # The page's "group" is the URL up to and including the last
    # slash: for an index URL ending in `/`, that's the URL itself; for
    # a leaf, it's the parent folder URL. Pages sharing a group key
    # are siblings (or index + sibling) and stay adjacent in the
    # iteration so the include's sub-page state machine sees them
    # as one cluster.
    def group_key_of(p)
      url = page_url(p).to_s
      return url if url.end_with?("/")
      url.sub(%r{[^/]+\z}, "")
    end

    # In-group order: index first (URL order), then nav_order leaves
    # (nav_order, title tiebreak), then nav_order-less leaves (title).
    def sort_within_group(members)
      indexes, leaves = members.partition { |p| page_url(p).to_s.end_with?("/") }
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
