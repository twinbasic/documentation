# frozen_string_literal: true

# Patch for jekyll-relative-links (>=0.7.0): replace the O(N) linear
# scan in `url_for_path` with an O(1) hash lookup.
#
# === The bug ===
#
# `JekyllRelativeLinks::Generator#url_for_path` is invoked once for
# every markdown link match (both inline `[X](Y)` and reference-style
# `[X]: Y`) in every markdown document the gem processes. The unpatched
# implementation is:
#
#     def url_for_path(path)
#       path = CGI.unescape(path)
#       target = potential_targets.find { |p| p.relative_path.sub(%r!\A/!, "") == path }
#       relative_url(target.url) if target&.url
#     end
#
#     def potential_targets
#       @potential_targets ||= site.pages + site.static_files + site.docs_to_write
#     end
#
# `potential_targets` is memoised (good), but the lookup against it is
# a linear scan with a `.find` that calls `.sub` on every entry's
# `relative_path` on every call (bad). For M link matches across the
# site and N potential targets, total link-resolution cost is O(M*N).
# On this site M*N ~= 7M (~6800 markdown link matches, ~1050 targets),
# and the unpatched gem spends ~3.4s of the GENERATE phase here -- the
# bulk of GENERATE on a build that otherwise takes ~600ms in that
# phase.
#
# === The fix ===
#
# Build a hash from `relative_path` (with the leading slash stripped,
# to match the unpatched comparison) to the target object once, and
# look up by key thereafter. Hash construction is O(N) once; each
# subsequent lookup is O(1). Total cost drops from O(M*N) to O(M+N),
# and the GENERATE phase shrinks accordingly.
#
# The hash is built with first-wins semantics (`unless h.key?(key)`)
# to match the unpatched `.find`, which returns the first matching
# target. In practice `relative_path` is unique across pages, static
# files, and docs, so this only matters as defence against an
# unexpected duplicate -- but matching the upstream behaviour exactly
# keeps the patch a safe drop-in.
#
# === Compatibility ===
#
# Targets the upstream gem version pinned by Gemfile.lock (0.7.0). The
# patch overrides only `url_for_path` and adds one new memoiser
# (`potential_targets_by_path`); every other method is untouched. The
# `unless method_defined?` guard makes the patch idempotent against
# accidental double-load.
#
# If a future release rewrites `url_for_path`, re-verify that the
# replacement still resolves a path to a target by scanning
# `potential_targets` (or an equivalent) and that swapping in a hash
# lookup remains a faithful drop-in. If the upstream project takes a
# PR for this, delete this file.

require "jekyll-relative-links"

module JekyllRelativeLinks
  class Generator
    unless method_defined?(:potential_targets_by_path)
      def potential_targets_by_path
        @potential_targets_by_path ||= potential_targets.each_with_object({}) do |p, h|
          key = p.relative_path.sub(%r!\A/!, "")
          h[key] = p unless h.key?(key)
        end
      end

      def url_for_path(path)
        path = CGI.unescape(path)
        target = potential_targets_by_path[path]
        relative_url(target.url) if target&.url
      end
    end
  end
end
