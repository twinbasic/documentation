---
title: Building and Deployment
parent: Documentation Development
nav_order: 3
permalink: /Documentation/Development/Building
---

# Building and Deployment
{: .no_toc }

The day-to-day workflow for editing documentation: requirements, building, serving locally, link checking, Graphviz diagrams, screenshots, and the deployment to [docs.twinbasic.com](https://docs.twinbasic.com). Aimed at content contributors --- if you are modifying the build pipeline itself, see [tbdocs Internals](Builder) instead.

* TOC goes here
{:toc}

## Development environment

The documentation is rendered to HTML by `tbdocs`, a custom Node.js static site generator that lives under [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). The day-to-day commands below are Windows batch files that wrap the generator. They are the only wrappers in the repository --- there is no shell-script counterpart --- so [On macOS and Linux](#posix-equivalents) gives the command each one runs.

1. Ensure the [requirements](#requirements) below are met.

2. Fork [https://github.com/twinbasic/documentation][docs-repo] to your own GitHub account.

3. Clone your fork.

   Cloning [the documentation repository][docs-repo] itself builds just as well, and if you only ever intend to read and build locally, it is enough. It is the wrong starting point for a change, though, and it fails late: the [deployment steps](#deploying-to-docstwinbasiccom) below open with *push your changes to your GitHub fork*, and a clone of upstream has no remote you are able to push to. The first sign of that is a permission error on `git push`, once the work is already done.

   It is recoverable without starting over. Fork the repository on GitHub, then add the fork as a second remote and push the branch there:

       git remote add fork https://github.com/<your-account>/documentation.git
       git push -u fork <your-branch>

   Only the fork needs write access. `origin` can go on pointing at upstream, which is what you want for `git pull` anyway.

### Requirements

- **Node.js 22+** for `tbdocs` itself.
- **`npm ci`** at the repository root installs everything: the static site generator's deps and the PDF renderer's deps. A single `package.json` at the repo root contains the whole dependency set. The `build.bat` / `serve.bat` wrappers assume the install has run.
- **Chromium** is required for four things: rendering the PDF book (`book.bat`), and three of `check.bat`'s six steps --- the diagram-fit check (`scripts/check_dot_fit.mjs`), which re-renders each diagram with the real webfont; the axe source-patch equivalence check (`scripts/check_axe_patch_equiv.mjs`); and the accessibility scan (`scripts/check_a11y.mjs`). It is downloaded once by `npx puppeteer browsers install chrome --install-deps`. The day-to-day `build.bat` / `serve.bat` flow does not need it --- only `check.bat` and `book.bat` do.

### On macOS and Linux
{: #posix-equivalents }

Nothing in the pipeline itself is Windows-specific --- `tbdocs` and all six gates are Node programs, and CI runs all but one of them on `ubuntu-latest` (the exception is deliberate: see [What CI deliberately does not run](#what-ci-deliberately-does-not-run)). The four wrappers are the only part that is, and what follows is what each of them runs.

Each `.bat` opens with `@pushd "%~dp0"`, which is what lets it be invoked from any directory. The commands below have no equivalent of that, so **run them from the repository root**. It is not a formality: `tbdocs`'s `--src docs`, `check_publish_policy.mjs`'s default source root, and every path handed to `render-book.mjs` are all resolved against the working directory.

| Wrapper | Runs |
|---|---|
| `build.bat [flags]` | `node builder/tbdocs.mjs --src docs --check-audit-index [flags]` |
| `serve.bat [flags]` | `node builder/tbdocs.mjs --src docs --serve [flags]` |
| `check.bat` | six scripts in a fixed order, below |
| `book.bat` | a `mkdir`, then one `render-book.mjs` invocation, below |

`--check-audit-index` is the part most easily dropped in transcription, and dropping it is silent --- see [Building](#building) below for what it costs. Anyone who types `build.bat` gets the link check without thinking about it; anyone who types the underlying command has to include it themselves.

`check.bat` is six separate scripts rather than one, each stopping the run if it fails. The order is cheapest-first, so a failure stops the run before the expensive gates have cost anything --- the accessibility scan at the end is by a wide margin the slowest of the six:

    node scripts/check_publish_policy.mjs \
      && node scripts/check_tree_fresh.mjs \
      && node scripts/check_dot_fit.mjs \
      && node scripts/check_axe_patch_equiv.mjs \
      && node scripts/pick_a11y_sample.mjs --check \
      && node scripts/check_a11y.mjs

`book.bat` has one step that is invisible from the command it ends with. `render-book.mjs` writes the PDF with a plain file write and never creates the directory above it, so `docs/_pdf/` has to exist first --- otherwise the render fails with `ENOENT` at the very last moment, after the whole page-breaking pass has already run. The deploy workflow does the same `mkdir` before its render, for the same reason:

    mkdir -p docs/_pdf
    node book/render-book.mjs docs/_site-pdf/book.html \
      -o "docs/_pdf/twinBASIC Book.pdf" \
      --outline-tags h1,h2,h3,h4 \
      --additional-script perf/detach-pages.js

Two of `book.bat`'s own steps have no equivalent above. It checks that `docs\_site-pdf\book.html` exists and names `build.bat` as the fix, where `render-book.mjs` refuses a missing input with `input not found:` and the resolved path and nothing else. And it runs `npm install` itself when `node_modules\puppeteer` is absent --- run `npm ci` first if the renderer cannot find puppeteer.

One difference is not about paths at all, and it is the one that matters most: **a local accessibility pass is weaker than CI's, on every platform.** axe's `target-size` rule measures rendered boxes, and an inline element's measured height is the content area of whatever `system-ui` resolves to on the machine running the scan. Both workflows install `fonts-liberation` so the runner measures with the smallest face in that band, and the site's padding is calibrated against the smallest --- so a machine with larger metrics passes controls that the runner then fails. See [`fonts-liberation`, installed on purpose](#fonts-liberation-installed-on-purpose) for the measurements.

## Building

To render the documentation from `.md` files into the `_site/` (online), `_site-offline/` (offline mirror), and `_site-pdf/` (sparse PDF source) folders:

    build.bat

or directly, from the repository root:

    node builder/tbdocs.mjs --src docs --check-audit-index

`--check-audit-index` is what `build.bat` passes, and it is not decoration: it implies `--check`, and without it the build produces the same three trees while running no [link check](#checking-link-integrity) whatsoever.

A single `tbdocs` run produces all three trees. The `also_build_offline` and `also_build_pdf` keys in `_config.yml` toggle the sibling outputs; the `--no-offline` and `--no-pdf` flags do the same from the command line if you only want `_site/`.

The full set of `tbdocs` CLI flags --- every flag, what each one does, when to use it --- lives on the [Tools and Scripts](Tools#tbdocs) page.

## Building and local serving

For anything you intend to *look* at --- a styling change, a new page's layout, a diagram in context --- the local preview is `serve.bat`, over HTTP:

    serve.bat

This runs `tbdocs --serve`: after an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each file change, and any browser tab open on the page auto-reloads via SSE after each successful rebuild. Only failures (4xx, 5xx, server exceptions) are logged --- successful requests are silent. Ctrl+C exits cleanly.

Serve writes to `docs/_serve/`, completely disjoint from `build.bat`'s `_site/` family. That separation means a one-off `build.bat` invocation (e.g., to refresh `_site-pdf/` for `book.bat`, or to re-check `_site-offline/` link integrity) never touches the tree the live preview is serving, and the preview keeps showing whatever serve last rebuilt.

### Why not just open the built files
{: #why-not-file-urls }

Opening a page straight out of `_site/` by double-clicking it is obvious, and wrong. The online tree references its stylesheets, fonts and scripts with root-absolute URLs (`/assets/css/...`); under `file://` those resolve against the filesystem root rather than the tree root, find nothing there, and the page renders as unstyled markup. Nothing announces the failure --- all the text is present --- so it reads as a styling bug in the page rather than as three stylesheets that never loaded, and any conclusion drawn from it about colour, spacing, layout or contrast is worthless.

`_site-offline/` is the exception, and it renders correctly over `file://` by design. The offline mirror exists so the site works with no server at all: the rewrite turns every root-absolute asset URL into a page-relative one, so a page opened from that tree gets the real stylesheets and the real computed styles. That is why the [accessibility scan](#checking-accessibility) points headless Chromium at `_site-offline/` and not at `_site/` --- its colour-contrast results would otherwise all be black text on a white void.

The short form is **puppeteer for measuring, `serve.bat` for looking**. A headless browser driven over `file://` against the offline mirror measures correctly and is what the gates use; a person who wants to see a change should use the localhost server, which serves the tree a reader actually gets, with the search index and the theme toggle live.

## Checking link integrity

The link check is part of the build. `build.bat` passes `--check-audit-index`, and the check reads the HTML the build already holds in memory rather than writing ~270 MB of it out and reading it back:

    build.bat

It covers all three trees --- `_site/` (the online tree), `_site-offline/` (the `file://`-browsable mirror, which also carries `--forbid 'https://docs.twinbasic.com'` so a surviving live-site link is flagged: the offline mirror should never navigate back to the live docs site), and `_site-pdf/book.html` (informational). Every tree is also checked for HTML well-formedness, duplicate `id`s, anchor resolution, accessibility hints and remote `<img src>`; the online tree adds sitemap, search-index and canonical-URL integrity. The same check runs in CI on every pull request and on every push to `staging`.

A failing check does not abort the build --- a broken link still produces a site worth looking at --- so it sets the exit code instead: 1 for link failures, 2 for integrity failures, 3 for both.

[`scripts/check_links.mjs`](Tools#check-links) is still the tool for a tree this build did not produce: a release zip, a bisect, someone else's artifact.

## What the build refuses to publish

Every file under `docs/` that is not a page is copied into the published site
unchanged. `_config.yml`'s `exclude:` used to be the only filter, and a list of
things to leave out only leaves out what somebody thought to name --- so a
scratch `.md` with no frontmatter, an editor's `.bak`, a `.twin` sample, a
`secrets.json`, a `.pem` and a `Thumbs.db` all published at public URLs, on a
green build, straight into the Pages deployment and the offline release zip.

The build now decides the other way round: [`builder/publish-policy.mjs`](Builder#module-map)
holds the list of types that may be published, and refuses everything else. It
runs at two points, neither of them behind a flag --- a build run with
`--no-check` is exactly when nothing else is looking:

- over the source inventory, before anything is written, naming the file on disk;
- over the inventory each output tree will receive, which covers what the first
  sweep cannot see: redirect stubs, vendored theme assets, and the generated
  `sitemap.xml` and `search-data.json`.

Unlike the link check, **a finding here aborts the build**. A broken link still
leaves a tree worth inspecting; a tree with a private key in it does not.

When it aborts on a file of yours there are three ways forward, and the message
names only two: keep the file out of `docs/`, declare that one file in
`_config.yml`'s `bundle_extra`, or add its extension to `SOURCE_EXTENSIONS`.
Which one applies is a decision about the file rather than about the build ---
[What may live in docs/](Authoring#what-may-live-in-docs) gives the
`bundle_extra` syntax and says why it is the right answer far more often than
widening `SOURCE_EXTENSIONS`, which re-blesses every stray file of that type.

`check.bat` runs [`scripts/check_publish_policy.mjs`](Tools#check-publish-policy)
first, and it exists because a clean build proves only half of this. "Nothing in
`docs/` is currently refused" is also what a list widened until it refuses
nothing would report. The self-test asserts the other half against named probes
--- a `.bak`, a `.pem`, a `.docx`, a frontmatter-less `.md` --- plus the reverse,
that a `.png`, a `.woff2` and `CNAME` still publish, since a policy refusing
everything would also report a clean sweep.

## Checking accessibility

    check.bat

[`scripts/check_a11y.mjs`](Tools#check-a11y) drives `axe-core` inside headless Chromium (via `puppeteer`) over thirteen sample pages against WCAG 2.0/2.1/2.2 at Level A + AA (plus the `heading-order` best-practice rule), and exits non-zero on any violation. Five cheaper gates run first and stop the run if they fail: the [publish-allowlist self-test](#what-the-build-refuses-to-publish), a freshness check that refuses a stale tree, the [DOT diagram fit check](#diagram-fonts-and-why-checkbat-measures-them), the axe source-patch verification, and the sample-coverage check that says whether the thirteen pages still cover every markup construct the site uses.

Each page is scanned in **both the light and dark themes** --- dark mode is a separate palette, so a light-mode pass says nothing about it --- and the scan runs against `_site-offline/` rather than `_site/`, because the online tree's root-absolute asset URLs do not resolve under `file://` and would leave every page unstyled. This stage needs the Chromium install from the [requirements](#requirements); the plain `build.bat` flow does not.

A clean `build.bat && check.bat` --- link integrity and accessibility both --- is the bar for "ready to commit".

### A link failure cancels whatever was chained after `&&`
{: #the-double-ampersand-trap }

`build.bat` sets a non-zero exit code when the link or integrity check finds something, and still writes all three trees: the finding is a report, not an abort. `&&` reads only the exit code, so the command after it does not run.

That is usually what you want from `check.bat` --- a tree with broken links is not one to sign off on, and the accessibility scan is the slow half of the pair. **`build.bat && book.bat` is a different matter, and it fails quietly.** A broken link has no bearing on whether the book renders, so the render is cancelled for a reason unrelated to it. The terminal ends on the link findings with no PDF, which reads as a render that failed rather than as one that never started, and the next thing anyone does is go looking for a fault in `book.bat`. Run the two as separate commands whenever you want the second regardless of the first.

## Graphviz/DOT diagrams

Diagrams live as `.dot` source files and are referenced from markdown as `.svg`. A `.dot` anywhere under `docs/` is picked up, so a diagram can sit beside the page that uses it:

    ![Diagram](/assets/images/dot/<name>.svg)      <!-- shared -->
    ![Diagram](Images/<name>.svg)                  <!-- beside its page -->

`tbdocs` regenerates each `.svg` from its `.dot` sibling when the SVG is missing or older than its source --- editing a `.dot` by one character regenerates the SVG on the next build. Both files belong in git; the `.dot` is the canonical source, the `.svg` is the build artifact.

At render time, any markdown image reference to a build-local `.svg` is replaced with the SVG content inlined directly in the HTML. Each inlined SVG gets a click-to-zoom overlay and four control links (Download SVG, Copy SVG, Download PNG, Copy PNG). The controls are hidden in print output. See the [SVG inlining](Builder#svg-inlining) section of the Builder page for the implementation details.

The renderer calls `@hpcc-js/wasm-graphviz` directly: one WASM module load (~50 ms) covers the whole batch, then each diagram is a synchronous `gv.dot(src)` call. No headless browser and no Chromium dependency for diagrams. Two failure modes are handled distinctly:

- **Setup failures** (`@hpcc-js/wasm-graphviz` not installed, WASM load fails) emit a one-line warning, retain the existing on-disk SVGs, and let the build exit 0 --- a fresh checkout without `npm install` still builds against the committed SVGs.
- **Content failures** (broken DOT syntax, render throws) emit the error verbatim, leave that diagram's previous SVG in place, continue rendering the rest of the batch, and flip `process.exitCode = 1` so CI catches the bad diagram.

In serve mode the watcher ignores any `.svg` that has a `.dot` sibling. The `.dot` is the source of truth; the `.svg` is the build artifact the renderer emits back under `srcRoot`. Without the filter, each `.dot` edit would fire two rebuilds (one on the edit, one on the SVG write) and the browser would reload twice for one user change.

### Diagram fonts, and why `check.bat` measures them

One thing does happen to Graphviz before it lays anything out. The WASM build carries no font machinery at all --- only built-in width tables for the core PostScript families, and it falls back to Times for anything it does not recognise, which means `fontname="Inter"` measured exactly like a font that does not exist. Times is far narrower than Inter through the lowercase, so every box came out about 11% too small and 27 labels across three diagrams were painted outside their boxes. [`builder/dot-metrics.mjs`](Builder#diagram-geometry) installs Inter's real advance widths into the module's memory first, which closes it.

Two consequences for anyone editing a diagram:

- **Never hand-edit a `.svg`, and never set `font-family` anywhere but the `.dot`.** The SVG is a build artifact the next build overwrites, and Graphviz sizes every box to the text *it* measured --- a face the layout never saw leaves labels hanging outside their boxes.
- **`check.bat` runs [`scripts/check_dot_fit.mjs`](Tools#check-dot-fit)**, which re-renders every committed diagram with the real webfont and fails if a label sits outside the box Graphviz drew for it. Nothing in the build compares the two, and axe does not evaluate SVG `<text>` geometry, so without this gate a mismatch ships on a green build.

### When the diagram-fit check fails
{: #dot-fit-remediation }

A failure names the diagram and every label that outran its box, in user units past the edge:

    OVERFLOW   docs/assets/images/dot/<name>.svg: 3 of 20 label(s) past the box edge
                 +15.7  "the label text, truncated to 44 characters"
                  +8.5  "the next worst one"

A label may sit up to 1.0 unit past the edge before it counts --- that budget is for the rounding around kerning, which a per-character width table cannot express. Read the numbers before changing anything, because they separate two completely different problems:

- **Several diagrams at once, overflowing by tens of units.** Nothing is wrong with the labels. Graphviz measured with Times because [`builder/dot-metrics.mjs`](Builder#diagram-geometry) did not get Inter's widths installed --- a `@hpcc-js/wasm-graphviz` bump that moved the width table is the usual cause, and a font subset regenerated without rerunning `node scripts/build_dot_metrics.mjs` is the other. `node scripts/build_dot_metrics.mjs --check` answers the second case directly; it fails when `builder/inter-metrics.json` is stale against the committed `.woff2` files. Editing labels here would be fixing the symptom on whichever diagrams happened to fail first.
- **One diagram, one or two labels, a few units over, immediately after you edited that `.dot`.** The label outgrew its box, and the fix belongs in the `.dot`.

`ERROR ... no text runs -- did the SVG render?` is a third case and means the diagram produced no text at all: look for a DOT syntax error, rebuild, and confirm the `.svg` was rewritten. The check reads the committed `.svg`, not the `.dot`, so an edit that has not been through a build is not the edit being measured.

Four changes move a label back inside its box, roughly in order of preference. The numbers below are one real three-word label measured through the same Graphviz the build uses, starting from a 150pt box:

1. **Break the label across lines.** `<BR/>` in an HTML-like label (`label=<one<BR/>two>`), or `\n` in a quoted one. Every diagram in this repository uses the HTML-like form. This is the most effective lever because each line becomes its own `<text>` run, measured separately, and the box is sized to the widest of them: one break took the box from 150pt to 98pt.
2. **Shorten the text.** Usually the right answer when the label repeats something the surrounding prose already says --- a diagram label is a name, not a sentence.
3. **Widen the box without touching the text.** Raising the x component of the node's `margin` from the `0.12` the diagrams set to `0.30` took the same box from 150pt to 176pt. `width=<inches>` is the other form and is a *minimum*: the box still grows past it when the label needs more room.
4. **Reduce `fontsize`.** This moves both sides of the comparison at once --- Graphviz measures smaller and the browser paints smaller --- so it always works, which is why it is last: a diagram at natural size paints 12pt labels, and 12pt is exactly the site's 16px body size, so shrinking the whole diagram's type makes it read as smaller than the prose around it. Use it per-line instead, as `scheduler-dag.dot` does with `<FONT POINT-SIZE="10">` for its `[M]` and `[W]` annotations.

**Do not use `fixedsize=true`.** It reinterprets `width` and `height` as exact rather than minimum, so the label stops being what sizes the box. Measured, `width=1 fixedsize=true` produced a 72pt box for a label needing about 150pt --- which is not a fix for the overflow, it is the mechanism that manufactures one. No diagram here uses it.

Whichever of them you choose, the edit goes in the `.dot`, then `build.bat` regenerates the `.svg`, and both files are committed. The prohibitions above still hold: the `.svg` is a build artifact, and a `font-family` set anywhere but the `.dot` is a face the layout never measured.

## What CI runs that a local build does not

**Pull requests target `staging`.** It is the repository's default branch and the one the deploy workflow publishes from; `main` is not where documentation changes land.

Two workflows cover the repository:

- `.github/workflows/checks.yml` runs on every pull request into `staging` or `main`. It builds, checks, and stops --- it has no deploy rights at all. It also has no `paths:` filter, deliberately: an earlier `docs/**` filter skipped any pull request touching only `builder/` or `scripts/`, which is exactly the code most able to break the build, the link checker or asset vendoring.
- `.github/workflows/tbdocs-gh-pages.yml` runs on every push to `staging` and on manual dispatch. It runs the same gates, then renders the PDF book and publishes `docs/_site/` to Pages. A manual dispatch additionally cuts a GitHub release with the offline site copy and the book attached.

Both run five of `check.bat`'s six gates, in the same relative order; the sixth is covered at the end of this section. What follows is the delta --- each item a way a clean local run can still come back red.

### A missing image is an error there and a download here

Both workflows add `--no-fetch-assets` to the build, and this is the difference most likely to catch a contributor out. Locally, a build that meets a video marker or a `github.com/user-attachments/...` URL with no vendored copy downloads the file into `docs/assets/` and carries on: the page renders, and the only trace is a new untracked file you may not have looked for. CI refuses to download anything and fails, naming the file to commit.

The asymmetry is the whole point. An author who wrote the markdown but forgot to commit the image would otherwise get a green build while the published site went on hotlinking a third party --- which is the failure the vendoring mechanism exists to prevent, so CI cannot be the place that quietly repairs it. Setting `$CI` already selects offline mode; the flag only states it. Build locally once after adding a video or pasting a screenshot, and `git status` names exactly what to add --- see [Authoring Pages](Authoring#committing-downloaded-assets).

### The deployment tells the build where it is

The deploy workflow passes `--url` and `--baseurl` from the `configure-pages` outputs, overriding `_config.yml`. Canonical links, `og:url` and every sitemap entry then advertise the origin the tree is actually served from rather than the configured production host. It matters on a fork: one deploying to `<user>.github.io/<repo>/` moves both the origin and the path prefix, and a page whose canonical tag still names `docs.twinbasic.com` is pointing search engines at somebody else's site. Nothing has to be kept in step by hand --- the check inside the build reads the base path off the config it just built with, which a separate `check_links.mjs` pass used to need repeated to it as `--base-path`.

### The link-checker parity fixtures

[`scripts/check_links_diff.mjs`](Tools#check-links-diff) compares two implementations of one check: the standalone [`scripts/check_links.mjs`](Tools#check-links), still the tool for a tree this build did not produce, and the pass fused into the build. Two implementations of one check is the shape that rots quietly, because **a checker that silently checks less reports a clean pass.** `check.bat` runs neither invocation; CI runs one or both.

| Invocation | Where | What it holds to the comparison |
|---|---|---|
| `--case fixture --a script --b index` | both workflows | The standalone checker against itself with the index oracle substituted, over a nine-file synthetic tree. ~0.3 s. |
| `--case fixture-built --case fixture-built-offline --a script --b fused` | pull requests only | The standalone checker against the *build's own* pass, over a three-page tree the build produces from `test/fixtures/check-src`. One extra build, ~1 s. |

Neither goes near the real site, and that is not a shortcut: on a healthy tree almost every findings category compares empty against empty, so the comparison asserts nothing. The fixtures provoke one fault of each kind so every category has something in it. Two cases are needed for the fused side because no single tree carries them all --- the online tree has the sitemap, search and canonical checks, and the offline tree is the only one with a forbidden prefix.

The second row is on pull requests and not on deploy because catching it before a merge is the point, and because the deploy workflow has a site to ship. The full script-against-fused comparison over the *real* trees stays a manual gate: running it in CI would mean checking every page twice, which is what folding the check into the build removed.

### `fonts-liberation`, installed on purpose

Both workflows install `fonts-liberation` before anything runs. It reads like an incidental dependency and is not. axe's `target-size` rule measures rendered boxes, and an inline element's measured height is its font's content area --- so whether a control clears the 24px floor depends on what `system-ui` resolves to on the machine running the scan. Measured at the mobile h3 size: Segoe UI 19px, Verdana and Tahoma 17px, Arial 16px, Liberation Sans / DejaVu Sans / Roboto 15px. Liberation Sans is the smallest face in that band, the site's padding is calibrated against the smallest, and a runner image is not guaranteed to have it --- so a rule that passes on a Windows box and fails on the runner is a real defect being reported, not a CI quirk.

Self-hosting the body face settles the *text* at 17px on every machine, and does not retire the band: `font-display: swap` spends the first frames of every load on the fallback, and a reader whose font request fails stays there. Give a font-dependent measurement margin against 15px, not against what your own machine renders.

### What CI deliberately does not run

`scripts/check_tree_fresh.mjs` --- `check.bat`'s second gate --- appears in neither workflow, and should not. It refuses a built tree older than the sources that produced it, which is the local failure mode where you edit a page, run `check.bat` without rebuilding, and audit the previous build to a clean pass. CI builds and checks inside one job, so the tree is current by construction.

## Deploying to docs.twinbasic.com

1. Push your changes to your GitHub fork of the [documentation repository][docs-repo].

2. [Open a new pull request in the documentation repository][docs-pr].

3. Click **compare across forks**.

4. Select your repository and branch to merge from, and set the base branch to **`staging`**. That is the repository's default branch, the branch the deploy workflow publishes from, and the one the pull-request checks run against.

   ![GitHub's Compare changes page, with the compare across forks link marked, and below it the head repository and compare branch selectors](Images/compare-changes.png)

5. Create the pull request.

   ![The comparison after choosing the fork and branch, reporting Able to merge, with the green Create pull request button marked](Images/create-pull-request.png)

   A maintainer will merge the pull request into the documentation repository. You may wish to mention an outstanding request on the [#docs][hash-docs] channel, although the [#github-docs][hash-github-docs] channel provides automated notifications of pull requests. Normally, a maintainer will get a notification of a new pull request via Discord, and will merge it or comment with a request for changes.

   **The steps below are done by maintainers.**

6. Review, then merge the pull request or comment with required changes.

   ![A pull request reporting no conflicts with the base branch, with the green Merge pull request button marked](Images/merge-pull-request.png)

   ![The merge form's commit message, extended description and commit email fields, with the green Confirm merge button marked](Images/confirm-merge.png)

7. Select the **Build & deploy docs** action.
   ![The repository's Actions tab, and the workflow list in the left sidebar where the deploy workflow is chosen](Images/choose-workflow.png){:width="75%"}

8. Manually run the build and deployment workflow if a release snapshot is needed. (Pushes to `staging` deploy to Pages automatically; only the manual run additionally cuts a GitHub release with the offline-browsable site copy attached as a zip and the PDF book attached.)
   ![The Run workflow dropdown open on its branch selector, with the green Run workflow button that starts the manual deployment](Images/run-workflow.png){:width="50%"}

## Editing screenshots

One way to edit screenshots is to use an integrated vector / pixel program like [Affinity][af]<sup>1</sup>. A possible workflow:

1. <kbd>PrtSc</kbd> to capture the screenshot.

2. In Affinity, <kbd>Ctrl-Alt-Shift-N</kbd> (File, New from Clipboard) to get the entire screenshot into the program.

3. Use the Vector Crop tool (from the Vector studio) to crop the screenshot down to the relevant part.

   ![Affinity's studio switcher, with Vector selected rather than Pixel](Images/af-vector-studio.png) ![The Vector studio's tool column, with the Vector Crop tool highlighted](Images/af-vector-crop-tool.png)

4. Select the cropped image and copy it to the clipboard with <kbd>Ctrl-C</kbd>.

5. Create a new file from clipboard again to open a document with just the cropped screenshot <kbd>Ctrl-Alt-Shift-N</kbd> (File, New from Clipboard).

6. Close the file you opened in step 2.

7. Add arrows and labels as needed. Those can be copy-pasted from other `.af` files in this repository.

8. Export to PNG via <kbd>Ctrl-Alt-Shift-W</kbd> (File, Export, Export...).

> [!NOTE]
> It is a convention to put the `.af` ("source") files in the `_Images` folder, and the exported `.png` files in the `Images` folder. Only the latter is published to the website. The former is preserved as the source for easy editing and updates.

---

<sup>1</sup> Affinity is a free-as-in-beer suite that combines a vector editor, a bitmap editor, and a publishing layout editor. A Canva account is required to download; the accounts are free.

[af]: https://www.affinity.studio/download
[docs-pr]: https://github.com/twinbasic/documentation/compare
[docs-repo]: https://github.com/twinbasic/documentation
[hash-docs]: https://discord.com/channels/927638153546829845/1021635324809596988
[hash-github-docs]: https://discord.com/channels/927638153546829845/1111554338221989908
