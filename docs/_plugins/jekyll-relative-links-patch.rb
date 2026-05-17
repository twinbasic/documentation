# frozen_string_literal: true

# Patch for jekyll-relative-links (>=0.7.0): replace the O(N) linear
# scan in `url_for_path` with an O(1) hash lookup, and extend lookup
# to consult `permalink:` frontmatter and `redirect_from:` aliases
# when a file-path match misses.
#
# === The perf bug ===
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
# The perf fix builds a hash from `relative_path` (leading slash
# stripped, matching the unpatched comparison) to the target object
# once, and looks up by key thereafter. O(M*N) -> O(M+N). First-wins
# semantics (`unless h.key?(key)`) match the unpatched `.find`.
#
# === The semantic gap ===
#
# Upstream only matches the link path against `relative_path` (the
# file's on-disk path). Pages that use `permalink:` frontmatter to
# rename their URL slug are invisible to the gem -- e.g. source
# `[twinBASIC Videos](Videos/tB)` targets `docs/Videos/twinBASIC.md`
# (`permalink: /Videos/tB`), but the gem looks for `Videos/tB.md`,
# doesn't find one, and leaves the link unrewritten. The rendered
# HTML keeps the relative path, which works online only by accident
# of relative-path math, and falls back further on `redirect_from:`
# stubs as an undocumented safety net. In the PDF book (where chapter
# bodies get concatenated under `/book.html`) the same relative path
# can no longer reach the target page, and the rewriter that turns
# in-book hrefs into chapter anchors can't match the unresolved form
# either -- so cross-references break.
#
# The fix adds two fallback hashes after the file-path table:
#
#   potential_targets_by_url            keys: leading-slash-stripped
#                                        `page.url`. Both with- and
#                                        without-trailing-slash forms
#                                        are indexed for folder-style
#                                        index pages whose permalinks
#                                        end in `/`, so
#                                        `[X](Tutorials/CEF)` and
#                                        `[X](Tutorials/CEF/)` both
#                                        resolve.
#
#   potential_targets_by_redirect_from  keys: leading-slash-stripped,
#                                        trailing-slash-trimmed
#                                        `redirect_from` aliases.
#                                        Returns the target page
#                                        whose canonical permalink is
#                                        `page.url`, so url_for_path
#                                        emits the canonical form
#                                        rather than relying on the
#                                        redirect stub at runtime.
#
# `url_for_path` chains all three: file-path first (upstream behaviour
# -- author-intended file references always win), then permalink, then
# redirect_from. First hit wins. Misses still return nil and the gem
# leaves the link unrewritten, matching upstream's fail-open contract.
#
# === Compatibility ===
#
# Targets the upstream gem version pinned by Gemfile.lock (0.7.0). The
# patch overrides only `url_for_path` and adds three new memoisers
# (`potential_targets_by_path`, `..._by_url`, `..._by_redirect_from`);
# every other method is untouched. The `unless method_defined?` guard
# makes the patch idempotent against accidental double-load.
#
# If a future release rewrites `url_for_path`, re-verify that the
# replacement still resolves a path to a target by scanning
# `potential_targets` (or an equivalent) and that swapping in the
# three-tier hash lookup remains a faithful extension. If the upstream
# project takes a PR for this, delete this file.

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

      # Pages indexed by their rendered URL (permalink), leading slash
      # stripped to match the form `path_from_root` produces. Folder-
      # style permalinks (URL ending in `/`) are also indexed under
      # their trimmed form so source markdown can drop the trailing
      # slash. Restricted to pages and writable docs -- static files
      # have a `url` but it's just the file path, which the by_path
      # table already covers.
      #
      # `JekyllRedirectFrom::RedirectPage` instances are excluded:
      # the jekyll-redirect-from plugin synthesizes a stub page for
      # every `redirect_from` alias, each with `url` equal to the
      # alias itself. Indexing those would route source links through
      # the redirect stub (a one-hop intermediate that only works in
      # a browser) instead of resolving straight to the canonical
      # target. The `by_redirect_from` table below indexes the same
      # aliases but points at the canonical page, which is what we
      # want.
      def potential_targets_by_url
        @potential_targets_by_url ||= begin
          is_redirect_stub = defined?(JekyllRedirectFrom::RedirectPage) \
            ? ->(p) { p.is_a?(JekyllRedirectFrom::RedirectPage) } \
            : ->(_p) { false }
          (site.pages + site.docs_to_write).each_with_object({}) do |p, h|
            next if is_redirect_stub.call(p)
            url = p.url.to_s
            next if url.empty? || url == "/"
            key = url.sub(%r!\A/!, "")
            h[key] = p unless h.key?(key)
            if key.end_with?("/")
              alt = key.chomp("/")
              h[alt] = p unless h.key?(alt)
            end
          end
        end
      end

      # Pages indexed by their `redirect_from` aliases (set by the
      # jekyll-redirect-from plugin). Each alias is normalised to the
      # leading-slash-stripped, trailing-slash-trimmed form so source
      # markdown using a historical URL (e.g. a moved page's old slug)
      # resolves to the page's current canonical URL.
      def potential_targets_by_redirect_from
        @potential_targets_by_redirect_from ||= begin
          (site.pages + site.docs_to_write).each_with_object({}) do |p, h|
            Array(p.data["redirect_from"]).each do |alias_url|
              alias_str = alias_url.to_s
              next if alias_str.empty?
              key = alias_str.sub(%r!\A/!, "").chomp("/")
              next if key.empty?
              h[key] = p unless h.key?(key)
            end
          end
        end
      end

      def url_for_path(path)
        path = CGI.unescape(path)
        target = potential_targets_by_path[path] ||
                 potential_targets_by_url[path.chomp("/")] ||
                 potential_targets_by_redirect_from[path.chomp("/")]
        relative_url(target.url) if target&.url
      end
    end
  end
end
