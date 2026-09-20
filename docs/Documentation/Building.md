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

The documentation is rendered to HTML by `tbdocs`, a custom Node.js static site generator that lives under [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). The day-to-day commands below are Windows batch files that wrap the generator; their POSIX equivalents are listed alongside.

1. Ensure the [requirements](#requirements) below are met.

2. Fork [https://github.com/twinbasic/documentation][docs-repo] to your own GitHub account if you plan on making any changes, or for convenience. Skip this if you only want to build the docs locally without contributing changes.

3. Clone either your fork or the [documentation repository itself][docs-repo].

### Requirements

- **Node.js 22+** for `tbdocs` itself.
- **`npm ci`** at the repository root installs everything: the static site generator's deps and the PDF renderer's deps. A single `package.json` at the repo root contains the whole dependency set. The `build.bat` / `serve.bat` wrappers assume the install has run.
- **Chromium** is required for four things: rendering the PDF book (`book.bat`), and three of `check.bat`'s six steps --- the diagram-fit check (`scripts/check_dot_fit.mjs`), which re-renders each diagram with the real webfont; the axe source-patch equivalence check (`scripts/check_axe_patch_equiv.mjs`); and the accessibility scan (`scripts/check_a11y.mjs`). It is downloaded once by `npx puppeteer browsers install chrome --install-deps`. The day-to-day `build.bat` / `serve.bat` flow does not need it --- only `check.bat` and `book.bat` do.

## Building

To render the documentation from `.md` files into the `_site/` (online), `_site-offline/` (offline mirror), and `_site-pdf/` (sparse PDF source) folders:

    build.bat

or directly:

    node builder\tbdocs.mjs --src docs

A single `tbdocs` run produces all three trees. The `also_build_offline` and `also_build_pdf` keys in `_config.yml` toggle the sibling outputs; the `--no-offline` and `--no-pdf` flags do the same from the command line if you only want `_site/`.

The full set of `tbdocs` CLI flags --- every flag, what each one does, when to use it --- lives on the [Tools and Scripts](Tools#tbdocs) page.

## Building and local serving

For anything you intend to *look* at --- a styling change, a new page's layout, a diagram in context --- the local preview is `serve.bat`, over HTTP:

    serve.bat

This runs `tbdocs --serve`: after an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each file change, and any browser tab open on the page auto-reloads via SSE after each successful rebuild. Only failures (4xx, 5xx, server exceptions) are logged --- successful requests are silent. Ctrl+C exits cleanly.

Serve writes to `docs/_serve/`, completely disjoint from `build.bat`'s `_site/` family. That separation means a one-off `build.bat` invocation (e.g., to refresh `_site-pdf/` for `book.bat`, or to re-check `_site-offline/` link integrity) never touches the tree the live preview is serving, and the preview keeps showing whatever serve last rebuilt.

### Why not just open the built files
{: #why-not-file-urls }

Opening a page straight out of `_site/` by double-clicking it is the obvious shortcut, and it is the one that misleads. The online tree references its stylesheets, fonts and scripts with root-absolute URLs (`/assets/css/...`); under `file://` those resolve against the filesystem root rather than the tree root, find nothing there, and the page renders as unstyled markup. Nothing announces the failure --- all the text is present --- so it reads as a styling bug in the page rather than as three stylesheets that never loaded, and any conclusion drawn from it about colour, spacing, layout or contrast is worthless.

`_site-offline/` is the exception, and the distinction is worth keeping straight rather than avoiding. The offline mirror exists so the site renders correctly with no server at all: the rewrite turns every root-absolute asset URL into a page-relative one, so a page opened from that tree over `file://` gets the real stylesheets and the real computed styles. That is exactly why the [accessibility scan](#checking-accessibility) points headless Chromium at `_site-offline/` and not at `_site/` --- its colour-contrast results would otherwise all be black text on a white void.

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

What this means when writing a page is covered in
[Authoring Pages](Authoring#what-may-live-in-docs): keep working files outside
`docs/`, and if a genuinely new asset type belongs on the site, add it to
`SOURCE_EXTENSIONS` in the same commit.

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

## Deploying to docs.twinbasic.com

1. Push your changes to your GitHub fork of the [documentation repository][docs-repo].

2. [Open a new pull request in the documentation repository][docs-pr].

3. Click **compare across forks**.

4. Select your repository and branch to merge from.

   ![img](Images/compare-changes.png)

5. Create the pull request.

   ![img](Images/create-pull-request.png)

   A maintainer will merge the pull request into the documentation repository. You may wish to mention an outstanding request on the [#docs][hash-docs] channel, although the [#github-docs][hash-github-docs] channel provides automated notifications of pull requests. Normally, a maintainer will get a notification of a new pull request via Discord, and will merge it or comment with a request for changes.

   **The steps below are done by maintainers.**

6. Review, then merge the pull request or comment with required changes.

   ![img](Images/merge-pull-request.png)

   ![img](Images/confirm-merge.png)

7. Select the **Build & deploy docs** action.
   ![img](Images/choose-workflow.png){:width="75%"}

8. Manually run the build and deployment workflow if a release snapshot is needed. (Pushes to `staging` deploy to Pages automatically; only the manual run additionally cuts a GitHub release with the offline-browsable site copy attached as a zip and the PDF book attached.)
   ![img](Images/run-workflow.png){:width="50%"}

## Editing screenshots

One way to edit screenshots is to use an integrated vector / pixel program like [Affinity][af]<sup>1</sup>. A possible workflow:

1. <kbd>PrtSc</kbd> to capture the screenshot.

2. In Affinity, <kbd>Ctrl-Alt-Shift-N</kbd> (File, New from Clipboard) to get the entire screenshot into the program.

3. Use the Vector Crop tool (from the Vector studio) to crop the screenshot down to the relevant part.

   ![img](Images/af-vector-studio.png) ![img](Images/af-vector-crop-tool.png)

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
