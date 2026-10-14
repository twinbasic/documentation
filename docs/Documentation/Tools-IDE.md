---
title: IDE Automation
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 6
permalink: /Documentation/Development/Tools-IDE
---

# IDE Automation
{: .no_toc }

Operates the twinBASIC IDE to test add-ins and the IDE itself, to try the help add-in by hand, and to take the documentation's IDE screenshots. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## probe_ide_image_labels.mjs
{: #probe-ide-image-labels }

    node scripts/probe_ide_image_labels.mjs [--ide <twinBASIC.exe>]

Lists the images that the twinBASIC IDE's style sheets label with a media type their bytes do not have. It is the check behind the `BUGS-TO-REPORT.md` entry whose reproducer is `bugs/ide-stylesheet-image-labels/`: the IDE's `styles.css` embeds images as `data:` URIs, and some are labelled `image/png` while their bytes are a GIF or a JPEG, or labelled `/png` (no `image` before the slash) while their bytes are a PNG. It starts no IDE and writes nothing, but it needs an unpacked twinBASIC install. It is outside every gate and CI.

It reads every `.css` file under the install's `ide` folder and passes each to `stripFile` of `scripts/lib/compact-image.mjs` (the reference for [`imagestrip`](#imagestrip)), which names each embedded image by its bytes and reports each label it would change. The probe prints those reports and discards the stripped output.

| Flag | Effect |
|---|---|
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. The `.css` files read are those under the `ide` folder beside it. |

The output is one line for each mislabelled image, `<file> line <n>: labelled <label>, the bytes are <kind>`, with the file relative to the install, and a summary line, `<n> of <total> images in the IDE's stylesheets are mislabelled (BETA <build>)`, or `none of the <total> images in the IDE's stylesheets is mislabelled (BETA <build>)`. Any other `stripFile` report, such as base64 that cannot be read, is printed as a `note:` line and does not count.

Exit codes: **0** every embedded image is labelled with the type its bytes have; **1** at least one is not; **2** a refused command line, no IDE, no `ide` folder, no style sheet or no embedded image in it to check, or a crash.

## probe_theme_semicolon.mjs
{: #probe-theme-semicolon }

    node scripts/probe_theme_semicolon.mjs [--ide <twinBASIC.exe>]

Lists the properties that the twinBASIC IDE silently drops when it loads the theme files it ships. It is the check behind the `BUGS-TO-REPORT.md` entry whose reproducer is `bugs/theme-missing-semicolon/`: in BETA 1005, line 63 of `Dark.theme` and of `Light.theme` is `DiagnosticsGroupFontSize: 90%` with no `;`, so it runs into the next line, and the loader loses both `DiagnosticsGroupFontSize` and `DiagnosticsGroupFontWeight`. It starts no IDE and no program and writes nothing, but it needs an unpacked twinBASIC install. It is outside every gate and CI.

It reads every `.theme` file in the install's `themes` folder and cuts each one as `applyThemeData` in the IDE's `ide\main.js` does. The loader removes the `/* */` comments, cuts the text at each `;` followed by a space, a tab or a line end, removes the line breaks from each piece, cuts each piece at each `: ` and `:` followed by a tab, and keeps the piece only if that gives exactly two parts. Any other piece is dropped without a message.

| Flag | Effect |
|---|---|
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. The `.theme` files read are those in the `themes` folder beside it. |

The output is one line for each dropped piece that holds text, `<file> line <n>: dropped <what it holds>`, with the file relative to the install and the line where the piece starts. A piece made of several properties run together is shown as their names. The last line is a summary, `<n> properties are lost in <k> of <total> shipped themes (BETA <build>)`, or `no shipped theme loses a property (BETA <build>)`.

Exit codes: **0** every piece of every shipped theme loads; **1** at least one is dropped; **2** a refused command line, no IDE, no `themes` folder or no `.theme` file in it, or a crash.

## addin_test.mjs
{: #addin-test }

    node scripts/addin_test.mjs [--only <regex>] [--port N] [--jobs N] [--timeout S]
                                [--ide <path>] [--show|--hide]

Runs the add-in scenarios under `test/addin/`. Each scenario file is a `node:test` file and one **lane**, listed in `test/addin/lanes.mjs`; run it with [`addin-test.bat`](Tools#addin-testbat), because on its own a scenario skips itself. A lane runs in its own process, with its own DevTools port, work folder and private copy of the twinBASIC install, so a test add-in never loads into your own IDE and two lanes never share one.

A scenario builds the add-ins it tests into its copy, opens a project and operates the IDE: it clicks, presses keys, types, and reads the add-ins' tool windows, message boxes, notifications, the code editor and the Debug Console. The seventeen lanes take about two minutes together:

- **Two sample lanes** operate the IDE's own sample add-ins, Sample 10 and Sample 15 (Global Search), end to end.
- **Probe lanes** take what they need from `test/addin/probes/`. They check:
  - which keyboard shortcuts fire, for the [KeyboardShortcuts](../../tB/Packages/tbIDE/KeyboardShortcuts) page;
  - what a tool window does with HTML and with a web page in an `iframe`, for the [HtmlElement](../../tB/Packages/tbIDE/HtmlElement) page and its neighbours (the panes lane serves its pages from a server of its own on `localhost`);
  - what the compiler says about the name under the cursor, and which files the IDE's web server serves from its `ide` folder;
  - which folders the compiler loads add-ins from, which folder each build target loads, what a compiler restart does to a loaded add-in, and which entry-point names the IDE accepts, for the [Add Ins](../../tB/IDE/AddIns/) and [tbIDE package](../../tB/Packages/tbIDE/) pages;
  - whether `TB_ADDIN_TEST` (see below) reaches the add-in, also after a compiler restart;
  - what the help add-in's hover help costs, and whether a hover provider added through the page shows in the IDE's own hover;
  - whether an add-in can show a window of its own, a form holding a WebView2 control.
- **Two help lanes** test the help add-in in `add-in/`, built with the symbol index committed in `add-in/Resources/SYMBOLS/`. `help` takes the pages from the built site. `help-offline` takes them from the add-in's own server, built with an archive of the built offline tree that the lane writes with the build's [help archive](Tools-Build#the-help-archive) writer.

| Flag | Effect |
|---|---|
| `--only <regex>` | Run only the lanes whose name matches. A lane's name is its file's name without `.test.mjs`. |
| `--port <n>` | Base DevTools port. Default 9560; the lanes get the first free ports from *n*. A port is free when nothing listens on it and no other run has claimed it: each run claims its ports with a lock file in `%TEMP%\tb-ports`. |
| `--jobs <n>` | Lanes at once. Default 2. |
| `--timeout <secs>` | A lane still running after this long is ended and counted as failed. Default 600. |
| `--ide <path>` | The `twinBASIC.exe` to copy, found as for [`tbbuild.mjs`](Tools-Compiler#tbbuild). |
| `--show` / `--hide` | As for [`tbbuild.mjs`](Tools-Compiler#tbbuild). |

**It puts the registry back as it found it, and checks.** It restores the IDE's own entries as `tbbuild` does, and also the settings the add-ins under test save with `SaveSetting`. Those live under `HKCU\Software\VB and VBA Program Settings\<name>`, shared with any installed copy of the same add-in, so a lane names its add-ins' application names in `lanes.mjs` (`settings`). The runner records them before the first lane, deletes them before each lane that names them (so its add-ins start from their defaults) and puts them back at the end. Two lanes that name the same one never run at once.

Afterwards it confirms that no entry names a lane's folder and that the settings are as found, and reports any new application key that no lane named. Ctrl+C ends the lanes and still puts everything back, as does a crash of the runner once it has recorded the registry.

**An add-in under test starts no browser.** Every IDE the harness starts, including those of `tbbuild`, `tbrun` and `check_examples`, has the environment variable `TB_ADDIN_TEST` set to `1`, and an add-in tested here is expected to check it. While it is set, the add-in prints `open <url>` to the Debug Console instead of opening a page, and a scenario reads the line there. A browser started on the harness's private desktop would open where nobody can see it and keep running.

**The add-ins you keep in `%APPDATA%\twinBASIC\addins` never load into a test IDE.** The compiler takes that folder from the IDE's `APPDATA` environment variable. Every IDE a lane starts has an `APPDATA` inside the lane's work folder, and a lane fails if its IDE's add-in folder is anywhere else.

Exit codes: **0** every lane passed, and the registry is as it was found; **1** a lane failed, or the run was interrupted; **2** the harness could not run: a refused command line, no IDE, no matching lane, a registry it could not record, or a crash after which the registry was put back; **3** the registry or a work folder was not put back (see the lines above), at the end of a run or after a crash, which wins over a 1 because the registry is what to repair.

## ide_test.mjs
{: #ide-test }

    node scripts/ide_test.mjs [--only <regex>] [--port N] [--jobs N] [--timeout S]
                              [--ide <path>] [--show|--hide]

Runs the IDE scenarios under `test/ide/`: the scenarios that operate the IDE itself, such as the debugger, Export Project and the Packages dialog, rather than an add-in. It is the same runner as [`addin_test.mjs`](#addin-test), with the same flags, lanes, registry handling and exit codes. Each file listed in `test/ide/lanes.mjs` is one **lane**, run by [`ide-test.bat`](Tools#ide-testbat). Run on its own, a scenario skips itself.

The only differences are the suite and the default base port, 9660. The rules of `addin_test.mjs` apply unchanged: every IDE has a private `APPDATA` and `TB_ADDIN_TEST` set to `1`, and an IDE is ended by its process id, never by its image name.

Exit codes: **0** every lane passed, and the registry is as it was found; **1** a lane failed, or the run was interrupted; **2** the harness could not run: a refused command line, no IDE, no matching lane, a registry it could not record, or a crash after which the registry was put back; **3** the registry or a work folder was not put back (see the lines above), at the end of a run or after a crash, which wins over a 1 because the registry is what to repair.

## try_help_addin.mjs
{: #try-help-addin }

    node scripts/try_help_addin.mjs [--project <dir>] [--port N] [--ide <path>]

Opens an IDE on your own desktop with the help add-in in `add-in/` built and loaded, to try it by hand, and waits until the IDE is closed. Run `build.bat` first: the pane's pages come from the built site, `docs/_site`, served on `localhost`.

The IDE is set up as a lane of [`addin_test.mjs`](#addin-test) is. The add-in goes into a private copy of the twinBASIC install in the temp folder, never into the install's `addins\` or `%APPDATA%\twinBASIC\addins\`, and the IDE has a private `APPDATA`, so none of your own add-ins loads into it. `TB_ADDIN_TEST` is `1`, so *Open in browser* prints `open <url>` to the Debug Console and starts nothing. This IDE is on your desktop; the IDE that builds the add-in first runs on a private desktop.

`--project` names the exported project to open, by default `test/addin/helphost`, the help lane's host. It is opened as a staged copy, so edits made in the IDE are not kept. `--port` is where the search for the IDE's DevTools port starts, 9590 by default. Closing the IDE, or Ctrl+C, puts back the IDE's registry entries and the add-in's saved settings (`tbDocsHelp`) and deletes the copy.

Exit codes: **0** the IDE was closed, and the registry is as it was found; **1** the add-in did not build, or the project does not compile; **2** the tool could not run: a refused command line, no IDE, no built site, a registry it could not record, or a crash; **3** the registry or the work folder was not put back (see the lines above).

## shoot_docs.mjs
{: #shoot-docs }

    node scripts/shoot_docs.mjs [--only <regex>] [--out <dir>] [--diffs <dir>] [--jobs N] [--port N] [--ide <path>] [--svg] [--bundles <dir>]

Takes the documentation's screenshots of the IDE, so that one run regenerates them after a new BETA. Each picture belongs to a *setup*, one IDE brought to a known state. A setup's IDE is started only when one of its pictures is selected. Run `build.bat` first: the help setup's pane pages come from the built site, `docs/_site`, served on `localhost`.

- **help** builds the help add-in in `add-in/` into a private copy of the twinBASIC install and opens the demo project `test/addin/helpdemo`. It takes the eight pictures of the [Help Add-In](../../tB/IDE/AddIns/Help) page, `docs/IDE/AddIns/Images/Help_<Name>.png`.
- **no-project** starts the IDE with no project open: the menus under `docs/IDE/Menu/Images/`, and the dialogs that need no project --- New / Open Project and its tabs, the Manage Keyboard Shortcuts and Manage Panel Layouts dialogs, and the ones the FAQ shows.
- **project** opens the demo project without the add-in, for the dialogs that need a project open: About, whose licence line needs the compiler, and IDE Options, whose font lists do.
- **sample**, **settings** and **glyphs** open `test/shots/sample`, a small Standard EXE made for the pictures. They take the panels and the editor with a project, Project Settings (with the settings files of `test/shots/settings`), and the icons the pages show inline.
- Further setups each bring the IDE to one state the setups above do not need:
  - the Community Edition and LIMITED badges and the splash screen;
  - the programs under `test/shots/programs`, run so that their windows can be taken, and the CodeLens, TWINPACK build and Fusion pictures;
  - the package server's dialogs, which need the network and never publish anything;
  - the Import from twinproj dialog, for a VB6 project made for the picture (`test/shots/vbp`);
  - the Webpage pane showing this documentation's home page.
- **web** is a Chrome that the tool starts on a private desktop, not an IDE. It takes the two pages of Microsoft's and GitHub's sites that the FAQ shows, and needs the network.

Every IDE is set up as a lane of [`addin_test.mjs`](#addin-test) is, with a private `APPDATA` and `TB_ADDIN_TEST` set to `1`, and never appears on your desktop.

The pictures are repeatable. The IDE lays its page out at 100% whatever the display's scaling, the page has a fixed size of 1280 by 880 CSS pixels at 2x, and animations and the text caret are switched off. The IDE's options, panel layouts and keyboard shortcut groups are set to their defaults in the page only, and the recent-project lists are replaced there, so no picture shows your own choices or projects. Nothing is saved. A picture that shows the Debug Console has its line times set to fixed values.

Menus are cut out, transparent around the menu; dialogs are taken whole. A running program's window is taken once, not in two themes, at the display's scaling. Arrows, rings and numbered badges are drawn by the tool (`scripts/lib/shot-annotate.mjs`), anchored to the element they point at, so a retake after a new BETA puts them where the element now is.

A picture is written only when it differs from the file already there by more than the noise two captures of an unchanged screen show. Each is reported as `new`, `updated` or `unchanged`; a second run with nothing changed reports every picture `unchanged`.

The Windows user name must never be in a published picture. Before each one is kept, the visible text of its page is searched for the name, and a picture whose page holds it is refused.

Every picture is twice the size it is shown at. A page that shows one gives it a `{:width
height}` of half its pixel size, so that it is sharp on a high-resolution display and in the book.

Every picture is taken in two themes by the same IDE: first in the dark theme, as `X.png`, then, with the IDE switched to its Light theme, as `X.light.png` beside it. The site shows the light picture in its light theme and the dark one in its dark theme, and the book shows the light one (see [A picture in both themes](Authoring#a-picture-in-both-themes)). A light picture that looks exactly like the dark one is not kept. Labels drawn on a picture follow its theme.

The Light theme lays some of the IDE out a few pixels smaller, so a light picture can be a few pixels off the dark one's size. One more than 32 pixels off fails, because the IDE was not in the state the dark picture shows. The run ends with a count, for each theme, of the pictures that were new, updated, unchanged or the same as the dark picture.

Flags:

- `--only` takes the pictures whose path under the output folder matches a regular expression, such as `Menu_File` or `IDE/Menu/`, each in both themes. `--out` is the folder those paths are under, `docs` by default.
- `--diffs` names a folder, outside `docs`, for a difference picture of each updated picture: the file on disk, the new picture and their difference side by side, with the region that differs magnified underneath. A matching pixel is dark grey; a differing one is yellow for one grey level, shading to red for large differences. File names end in `.dark` or `.light`. A `.capture-<n>` file is written for each two captures of one state that disagree, and a `.noise` file for a picture left as it is because it differs from the file only by that variation.
- `--jobs` is how many IDEs run at once, 6 by default and at most 16. Each runs on a private desktop with a port, a work folder and an install copy of its own. The setups wait in a queue, the longest first, and the three long ones (no-project, sample and customcontrols) are cut into three parts, each in an IDE of its own. Every line of output starts with the setup or part it is from. `--jobs 1` runs each setup whole, one after another.
- `--port` is where the search for DevTools ports starts, 9700 by default. Each IDE claims the first free one; the help setup claims three: the IDE's, the detached window's, and one for the IDE that builds the add-in, whose browser process can hold its port for a while after that IDE ends. The add-in's saved settings (`tbDocsHelp`) are emptied for the run and, with the IDE's registry entries, put back at the end.
- `--svg` also draws each picture as SVG, from the page as it stands at the capture, and writes it beside the PNG as `X.svg` when it is close enough to the PNG (see [A picture as SVG](Authoring#a-picture-as-svg)). It needs Python with fontTools. What the SVG is drawn from --- the page's layout, styles and measurements --- is saved for each picture as a *bundle* in the folder `--bundles` names, `.svgshot-bundles` in the repository by default, so that [`replay.mjs`](#replay) can draw the SVG again without the IDE. Git ignores that folder, and it must stay outside `docs`: a bundle holds the Windows user name.

Exit codes: **0** every picture was written or was unchanged; **1** a picture failed (an element was not found, the page showed the user name, or a light picture was more than 32 pixels off the dark one's size), the add-in did not build, or the demo project does not compile; **2** the tool could not run: a refused command line, no IDE, no built site, a registry it could not record, or a crash; **3** the registry or the work folder was not put back (see the lines above).

## replay.mjs
{: #replay }

    node scripts/svgshot/replay.mjs [--only <regex>] [--bundles <dir>] [--out <dir>] [--diffs <dir>] [--recheck] [--jobs N]

Draws each picture's SVG again, with the SVG converter as it is now, from the bundle that [`shoot_docs.mjs --svg`](#shoot-docs) saved when it took the picture. It starts no IDE and takes no picture, so a change to the converter under `scripts/svgshot/` is tried on every picture in about 20 seconds.

Each SVG is compared with its PNG and written, left unchanged or removed as `shoot_docs.mjs` does. An SVG that comes out the same as the file already there is not compared again, so a replay with the converter unchanged reports every picture `unchanged`.

Cutting an SVG's fonts down to the characters it draws takes most of the time, so each cut is kept in the `subsets` folder of the bundle folder, named by a hash of the font, the characters and the cutting script. [`shoot_docs.mjs --svg`](#shoot-docs) keeps and reuses them the same way.

A bundle holds only what the converter asked for when the picture was taken. A picture is left as it is and listed as needing a retake when:

- its PNG has changed since its bundle was saved;
- its bundle lacks a computed style the converter now reads;
- the converter asks for something the bundle cannot answer, such as the width of a run of text it did not draw before.

The list ends with the `shoot_docs.mjs --svg --only` command that takes those pictures again.

`--only` takes the pictures whose path under `docs` matches a regular expression, a light picture's path ending in `.light.png`. `--bundles` is the bundle folder, `.svgshot-bundles` by default, and `--out` the folder the pictures are in, `docs` by default. `--diffs` names a folder for each SVG's difference picture against its PNG. `--recheck` compares every SVG with its PNG, also one that is the same as the file, for when the comparison itself has changed. `--jobs` is how many processes draw at once, each with a browser of its own, by default half the logical processors and at most 8.

The tool needs Python with fontTools, as `--svg` does, for a cut that is not kept yet.

Exit codes: **0** every picture was drawn again; **1** a picture needs a retake, could not be drawn, or its SVG holds the Windows user name; **2** the tool could not run: a refused command line, no bundle folder, no browser, or a crash.

## imagestrip
{: #imagestrip }

    imagestrip_win32.exe <input> <output>

A twinBASIC console program, and one of two under `scripts/` that are not Node or Python (the other is the twinBASIC edition of [`impexp`](Tools-Compiler#impexp)). It writes a copy of a CSS file or an SVG file in which every image embedded as a `data:` URI keeps its pixels and any notice of whose it is, and nothing else. An SVG file also loses what only its editor needs, and so does an SVG embedded in either, whose own images are stripped in turn, at any depth. A file whose name ends in `.svg` is read as an SVG, any other as CSS.

It is for the twinBASIC IDE's own stylesheets, `styles.css`, `formDesigner.css` and the others in an install's `ide` folder, and for the twinBASIC developers to run in their build, which has twinBASIC and need not have Node. The icons in those stylesheets carry their editors' metadata (GIMP's EXIF, IPTC and XMP profiles, CorelDRAW's and Illustrator's comments) around a few hundred bytes of pixels. One icon, a lock from fileformat.info, has a CC BY-NC-SA attribution that must stay with it.

The program does to a file what `stripFile` in `scripts/lib/compact-image.mjs` does, and [its tests](Tools-Toolchain-Tests#compact-image-test) check the program's output against that function byte for byte. Each image is stripped as `compactImage`, in the same module, strips it:

- **A PNG** keeps the chunks a browser draws from (`IHDR`, `PLTE`, `tRNS`, `IDAT` and `IEND`, and `acTL`, `fcTL` and `fdAT` for an animated PNG) and its colour-space chunks (`iCCP`, `sRGB`, `gAMA`, `cHRM`, `sBIT`, `cICP`, `mDCV` and `cLLI`). The colour-space chunks go when all they say is that the picture is sRGB, which a browser assumes for a PNG that says nothing: an ICC profile with sRGB's colourants and tone curves (GIMP puts its own in every PNG it saves), or, with no profile, an `sRGB` chunk. `gAMA` and `cHRM` go with them. Any other profile stays, and so does every colour chunk beside a `cICP`. The chunks that stay are copied byte for byte, so the pixels do not change.
- **A JPEG** keeps the segments that decode it: the frame, the tables, JFIF, the ICC profile and Adobe's colour transform. EXIF, XMP, Photoshop's IPTC, comments and other applications' segments go. Everything from the start of the scan is copied unchanged.
- **A GIF** loses its comments and its XMP packet. Every other block stays, an animation's included.
- **An SVG** loses its XML declaration, a DOCTYPE that declares nothing, its comments and its `<metadata>` elements. A DOCTYPE that declares entities stays, and so does a `<?xml-stylesheet?>` instruction, which styles the picture. The inside of a CDATA section is left as it is.

In every format, a notice of whose the picture is and on what terms stays, byte for byte:

- a PNG text chunk whose keyword is `Title`, `Author`, `Description`, `Source`, `Copyright` or `Disclaimer`, or names a licence or rights;
- a comment that says "copyright", "licence", "(c)" or "all rights reserved";
- an EXIF, IPTC or XMP profile that gives a value to an author or a rights field.

An EXIF that turns the picture stays too. A chunk or a profile the program cannot read stays, because dropping a notice is the mistake to avoid.

**An image is known by its bytes, not by its label**, and is labelled with what it is. A JPEG labelled `image/png` comes out labelled `image/jpeg`, and the change is reported on standard error with its line. Only the media type is replaced; a parameter after it stays. A BMP is labelled `image/bmp` and otherwise left as it is. A payload labelled as a PNG, a JPEG, a GIF or a BMP that is none of the four is left unchanged and reported. Anything else, such as a font or a WebP image, is left unchanged without a report.

**A `data:` URI is read where it follows a quote or `url(`.** Its header runs from `data:` to the first comma. Its text runs to the quote just before `data:`, or to the `)` of a `url(` before it, with white space allowed between `url(` and `data:`. A `data:` anywhere else is left alone. Base64 is read as a browser reads it, with the white space inside it ignored, so the line breaks Illustrator writes into a PNG inside an SVG are no obstacle.

- In CSS, the text's escapes are undone before it is read.
- In an SVG, character and entity references such as `&quot;` and `&#10;` are undone, but not in a CDATA section, where they are text. A quote written as a reference, as in `url(&quot;data:...&quot;)` in a `style` attribute, is ended only by a quote written as one.
- An SVG's own CSS, the text of a `<style>` element and the value of a `style` attribute, is read as CSS: references are undone first, then escapes. In a `style` attribute, a line break written as itself is read as a space, as XML reads it, while `&#10;` stays a line break.

**A style sheet in a `data:text/css` URI is stripped as a CSS file is**, wherever it is: in an `@import` of a CSS file or in an SVG's `<?xml-stylesheet?>`. It is not counted as an image.

**An image keeps the encoding it has, and so does a style sheet.** Base64 is written again only when what it holds changed, and then without white space. In an SVG or style sheet written as text, percent-encoded or not and with CSS escapes such as `\'` or `\3C `, the characters it loses are cut out as the file has them, and any it gains (base64) are put in as they are. The rest is unchanged. Base64 that cannot be read, and an SVG or style sheet that cannot be read --- a `%` that starts no escape, or, for an SVG, bytes that are not UTF-8 --- are left unchanged and reported.

An image with nothing to strip keeps its original text, so a second run changes nothing. Everything outside the images is copied unchanged. The output may be the input file.

The program differs from `compactImage` in two ways. `compactImage` converts a BMP to a PNG; the program only relabels it, as it has no PNG encoder. And `compactImage` writes every SVG as percent-encoded text, where the program keeps the SVG's encoding.

The program is `scripts/imagestrip/src/`, an exported project tree, and `scripts/imagestrip/imagestrip.twinproj`, the project file packed from it, which opens in the IDE. Both are checked out byte for byte (`.gitattributes`), so the two agree in every checkout. After a change to `src/`, pack it again:

    node scripts/impexp.mjs import scripts/imagestrip/imagestrip.twinproj scripts/imagestrip/src --overwrite

Build it in the IDE, which writes `Build\imagestrip_win32.exe` beside the project file (git ignores it), or with [`tbbuild.mjs`](Tools-Compiler#tbbuild), which builds in a private folder and prints the path:

    node scripts/tbbuild.mjs scripts/imagestrip/imagestrip.twinproj --build

It prints one summary line to standard output, naming the input as it was given, and one line for each report to standard error. For `styles.css` of BETA 1005:

    styles.css: 140 images, 90 stripped, 4 relabelled; 1042091 -> 870074 bytes
    styles.css:2947: labelled /png, but is a PNG; now labelled image/png

The images counted include an SVG file itself and each image inside another. *Stripped* counts those that lost something of their own, and *relabelled* those whose label changed. A report on an image inside another names the line of the outermost `data:` URI around it. Both streams can be redirected, as [Writing a command-line tool](../../Features/Project-Configuration/Project-Types#writing-a-command-line-tool-output-exit-code-and-arguments) describes. The program has no `--help`: run without arguments, it prints its usage to standard error and exits 2.

No gate builds the program, so `test.bat` and CI skip the half of [`compact-image.test.mjs`](Tools-Toolchain-Tests#compact-image-test) that runs it. After a change to `src/`, build it and run that half by hand, with `IMAGESTRIP_EXE` naming the exe:

    set IMAGESTRIP_EXE=<path of imagestrip_win32.exe>
    node --test test/compact-image.test.mjs

Its unit tests are in twinBASIC, beside its code in `src/Sources/`: the `[TestFixture]` modules `PngTests`, `ColourTests`, `JpegGifTests`, `SvgTests`, `FileTests` and `InflateTests`, whose images `TestImages` builds byte by byte. They call the program's code directly and check it with the Assert package, case for case as the module tests of `compact-image.test.mjs` check `compactImage` and `stripFile`. They also check that `Inflate` reads the stored, fixed and dynamic blocks zlib writes. [`tbrun.mjs`](Tools-Compiler#tbrun) runs them in the compiler's test mode and prints PASS or FAIL for each:

    node scripts/tbrun.mjs scripts/imagestrip/src --tests

Exit codes: **0** the output was written, with or without reports; **1** a file that cannot be read or written: an input that does not exist or is a folder, an output whose folder does not exist or that is itself a folder, or a write that is refused; **2** a command line without exactly two arguments.
