# Build-time counts as named values in prose

Give the numbers a build already knows a global name, write that name in the
markdown, and let the render substitute the value. `{{tbdocs:pages}}` in a page
becomes `908` in the HTML.

The point is not to fix wrong numbers. It is to remove a class of decay: a
figure that is correct when written, derived by hand, and attached to nothing
that would notice when it stops being correct.

> **Status: designed, not implemented.** Nothing below exists in the tree yet.
> The syntax is settled (`{{tbdocs:<name>}}`); the initial name set is not.

---

## Why

Round 2 of the use-case evaluation found stale figures across the developer
documentation, and the interesting ones were not mistakes. `Authoring.md` says
93 pages under `Reference/` are folder-style `index.md` files, 91 of them with a
trailing-slash permalink. Measured against the real `discover()` today:

```
Reference/ index.md pages: 93
  of those, permalink ends with /: 91
```

Both correct. Nobody will be told when they stop being, and the page that
carries them is the one a new contributor is pointed at first.

The population is not small. Counting bare integers and spelled-out numbers
adjacent to a plural noun, in prose only (fenced code stripped), across
`docs/Documentation/`:

```
numeric claims in docs/Documentation prose: 270 across 14 files
    51  Tools.md
    46  Builder.md
    31  Fixes-PDFLib.md
    30  Building.md
    26  PDF-Generation.md
    25  Authoring.md
    24  Pipeline-Stages.md
    20  Extending.md
```

That regex is deliberately loose and most of its hits are not candidates —
timings, version numbers, prose like "two reasons". But it sizes the surface,
and the review already named the ones that had gone wrong: the book's page count
stated four ways, `Builder.md`'s task count, `Tools.md`'s gate count, the
enumeration totals on the Reference landing page, and the 56 attribute anchors
that became 58 in the same session that noticed them.

**The rot is silent in every case.** A wrong count breaks no link, fails no
gate, and reads exactly like a right one.

## What a name is

A name is **a derivation over build state**, never a constant.

This is the whole design, and getting it wrong wastes the exercise. A registry
holding `{ pages: 908 }` has not removed the stale figure; it has moved it from
a page a contributor reads into a module nobody opens, which is worse. The value
of `{{tbdocs:pages}}` comes entirely from `pages` being computed the same way
the pages themselves are.

So:

```js
// builder/counts.mjs
export function deriveCounts(state) {
  const pages = state.pages;
  return {
    pages:              pages.length,
    referencePages:     pages.filter(p => p.srcRel.startsWith("Reference/")).length,
    folderStyleIndexes: pages.filter(p => p.srcRel.startsWith("Reference/")
                                       && p.srcRel.endsWith("/index.md")).length,
    packages:           countPackages(pages),
    // ...
  };
}
```

**If a number cannot be derived, it does not get a name.** An assertion that
needs a human to check it belongs in prose, where a reader can see it is a
claim — not behind a placeholder that makes it look computed.

### Candidate names, measured

Against the tree at the time of writing, via the real `discover()` with
`_config.yml`'s exclude list:

| name | value | derivation |
|---|---:|---|
| `pages` | 908 | `state.pages.length` |
| `staticFiles` | 245 | `state.staticFiles.length` |
| `referencePages` | 757 | `srcRel` prefix |
| `documentationPages` | 15 | `srcRel` prefix |
| `folderStyleIndexes` | 93 | `Reference/` + `/index.md` |
| `folderStyleSlashPermalinks` | 91 | of those, permalink ends `/` |
| `packages` | 13 | distinct dir under `Reference/{Default,Built-In}/` |
| `redirectStubs` | 290 | `deriveRedirects` output |
| `attributeAnchors` | 58 | pinned `{: #... }` ids in `Reference/Attributes.md` |

`attributeAnchors` earns its place loudest: it was 56 in `Authoring.md`, became
58 in the session that added two, and the prose had to be rewritten by hand to
stop saying 56.

## Syntax

`{{tbdocs:<name>}}`.

Measured across all 906 markdown files under `docs/`:

| candidate | occurrences | verdict |
|---|---:|---|
| `{{name}}` | 0 | clean today; `{% raw %}` already in the corpus, and `{{ }}` is its sibling |
| `${name}` | 16 | JS template literals in samples |
| `%name%` | 25 | batch variables (`%ERRORLEVEL%`, `%TWINBASIC%`) |
| `[[name]]` | 0 | wiki-link convention; foreseeable |
| `{%name%}` | 4 | Liquid `{% raw %}` / `{% endraw %}` remnants |
| `<<name>>` | 4 | the shift-operator reference pages |
| `@@name@@` | 0 | diff hunk headers |
| `{#name#}` | 0 | Jinja comment syntax |
| `{:name:}` | 0 | visually confusable with kramdown `{: #id }`, which is used heavily |

