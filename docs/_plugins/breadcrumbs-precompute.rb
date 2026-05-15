# frozen_string_literal: true

# Precomputes per-page breadcrumb chains so that the breadcrumbs include
# can iterate a ready-made array instead of resolving ancestors at render
# time.
#
# === Problem ===
#
# just-the-docs's stock `_includes/components/breadcrumbs.html` walks the
# cached `site_nav` HTML (~150 KB) by string-splitting it at the current
# page's `<a>` tag and stepping backward through `</a>` boundaries to
# recover the ancestor anchors. That is roughly O(nav size) per page, so
# at ~830 pages it sits at ~7 s of the RENDER phase.
#
# An equivalent Liquid rewrite using `where:` filters on
# `site.html_pages` does not help: each `where:` is itself O(N_pages),
# and the total number of comparisons works out to the same order of
# magnitude as the upstream's string scanning. Liquid lacks a real
# hash-lookup primitive, so walking the `parent` / `grand_parent` chain
# inside a template cannot beat the upstream's complexity.
#
# === Approach ===
#
# Move the chain resolution out of Liquid and into Ruby, where a hash
# lookup actually is O(1). At generate time (after `site.read`, before
# rendering) we:
#
#   1. Collect every page that has a `title`. Pages without a title are
#      not nav-eligible -- they cannot appear in any breadcrumb chain.
#   2. Build a `title -> [pages]` hash. Most titles are unique on this
#      site, but a handful (e.g. "Enumerations", which appears under
#      WebView2, CEF, CustomControls, WinServicesLib, and
#      WinNativeCommonCtls) need disambiguation. We keep the full list
#      of pages per title and disambiguate on lookup.
#   3. For each page with a `parent`, walk the chain upward:
#        - At each step, look up the next ancestor by title.
#        - If the current page has `grand_parent`, narrow the candidate
#          set to ancestors whose own `parent` matches `grand_parent`.
#          When no candidate matches the narrowed criterion we fall back
#          to the first title hit -- the convention on this site is to
#          declare `grand_parent` only when needed, so the fall-through
#          case is safe by construction.
#        - Push the ancestor onto the chain and step up. The depth is
#          bounded at MAX_DEPTH to defend against accidental cycles in
#          frontmatter.
#   4. Store the resulting chain on `page.data['breadcrumb_chain']` as
#      an Array of `{ "title" => String, "url" => String }` hashes,
#      ordered root-first. The shape is deliberately a plain Hash (not
#      a Page reference) so Liquid can render it without dragging in a
#      full Page Drop -- which would defeat the point of precomputing.
#
# `_includes/components/breadcrumbs.html` consumes
# `page.breadcrumb_chain` directly. The rendered HTML is byte-identical
# to the upstream's output.
#
# === Compatibility ===
#
# Reads only `page.data['title']`, `page.data['parent']`, and
# `page.data['grand_parent']`, plus `page.url`. These are all stable
# Jekyll/just-the-docs fields. The plugin neither registers Liquid
# filters nor mutates anything other than `page.data` -- if it is
# removed, the breadcrumbs include's `for entry in page.breadcrumb_chain`
# simply iterates `nil` and emits no ancestor entries (just the
# current-page span), which is a graceful failure mode.
#
# MAX_DEPTH is set to 8: the deepest chain on the site today is 5
# levels (Reference Section -> Packages -> VBA Package -> Strings
# Module -> Len). 8 leaves comfortable headroom for future growth and
# guarantees termination on any frontmatter that contains a cycle.

module BreadcrumbsPrecompute
  MAX_DEPTH = 8

  class Generator < Jekyll::Generator
    safe true
    priority :normal

    def generate(site)
      # `site.html_pages` is a Liquid-drop method; from Ruby we filter
      # `site.pages` directly. We only care about pages with a `title`,
      # since pages without one cannot appear in any breadcrumb chain.
      titled = site.pages.select { |p| p.data["title"] }
      by_title = titled.group_by { |p| p.data["title"] }

      titled.each do |page|
        page.data["breadcrumb_chain"] = chain_for(page, by_title)
      end
    end

    private

    def chain_for(page, by_title)
      chain = []
      current = page

      MAX_DEPTH.times do
        parent_title = current.data["parent"]
        break if parent_title.nil? || parent_title.to_s.empty?

        parent = resolve_parent(parent_title, current.data["grand_parent"], by_title)
        break unless parent

        chain.unshift(
          "title" => parent.data["title"],
          "url" => parent.url,
        )
        current = parent
      end

      chain
    end

    def resolve_parent(parent_title, grand_parent_title, by_title)
      candidates = by_title[parent_title]
      return nil unless candidates

      if grand_parent_title
        narrowed = candidates.find { |c| c.data["parent"] == grand_parent_title }
        return narrowed if narrowed
      end

      candidates.first
    end
  end
end
