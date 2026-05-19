# frozen_string_literal: true

# Liquid filter that folds the chained `replace` passes in
# `_includes/book-chapter-body.html` into one Ruby method call.
#
# === Problem ===
#
# The per-chapter body transformation in `book-chapter-body.html` was
# a stack of `replace` filter chains:
#
#   1. baseurl-prefixed `src=` strip                                (1 replace)
#   2. inter-span whitespace wrapping (12 patterns, longest first)  (12 replaces)
#   3. heading-shift cascade -- 1.5a base shift                     (12 replaces, conditional)
#   4. heading-shift cascade -- 1.6b sub-page shift                 (12 replaces, conditional)
#   5. heading-shift cascade -- 1.9 chaptered-part extra shift      (12 replaces, conditional)
#   6. anchor-id prefix injection (h2..h6, h7-stub, with/without
#      class="no_toc", plus `href="#`)                              (13 replaces)
#
# Worst case per chapter: 1 + 12 + 12 + 12 + 12 + 13 = 62
# `Liquid::StandardFilters#replace` invocations. Across ~745 chapter
# bodies the chain produced the bulk of the build's 87,991
# `replace` calls (0.6 s in ruby-prof, mostly the per-call Liquid
# dispatch overhead -- each individual replace is a fast literal
# `String#gsub`). Each `replace` also rebuilds the intermediate
# string, so a 62-step chain produces 62 intermediate copies of the
# chapter body before the result lands.
#
# === Approach ===
#
# `book_chapter_transform(body, baseurl, heading_shift_n, chapter_anchor)`
# does all six passes in one method:
#
#   * Step 1 uses a single literal `gsub!` keyed on the live
#     `site.baseurl` value (passed as the second filter argument so
#     the constant isn't baked into the plugin at load time).
#   * Step 2 walks a frozen `WHITESPACE_PATTERNS` table of 12
#     literal `[search, replacement]` pairs and applies them in
#     longest-first order, matching the Liquid chain's order
#     exactly. Literal `gsub!` on each.
#   * Steps 3-5 collapse into a single regex pass keyed on
#     `heading_shift_n` (= 0, 1, 2, or 3 -- precomputed in Liquid
#     from `skip_base_heading_shift`, `is_sub_page`, and
#     `extra_heading_shift`). The N-pass cascade of the Liquid
#     chain is equivalent to a one-pass regex that bumps each
#     heading level by N, capping at `h7-stub` for levels above 6.
#   * Step 6 replaces the 13 literal `replace` calls with one regex
#     for heading-id injection (matches `<h[2-6]` and `<h7-stub`,
#     with and without `class="no_toc"`) and one literal `gsub!`
#     for `href="#`.
#
# Output is byte-identical to the Liquid chain. Two correctness
# notes that surfaced when verifying byte-identity via `diff -rq`:
#
#   * The Liquid heading-shift chain processes BOTTOM-UP (`<h6`
#     first, then `<h5`, ...) so each replace doesn't double-shift.
#     A single-pass regex incrementing the level by `N` produces
#     the same output for any `N` -- each heading source level
#     lands at `level + N` or `h7-stub` if that exceeds 6. The
#     mapping is the same regardless of how many sequential
#     cascade passes the chain ran; the cascade structure was an
#     artifact of Liquid not having a "increment level by N"
#     primitive, not a semantic requirement.
#   * The heading-shift regex captures the optional leading `/`
#     so it also handles closing tags (`</h1>` -> `</h2>`). The
#     `\b` word boundary anchors after the digit so `<h12foo>`
#     (hypothetical) wouldn't accidentally match.
#
# === When it runs ===
#
# Per-render, inside Liquid as a standard filter. The plugin file
# only needs `Liquid::Template.register_filter`; no hook.

