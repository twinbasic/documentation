---
title: Building and Deployment
parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Building
---

# Building and Deployment
{: .no_toc }

The day-to-day workflow for editing documentation: requirements, building, serving locally, link checking, Mermaid diagrams, screenshots, and the deployment to [docs.twinbasic.com](https://docs.twinbasic.com). Aimed at content contributors --- if you are modifying the build pipeline itself, see [tbdocs Internals](Builder) instead.

* TOC goes here
{:toc}

## Development environment

The documentation is rendered to HTML by `tbdocs`, a custom Node.js static site generator that lives under [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). The day-to-day commands below are Windows batch files that wrap the generator; their POSIX equivalents (run from inside `docs/`) are listed alongside.

1. Ensure the [requirements](#requirements) below are met.

2. Fork [https://github.com/twinbasic/documentation][docs-repo] to your own GitHub account if you plan on making any changes, or for convenience. Skip this if you only want to build the docs locally without contributing changes.

3. Clone either your fork or the [documentation repository itself][docs-repo].

4. **Go to the `docs/` folder in the cloned working tree.** Building, serving, and other documentation operations all run from this folder, *not* from the repository root. (The `builder/` toolchain itself sits next to `docs/` and is not part of the source tree the documentation is rendered from.)

### Requirements

- **Node.js 22+** for `tbdocs` itself. The site builds offline with no Ruby toolchain.
- **`npm ci`** at the repository root (installs the PDF renderer dependencies) and again under `builder/` (installs the static site generator). The `build.bat` / `serve.bat` wrappers assume both have run.
- **Chromium** is required only when rebuilding the PDF book. It is downloaded once by `npx puppeteer browsers install chrome --install-deps`.

The two `npm ci` invocations correspond to two `package.json` files: the top-level one for the PDF renderer (`render-book.mjs`, the `lib/*.mjs` helpers, paged.js) and the `builder/package.json` for the static site generator itself.

## Building

To render the documentation from `.md` files into the `_site/` (online), `_site-offline/` (offline mirror), and `_site-pdf/` (sparse PDF source) folders, from inside `docs/`:

    build.bat

or directly:

    node ..\builder\tbdocs.mjs --src .

A single `tbdocs` run produces all three trees. The `also_build_offline` and `also_build_pdf` keys in `_config.yml` toggle the sibling outputs; the `--no-offline` and `--no-pdf` flags do the same from the command line if you only want `_site/`.

The full set of `tbdocs` CLI flags --- every flag, what each one does, when to use it --- lives on the [Tools and Scripts](Tools#tbdocs) page.

## Building and local serving

The simplest local preview is `build.bat` followed by opening the rendered files in any browser. To get a localhost server instead, from inside `docs/`:

    serve.bat

This runs `tbdocs --serve`: after an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each file change, and any browser tab open on the page auto-reloads via SSE after each successful rebuild. Only failures (4xx, 5xx, server exceptions) are logged --- successful requests are silent. Ctrl+C exits cleanly.

## Checking link integrity

Before checking link integrity, the documentation must be built. From inside `docs/`:

    check.bat

This runs two passes of `scripts/check_links.mjs`: one against `_site/` (the online tree) and one against `_site-offline/` (the `file://`-browsable mirror) with `--forbid 'https://docs.twinbasic.com'` to also flag any surviving live-site link --- the offline mirror should never navigate back to the live docs site. Both checks also assert HTML well-formedness, duplicate-`id` detection, anchor resolution, accessibility hints, and (for the online tree) the sitemap and search-index integrity. The same two checks run in CI on every pull request and on every push to `staging`.

A clean `check.bat` run is the bar for "ready to commit".

## Mermaid diagrams

Mermaid diagrams live as `.mmd` source files under `docs/assets/images/mmd/` and are referenced from markdown as `.svg`:

    ![Diagram](/assets/images/mmd/<hash>.svg)

`tbdocs` regenerates each `.svg` from its `.mmd` sibling when the SVG is missing or older than its source --- editing a `.mmd` by one character regenerates the SVG on the next build. Both files belong in git; the `.mmd` is the canonical source, the `.svg` is the build artifact that the browser actually loads.

The renderer is `@mermaid-js/mermaid-cli` (a devDependency in `builder/package.json`). It reuses the cached Chromium the top-level `puppeteer` install already provides --- no second download. A missing `mmdc` or missing Chrome cache downgrades to a warning, retains the existing on-disk SVG, and lets the build continue.

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
