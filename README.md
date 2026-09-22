# twinBASIC User Documentation
This repository is the home for general user documentation for everything to do with twinBASIC.  

**If you would like to quickly contribute**, feel free to:

- [submit a Pull Request](https://github.com/twinbasic/documentation/compare),

- or [create a new page on the Wiki][create] for new topics, or for additions to the documentation.

> [!note]
>
> The Wiki is a "realtime extension" of the documentation, and allows quick contributions from the community. Anyone with an established GitHub account can contribute there.
> Wiki contents are meant to be a *temporary* place for content before it's migrated to the documentation by the team.
>
> Keep this in mind: Never run untrusted code from the web, and use CAUTION when following any wiki content.

If you want to get involved in improving this documentation directly, please fork this repository (https://github.com/twinbasic/documentation.git), and submit pull requests for your suggested changes.

All help is *very much* appreciated :)

## Building the site

The site is rendered by `tbdocs`, a Node.js static site generator kept in [`builder/`](builder/). You need **Node.js 22+**; a PDF or accessibility run additionally needs Chromium, installed once with `npx puppeteer browsers install chrome` (add `--install-deps` on Linux only).

```
npm ci        # once, from the repository root
build.bat     # renders _site/, _site-offline/ and _site-pdf/, and link-checks them
serve.bat     # localhost:4000 with watch + live reload
check.bat     # the gates that read the built site, ending in the accessibility scan
test.bat      # the gates that test the toolchain itself
book.bat      # renders the PDF book; run build.bat first
examples.bat  # compiles the twinBASIC code samples in the pages (Windows + a twinBASIC install)
```

A clean `build.bat && check.bat` is the bar for "ready to commit"; add `test.bat` when the change touched anything outside `docs/`. Each wrapper names the gates it runs, in order, on [Tools and Scripts](https://docs.twinbasic.com/Documentation/Development/Tools). On Linux or macOS, run the `node` command inside each batch file directly --- they are thin wrappers. `examples.bat` is the exception to both: it drives the twinBASIC IDE, so it is Windows-only and is deliberately outside every gate and outside CI.

Where to read more:

- **Writing or editing a page** --- [Authoring Pages](https://docs.twinbasic.com/Documentation/Development/Authoring) covers frontmatter, headings, prose style, attribution and links.
- **The build and deployment workflow** --- [Building and Deployment](https://docs.twinbasic.com/Documentation/Development/Building).
- **Every command and flag** --- [Tools and Scripts](https://docs.twinbasic.com/Documentation/Development/Tools).
- **Changing the generator itself** --- [tbdocs Internals](https://docs.twinbasic.com/Documentation/Development/Builder), with [`builder/README.md`](builder/README.md) next to the code.
- **Adding a build task or a markdown-it plugin** --- [Extending the Builder](https://docs.twinbasic.com/Documentation/Development/Extending) covers all four extension points --- a task in the build graph, a markdown-it plugin, a render-worker sub-stage, and a verification gate in `check.bat` or `test.bat`.




Wayne Phillips & the documentation team

[create]: https://github.com/twinbasic/documentation/wiki/_new
[wiki]: https://github.com/twinbasic/documentation/wiki/
