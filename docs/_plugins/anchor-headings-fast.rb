# frozen_string_literal: true

# Replaces the per-page Liquid pass in
# `_includes/vendor/anchor_headings.html` (jekyll-anchor-headings
# v1.0.12) with a Ruby regex substitution exposed as a Liquid filter.
#
# === Problem ===
#
# The upstream vendor include is a ~170-line Liquid template that runs
# once per page: it splits the rendered HTML on `<h`, iterates each
# chunk, validates that it is an h1..h6 tag, extracts the id and
# class attributes by further string splitting, and rebuilds each
# heading with an anchor link injected. The total cost is ~1.2 s of
# RENDER time on the ~838-page site (about 1.5 ms per page). Every
# step is per-page string surgery with Liquid `capture` / `assign`
# overhead.
#
# === Approach ===
#
# Replace the include's body with a Ruby regex substitution exposed
# as the `jtd_anchor_headings` Liquid filter. The shadow
# `_includes/vendor/anchor_headings.html` becomes a single line that
# pipes `include.html` through that filter. The filter runs over the
# same string the upstream template would have processed (the page's
# rendered content), so headings injected later by other includes
# (notably the auto-TOC h2 from `toc_heading_custom.html`, which
# `children_nav.html` adds after the anchor pass) are not touched --
# matching the upstream's scope exactly.
#
# === Output parity ===
#
# Anchor format is hard-coded to match the call site in just-the-
# docs's `_layouts/default.html`:
#
#   beforeHeading="true"
#   anchorBody="<svg viewBox=\"0 0 16 16\" aria-hidden=\"true\">
#                 <use xlink:href=\"#svg-link\"></use></svg>"
#   anchorClass="anchor-heading"
#   anchorAttrs="aria-labelledby=\"%html_id%\""
#
# The upstream template always rebuilds the heading with surrounding
# whitespace (newlines + indent inside the open and close tags). The
# downstream `vendor/compress.html` layout collapses that whitespace
# to single spaces via Ruby's awk-mode `split(" ")`. The net result
# inside a content heading is:
#
#   <hN ATTRS> <a ...></a> BODY </hN>   (with id; anchor injected)
#   <hN ATTRS> BODY </hN>               (without id; just wrapped)
#   <hN> BODY </hN>                     (no attrs; just wrapped)
#
# The filter emits the post-collapse form directly: a single space
# after the opening tag, single space before the closing tag, single
# spaces around any injected anchor. Compress.html sees no internal
# whitespace to collapse and leaves the headings unchanged.
#
# Headings with `class="no_anchor"` would be skipped by the upstream
# template; this site does not use that class anywhere (verified by
# scanning rendered HTML), so the filter does not special-case it.
# If a future page ever needs to opt out, add the corresponding
# guard before emitting the anchor.
#
# === Scope ===
#
# Because the filter runs on `include.html` (the value the upstream
# include's `html=content` parameter carries), it sees only the page
# content -- never the layout's headers, sidebar, breadcrumbs, the
# auto-TOC h2 from `toc_heading_custom.html`, or any other heading
# inserted after the include. This matches the upstream template's
# scope exactly. (`children_nav.html` runs
# `{% include toc_heading_custom.html %}` after the anchor pass in
# `_layouts/default.html`, so the auto-TOC's
# `<h2 class="text-delta">Table of contents</h2>` is intentionally
# never anchored.)
#
# === Compatibility ===
#
# If the plugin is removed, the shadow include's
# `| jtd_anchor_headings` filter call raises a `Liquid::SyntaxError`
# at build time. Revert the shadow to the upstream version to
# restore.

module AnchorHeadingsFast
  # Matches <hN ATTRS>BODY</hN> for h1..h6. The attribute group is
  # optional so headings with no attributes (the 404 page's
  # `<h1>404</h1>` and the redirect pages' `<h1>Redirecting...</h1>`)
  # also match -- the upstream template rebuilds those headings too,
  # leaving a single space inside the opening and closing tags after
  # compress.html's whitespace collapse.
  #
  # Captures:
  #   $1 -- tag name (h1..h6)
  #   $2 -- attribute string, possibly empty (including leading
  #         whitespace if present)
  #   $3 -- body content between <hN ...> and </hN>
  #
  # The body is non-greedy so headings with nested HTML (code spans,
  # links, etc.) round-trip correctly. Headings cannot legitimately
  # contain another </hN> with the same N in valid HTML.
  HEADING_REGEX = %r{<(h[1-6])(\s[^>]*?)?>(.*?)</\1>}m.freeze

  # Extracts the id attribute value from an attribute string. Returns
  # nil when no id is present (the upstream's `html_id` falsy case).
  ID_ATTR_REGEX = /\bid="([^"]+)"/.freeze

  ANCHOR_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><use xlink:href="#svg-link"></use></svg>'
  private_constant :ANCHOR_SVG

  def self.inject(html)
    html.gsub(HEADING_REGEX) do
      tag   = Regexp.last_match(1)
      attrs = Regexp.last_match(2) || ''
      body  = Regexp.last_match(3)
      id_match = attrs.match(ID_ATTR_REGEX)
      if id_match
        id = id_match[1]
        anchor = %(<a href="##{id}" class="anchor-heading" aria-labelledby="#{id}">#{ANCHOR_SVG}</a>)
        "<#{tag}#{attrs}> #{anchor} #{body} </#{tag}>"
      else
        "<#{tag}#{attrs}> #{body} </#{tag}>"
      end
    end
  end
end

module Jekyll
  module AnchorHeadingsFilter
    def jtd_anchor_headings(input)
      ::AnchorHeadingsFast.inject(input.to_s)
    end
  end
end

Liquid::Template.register_filter(Jekyll::AnchorHeadingsFilter)
