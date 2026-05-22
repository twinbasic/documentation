# HtmlCompress

`_plugins/html-compress.rb` runs the HTML whitespace compression that wraps every page's render chain — the same job just-the-docs's vendor/compress.html Liquid layout was doing, but in Ruby instead of Liquid filters. Output is byte-identical to the layout-based version for the 837 vendor/compress-reaching pages (verified by recursive diff of every file in `_site/` against a vendor/compress.html baseline). The Liquid layout is short-circuited to a `{{ content }}` passthrough via `compress_html.ignore.envs: all` in `_config.yml`; the plugin then runs at `:pages, :post_render` / `:documents, :post_render` with `priority :normal` as the *cleanup* step in a three-tier `:high` → `:normal` → `:low` ordering (mutators → compress → readers — see [Hook priority convention](#hook-priority-convention) below). It also picks up one page the original layout didn't process, `book.html`, via an explicit `book-combined` addition to the compress-eligible set — see [book.html inclusion](#bookhtml-inclusion).

This file sits in `_plugins/` for the same reasons as `offlinify.md` and `pdfify.md`: it lives next to the code it documents, and Jekyll's `_plugins/` folder is plugin-only territory, so this Markdown never gets rendered into the public site.

## Why a plugin instead of the layout?

vendor/compress.html ships with the [`jekyll-compress-html`](http://jch.penibelst.de/) approach: every transformation expressed as a Liquid filter chain. In our build's profile, the layout alone consumed ~2.4 s of RENDER time across 837 pages — well over a quarter of all per-template Liquid evaluation. The work itself isn't that much. With `site.compress_html.{endings,startings,comments,clippings}` all unset (their default), the layout's logic collapses to a single operation per page:

```liquid
outside-of-<pre> text | split: " " | join: " "
```

Liquid's `split: " "` lowers to Ruby's `String#split(" ")`, which uses its whitespace-mode special-case (any run of whitespace is the separator, leading/trailing whitespace gets stripped). The result is a `Array<String>` of every whitespace-delimited token in the page body. `join: " "` then walks it back to a single string. For a typical page, that's thousands of token allocations; across 837 pages it's millions of small `String` objects, with the corresponding allocator and GC pressure.

The same algorithm in Ruby is one method call:

```ruby
content.split(" ").join(" ")
```

— still allocating the same token array, but skipping Liquid's filter dispatch, parse-tree walk, and per-filter `Liquid::Context` plumbing on top. In practice this saves ~2.4 s per build of the work that compress.html was doing, with the plugin's own runtime negligible against that.

The bypass mechanism is upstream-supplied: vendor/compress.html's very first conditional checks `site.compress_html.ignore.envs`. When set to `"all"` (or to a string containing the current `jekyll.environment`), the layout's body is just `{{ content }}` and the rest of the template is skipped. The plugin then takes over.

## What vendor/compress.html does (and what we mirror)

The full Liquid layout supports four configurable transformations beyond the pre-block whitespace collapse:

| Config key | What it strips |
|------------|----------------|
| `compress_html.endings` | Closing tags HTML5 allows omitting: `</li>`, `</td>`, `</tr>`, etc. |
| `compress_html.startings` | Optional opening tags: `<html>`, `<head>`, `<body>`. |
| `compress_html.comments` | HTML `<!-- -->` comment blocks. |
| `compress_html.clippings` | Whitespace adjacent to block-level element tags (32 elements by default). |

This site sets **none** of those — they all default to `nil`, and the Liquid `for` loops over them iterate zero times. So the layout's net behaviour reduces to the one transformation the plugin replicates: split the content by `<pre>` blocks, collapse whitespace runs in everything outside those blocks, preserve the `<pre>` bodies verbatim.

If a future config sets any of the four keys, the plugin would no longer match — at that point the choice is to either extend the plugin to handle the additional transforms or to revert to the layout for that build. The plugin's header comment flags this dependency.

## How the plugin matches the layout's output

Three details matter for byte-identical output:

1. **Pre-block boundary recipe.** vendor/compress.html splits content by the literal string `<pre`, processes each section, splits by `</pre>` to separate the inside of a pre block from the content after, and only collapses whitespace in the after-content. The plugin uses the same boundary algebra but expressed as one regex matching a full `<pre>...</pre>` block:

   ```ruby
   PRE_BLOCK_RE = /<pre\b.*?<\/pre>/m.freeze
   ```

   `content.split(/(#{PRE_BLOCK_RE})/, -1)` returns an alternating array `[outside, pre, outside, pre, ..., outside]` (the capture group keeps each matched block in the result). Even indices are outside-of-pre, odd are pre bodies. The plugin runs `split(" ").join(" ")` only on the even indices, preserving the odd indices byte-for-byte.

2. **Whitespace-mode split.** Liquid's `split: " "` argument is the literal one-space string `" "`. Ruby's `String#split(" ")` special-cases this exact argument (per CRuby docs) to behave as "split on whitespace runs, strip leading/trailing whitespace, drop empty trailing entries". The plugin uses `split(" ")` (not `split(/\s+/)`, which has different leading-whitespace semantics) so the per-segment collapse matches the layout's output exactly.

3. **Trailing newline preservation.** `split(" ")` strips the final segment's trailing whitespace, so a content that ended with `</html>\n` would emerge as `</html>` after the join. But vendor/compress.html's *template* ends with a literal newline after its `{{ _content }}` output, so the layout-emitted file ends with one `\n` regardless. The plugin re-adds a trailing `\n` when the input had one:

   ```ruby
   had_trailing_nl = content.end_with?("\n")
   # ... split / join ...
   result << "\n" if had_trailing_nl && !result.end_with?("\n")
   ```

   This is the one place where understanding the layout's template structure (not just its filter logic) matters — without the trailing newline restore the plugin's output differs by one byte per page.

## Layout-chain gating

vendor/compress.html only ran on pages whose layout chain reached it. The just-the-docs layout chain for normal pages is:

```
page.md   (layout: default)
└── default.html (layout: table_wrappers)
    └── table_wrappers.html (layout: vendor/compress)
        └── vendor/compress.html (no layout)
```

Pages that don't use any of these layouts — jekyll-redirect-from stubs, the SCSS-derived CSS pages, `assets/js/zzzz-search-data.json` — were left untouched by the layout. The plugin has to match that gating, otherwise it would compress files that compress.html doesn't, breaking byte-identity. `book.html` (which uses the minimal `book-combined` layout that has no parent) was originally in this list, but is now explicitly added to the compress-eligible set — see [book.html inclusion](#bookhtml-inclusion).

The gate is precomputed once at `:site, :pre_render`:

```ruby
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
```

Walk every layout in `site.layouts`, follow `data["layout"]` from each, mark every layout on the walked path the moment the walk reaches `vendor/compress`. Cycles are guarded by the `walked.include?` check. After the precompute, `@compress_layouts` holds the set of layout keys whose render output passes through compress; the per-page hook checks `@compress_layouts.include?(page.data["layout"])` and skips the page entirely when it doesn't match.

Two subtleties make this trickier than it looks:

- **Layout keys vs filenames.** `site.layouts` is keyed by layout name without extension (`"default"`, `"vendor/compress"`), and `page.data["layout"]` carries the same shape. But the `Layout` object's `.name` attribute is the filename *with* extension (`"default.html"`, `"vendor/compress.html"`). The walk must compare against the key, not against `cur.name` — comparing against `cur.name` was the first version's bug and produced an empty `@compress_layouts` set (every page un-gated, every redirect stub compressed, 301-file diff against the baseline).

- **Theme layouts merge with local ones.** `site.layouts` already contains both `_layouts/*.html` from the site source and the theme's `_layouts/*.html` (and `_layouts/vendor/compress.html`) loaded via `theme.layouts_path`. No manual merge needed; the walk sees all keys uniformly.

## When it runs

Three hooks, all at the bottom of `html-compress.rb`:

```ruby
Jekyll::Hooks.register :site, :pre_render do |site|
  HtmlCompress.precompute_compress_layouts!(site)
end

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
```

## Hook priority convention

The `priority: :normal` is the middle tier of a three-level ordering for `:pages, :post_render` and `:documents, :post_render` hooks across the plugin set. Jekyll runs hooks in descending priority (`:high` (30) → `:normal` (20) → `:low` (10)), and the three tiers carry distinct roles:

| Tier | Role | Plugins |
| --- | --- | --- |
| `:high` (30) | **Mutators.** Modify `page.output` so the final bytes reflect this pass. | `book-href-rewrite` (chapter href rewrites + landing-heading strip on `book.html`). |
| `:normal` (20) | **Compress.** The cleanup pass. Sandwiched between mutators and readers so any whitespace runs left behind by a mutator's `gsub` get collapsed before any reader captures the bytes. | `html-compress` (this plugin). |
| `:low` (10) | **Readers.** Snapshot or consume `page.output` after the cleanup pass. | `pdfify` (captures `book.html` for the PDF pipeline), `offlinify` (per-page href / src rewrites + write to `_site-offline/`). |

The layering was originally implicit: the plugin sat at `:high` next to no other priority-annotated `:post_render` hooks. That worked until `book-href-rewrite` joined the set at default `:normal`. Its landing-heading strip ran *after* compress, removing `<h2>` blocks but leaving the (already-collapsed) single-space runs on either side adjacent — producing literal `>  <` blobs in three chapter openings that paged.js's WhiteSpaceFilter then had to handle at render time. Promoting `book-href-rewrite` to `:high` and demoting compress to `:normal` makes the invariant "compress is the last cleanup step among mutators" hold by construction; demoting the readers to `:low` makes "readers see the final compressed output" hold by construction. Future plugins choose their tier by their role and the ordering composes automatically.

The full priority story is documented as a comment block above the `Jekyll::Hooks.register` calls in [`html-compress.rb`](html-compress.rb); each of the four affected plugins (this one, `book-href-rewrite`, `pdfify`, `offlinify`) carries a one-line note pointing back to that block.

## book.html inclusion

The layout-chain walk above only marks layouts that reach `vendor/compress`. `book.html` uses the minimal `book-combined` layout, which has no parent, so the walk never reaches it and the page was originally skipped (matching the layout's behaviour). After investigation of paged.js's per-render `WhiteSpaceFilter` work (see [`perf/README.md`](../../perf/README.md)) showed it doing ~37k DOM mutations at render time to handle whitespace text nodes that *would* have been collapsed if the page had been compressed at Jekyll build time, the precompute was extended to mark `book-combined` explicitly:

```ruby
@compress_layouts << "book-combined" if site.layouts.key?("book-combined")
```

at the end of `precompute_compress_layouts!`. Output: `book.html` now passes through `compress!` once per build (~480 ms of additional `String#split` work on the ~5.5 MB document), saving roughly the same wall-clock at paged.js render time (~28k `textContent` overwrites + ~9k `removeChild` calls eliminated). Net is approximately wall-clock-neutral for full builds, and a small net win for incremental Jekyll workflows that skip the PDF (`also_build_pdf: false`) — the compress cost is paid once per Jekyll build, the render saving is paid every PDF build, and decoupling the two is the structural improvement.

## Verification

The plugin's correctness was established by capturing the full `_site/` tree under the layout-based compression, then rebuilding with the plugin and recursive-diffing every output file:

```sh
# With vendor/compress.html active, plugin disabled
bundle exec jekyll build
cp -r _site /tmp/baseline-site

# With compress_html.ignore.envs: all and the plugin active
bundle exec jekyll build
diff -rq _site /tmp/baseline-site
```

A clean run shows zero differences across ~840 HTML pages, 290 redirect stubs, every CSS / JSON / SVG / image asset — the layout-chain gating ensures non-HTML and non-compress-layout outputs are passed through verbatim, identical to what the Liquid layout produced.

Two regressions caught during development before the gating logic was finalised:

- **Layout-key bug.** First version compared `cur.name` (the filename) against `"vendor/compress"` (the key without extension), so the walk never matched. `@compress_layouts` came out empty, every page was un-gated, every non-HTML file got `split(" ").join(" ")` applied, and `diff -rq` flagged 301 files (290 redirect stubs + 5 CSS + 5 CSS map files + 1 search-data.json). Fixed by iterating `each_key` and walking by key.

- **Trailing newline.** Same baseline diff initially showed every HTML file as 1 byte short — the layout's template-trailing `\n` wasn't being re-added. Fixed by the `had_trailing_nl` guard described above.

## Reference: the most important functions

In source order in [`html-compress.rb`](html-compress.rb):

- `precompute_compress_layouts!(site)` — `:site, :pre_render` entry. Walks every layout chain via `data["layout"]`, marks each layout on the path as compress-ending the moment the walk hits `vendor/compress`. Idempotent; the resulting `@compress_layouts` set persists across builds in `jekyll serve` and gets rebuilt fresh each `:pre_render`.

- `compress?(page)` — gate check. Returns `true` when the page's `data["layout"]` is in `@compress_layouts`. Pages without a layout (jekyll-redirect-from stubs, SCSS-derived CSS, JSON-via-page-rendering) return `false` and skip the compression entirely. `book.html` (which uses `book-combined`, a minimal layout with no parent) used to land here too; it is now explicitly added to the set by `precompute_compress_layouts!` — see [book.html inclusion](#bookhtml-inclusion).

- `compress!(content)` — the actual compression, in place. Captures the trailing-newline state, splits by `PRE_BLOCK_RE` with the capture group so pre bodies are preserved in the result array, runs `split(" ").join(" ")` on every outside-of-pre segment, joins, restores the trailing newline if needed, then mutates the input string via `String#replace`. The `replace` is what lets us hand back the same string object the caller passed in — Jekyll's writer reads `page.output` after `:post_render`, so in-place mutation is the cheapest way to update what gets written.
