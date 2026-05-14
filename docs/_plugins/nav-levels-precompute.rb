# frozen_string_literal: true

# Precomputes per-page nav-level coordinates for the just-the-docs
# activation stylesheet (the inline `<style id="jtd-nav-activation">`
# block that `_includes/head.html` emits via
# `_includes/css/activation.scss.liquid`).
#
# === Problem ===
#
# The upstream activation include determines the current page's
# position within the nav tree by capturing the cached `site_nav` HTML
# (~150 KB) and walking it character by character: splitting it at the
# page's `<a>` tag, then splitting the prefix at every
# `<li class="nav-list-item"` boundary and counting `<ul>` / `</ul>`
# occurrences in each fragment to recover an `[i, j, k, ...]` positional
# path. From that path it emits `:nth-child(i) > li:nth-child(j) > ...`
# selectors so the page's nav entry can be bolded, its ancestors
# unfolded, and their expander icons rotated when JavaScript is
# disabled. Across the ~830-page site the per-page string scanning
# costs ~11 s -- ~40% of the entire RENDER phase.
#
# The positional path is fully derivable from frontmatter: each page's
# place in the nav is determined by its parent / grand_parent chain
# plus the nav_order / title sort rules. Moving the computation to
# Ruby brings per-page render cost essentially to zero, and the
# activation include becomes pure templating against precomputed data.
#
# === Approach ===
#
# Produce the same `nav_levels` array the upstream Liquid algorithm
# would, and stash it on `page.data['nav_levels']` for the shadow
# `_includes/css/activation.scss.liquid` to consume. The output CSS is
# byte-identical to the upstream version after HTML compression.
#
# The array has the same shape as in the upstream:
#
#   nav_levels[0]   = collection-prefix index (always 1 on this site,
#                     which has no `just_the_docs.collections`; the
#                     activation prefix is `.site-nav > ul.nav-list:
#                     first-child`).
#   nav_levels[i]   = 1-based position of the i-th ancestor in its
#                     parent's sorted, nav-filtered children list, for
#                     i in 1..page_level.
#   nav_levels.size = page_level + 1.
#
# === Why a top-down tree walk ===
#
# Walking the parent chain bottom-up (page -> parent -> grand_parent
# -> ...) is the obvious approach, and works for most pages. It
# breaks down when a page's `parent` title is not unique on the site
# AND the page does not declare a `grand_parent` to disambiguate.
#
# Example: this site has two pages titled "Constants Module" -- one
# under `VBA Package`, one under `VBRUN Package`. The VBA constants
# (e.g. `VbAppWinStyle`) declare only `parent: Constants Module`. The
# VBRUN constants additionally declare `grand_parent: VBRUN Package`,
# disambiguating themselves. So a bottom-up walk from `VbAppWinStyle`
# arrives at "Constants Module" with no way to choose between the two
# pages -- pick by enumeration order and the indices come out
# attributed to the wrong parent.
#
# Crucially, the upstream nav rendering keeps the same ambiguity in
# its output: because the children filter in
# `_includes/components/nav/children.html` only rejects a child whose
# `grand_parent` is set AND mismatches, a child without `grand_parent`
# is attributed to every same-title parent it could be attached to.
# `VbAppWinStyle` therefore appears twice in the rendered nav: once
# under VBA's Constants Module and once under VBRUN's. The upstream
# `activation.scss.liquid` uses the page's first `<a>` occurrence in
# the rendered HTML to anchor its path, which is whichever copy comes
# first in render order.
#
# Mirroring "first occurrence in render order" deterministically
# without rendering the nav requires walking the tree top-down in
# render order and recording each page's chain the first time we
# reach it. Subsequent visits to the same page (under a different
# parent) leave the recorded chain untouched, just as the upstream's
# split-at-first-occurrence does.
#
# === Algorithm ===
#
#   1. Collect every page with a `title`. Group by `parent` to obtain
#      a parent-title -> children map. (Pages without a `title` cannot
#      appear in the nav and are ignored throughout.)
#   2. Build the sorted top-level page list: filter the parent=="" /
#      parent==nil bucket to those without `nav_exclude`, sort with
#      the same precedence the upstream `_includes/components/nav/
#      sorted.html` applies (numeric nav_order, string nav_order,
#      numeric title, string title), honouring
#      `site.config['nav_sort']` for case sensitivity.
#   3. Memoise `ordered_children_for(parent)` for every titled page:
#      the children with `parent == parent.title`, filtered to those
#      that are not `nav_exclude`d and whose `grand_parent` either is
#      unset or matches `parent.parent` (the same disambiguation the
#      upstream's `components/nav/children.html` performs). Sort the
#      survivors and reverse them when `parent.child_nav_order` is
#      `desc` / `reversed` -- the same flip the upstream's
#      `components/nav/links.html` applies before rendering, so our
#      child indices match the rendered positions.
#   4. Walk the tree top-down in sorted order, threading the chain of
#      ancestors visited so far. The first time a page is reached, its
#      chain is recorded. The walk is bounded by MAX_DEPTH and skips
#      any child already present in the current chain (cycle defence).
#   5. For every titled page with a recorded chain, derive `nav_levels`
#      by reading positions back from each step's memoised
#      `ordered_children_for(...)`. Cache child-url -> index maps to
#      keep the per-page lookup O(1).
#
# === Special cases ===
#
# A page is "not in the nav" -- and so gets no `nav_levels` -- if any
# of the following are true:
#
#   - It has no `title`.
#   - It has `nav_exclude: true`.
#   - Its `parent` chain never reaches a top-level page (e.g. a
#     reference to a non-existent parent title, or a chain that runs
#     past MAX_DEPTH without grounding out).
#   - It is filtered out by `grand_parent` disambiguation everywhere
#     it could attach.
#
# When `nav_levels` is nil, the activation shadow falls through to the
# upstream's `activation_no_nav_link` rules: a single
# `.site-nav ul li a { background-image: none; }` rule, plus the
# collection unfold/rotate rules when `site.just_the_docs.collections`
# is set (it is not on this site).
#
# === Compatibility ===
#
# Reads `page.data['title']`, `page.data['parent']`,
# `page.data['grand_parent']`, `page.data['nav_order']`,
# `page.data['child_nav_order']`, `page.data['nav_exclude']`, plus
# `page.url`. Honours `site.config['nav_sort']` for case sensitivity.
# Writes only `page.data['nav_levels']`. If the plugin is removed,
# `_includes/css/activation.scss.liquid` should be reverted to either
# the upstream version (which recomputes the path per page) or any
# other implementation that does not depend on `page.nav_levels`.
#
# MAX_DEPTH is set to 16: the deepest chain on the site today is 5
# levels (Reference Section -> Packages -> VBA Package -> Strings
# Module -> Len). The generous bound guarantees termination even if a
# future authoring mistake creates a cycle in the `parent` chain.

