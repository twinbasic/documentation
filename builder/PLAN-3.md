# PLAN-3: Phase 3 — RENDER (`render.mjs`, `highlight.mjs`)

Detailed implementation plan for the third phase of the tbdocs builder.
Read this together with [PLAN.md](PLAN.md) (the architecture overview),
[PLAN-1.md](PLAN-1.md) (DISCOVER), and [PLAN-2.md](PLAN-2.md) (COMPUTE).

The RENDER phase has one job: take each titled-or-untitled page's
`rawContent` (the markdown / HTML body Phase 1 stashed) and **render it
to an HTML body fragment** ready for Phase 4 to wrap in the layout.

What Phase 3 does NOT do:

- Wrap the body in a `<html>` document, layout chrome, sidebar, footer,
  scripts, or the head block (Phase 4).
- Inject anchor `<a>` elements next to `<hN id="…">` (Phase 4 — runs
  AFTER markdown render, has to see the auto-generated heading IDs).
- Compress whitespace (Phase 4).
- Generate the per-page nav-activation `<style>` block (Phase 4 — reads
  `page.navLevels` from Phase 2).
- Concatenate chapter bodies for the PDF book or run the chapter-body
  transform / href-rewrite passes (Phase 8 — operates on the assembled
  `book.html`, not on per-page bodies).

Target: **~800-1500 ms wall time for the full 838-page corpus** on the
current Windows dev machine. The Ruby equivalent (kramdown GFM + Rouge
+ jekyll-relative-links + jekyll-gfm-admonitions, minus the patches'
contributions) currently spends ~3-4 s of the Jekyll build's ~9 s
RENDER phase on markdown conversion proper. The JS port replaces it
with markdown-it (which is roughly 5-10× faster than kramdown on
equivalent inputs) plus Shiki (slower per-block than Rouge but called
fewer times because Shiki keeps the grammar loaded). 1500 ms is the
soft regression cap.

---

## 1. Inputs

### From Phase 1 / Phase 2

The `{ pages, staticFiles, site }` object the orchestrator carries
after Phase 2. Phase 3 reads from each page:

| Field | Why |
|---|---|
| `rawContent` | The markdown / HTML body to render. |
| `ext` | `.md` → run through the markdown pipeline. `.html` → pass through verbatim (currently `404.html` + `book.html`; the latter is consumed by Phase 8, not rendered here). |
| `permalink` | Used by the relative-link rewriter as the "from" base when resolving `[X](Y.md)` link targets. |
| `srcRel` | Used in error messages when the renderer surfaces a problem (the page path is more useful than the permalink for fixing it). |
| `frontmatter.last_modified_date` | Read here only to detect its presence — Phase 4 actually uses it. Phase 3 doesn't touch the value. |

Phase 3 does NOT read `frontmatter.title`, `navTree`, `navLevels`,
`breadcrumbs`, `children`, `seo*`, or `bookData`. Those are all
template-phase concerns. The clean handoff Phase 2 set up is
preserved: Phase 3 takes one input field (`rawContent`) and adds one
output field (`renderedContent`).

### From `site.config`

Two keys:

