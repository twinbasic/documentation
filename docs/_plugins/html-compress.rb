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

# Run before offlinify (default :normal priority) so the offline-tree
# rewrites see the compressed page.output, and before Jekyll's
# `:site, :post_write` writes _site/ for the same reason.
Jekyll::Hooks.register :pages, :post_render, priority: :high do |page|
  next unless page.output.is_a?(String)
  next unless HtmlCompress.compress?(page)
  HtmlCompress.compress!(page.output)
end

Jekyll::Hooks.register :documents, :post_render, priority: :high do |doc|
  next unless doc.output.is_a?(String)
  next unless HtmlCompress.compress?(doc)
  HtmlCompress.compress!(doc.output)
end