module NavLevelsPrecompute
  MAX_DEPTH = 16
  REVERSE_FLAGS = %w[desc reversed].freeze

  class Generator < Jekyll::Generator
    safe true
    priority :normal

    def generate(site)
      titled = site.pages.select { |p| p.data["title"] }
      by_parent_title = titled.group_by { |p| (p.data["parent"] || "").to_s }
      case_insensitive = site.config["nav_sort"] == "case_insensitive"

      # Sorted, nav-filtered top-level pages.
      top_level = (by_parent_title[""] || []).reject { |p| p.data["nav_exclude"] }
      top_level = sort_pages(top_level, case_insensitive)
      top_index = top_level.each_with_index.map { |p, i| [p.url, i + 1] }.to_h

      # Memoised ordered children for every titled page.
      ordered_children = {}
      titled.each do |parent|
        ordered_children[parent.url] = ordered_children_for(parent, by_parent_title, case_insensitive)
      end

      # Child-url -> 1-based index per parent, for O(1) position lookup.
      child_index = ordered_children.transform_values do |list|
        list.each_with_index.map { |c, i| [c.url, i + 1] }.to_h
      end

      # Top-down nav walk: record each page's first-encountered chain.
      paths = {}
      top_level.each do |top|
        walk_subtree(top, [top], paths, ordered_children, 0)
      end

      # Read back nav_levels for every page that has a recorded chain.
      titled.each do |page|
        page.data["nav_levels"] = levels_from_path(paths[page.url], top_index, child_index)
      end
    end

    private

    # Walks the nav subtree rooted at `node`, threading `chain` (the
    # list of ancestors visited so far, root-first) and recording each
    # page's chain the first time it is reached.
    def walk_subtree(node, chain, paths, ordered_children, depth)
      return if depth > MAX_DEPTH

      paths[node.url] ||= chain

      (ordered_children[node.url] || []).each do |child|
        # Cycle defence: don't descend into a page already in the
        # current chain. The first-occurrence rule still applies to
        # the wider tree -- another branch may have already recorded
        # this page's chain.
        next if chain.any? { |p| p.url == child.url }
        walk_subtree(child, chain + [child], paths, ordered_children, depth + 1)
      end
    end

    # Returns the sorted, nav-filtered children of `parent` per the
    # upstream's `components/nav/children.html` logic, with the
    # `child_nav_order` reversal `components/nav/links.html` applies
    # before rendering.
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

    # Derives `nav_levels` from a recorded chain `[top, ..., page]`.
    # Each entry's position is read from the precomputed maps so the
    # per-page cost is O(chain length).
    def levels_from_path(chain, top_index, child_index)
      return nil unless chain

      top_idx = top_index[chain.first.url]
      return nil unless top_idx

      levels = [1, top_idx]
      (1...chain.length).each do |i|
        idx = child_index.dig(chain[i - 1].url, chain[i].url)
        return nil unless idx
        levels << idx
      end
      levels
    end

    # Mirrors the just-the-docs `_includes/components/nav/sorted.html`
    # precedence: four buckets ordered as nav_order(num), nav_order(str),
    # title(num), title(str), each sorted independently.
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