| Key | Use |
|---|---|
| `baseurl` | Currently empty. Reserved so the relative-link rewriter can emit baseurl-prefixed hrefs when CI runs `jekyll build --baseurl /<repo>`. |
| `enable_copy_code_button` | Currently `true`. Read but unused in Phase 3 — the just-the-docs copy-code button is wired up entirely in client-side JS (the theme's `copy-code.js` finds every `pre.highlight` at runtime and inserts a button). No server-side HTML change is required to honour the option. Phase 3 reads it only so a future move to server-side button injection has a clear hook. |

### Implicit inputs

- The lookup tables the relative-link rewriter consults (path, permalink,
  redirect_from). Built once in Phase 3 from `pages[]`; see §6.3.
- The TextMate grammar at `builder/twinbasic.tmLanguage.json` plus the
  scope-to-Rouge-class map in `highlight.mjs`. Loaded once at builder
  startup.

---

## 2. Outputs

Phase 3 mutates each page in place, adding ONE field:

```js
page.renderedContent: string;   // HTML body fragment. Goes into Phase 4
                                // at the position the layout's
                                // {{ content }} slot used to occupy.
```

For markdown pages (`ext === ".md"`) this is the kramdown/markdown-it
output. For HTML pages (`ext === ".html"`) it is `rawContent` verbatim
— Phase 3 does not parse or alter HTML pages. Currently:

- `404.html` — passes through; Phase 4 still wraps it in the default
  layout.
- `book.html` — passes through; Phase 8 reads it instead (Phase 8 owns
  the book assembly; Phase 3 doesn't need to look inside).

Phase 3 does NOT add `renderedTitle`, `renderedSummary`, etc. Phase 2's
`page.seoTitle` already covers the markdown-rendered-title need (it
runs markdown-it on `frontmatter.title` for SEO). The page H1 in the
body is emitted by markdown-it as part of `rawContent` rendering.

### Side-effect output

The orchestrator gets one new module-level export for downstream phases
to consume:

```js
site.markdown: MarkdownIt;   // The configured markdown-it instance used
                             // for body rendering. Phase 2's seo.mjs
                             // already created its own minimal instance
                             // for title rendering (per PLAN-2 D6); the
                             // two coexist. Phase 4 doesn't currently
                             // need the renderer instance, but exposing
                             // it on `site` keeps the door open for a
                             // future title-rendering consolidation.
```

`site.markdown` is set once before Phase 3's per-page loop and never
mutated. Exporting it lets a future RFC-style content embed (e.g.
rendering a snippet from a data file inside a template) reuse the
same configuration.

---

## 3. Module split

Three new files, plus the grammar JSON:

```
builder/
  render.mjs                  ~400 lines. markdown-it setup,
                              admonition pre-processor, relative-link
                              plugin, TOC plugin, footnote renderer
                              overrides, anchor-id plugin, the
                              per-page render loop.
  highlight.mjs               ~200 lines. Shiki bootstrap, TextMate
                              grammar load, scope-to-Rouge-class
                              mapper, fenced-code render override,
                              wrapper-div emission.
  twinbasic.tmLanguage.json   ~600 lines. TextMate grammar ported
                              from _plugins/twinbasic.rb's Rouge
                              rules.
```

### Why two modules, not one

`render.mjs` is the pipeline orchestrator. It configures markdown-it,
loads the plugins, walks `pages[]`, calls render per page, and
populates `renderedContent`.

`highlight.mjs` is the syntax highlighting subsystem. It owns the
Shiki bootstrap (one-time grammar load + theme load), the
scope-to-Rouge-class mapping, the fenced-code render callback markdown-it
calls, and the wrapper-div HTML. Keeping it out of `render.mjs` makes
the highlight code easy to swap or upgrade without touching the
markdown pipeline.

### Why the TextMate grammar is a separate `.json` file, not inline

- It's ~600 lines of regex rules. Inlining as a JS string literal would
  bloat `highlight.mjs` past readability.
- Editor tooling (VS Code, etc.) can validate / preview the grammar in
  isolation when it lives in its own file.
- A future grammar update from upstream (if anyone shares one) is a
  drop-in JSON replacement.

### Why no `gfm-admonitions.mjs`

The admonition rewrite is ~80 lines of regex preprocessing. Splitting
it into a third module would force `render.mjs` to import the regex,
the icon SVG table, and the body wrapper template just to get one
text-in-text-out function. Keep it inline in `render.mjs` until it
grows past 200 lines (it won't).

---

## 4. Pipeline ordering within Phase 3

Per-page render is a four-stage pipeline. Stages 1, 3, and 4 are
pure-text passes around stage 2's actual markdown render.

```
rawContent
   │
   ▼
 [1] pre-render text rewrites (each consumes/produces a string)
       - CRLF/CR → LF normalisation (so per-line regexes are uniform)
       - Strip Jekyll Liquid `{% raw %}` / `{% endraw %}` tags
       - `***x***` → `**_x_**` (forces strong-outside in both parsers)
       - URL-encode spaces in plain-path media URLs (`![X](a b.png)` →
         `![X](a%20b.png)`) so markdown-it parses them like kramdown
       - List-item-setext promotion: `- text\n---\n` → `- ## text\n`
         (kramdown promotes the previous list item to a setext H2 when
         `---` follows; markdown-it treats it as <hr>)
       - GFM admonition fences → <div markdown="1"> wrappers (§5.2)
   │
   ▼
 [2] markdown-it render
       - GFM-flavoured CommonMark with custom plugins (§5.1)
       - markdown-it-attrs (with `{:`/`}` delimiters), markdown-it-
         deflist, markdown-it-footnote
       - Renderer-rule overrides: `fence` (level-aware nested-list
         whitespace splice), `code_inline` (Rouge wrapper), `table_open`
         / `table_close` (just-the-docs `.table-wrapper` wrap),
         `th_open` / `td_open` (kramdown's space after `text-align:`),
         `ordered_list_open` (strip `start` attribute), `code_block`
         (4-space indented blocks get the same Rouge wrapper as fences)
       - Custom plugins (order matters):
           * standalone-IAL-forward (kramdown's `{: ... }` rule:
             attaches BACKWARD when adjacent to prev block, FORWARD
             otherwise; handles consecutive IALs, reverses attr order
             when markdown-it-attrs merged multiple IALs)
           * tight/loose list (per-item paragraph_open `hidden` flag,
             matching kramdown's per-item rule rather than markdown-it's
             per-list rule)
           * loose deflist (same idea for `<dd>` paragraph wrappers)
           * footnote-render-rule overrides (`fnref:N` colon form,
             `reversefootnote` class, `<div class="footnotes">` outer)
           * header-id (custom slug + dedup)
           * TOC (collects every page heading h2..h6, renders nested
             `<ul id="markdown-toc">` matching kramdown's HTML shape)
           * relative-links (rewrites `[X](Y.md)`, `[X](Y)` against
             path/permalink/redirect_from tables; also handles
             root-absolute paths; refuses paths that escape the docs
             root, matching jekyll-relative-links's behaviour)
           * `markdown="1"` attribute strip (admonition `<div>`s carry
             this; markdown-it's `html: true` already descends so the
             attribute just needs to be removed for byte parity)
           * Wrap-standalone-inline-html (kramdown wraps lone `<br>` /
             `<hr>` / `<img>` in `<p>`; markdown-it leaves them alone)
           * kramdown-dashes (en/em dash + `<<`/`>>` guillemet
             substitutions markdown-it's typographer doesn't do)
           * kramdown-possessive (`</em>'s` → `</em>’s`)
       - fenced-code callback → highlight.mjs (§5.10)
   │
   ▼
 [3] post-render text passes
       - normaliseVoidTags: `<br>` → `<br />` etc. for source-side raw
         HTML (markdown-it tokens already emit xhtml form via xhtmlOut)
       - padEmptyCells: `<td></td>` → `<td> </td>` to match kramdown
   │
   ▼
 [4] assign to page.renderedContent
```

Stage 3 is intentionally small. Three things that might look like
post-render text passes are NOT in Phase 3:

- **Anchor injection** next to `<hN id="…">` — runs in Phase 4 because
  it needs to see the auto-generated heading IDs and operate on the
  same string the layout will compress. Putting it in Phase 3 would
  force Phase 4 to re-parse `renderedContent`.
- **HTML whitespace compression** — Phase 4 (post-template). The
  rendered body shouldn't be compressed yet because the template wraps
  it in surrounding HTML that has to be compressed together.
- **Inter-`<span>` whitespace wrapping for pagedjs** (the
  `book-chapter-transform.rb` step 3) — Phase 8 territory, applied only
  inside the book pipeline, not to per-page bodies.

### Per-page parallelism

Each page renders independently. The orchestrator should `Promise.all`
the per-page renders for throughput:

```js
await Promise.all(pages.map(async (page) => {
  page.renderedContent = await renderPage(page, ctx);
}));
```

markdown-it itself is sync, but the Shiki highlighter (when called
through markdown-it's `highlight` callback) is also sync at our usage
level — Shiki's `codeToHtml` is sync once the highlighter is loaded.
So `renderPage` is functionally synchronous; the `async`/`Promise.all`
shape is for the future case where Shiki gains streaming or a
remote-grammar load.

**Throttling:** not needed at our scale. 838 pages × ~2 ms each is the
target. If Shiki's per-call cost spikes (it should be amortised across
calls since the grammar is shared), wrap with `p-limit(8)` — but only
after measuring.

### Phase 3 init order (one-time)

Before the per-page loop:

```js
const highlighter = await initHighlighter();      // §6.10 — async (Shiki)
const md = createMarkdownIt(highlighter, ctx);    // §6.1 — sync
const linkTables = buildLinkTables(pages);        // §6.3 — sync
// ctx is the per-page object render passes through plugins; built per-page
```

`linkTables` (the path/permalink/redirect_from maps for the
relative-link rewriter) and `md` (the configured markdown-it) live for
the whole phase. The Shiki highlighter loads asynchronously because
Shiki has to read its WASM blob and parse the TextMate grammar; once
loaded, calls into it are sync.

---

## 5. Per-substep specifications

### 5.1. markdown-it base setup

```js
import MarkdownIt from "markdown-it";
import attrs from "markdown-it-attrs";
import deflist from "markdown-it-deflist";
import footnote from "markdown-it-footnote";

function createMarkdownIt(highlighter, ctx) {
  const md = new MarkdownIt({
    html: true,           // allow inline + block HTML (kramdown:
                          // parse_block_html, parse_span_html)
    breaks: false,        // single-newline ≠ <br>; kramdown's
                          // hard_wrap is NOT enabled on this site
                          // (verified against rendered output —
                          // multi-line paragraphs wrap normally
                          // without <br>). Two-space line breaks
                          // ("  \n") still produce <br> via the
                          // CommonMark rule, which is what kramdown
                          // does too.
    linkify: false,       // kramdown's GFM parser DOES auto-link bare
                          // URLs in text, but this site's content
                          // always wraps URLs in explicit [text](url)
                          // form (verified by grepping for bare
                          // `https?://` in body text — none outside
                          // code fences). Leaving linkify off matches
                          // current rendered output and avoids surprise
                          // auto-links inside code spans / tables.
    typographer: true,    // -- → en-dash, --- → em-dash, '/' → typographic
                          // forms. Matches kramdown smart_quotes.
                          // See §6.9 for the divergence we have to
                          // patch around.
    highlight: (code, lang) => highlighter.render(code, lang),
                          // §6.10. Returns the full <div...><pre>...</pre></div>
                          // wrapper structure, including the outer
                          // .language-X .highlighter-rouge div, so
                          // markdown-it doesn't add its own <pre><code>.
  });

  md.use(attrs, { allowedAttributes: [] });   // §6.7 — no allowlist
  md.use(deflist);                            // §6.4
  md.use(footnote);                           // §6.5
  md.use(headerIdPlugin);                     // §6.6 — custom
  md.use(tocPlugin);                          // §6.8 — custom
  md.use(relativeLinksPlugin, ctx);           // §6.3 — custom
  md.use(blockHtmlRecursionPlugin);           // §6.12 — custom

  return md;
}
```

**Constructor option rationale, one per setting:**

- `html: true` — kramdown's `parse_block_html: true` plus
  `parse_span_html: true` together mean kramdown leaves HTML in the
  input verbatim AND descends into it to render embedded markdown.
  markdown-it's `html: true` is the first half; the second half
  (recursive descent) is custom — see §6.12.
- `breaks: false` — see inline comment above.
- `linkify: false` — see inline comment above. **Worth re-verifying**
  if any future page introduces bare URLs in body prose.
- `typographer: true` — needed for the `--`/`---` → en/em-dash
  conversion the site relies on (WIP.md "Source dashes" section).
  See §6.9 for the smart-quote tuning needed for byte-parity with
  kramdown.
- `highlight` callback — see §6.10. Must return the FULL wrapper HTML
  including the outer `<div class="language-X highlighter-rouge">`
  because markdown-it's default fence renderer adds its own
  `<pre><code class="language-X">…</code></pre>` if `highlight` returns
  the empty string.

### 5.2. GFM admonitions

**Why a pre-render text rewrite and not a markdown-it plugin.**

The jekyll-gfm-admonitions gem patches monkey-patch the gem to defer
the admonition body's markdown render to the page-level kramdown pass
— body stays as raw markdown inside a `<div markdown='1'>` wrapper,
which kramdown then descends into. The "1+N parses become 1 combined
parse" speedup is the whole point of the patch. We get the same
speedup for free by doing the rewrite as a pre-render pass: the
admonition body is markdown text inside the source we hand markdown-it,
so markdown-it sees and parses it as part of the normal block-level
pass.

A markdown-it plugin (e.g. block parser rule) would instead recurse
synchronously inside the admonition rule's `render` callback, which is
equivalent in output but slightly more code (you have to manage the
inner `md.render()` call's heading-ID counter, link-table context,
etc.). The pre-render approach is simpler and stays mechanically
identical to the patched-gem behaviour.

**Algorithm** (port of the gem + the two patches; the regex shape
diverges slightly from the gem to support **indented admonitions**
inside list items / blockquotes):

```js
// Matches an admonition fence with optional leading indent. The gem's
// regex captures the indent into \1 and uses it as a per-line anchor
// on the body lines; we do the same so an admonition nested inside a
// list item (where the source is `  > [!NOTE]\n  > ...`) is still
// recognised. The negative lookahead `(?![ \t]*>[ \t]*\[!)` prevents
// a following admonition fence from being swallowed into the body.
const ADMONITION_RE =
  /(^|\n)([ \t]*)>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\n]*\n((?:\2[ \t]*>[ \t]*[^\n]*(?:\n|$))(?:(?![ \t]*>[ \t]*\[!)\2[ \t]*>[ \t]*[^\n]*(?:\n|$))*)?/g;

const CODE_FENCE_RE = /(?:^|\n)(?<!>)[ \t]*```[\s\S]*?```/g;

function rewriteAdmonitions(src) {
  // CRLF → LF normalisation happens up-front in renderPage(), so the
  // regexes here can assume LF-only input.

  // Step 1: stash code fences so the admonition regex doesn't reach
  // inside them. Preserves leading whitespace (gem-patch fix).
  const stashed = [];
  let work = src.replace(CODE_FENCE_RE, (match) => {
    stashed.push(match);
    const lead = match.match(/^[ \t\n]+/)?.[0] ?? "";
    return `${lead}\`\`\`{{CODE_BLOCK_${stashed.length - 1}}}\`\`\``;
  });

  // Step 2: rewrite each admonition fence. Body lines all share the
  // captured indent; strip it plus the `>` marker per gem behaviour
  // (`gsub(/^#{indent}\s*>\s*/, "")`).
  work = work.replace(ADMONITION_RE, (m, leading, indent, typeRaw, bodyRaw) => {
    const type = typeRaw.toLowerCase();
    const meta = ADMONITION_TYPES[type];
    const stripRe = indent
      ? new RegExp(`^${escapeRegExp(indent)}\\s*>\\s*`, "gm")
      : /^\s*>\s*/gm;
    const body = (bodyRaw ?? "").replace(stripRe, "").trimEnd();

    // The gem emits the replacement <div> at column 0 regardless of
    // how indented the source admonition was -- so an admonition
    // inside a list item BREAKS the list (the HTML block at column 0
    // closes any open list/blockquote context). Mirror that.
    //
    // Trailing blank line ensures any following text is parsed as a
    // SEPARATE markdown block rather than absorbed into the html_block.
    // Without it, markdown-it eats the next paragraph as raw HTML.
    return `${leading}<div class="markdown-alert markdown-alert-${type}" markdown="1">\n<p class="markdown-alert-title">${meta.icon} ${meta.title}</p>\n\n${body}\n</div>\n\n`;
  });

  // Step 3: unstash code fences.
  return work.replace(/```\{\{CODE_BLOCK_(\d+)\}\}```/g, (_, n) => stashed[Number(n)]);
}
```

**The two correctness bug-fixes the gem patch inherits:**

1. **Backslash escapes.** The unpatched gem ran the body through
   kramdown twice; `\\\\` collapsed to `\\` on the second pass.
   Because Phase 3 only runs markdown-it once on the whole document
   (the admonition body inclusive), `**\\\\**` renders as
   `<strong>\\</strong>` — what the source asks for. No special case
   needed; falls out of the architecture.

2. **Code block placeholder placement.** The unpatched gem's stash
   regex consumed leading whitespace, which made the placeholder
   collide with the preceding admonition body line; kramdown then
   rendered it as an empty `<code class="language-plaintext"></code>`.
   The patch (and §6.2's algorithm) preserves the leading whitespace
   so the placeholder lands on its own line outside the body capture.
   The Phase 3 implementation MUST follow the patched algorithm —
   regression risk is real if a code fence ends up adjacent to an
   admonition.

**Edge cases (caught by the harness in §10):**

| Input | Output |
|---|---|
| `> [!NOTE]` with no body | `<div ...><p class="markdown-alert-title">…icon… Note</p>\n\n\n</div>` — title-only, no body markdown to descend into. |
| `> [!NOTE]\n> body line` | Standard one-line body. |
| `> [!NOTE]\n> body\n>\n> more body` | Body lines joined with `\n`; the empty `>` line becomes a blank line inside the body, which makes kramdown/markdown-it treat the result as two paragraphs. Matches gem. |
| `> [!NOTE]\n> body\n\nfollowing paragraph` | Following paragraph is NOT in the body (the body capture stops at the first non-`>` line). |
| Unknown type (`> [!FOO]`) | NOT rewritten; falls through to a plain blockquote. The regex's alternation only matches the five known types. Matches gem. |
| Lowercase type (`> [!note]`) | NOT rewritten; the gem also requires uppercase. Matches gem. |
| Admonition inside a code fence (\`\`\`md \\n > [!NOTE] \\n \`\`\`) | NOT rewritten — the stash pass removes the fence before the admonition regex sees it. Matches gem. |
| Admonition immediately followed by a fence (one blank line) | Fence stays on its own line — the leading-whitespace fix preserves the `\n` between them. Matches gem's behavior AFTER the patch (which fixed a regression in the unpatched gem). |

**The five octicon SVG strings.** Copy verbatim from
`jekyll-gfm-admonitions-1.2.0/lib/jekyll-gfm-admonitions.rb`'s constant
block. They're stable across versions; pin a copy in `render.mjs` and
add a comment with the gem version + commit hash for traceability. Do
NOT regenerate or simplify — the existing CSS uses `octicon-info`,
`octicon-light-bulb`, `octicon-report`, `octicon-alert`,
`octicon-stop` selectors that depend on the exact class strings.

### 5.3. Relative link rewriting

**Algorithm** (port of `_plugins/jekyll-relative-links-patch.rb`):

Build three lookup tables at Phase 3 init:

```js
function buildLinkTables(pages) {
  // 1. By relative source path (the unpatched gem's behaviour).
  const byPath = new Map();
  // 2. By rendered URL (permalink), with both /Foo and /Foo/ forms.
  const byUrl = new Map();
  // 3. By redirect_from alias.
  const byRedirect = new Map();

  for (const p of pages) {
    // byPath: srcRel with no leading slash (already POSIX from Phase 1)
    putOnce(byPath, p.srcRel, p);

    // byUrl: permalink with leading slash stripped, plus both
    // trailing-slash and no-trailing-slash forms
    const url = p.permalink.replace(/^\//, "");
    if (url && url !== "") {
      putOnce(byUrl, url, p);
      if (url.endsWith("/")) putOnce(byUrl, url.replace(/\/$/, ""), p);
    }

    // byRedirect: redirect_from aliases (may be string or array)
    const redirects = []
      .concat(p.frontmatter.redirect_from ?? []);
    for (const r of redirects) {
      const key = String(r).replace(/^\//, "").replace(/\/$/, "");
      if (key) putOnce(byRedirect, key, p);
    }
  }

  return { byPath, byUrl, byRedirect };
}

function putOnce(map, key, value) {
  if (!map.has(key)) map.set(key, value);
}
```

`putOnce` is the JS equivalent of the Ruby `h[key] = p unless h.key?(key)`
first-wins idiom. Order matches the iteration order of `pages[]` —
which Phase 1 sorts by `srcRel` — so the resolution is deterministic.

**Lookup** (called from the relative-links markdown-it plugin):

```js
function resolveLink(href, fromPage, tables, baseurl = "") {
  // Decode percent-encoded path so `My%20Page.md` matches `My Page.md`.
  const path = decodeURIComponent(href);

  // Try byPath first (file-system-style references — author intent
  // is "this specific file"); then byUrl (permalink); then byRedirect
  // (historical aliases). Strip trailing slash for the latter two
  // because folder-style index pages have permalinks ending in `/`
  // but author markdown often drops it.
  const trimmed = path.replace(/\/$/, "");
  const target = tables.byPath.get(path)
              ?? tables.byUrl.get(trimmed)
              ?? tables.byRedirect.get(trimmed);

  return target ? `${baseurl}${target.permalink}` : null;
}
```

**Why `byPath` is keyed on the unprefixed `srcRel`.** Author markdown
links look like `[X](Y.md)` (sibling) or `[X](../OtherMod/Y.md)`
(cousin). The link's `href` is a relative path, not absolute. The
markdown-it plugin resolves it against the from-page's location
before consulting the tables, and **also handles root-absolute hrefs**
(jekyll-relative-links runs them through the same table lookup, which
matters when the target is a folder-style page whose canonical URL
ends in `/` -- the rewriter swaps a missing trailing slash in for the
canonical form):

```js
function relativeLinksPlugin(md, ctx) {
  md.core.ruler.push("relative-links", (state) => {
    const fromPage = state.env.page;
    if (!fromPage) return;
    walkTokens(state.tokens, (token) => {
      // Same handler covers both `<a href>` and `<img src>`.
      let attrName;
      if (token.type === "link_open") attrName = "href";
      else if (token.type === "image") attrName = "src";
      else return;

      const idx = token.attrIndex(attrName);
      if (idx < 0) return;
      const value = token.attrs[idx][1];
      // External / fragment / protocol-relative -- out of scope.
      if (/^([a-z][a-z0-9+.\-]*:|#|\/\/)/i.test(value)) return;

      const [pathPart, fragPart] = splitFragment(value);
      let resolved;
      if (value.startsWith("/")) {
        // Root-absolute href: jekyll-relative-links still resolves it
        // against the tables (picks up the canonical permalink with
        // any trailing slash for folder-style index pages).
        resolved = pathPart.replace(/^\//, "");
      } else {
        // Relative href: resolve against the from-page's source dir.
        // Returns null when the `..` chain would escape the docs
        // root -- mirroring jekyll-relative-links's behaviour of
        // leaving those links unrewritten because File.expand_path
        // produces a path outside Dir.pwd that no table key matches.
        const fromDir = fromPage.srcRel.replace(/[^/]+$/, "");
        resolved = resolveBelowRoot(fromDir, pathPart);
        if (resolved === null) return;
      }
      const newValue = resolveAsset(resolved, ctx)
                    ?? resolveLink(resolved, ctx.linkTables, ctx.baseurl);
      if (newValue) {
        token.attrs[idx][1] = fragPart ? `${newValue}#${fragPart}` : newValue;
      }
    });
  });
}

// Companion to resolveLink: looks the resolved path up against the
// set of POSIX-separated staticFiles paths Phase 1 stashed. The
// resolved path may have been URL-encoded earlier (by the source-
// rewrite that handles unescaped spaces in `![X](a b.png)`), so we
// decode before the lookup, then return the original (encoded) form
// prefixed with baseurl so the rendered href stays URL-safe.
function resolveAsset(resolved, ctx) {
  if (!ctx.staticFiles) return null;
  let key = resolved;
  try { key = decodeURIComponent(resolved); } catch {}
  if (ctx.staticFiles.has(key)) {
    return `${ctx.baseurl}/${resolved}`;
  }
  return null;
}
```

`resolveBelowRoot` does the standard `./`, `../`, double-slash
collapse and returns `null` when `..` would pop past the docs root --
needed because `File.expand_path` in the Jekyll source resolves to an
absolute path under Dir.pwd, and a link that escapes Dir.pwd misses
every table key (so the gem leaves it unrewritten).

**`fromPage` is plumbed through `state.env`** — markdown-it lets the
caller pass an `env` object into `md.render(src, env)` that flows
through to every plugin's `state.env`. The render loop sets
`env = { page }` per call.

**Reference-style links** (`[X][ref]` + `[ref]: url`) and
**autolinks** (`<https://…>`) are NOT rewritten — they don't go
through `link_open` tokens with relative paths in the same way, and
this site uses inline links exclusively. If a future content
convention introduces reference-style relative links, extend the
plugin to handle the `link_open`-with-resolved-href path.

**Match against fragment:** the relative-link plugin only rewrites the
path portion; the fragment passes through unchanged. So
`[X](Y.md#section)` becomes `[X](/perm-of-Y#section)`. Matches the
gem.

### 5.4. Definition lists

`markdown-it-deflist` plugin, no configuration needed. Renders:

```md
term
: definition
```

as:

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
```

The current site uses definition lists pervasively for parameter
descriptions (WIP.md "Parameter lists use the kramdown `term` +
`: definition` indentation pattern"). The plugin output matches
kramdown's modulo whitespace.

**Edge case:** kramdown wraps multi-paragraph `<dd>` content in an
inner `<p>`. Markdown-it-deflist does the same when the definition is
separated from the term by a blank line:

```md
term

: definition para 1

  definition para 2
```

→ `<dt>term</dt><dd><p>definition para 1</p><p>definition para 2</p></dd>`

When there's no blank line:

```md
term
: just one line
```

→ `<dt>term</dt><dd>just one line</dd>` — no inner `<p>`.

Verified against `docs/_site/tB/Core/Const.html` (single-line `<dd>`)
and the same file's blocks where a blank line separated term from
definition (wrapped in `<p>`). markdown-it-deflist matches.

### 5.5. Footnotes

`markdown-it-footnote` plugin. Currently used on ~5 pages
(`Features/index.md`, `Features/Language/Generics.md`,
`Features/Packages/index.md`, etc.) with `[^1]` reference + `[^1]: …`
definition.

Default markdown-it-footnote output uses `<sup class="footnote-ref">`
and a `<section class="footnotes">` block. Kramdown emits a slightly
different shape (verified against
`docs/_site/Features/index.html`):

```html
<sup id="fnref:1"><a href="#fn:1" class="footnote" rel="footnote" role="doc-noteref">1</a></sup>
…
<div class="footnotes" role="doc-endnotes">
  <ol>
    <li id="fn:1" role="doc-endnote">
      <p>A service of TWINBASIC LTD … <a href="#fnref:1" class="reversefootnote" role="doc-backlink">&#8617;</a></p>
    </li>
  </ol>
</div>
```

The plugin's default output differs in:

- The `id` attribute uses `fnref-1` (hyphen) where kramdown uses
  `fnref:1` (colon).
- The class on the back-link `↩` is `footnote-backref` where kramdown
  uses `reversefootnote`.
- The outer container is `<section class="footnotes">` where kramdown
  emits `<div class="footnotes">`.

**Patch** (~20 lines, register custom rendering rules):

```js
function configureFootnotes(md) {
  // Override the footnote ref rendering to emit fnref:N (colon, not
  // hyphen) and the kramdown class string.
  md.renderer.rules.footnote_ref = (tokens, idx) => {
    const id = tokens[idx].meta.id;
    const n  = Number(id) + 1;
    return `<sup id="fnref:${n}"><a href="#fn:${n}" class="footnote" rel="footnote" role="doc-noteref">${n}</a></sup>`;
  };

  md.renderer.rules.footnote_anchor = (tokens, idx) => {
    const id = tokens[idx].meta.id;
    const n  = Number(id) + 1;
    return ` <a href="#fnref:${n}" class="reversefootnote" role="doc-backlink">↩</a>`;
  };

  md.renderer.rules.footnote_open = (tokens, idx) => {
    const id = tokens[idx].meta.id;
    const n  = Number(id) + 1;
    return `<li id="fn:${n}" role="doc-endnote">\n`;
  };

  md.renderer.rules.footnote_block_open = () =>
    `<div class="footnotes" role="doc-endnotes">\n<ol>\n`;

  md.renderer.rules.footnote_block_close = () => `</ol>\n</div>\n`;
}
```

**Note** the footnote ID indexing: markdown-it-footnote uses zero-based
internal IDs while kramdown displays one-based. The `+1` in each rule
matches the rendered `1`, `2`, etc.

**Edge case: named footnotes** (`[^foo]`). kramdown supports
non-numeric labels, but the site doesn't use any — all footnotes are
numeric. The override above assumes numeric. If a future page
introduces named footnotes, the override needs to preserve the
original label string instead of converting to a number.

### 5.6. Header IDs

Kramdown's GFM parser (`kramdown-parser-gfm`) generates `id="…"` via
`generate_gfm_header_id`:

1. Lowercase.
2. Drop every character that's NOT a Unicode word char (`\p{L}` /
   `\p{N}` / `\p{M}` / `\p{Pc}`), a hyphen, or a space.
3. Replace each space with `-`.
4. If the slug is empty (heading text was all stripped), fall back
   to `section`.
5. Disambiguate duplicates by appending `-1`, `-2`, …

**Notable differences from older kramdown / the assumption in earlier
drafts of this spec:**

- The slugger does NOT collapse runs of `-` and does NOT strip
  leading/trailing `-`. Emoji and most punctuation drop out; the
  surrounding spaces still become hyphens, which is why a heading like
  "🎮 X" emits `id="-x"` (leading dash).
- Unicode letters ARE preserved. A heading "À" produces `id="à"`.

**Verified against rendered output**: `## Why CEF instead of WebView2?`
→ `id="why-cef-instead-of-webview2"` (question mark stripped, the two
spaces around it become hyphens, and the run-of-hyphens are NOT
collapsed -- but `?` between `WebView2` and the trailing space drops
to no character at all, so the run is just one hyphen).

**Custom plugin** (don't use `markdown-it-anchor` -- its slug
algorithm differs in three ways from kramdown's; the patch surface
would be larger than just writing the plugin):

```js
function headerIdPlugin(md) {
  md.core.ruler.push("header-id", (state) => {
    const used = new Map();   // slug → next-suffix counter
    let openHeading = null;
    for (const t of state.tokens) {
      if (t.type === "heading_open") openHeading = t;
      else if (t.type === "heading_close") openHeading = null;
      else if (openHeading && t.type === "inline") {
        // markdown-it-attrs may have already set id via `{: #foo }`.
        if (openHeading.attrGet("id")) continue;
        const text = headingText(t.children);
        const base = kramdownSlug(text);
        openHeading.attrSet("id", uniqueSlug(base, used));
      }
    }
  });
}

function headingText(children) {
  // Concatenate visible text from text + code_inline children; skip
  // markup wrappers (em, strong, link openers) -- matches kramdown's
  // `output_text(heading)`.
  let out = "";
  for (const c of children) {
    if (c.type === "text" || c.type === "code_inline") out += c.content;
  }
  return out;
}

const GFM_HEADER_CHAR_RE = /[\p{L}\p{N}\p{M}\p{Pc}\- ]/u;

export function kramdownSlug(text) {
  const lower = text.toLowerCase();
  const filtered = [...lower].filter((c) => GFM_HEADER_CHAR_RE.test(c)).join("");
  return filtered.replaceAll(" ", "-") || "section";
}

function uniqueSlug(base, used) {
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}
```

**Why not use `markdown-it-anchor`:**

- Its default `slugify` is `string.toLowerCase().trim().replace(/\s+/g, '-')`,
  which keeps `?` and other punctuation — `?` stays in the slug, kramdown
  strips it. We could pass a custom `slugify` but then most of the plugin's
  value (default ID generation) is unused; might as well write the 15
  lines ourselves.
- Its disambiguation suffix is `-2`, `-3`, … (skipping `-1`); kramdown
  uses `-1`, `-2`, … (no skip). Mismatch.
- Its anchor injection (the `permalink` option) duplicates Phase 4's
  anchor-injection pass. We don't want it doing either job.

**Interaction with `markdown-it-attrs`:** if a heading carries an
explicit `{: #foo }` attribute, the attrs plugin sets `id="foo"` first.
The `if (inHeading.attrGet("id")) continue;` guard preserves it. Used
by 3 pages on the current site (`IDE/Project Explorer.md`).

**Slugification edge cases:**

| Source heading | Slug |
|---|---|
| `# Const` | `const` |
| `## Why CEF instead of WebView2?` | `why-cef-instead-of-webview2` (no `?`; verified) |
| `### Example` (2 occurrences in a page) | First: `example`. Second: `example-1`. |
| `## & operator` | `-operator` (slug starts with `-` after stripping non-alnum, then stripped) → `operator` |
| `## ` (empty) | `section` (the fallback) — currently no page hits this. |
| `## §` (Greek/symbol only) | `section` (no ASCII alnum survives the strip) — currently no page hits this. |
| `## API (v1)` | `api-v1` (parens collapse to `-`, trailing strip). |
| `## file.ext` | `file-ext` (dot collapsed to `-`). |

### 5.7. Attribute syntax `{: …}`

`markdown-it-attrs` plugin. Handles:

```md
{: .class }       — sets class
{: #id }          — sets id
{: width="100" }  — sets arbitrary attribute
```

Applied to the **preceding block** if `{: }` is on its own line
following the block, or to the **same line's element** if `{: }` is
inline.

**Three patterns this site actually uses** (grepped exhaustively):

1. **`{: .no_toc }`** — sets `class="no_toc"` on the preceding heading
   or paragraph. Used on every Reference page after the H1 to keep the
   page intro out of the auto-TOC. Used inside the description paragraph
   pattern too (e.g. `# Const\n\n{: .no_toc }\n\nDeclares…` → the
   paragraph gets `class="no_toc"`).

2. **`{:width="X" height="Y"}` / `{:style="…"}`** — sets attributes on
   the preceding `<img>`. Used by 7 image references on
   `Features/Fusion.md` and `Features/Packages/Creating a TWINPACK
   package.md`.

3. **`{: #anchor }`** — sets explicit id on the preceding heading.
   Used by 3 headings in `IDE/Project Explorer.md`.

**Configuration:**

```js
md.use(attrs, {
  allowedAttributes: [],   // empty = allow all
  leftDelimiter: "{:",
  rightDelimiter: "}",
});
```

**Important: kramdown's syntax is `{: …}` with a colon after `{`; the
markdown-it-attrs default is `{…}` without colon.** We MUST override
both delimiters to match kramdown. The colon prevents accidental
matches on `{{ liquid }}` (no liquid here, but the colon is the
documented kramdown form and matches every source-side use of the
syntax on this site).

**Two-space-leading hazard:** markdown-it-attrs is forgiving about
whitespace inside `{: }`. Both `{: .no_toc }` and `{:.no_toc}` work.
Source on this site uses the spaced form; output is the same.

### 5.8. Auto-TOC `{:toc}`

Kramdown's `* TOC\n{:toc}` pattern: emits a `<ul id="markdown-toc">`
with a nested-list TOC of every H2+ heading on the page, with each
link pointing at the heading's auto-generated `id` and carrying its
own `id="markdown-toc-<slug>"`. Headings with `class="no_toc"` are
EXCLUDED.

**Used on 106 pages.** No off-the-shelf markdown-it plugin produces
exactly kramdown's output. Custom plugin needed.

**Algorithm:**

1. In a `core` ruler step (after `header-id` so heading IDs are
   already assigned), collect **every** qualifying heading on the
   page (h2..h6 with an id and without `class="no_toc"`). Kramdown's
   TOC includes headings appearing BEFORE the `{:toc}` marker as well
   as after it, so the collection ranges over the whole token stream.
   For each heading record `{ level, id, html }` where `html` is the
   inline-rendered link text (see "Heading inline markup" below).
2. Scan for the marker pattern: a `bullet_list_open` carrying the
   `toc` attribute (markdown-it-attrs intercepts `{:toc}` and applies
   it as an attribute on the surrounding bullet list). The marker
   spans seven tokens (`bullet_list_open` → `list_item_open` →
   `paragraph_open` → `inline "TOC"` → `paragraph_close` →
   `list_item_close` → `bullet_list_close`).
3. Replace the marker token range with a single `html_block` token
   whose `content` is the rendered `<ul id="markdown-toc">…</ul>`
   string.

**Heading inline markup.** kramdown's TOC keeps inline markup
(`<code>`, `<em>`, `<strong>`) inside each `<li>` link, not just the
plain text. The collector renders a minimal subset of inline tokens
to HTML:

```js
function headingTocHtml(children) {
  let out = "";
  for (const c of children) {
    if (c.type === "text") out += escapeHtml(c.content);
    else if (c.type === "code_inline") {
      out += `<code class="language-plaintext highlighter-rouge">${escapeHtmlMinimal(c.content)}</code>`;
    } else if (c.type === "strong_open") out += "<strong>";
    else if (c.type === "strong_close") out += "</strong>";
    else if (c.type === "em_open") out += "<em>";
    else if (c.type === "em_close") out += "</em>";
    else if (c.type === "softbreak" || c.type === "hardbreak") out += " ";
  }
  return out;
}
```

Other inline tokens (links, images, html_inline) fall back to their
visible text content -- matches kramdown's behaviour of dropping link
targets from the TOC label.

**Template output** (verified against
`docs/_site/tB/Packages/CEF/index.html`):

```html
<ul id="markdown-toc">
  <li><a href="#slug" id="markdown-toc-slug">Heading Text</a>
    <ul>
      <li><a href="#sub-slug" id="markdown-toc-sub-slug">Sub Heading</a></li>
    </ul>
  </li>
  …
</ul>
```

**Rendering strategy.** The flat heading list is first folded into a
TocNode tree (children pushed under their parent based on level), then
the tree is walked recursively to emit indented HTML. Each leaf is
`<li>...</li>` on its own line; each parent is split across three
lines (open-tag, nested `<ul>`, close-tag). The exact indentation
matters because the html-compress pass collapses whitespace to single
spaces -- mismatches in where the newlines fall produce 1-byte diffs.

Nesting is by heading level: a deeper heading opens a child `<ul>`,
a same-or-shallower heading closes the current one. Standard nested
TOC algorithm.

**Edge cases:**

| Case | Handling |
|---|---|
| `{:toc}` on a page with no H2+ headings | Emit an empty `<ul id="markdown-toc"></ul>`. Matches kramdown. |
| Two `{:toc}` markers on one page | Each gets its own TOC (built from the same shared heading collection). |
| Heading levels skip (h2 → h4 with no h3) | h4 indents under h2 directly (level-based recursion). |
| Heading with explicit id (`## Foo {: #bar }`) | TOC links to `#bar`, label is `Foo`. |
| Heading inside an admonition body | Picked up just like any other heading -- the admonition's `<div markdown="1">…</div>` lets markdown-it descend, and the inner heading produces normal `<h2>` tokens. |
| Heading text containing inline markdown (e.g. `## ** *Foo* **`) | TOC link preserves the inline markup -- `<strong>`, `<em>`, and `<code>` wrappers all survive into the TOC entry. |
| Heading with `class="no_toc"` (set via `{: .no_toc }`) | Excluded from the TOC. |
| Heading BEFORE the `{:toc}` marker | Included. kramdown's TOC is page-wide, not "everything after the marker." |

### 5.9. Smart quotes / typographer

markdown-it's `typographer: true` enables:

- `(c)` → `©`, `(r)` → `®`, `(tm)` → `™`
- `+-` → `±`
- `...` → `…`
- `--` → `–` (en-dash)
- `---` → `—` (em-dash)
- `??!`/`!??`-style triple punctuation collapse
- ASCII quote replacement via the `quotes` option

**Kramdown's smart-quote behaviour:**

- `--` → `–` (en-dash) ✓ matches
- `---` → `—` (em-dash) ✓ matches
- `<<` → `«` (left guillemet) -- kramdown does, markdown-it does NOT
- `>>` → `»` (right guillemet) -- kramdown does, markdown-it does NOT
- `...` → `…` ✓ matches
- `(c)`/`(r)`/`(tm)` → entity ✓ matches (note: `(p)` → `§` is
  markdown-it-only and doesn't fire on this corpus)
- ASCII `"` → typographic curly (`“`/`”`) ✓ matches
- ASCII `'` → typographic curly (`‘`/`’`) -- markdown-it requires
  word chars on both sides; kramdown is looser (also fires after
  punctuation like `</em>'s`). Custom plugin patches this.
- `+-` → `±` ✗ kramdown DOES NOT do this
- Triple-punctuation collapse ✗ kramdown DOES NOT do this

The `--`/`---` → en/em-dash conversion is the most important one
(used pervasively across the site for sentence breaks per the WIP.md
"Source dashes" convention). markdown-it's typographer only converts
when both sides are non-whitespace (so `word--word` → `word–word`,
but `word -- word` is left alone); kramdown converts unconditionally.
The custom `kramdownDashesPlugin` does a post-`replacements` sweep
over `text` tokens and replaces every remaining `---` / `--`.

The same plugin also converts `<<` → `«` and `>>` → `»` (kramdown's
smart_quotes does these; markdown-it doesn't), and `</em>'s` →
`</em>’s` (the possessive-after-punctuation case).

The two extras (`+-` and triple-punctuation) are unlikely to fire on
the current corpus -- `+-` is grepped to confirm zero occurrences in
body prose, and `(R)` occurs once in `Reference/Glossary.md` where
the source has been backslash-escaped (`\(R\)`) so both renderers
leave it alone. If a future page introduces either pattern, the
verification harness will flag the divergence.

**Quotes configuration:**

```js
new MarkdownIt({
  typographer: true,
  quotes: '“”‘’',
  // “ ” ‘ ’ — markdown-it's default. Matches kramdown's default
  // smart_quotes setting (lsquo, rsquo, ldquo, rdquo).
});
```

**Verification cue:** the homepage has 33 em-dashes after kramdown
renders `---`. Phase 3's output must match the same count.

### 5.10. Fenced code highlighting

`highlight.mjs` owns this end-to-end.

**Stack:**

- **Shiki** loads the TextMate grammar at
  `builder/twinbasic.tmLanguage.json` and tokenises code blocks.
- A custom **scope-to-class** mapper converts TextMate scopes
  (`keyword.control.tb`, `string.quoted.double.tb`, etc.) to Rouge
  class names (`k`, `s`, etc.) so the existing
  `assets/css/rouge.css` keeps working byte-for-byte.
- A **wrapper-div emitter** wraps the resulting `<span>`-sequenced
  code in the three nested divs Rouge produces:
  `<div class="language-<lang> highlighter-rouge"><div class="highlight"><pre class="highlight"><code>…spans…</code></pre></div></div>`.

**Why Shiki, not Prism / highlight.js / a hand-rolled lexer:**

- Shiki uses TextMate grammars, which are the most expressive format
  for a VB-style multi-state lexer (Rouge has 9 states for tB —
  root / whitespace / bol / string / attribute / attrargs / dim /
  funcname / typename / typename_ext / namespace / dotted / end).
  Prism's regex-array format would force collapsing those states or
  splitting the grammar across multiple definitions.
- Shiki ships its own WASM-based regex engine that handles arbitrary
  PCRE; markdown-it can call `codeToHtml(code, { lang: "tb" })`
  synchronously.
- A Prism/highlight.js port of the Rouge lexer would still need ~600
  lines of regex; TextMate gets us the same expressiveness with a
  well-understood format and editor support.

**Why scope-to-class instead of Shiki's inline-style output:**

- Shiki's default output is `<span style="color:#xxx">…</span>` — it
  bakes the theme colors into each span. To keep using the existing
  `rouge.css` (which colors via `.highlight .k { color: … }` etc.) we
  need the class form.
- A "drop rouge.css, embrace Shiki themes" alternative would change
  the rendered HTML and require Phase 4 / asset-extraction work to
  package a new CSS. Out of scope for the port; flagged as a future
  enhancement.

**Configuration:**

```js
import { createHighlighter } from "shiki";

// TextMate scope prefix -> Rouge class. The map is language-agnostic
// (no trailing `.tb` / `.js` / `.c`) so the same map handles every
// grammar Shiki loads. Order matters: more-specific prefixes must
// precede their parents.
const SCOPE_TO_ROUGE_CLASS = [
  ["punctuation.line-continuation",          "lc"],
  ["constant.language.boolean",              "lb"],
  ["constant.language.empty",                "le"],
  ["constant.language.nothing",              "ln"],
  ["constant.language.null",                 "lu"],
  ["constant.numeric.float",                 "mf"],
  ["constant.numeric.integer",               "mi"],
  ["constant.numeric",                       "m"],
  ["constant.other.date",                    "ld"],
  ["comment.line",                           "c1"],
  ["comment.block.preprocessor",             "cp"],
  ["comment.block",                          "cm"],
  ["meta.preprocessor",                      "cp"],
  ["keyword.declaration",                    "kd"],
  ["keyword.operator.word",                  "ow"],
  ["keyword.operator",                       "o"],
  ["keyword.control",                        "k"],
  ["keyword",                                "k"],
  ["storage.type",                           "kt"],
  ["entity.name.function",                   "nf"],
  ["entity.name.type",                       "nc"],
  ["entity.name.namespace",                  "nn"],
  ["entity.other.attribute-name",            "na"],
  ["entity.name.tag",                        "nt"],
  ["variable",                               "nv"],   // see remap below
  ["support.function",                       "nb"],
  ["punctuation",                            "p"],
  ["meta.brace",                             "p"],
  ["string.escape",                          "se"],
  ["string.quoted.double",                   "s"],
  ["entity.name",                            "n"],
  ["invalid.illegal",                        "err"],
];

// Languages we tokenise alongside the bundled tB grammar.
const TB_ALIASES = new Set(["tb", "twinbasic", "vb", "vba"]);
const SHIKI_BUNDLED_LANGS = ["js", "json", "ruby", "html", "yaml",
                             "xml", "sql", "sh", "cpp", "c", "liquid"];

let cached = null;

export async function initHighlighter() {
  if (cached) return cached;
  let shiki = null;
  try {
    const grammarUrl = new URL("./twinbasic.tmLanguage.json", import.meta.url);
    const grammarText = await fs.readFile(grammarUrl, "utf8");
    const tbGrammar = JSON.parse(grammarText);
    shiki = await createHighlighter({
      themes: [],
      langs: [tbGrammar, ...SHIKI_BUNDLED_LANGS],
    });
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  cached = { render: (code, lang) => renderCodeBlock(shiki, code, lang) };
  return cached;
}
```

**Scope resolution: inner-most wins, with a `definition` skip.** A
TextMate token's scope chain is ordered outer (least specific) → inner
(most specific). For each token, walk the chain inner → outer and pick
the first scope whose prefix is mapped:

```js
function bestRougeClass(scopes) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    // `punctuation.definition.*` (and `meta.definition.*`) are
    // TextMate-style structural markers a grammar attaches to begin
    // /end of a container scope (comment / string). Rouge tokenises
    // the whole container as ONE token, so when an outer scope in the
    // chain IS a container (comment/string), skip the marker and let
    // the parent's class apply. Markers on captures / parameter
    // brackets (no container parent) still resolve via `punctuation`
    // to "p", which matches Rouge.
    if (DEFINITION_MARKER_RE.test(scope) && hasContainerParent(scopes, i)) continue;
    for (const [tmScope, cls] of SCOPE_TO_ROUGE_CLASS) {
      if (scope === tmScope || scope.startsWith(tmScope + ".")) return cls;
    }
  }
  return null;
}

const DEFINITION_MARKER_RE = /(^|\.)definition\./;
const CONTAINER_TOP_LEVEL = new Set(["comment", "string"]);
function hasContainerParent(scopes, fromIdx) {
  for (let j = fromIdx - 1; j >= 0; j--) {
    const top = scopes[j].split(".")[0];
    if (CONTAINER_TOP_LEVEL.has(top)) return true;
  }
  return false;
}
```

The earlier draft of this spec specified outer → inner traversal,
which is correct for `comment.block + punctuation.definition.comment.begin`
(outer wins, the whole comment becomes one `<span class="cm">`). But
that ordering breaks `string.quoted.double + string.escape` -- Rouge
emits THREE spans (`s` / `se` / `s`) and we want inner-most `string.escape`
to win. The inner-first walk plus the `definition` skip handles both:
the inner `string.escape` is not a `.definition.` marker so it wins;
the inner `punctuation.definition.comment.begin` IS a `.definition.`
marker AND has a container parent so it falls through to `comment.block`.

**Non-tB language remap.** Rouge's JS / Ruby / Python / C / etc.
lexers tag identifiers as `Name::Other` (class `nx`) rather than
`Name::Variable` (class `nv`); tB alone uses Name::Variable for
`Dim X`-style declarations. The renderer applies a one-line remap:

```js
if (!isTb && cls === "nv") cls = "nx";
```

**Identifier fallback for non-tB grammars.** Shiki's bundled grammars
often leave a stray identifier with no inner scope (just `source.<lang>`)
when the lexer doesn't recognise it. Rouge tags those as `Name` (class
`n`). When `bestRougeClass` returns null, the renderer splits leading
/ trailing whitespace and emits the word inside its own `<n>` span:

```js
if (cls === null) {
  const m = ex.content.match(/^(\s*)([A-Za-z_]\w*)(\s*)$/);
  if (m) {
    if (m[1]) append(null, escapeHtml(m[1]));
    append("n", escapeHtml(m[2]));
    if (m[3]) append(null, escapeHtml(m[3]));
    continue;
  }
}
```

**Wrapper emission and `renderRougeStyleSpans`** coalesce adjacent
runs of the same Rouge class into ONE span and handle deferred
inter-line newlines so multi-line block comments (`/* ... */`) come
out as one `<span class="cm">…\n…</span>` matching Rouge's
`Comment::Multiline`. Single-line classes flush on the newline. The
tB line-continuation token (`_\n`) intentionally includes the
trailing newline INSIDE the `<span class="lc">` per Rouge's behaviour.

```js
function renderCodeBlock(shiki, code, lang) {
  const lower = (lang || "").toLowerCase();
  const isTb = TB_ALIASES.has(lower);
  const wrapperLang = isTb ? "tb" : (lang || "plaintext");
  let shikiLang = null;
  if (shiki) {
    if (isTb) shikiLang = "tb";
    else if (shiki.getLoadedLanguages().includes(lower)) shikiLang = lower;
  }
  const codeBody = code.endsWith("\n") ? code : code + "\n";

  let tokenizedHtml;
  if (shikiLang) {
    const lines = shiki.codeToTokensBase(codeBody, {
      lang: shikiLang,
      includeExplanation: true,  // per-segment scope chain
    });
    tokenizedHtml = renderRougeStyleSpans(lines, isTb);
  } else {
    tokenizedHtml = escapeHtml(codeBody);
  }
  return `<div class="language-${wrapperLang} highlighter-rouge"><div class="highlight"><pre class="highlight"><code>${tokenizedHtml}</code></pre></div></div>`;
}
```

**Nested fence whitespace.** Kramdown inserts a newline between the
inner `</div>` and the outer `</div>` of the wrapper when the fence
is inside an indented context (list item, admonition body, etc.) --
the html-compress pass then renders that as a single space. The
renderer override in `render.mjs` adds the newline when the fence
token's `level > 0`:

```js
md.renderer.rules.fence = (tokens, idx, options) => {
  const tok = tokens[idx];
  const lang = tok.info ? tok.info.trim().split(/\s+/)[0] : "";
  const html = options.highlight(tok.content, lang);
  if (tok.level > 0) {
    return html.replace(/<\/div><\/div>$/, "</div>\n</div>") + "\n";
  }
  return html + "\n";
};
```

A top-level fence emits `</div></div>` (no newline) matching Rouge;
a nested fence emits `</div>\n</div>` which the compress pass
collapses to `</div> </div>` -- matching kramdown's indented-fence
output.

**Indented code blocks** (4-space indentation, no language info)
get the same `<div class="language-plaintext highlighter-rouge">…`
wrapper via a `code_block` renderer override; markdown-it's default
emits a bare `<pre><code>`.

**Trailing-newline handling.** Rouge's HTML formatter adds a `\n`
after the last token line inside `<code>`, so the rendered shape is
`<code><span>…</span>\n<span>…</span>\n</code>`. `renderRougeStyleSpans`
joins with `\n` and the `codeBody = code.endsWith("\n") ? code : code + "\n"`
guarantees the trailing newline before `</code>` exists. Verified by
diffing `tB/Core/Const.html`'s `<code>` body bytes against Rouge's
output.

### 5.11. Tables

GFM tables are enabled by markdown-it's default rules. No plugin
needed. Verified against `Reference/Operators.md`'s alignment-bearing
table — markdown-it emits `style="text-align: left"` (or right /
center) inline on each `<th>`/`<td>` when the source uses `:---` /
`---:` / `:---:` alignment markers. Matches kramdown's output.

**One difference to watch:** kramdown emits `<table>` with no `class`
attribute. markdown-it does the same. Both produce identical structure
modulo whitespace.

### 5.12. Block-HTML recursion (`<div markdown="1">`)

Kramdown's `parse_block_html: true` plus `markdown='1'` on a block
HTML element makes kramdown descend into the element's body and parse
it as markdown. markdown-it's `html: true` already does most of this
job: a `<div ...>...</div>` wrapper whose body is separated from the
open / close tags by blank lines IS already parsed as markdown by
markdown-it (the blank line ends the html_block and re-enters block
parsing). The admonition rewrite (§5.2) emits its body bracketed by
blank lines for exactly this reason. With the body parsed via
markdown-it's own block parser, no recursive `md.parse(body)` call is
needed -- the only remaining job is to strip the `markdown="1"`
attribute so the rendered HTML doesn't carry the kramdown sentinel:

```js
function blockHtmlRecursionPlugin(md) {
  md.core.ruler.push("strip-markdown-attr", (state) => {
    for (const t of state.tokens) {
      if (t.type !== "html_block") continue;
      t.content = t.content.replace(/\s+markdown=(["'])1\1/g, "");
    }
  });

  // kramdown wraps a STANDALONE inline HTML element (e.g. a lone
  // <br />, <img ...>) in a <p>; markdown-it doesn't, because it
  // detects them as block HTML and passes them through verbatim.
  // Detect that shape (an html_block whose content is exactly one
  // self-closing inline tag), and wrap its content in <p>...</p>.
  md.core.ruler.push("wrap-standalone-inline-html", (state) => {
    for (const t of state.tokens) {
      if (t.type !== "html_block") continue;
      const trimmed = t.content.trim();
      if (/^<(br|hr|img)\b[^>]*\/?>$/i.test(trimmed)) {
        t.content = `<p>${trimmed}</p>\n`;
      }
    }
  });
}
```

**Why no recursive `md.parse()` call.** An earlier version of this
plugin DID call `md.parse(body, state.env)` recursively when it saw a
`markdown="1"` wrapper. That worked but produced subtle mismatches at
the boundaries (extra blank lines around the inner content, footnote
re-numbering, etc.). The admonition rewrite was then updated to emit
blank lines around the body, which is enough for markdown-it's normal
block-HTML handling to descend without a recursive parse. The strip-
attribute pass is the only piece that remained.

**Edge cases:**

| Case | Handling |
|---|---|
| Nested `<div markdown="1">` inside another | Both blank-line-bracketed; markdown-it parses each level natively. |
| `<div markdown="1">` with no body | Empty body parses to empty content; the strip pass removes the attribute. |
| `<div>` without `markdown="1"` | NOT descended into -- matches kramdown without the attribute. |
| Inline markdown attribute on a span (`<span markdown="1">`) | Unhandled. No source page on this site uses span-level `markdown=1`. |

---

## 6. Shared helpers

### 6.1. `kramdownSlug(text)`

See §5.6. ~10 lines.

### 6.2. `escapeHtml(s)`

Standard 5-character HTML escape:

```js
const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}
```

### 6.3. `normalizePosixPath(p)`

```js
function normalizePosixPath(p) {
  const parts = p.split("/");
  const out = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") { out.pop(); continue; }
    out.push(part);
  }
  return out.join("/");
}
```

Trailing-slash detection (whether the result should keep a trailing
slash) handled by the caller.

### 6.4. `walkTokens(tokens, fn)`

Recursive walker for markdown-it's token tree — children at every
inline token need fn applied too. ~10 lines:

```js
function walkTokens(tokens, fn) {
  for (const t of tokens) {
    fn(t);
    if (t.children) walkTokens(t.children, fn);
  }
}
```

---

## 7. The twinBASIC TextMate grammar

`builder/twinbasic.tmLanguage.json` is the largest non-trivial
artifact in Phase 3. It's a port of `_plugins/twinbasic.rb`'s Rouge
state machine into TextMate's regex-with-named-scopes format.

### 7.1. Source mapping

The Rouge lexer has 12 states. Each becomes a `repository` entry in
TextMate, and the equivalent of Rouge's `mixin :whitespace` is a
TextMate `include: "#whitespace"` pattern.

| Rouge state | TextMate repository key | Notes |
|---|---|---|
| `whitespace` | `#whitespace` | Comments, line-continuation, blank space, REM-comments. |
| `bol` | (folded into whitespace) | TextMate doesn't need a beginning-of-line state per se. |
| `root` | `patterns:` (top-level) | The main pattern stack. |
| `dotted` | `#dotted` | Name after `.` operator. |
| `string` | `#string` | Body of `"…"` strings. |
| `attribute` | `#attribute` | Body of `[…]` attribute brackets. |
| `attrargs` | `#attribute-args` | Body of `[Foo(…)]` argument parens. |
| `dim` | `#dim` | Variable name after `Dim`/`Const`/`ReDim`. |
| `funcname` | `#funcname` | Name after `Function`/`Sub`/`Property`. |
| `typename` | `#typename` | Name after type keywords. |
| `typename_ext` | `#typename-ext` | `Extends`/`As` continuation after a typename. |
| `namespace` | `#namespace` | Dotted name after `Module`/`Namespace`/`Imports`. |
| `end` | `#end` | Token following `End` (Sub/Function/…). |

### 7.2. Scope names

Use the TextMate convention: dot-separated, language-suffixed. The
SCOPE_TO_ROUGE_CLASS map in §5.10 spells out the exact scope strings
the grammar should emit so the JS mapper can pick a Rouge class. Key
ones:

| Rouge token | TextMate scope |
|---|---|
| Keyword | `keyword.control.tb` |
| Keyword.Type | `storage.type.tb` |
| Operator.Word (As, And, …) | `keyword.operator.word.tb` |
| Operator (`+`, `*=`, …) | `keyword.operator.tb` |
| Punctuation | `punctuation.tb` |
| Punctuation.LineContinuation (custom) | `punctuation.line-continuation.tb` |
| Name (default identifier) | `entity.name.tb` |
| Name.Variable | `variable.tb` |
| Name.Function | `entity.name.function.tb` |
| Name.Class | `entity.name.type.tb` |
| Name.Namespace | `entity.name.namespace.tb` |
| Name.Attribute | `entity.other.attribute-name.tb` |
| Name.Builtin | `support.function.tb` |
| Literal.Boolean (true/false) | `constant.language.boolean.tb` |
| Literal.Empty | `constant.language.empty.tb` |
| Literal.Nothing | `constant.language.nothing.tb` |
| Literal.Null | `constant.language.null.tb` |
| Literal.Date | `constant.other.date.tb` |
| Num.Float | `constant.numeric.float.tb` |
| Num.Integer | `constant.numeric.integer.tb` |
| Num | `constant.numeric.tb` |
| Comment.Single | `comment.line.tb` |
| Comment.Multiline | `comment.block.tb` |
| Comment.Preproc | `meta.preprocessor.tb` |
| Str (string body) | `string.quoted.double.tb` |
| Str.Escape (`""` inside a string) | `string.escape.tb` |
| Keyword.Declaration (`Option Strict`, `Option Explicit`, …) | `keyword.declaration.tb` |

### 7.3. The keyword sets

Port verbatim from `_plugins/twinbasic.rb`:

- **keywords** — 70 tokens (`alias byref byval call case class …`)
- **keyword_constants** — 5 tokens (`true false empty nothing null`)
- **keywords_type** — 16 tokens (`any boolean byte currency date …`)
- **operator_words** — 14 tokens (`addressof and andalso as eqv imp is isnot like mod not or orelse typeof xor`)
- **builtins** — 2 tokens (`debug err`)

TextMate matches these as alternation regexes with `(?i)` for
case-insensitivity. Generate the regex at grammar-build time from
the token list (or hand-roll once and verify; the lists are stable).

### 7.4. Differences from Rouge to be aware of

- **State pops.** Rouge uses `pop!`; TextMate uses `end` patterns
  inside `begin/end` blocks. The Rouge `state :dim do … rule … :pop! end`
  shape maps to TextMate as `{ "begin": "(?i)(Dim|Const|ReDim)\\b", "end": "(?=[^\\w])", "name": "keyword.control.tb", "patterns": [{ include: "#whitespace" }, { match: identifier, name: "variable.tb" }] }`.
- **`goto`.** Rouge's `state :typename do … goto :typename_ext end`
  has no exact TextMate analogue; emulate via nested begin/end with
  patterns referencing each other.
- **Implicit pop on no-match (`rule(//) { pop! }`).** TextMate's
  `end: ""` doesn't pop on a zero-width no-match cleanly; emulate via
  an `end` regex that matches anything that doesn't start the inner
  rules.

These transformations are mechanical but tedious. Plan ~3-4 hours for
the grammar port plus another ~1-2 hours for validation against a
representative tB code block from the Const / Continue / Operator
pages.

### 7.5. Validation harness

A small script (`builder/verify-grammar.mjs`, optional) reads
representative tB code samples from the docs source and prints the
token list Shiki produces. Compare against the Rouge token list (the
Jekyll-built `<span class="X">` sequence). Discrepancies map back to
grammar rules that need adjustment.

Representative samples to use:

| Source | Why |
|---|---|
| `Reference/Core/Const.md`'s code block | Standard mix of `Dim`, string literals, comments, keywords. |
| `Reference/Core/Dim.md`'s code block | Tests `Dim` state transition and variable-name token. |
| `Reference/VBA/Interaction/InputBox.md`'s code block | Tests If/Then control flow, string concatenation. |
| `Features/Language/Attributes.md`'s code block | Tests `[Attribute("…")]` attribute syntax. |
| `Features/Language/Generics.md`'s code block | Tests `(Of T)` generic syntax. |

---

## 8. Design decisions and assumptions

### D1. markdown-it, not remark / micromark / a custom parser

Three reasons:

- **Plugin ecosystem.** markdown-it-attrs, markdown-it-deflist,
  markdown-it-footnote already exist and cover three of our four
  must-have features. Remark / micromark have analogues but the API
  surface for custom plugins is heavier (remark-rehype's AST is more
  expressive but also more layered).
- **Mature kramdown-compatible output.** markdown-it's output already
  matches kramdown for tables, headings, links, lists, emphasis, code
  spans. The divergences (header IDs, footnotes, attribute syntax,
  TOC, smart quotes) all have a clear patch path.
- **Sync-by-default API.** markdown-it's `render()` is synchronous,
  making the per-page loop trivially parallel.

Trade-off: markdown-it's GFM output diverges from kramdown on a
handful of edge cases (notably block-HTML recursion, which we paper
over with a custom plugin). We accept the divergences and verify by
diff.

### D2. GFM admonitions as a pre-render text rewrite, not a markdown-it plugin

Per §5.2. The pre-render approach mirrors the patched-gem behaviour
exactly, gives us the same "one combined parse" speedup, and is ~80
lines of regex vs ~150 lines for a markdown-it block-parser rule with
nested rendering and child env management.

Trade-off: the rewrite operates on the raw source string, so any
admonition fence inside a fenced code block has to be stashed first
(the §5.2 algorithm does this — same shape as the gem's
`process_doc`). If we ever miss a stash case, an admonition inside a
code fence would render as an alert div, which would be wrong.

### D3. Shiki + scope-to-Rouge-class mapping, not Shiki's inline-style output

Per §5.10. The existing `rouge.css` is the canonical theme; preserving
class names means no asset changes. Trade-off: ~30 lines of
scope-string-matching code, plus a maintenance burden if the TextMate
grammar's scope names evolve.

### D4. No TextMate grammar bundled inside `highlight.mjs`

Per §3. Grammar lives in its own JSON file so it can be edited and
validated independently. Trade-off: one extra file in `builder/`,
loaded once at startup.

### D5. Custom header-id plugin, not `markdown-it-anchor`

Per §5.6 "Why not use markdown-it-anchor". Custom slug + dedup logic is
~30 lines and matches kramdown exactly; the plugin's dependency would
require ~15 lines of configuration to match anyway and would still
have the dedup-suffix mismatch.

### D6. `markdown-it-attrs` with kramdown-style `{: }` delimiters

Per §5.7. We override both delimiters because kramdown uses `{:` (with
colon) while the plugin's default is `{` (without). The colon is a
content-side convention and is the form every existing `{: }` usage on
the site follows.

### D7. Footnote rendering overrides instead of a custom footnote plugin

Per §5.5. markdown-it-footnote's tokenisation and parsing are correct;
only the rendered output diverges from kramdown. Five render-rule
overrides (~20 lines) is much smaller than a custom footnote plugin
(~150 lines).

### D8. Custom TOC plugin, not `markdown-it-toc-done-right` or similar

The plugins that exist either use `[[toc]]` syntax (Vue/Vuepress
convention) or `[TOC]` (PHP Markdown Extra convention); neither matches
kramdown's `* TOC\n{:toc}` shape, and their output diverges from
kramdown's `<ul id="markdown-toc">` shape. Custom plugin is ~100 lines
and matches exactly.

### D9. Relative link rewriting as a markdown-it core plugin, not a post-render text pass

Per §5.3. Doing it as a plugin gives access to markdown-it's token
tree, which lets us cleanly skip external/fragment links and handle
fragments separately from path rewriting. A post-render regex pass
would have to re-parse `href` attributes from HTML — workable but
clumsier.

### D10. `linkify: false`

Per §5.1 inline comment. The site doesn't have bare URLs in body
prose; linkify would create false positives in code-adjacent contexts
(e.g. inside `<td>`s of tables that mention domain names). If
verification flags a regression — a kramdown-linkified URL that
markdown-it leaves alone — flip linkify to `true` and accept the (very
few) new auto-links it creates elsewhere.

### D11. `breaks: false`

Verified empirically: kramdown's GFM parser on this site does NOT
hard-wrap single newlines into `<br>`. Setting `breaks: true` would
introduce a `<br>` for every soft line break in body prose, breaking
multi-line paragraphs.

### D12. Block-HTML recursion piggy-backs on markdown-it's `html: true`

Per §5.12. Mirroring kramdown's `markdown="1"` recursion does NOT
require a recursive `md.parse(body)` call. Emitting the admonition
body bracketed by blank lines makes markdown-it's normal block-HTML
handling re-enter block parsing for the inner content. The custom
plugin only strips the `markdown="1"` attribute (which kramdown also
strips post-recursion) and wraps standalone inline HTML (`<br>` /
`<img>`) in `<p>` to match kramdown's behaviour.

### D13. The trailing-newline-in-code convention

Per §5.10. Rouge always emits a trailing `\n` before `</code>`. Shiki
+ our wrapper emits the same. This is a 1-byte detail that the
verification diff will catch if it slips.

### D14. mermaid `.mmd` → `.svg` automation is OUT of scope

Currently the site has one mermaid diagram, manually exported by the
maintainer through Typora into `assets/images/mmd/<hash>.svg`. PLAN.md
treats those SVGs as static assets (copied verbatim by Phase 5).
Automating the conversion (Phase 3 or a Phase 5 preprocessor that
shells out to `mmdc`, the mermaid-cli) is **a separate enhancement,
not part of the Jekyll→tbdocs port**. The Phase 3 plan does NOT spec
it; the existing SVGs continue to be hand-managed. Once the port
lands, a follow-up can add a small `mermaid.mjs` preprocessor that
walks `assets/images/mmd/*.mmd` and runs `mmdc` on each (or detects a
hash collision and skips).

This is called out because the current setup (`_plugins/jekyll-local-diagram/`)
ships a Ruby plugin that COULD have done the conversion but isn't
actually invoked (no Liquid block tag uses it on any page). Phase 3
matches that — the directory exists, but no rendering path consumes
it.

### D15. Asset extraction for syntax highlighting

The existing `rouge.css` was generated by Rouge. Phase 3 keeps using
the file verbatim, so no regeneration is needed unless future
scope-to-class mismatches surface. If a new Rouge class shows up that
the existing CSS doesn't style (or a class disappears), we'd notice
when the visual diff between Jekyll and tbdocs flags it.

### D16. `enable_copy_code_button: true` is honored via Phase 5 asset copy, not Phase 3 HTML

Per §1. just-the-docs's `copy-code.js` lives in
`builder/assets/js/just-the-docs.js` (the bundled theme runtime) and
finds every `pre.highlight` at runtime to insert a copy button. Phase
3 emits the same wrapper structure Jekyll does, and Phase 5 copies the
theme JS into `_site/assets/js/`. No server-side HTML change required.

### D17. Per-page render runs in parallel; no throttling

Per §4. 838 × ~2 ms is well under any practical CPU contention limit.
Add `p-limit` only if a future regression measurement says otherwise.

### D18. The `book.html` and `404.html` HTML pages pass through verbatim

Per §2. `404.html` is rendered by Phase 4 into the default layout (the
page has frontmatter so it's treated as a Page). `book.html` is
consumed by Phase 8, not the default-layout render — Phase 3 puts the
verbatim HTML on `renderedContent` and Phase 4 / Phase 8 decide what
to do with it.

---

## 9. Edge cases (cross-cutting)

### Markdown parsing

| Case | Handling |
|---|---|
| Empty page body (frontmatter only, no content) | `renderedContent === ""`. Currently no such page exists; defensive. |
| Page with only HTML, no markdown (`< 5%` of pages) | markdown-it's `html: true` passes the HTML through. No conversion happens. |
| Page with a CRLF body | Normalised to LF up-front in `renderPage()` so per-line regexes in the pre-render rewrites see consistent input. |
| Page with Unicode in headings | Unicode letters are preserved by the slugger (via `\p{L}\p{N}\p{M}\p{Pc}\- ` keep-set). A heading "À" produces `id="à"`. **Matches kramdown's GFM slugger.** |
| Page with HTML entities in source (`&amp;` etc.) | Pass through verbatim. markdown-it does NOT re-escape. |
| Inline `<svg>` with embedded markdown -- `<svg><text>**bold**</text></svg>` | NOT recursed unless wrapped in `markdown="1"`. None on the site. |
| Page with Jekyll Liquid `{% raw %}` / `{% endraw %}` | Stripped up-front by `stripLiquidRawTags()`. Used by 2 pages (`SendKeys.md`, `Documentation Development.md`). |

### Code blocks

| Case | Handling |
|---|---|
| ```` ```tb ```` fence with empty body | Emit `<div class="language-tb highlighter-rouge"><div class="highlight"><pre class="highlight"><code></code></pre></div></div>`. |
| ```` ``` ```` fence with no language | Treated as `language-plaintext`; no spans, just escaped text. |
| ```` ```unknown ```` fence | `language-unknown highlighter-rouge` wrapper; body escaped without spans. Matches Rouge's "no lexer found" fallback. |
| Indented (4-space) code block | Same `language-plaintext highlighter-rouge` wrapper as a no-info fence. The `code_block` renderer override emits the wrapper; markdown-it's default would emit a bare `<pre><code>`. |
| Triple-backtick fence inside a list item | Token has `level > 0`; the fence renderer splices a `\n` between the inner / outer `</div>` so the html-compress pass produces the same `</div> </div>` shape kramdown does for indented blocks. |

### Links

| Case | Handling |
|---|---|
| `[X](#fragment)` | Pass through (intra-page link). |
| `[X](mailto:foo@example.com)` | Pass through; matched by external-prefix regex. |
| `[X](https://example.com)` | Pass through. |
| `[X](/tB/Core/Const)` | Pass through (root-absolute). |
| `[X](Y.md)` | Resolved by relative-links plugin → `/perm-of-Y`. |
| `[X](Y)` (no `.md` extension) | Resolved via byPath or byUrl tables. byUrl catches it if there's a permalink-matching page. |
| `[X](Y.md#sub)` | Path rewritten, fragment preserved. |
| `[X](missing.md)` | Plugin returns `null`; markdown-it emits the link with `href="missing.md"` unchanged. Matches gem's fail-open behaviour. |
| Reference-style link `[X][ref]` | Not rewritten (out of scope per §5.3). |

### Admonitions

See §5.2's table.

### Definition lists

See §5.4 for the inner-`<p>` divergence (blank line vs none).

### TOC

See §5.8's table.

### Footnotes

| Case | Handling |
|---|---|
| `[^1]` reference, `[^1]:` definition | Standard render via overridden rules. |
| `[^1]` without matching definition | markdown-it-footnote leaves the bracket text intact. Matches kramdown. |
| Footnote inside an admonition | Numbered together with footnotes outside (shared env). |
| `[^foo]` named footnote | Not currently used; the override above assumes numeric label. Add named-label support when first introduced. |

---

## 10. Verification

### Acceptance checklist for "Phase 3 is done"

1. `renderPhase(pages, site)` populates `page.renderedContent` on
   every page (838 entries).
2. For each `Page`:
   - `typeof page.renderedContent === "string"`.
   - The string starts with valid HTML (begins with `<`, `&`, or
     letter -- not `\n`).
3. Body-fragment byte parity with Jekyll's `_site/` output for at
   least **96 %** of the 836 markdown pages (where "body fragment"
   means the `<main>` interior with the Phase-4 heading anchors and
   inside-heading whitespace stripped). Current state: **828 / 836
   (99.0 %) byte-match**, plus **8 / 836 (1.0 %) accepted divergences**
   listed in `accepted-divergences.mjs`, for **836 / 836 (100 %)
   accounted for** -- every page is either byte-identical to Jekyll
   or explicitly accepted. See the "Source edits landed" and "Rouge
   tB lexer fixes" subsections below for the full set of changes that
   got us here. Run `node _triage.mjs` from `builder/`.
4. Admonition shape: `tB/Modules/Interaction/InputBox.md` produces a
   `<div class="markdown-alert markdown-alert-note">` with the
   octicon SVG class `octicon-info`, the title `Note`, and the body
   parsed as markdown (the body's `<strong>` / `<code>` tokens are
   present).
5. Code-block shape: `Reference/Core/Const.md`'s ```tb``` block
   produces `<div class="language-tb highlighter-rouge"><div class="highlight"><pre class="highlight"><code><span class="k">Dim</span>…</code></pre></div></div>`
   with the same span sequence Rouge produces.
6. Header IDs: `tB/Packages/CEF/index.md` has H2 `Why CEF instead of
   WebView2?` → `id="why-cef-instead-of-webview2"`.
7. TOC: same page renders `<ul id="markdown-toc">` matching kramdown's
   nested structure, with `class="no_toc"` headings excluded and
   inline `<code>` / `<em>` / `<strong>` markup preserved in the
   link text.
8. Footnotes: `Features/index.md` renders the `[^1]` reference as
   `<sup id="fnref:1"><a href="#fn:1" class="footnote" rel="footnote"
   role="doc-noteref">1</a></sup>` (NOT `<sup class="footnote-ref">`).
9. Relative links: `Reference/Core/Const.md`'s reference to
   `Attributes#description` resolves to `/tB/Core/Attributes#description`
   (verified against Jekyll output).
10. Smart quotes: `index.md` renders 33 em-dashes (`—`) — matches
    Jekyll.
11. Attribute syntax: pages with `{: .no_toc }` produce `class="no_toc"`
    on the preceding heading/paragraph.
12. Performance: full Phase 3 render of 838 pages completes in **under
    2 seconds** on the current dev machine (target 1500 ms; cap 2000
    ms before regression alarm). Current state: ~1.75-1.85 s
    end-to-end (Shiki tokenisation is the dominant cost).

### Verification harness

`builder/verify-phase3.mjs` extends the verify-phase2 pattern:

1. Run `discover()` → `computeNav()` → `precomputeSeo()` →
   `loadBookData()` + `resolveBookChapters()` → `renderPhase()`.
   Capture per-substep wall time.
2. Assert items 1-11 above.
3. **Byte-comparison harness:** for a curated list of 8 representative
   pages, extract the rendered body fragment from both Jekyll's
   `_site/<page>.html` (via DOM-walk to the `<main>` interior) and
   tbdocs's `renderedContent`, normalise whitespace, and diff. Print
   the diff for each page. Pass if diff is empty (modulo the known
   Phase 4 differences listed under item 3 above).
4. **Performance smoke check:** print per-substep wall time; warn if
   the total exceeds 1500 ms (likely a regex backtracking regression
   in the relative-link or admonition pass).
5. Exit non-zero on any required check failure.

### Triage tooling (companion scripts)

Three iterate-while-developing scripts live alongside `verify-phase3.mjs`:

- `_triage.mjs` -- runs the full pipeline, diffs every page body
  against Jekyll's `_site/`, classifies divergences into named buckets
  (e.g. `scope-mapping`, `setext-heading-after-list`,
  `code-highlight-other-lang`), and prints up to three examples per
  bucket. Output ranks buckets by severity then count so the highest-
  impact divergences surface first.
- `_diff_all.mjs all` -- same comparison but bucketed by a short
  string slice around the first-divergence point, so visually similar
  patterns group together regardless of their classifier match.
- `_diff.mjs <srcRel>` -- prints the first-divergence context for one
  page (300 chars before / after). Used during iteration to verify a
  fix landed.
- `_spot.mjs ../docs <srcRel>` -- prints the full `renderedContent` of
  one page. Used for eyeballing the rendered HTML around a specific
  area.

Representative pages for byte-comparison (current state: 8/8 match):

| Page | Coverage |
|---|---|
| `Reference/Core/Const.md` | Headings, definition lists, code block, link rewriting, `{: .no_toc }`. |
| `Reference/VBA/Interaction/InputBox.md` | Admonition with code block inside, definition lists. |
| `Reference/CEF/index.md` | TOC, multiple admonitions, tables. |
| `Reference/Operators.md` | Tables with alignment. |
| `Features/index.md` | Footnotes, internal links. |
| `Features/Fusion.md` | Image attribute syntax `{:width="…"}`. |
| `index.md` | Custom layout, multiple cross-package links. |
| `Miscellaneous/FAQs.md` | Plain `<details open>` + `<summary markdown=span id="..."><b>...</b></summary>` pattern with blank-line-separated body. The renderer's `strip-markdown-attr` rule strips the `markdown=span` directive AND runs `applyKramdownSmartQuotes` over the body before stripping (so summary text like `'100% backwards compatible'` gets curly-quoted, matching kramdown's `markdown=span` descent). Source was rewritten in-place from the old `<details markdown=block>` + IAL form. |

### Byte-for-byte parity (deferred)

The full `diff -rq _site/ _site-new/` validation runs after Phase 4
lands. Phase 3's harness only diffs body fragments (because Phase 3
doesn't produce full pages).

### Accepted divergences

`builder/accepted-divergences.mjs` exports a list of 8 pages whose
remaining byte-level divergence is intentional. The harnesses (`_triage.mjs`,
`_diff_all.mjs`, `verify-phase3.mjs`) honour this list and report each
entry as `ACCEPT` rather than `DIFFER`. All 8 entries fall into the
single **non-tB syntax-highlighting** bucket; the tB-highlight-noise
bucket has been fully closed out (see "Rouge tB lexer fixes" below).

**Non-tB syntax highlighting** (8 pages) -- the divergence sits inside a
``` ```html / ```json / ```sql / ```js / ```xml ``` fence. Rouge has hand-
written per-language lexers; we drive Shiki's TextMate grammars. The two
emit different span structures for the same source (Rouge's `<span
class="w">` whitespace tokens, JSON key-label `nl`, HTML `<!DOCTYPE>` /
XML `<?xml ?>` single-`cp` lump, JS template-literal interpolation split,
SQL bracket-quoted identifier split, etc.) and the structural mismatch
is too deep to bridge without rewriting each grammar. The token CLASSES
we DO emit are still recognised by `rouge.css`, so the rendered colours
are correct; the difference is purely how finely the source is split.

  - `Reference/Attributes.md` (JSON)
  - `Reference/WinEventLogLib/index.md` (JSON)
  - `IDE/Menu/Window.md` (JSON inside `<details>` blocks)
  - `IDE/Project Explorer.md` (XML)
  - `Tutorials/CEF/Driving Monaco.md` (HTML)
  - `Tutorials/WebView2/Driving Monaco.md` (HTML)
  - `Reference/VBA/Interaction/Partition.md` (SQL)
  - `Tutorials/WebView2/JavaScript interop.md` (JS template strings)

### Source edits landed

Ten content edits were required for byte parity; all other
divergences were resolved in the renderer or in the Rouge tB lexer
(see "Rouge tB lexer fixes" below).

1. `docs/Reference/Glossary.md` line 591 has `(R)` (literal capital R
   in parens) escaped to `\(R\)` so markdown-it's typographer doesn't
   substitute `®`. Kramdown also doesn't substitute `(R)` here, so
   the escape is invisible to Jekyll's output -- both renderers now
   produce the same rendered text.
2. `docs/IDE/Menu/Debug.md` -- the two `![Debugger Options | Debug
   Menu](...)` image references had their `|` replaced with `-`.
   Kramdown's GFM table detector was misinterpreting the `|` in the
   alt-text as a column separator, producing a bogus one-row
   `<table>` where an `<img>` belonged. A single `-` (not `--`,
   which the typographer would convert to an en-dash) avoids both
   the misparse and any typographic substitution.
3. `docs/IDE/Menu/Help.md` -- the single `![About | Help Menu](...)`
   image had the same `|` → `-` fix for the same reason.
4. `docs/Miscellaneous/FAQs.md` -- bulk-rewrote all 29 `<details
   markdown=block>` / `<summary markdown=span>` + trailing-IAL
   blocks into the cleaner `<details open>` / `<summary markdown=span
   id="...">` pattern. The IAL `{: #anchor }` is gone; `id="..."`
   sits directly on the `<summary>` tag. `markdown=span` stays on
   `<summary>` because kramdown's HTML parser doesn't recognise
   `</summary>` as a closing tag without it -- with `markdown=span`,
   kramdown emits the clean `<summary id="..."><b>...</b></summary>`
   shape that our renderer also produces (after stripping
   `markdown=span` from the html_block content and running smart-quote
   conversion over the summary body to match kramdown's
   `markdown=span` inline descent).
5. `docs/IDE/Menu/Window.md` -- the three `<details><summary>...
   </summary>` blocks (panel-layout JSON disclosures) had their
   `<summary>` upgraded to `<summary markdown=span>` for the same
   reason as #4 -- the `markdown=span` hint stops kramdown from
   absorbing everything into the summary on the broken HTML descent
   path. No body content needed to change.
6. `docs/Reference/Core/Option.md` -- the ``` ``` vb` fence-info on
   the `<details>`-style admonition example was corrected to
   ``` ```tb ```. The original `vb` was a typo (the snippet is
   twinBASIC code, not Visual Basic). Jekyll was picking Rouge's
   VB lexer for the block; both renderers now use the tB lexer.
7. `docs/Features/Packages/Importing a package from a TWINPACK
   file.md` -- the step-list source originally had blank lines
   between each `- bullet ![image]` block, which made kramdown render
   one bullet as tight (no `<p>` wrap) and markdown-it render it as
   loose (`<p>` wrap) due to differing loose-list heuristics around
   trailing blank lines. Collapsed all step bullets into one
   contiguous list (`- bullet\n![image]\n- bullet\n![image]\n...`)
   with no inter-bullet blank lines, which both parsers agree is
   tight.
8. `docs/IDE/Project Explorer.md` -- removed five indented
   `<!-- ![Folder](...) ... -->` HTML comments from inside the
   folder-tree paragraph. Kramdown treated the indented comments as
   inline within the surrounding paragraph (with URL rewriting
   applied to the markdown image syntax inside the comment text);
   markdown-it treated them as block-level and closed the paragraph.
   The comments were placeholder TODO notes invisible in the
   rendered output, so deleting them was harmless.
9. `docs/Reference/VBA/Information/VarPtr.md` -- in
   `[**GetMem*** / **PutMem***](../HiddenModule/)`, the trailing `*`
   after each `**Name**` was escaped to `\*` (so the source reads
   `[**GetMem**\* / **PutMem**\*](../HiddenModule/)`). Without the
   escape, kramdown's emphasis parser treated the stray `*` as an
   em opener and consumed the closing `]` of the link, breaking
   the link parse. markdown-it handled the original form correctly,
   but the escaped form is unambiguous to both.
10. `docs/Reference/WinServicesLib/ServiceManager.md` -- the two
    quoted error messages (`*"Unable to open the Service manager..."*`
    and `*"CreateServiceW() failed with error code <N>"*`) were
    rewritten from `*"..."*` (em-wrapped) to `` `"..."` ``
    (backtick-wrapped). The `<N>` placeholder inside the second em
    span was being parsed by kramdown as an opening HTML tag,
    nesting the em with a stray `</N>`; backticks render the whole
    sequence as inline code where `<N>` is literal. The first em
    span also had a smart-quote pairing quirk (kramdown rendered
    both `"` as open quotes `“`); backticks bypass smart-quote
    conversion entirely.

### Rouge tB lexer fixes

Four bugs were fixed in our Rouge tB lexer at
`docs/_plugins/twinbasic.rb` -- it's our own code, so fixing the
lexer is preferable to working around the quirk in our Shiki path
or in source markdown.

1. **`:dotted` state cascading across newlines.** The original
   `state :dotted do; mixin :whitespace; rule id, Name, :pop!; ...
   end` block used `mixin :whitespace`, which matches `\n` and
   pushes `:bol` on top of the stack while leaving `:dotted` active
   underneath. The next line's first identifier therefore matched
   the `id` rule INSIDE `:dotted` and got tagged Name (`n`) instead
   of being lexed by the normal root rules (which would, for
   instance, recognise `Exit Sub` as a single Keyword via the
   `Exit[ \t]+(Function|Sub|...)\b` rule).

   The fix replaces the `:whitespace` mixin with two explicit
   rules: `_[ \t]*\n[ \t]*` for line continuations (the only way
   to legitimately continue a member-access expression across a
   newline in tB) and `[^\S\n]+` for non-newline whitespace. A bare
   newline now falls through to the empty-match `(//) { pop! }` and
   pops `:dotted`, so the next line is lexed cleanly. Closed
   divergences on three pages (`Reference/Core/On-Error.md`,
   `Reference/Core/ReDim.md`, `Reference/VB/Screen/index.md`).

2. **`:attrargs` state lacking rules for `&` and `_`.** The
   `:attrargs` state handles the contents of an attribute argument
   list (e.g. inside `[Description("..." & _ "...")]`). The
   original state had rules for strings, numbers, identifiers,
   `,`, `)` -- but not for the `&` concat operator or the `_[ \t]*\n`
   line continuation. On `[Description("a" & _ "b")]` the `&`
   triggered the empty-match `(//) { pop! }` fallback, prematurely
   popping `:attrargs` and leaving the closing `]` to be lexed in
   `:attribute` -- where, after subsequent pops triggered by other
   un-handled chars, it ended up as Error (`err`).

   The fix adds two rules: the same line-continuation rule as
   `:dotted` (`_[ \t]*\n[ \t]*`) and the standard operator-token
   rule from `:root` (`%r(&=|[*]=|/=|\\=|\^=|\+=|-=|<<=|>>=|<<|
   >>|:=|<=|>=|<>|[-&*/\\^+=<>])`, Operator).

3. **`:namespace` / `:dim` / `:funcname` / `:typename` /
   `:typename_ext` / `:end` states cascading across newlines.** The
   same `mixin :whitespace` bug that hit `:dotted` was latent in
   every other one-shot post-keyword state. The most visible
   symptom: `Reference/Core/Option.md`'s `End Module` snippet --
   the `Module` keyword pushed `:namespace`, the trailing
   `' comment` was consumed by the mixin, then `\n` pushed `:bol`,
   then `:bol` popped, leaving `:namespace` active for the NEXT
   line's `End`. `End` then matched `:namespace`'s identifier rule
   and was tagged Name::Namespace (`nn`) instead of Keyword (`k`).

   Each of the six states got the same `mixin :whitespace` →
   explicit `_[ \t]*\n[ \t]*` + `[^\S\n]+` rewrite as `:dotted` did
   in fix #1. The companion `funcname-keyword` rule in
   `twinbasic.tmLanguage.json` (Shiki) was updated in parallel: its
   `begin/end` `end` pattern now includes `$` so the funcname
   region also terminates at end-of-line (without it, a bare `Sub`
   on its own line would still grab the next line's first
   identifier as the function name). The TextMate grammar continues
   to support `Sub _\n  Foo` multi-line declarations via the inner
   `#line-continuation` pattern, which consumes the `_` and keeps
   the region open.

4. **`:whitespace` LineContinuation rule didn't absorb the next
   line's indent.** Semantically the `_` line continuation is one
   unit with the indent on the continuing line -- the four sibling
   states (`:dotted`, `:attrargs`, `:dim`, `:funcname`, ...) all
   already used the `_[ \t]*\n[ \t]*` form, but the root
   `:whitespace` mixin's rule was just `_[ \t]*\n` (no trailing
   indent). The mismatch meant `<span class="lc">` rendered with
   different content depending on the surrounding state.

   Standardised on `_[ \t]*\n[ \t]*` everywhere. The companion
   change in `builder/highlight.mjs` folds a cls=null whitespace
   token into an open `<span class="lc">` run when the run was
   started by a line-continuation token, so our Shiki path
   produces the same single-span shape Rouge emits for the
   continuation + indent unit. Closed divergences on the two
   `Hosting local web assets.md` pages and brought all `tB`-fence
   line-continuation tokens to byte parity.

**Cache gotcha:** Jekyll caches per-page rendered markdown including
syntax-highlighted code blocks in `docs/.jekyll-cache/`. Edits to
`_plugins/twinbasic.rb` are NOT picked up by an incremental rebuild;
clear the cache first (`Remove-Item -Recurse -Force .jekyll-cache`
in PowerShell) before running `build.bat`.

---

## 11. Dependencies

Cumulative dependencies after Phase 3:

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "shiki": "^1.0"
  }
}
```

New in Phase 3:

- `markdown-it-attrs` — `{: }` attribute syntax (§5.7).
- `markdown-it-deflist` — definition lists (§5.4).
- `markdown-it-footnote` — `[^N]` footnotes (§5.5).
- `shiki` — syntax highlighting (§5.10). Brings WASM regex engine
  (~3 MB on disk; ~1 MB at runtime).

Not added:

- `markdown-it-anchor` — replaced by custom plugin (§5.6).
- `markdown-it-toc-done-right` — replaced by custom plugin (§5.8).
- `lunr` — Phase 6 (search index).

**Total install footprint:** ~15 MB extra after `npm install`,
dominated by Shiki + its WASM blob.

---

## 12. File layout after Phase 3

```
<repo root>/
  builder/
    PLAN.md                      — architecture overview
    PLAN-1.md                    — Phase 1 spec
    PLAN-2.md                    — Phase 2 spec
    PLAN-3.md                    — this file
    package.json                 — adds markdown-it-attrs, -deflist,
                                   -footnote, shiki
    discover.mjs                 — Phase 1 (shipped)
    nav.mjs                      — Phase 2 (shipped)
    seo.mjs                      — Phase 2 (shipped)
    book.mjs                     — Phase 2 (shipped); Phase 8 renderer
                                   later
    build-info.mjs               — Phase 2 (shipped)
    render.mjs                   — §3 + §5 (shipped, ~1.1k lines)
    highlight.mjs                — §5.10 (shipped, ~330 lines)
    twinbasic.tmLanguage.json    — §7 (shipped, ~250 lines after the
                                   begin/end refactor consolidated
                                   the state-spanning rules)
    accepted-divergences.mjs     — §10 "Accepted divergences" list,
                                   honoured by all three harnesses
    index.mjs                    — orchestrator extended
    verify-phase1.mjs            — Phase 1 harness
    verify-phase2.mjs            — Phase 2 harness
    verify-phase3.mjs            — §10 acceptance harness (shipped)
    _triage.mjs                  — bucketed-divergence harness
    _diff_all.mjs                — flat divergence overview
    _diff.mjs                    — single-page diff inspector
    _spot.mjs                    — single-page output inspector
  docs/                          — ten source edits + four Rouge tB
                                   lexer fixes (see §10 "Source edits
                                   landed" and "Rouge tB lexer fixes")
```

### Extended `index.mjs` orchestrator

```js
import { renderPhase } from "./render.mjs";

async function main() {
  // … Phase 1 + Phase 2 as before …

  const renderTimings = await renderPhase(pages, site);
  t.lap("render");

  // Phase 4+ chains in here.
  console.log(`Phase 1+2+3 done: ${pages.length} pages`);
  console.log(t.summary());

  return { pages, staticFiles, site };
}
```

Where `renderPhase(pages, site)`:

1. Initializes the Shiki highlighter (one async call).
2. Builds the link tables.
3. Creates the configured markdown-it instance.
4. Stashes it on `site.markdown`.
5. `Promise.all`-renders every page.

---

## 13. What a "done" Phase 3 enables

After Phase 3 lands, every page has `renderedContent` populated. The
next session can implement Phase 4 (`template.mjs` + `compress.mjs`)
by walking `pages[]` and concatenating:

- The layout's pre-content chrome (head, sidebar, breadcrumbs, page
  title) — driven by Phase 2 fields.
- `page.renderedContent` (Phase 3).
- The layout's post-content chrome (children nav, footer, scripts) —
  driven by Phase 2 fields.

Then run the heading-anchor regex pass (~20 lines) and the HTML
compression pass (~10 lines). Write to `_site/<destPath>`.

Phase 5 (write online), Phase 6 (auxiliaries), Phase 7 (offline),
Phase 8 (PDF) all consume `renderedContent` indirectly through Phase
4's full-page output. Phase 3's clean handoff means none of them need
to know about markdown rendering.

---

## 14. Implementation order

Suggested order for the next session, each step independently
verifiable:

All steps below shipped; this section is now a reverse log rather than
a prospective plan.

1. **Bootstrap `render.mjs` with markdown-it base setup (§5.1) +
   per-page loop.**
2. **Add `markdown-it-attrs` (§5.7) + `markdown-it-deflist` (§5.4) +
   `markdown-it-footnote` (§5.5).**
3. **Add header-id plugin (§5.6) + TOC plugin (§5.8).** Iterated: TOC
   collector now scans the whole page (not just post-marker) and
   preserves inline markup in link text; render builds a TocNode tree
   and emits indented HTML matching kramdown's exact whitespace.
4. **Add relative-links plugin (§5.3).** Iterated: now handles root-
   absolute paths and refuses paths that would escape the docs root
   (matching jekyll-relative-links's File.expand_path behaviour).
   `resolveAsset` URL-decodes before staticFiles lookup.
5. **Add admonition pre-processor (§5.2) + block-HTML recursion
   plugin (§5.12).** Iterated: admonition regex supports indented
   nesting inside lists/blockquotes; rewritten `<div>` is emitted at
   column 0 (breaks the parent list, matching the gem); trailing blank
   line so following content parses as a separate block.
6. **Port the TextMate grammar (§7).** Smaller than originally estimated
   (~250 lines, not 600). State-spanning rules (`funcname-keyword`,
   `dim-keyword`) use begin/end so they can match across newlines.
   Added `invalid.illegal.tb` catch-all for stray characters → "err"
   class.
7. **Wire Shiki + scope-to-Rouge-class mapper (§5.10).** Iterated:
   scope iteration is INNER → OUTER with a `definition`-marker skip
   when there's a container parent; `meta.brace` added for JS
   punctuation; non-tB grammars remap `variable.*` → `nx`; identifier
   fallback for tokens with no inner scope; whitespace-handling in the
   coalesce loop matches Rouge's multi-line comment / line-continuation
   shapes.
8. **Footnote rendering overrides (§5.5 patch).** Shipped.
9. **Pre-render rewrites** (added incrementally):
   - CRLF → LF normalisation
   - `stripLiquidRawTags`
   - `rewriteTripleAsteriskEmphasis` (`***x***` → `**_x_**`)
   - `encodeSpacesInMediaUrls` (plain-path URLs with spaces)
   - `rewriteListItemSetextHeadings` (`- text\n---\n` → `- ## text\n`)
   - `absorbTrailingHtmlComments` -- joins a standalone `<!-- comment -->`
     line into the preceding non-blank text line so markdown-it parses
     them as one paragraph (matching kramdown's tree shape).
10. **Post-render passes:** `normaliseVoidTags`, `padEmptyCells`.
11. **`standaloneIalForwardPlugin`** handles kramdown's IAL forward/
    backward attachment rule with `consumedLines` tracking for
    consecutive IALs.
12. **`tightLooseListPlugin` + `looseDeflistPlugin`** for per-item
    paragraph wrapping that matches kramdown rather than markdown-it's
    per-list rule. Iterated: added kramdown's "last item is loose
    unless an earlier sibling is tight" rule
    (`kramdown/parser/kramdown/list.rb#132-139`) as a two-pass
    post-decision sweep, fixing `Reference/Core/Option.md` and similar
    lists with mixed loose/tight items.
13. **`kramdownDashesPlugin`** adds dash, guillemet, and possessive-
    quote substitutions markdown-it's typographer doesn't do. Plus
    `kramdown-quote-near-emphasis`: text-token quotes adjacent to
    `strong_open` / `strong_close` / `em_open` / `em_close` /
    `code_inline` siblings re-curl per kramdown's rule cascade
    (`SQ_PUNCT` / `\s` / `s\b` / fall-through to opening).
14. **`kramdownEllipsisPlugin`** -- markdown-it's typographer
    collapses any run of 2+ dots into one `…`; kramdown consumes
    exactly 3 dots and leaves the rest. Post-replacements pass walks
    inline content, reads the original source byte-positions, and
    pads each rendered `…` with N-3 trailing dots when the source
    had >3 dots in a row.
15. **`kramdownHardBreakNewline`** -- replaces markdown-it's inline
    newline rule with a kramdown-equivalent (`(  )(?=\n)` matches the
    last 2 trailing spaces; any additional trailing spaces are
    preserved). Two-space hard breaks behave identically; the
    divergence shows on 3+ trailing spaces.
16. **`normaliseBlockHtml`** -- post-parse pass on `html_block`
    tokens that expands bareword HTML attributes (`allowfullscreen`,
    etc.) to `attr=""` form and collapses whitespace-only bodies of
    `<iframe>` / `<details>` / `<summary>` / similar elements,
    mirroring kramdown's HTML-parse-and-re-emit normalisation.
17. **`flattenAdjacentStrongPlugin`** -- depth-2 nested-strong
    detection. CommonMark's emphasis pairing rules nest
    `**X"**Y**"Z**` as outer-strong-wrapping-inner-strong; kramdown
    pairs left-to-right (`(1,2)(3,4)`) and emits two sibling strongs.
    Plugin spots the seven-token shape and restitches by swapping
    the inner `strong_open` / `strong_close` token types, producing
    the kramdown-shaped output without disturbing surrounding tokens.
18. **`accepted-divergences.mjs`** -- exported list of 8 pages
    whose remaining byte-level divergence is intentional, all in
    the single non-tB syntax-highlight bucket (HTML / JSON / SQL /
    JS / XML where Rouge's per-language lexer disagrees with
    Shiki's TextMate grammar -- see §10's "Accepted divergences"
    subsection). The tB-highlight-noise bucket is empty: every
    `tb`-fence divergence got fixed in the Rouge / Shiki / renderer
    triad (see §10's "Rouge tB lexer fixes"). All three harnesses
    (`_triage.mjs`, `_diff_all.mjs`, `verify-phase3.mjs`) honour
    the list and report each entry as `ACCEPT` instead of `DIFFER`.
19. **Run `verify-phase3.mjs` end-to-end + iterate via `_triage.mjs`.**
    Iteration loop: bucket-the-divergences → pick highest-impact
    bucket → land smallest possible change → re-triage → repeat.
    Got from 675/836 (~81 %) to **828/836 (99.0 %) byte-matched**,
    plus 8 written-off divergences in `accepted-divergences.mjs` --
    for **836/836 (100 %) accounted for**. Ten source edits dodged
    kramdown bugs / fence-info typos / loose-list edge cases
    (see §10 "Source edits landed") and four Rouge tB lexer bugs
    were fixed in `docs/_plugins/twinbasic.rb` (see §10 "Rouge tB
    lexer fixes"): (a) `:dotted` no longer cascades across newlines;
    (b) `:attrargs` got rules for `&` operator and `_` line
    continuation; (c) the same end-of-line pop treatment was
    extended to `:namespace`, `:dim`, `:funcname`, `:typename`,
    `:typename_ext`, `:end` (Shiki's `funcname-keyword`
    `begin/end` got a matching `$` terminator); (d) the
    `:whitespace` LineContinuation rule was standardised to
    `_[ \t]*\n[ \t]*` (absorbing the next line's indent) to match
    the other states, with the companion renderer hook in
    `builder/highlight.mjs` folding cls=null whitespace into the
    open `<span class="lc">` run. Zero residual structural
    divergences remain unmarked.
20. **Performance sweep (still pending).** Current: ~1.75-1.85 s.
    Soft target 1500 ms, hard cap 2000 ms. Shiki tokenisation is the
    bottleneck; candidate optimisations are caching results for
    identical code blocks and skipping Shiki for pure-punctuation
    bodies.

Total Phase 3 implementation effort: **~40-50 hours** including the
TextMate grammar port and the byte-parity iteration loop -- the
parser interaction surface was larger than originally estimated, and
many edge cases only surfaced once the corpus-wide triage harness was
running.

---

## 15. Out-of-scope follow-ups

Worth flagging for future tasks, but explicitly NOT part of Phase 3:

1. **Mermaid `.mmd` → `.svg` automation.** §D14. The current single
   diagram is hand-exported via Typora. A small `mermaid.mjs`
   preprocessor invoking `mmdc` would close the loop. Independent
   addition; doesn't block Phase 3.

2. **Switch to Shiki-themed inline-style output.** §D3. Would let us
   drop `rouge.css` and use a curated Shiki theme. Larger asset
   change; out of scope for the byte-equivalent port.

3. **Move title rendering to `site.markdown` (the Phase 3 instance).**
   §D6 in PLAN-2. Phase 2's seo.mjs currently creates its own minimal
   markdown-it. Could be consolidated post-port; tiny code reduction,
   no behaviour change.

4. **Generic `site.data.*` loader.** Currently `book.mjs` loads
   `_data/book.yml` itself; a generic loader would cover any future
   `_data/<file>.yml`. Phase 8 / future refactor.

5. **Inline copy-code button server-side rendering.** §D16. Would let
   us drop the just-the-docs copy-code JS, reducing client bundle.
   Cosmetic.

6. **Linkify exception list.** §D10. Could enable `linkify: true`
   selectively (off inside tables / code spans, on in prose). Adds
   complexity for marginal benefit.

These belong in a "post-port enhancements" backlog, not in PLAN-3
itself.
