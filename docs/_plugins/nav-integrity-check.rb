# frozen_string_literal: true

# Fails the Jekyll build when any nav-visible page has a `parent:` (and
# optionally `grand_parent:`) that does not uniquely identify its
# position in the navigation tree.
#
# === Background ===
#
# just-the-docs builds its nav tree by matching each page's `parent:`
# against other pages' `title:`. When multiple pages share the same
# title, the theme attaches the child under every matching parent —
# unless `grand_parent:` is declared to disambiguate. This duplication
# is silent: no warning is emitted, and the child simply shows up in
# multiple places in the nav (or, worse, only under the wrong parent
# due to render-order-dependent first-occurrence logic).
#
# This generator detects and reports these ambiguities at build time so
# they can be fixed before deployment.
#
# === Logic ===
#
# For each nav-visible page P that declares `parent: X`:
#
#   1. Find all nav-visible pages whose `title` == X.
#   2. If only one candidate exists → unambiguous, pass.
#   3. If multiple candidates exist:
#      a. If P has no `grand_parent:` → AMBIGUOUS.
#      b. If P declares `grand_parent: G` → keep only candidates whose
#         own `parent` == G.
#         - If exactly one remains → disambiguated, pass.
#         - If multiple remain → STILL AMBIGUOUS.
#         - If zero remain → orphan (no valid parent); reported as a
#           separate diagnostic.
#
# === Priority ===
#
# Runs at :high priority so it executes before nav-tree-precompute and
# nav-levels-precompute, catching problems before they propagate.

module NavIntegrityCheck
  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      titled = site.pages.select { |p| p.data["title"] }
      nav_visible = titled.reject { |p| p.data["nav_exclude"] }

      by_title = {}
      nav_visible.each do |p|
        (by_title[p.data["title"]] ||= []) << p
      end

      ambiguous = []
      orphaned = []

      nav_visible.each do |page|
        parent_title = page.data["parent"]
        next unless parent_title

        candidates = by_title[parent_title]

        unless candidates && !candidates.empty?
          # Parent title doesn't match any page — just-the-docs will
          # silently drop this page from the nav. Not an ambiguity
          # issue per se, but worth reporting.
          orphaned << { page: page, reason: "no page titled \"#{parent_title}\" exists" }
          next
        end

        next if candidates.size == 1

        gp = page.data["grand_parent"]
        unless gp
          ambiguous << {
            page: page,
            parent_title: parent_title,
            candidate_count: candidates.size,
            reason: "#{candidates.size} pages are titled \"#{parent_title}\" " \
                    "and no grand_parent is declared to disambiguate",
          }
          next
        end

        filtered = candidates.select { |c| c.data["parent"] == gp }

        if filtered.size > 1
          ambiguous << {
            page: page,
            parent_title: parent_title,
            candidate_count: filtered.size,
            reason: "#{filtered.size} pages titled \"#{parent_title}\" share " \
                    "parent \"#{gp}\" — grand_parent does not disambiguate",
          }
        elsif filtered.empty?
          orphaned << {
            page: page,
            reason: "grand_parent \"#{gp}\" does not match any page titled " \
                    "\"#{parent_title}\"",
          }
        end
      end

      report_and_abort(ambiguous, orphaned) if ambiguous.any? || orphaned.any?
    end

    private

    def report_and_abort(ambiguous, orphaned)
      lines = []

      if ambiguous.any?
        lines << "Nav-parent ambiguity detected in #{ambiguous.size} page(s):"
        ambiguous.each do |entry|
          lines << "  #{page_id(entry[:page])}: #{entry[:reason]}"
        end
      end

      if orphaned.any?
        lines << "Nav-parent orphan detected in #{orphaned.size} page(s):"
        orphaned.each do |entry|
          lines << "  #{page_id(entry[:page])}: #{entry[:reason]}"
        end
      end

      lines.each { |l| Jekyll.logger.error "NavIntegrity:", l }
      raise Jekyll::Errors::FatalException, lines.first
    end

    def page_id(page)
      page.relative_path
    end
  end
end