module Jekyll
  module BookChapterTransform
    SP  = " "
    NL  = "\n"
    S4  = "    "
    S8  = "        "
    S12 = "            "
    S16 = "                "

    # Inter-span whitespace patterns for pagedjs's page splitter --
    # see book.html's header comment for the full rationale. Longest
    # pattern first so each consumes its bytes before a shorter
    # pattern can fragment them; mirrors the Liquid chain's order in
    # `book-chapter-body.html` exactly.
    WHITESPACE_PATTERNS = [
      # p1: blank line after code line with trailing space
      ["</span>#{SP}#{NL}#{SP}#{NL}<span",
       "</span><span class=\"w\">#{SP}#{NL}#{SP}#{NL}</span><span"],
      # p2: blank line after comment line (trailing space already inside span)
      ["</span>#{NL}#{SP}#{NL}<span",
       "</span><span class=\"w\">#{NL}#{SP}#{NL}</span><span"],
      # p3i12 / p3i8 / p3i4: code line + trailing space, indented next line
      ["</span>#{SP}#{NL}#{S12}<span",
       "</span><span class=\"w\">#{SP}#{NL}#{S12}</span><span"],
      ["</span>#{SP}#{NL}#{S8}<span",
       "</span><span class=\"w\">#{SP}#{NL}#{S8}</span><span"],
      ["</span>#{SP}#{NL}#{S4}<span",
       "</span><span class=\"w\">#{SP}#{NL}#{S4}</span><span"],
      # p3: code line + trailing space, non-indented next line
      ["</span>#{SP}#{NL}<span",
       "</span><span class=\"w\">#{SP}#{NL}</span><span"],
      # p4i16 / p4i12 / p4i8 / p4i4: code line, indented next line
      ["</span>#{NL}#{S16}<span",
       "</span><span class=\"w\">#{NL}#{S16}</span><span"],
      ["</span>#{NL}#{S12}<span",
       "</span><span class=\"w\">#{NL}#{S12}</span><span"],
      ["</span>#{NL}#{S8}<span",
       "</span><span class=\"w\">#{NL}#{S8}</span><span"],
      ["</span>#{NL}#{S4}<span",
       "</span><span class=\"w\">#{NL}#{S4}</span><span"],
      # p4: code line, non-indented next line
      ["</span>#{NL}<span",
       "</span><span class=\"w\">#{NL}</span><span"],
      # Inline single-space inter-span
      ["</span> <span",
       "</span><span class=\"w\"> </span><span"]
    ].map { |a, b| [a.freeze, b.freeze] }.freeze

    # Heading-shift regex. Captures the optional `/` for closing
    # tags and the level digit (1..6). The `\b` after the digit
    # prevents accidental matches on hypothetical `<h12...>`.
    HEADING_SHIFT_RE = /<(\/?)h([1-6])\b/.freeze

    # Heading-id prefix regex. Matches both `<h[2-6]` and
    # `<h7-stub`, optionally followed by `class="no_toc"`, then
    # `id="` -- the same span the Liquid chain's 12 literal
    # replaces collectively covered.
    HEADING_ID_RE = /<(h[2-6]|h7-stub)((?:\s+class="no_toc")?)\s+id="/.freeze

    def book_chapter_transform(body, baseurl, heading_shift_n, chapter_anchor)
      return body if body.nil? || body.empty?
      result = body.to_s.dup

      # Step 1: strip the baseurl-prefixed src.
      strip = %(src="#{baseurl}/)
      result.gsub!(strip, %(src=")) if result.include?(strip)

      # Step 2: whitespace span wrapping.
      WHITESPACE_PATTERNS.each do |search, replacement|
        result.gsub!(search, replacement)
      end

      # Step 3: heading shift cascade by N levels (0..3).
      n = heading_shift_n.to_i
      if n > 0
        result.gsub!(HEADING_SHIFT_RE) do
          slash      = Regexp.last_match(1)
          level      = Regexp.last_match(2).to_i
          new_level  = level + n
          new_level > 6 ? "<#{slash}h7-stub" : "<#{slash}h#{new_level}"
        end
      end

      # Step 4: anchor-id prefix on every heading id + intra-chapter href.
      if chapter_anchor && !chapter_anchor.to_s.empty?
        prefix = "#{chapter_anchor}-"
        result.gsub!(HEADING_ID_RE) do
          %(<#{Regexp.last_match(1)}#{Regexp.last_match(2)} id="#{prefix})
        end
        result.gsub!('href="#', %(href="##{prefix}))
      end

      result
    end
  end
end

Liquid::Template.register_filter(Jekyll::BookChapterTransform)
