# PLAN-10: Phase 10 — CUTOVER (Jekyll retirement + integrity checker)

The cutover phase. Read this together with [PLAN.md](PLAN.md)
(architecture overview), [PLAN-9.md](PLAN-9.md) (the QoL pass that
unblocks the cutover), and FUTURE-WORK.md §C1 (the original
cutover sketch that this plan expands).

Phase 10 has one job: **retire Jekyll as the production build path
and replace the verify-phase{1..8}.mjs harnesses with an expanded
site-integrity checker**. After Phase 10 lands, `bundle exec
jekyll build` no longer runs anywhere -- not in CI, not in
`build.bat`, not in any developer workflow. The byte-vs-Jekyll
acceptance bar that gated Phases 3-9 is gone; tbdocs is the
canonical build tool.

What Phase 10 does NOT do:

- Change build-output bytes. The cutover swaps the *invocation*
  (`bundle exec jekyll build` → `node ../builder/tbdocs.mjs`); the
  output of `_site/` after the swap is the output tbdocs produces
  today, which is already byte-equivalent to Jekyll modulo
  accepted-divergences. Items that intentionally change build
  output (Shiki theming from `.twin`, mermaid auto-gen, copy-code
  SSR, etc.) are **Phase 11** territory.
- Delete the Jekyll source set (`docs/_plugins/`, `docs/_includes/`,
  `docs/_layouts/`, `docs/_sass/`, `docs/Gemfile`, `docs/Gemfile.lock`)
  in the same commit as the cutover. Those stay in tree for one
  release cycle as reference, then drop in a follow-up cleanup
  commit (§5.8). Rationale: gives the team a fast rollback path
  for the first ~2 weeks.
- Touch `docs/_config.yml` more than necessary. Some keys are read
  by tbdocs (`url`, `baseurl`, `title`, `also_build_offline`,
  `also_build_pdf`, `offline_exclude`); the Jekyll-only keys stay
  as harmless ballast until the follow-up cleanup commit.
- Address Phase 11 items even when convenient. Don't slip in
  output changes "while we're in there".

Target wall-clock impact: zero on the build (the cutover swaps
which tool produces the same output bytes). The site-integrity
checker is a separate process invoked from `check.bat`; it adds
~3-5 s to `check.bat` on the current tree (vs the current
`check_links.mjs` baseline of ~2.2 s × 2 passes = ~4.4 s).

## Status: planned

---

## 1. Inputs

The Phase 9 end-state at HEAD: all eight `verify-phase{1..8}.mjs`
harnesses clean for at least three consecutive runs on the
production tree, Phase 9's QoL items shipped, FUTURE-WORK.md
routings up to date.

Specifically required:

- `node builder/tbdocs.mjs && diff -rq docs/_site/ docs/_site-new/`
  reports only the documented accepted-divergence entries.
- `check.bat` (current Phase 9 form) is clean (zero broken links,
  zero forbidden-prefix matches).
- The eight `verify-phase{1..8}.mjs` harnesses each report PASS on
  the production tree.
- `node builder/_audit_accepted.mjs` (the Phase 9-shipped
  multi-divergence audit) reports no unexpected secondary
  divergences.

If any of those fails, **stop** and fix before starting Phase 10.
The cutover is not a fix-forward operation.

---

## 2. Outputs

Phase 10 changes the invocation surface and the verification
surface; it does not change build output. Outputs are:

- **Cutover edits** to [tbdocs.mjs](tbdocs.mjs) (default destination
  flip), [docs/build.bat](../docs/build.bat) /
  [docs/serve.bat](../docs/serve.bat) /
  [docs/check.bat](../docs/check.bat), and
  [.github/workflows/jekyll-gh-pages.yml](../.github/workflows/jekyll-gh-pages.yml).
