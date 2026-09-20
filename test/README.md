# Test fixtures

There is no test runner here and no `npm test` --- `package.json` declares no `scripts`
at all. Everything under `test/` is input for [`scripts/check_links_diff.mjs`](../scripts/check_links_diff.mjs),
the harness that proves the repository's two link-checker implementations agree.

## Why this exists

The link and integrity check has two front ends over one core
([`builder/link-check.mjs`](../builder/link-check.mjs)):

- the **build's own** fused check, reached with `tbdocs --check`, which walks each tree's
  HTML on the worker lane that produced it; and
- the **standalone** [`scripts/check_links.mjs`](../scripts/check_links.mjs), for a tree
  the build did not produce --- a release zip, a bisect, someone else's artifact.

Two implementations of one check is exactly the shape that rots quietly, because **a
checker that silently checks less reports a clean pass.** `check_links_diff.mjs` runs both
over the same bytes and diffs their findings category by category.

On a healthy site that comparison is nearly worthless: the real tree is clean, so both
sides return empty in eight of the nine categories and the harness reports agreement
between two things that found nothing. The fixtures exist to give it something to disagree
about.

## The two fixture cases

| Case | What it is | Which sides it can compare |
|---|---|---|
| `fixture` | A directory of raw HTML, synthesised at runtime inside `check_links_diff.mjs` (no files on disk). | `script` vs `index` --- the standalone checker under two different existence oracles. |
| `fixture-built` / `fixture-built-offline` | `check-src/`, a real **tbdocs source tree** that the harness builds with `tbdocs` before checking. | `script` vs `fused` --- the only way the build's own checker can be held to the comparison at all, since it has nothing to say about a tree it did not write. |

`check-src/` is therefore a minimal but genuine site: `_config.yml`, three content pages,
a favicon, and placeholder CSS/JS/font files that the page template references
unconditionally. Each content page deliberately provokes faults:

| File | Provokes |
|---|---|
| `index.md` | a link to a page that does not exist (`/Nope`), an existing page with a nonexistent fragment (`Kitchen#no-such-section`), and a `https://docs.twinbasic.com/...` link --- which is legitimate on the online tree and **forbidden** on the offline one, so it exercises `--forbid` on exactly one side. One valid link is there as a control. |
| `Kitchen.md` | every integrity category in one page: two elements sharing an `id`; a remote `<img>` with no `alt` (one a11y finding *and* one remote-asset finding); an `<a href="#">` with no accessible name; an empty `href`; a `<div>` inside a `<p>`; and a second `<link rel="canonical">` later in the document than the template's own --- which breaks twice, once as a wrong canonical and once as a link to a page that does not exist. |
| `Weird.md` | `permalink: /Weird-index.html` --- a permalink ending in the literal text `index.html` with no preceding slash. It holds the sitemap and search cross-checks to their claim that both sides normalise such a URL identically, so this page must **not** be reported missing from either index. |

`Kitchen.md`'s `<div>`-inside-`<p>` case is worth reading before changing it: htmlparser2
auto-closes the `<p>` the moment the `<div>` opens, so the finding is
`html-closed-early: <p>` rather than the mis-nesting shape you might expect. The note
beside `FIXTURE_EXPECTED` explains why the other shape is unreachable through this parser.

The placeholder assets (`favicon.png`, `assets/js/theme-toggle.js`,
`assets/css/*`, `assets/fonts/*.woff2`) are stubs, not real files. The checker only tests
that a target **exists**, so a four-byte file is enough. They exist solely so that markup
the template emits on every page does not register as a fault the fixture never meant to
provoke.

## Running it

The build output lands in `test/fixtures/_out`, `_out-offline`, `_out-pdf` and `_out.json`,
all gitignored. The two invocations are the ones CI runs:

```sh
node scripts/check_links_diff.mjs --case fixture --a script --b index
node scripts/check_links_diff.mjs --case fixture-built --case fixture-built-offline --a script --b fused
```

Both are steps in `.github/workflows/checks.yml` (the pull-request workflow). Neither runs
in `tbdocs-gh-pages.yml`, which keeps only the cheaper `fixture` case, and neither is in
`check.bat` --- the standalone side costs a few seconds, which is the entire saving of
having folded the check into the build. Run them locally after touching
`builder/link-check.mjs`, `builder/check.mjs` or `scripts/check_links.mjs`.

`--self-test` is a third mode: it diffs the reference implementation against a
deliberately corrupted copy of itself and fails unless the difference is reported.
Everything else the harness prints reduces to "the two sides agreed", which is also what a
harness comparing nothing says.

## The invariant, and how it breaks

> [!IMPORTANT]
> **The expected finding count per category is hard-coded, and the fixture must keep
> provoking exactly those counts.** `FIXTURE_EXPECTED`, `FIXTURE_BUILT_ONLINE` and
> `FIXTURE_BUILT_OFFLINE` in `scripts/check_links_diff.mjs` are asserted after every run,
> so a fixture that stops provoking a category fails loudly instead of quietly going back
> to comparing empty against empty.
>
> Editing anything under `check-src/` therefore means updating those constants in the same
> commit.

**The subtler failure is that you do not have to touch `check-src/` to break it.** The
fixture is built by the real `tbdocs`, so anything the page template emits on every page
lands in the fixture's pages too. Adding self-hosted fonts put two
`<link rel="preload" href="/assets/fonts/...">` tags on every page; `check-src/` had no
`assets/fonts/`, so its `broken` count went from 3 to 9 and this gate went red --- in a
commit that touched neither the fixture nor the checker.

That is why the fixture carries stub CSS, JS and font files. When a template change
introduces a new unconditional reference, the fix is almost always **to add the stub the
template now expects**, not to raise the expected count: six accidental broken links
dilute a category the fixture is supposed to hold at an exact, meaningful number.
