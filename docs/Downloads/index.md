---
title: Downloads
nav_order: 4
permalink: /Downloads
---

# Downloads

Lists the tools, offline copies and test projects this documentation publishes, each with a link to its documentation.

## Tools

<div class="download-grid">
<div class="download-card">

### Help add-in for the IDE

Press F1 on a name in the code editor, and its reference page opens in a tool window beside the code, with or without an internet connection.

<p class="download-meta">twinBASIC project, about 51 MB: open it in the IDE and build it into the add-in's two DLLs.</p>

<p class="download-actions"><a class="btn" href="tB/IDE/AddIns/downloads/tbDocsHelp.twinproj" download>tbDocsHelp.twinproj</a> <a class="download-doc" href="tB/IDE/AddIns/Help">Documentation<span class="sr-only"> for the help add-in</span></a></p>

</div>
<div class="download-card">

### impexp

Unpacks a `.twinproj` or `.twinpack` file into a folder of source files, and packs a folder back into a project file. The three editions take the same commands.

<p class="download-meta">Node.js 18+, Python 3.6+, or a twinBASIC project that builds into a Windows program.</p>

<p class="download-actions"><a class="btn" href="Features/Packages/downloads/impexp.mjs" download>impexp.mjs <span class="download-size">{{tbdocs:size:Features/Packages/downloads/impexp.mjs}}</span></a> <a class="btn" href="Features/Packages/downloads/impexp.py" download>impexp.py <span class="download-size">{{tbdocs:size:Features/Packages/downloads/impexp.py}}</span></a> <a class="btn" href="Features/Packages/downloads/impexp.twinproj" download>impexp.twinproj <span class="download-size">{{tbdocs:size:Features/Packages/downloads/impexp.twinproj}}</span></a> <a class="download-doc" href="Features/Packages/Import-Export-Tool">Documentation<span class="sr-only"> for impexp</span></a></p>

</div>
</div>

## Read offline

Both are attached to the [documentation releases](https://github.com/twinbasic/documentation/releases) on GitHub.

<div class="download-grid">
<div class="download-card">

### The twinBASIC Book

The whole site as one A4 PDF of about 2,400 pages, with bookmarks for every section. It suits a tablet or a printer better than a small e-reader.

<p class="download-meta">PDF, from the newest release.</p>

<p class="download-actions"><a class="btn" href="https://github.com/twinbasic/documentation/releases/latest/download/twinBASIC.Book.pdf">twinBASIC Book.pdf</a></p>

</div>
<div class="download-card">

### Offline copy of the site

Every page of this site, to read from disk in any browser with no network. Navigation, dark mode and search all work.

<p class="download-meta">ZIP, from the newest release: extract it and open <code>index.html</code>.</p>

<p class="download-actions"><a class="btn" href="https://github.com/twinbasic/documentation/releases/latest/download/twinbasic-docs-offline.zip">twinbasic-docs-offline.zip</a></p>

</div>
</div>

## Package test projects

Each contributed package that has test cases publishes them as a twinBASIC project. The project holds only the tests: it references the package, which goes in `%APPDATA%\twinBASIC\packages`. The package's landing page says what the cases check.

| Package | Test project | Size |
|---------|--------------|------|
{{tbdocs:packageTestRows}}