- **Eight deletions**: `builder/verify-phase{1..8}.mjs` and the
  triage tools that anchor on Jekyll comparison
  (`builder/_diff.mjs`, `builder/_diff_all.mjs`,
  `builder/_triage.mjs`, `builder/_audit_accepted.mjs`,
  `builder/_sitemap_diff.mjs`, `builder/_spot.mjs`,
  `builder/accepted-divergences.mjs`). See [§7.D2](#71-decision-record)
  for why all eight harnesses retire together rather than rolling
  off one by one.
- **One expanded checker**: [scripts/check_links.mjs](../scripts/check_links.mjs)
  grows into a site-integrity checker (HTML well-formedness,
  duplicate-`id`, anchor resolution, heading hierarchy, sitemap /
  search-index completeness). Renamed in-place is NOT done -- file
  stays `check_links.mjs` for backward compat; the new flags
  (`--check-html`, `--check-a11y`, `--check-ids`, `--check-sitemap`,
  `--check-search`) gate the new checks. `check.bat` is updated to
  invoke all of them by default.
- **Rewritten `WIP.md` "JS builder port" section**: from the
  current "shipped, Phase 9 cleanup" form into a permanent "Build
  pipeline" section that documents `builder/` as the only build
  path and points at PLAN.md.
- **Follow-up commit** (separate, ~2 weeks later): deletion of
  `docs/_plugins/`, `docs/_includes/`, `docs/_layouts/`,
  `docs/_sass/`, `docs/Gemfile`, `docs/Gemfile.lock`, the
  Jekyll-only keys in `docs/_config.yml`, the `_profile/` toolchain,
  any `docs/scripts/*` that was Jekyll-specific.

---

## 3. Module split

```
builder/
  tbdocs.mjs                 -1 / +1. Default dest flips from
                             `_site-new` to `_site` at line 71.
  verify-phase{1..8}.mjs    DELETED (8 files, ~3,200 lines).
  _diff.mjs                 DELETED. Anchored on Jekyll comparison.
  _diff_all.mjs             DELETED. Same.
  _triage.mjs               DELETED. Same.
  _audit_accepted.mjs       DELETED. Same.
  _sitemap_diff.mjs         DELETED. Same.
  _spot.mjs                 DELETED. Single-page dump used in
                             concert with the diff tools; loses
                             its primary use case.
  accepted-divergences.mjs  DELETED. The allow-list only made sense
                             as input to the verify harnesses.
  PLAN.md                   Status header + Build Phases table
                             updates (Phase 10 → shipped).
  PLAN-10.md                (this file)
  FUTURE-WORK.md            C1 marked shipped; Phase 11 entries
                             stay as-is.

docs/
  build.bat                 Rewrite. `bundle exec jekyll build`
                             → `node ..\builder\tbdocs.mjs`.
  serve.bat                 Rewrite. `bundle exec jekyll serve`
                             → (see §5.3 for the serve story --
                             tbdocs has no watcher; serve.bat
                             either runs a one-shot build then a
                             plain HTTP server, or invokes a new
                             watcher).
  check.bat                 Rewrite. Add the new check-flag set
                             after the existing link-check
                             invocation.
  WIP.md                    Rewrite the "JS builder port" section.

scripts/
  check_links.mjs           +400 lines. New checks (HTML
                             well-formedness, duplicate-id,
                             heading hierarchy, sitemap /
                             search-index completeness, alt
                             attributes).

.github/workflows/
  jekyll-gh-pages.yml       Rewrite or rename. Stop calling
                             actions/jekyll-build-pages; install
                             Node and call tbdocs. See §5.4.
```

The follow-up commit deletes the Jekyll source set; that's tracked
in [§5.8](#58-jekyll-source-set-deletion-follow-up-commit) and
NOT included in the line-delta numbers above.

---

## 4. Implementation order

The cutover is one logical operation but lands as a sequence of
git commits so that any single commit can be reverted cleanly. The
order matters because some steps depend on others (CI swap depends
on the tbdocs.mjs default flip, etc.).

| Commit | Substep | Verifies by |
|---|---|---|
| 1 | §5.1 pre-flight + new integrity-checker checks land first | Run new checks against current `_site/` (Jekyll output); zero regressions. Tests-first; integrity additions live in tree before they're needed. |
| 2 | §5.2 default destination flip in `tbdocs.mjs` | `node builder/tbdocs.mjs` (no `--dest`) writes to `_site/`; existing `--dest <path>` still works. |
| 3 | §5.3 script swap (`build.bat` / `check.bat` / `serve.bat`) | Manual smoke: `build.bat` runs tbdocs; `check.bat` runs the expanded checker; `serve.bat` serves the result. |
| 4 | §5.5 verify-harness retirement | `ls builder/verify-phase*.mjs` empty; `ls builder/_*.mjs` empty (modulo the keepers); `accepted-divergences.mjs` gone. |
| 5 | §5.4 CI swap (`.github/workflows/`) | PR build succeeds on the cutover branch before merging. |
| 6 | §5.7 WIP.md rewrite | `check.bat` clean (no broken inbound links to the rewritten section). |
| 7 | §5.8 Jekyll source set deletion | **Follow-up commit, ~2 weeks later.** Verify by `bundle exec jekyll build` no longer working (expected) and tbdocs build still clean. |

Commits 1-6 are the cutover proper; commit 7 is the cleanup that
gates on confidence accumulated from production use.

### Commit policy

One commit per row above (six commits + the deferred seventh).
Each commit must independently produce a working build before the
next starts -- a broken intermediate makes the cutover dangerously
hard to bisect if production breaks. Hook enforcement stays as
PLAN-9 set it: **no `--no-verify`**.

The CI swap (commit 5) is the riskiest -- it's the one that
exercises the actual GitHub Pages deploy path. Land on a branch
first, confirm the preview deploys correctly, then merge to main.

---

## 5. Per-substep specifications

### 5.1. Pre-flight checks

Run before opening the first cutover commit:

```sh
cd D:/OCP/wc/twinBASIC-documentation
node builder/verify-phase1.mjs && \
node builder/verify-phase2.mjs && \
node builder/verify-phase3.mjs && \
node builder/verify-phase4.mjs && \
node builder/verify-phase5.mjs && \
node builder/verify-phase6.mjs && \
node builder/verify-phase7.mjs && \
node builder/verify-phase8.mjs && \
node builder/_audit_accepted.mjs && \
cd docs && check.bat
```

All must succeed. Repeat three times across a 24-hour window; any
single failure resets the count. The reason for the wait + repeat
is to catch any flakiness in the comparison harnesses that might
mask a real regression -- once the harnesses are deleted, that
class of bug is unreachable.

**If a regression surfaces**: stop. Bisect against PLAN-9 commits.
Fix forward before resuming the cutover. The Jekyll-vs-tbdocs
diff is the only signal that catches certain classes of
regression (e.g. a markdown-it plugin update changing output
shape); losing it before achieving steady-state is the failure
mode this gate prevents.

### 5.2. Default destination flip

[tbdocs.mjs:71](tbdocs.mjs:71) currently reads:

```js
const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site-new"));
```

Change to:

```js
const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site"));
```

Update the comment block at [tbdocs.mjs:68-70](tbdocs.mjs:68) to
remove the "during the port" / "flip the default in one place
when the cutover happens" notes -- the cutover has happened.

Existing `--dest <path>` and `--dest=<path>` invocations stay
working unchanged (Phase 5 / Phase 6 acceptance contract).

**Migration concern**: existing `_site-new/` directories on
developer machines become stale. `.gitignore` already excludes
both `_site/` and `_site-new/`; the recommended cleanup is `rm -rf
docs/_site-new/` in a developer's first sync after the flip. Note
this in the WIP.md rewrite (§5.7).

### 5.3. Script swap (.bat files)

[docs/build.bat](../docs/build.bat) currently:

```bat
bundle exec jekyll build --trace
```

Becomes:

```bat
cd /d "%~dp0"
node ..\builder\tbdocs.mjs --src .
```

The `cd /d "%~dp0"` ensures the script works regardless of the
caller's working directory (matches Jekyll's behavior with
`--source .`). `--src .` because the script lives in `docs/`.

[docs/check.bat](../docs/check.bat) -- expand the existing
invocation to include the new integrity flags (full set documented
in §5.6):

```bat
cd /d "%~dp0..\"
node scripts/check_links.mjs --offline --include-fragments ^
    --check-html --check-a11y --check-ids ^
    --check-sitemap --check-search ^
    --fallback-extensions html --index-files "index.html,." ^
    --root-dir docs/_site docs/_site /sep/ ^
    --offline --include-fragments ^
    --check-html --check-a11y --check-ids ^
    --forbid "https://docs.twinbasic.com" ^
    --fallback-extensions html --index-files "index.html,." ^
    --root-dir docs/_site-offline docs/_site-offline
```

The offline pass skips `--check-sitemap` / `--check-search` (the
offline tree doesn't have a sitemap; search-data is JS-wrapped, a
different shape).

[docs/serve.bat](../docs/serve.bat) -- tbdocs has no watcher
([§7.D4](#71-decision-record)). The serve story is: build once,
then run a plain HTTP server. Use Node's built-in:

```bat
cd /d "%~dp0"
node ..\builder\tbdocs.mjs --src .
npx --yes http-server _site -p 4000 -c-1
```

`-c-1` disables caching so edits are visible on reload (after
rebuild). Developers iterating on content re-run `build.bat`
manually; iterators on the builder itself spawn a second terminal
and re-run as needed. Document in WIP.md (§5.7) that watch-mode
isn't supported and is a Phase 11+ consideration if anyone wants
it (see [§7.D4](#71-decision-record)).

### 5.4. CI swap (`.github/workflows/`)

The repo's GitHub Pages workflow currently uses
`actions/jekyll-build-pages`. Replace with a Node-based build:

```yaml
name: Build & deploy docs

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
        working-directory: builder
      - run: node builder/tbdocs.mjs --src docs
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/_site

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

Rename the workflow file from `jekyll-gh-pages.yml` to
`pages.yml` for clarity, OR keep the filename and just rewrite
contents. ([§7.D5](#71-decision-record)).

**Test on a branch first** -- the cutover commit pushes to a
branch with this workflow, the build runs, and the preview URL
loads correctly. Only then merge to main.

### 5.5. Verify-harness retirement

Delete in one commit:

- `builder/verify-phase1.mjs`
- `builder/verify-phase2.mjs`
- `builder/verify-phase3.mjs`
- `builder/verify-phase4.mjs`
- `builder/verify-phase5.mjs`
- `builder/verify-phase6.mjs`
- `builder/verify-phase7.mjs`
- `builder/verify-phase8.mjs`
- `builder/_diff.mjs`
- `builder/_diff_all.mjs`
- `builder/_triage.mjs`
- `builder/_audit_accepted.mjs`
- `builder/_sitemap_diff.mjs`
- `builder/_spot.mjs`
- `builder/accepted-divergences.mjs`

These all anchor on Jekyll comparison. Once the cutover removes
Jekyll, they have no reference to diff against. Keeping them
without the reference would silently rot; deleting is cleaner
than half-life decay.

The `one-offs/` directory (12 dev-test scripts) stays untouched
-- Phase 9 §8.4 explicitly ruled it out of scope for the cleanup
pass.

**Update PLAN.md, PLAN-{1..9}.md cross-references**: the per-phase
plans reference their harnesses (e.g. PLAN-3.md §10 names
`verify-phase3.mjs`). Grep for `verify-phase` across all PLAN-*.md
and replace with notes that the harnesses retired in Phase 10
(historical reference only; do not link to dead files).

### 5.6. Site-integrity checker expansion

The largest substep. Extends
[scripts/check_links.mjs](../scripts/check_links.mjs) (currently
~400 lines, uses htmlparser2 SAX walker, worker-thread parallel
passes) with five new check categories. Each is gated behind a
CLI flag; the existing link-check behaviour is preserved when no
new flags are passed.

**New flags:**

| Flag | What it checks |
|---|---|
| `--check-html` | HTML well-formedness: unclosed tags, mismatched closes, malformed attributes. |
| `--check-a11y` | `<img>` missing `alt`, empty `<a>` tags, empty `href` attributes. |
| `--check-ids` | Duplicate `id="..."` attributes on the same page. |
| `--check-sitemap` | Every page in `_site/` is in `sitemap.xml` (or has `sitemap: false` frontmatter). |
| `--check-search` | Every page in `_site/` is in `assets/js/search-data.json` (or has `search_exclude: true` frontmatter, when that lands in tbdocs). |

The existing `--include-fragments` flag already handles anchor
resolution (every `#fragment` resolves to a real `id` on the
target). Stays as-is; documented under "checks we already had".

#### Per-check implementation notes

**`--check-html` (HTML well-formedness):**

Already half-implemented because htmlparser2 is the SAX engine.
Hook the parser's error callback:

```js
const parser = new Parser({
  onerror(err) { reportHtmlError(file, err); },
  // ... existing handlers
});
```

Extend the existing `onopentag` / `onclosetag` handlers to track a
stack of open tags (excluding HTML5 void elements -- `<br>`,
`<hr>`, `<img>`, `<input>`, `<meta>`, `<link>`, `<area>`,
`<base>`, `<col>`, `<embed>`, `<param>`, `<source>`, `<track>`,
`<wbr>`). On `onclosetag`, pop and verify the closing tag matches
the top of the stack; flag mismatches. On `onend`, flag any
remaining open tags as unclosed.

htmlparser2 in its default mode is lenient (it auto-closes / auto-
opens to recover from malformed HTML). For strict checking, pass
`{ recognizeSelfClosing: false }` (XHTML-style self-closing
disabled) and rely on the void-element list. ([§7.D6](#71-decision-record))

**`--check-a11y` (accessibility basics):**

In the existing `onopentag(name, attribs)` handler:

```js
if (name === "img" && !attribs.alt && attribs.alt !== "") {
  reportA11y(file, "img missing alt", attribs.src);
}
```

`alt=""` (empty alt) is **valid** for decorative images -- only
flag when the attribute is entirely absent.

For empty `<a>`: track between `onopentag("a", ...)` and the
corresponding `onclosetag("a")`; accumulate text via `ontext`. If
the accumulated text after trim is empty AND there's no child
`<img>` with non-empty alt, flag.

For empty `href`: in the existing link-extraction handler,
`href === ""` is currently treated as "no link"; promote to a
warning under `--check-a11y`.

**`--check-ids` (duplicate IDs):**

Per file, build `Map<id, count>`:

```js
const ids = new Map();
parser.on("onopentag", (name, attribs) => {
  if (attribs.id) {
    ids.set(attribs.id, (ids.get(attribs.id) ?? 0) + 1);
  }
});
parser.on("onend", () => {
  for (const [id, count] of ids) {
    if (count > 1) reportDuplicateId(file, id, count);
  }
});
```

Critical because the auto-TOC plugin (PLAN-3 §5.8) and the
just-the-docs sidebar both link via `#fragment` -- duplicate IDs
break navigation silently.

**`--check-sitemap` (cross-page completeness):**

One-shot pre-pass (not per-file): parse `_site/sitemap.xml`,
collect the URL set, walk `_site/` for `.html` files, flag any
HTML file whose canonical URL isn't in the sitemap. Pages with
`sitemap: false` frontmatter are expected to be absent; build a
set of those from the frontmatter cache (currently captured by
Phase 1 / Phase 2). For the cutover, hardcode the one known
case: `book.html`.

This check **requires** access to the discovered-pages set OR a
parse of `docs/` frontmatter. The cleanest option: have the
integrity checker spawn `node builder/tbdocs.mjs --discover-only`
(a new mode that prints the page-frontmatter set as JSON). Adds
a small tbdocs.mjs change; gated on whether the user wants the
coupling.

Alternative: have `check.bat` invoke `tbdocs.mjs` first, save
the page set to a temp JSON, then pass that path to
`check_links.mjs --check-sitemap=/tmp/pages.json`.

Pick the alternative for the first cut; it keeps `check_links.mjs`
independent of the builder.

**`--check-search` (search-index completeness):**

Same shape as `--check-sitemap`: pre-pass parses
`_site/assets/js/search-data.json`, collects the URL set, diffs
against the HTML-file set. The current search-data.json includes
every page that has a non-empty title and isn't explicitly
excluded; the check codifies that contract.

#### CLI surface and `--help`

The existing `--help` output gets a new "Integrity checks"
section listing the five new flags. Default behaviour (no flags)
preserves the current link-only check for backward compat.

#### Performance budget

Current `check_links.mjs` runs in ~2.2 s per pass. The new
checks add (estimated):

- `--check-html`: +500 ms (per-page parse + tag-stack tracking;
  htmlparser2 is already in the hot path so the marginal cost is
  small)
- `--check-a11y`: +200 ms (per-attr scan, same htmlparser2 pass)
- `--check-ids`: +300 ms (per-page Map alloc + check)
- `--check-sitemap`: +50 ms (one parse, one diff)
- `--check-search`: +100 ms (parse 2.8 MB JSON, build URL set,
  diff)

Total: ~3.2 s expected, vs 2.2 s baseline. ~45% slower per pass
but still under 5 s, well within `check.bat`'s acceptable range.

### 5.7. WIP.md rewrite

The current WIP.md section "## JS builder port (shipped, Phase 9
cleanup)" describes a tool that's still being adopted. After
cutover it's the canonical build pipeline. Rewrite to:

```markdown
## Build pipeline

The site builds via [builder/](builder/), a custom Node.js static
site generator. See [builder/PLAN.md](builder/PLAN.md) for the
architecture overview and [builder/README.md](builder/README.md)
for the quickstart.

[... existing "Builder diff / triage / verify tools" subsection
gets PRUNED to remove the deleted tools; keep references to
`one-offs/` and anything that survived Phase 10. ...]

### Historical note

The site was originally built with Jekyll + just-the-docs. The
Jekyll source set (`docs/_plugins/`, `docs/_includes/`,
`docs/_layouts/`, `docs/_sass/`, `docs/Gemfile`) was retired in
the Phase 10 cutover commit; the directories were kept for one
release cycle as reference and then deleted in a follow-up
cleanup commit. Search the git log for `Phase 10` to find both
commits.

### Migration notes

- `_site-new/` is no longer used. Run `rm -rf docs/_site-new/`
  on first sync after the cutover.
- The eight `verify-phase{N}.mjs` harnesses were retired in the
  same cutover commit. Regression detection now relies on
  `scripts/check_links.mjs` (expanded into a site-integrity
  checker; see [docs/check.bat](docs/check.bat)).
```

### 5.8. Jekyll source set deletion (follow-up commit)

**Sequenced**: ~2 weeks after the cutover commit (commits 1-6
above) lands on `main`. Gates on a clean fortnight of production
deploys -- if any rollback was needed, the Jekyll source is still
in tree to fall back to.

Deletions:

- `docs/_plugins/` (every `.rb` file plus the per-plugin `.md`
  writeups -- offline.md, pdfify.md, html-compress.md, etc.)
- `docs/_includes/` (Liquid templates)
- `docs/_layouts/` (Jekyll layouts)
- `docs/_sass/` (theme overrides + project SCSS)
- `docs/Gemfile`, `docs/Gemfile.lock`
- `docs/_profile/` (rbspy / ruby-prof tooling; Jekyll-only)
- `docs/scripts/extract_theme_colors.py` (the Rouge-class mapper
  -- Phase 11 replaces with `.twin`-source-driven theme gen)
- `docs/.jekyll-cache/` if present (gitignored; sanity-check
  delete)

**Keep**:

- `docs/_config.yml` (tbdocs reads several keys; the Jekyll-only
  keys are harmless ballast -- left for a separate config-clean
  pass)
- `docs/assets/css/`, `docs/assets/js/` (theme assets; their
  builder/assets/ copies are derived from these)
- `docs/scripts/check_links.mjs` (the integrity checker; Phase 10
  already extended it)
- All `docs/Reference/`, `docs/Features/`, `docs/Tutorials/`,
  etc. (content; obviously)

**Verification of the deletion commit**: `node builder/tbdocs.mjs`
still produces the same `_site/` output; `check.bat` still clean.
If either fails, **revert immediately** -- the cutover commit
itself is what landed the swap; the deletion is just cleanup.

### 5.9. Rollback plan

If the cutover breaks production after merge:

1. `git revert` the merge commit (commits 1-6 land as one PR;
   reverting the merge restores Jekyll as the build path).
2. Manually restore `_site/` from the last successful Jekyll
   build artifact (saved by the old workflow).
3. Trigger a re-deploy from the reverted state.
4. Diagnose; fix forward on a branch; re-attempt the cutover.

For commit 7 (the deferred Jekyll source set deletion): same shape
but easier -- the source files come back via `git revert`; no
production artifact restore needed.

The cutover commits should land as a single PR (not commit-by-
commit to main) so the revert path is one click. Branch lifetime:
~3-5 days for review; ~10 minutes of attention post-merge to
confirm production deploys cleanly.

---

## 6. Site-integrity checker design

(Expanded design notes for §5.6. Skip this section if you're not
implementing the integrity tool.)

### 6.1. Architectural choice: extend vs sibling

The existing [scripts/check_links.mjs](../scripts/check_links.mjs)
already:

- Parses every HTML file in `_site/` via htmlparser2 SAX
- Runs in worker threads (one per `/sep/`-separated argument set)
- Has a strict mode (`--forbid` prefix matching)
- Reports broken links / fragments cleanly

The new checks share the parse pass. Extending in-place is ~5×
cheaper than a sibling script -- the sibling would re-parse every
file. Decided: extend.

The downside is `check_links.mjs` grows from ~400 lines to ~800
lines and stops being a "links" tool. Acceptable because:

- It's still called `check_links.mjs` (no rename for backward
  compat); the new behaviour is opt-in via flags
- The default invocation (`check.bat`) calls it with all flags;
  developers running it ad-hoc opt into what they care about

### 6.2. Check categories not in Phase 10

Considered but **not** added:

- **Heading-hierarchy skips** (h1 → h3 with no h2). Useful but
  noisy on the current corpus; would require an allow-list to
  not fail the build on legitimate Reference/<symbol>.md pages
  where the H1 is the symbol name and the next heading is H3
  (Example, See Also). Defer to a follow-up if the value
  emerges.
- **No literal em-dash / en-dash in `docs/**/*.md`**. The WIP.md
  "Don'ts" rule. Already enforced by `scripts/convert_em_dash_separators.py`
  on demand; pre-commit hook would be the right home, not the
  integrity checker.
- **`parent:` / `grand_parent:` frontmatter resolves**.
  `builder/nav.mjs`'s integrity check already aborts the build on
  ambiguous / orphan parent references during Phase 2.
- **No orphaned pages** (pages reachable from no nav parent). Hard
  to define in a way that doesn't flag legitimate one-off pages.
  Skip.
- **Frontmatter required fields present**. Phase 1's discover step
  already drift-guards (warns when page count drops below 836);
  field-level required-fields validation would belong in
  `discover.mjs`, not `check_links.mjs`.

### 6.3. Output format

Match the existing per-error format. Each new check emits:

```
<filename>:<id-or-empty>: <category>: <message>
```

E.g.:

```
docs/_site/tB/Core/Const.html:duplicate-id: 'example' appears 3 times
docs/_site/Features/index.html:img-missing-alt: src=Images/screenshot.png
docs/_site/index.html:unclosed-tag: <div class="page-wrap"> never closed
```

Group by file in the summary; print the per-check totals at the
end.

### 6.4. Exit code convention

- 0: all checks passed.
- 1: link check failed (existing behaviour).
- 2: integrity check failed (new categories). Distinct so CI can
  differentiate "broken link" from "malformed HTML".

The existing single-exit-code model is simpler but loses
classification; the user can decide whether the distinction is
worth the slightly more complex CI logic. Defaulting to distinct
for the first cut.

---

## 7. Design decisions and assumptions

### 7.1. Decision record

| ID | Decision | Why |
|---|---|---|
| D1 | Cutover lands as one PR (commits 1-6 squashed or as a merge commit) rather than commit-by-commit to main | Single-click revert if production breaks. The cost of squashing the per-commit detail is acceptable because the per-commit detail is mostly mechanical (file renames, default flips). |
| D2 | All eight verify-phase harnesses retire in the same commit (commit 4 above), rather than rolling off as Jekyll deletes one file at a time | The harnesses share the same accepted-divergences input and diff against the same `_site/` reference. Phasing the retirement would force per-harness retirement logic that's more work than just doing it once. |
| D3 | The site-integrity checker extends `check_links.mjs` in-place rather than spawning a sibling script | The new checks share the htmlparser2 SAX parse pass with the existing link extraction. A sibling would re-parse every file (~5× cost). Filename stays `check_links.mjs` for backward compat. |
| D4 | tbdocs has no watch mode; `serve.bat` does one-shot build + plain HTTP server | A watcher requires file-change detection + incremental rebuild infrastructure that's a phase of its own. Out of scope for Phase 10. Developers iterate via re-running `build.bat`. |
| D5 | The CI workflow filename stays `jekyll-gh-pages.yml` (rewritten contents) or renames to `pages.yml` (implementer's call) | Either is fine. Renaming makes the new contents discoverable; keeping the old name preserves git history visibility. Implementer picks; not load-bearing. |
| D6 | `--check-html` uses htmlparser2's lenient default mode + explicit void-element handling, NOT strict mode | htmlparser2's strict mode (recognizeSelfClosing) is XHTML-style; our HTML5 output expects bare `<br>` etc. The lenient mode + manual void-element handling matches HTML5 spec. |
| D7 | The integrity checker's `--check-sitemap` / `--check-search` consume a pre-computed page set from a temp JSON, NOT a live spawn of `node builder/tbdocs.mjs` | Keeps `check_links.mjs` independent of the builder. `check.bat` orchestrates the temp-file dance. |
| D8 | The Jekyll source set deletion is deferred to a separate follow-up commit ~2 weeks after the cutover | Gives the production deploy time to settle. If a rollback is needed, the Jekyll source is in tree to fall back to. The deletion commit is mechanical; the cutover commit is the one that carries risk. |
| D9 | Accepted-divergences.mjs deletes entirely (not repurposed for regression testing) | The user chose "retire harnesses" over "pivot to regression testing"; the divergence allow-list has no consumer after the harnesses retire. The integrity checker doesn't need it. |
| D10 | The `_audit_accepted.mjs` tool retires alongside the verify harnesses | Same input dependency (`accepted-divergences.mjs`). No standalone use. |
| D11 | Watch-mode + incremental rebuild is explicitly Phase 11+ territory, not Phase 10 | Cutover risk is high enough on its own; adding watch-mode complicates the diff. If a developer asks for watch-mode mid-cutover, defer. |

### 7.2. The one place the cutover does change something

Strictly speaking, the cutover swaps the *invocation tool*, not
the *output*. But two cosmetic deltas:

- The `<meta name="generator">` tag that Jekyll injects is absent
  in tbdocs output -- this was already a documented accepted-
  divergence in Phases 3-9, so it's not a *new* divergence, just
  one that stops being "accepted vs Jekyll" and starts being
  "the output". Note in WIP.md.
- Build timestamps differ. Jekyll stamps `_site/` with the build
  time; tbdocs does too but at a different file path / format.
  The eventual `_site/sitemap.xml` `<lastmod>` field reflects
  tbdocs's wall-clock, same as Jekyll did. No production impact.

Neither warrants a separate phase entry or a new accepted-
divergences category (the file in which they were documented is
about to be deleted).

---

## 8. What's NOT in Phase 10

These belong to Phase 11 (planned next) or are out of scope.

### 8.1. Deferred to Phase 11

All output-changing FUTURE-WORK items:

- **B1 Mermaid `.mmd` auto-regen** — changes SVG bytes.
- **B2 Shiki theming from `.twin` source** — changes per-`<pre>`
  HTML class names and `rouge.css`.
- **B5 Copy-code SSR** — adds `<button>` HTML to every `<pre>`.
- **B10 Search-data minification** — shrinks `search-data.js`.
- **B11 AST-based JTD patcher** — risks byte drift in patched
  `just-the-docs.js`.

### 8.2. Out of scope by topic

- **Watch-mode / incremental rebuild** ([§7.D11](#71-decision-record)).
- **Heading-hierarchy integrity check** ([§6.2](#62-check-categories-not-in-phase-10)).
- **Pre-commit hook for em-dash normalisation** ([§6.2](#62-check-categories-not-in-phase-10)).
- **Trimming `builder/one-offs/`** — Phase 9 ruled this out and
  Phase 10 doesn't reopen the question.
- **Config-key cleanup of `docs/_config.yml`** — defer to a
  follow-up commit; the harmless Jekyll-only keys aren't worth
  the cutover risk.

---

## 9. Verification

### 9.1. Pre-cutover (gate)

See [§5.1](#51-pre-flight-checks). Three clean runs across 24 hours.

### 9.2. Post-cutover smoke

After commit 6 (the WIP.md rewrite) lands:

1. `cd docs && build.bat` — succeeds; emits `_site/`.
2. `diff -rq docs/_site/ <previous-jekyll-output>` — clean modulo
   the documented accepted-divergences. (Save the previous Jekyll
   output to a temp location before commit 5; diff against it.)
3. `cd docs && check.bat` — clean; all new integrity checks PASS.
4. `start docs/_site/index.html` (or open in a browser) — loads;
   search works; navigation works.
5. `git log --oneline -10` — six commits land in the expected
   shape (pre-flight, dest flip, script swap, harness retirement,
   CI swap, WIP rewrite).

### 9.3. Post-deploy smoke

After GitHub Pages serves the new build:

1. https://docs.twinbasic.com/ loads.
2. Random spot-check 5 pages across the nav: each loads, nav
   highlights correctly, search works.
3. `/sitemap.xml` is present and well-formed.
4. The PDF book renders via `book.bat` (the post-deploy run that
   exercises Phase 8 end-to-end).

### 9.4. Two-week deferred verification (before commit 7)

Before opening the Jekyll source set deletion commit:

1. No production incidents traceable to the cutover for 14 days.
2. `node builder/tbdocs.mjs && diff -rq docs/_site-old/ docs/_site/`
   clean (if an old `_site-old/` snapshot was kept; not required).
3. `check.bat` still clean on the latest tree.
4. No PRs in flight that reference any of the to-be-deleted files
   (grep `docs/_plugins/` etc. in open PRs).

---

## 10. Dependencies

**Cutover proper**: zero new dependencies.

**Site-integrity checker**: zero new dependencies. The existing
htmlparser2 in `scripts/check_links.mjs` already handles every
new check category.

The Phase 9 build-time dependency set carries unchanged:

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.0",
    "shiki": "^1.0",
    "lunr": "^2.3"
  }
}
```

`serve.bat`'s `npx http-server` adds a one-shot runtime dep
(downloaded on demand by npx, not pinned in package.json). If
that's objectionable, swap to `python -m http.server 4000`
(Python 3 is universally available on developer machines per
the existing `_profile/` toolchain assumption); document either
choice in WIP.md.

---

## 11. File layout after Phase 10 (post-commit-6)

```
<repo root>/
  builder/
    PLAN.md                    (updated: Phase 10 → shipped)
    PLAN-1..PLAN-9.md          (cross-references to verify-phaseN.mjs
                                 noted as historical, files deleted)
    PLAN-10.md                 (this file)
    PLAN-11.md                 (still to draft)
    FUTURE-WORK.md             (C1 marked shipped)
    README.md                  (Phase 9 shipped; minor update to
                                 point at Phase 10 as the current
                                 build path)
    tbdocs.mjs                  (default dest → `_site`)
    [all production .mjs]      unchanged
    one-offs/                  unchanged
    [verify-phase{1..8}.mjs]   DELETED
    [_diff*.mjs]               DELETED
    [_triage.mjs]              DELETED
    [_audit_accepted.mjs]      DELETED
    [_sitemap_diff.mjs]        DELETED
    [_spot.mjs]                DELETED
    [accepted-divergences.mjs] DELETED
  docs/
    build.bat                  (invokes tbdocs)
    serve.bat                  (build + http-server)
    check.bat                  (invokes expanded check_links.mjs)
    WIP.md                     ("Build pipeline" section instead of
                                 "JS builder port")
    _plugins/                  STILL PRESENT (deletes in commit 7)
    _includes/                 STILL PRESENT (deletes in commit 7)
    _layouts/                  STILL PRESENT (deletes in commit 7)
    _sass/                     STILL PRESENT (deletes in commit 7)
    Gemfile                    STILL PRESENT (deletes in commit 7)
    Gemfile.lock               STILL PRESENT (deletes in commit 7)
    _config.yml                unchanged (Jekyll-only keys are
                                 harmless ballast until a later
                                 config-clean pass)
  scripts/
    check_links.mjs            (+400 lines; expanded checker)
  .github/workflows/
    jekyll-gh-pages.yml        (rewritten OR renamed to pages.yml;
                                 [§7.D5](#71-decision-record))
```

After commit 7 (~2 weeks later), the six STILL PRESENT entries
under `docs/` delete; the layout becomes whatever it needs to be
for Phase 11's planning.

---

## 12. What "done" Phase 10 enables

After Phase 10 lands (commits 1-6), the build pipeline is
unilaterally tbdocs:

- **No more Jekyll**: `bundle exec jekyll build` is not invoked
  anywhere in the repo. Developers without a Ruby toolchain can
  build the site end-to-end with just Node 20.
- **No more byte-vs-Jekyll comparison**: the eight verify-phase
  harnesses are gone; correctness is asserted by the expanded
  site-integrity checker (HTML well-formedness, duplicate-id,
  anchor resolution, sitemap / search completeness).
- **CI is simpler**: one Node-based workflow replaces the
  Jekyll-based `actions/jekyll-build-pages` flow.
- **Phase 11 is unblocked**: intentional output-changing items
  (Shiki theming from `.twin`, mermaid auto-gen, etc.) land
  freely because there's no Jekyll reference to regress against.

After commit 7 (the deferred Jekyll source set deletion):

- **Repo footprint shrinks** by ~30 MB (the Jekyll plugin set +
  Gemfile + `_profile/` + Ruby caches).
- **No more dual-build temptation**: an executor coming fresh to
  the repo can't accidentally try to "compare Jekyll's behavior"
  -- there's no Jekyll to compare against.

The cutover is the inflection point that lets the next 12-18
months of work iterate on output (Phase 11+) without the Jekyll
ballast that gated Phases 3-9.
