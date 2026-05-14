# frozen_string_literal: true

# Precomputes the per-page "children in nav" list so that
# `_includes/components/children_nav.html` can render the auto-table-of-
# contents at the bottom of each parent page by iterating a ready-made
# array, without consulting the cached `site_nav` HTML.
#
# === Problem ===
#
# just-the-docs's stock `_includes/components/children_nav.html` does
# the following on every page where `has_toc != false`:
#
#   1. Reads `{%- include_cached components/site_nav.html all=true -%}`
#      to obtain a rendered nav tree that *includes* `nav_exclude: true`
#      pages.
#   2. Splits that HTML at the current page's `<a>` to probe whether
#      the next character is `<ul`. If not, the page has no children
#      and the include returns immediately.
#   3. Otherwise, rebuilds `nav_parenthood = site.html_pages |
#      group_by: "parent"` and walks it via `components/nav/children.html`
#      to select, filter, and sort the children for rendering.
#
# Two side effects of step 1 dominate the cost. First, including
# `site_nav.html` with `all=true` adds a second cache key on top of
# the `all=nil` one used by `sidebar.html`, doubling the nav-tree
# rendering (~67 recursive `nav/links.html` invocations per variant,
# ~3 s total). Second, the probe is a string split on ~150 KB of
# cached HTML, paid by every page that doesn't pre-empt with
# `has_toc: false` -- and the fallback computation duplicates the
# `where:` / `group_by` work that the cached render already did.
#
# === Approach ===
#
# Move the children resolution to Ruby and do it once per page at
# generate time:
#
#   1. Build a `parent_title -> [pages]` map from frontmatter, the
#      inverse of the breadcrumb plugin's title-to-pages map. Pages
#      without a `title` are excluded -- they cannot appear in the nav.
#   2. For each titled page, look up its candidate children by title
#      and filter:
#        - If the child declares `grand_parent`, it must match the
#          parent page's own `parent` (the same disambiguation used by
#          `components/nav/children.html` for non-unique parent titles
#          like "Enumerations").
#   3. Sort the surviving children with the same precedence
#      just-the-docs uses, partitioned by value type so that numeric
#      and string `nav_order` / `title` values don't compare against
#      each other:
#        a. pages with a numeric  `nav_order`, ascending
#        b. pages with a string   `nav_order`, lexicographic
#        c. pages with no `nav_order` and a numeric `title`, ascending
#        d. pages with no `nav_order` and a string  `title`, lexicographic
#      Case-insensitive ordering (`site.nav_sort == 'case_insensitive'`)
#      is honoured for the string buckets.
#   4. Reverse the resulting array when `page.child_nav_order` is
#      `'desc'` or `'reversed'`, matching the same flip the upstream
#      `children_nav.html` applies after computing the list.
#   5. Store the result on `page.data['children_in_nav']` as an
#      Array of `{ "title" => String, "url" => String,
#      "summary" => String | nil }` hashes. Plain hashes (not Page
#      references) are used so Liquid renders without dragging in a
#      full Page Drop.
#
# `_includes/components/children_nav.html` then iterates the array
# directly. The shadow no longer calls `include_cached
# components/site_nav.html all=true`, and since the breadcrumbs shadow
# also stopped using that variant, nothing on the site triggers the
# `all=true` cache fill. The cached site nav renders exactly once
# (from `sidebar.html` with `all=nil`).
#
# === Output parity ===
#
# Children lists are byte-identical to the upstream output when the
# site does not use the `ancestor:` frontmatter (this project does
# not; see WIP.md). The `summary` field, when present, is appended
# in the same form `<a>Title</a> - Summary`.
#
# === Compatibility ===
#
# Reads `page.data['title']`, `page.data['parent']`,
# `page.data['grand_parent']`, `page.data['nav_order']`,
# `page.data['summary']`, `page.data['child_nav_order']`, plus
# `page.url`. Honours `site.config['nav_sort']` for case sensitivity.
# Skips pages without a `title`, matching the just-the-docs nav-
# inclusion rule.
#
# If the plugin is removed, the shadow children_nav.html iterates a
# nil array and emits nothing -- pages lose their auto-generated TOC
# but the build is otherwise intact.

module ChildrenPrecompute
  class Generator < Jekyll::Generator
    safe true
    priority :normal

    REVERSE_FLAGS = %w[desc reversed].freeze

    def generate(site)
      # `site.html_pages` is a Liquid-drop accessor; from Ruby we
      # filter `site.pages` directly.
      titled = site.pages.select { |p| p.data["title"] }
      by_parent_title = titled.group_by { |p| (p.data["parent"] || "").to_s }
      case_insensitive = site.config["nav_sort"] == "case_insensitive"

      titled.each do |page|
        children = children_for(page, by_parent_title)
        children = sort_children(children, case_insensitive)
        children = children.reverse if REVERSE_FLAGS.include?(page.data["child_nav_order"].to_s)
        page.data["children_in_nav"] = children.map do |c|
          {
            "title" => c.data["title"],
            "url" => c.url,
            "summary" => c.data["summary"],
          }
        end
      end
    end

    private

    def children_for(page, by_parent_title)
      (by_parent_title[page.data["title"]] || []).select do |child|
        # When a child declares `grand_parent`, it must match the
        # parent page's own `parent` -- the same disambiguation the
        # upstream `components/nav/children.html` applies. When the
        # child omits `grand_parent`, no constraint applies.
        gp = child.data["grand_parent"]
        gp.nil? || gp == page.data["parent"]
      end
    end

    # Mirrors the just-the-docs `_includes/components/nav/sorted.html`
    # precedence: number/string partitions for each of `nav_order` and
    # `title`, concatenated in that order.
    def sort_children(pages, case_insensitive)
      nav_num, nav_str, title_num, title_str = [], [], [], []

      pages.each do |p|
        if p.data["nav_order"]
          (numeric?(p.data["nav_order"]) ? nav_num : nav_str) << p
        else
          (numeric?(p.data["title"]) ? title_num : title_str) << p
        end
      end

      nav_num.sort_by!   { |p| p.data["nav_order"] }
      nav_str.sort_by!   { |p| sort_key(p.data["nav_order"], case_insensitive) }
      title_num.sort_by! { |p| p.data["title"] }
      title_str.sort_by! { |p| sort_key(p.data["title"], case_insensitive) }

      nav_num + nav_str + title_num + title_str
    end

    def numeric?(value)
      value.is_a?(Numeric)
    end

    def sort_key(value, case_insensitive)
      s = value.to_s
      case_insensitive ? s.downcase : s
    end
  end
end