The bare `{{name}}` form is clean **today**. The risk it carries is prose about
templating, which is foreseeable in a repository that documents its own build
and still contains Liquid remnants from the Jekyll era.

**The required `tbdocs:` namespace removes that risk rather than betting against
it.** A Liquid example writes `{{ page.title }}`, Handlebars writes
`{{#each}}`, Vue writes `{{ msg }}`; none carries the prefix, so none matches.
It also greps exactly: `grep -rn "{{tbdocs:" docs/`.

### Escaping

There is none, and none is needed.

The substitution is a markdown-it **inline rule**, and inline rules do not run
inside fenced blocks or code spans. A page that needs to show the syntax puts it
in backticks — which is what a page showing syntax does anyway. This document is
the first such page and needs nothing special.

That property also covers the corpus wholesale: every `tb`, `js`, `yaml`,
`json`, `c`, `html`, `xml`, `sql` and `batch` sample is immune without a rule
being written for it.

**Measured, not assumed.** A prototype rule run through this repository's own
`createMarkdownIt` — the real plugin stack, not a bare markdown-it:

| input | result |
|---|---|
| `{{tbdocs:pages}}` in prose | substituted (`908`) |
| the same in a code span | left literal |
| the same inside a ` ```js ` fence | left literal |
| `{{tbdocs:nope}}` (unknown name) | **left literal** |

The last row is the one that shapes the design. An inline rule that does not
recognise a name returns `false`, and markdown-it then emits the text verbatim —
so the rule cannot, on its own, turn a typo into an error. It would publish
`{{tbdocs:nope}}` to readers. That is why validation belongs on main, ahead of
rendering, rather than in the rule.

## Where it hooks

`createMarkdownIt(ctx)` in [render.mjs](render.mjs) already takes build-derived
data — `linkTables`, `staticFiles`, `vendoredVideos`, `vendoredImages` — and the
render workers receive those through `unpackShared` in
[cpu-worker.mjs](cpu-worker.mjs). A counts object is the same shape and rides
the same channel.

Three touch points, each mirroring `vendoredImages`:

1. **`builder/counts.mjs`** (new) — `deriveCounts(state)` and the plugin.
2. **`createMarkdownIt`** — one `md.use(countPlugin, ctx)` beside the existing
   `videoLinkPlugin` / `remoteImagePlugin` registrations.
3. **`dispatch` → shared payload → `cpu-worker.mjs`** — one field carried
   across, alongside `vendoredImagesObj`.

### Timing

The task graph settles this. `discover`, `nav`, `deriveRedirects` and
`deriveSitemap` all complete before `dispatch` fans out the `render:i` chunks,
so everything derived from the page inventory is available when a page renders.
`deriveCounts` runs on main at `markdownInit`, which already depends on
`discover`.

### Why an inline rule and not a post-render pass

Two reasons, and the second is the one that matters.

Code immunity, as above — an inline rule never fires inside a fence.

And **the book and the search index read `page.renderedContent`**, which is
upstream of the template. `book.mjs` assembles chapters from it and `search.mjs`
indexes it. A substitution done in the template, or as a pass over final HTML in
`flush`, reaches neither — the PDF would carry `{{tbdocs:pages}}` literally and
the search index would tokenise it. Doing it in the markdown render means both
get real values with nothing added for either.

This is the same constraint WIP.md records for `renderSectionLinks`, from the
other direction: that block is emitted from the template *because* it must not
reach the book. A count must, so it goes in the render.

### The repository already has a pre-render string pass, and it demonstrates the hazard

`stripLiquidRawTags` in [render.mjs](render.mjs) runs on raw source before
markdown-it, removing Jekyll's `{% raw %}` / `{% endraw %}` for kramdown parity.
It is a global regex with no awareness of block structure, so it strips those
tags **inside fenced code blocks and code spans too**. Fed a Liquid sample:

````
```liquid
{% raw %}
Hello {{ name }}
{% endraw %}
```
````

what reaches the parser is the fence with both tags gone. **The site therefore
cannot show a literal `{% raw %}` anywhere, including in a code fence**, and
nothing reports it.

That was harmless in practice only because the tags had a single remaining use
— `SendKeys.md`, where they were inert under tbdocs and were removed in
`686910f` with byte-identical rendered output. With zero occurrences left, the
stripper was dead code whose only live effect was to make a `{% raw %}` example
impossible, so it was deleted too. Both the whole-tree diff and the restored
capability were measured: `_site/` came out byte-identical apart from
`BuildInfo.html` and `gantt.svg`, and a fence, a code span and a prose mention
of `{% raw %}` now all survive rendering.

**This is exactly the failure mode a counts pre-pass would have had**, on a
corpus whose subject matter is programming languages. An inline rule cannot
reach into a fence, which is why the substitution is one.

## Failure modes

**An unknown name aborts the build, on main, before any worker renders.**

`markdownInit` has every page's `rawContent` — `discover` keeps it on the page
object. So validation is a scan there, not a throw from inside a worker's inline
rule, and the error can name the file, the line, the unknown name and the
available ones:

```
docs/Documentation/Builder.md:412
  unknown count name {{tbdocs:taskCount}}
  did you mean: tasks?
  available: attributeAnchors, documentationPages, folderStyleIndexes,
             folderStyleSlashPermalinks, packages, pages, redirectStubs,
             referencePages, staticFiles
