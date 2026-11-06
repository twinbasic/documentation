---
title: IDE Automation
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 6
permalink: /Documentation/Development/Tools-IDE
---

# IDE Automation
{: .no_toc }

Operates the twinBASIC IDE to test add-ins and the IDE itself, to try the help add-in by hand, and to take the documentation's IDE screenshots and review them. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## probe_theme_semicolon.mjs
{: #probe-theme-semicolon }

    node scripts/probe_theme_semicolon.mjs [--ide <twinBASIC.exe>]

Lists the properties that the twinBASIC IDE silently drops when it loads the theme files it ships. It is the check behind the `BUGS-TO-REPORT.md` entry whose reproducer is `bugs/theme-missing-semicolon/`: in BETA 1010, line 63 of `Dark.theme` and of `Light.theme` is `DiagnosticsGroupFontSize: 90%` with no `;`, so it runs into the next line, and the loader loses both `DiagnosticsGroupFontSize` and `DiagnosticsGroupFontWeight`. It starts no IDE and no program and writes nothing, but it needs an unpacked twinBASIC install. It is outside every gate and CI.

It reads every `.theme` file in the install's `themes` folder and cuts each one as `applyThemeData` in the IDE's `ide\main.js` does. The loader removes the `/* */` comments, cuts the text at each `;` followed by a space, a tab or a line end, removes the line breaks from each piece, cuts each piece at each `: ` and `:` followed by a tab, and keeps the piece only if that gives exactly two parts. Any other piece is dropped without a message.

| Flag | Effect |
|---|---|
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. The `.theme` files read are those in the `themes` folder beside it. |

The output is one line for each dropped piece that holds text, `<file> line <n>: dropped <what it holds>`, with the file relative to the install and the line where the piece starts. A piece made of several properties run together is shown as their names. The last line is a summary, `<n> properties are lost in <k> of <total> shipped themes (BETA <build>)`, or `no shipped theme loses a property (BETA <build>)`.

Exit codes: **0** every piece of every shipped theme loads; **1** at least one is dropped; **2** a refused command line, no IDE, no `themes` folder or no `.theme` file in it, or a crash.

## addin_test.mjs
{: #addin-test }

    node scripts/addin_test.mjs [--only <regex>] [--jobs N] [--timeout S]
                                [--ide <path>] [--show|--hide]

Runs the add-in scenarios under `test/addin/`. Each scenario file is a `node:test` file and one **lane**, listed in `test/addin/lanes.mjs`; run it with [`addin-test.bat`](Tools#addin-testbat), because on its own a scenario skips itself. A lane runs in its own process, with its own slot from [`tbbroker`](Tools-Compiler#tbbroker) (a private desktop), work folder and private copy of the twinBASIC install, so a test add-in never loads into your own IDE and two lanes never share one. Each IDE's DevTools port is one Windows picks.

A scenario builds the add-ins it tests into its copy, opens a project and operates the IDE: it clicks, presses keys, types, and reads the add-ins' tool windows, message boxes, notifications, the code editor and the Debug Console. The eighteen lanes take about two minutes together:

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
| `--jobs <n>` | Lanes at once. Default 2. Each lane takes its slot as it starts, and gives it back when it ends. |
| `--timeout <secs>` | A lane still running after this long is ended and counted as failed. Default 600. |
| `--ide <path>` | The `twinBASIC.exe` to copy, found as for [`tbbuild.mjs`](Tools-Compiler#tbbuild). |
| `--show` / `--hide` | As for [`tbbuild.mjs`](Tools-Compiler#tbbuild). |

**It puts the registry back as it found it, and checks.** Every IDE a lane starts is given `--no-save-ide-settings` and `--no-update-recent-files`, so it writes none of your IDE's options, recent-projects list or remembered build targets. The runner restores the project state, the file association and your IDE's window size and place as `tbbuild` does, and its last line says how many writes each took. It also restores the settings the add-ins under test save with `SaveSetting`. Those live under `HKCU\Software\VB and VBA Program Settings\<name>`, shared with any installed copy of the same add-in, so a lane names its add-ins' application names in `lanes.mjs` (`settings`). The runner records them before the first lane, deletes them before each lane that names them (so its add-ins start from their defaults) and puts them back at the end. Two lanes that name the same one never run at once.

Afterwards it confirms that no project-state or recent-list entry and no remembered build target names a lane's folder (the last two are only read, because an IDE with the flags writes neither) and that the settings are as found, and reports any new application key that no lane named. Ctrl+C ends the lanes and still puts everything back, as does a crash of the runner once it has recorded the registry.

**Every IDE a lane opens has a page of 1600 by 1000 CSS pixels.** The IDE opens its window at the size your own IDE last left it, so without a fixed size a scenario that clicks the toolbar or hovers in the code editor would pass on one machine and fail on another: in a small window a tool window floats over both. The lane fixes the page's size as soon as it attaches to the IDE. A lane in `lanes.mjs` can name another size with `page`, or `null` to keep the window's own.

**An add-in under test starts no browser.** Every IDE the harness starts, including those of `tbbuild`, `tbrun` and `check_examples`, has the environment variable `TB_ADDIN_TEST` set to `1`, and an add-in tested here is expected to check it. While it is set, the add-in prints `open <url>` to the Debug Console instead of opening a page, and a scenario reads the line there. A browser started on the harness's private desktop would open where nobody can see it and keep running.

**The add-ins you keep in `%APPDATA%\twinBASIC\addins` never load into a test IDE.** The compiler takes that folder from the IDE's `APPDATA` environment variable. Every IDE a lane starts has an `APPDATA` inside the lane's work folder, and a lane fails if its IDE's add-in folder is anywhere else.

Exit codes: **0** every lane passed, and the registry is as it was found; **1** a lane failed, or the run was interrupted; **2** the harness could not run: a refused command line, no IDE (or one older than BETA 1007), no matching lane, a registry it could not record, or a crash after which the registry was put back; **3** the registry or a work folder was not put back, or the recent list or a remembered build target names a lane's folder (see the lines above), at the end of a run or after a crash, which wins over a 1 because the registry is what to repair.

## ide_test.mjs
{: #ide-test }

    node scripts/ide_test.mjs [--only <regex>] [--jobs N] [--timeout S]
                              [--ide <path>] [--show|--hide]

Runs the IDE scenarios under `test/ide/`: the scenarios that operate the IDE itself, such as the debugger, Export Project and the Packages dialog, rather than an add-in. It is the same runner as [`addin_test.mjs`](#addin-test), with the same flags, lanes, registry handling and exit codes. Each file listed in `test/ide/lanes.mjs` is one **lane**, run by [`ide-test.bat`](Tools#ide-testbat). Run on its own, a scenario skips itself.

The only difference is the suite. The rules of `addin_test.mjs` apply unchanged: every IDE has a private `APPDATA`, `TB_ADDIN_TEST` set to `1` and a page of 1600 by 1000, and an IDE is ended by its process id, never by its image name.

Exit codes: **0** every lane passed, and the registry is as it was found; **1** a lane failed, or the run was interrupted; **2** the harness could not run: a refused command line, no IDE (or one older than BETA 1007), no matching lane, a registry it could not record, or a crash after which the registry was put back; **3** the registry or a work folder was not put back, or the recent list or a remembered build target names a lane's folder (see the lines above), at the end of a run or after a crash, which wins over a 1 because the registry is what to repair.

## try_help_addin.mjs
{: #try-help-addin }

    node scripts/try_help_addin.mjs [--project <dir>] [--ide <path>]

Opens an IDE on your own desktop with the help add-in in `add-in/` built and loaded, to try it by hand, and waits until the IDE is closed. Run `build.bat` first: the pane's pages come from the built site, `docs/_site`, served on `localhost`.

The IDE is set up as a lane of [`addin_test.mjs`](#addin-test) is. The add-in goes into a private copy of the twinBASIC install in the temp folder, never into the install's `addins\` or `%APPDATA%\twinBASIC\addins\`, and the IDE has a private `APPDATA`, so none of your own add-ins loads into it. `TB_ADDIN_TEST` is `1`, so *Open in browser* prints `open <url>` to the Debug Console and starts nothing. This IDE is on your desktop; the IDE that builds the add-in first runs on a private desktop.

`--project` names the exported project to open, by default `test/addin/helphost`, the help lane's host. It is opened as a staged copy, so edits made in the IDE are not kept. Closing the IDE, or Ctrl+C, puts back the IDE's project state and file association and the add-in's saved settings (`tbDocsHelp`) and deletes the copy. The window's size and place are left as you leave them, since you move this IDE yourself, and the page keeps the window's own size.

Exit codes: **0** the IDE was closed, and the registry is as it was found; **1** the add-in did not build, or the project does not compile; **2** the tool could not run: a refused command line, no IDE, no built site, a registry it could not record, or a crash; **3** the registry or the work folder was not put back (see the lines above).

## shoot_docs.mjs
{: #shoot-docs }

    node scripts/shoot_docs.mjs [--only <regex>] [--out <dir>] [--diffs <dir> | --stage <dir>] [--events] [--jobs N] [--ide <path>] [--svg] [--bundles <dir>] [--against <rev> | --against-disk]
    node scripts/shoot_docs.mjs --cleanup [--dry-run] [--only <regex>] [--out <dir>] [--against <rev>]
    node scripts/shoot_docs.mjs --list [--only <regex>]

Takes the documentation's screenshots of the IDE, so that one run regenerates them after a new BETA. Each picture belongs to a *setup*, one IDE brought to a known state. A setup's IDE is started only when one of its pictures is selected. Run `build.bat` first: the help setup's pane pages come from the built site, `docs/_site`, served on `localhost`.

- **help** builds the help add-in in `add-in/` into a private copy of the twinBASIC install and opens the demo project `test/addin/helpdemo`. It takes the nine pictures of the [Help Add-In](../../tB/IDE/AddIns/Help) page, `docs/IDE/AddIns/Images/Help_<Name>.png`.
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

The pictures are repeatable. The IDE lays its page out at 100% whatever the display's scaling, the page has a fixed size of 1280 by 880 CSS pixels at 2x, and animations and the text caret are switched off. The IDE's options, panel layouts and keyboard shortcut groups are set to their defaults in the page only, and the recent-project lists are replaced there, so no picture shows your own choices or projects. Nothing is saved: the IDE is started with `--no-save-ide-settings` and `--no-update-recent-files`. A picture that shows the Debug Console has its line times set to fixed values.

Menus are cut out, transparent around the menu; dialogs are taken whole. A running program's window is taken once, not in two themes, at the display's scaling. Arrows, rings and numbered badges are drawn by the tool (`scripts/svgshot/annotate.mjs`), anchored to the element they point at, so a retake after a new BETA puts them where the element now is.

A picture is written only when it differs by more than the noise two captures of an unchanged screen show. The tool captures the page again and again, with no pause, until one capture is the picture as git has it at `HEAD` or the file already there, or two in a row are the same. When those two differ from both, it goes on capturing, further and further apart, for up to 5.5 seconds, and keeps the picture a capture equals, else the last two captures that agreed: some pictures are drawn in more than one version from one capture to the next, and some states take a moment to settle.

The capture is then compared with the picture at `HEAD` first. One that is that picture, or within the noise of it, leaves the file as `HEAD` has it, with its SVG (the one at `HEAD`, or none when `HEAD` has none), and is reported `restored` when the file held anything else. Comparing with the file alone, a retake over several runs could drift from the repository's picture in steps each within the noise of the file before it, or keep the other version of the noise. A capture that is not near the picture at `HEAD` is compared with the file: within the noise of it, the file stays, since an earlier run of the same retake wrote that change; else the file is written. A picture `HEAD` does not have is compared with the file only. Each picture is reported as `new`, `updated`, `restored` or `unchanged`; a second run with nothing changed reports every picture `unchanged`.

Each picture can have an entry in `test/shots/manifest.json`, keyed by its path under `docs` (a light picture's with `.light`). A run records there the twinBASIC build of each picture it writes. An entry can also change how its picture is judged. It can give the picture a noise rule of its own, with other limits or with rectangles, in the picture's pixels, left out of the comparison, and it can give the picture's SVG another bar. It can also hold a decision made in a review: to keep the old picture or take the new one, for one capture, or to accept or refuse one SVG compared with one PNG. A decision applies only to exactly the bytes it was made on, and any other capture is judged by the rule. `--cleanup` follows the same entries. A run into a folder other than `docs` neither reads the file nor writes it.

The Windows user name must never be in a published picture. Before each one is kept, the visible text of its page is searched for the name, and a picture whose page holds it is refused.

Every picture is twice the size it is shown at. A page that shows one gives it a `{:width
height}` of half its pixel size, so that it is sharp on a high-resolution display and in the book.

Every picture is taken in two themes by the same IDE: first in the dark theme, as `X.png`, then, with the IDE switched to its Light theme, as `X.light.png` beside it. The site shows the light picture in its light theme and the dark one in its dark theme, and the book shows the light one (see [A picture in both themes](Authoring#a-picture-in-both-themes)). A light picture that looks exactly like the dark one is not kept. Labels drawn on a picture follow its theme.

The Light theme lays some of the IDE out a few pixels smaller, so a light picture can be a few pixels off the dark one's size. One more than 32 pixels off fails, because the IDE was not in the state the dark picture shows. The run ends with a count, for each theme, of the pictures that were new, updated, unchanged or the same as the dark picture.

Flags:

- `--only` takes the pictures whose path under the output folder matches a regular expression, such as `Menu_File` or `IDE/Menu/`, each in both themes. `--out` is the folder those paths are under, `docs` by default.
- `--diffs` names a folder, outside `docs`, for a difference picture of each updated picture: the file on disk, the new picture and their difference side by side, with the region that differs magnified underneath. A matching pixel is dark grey; a differing one is yellow for one grey level, shading to red for large differences. File names end in `.dark` or `.light`. A `.capture-<n>` file is written for each two captures of one state that disagree, a `.noise` file for a picture left as it is because it differs from the file only by that variation, and a `.restored` file, the file and the picture at `HEAD`, for a picture put back.
- `--against` names the git revision a capture is compared with first, `HEAD` by default; git runs in the `--out` folder, and reads the run's pictures in one process. With the default, an output folder outside git is compared with its files only; a revision given that cannot be read is refused. `--against-disk` compares with the file on disk only.
- `--cleanup` starts no IDE and no browser. Every PNG under the output folder that git reports modified against the revision (`--against`, `HEAD` by default) and that is within the noise of the revision's is put back as the revision has it, with its SVG as a restored picture's is, so that only real changes stay in the working folder. An added or a deleted picture, one that differs by more than the noise, and one whose SVG alone changed are real changes and are left alone. It prints each path it puts back and a count of those, the real changes and the added and deleted pictures it skipped. `--dry-run` lists them and changes nothing. `--only` chooses a PNG when the expression matches its dark path or its `.light.png`; `--out` and `--against` apply, and the flags that need an IDE are refused. The noise is the same test, in `scripts/lib/shot-change.mjs`, that the capture and the change sheet of [`sheet.mjs --against`](#svg-sheet) apply.
- `--jobs` is how many IDEs run at once, 6 by default and at most 16. Each runs on a private desktop (a slot from [`tbbroker`](Tools-Compiler#tbbroker)) with a work folder and an install copy of its own, and a DevTools port Windows picks. The setups wait in a queue, the longest first, and the three long ones (no-project, sample and customcontrols) are cut into three parts, each in an IDE of its own. Every line of output starts with the setup or part it is from. `--jobs 1` runs each setup whole, one after another.
- The help setup's slot also carries a port from the broker for the add-in's detached window, which the add-in has to be told before it binds it. The add-in's saved settings (`tbDocsHelp`) are emptied for the run and, with the IDE's project state, put back at the end.
- `--svg` also draws each picture as SVG, from the page as it stands at the capture, and writes it beside the PNG as `X.svg` when it is close enough to the PNG (see [A picture as SVG](Authoring#a-picture-as-svg)). An SVG already there is rewritten only when its PNG is. It needs Python with fontTools. What the SVG is drawn from --- the page's layout, styles and measurements --- is saved for each picture as a *bundle* in the folder `--bundles` names, `.svgshot-bundles` in the repository by default, so that [`replay.mjs`](#replay) can draw the SVG again without the IDE. Git ignores that folder, and it must stay outside `docs`: a bundle holds the Windows user name.
- `--stage` names a folder, new or empty, outside `docs` and at a path git ignores, that takes everything the run would write: nothing is written under the output folder, to the bundle folder or to `test/shots/manifest.json`. Each picture's capture, its SVG whether or not it is close enough, its bundle, its difference pictures, its *strength maps* (how many levels each pixel is off the picture it was compared with, and the SVG's off its PNG) and what was decided about it go there, laid out as `scripts/lib/shot-stage.mjs` describes, so that another program can apply the decisions afterwards. With `--svg`, the SVG of a picture whose PNG is not written is judged and staged too, its decision *unchanged*, so that a program that takes the capture after all can write the SVG as judged. The lines printed say what was decided, as without it. It cannot be given with `--diffs` or `--bundles`. The fonts' cuts are still kept in the bundle folder's `subsets`, since a cut depends only on the font and its characters.
- `--list` starts no IDE and takes nothing. It prints the tool's table of pictures as one line of JSON: for each, the dark picture's path under `docs` (its light one is `X.light.png`, unless the picture is taken once), its setup, whether it is taken once, and whether it is of a running program's window, which has no SVG. `--only` applies, and every other flag is refused. A shot of a program's window says so in the table, and a shot whose capture and table disagree fails, so the list is always right.
- `--events` also prints a line for each event, `@@shot-event` followed by JSON: the run with its jobs and pictures, each job started, done or failed, each picture's verdict, each SVG's, a picture that failed or was not taken, and the summary. A picture's verdict says what it was compared with, its regions of change and whether it needs a person to look at it (`scripts/lib/shot-queue.mjs`). With `--events`, a line `stop` on standard input stops the run: no further picture is taken and no further setup started, and the IDEs end and the registry is put back as at the end of a run.

Exit codes: **0** every picture was written or was unchanged (with `--cleanup`, every modified picture was compared; a run stopped with `--events` exits as for the pictures it took); **1** a picture failed (an element was not found, the page showed the user name, or a light picture was more than 32 pixels off the dark one's size), the add-in did not build, or the demo project does not compile, or with `--cleanup` a picture could not be read as a PNG; **2** the tool could not run: a refused command line, no IDE, no built site, a registry it could not record, no such revision (or, with `--against` or `--cleanup`, no git repository), or a crash; **3** the registry or the work folder was not put back (see the lines above).

## replay.mjs
{: #replay }

    node scripts/svgshot/replay.mjs [--only <regex>] [--bundles <dir>] [--out <dir>] [--diffs <dir> | --stage <dir>] [--events] [--recheck] [--jobs N]

Draws each picture's SVG again, with the SVG converter as it is now, from the bundle that [`shoot_docs.mjs --svg`](#shoot-docs) or [`chromeshot.mjs`](#chromeshot) saved with the picture. It starts no IDE and takes no picture, so a change to the converter under `scripts/svgshot/` is tried on every picture in about 20 seconds.

Each SVG is compared with its PNG and written, left unchanged or removed as `shoot_docs.mjs` does. An SVG that comes out the same as the file already there is not compared again, so a replay with the converter unchanged reports every picture `unchanged`. A picture whose entry in `test/shots/manifest.json` names its SVG is compared again all the same, and judged by that entry as `shoot_docs.mjs` judges it.

Cutting an SVG's fonts down to the characters it draws takes most of the time, so each cut is kept in the `subsets` folder of the bundle folder, named by a hash of the font, the characters and the cutting script. [`shoot_docs.mjs --svg`](#shoot-docs) keeps and reuses them the same way.

A bundle holds only what the converter asked for when the picture was taken. A picture is left as it is and listed as needing a retake when:

- its PNG has changed since its bundle was saved;
- its bundle lacks a computed style the converter now reads;
- the converter asks for something the bundle cannot answer, such as the width of a run of text it did not draw before.

The list ends with the `shoot_docs.mjs --svg --only` command that takes those pictures again.

`--only` takes the pictures whose path under `docs` matches a regular expression, a light picture's path ending in `.light.png`. `--bundles` is the bundle folder, `.svgshot-bundles` by default, and `--out` the folder the pictures are in, `docs` by default. `--diffs` names a folder for each SVG's difference picture against its PNG. `--recheck` compares every SVG with its PNG, also one that is the same as the file, for when the comparison itself has changed. `--jobs` is how many processes draw at once, each with a browser of its own, by default half the logical processors and at most 8. `--stage` and `--events` work as for [`shoot_docs.mjs`](#shoot-docs): the stage takes each SVG drawn, its difference picture, its strength map and what was decided about it, and nothing is written under the output folder; `stop` on standard input is passed to every process, and each draws no further SVG.

The tool needs Python with fontTools, as `--svg` does, for a cut that is not kept yet.

Exit codes: **0** every picture was drawn again; **1** a picture needs a retake, could not be drawn, or its SVG holds a word no published picture may show (the Windows user name, git's `user.name` or `user.email`, or a word of `scripts/svgshot/private.json`); **2** the tool could not run: a refused command line, no bundle folder, no browser, or a crash.

## The svgshot Chrome extension
{: #svgshot-extension }

Takes a page in your own Chrome the way [`shoot_docs.mjs --svg`](#shoot-docs) takes the IDE's page: a PNG, and the bundle its SVG is drawn from, in a dark and a light picture. It is for a page that needs your own sign-in, which no tool can open: the six GitHub pictures of [Deploying to docs.twinbasic.com](Building#deploying-to-docstwinbasiccom).

The extension is the folder `scripts/svgshot`. To set it up:

1. Copy `scripts/svgshot/private.example.json` to `scripts/svgshot/private.json`, which git ignores, and list the words no picture may show, each with what to show in its place: your e-mail address, your name, your GitHub login, and anything else that holds your Windows user name.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, press **Load unpacked** and choose `scripts/svgshot`.

To take a picture:

1. Open the page and put it in the state the picture shows.
2. Press the extension's toolbar button. The side panel opens, and stays open while you work in the page.
3. Choose the picture, or **Another picture** and its path under `docs`. The panel says what each of the six must show.
4. Press **Whole viewport**, which takes what the window shows, or **Drag a rectangle**, then drag over the page. A click takes the box of the element under it, and Esc or **Cancel** gives up.

Take each of the six with **Whole viewport**, with what it shows in the window. [`chromeshot.mjs`](#chromeshot) trims the capture to the picture, so a retake is aligned as the last one was, however the page was scrolled. A rectangle dragged by hand comes out a little different each time.

Chrome shows a bar saying that the extension is debugging the browser, for as long as a capture takes. Leave it, and keep the tab showing. The page is put back as it was afterwards, and the file goes to the `svgshot` folder of your downloads as `<name>.capture.json.gz`, where [`chromeshot.mjs`](#chromeshot) reads it. A browser set to ask where to save each file asks for this one too. Each take, whether it worked or not, also saves `<name>.log.txt` there, with the time of each step, what was masked and any failure with its stack, its private words masked. A failed take saves no capture and leaves an earlier one as it was, so look at the file's time.

The capture does the following to the page:

- It lays the page out at 1x and draws it at 2x, as the IDE's pictures are. On a display scaled above 100% the tab's zoom changes for the capture, so the page is smaller for a moment. **Page width** lays the page out at that width in CSS pixels, and the six are laid out at 1280 unless it says otherwise, so that each retake has one layout. Without it the page keeps the width the tab gives it. A width that does not fit the tab is cut off on screen, so that **Drag a rectangle** cannot reach the part cut off, and **Whole viewport** still takes it.
- It replaces each private word in the page by its stand-in, in text, in text boxes, in a list's choices and in attributes, and shows a grey head in place of a picture whose address, alternative text, link or hover card holds one. The PNG and the bundle are therefore both of the masked page. Words the page draws again during the capture are masked again, and a capture they get into is taken again.
- It sets the theme with the `prefers-color-scheme` preference, and on GitHub with the attributes that hold the account's own theme.
- It draws the marks of the six pictures, in the style of the other pictures, which go into both the PNG and the SVG: a badge beside a ring, or beside a box round something tall. Where the page has nothing that a mark's table entry finds, the page asks you to click what the mark points at. **Draw the markings** turns them off.

The mask finds text. It does not find text inside a picture or a `<canvas>`, or in a frame of another site, so look at the preview the panel shows before you publish a capture.

## chromeshot.mjs
{: #chromeshot }

    node scripts/svgshot/chromeshot.mjs <capture | folder>... [--out <dir>] [--bundles <dir>] [--diffs <dir>] [--words <file>] [--no-trim]

Turns what the [Chrome extension](#svgshot-extension) saved into a picture. A folder stands for every capture in it. For each capture it writes `X.png`, and `X.light.png` when both themes were taken, as [`shoot_docs.mjs`](#shoot-docs) writes a capture: one within a capture's noise of the picture is not written, and a light picture with the dark one's pixels is not kept. It draws each SVG from its bundle, writes it beside its PNG when it is close enough to it, and keeps the bundle in the bundle folder, so that [`replay.mjs`](#replay) draws the SVG again after a change to the converter. The line for each PNG gives the `{:width height}` for the page that shows it.

A capture of the whole window, of one of the six, is cut down first. `scripts/svgshot/chrome/shots.mjs` names, for each picture, the elements it holds, by the same kind of anchor its marks use. The tool finds them in the page as the capture recorded it, takes the box round them and the marks, leaves 8 CSS pixels round that unless the table gives a side room of its own, and cuts both themes to it. The capture keeps the whole window, so a change to that table trims the same capture again, with no new picture. A picture whose area was not all in the window is refused, with the side to scroll to. A rectangle dragged by hand is left as it is, which the tool says, and `--no-trim` keeps the whole window.

A capture holds what the page held, so it stays out of the repository. The tool refuses one under `docs`, or where git would take it. It also refuses a capture of a bundle format the converter does not read, and one that shows the Windows user name, git's `user.name` or `user.email`, or a word of `scripts/svgshot/private.json`. Every capture is checked before any file is written, and [`replay.mjs`](#replay) makes the same check of each SVG it draws.

`--out` is the folder the pictures are in, `docs` by default. `--bundles` is the bundle folder, `.svgshot-bundles` by default, refused under `docs` and where git would take it. `--diffs` names a folder for each SVG's render, the picture drawn again as a PNG, and its difference picture, and the line for each SVG then says how far the render is from the screenshot by the rule for two captures. That rule allows no shift of a pixel for the edge of a glyph, so a faithful SVG does not meet it. `--words` names another list of private words, and `--no-trim` keeps the whole window of a capture.

The tool needs Python with fontTools, as `--svg` does.

Exit codes: **0** every capture was written, or left the pictures as they are; **1** a capture was refused or could not be drawn; **2** the tool could not run: a refused command line, or a capture that cannot be read.

## chrome_try.mjs
{: #chrome-try }

    node scripts/svgshot/chrome_try.mjs --url <address> --capture-dir <dir> [--out <path> | --shot <name>] [--drag x,y,x,y | --os-drag x,y,x,y] [--scroll N] [--width N] [--scale N] [--mask find=show]... [--window <png>]

Takes a public page through the [Chrome extension](#svgshot-extension) with no person there, which shows that the extension still loads and works after a change to it or to `scripts/svgshot/capture.mjs`. It loads a copy of the extension into Puppeteer's Chrome for Testing, on a private desktop, with a fresh profile, so it is signed in to nothing, and it presses the side panel's buttons as a person would. It saves the capture into `--capture-dir`, for [`chromeshot.mjs`](#chromeshot) with `--out` set to a folder of your own, and then checks that the page is as it found it. It needs the network and `tbbroker`, and is outside every gate.

`--url` is the page, and `--out` the picture's path under `docs`, or `--shot` the name of one of the six pictures, with its marks. It presses **Whole viewport** unless `--drag` gives a rectangle to drag over, in the window's CSS pixels, or `--os-drag` gives one in the device pixels of the Chrome window's client area, sent as Windows' own mouse messages, the path a person's mouse takes. `--scroll` scrolls the page down first, and `--width` fills in **Page width**. `--scale` is the display's scale, 1 by default, so that `--scale 1.5` tries a display at 150%. `--mask` adds a private word and its stand-in, and may be given again. `--window` writes a picture of the Chrome window during the capture.

Exit codes: **0** the capture was saved and the page is as it was found; **1** the panel reported a failure, or the page was not put back; **2** the tool could not run.

## sheet.mjs
{: #svg-sheet }

    node scripts/svgshot/sheet.mjs --out <dir> [--docs <dir>] [--bundles <dir>] [--only <regex>] [--all] [--jobs N]
    node scripts/svgshot/sheet.mjs --out <dir> --against <rev> [--docs <dir>] [--only <regex>]

Writes a page that shows how far each picture's SVG is from its PNG, to look at in a browser. By default it shows every picture under `docs` that has no SVG beside it, which is the list of pictures the SVG converter still draws wrongly. The page is `index.html` in the folder `--out` names, with the pictures it shows in its `pictures` folder, so it opens from the disk with no server.

Each picture that has a bundle is drawn again from it, with the converter as it is now, as [`replay.mjs`](#replay) draws it, and compared with its PNG in the same way: the share of its pixels more than 96 grey levels off the PNG's, with a shift of one pixel allowed. Those pictures come first, the worst first, each with its path, theme, size, how far off it is, and the PNG, the SVG's render and a map of the differences side by side. Selecting a picture opens it at full size. A picture whose PNG has changed since its bundle was saved is drawn all the same, with a note. The pictures with no bundle follow, as small pictures.

`--all` shows every picture, also those that have an SVG: a picture with a bundle is drawn again from it, and one without a bundle has its SVG file compared as it is. `--only` takes the pictures whose path under `docs` matches a regular expression, a light picture's path ending in `.light.png`. `--docs` is the folder the pictures are in, `docs` by default, and `--bundles` the bundle folder, `.svgshot-bundles` by default, where new font cuts are kept as `replay.mjs` keeps them. `--jobs` is how many processes draw at once, by default half the logical processors and at most 8. The tool starts no IDE and writes nothing under `docs`.

**`--against <rev>`** writes a page of another kind: it compares each PNG under `docs` with the same file at a git revision (a commit, a branch, a tag, `HEAD`), to review what a screenshot run rewrote. Git runs in the `--docs` folder, so that folder's own repository answers, and the folder as it is on disk is compared with the revision, tracked and untracked files alike. Each picture that differs is shown as the revision has it, as it is now and as a map of the differences, each opening at full size, with its path, theme, both sizes and the share of its pixels that changed by more than 16 grey levels. The map is dark grey where the pictures agree, yellow for a difference of one grey level and red for 128 or more. Pictures of two sizes are compared aligned at the top left over the area they share, and the row says so; the map shows the whole of the larger picture, a pixel only the old picture has cyan and one only the new picture has magenta. The page opens with a heading that names the revision and its commit, then lists:

1. the changed pictures, most changed first;
1. the pictures that differ from the revision only within the noise rule of [`shoot_docs.mjs`](#shoot-docs) (no pixel more than 16 grey levels off, and at most 0.5% of the pixels off at all). That tool never writes a capture within that rule of a file, so such a picture was most likely rewritten in error. This section shows one `git checkout <rev> -- <paths>` command that would restore them all, with paths from the repository's root, and the [`shoot_docs.mjs --cleanup`](#shoot-docs) command that would restore them with their SVGs. The tool only shows them and never runs them;
1. the added pictures, which are new in the working folder, and then the deleted ones, each with a single picture.

A picture with an entry in `test/shots/manifest.json` is judged by it on either page, as [`shoot_docs.mjs`](#shoot-docs) and its `--cleanup` judge it: an SVG by its own bar, a PNG by its own noise rule, and either by a review's decision about the same bytes. A picture listed within noise is then exactly one that `--cleanup` puts back. Its card says what its entry changes, and its bar marks its own limit. The file is read only when `--docs` is `docs`.

It compares PNG with PNG: no SVG is drawn, no bundle is read and no browser starts, so a run over several hundred pictures takes about half a minute. `--against` is not combined with `--all`, `--bundles` or `--jobs`; `--only` and `--docs` apply as before. A revision the repository does not have, or a `--docs` folder outside a git working folder, is refused before anything is written.

The pictures on the page are drawn without the check for the Windows user name, so the page and its pictures can show it. So the folder may not be under `docs`, nor inside a git working folder at a path git does not ignore; a folder that already holds files must hold an earlier page of this tool, which is replaced.

Exit codes: **0** the page was written; **1** the page was written, but a picture could not be drawn or compared, and is listed with the reason; **2** the tool could not run: a refused command line, a refused folder, no bundle folder, no browser, no such revision, a `test/shots/manifest.json` it cannot read, or a crash.

## shot_review.mjs
{: #shot-review }

    node scripts/shot_review.mjs [--port N] [--retake <regex> | --replay <regex>] [--jobs N] [--ide <twinBASIC.exe>]
    node scripts/shot_review.mjs --archived <id> [--port N]

Reviews what [`shoot_docs.mjs`](#shoot-docs) and [`replay.mjs`](#replay) decided about each picture, in a browser. Both decide with fixed limits: whether a capture differs from the picture enough to be written, and whether an SVG is close enough to its PNG. No limit is right for every picture. A caret or a clock in a large window can count as a change, and a word missing from a large SVG can be within its bar. This tool shows each decision beside the pictures it was made on, and lets a person decide otherwise. It also starts and stops the runs, and commits the result.

It serves its pages at `http://127.0.0.1:4180/`, on the loopback address only; `--port` chooses another port. Open that address in a browser while the tool runs, and press Ctrl+C in its terminal to close it.

The tool works in a *session*: a folder in `.shot-review` at the repository's root, which git ignores, since what it holds can show the Windows user name. A session's *baseline* is the commit its pictures are compared with: `HEAD` when the session was made. Closing the tool loses nothing, and the next start opens the same session. Only one tool at a time holds it.

**The overview** (`/`) shows every picture the session's runs took or drew, as cards in groups: in progress, needs a look, changed (most changed first), only noise, changed outside the runs, unchanged, and added, deleted or failed. *Needs a look* holds the pictures whose decision a person should check, chosen from the regions of the picture that changed: a capture taken although only a fringe or a caret changed, or only a word or two; a capture kept as noise although a block of it changed; an SVG accepted although a part of it is missing, or refused for a fringe alone. *Changed outside the runs* holds the pictures under `docs` that differ from the baseline although no run of the session reported them, such as a retake from a terminal. Each card shows a chip for each decision, why the picture needs a look, and its allowances. Filters show only the pictures that need a look, those with an allowance or a decision (*Overridden*), or those with no SVG. **Resume at** goes back to where the review of *Needs a look* was left.

**All pictures** (`/all`) shows every picture `shoot_docs.mjs` takes (the table that [`shoot_docs.mjs --list`](#shoot-docs) prints), as the working folder has it, whatever any session did. So it is the page to open after a commit, when the overview of the new session is empty. Each card shows the picture's PNG and whether it has an SVG, the build `test/shots/manifest.json` records for it, and its allowances. Its groups are the pictures with no SVG that are of a program's window, the other pictures with no SVG, those the table names that are not under `docs`, those with an allowance or a decision, and those with an SVG. A picture with no SVG says why: a program's window, or what the newest verdict of this session or of an archived one said, such as an SVG refused for how far it was off its PNG, with the run and session it is from. When no verdict says, the card says so. **Judge their SVGs again from their bundles** replays the SVGs of the pictures with no SVG that have a bundle, with `--recheck`. A card opens the picture's page of verdicts when the session has one, and otherwise a page that shows the picture at the baseline, the file and its SVG, with **Retake this picture** and **Replay its SVG**.

**A picture's page** compares the picture at the baseline with the new capture: side by side, by a swipe, by blinking between them, and as a difference map, with the SVG against its PNG and its own map. Below them, each region that changed is cropped and enlarged. The page's choices:

- **Keep the old picture** or **Take the new capture**, and **Accept the SVG** or **No SVG**. A decision is kept in `test/shots/manifest.json` for exactly the bytes it was made on. A later capture with other bytes is judged by the rule again, and goes back to *Needs a look*.
- **Allowances**: the picture's own noise rule (the grey levels and the share of pixels) and its SVG's own bar, each with rectangles left out of the comparison. Drag on the picture to draw a rectangle. An allowance lasts, across retakes, until it is removed.
- **Back to the tool's verdicts** removes the picture's decisions.
- **Retake this picture** and **Replay its SVG** start a run of the one picture.

Each change judges the picture again at once and writes the result under `docs`. The keys J and K move to the next and the previous picture.

**The runs page** (`/runs`) starts a retake (`shoot_docs.mjs --svg`, with an IDE chosen from the installs found), a replay (`replay.mjs`) or a clean-up (`shoot_docs.mjs --cleanup`, whose list of pictures is shown first) of the pictures matching a pattern or of those selected on the overview. One run runs at a time. Each run shows the command line it is the same as, its progress by setup, and its log, and **Stop** ends a retake or a replay as its own end would: its IDEs end and the registry is put back. **Kill** ends its process at once, which skips that, and is offered only after a stop. `--retake <regex>` or `--replay <regex>` starts a run as the tool opens; `--jobs` and `--ide` are its options.

A retake or a replay runs with `--stage` and `--events`, so it writes nothing under `docs` itself. The tool applies each decision under `docs` as it arrives, and a picture can be reviewed while the run goes on. A retake and a clean-up compare with the session's baseline (`--against`), whatever `HEAD` is. When `HEAD` moves under the session, the overview says so and offers to move the session to it.

**The commit page** (`/commit`) commits the session's own files and nothing else: the PNGs and SVGs its runs reported that git reports changed, and `test/shots/manifest.json`. It counts them, lists them, and lists the working folder's other changes as left out. The message is one line by default, such as *Screenshots retaken on BETA 1034: 1 taken by review*, can be edited, and **Back to the default message** puts it back. The commit runs the repository's hooks, which take a few seconds. Meanwhile the tool goes on serving its pages, which say that the commit is under way, also when fetched again or opened in another tab, and it refuses any change and any run until the commit has ended. Ctrl+C waits for a commit under way to end before it closes the tool. The commit is refused while a run runs, or while `HEAD` is not the baseline. A commit closes the session: it is archived as `.shot-review/archive/<id>`, `<id>` the commit's short hash, and the tool goes on with the next session, whose baseline is the new commit. `--archived <id>` opens an archived session again, read-only, beside the open one on another `--port`.

Exit codes: **0** the tool was closed; **2** the tool could not run: a refused command line, the port in use, the session held by another tool, no archived session of that id, no git working folder, or a crash.

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

It prints one summary line to standard output, naming the input as it was given, and one line for each report to standard error. For a style sheet `site.css` that embeds 140 images, one of them a PNG labelled `/png`:

    site.css: 140 images, 90 stripped, 1 relabelled; 1042091 -> 870074 bytes
    site.css:2947: labelled /png, but is a PNG; now labelled image/png

The images counted include an SVG file itself and each image inside another. *Stripped* counts those that lost something of their own, and *relabelled* those whose label changed. A report on an image inside another names the line of the outermost `data:` URI around it. Both streams can be redirected, as [Writing a command-line tool](../../Features/Project-Configuration/Project-Types#writing-a-command-line-tool-output-exit-code-and-arguments) describes. The program has no `--help`: run without arguments, it prints its usage to standard error and exits 2.

No gate builds the program, so `test.bat` and CI skip the half of [`compact-image.test.mjs`](Tools-Toolchain-Tests#compact-image-test) that runs it. After a change to `src/`, build it and run that half by hand, with `IMAGESTRIP_EXE` naming the exe:

    set IMAGESTRIP_EXE=<path of imagestrip_win32.exe>
    node --test test/compact-image.test.mjs

Its unit tests are in twinBASIC, beside its code in `src/Sources/`: the `[TestFixture]` modules `PngTests`, `ColourTests`, `JpegGifTests`, `SvgTests`, `FileTests` and `InflateTests`, whose images `TestImages` builds byte by byte. They call the program's code directly and check it with the Assert package, case for case as the module tests of `compact-image.test.mjs` check `compactImage` and `stripFile`. They also check that `Inflate` reads the stored, fixed and dynamic blocks zlib writes. [`tbrun.mjs`](Tools-Compiler#tbrun) runs them in the compiler's test mode and prints PASS or FAIL for each:

    node scripts/tbrun.mjs scripts/imagestrip/src --tests

Exit codes: **0** the output was written, with or without reports; **1** a file that cannot be read or written: an input that does not exist or is a folder, an output whose folder does not exist or that is itself a folder, or a write that is refused; **2** a command line without exactly two arguments.
