# frozen_string_literal: true
#
# HTML whitespace compression in Ruby, replacing what
# just-the-docs's vendor/compress.html layout does in Liquid.
#
# Why: vendor/compress.html spends ~3.5s of RENDER per build on what
# reduces -- in our config, with
# `site.compress_html.{endings,startings,comments,clippings}` all
# unset -- to a single pre-block-protected whitespace collapse:
#
#   outside-of-<pre> text | split: " " | join: " "
#
# Each Liquid `split: " "` allocates an Array<String> of every
# whitespace-delimited token, then `join: " "` walks it back to a
# string. Across 837 pages with thousands of tokens per page, that's
# millions of small allocations. The same logic in Ruby via
# `String#split(" ").join(" ")` runs in C and skips the Liquid
# evaluator entirely.
#
# To activate: set `compress_html.ignore.envs: all` in _config.yml
# (turns vendor/compress.html into a no-op passthrough). This plugin
# then runs at `:pages, :post_render` / `:documents, :post_render`
# with `priority :high` so the compressed output is what offlinify
# and the Jekyll writer see.
#
# Layout-chain gating: only pages whose layout chain reaches
# vendor/compress get compressed -- the same set the layout would
# have processed. Anything else (jekyll-redirect-from stubs, CSS,
# search-data.json, the book) is left verbatim. The set is
# precomputed once at `:site, :pre_render`.
#
# Output: byte-identical to vendor/compress.html for this site's
# configuration (verified by recursive diff of every file in
# _site/ against a vendor/compress.html baseline snapshot).

require "set"

module HtmlCompress
  # Matches a complete <pre>...</pre> block, body included. Non-
  # greedy + multiline so the `.*?` crosses lines. The same
  # boundary recipe vendor/compress.html uses -- split content
  # by <pre and </pre> and treat what's between as the verbatim
  # body -- but expressed as one regex so the engine can scan
  # the whole document in a single pass.
  PRE_BLOCK_RE = /<pre\b.*?<\/pre>/m.freeze

  # Set of layout names whose render chain reaches
  # `vendor/compress`. Populated once per build.
  @compress_layouts = Set.new

  # Walk every layout's chain via `data["layout"]`, marking each
  # layout on the path as compress-ending the moment the walk hits
  # vendor/compress. Cycles guarded by a walked-list check.
  #
  # Layouts are keyed by basename without extension in `site.layouts`
  # (e.g. `"default"`, `"vendor/compress"`) and the same shape is
  # what `page.data["layout"]` carries, so the walk operates on
  # those keys -- not on `layout.name`, which would be the filename
  # with extension (`"default.html"`).
  def self.precompute_compress_layouts!(site)
    @compress_layouts = Set.new
    site.layouts.each_key do |name|
      walked = []
      cur_name = name
      while cur_name && !walked.include?(cur_name)
        walked << cur_name
        if cur_name == "vendor/compress"
          walked.each { |n| @compress_layouts << n }
          break
        end
        cur = site.layouts[cur_name]
        cur_name = cur ? cur.data["layout"] : nil
      end
    end
    # book-combined is a minimal layout with no parent, so the walk
    # above doesn't reach it. Compressing its only consumer (book.html)
    # at Jekyll time saves paged.js's WhiteSpaceFilter ~37k DOM
    # mutations and ~300-400 ms once per render -- see
    # perf/README.md "WhiteSpaceFilter that wasn't" section.
    @compress_layouts << "book-combined" if site.layouts.key?("book-combined")
  end

  # True when `page` (or document) uses a layout chain ending in
  # vendor/compress -- i.e. exactly the pages compress.html would
  # have processed. Pages without a layout (jekyll-redirect-from
  # stubs, CSS, JSON, book.html via book-combined) return false.
  def self.compress?(page)
    layout_name = page.data["layout"]
    layout_name && @compress_layouts.include?(layout_name)
  end

  # Apply pre-block-aware whitespace collapse: every run of one or
  # more ASCII whitespace characters outside a <pre>...</pre> block
  # is replaced by a single space; leading/trailing whitespace on
  # the document is stripped. Whitespace inside <pre> bodies is
  # preserved byte-for-byte.
  def self.compress!(content)
    # Trailing newline preservation: `split(" ")` strips trailing
    # whitespace from the last segment, but vendor/compress.html
    # appends a `\n` from the literal trailing whitespace in its
    # own template source -- so its output ends with one newline
    # regardless. Mirror that here for byte-identical output.
    had_trailing_nl = content.end_with?("\n")
    # Split on the pre-block regex with a capture group so the
    # matched blocks stay in the result array, alternating with
    # the outside-of-pre segments: [outside, pre, outside, pre,
    # ..., outside]. Even indices are outside, odd are pre.
    parts = content.split(/(#{PRE_BLOCK_RE})/o, -1)
    parts.each_with_index do |part, i|
      next if i.odd?  # leave <pre> bodies verbatim
      # `split(" ").join(" ")` matches Liquid's `split: " " | join: " "`
      # exactly: leading/trailing whitespace stripped, every whitespace
      # run collapsed to one space. C-implemented in MRI.
      parts[i] = part.split(" ").join(" ")
    end
    result = parts.join
    result << "\n" if had_trailing_nl && !result.end_with?("\n")
    content.replace(result)
  end
end

Jekyll::Hooks.register :site, :pre_render do |site|
  HtmlCompress.precompute_compress_layouts!(site)
end

# Priority convention for :pages, :post_render hooks in this site:
#
#   :high   = MUTATORS. Plugins that modify page.output. Run first so
#             their mutations are visible to compress and downstream
#             readers. Examples: book-href-rewrite (landing heading
#             strip + in-book href rewrites).
#
#   :normal = COMPRESS. This plugin. The cleanup pass, sandwiched
#             between mutators and readers so any whitespace runs left
#             behind by a mutator's gsub get collapsed before anyone
#             reads the final bytes.
#
#   :low    = READERS. Plugins that snapshot or consume page.output
#             after all mutations and the compress pass. Run last so
#             they see final output. Examples: pdfify (captures
#             book.html for the PDF pipeline), offlinify (rewrites
#             root-absolute hrefs and writes to _site-offline/).
#
# Without this layering, a mutator running after compress leaves
# adjacent whitespace runs that no downstream pass collapses; a
# reader running before compress captures uncompressed bytes. Both
# regressions surfaced when book-href-rewrite (default :normal) ran
# after html-compress (originally :high) -- its 3 landing-heading
# strips left double-space artifacts that paged.js's WhiteSpaceFilter
# had to handle at render time.
#
# Offlinify also runs at :site, :post_write (a later phase entirely),
# where it always sees the final compressed bytes regardless of
# per-page priority. The :low designation here governs its per-page
# capture hook specifically.
Jekyll::Hooks.register :pages, :post_render, priority: :normal do |page|
  next unless page.output.is_a?(String)
  next unless HtmlCompress.compress?(page)
  HtmlCompress.compress!(page.output)
end

Jekyll::Hooks.register :documents, :post_render, priority: :normal do |doc|
  next unless doc.output.is_a?(String)
  next unless HtmlCompress.compress?(doc)
  HtmlCompress.compress!(doc.output)
end