```

The validator must strip fenced blocks and code spans before scanning, or it
will reject the very examples this document contains. That is the one piece of
real work in the validation path.

**Never silent, never literal.** A placeholder that renders as itself is the
failure this feature exists to prevent, arriving by a new route — a page
publishing `{{tbdocs:pgaes}}` to readers. A placeholder that renders as empty is
worse. Both abort instead.

**A name with no uses is fine** and is not reported. Names are cheap; the
registry is allowed to expose more than the prose currently asks for.

## What this cannot do

**Post-render counts are out of reach.** Anything computed after `dispatch` —
the search index's entry count, per-tree written file counts, the link check's
occurrence totals — is not available when a page renders. Those would need a
second substitution pass over final HTML, which forfeits the book and the search
index, so they are not candidates.

**The book's page count is the notable casualty**, and it is precisely one of
the figures the review found stated four ways. `book.bat` runs `render-book.mjs`
as a separate process *after* the build; the page count does not exist at render
time and cannot.

The fix for that class is a different mechanism, and the repository already has
its shape: `render-book.mjs` writes a small committed stats file, the next build
reads it, and it becomes an ordinary derived name. That is exactly
`builder/inter-metrics.json` — a committed artifact produced by a tool outside
the build loop and consumed inside it. It also answers the review's separate
point that the page-count drift guard needs a previous-build figure to compare
against rather than a floor.

**Worth doing, and not part of this plan.** Recorded here so nobody expects
`{{tbdocs:bookPages}}` to fall out of Phase 1.

## Phases

**Phase 1 — mechanism.** `counts.mjs` with `deriveCounts` and the inline-rule
plugin; the field threaded through `dispatch` to the workers; main-thread
validation at `markdownInit` with fence and code-span stripping. Two names only
(`pages`, `packages`), used nowhere, to keep the diff about the mechanism.

**Phase 2 — the name set.** Fill out the registry from the table above, each one
a derivation with a comment saying what it counts and why that is the right
definition. No prose changes yet.

**Phase 3 — conversion.** Replace the hand-written figures at the call sites the
review named, one commit per page, checking each rendered value against what the
prose said. A disagreement is a finding, not a merge conflict: it means the
number was already wrong, and that should be recorded rather than quietly
corrected.

**Phase 4 — documentation.** `Authoring.md` gets the syntax and the rule that a
name must be derived; `Builder.md` gets the registry in its module tour;
`Extending.md` gets adding a name as a fourth extension point, which the review
noted it is missing for checks too.

## Open questions

- **Formatting.** `908` or `908` with separators? `Tools.md` writes `1,638` and
  `Fixes-PagedJS.md` wrote `1651`; the site is inconsistent today. Options are a
  single canonical format, or a suffix form (`{{tbdocs:pages:plain}}`). A suffix
  is more syntax for a small gain and should be resisted unless a real call site
  needs it.
- **Spelled-out numbers.** `WIP.md` and the published prose both prefer words
  for small counts — "thirteen packages", "three gates". A substitution always
  yields digits, so converting those call sites changes the register of the
  sentence. Probably: leave spelled-out numbers alone, and only convert figures
  already written as digits.
- **Scope beyond counts.** Nothing in the mechanism is specific to integers;
  `{{tbdocs:defaultBranch}}` would work identically. Resist for now — a value
  that is not a count has no obvious derivation and reopens the constants trap.
- **Whether the a11y sample size belongs here.** `check_a11y.mjs`'s thirteen
  pages are named in prose in several places, but that list lives in
  `scripts/lib/axe-scan.mjs`, outside the build. It would need the same
  committed-artifact treatment as the book page count.

## See also

- [PLAN-checks.md](PLAN-checks.md) — the link checker's move into the task
  graph, and the precedent for adding work to `flush` rather than re-reading the
  tree.
- [PLAN-sab-pull-scheduler.md](PLAN-sab-pull-scheduler.md) — why a barrier must
  list every chunk task in `expected`, which constrains any future fan-out here.
- [../WIP.md](../WIP.md) — the maintainer notes this plan's motivating examples
  are drawn from.
