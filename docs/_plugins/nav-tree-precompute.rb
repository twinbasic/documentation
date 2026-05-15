# frozen_string_literal: true

# Precomputes the deeply nested nav-rendering tree consumed by the
# shadow `_includes/components/site_nav.html` and the shadow
# `_includes/components/nav/links.html`. Replaces the upstream's
# recursive Liquid traversal of `nav_parenthood | where ... | map:
# items | first` with a single top-down Ruby walk at site-generate
# time.
#
# === Problem ===
#
# The upstream nav-rendering pipeline (`site_nav.html` ->
# `nav/pages.html` -> recursive `nav/links.html` /
# `nav/children.html` / `nav/sorted.html`) costs ~5 s of RENDER time
# on this site -- paid once during the `include_cached` fill of
# `site_nav.html`, but still a sizeable chunk of the ~14 s build.
# The dominant cost is Liquid `include` overhead: ~67 recursive
# invocations of `nav/links.html` and ~815 invocations of
# `nav/children.html`, each with its own scope setup and parameter
# binding. The filter+sort work inside `nav/children.html`
# (`nav_parenthood | where: "name", node.title | map: "items" |
# first`, plus `grand_parent` checks) and `nav/sorted.html`
# (`group_by_exp ... | jsonify | slice | size`) is repeated 800+
# times.
#
# === Approach ===
#
# Build a single deeply nested array reflecting the nav HTML
# structure. Each node is a Hash with `title`, `url`, and `children`
# -- the array of its own nav children, already filtered and sorted
# to match the upstream's render order. The shadow `nav/links.html`
# iterates this array directly: no `include children.html`, no
# `where`, no `group_by`.
#
# Filtering and sorting follow exactly the same rules as
# `_plugins/nav-levels-precompute.rb` -- the two plugins share the
# same view of "nav-visible children", differing only in what they
# emit. Pages with `nav_exclude: true` are excluded; pages with a
# `grand_parent` that disagrees with the candidate parent's own
# `parent` are excluded the same way upstream `nav/children.html`
# excludes them.
#
# === Output ===
#
# `site.config["nav_tree"]` -- exposed to Liquid as `site.nav_tree`
# -- is an Array of Hashes, each shaped like:
#
#   { "title" => String,
#     "url" => String,
#     "children" => Array<Hash> }
#
# The outer array is the sorted, nav-filtered list of top-level
# pages (those with no `parent`). Each entry's `children` is the
# same shape recursively, in render order (with
# `child_nav_order: desc/reversed` already applied). Plain Hashes
# (not Page references) are used so Liquid renders without dragging
# in a full Page Drop.
#
# === Duplicates ===
#
# When a page has `parent: X` and there are multiple pages titled
# "X", the upstream nav attaches the child under every matching
# parent (unless the child declares `grand_parent` to disambiguate).
# This generator preserves that behaviour: the same child Hash may
# appear in multiple parents' `children` arrays. See
# `nav-levels-precompute.rb` for the canonical example
# ("Constants Module" under both VBA and VBRUN).
#
# Cycle defence: a page that would close a `parent`-chain cycle
# (e.g. an authoring mistake that introduces A -> B -> A) is dropped
# at the closing edge. The shadow `nav/links.html` additionally
# preserves the upstream's title-based ancestor check, emitting an
# infinity link when a child's title coincides with one of its
# ancestor titles -- a safety net for pages with non-unique titles
# in their own ancestry. MAX_DEPTH matches
# `nav-levels-precompute.rb` (16; deepest legitimate chain on this
# site is 5).
#
# === Compatibility ===
#
# Reads the same frontmatter fields as `nav-levels-precompute.rb`
# (`title`, `parent`, `grand_parent`, `nav_order`, `child_nav_order`,
# `nav_exclude`, plus `page.url`). Honours `site.config['nav_sort']`.
# Writes only `site.config["nav_tree"]`. If the plugin is removed,
# the shadow `nav/links.html` iterates a nil `site.nav_tree` and the
# nav renders empty -- revert `_includes/components/site_nav.html`
# and `_includes/components/nav/links.html` to the upstream versions
# to restore.

module NavTreePrecompute
  MAX_DEPTH = 16
  REVERSE_FLAGS = %w[desc reversed].freeze

  class Generator < Jekyll::Generator
    safe true
    priority :normal

    def generate(site)
      titled = site.pages.select { |p| p.data["title"] }
      by_parent_title = titled.group_by { |p| (p.data["parent"] || "").to_s }
      case_insensitive = site.config["nav_sort"] == "case_insensitive"

      top_level = (by_parent_title[""] || []).reject { |p| p.data["nav_exclude"] }
      top_level = sort_pages(top_level, case_insensitive)

      # Memoise the sorted, nav-filtered children for every titled
      # page. The walk below recurses into each parent's list without
      # re-running the filter / sort.
      ordered_children = {}
      titled.each do |parent|
        ordered_children[parent.url] = ordered_children_for(parent, by_parent_title, case_insensitive)
      end

      site.config["nav_tree"] = top_level.map do |top|
        build_node(top, [top], ordered_children, 0)
      end
    end

    private

    # Recursively materialises the subtree rooted at `page`. The
    # `chain` parameter is the list of ancestors (root-first,
    # inclusive of `page`) used to break parent-chain cycles. The
    # title-based ancestor check that the upstream `nav/links.html`
    # performs is left for Liquid to apply at render time.
    def build_node(page, chain, ordered_children, depth)
      children = (ordered_children[page.url] || []).reject do |child|
        chain.any? { |c| c.url == child.url }
      end
      child_hashes = if depth < MAX_DEPTH
        children.map { |c| build_node(c, chain + [c], ordered_children, depth + 1) }
      else
        []
      end
      {
        "title" => page.data["title"],
        "url" => page.url,
        "children" => child_hashes,
      }
    end

    # Mirrors the upstream `nav/children.html` filter: keep children
    # whose `parent` matches by title, drop `nav_exclude`d ones, and
    # disambiguate same-titled parents via `grand_parent`. Apply the
    # `child_nav_order` reversal that the upstream `nav/links.html`
    # would apply before rendering, so positions in the array equal
    # rendered positions.
    def ordered_children_for(parent, by_parent_title, case_insensitive)
      children = (by_parent_title[parent.data["title"]] || []).select do |c|
        next false if c.data["nav_exclude"]
        gp = c.data["grand_parent"]
        gp.nil? || gp == parent.data["parent"]
      end
      children = sort_pages(children, case_insensitive)
      children = children.reverse if REVERSE_FLAGS.include?(parent.data["child_nav_order"].to_s)
      children
    end

    # Mirrors the just-the-docs `_includes/components/nav/sorted.html`
    # precedence: four buckets ordered as nav_order(num),
    # nav_order(str), title(num), title(str), each sorted
    # independently.
    def sort_pages(pages, case_insensitive)
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
