# frozen_string_literal: true

# Patch for jekyll-gfm-admonitions (>=1.2.0): suppress the per-page <style>
# injection performed by the gem's :site, :post_render hook, while
# preserving the gem's own "Converted admonitions in N file(s)." log
# message so the build output still reports an honest count.
#
# The gem's default behaviour minifies its bundled `assets/admonitions.css`
# and inlines it into the <head> of every page that contains an admonition,
# duplicating ~1.5 KB across hundreds of rendered files. We instead bundle
# the rules once into the site stylesheet via `_sass/custom/admonitions.scss`,
# which the browser caches like any other static asset.
#
# === How the gem works (relevant bits) ===
#
# `JekyllGFMAdmonitions::GFMAdmonitionConverter` is a `Jekyll::Generator` with
# `priority :lowest`, so it runs after all earlier generators have populated
# the site model. Its `#generate` walks every collection document and every
# page through `#process_doc_content`, which:
#
#   1. Snapshots the original markdown source (`original_content`).
#   2. Calls `#process_doc`, which rewrites `> [!NOTE]` (and the other four
#      GFM admonition keywords) into `<div class='markdown-alert ...'>` HTML
#      via a regex substitution on `doc.content`. Octicons SVGs are inlined
#      for the title icons. Code blocks are temporarily stashed out so
#      admonitions inside fenced code are left alone.
#   3. If `doc.content` actually changed, appends `doc` to a class-level
#      array `GFMAdmonitionConverter.admonition_pages`.
#
# At the end of `#generate`, the gem logs:
#
#   "GFMA: Converted admonitions in #{admonition_pages.length} file(s)."
#
# Separately, the gem registers a `Jekyll::Hooks.register :site, :post_render`
# block at module load time. After Jekyll has rendered the layouts to HTML,
# that hook reads `admonition_pages.length` for its own log line, then
# iterates the array, reads `assets/admonitions.css` from the gem's
# installation directory, minifies it with `CSSminify.compress`, and
# substitutes each page's `<head>...</head>` block to inject a
# `<style>...minified css...</style>` element just before `</head>`. The gem
# author's stated reason (in a code comment) is that GitHub Pages's Jekyll
# sanitiser strips theme CSS additions, so inlining is their workaround --
# but we build locally and deploy the rendered `_site/` to a static host, so
# the sanitiser never runs and the workaround is pure overhead.
#
# === What this patch does ===
#
# The `:post_render` hook is registered unconditionally at gem load and
# there is no public API to deregister it. We instead let the gem populate
# `admonition_pages` normally during the GENERATE phase -- so the count log
# at the end of `#generate` reflects the real number of pages with
# admonitions -- and clear the array between the generator and the renderer
# so the post-render hook iterates an empty list and injects nothing.
#
# The clear is performed in a `Jekyll::Hooks.register :site, :pre_render`
# block. In the Jekyll site lifecycle, `:site, :pre_render` fires after
# every generator has finished but before any page is rendered (see
# `Jekyll::Site#render` in `lib/jekyll/site.rb`), which is exactly the gap
# we need: the gem's generator-end log message has already been written
# with the correct count, the gem's post-render hook has not yet run, and
# our clear empties the list so the post-render iteration becomes a no-op.
#
# Net effect:
#
#   * Markdown -> HTML rewriting is untouched: every `> [!NOTE]` etc.
#     becomes the same `<div class='markdown-alert markdown-alert-<type>'>`
#     element the unpatched gem would produce.
#   * The end-of-generate log line reads
#     `"GFMA: Converted admonitions in N file(s)."` with the real count.
#   * `admonition_pages` is cleared before render starts, so the gem's
#     :post_render hook iterates zero pages and no `<style>` element is
#     spliced into any page's `<head>`.
#   * The post-render log line reads
#     `"GFMA: Inserting admonition CSS in 0 page(s)."`. This is honest --
#     we are no longer in that business -- though it is admittedly an
#     odd thing to see in the build output. The line could be suppressed
#     only by deregistering or replacing the gem's `:post_render` block,
#     and Jekyll exposes no hook-deregistration API; we accept the
#     cosmetic line rather than reach into Jekyll's hook registry.
#   * The admonition CSS rules still apply at render time, because they
#     are compiled into `assets/css/just-the-docs-combined.css` via the
#     `@import "admonitions";` line in `_sass/custom/custom.scss`. That
#     stylesheet is already linked by every page through the theme's
#     `head.html`, so visual output is unchanged.
#
# === Compatibility ===
#
# This patch targets the exact gem version pinned by `Gemfile.lock` (1.2.0).
# If the gem is upgraded, re-verify that
#
#   - `GFMAdmonitionConverter.admonition_pages` is still the class-level
#     accumulator the generator pushes into and the post-render hook
#     iterates, and
#   - the post-render hook's only side effect is the per-page CSS
#     injection driven by that accumulator (otherwise clearing it may
#     not be enough).
#
# If a future release exposes an opt-out for the inlining (e.g. via
# `site.config`), prefer that to this monkey-patch and delete this file.

require "jekyll-gfm-admonitions"

Jekyll::Hooks.register :site, :pre_render do
  # Empties the accumulator the gem's :post_render hook would otherwise
  # iterate over. The gem's earlier `Jekyll.logger.info` call at the end
  # of `#generate` has already reported the real count by the time this
  # hook fires.
  JekyllGFMAdmonitions::GFMAdmonitionConverter.admonition_pages.clear
end

# Wrap `#generate` to report how long the gem's GENERATE-phase work takes.
# `--profile` only attributes time to Liquid templates and converters, so
# generators (this one included) are invisible to it. The wall-clock delta
# we log here is the gem's full contribution to the GENERATE phase:
# walking every collection doc and page, running the admonition regex,
# and re-invoking the markdown converter on each admonition body.
module JekyllGFMAdmonitions
  class GFMAdmonitionConverter
    unless method_defined?(:_generate_without_timing)
      alias_method :_generate_without_timing, :generate
      def generate(site)
        t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        _generate_without_timing(site)
        elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0) * 1000).round(0)
        Jekyll.logger.info "GFMA:", "Generator ran in #{elapsed_ms}ms."
      end
    end
  end
end
