# The IDE Help Add-in

See [WIP.md](WIP.md) for the maintenance guide. This file covers the planned twinBASIC IDE
add-in that shows the documentation for the symbol under the cursor, and the harness that
tests IDE add-ins by machine, which the add-in is developed against.

**Status: Stage 1, the harness, is half built** --- items 1 to 4 are done, and the add-in
itself is not started. This file replaces the June draft, `add-in/PLAN.md`
in commit `d159acf8` ("Roughly plan the help add-in"). That commit is on no branch --- only
the detached HEAD of an old worktree keeps it --- so everything in it worth keeping is here,
corrected, and nothing depends on it surviving. [What changed from the June
draft](#what-changed-from-the-june-draft) lists the corrections.

Facts about the IDE are from **BETA 983**. An offset like `main.js@611152` is a byte offset
into the one-line `ide/main.js`; offsets move with every build, so in any other build search
for the quoted text instead. Each fact is one of three kinds:

- stated plainly: read in the IDE's code or registry;
- marked *(reported)*: from a static reading or a harvested finding, not re-checked;
- marked with a probe number (**P1** to **P14**): only running the IDE can settle it.
  [Stage 2](#stage-2-probes-that-decide-the-design) lists them.

## Goals

1. **Help for the symbol under the cursor.** A key press opens the documentation page for
   the identifier at the cursor, or for the selection. F1, unless P1/P2 rule it out.
2. **A help pane.** A dockable tool window with search and a page view, so that reading the
   documentation does not mean leaving the IDE.
3. **Theme-aware.** It follows the IDE's light, dark and classic themes.

It also makes a documentation promise real. [Permanent
Links](docs/Documentation/Permanent-Links.md) says that "the IDE help system" relies on the
`/tB/` URLs, but the IDE has no documentation help today: its scripts contain neither
`docs.twinbasic.com` nor `/tB/` *(reported)*. This add-in is the first real consumer of that
contract, and it is what [WIP.Authoring.md](WIP.Authoring.md#description-attributes-are-not-connected-to-this-documentation)
waits on before `[Description]` text and these pages can be connected.

## What the IDE gives an add-in

### The SDK in one paragraph

[WIP.tbIDE.md](WIP.tbIDE.md) has the whole API. An add-in is a Standard DLL that exports
`tbCreateCompilerAddin(Host) As AddIn`. Through `Host` it gets toolbar buttons, tool windows
built through a DOM API, `KeyboardShortcuts.Add`, the active `CodeEditor` (text, selection,
cursor), the project's virtual file system, the theme, the DEBUG CONSOLE, notifications and
message boxes. **It has no call to open a URL, none to run an IDE command, and none to ask
the compiler what a symbol is.** Each of those gaps shapes a stage below.

### Loading

- **The compiler loads add-ins, not the page.** `bin/twinBASIC_win64.dll` builds the search
  path at run time from the pieces `\`, `addins`, `\`, `win64`, `\`, `*.dll`, so its root
  folder cannot be read off the binary. One root is known all the same: the add-in samples
  build into `${IdePath}\addins\${Architecture}\`. The shipped install has `addins\win32\`
  and `addins\win64\` beside `bin\`, each holding `tbGlobalSearchAddIn1.dll` --- so every
  IDE that `tbbuild`, `tbrun` and `examples.bat` start today loads the Global Search add-in.
  Measured through the compiler's own list (`loadedAddins` in `tb-ide.mjs`): the real
  install's IDE reports `GlobalSearchAddIn AddIn`, and a copy of it with empty `addins`
  folders reports none.
- **The page creates `%APPDATA%\twinBASIC\addins\win32` and `...\win64`** at startup
  (`CreateCommonFolders`, `main.js@961019`) *(reported)*, and hands the folder above them
  to the compiler: `RequestStartCompiler` and `RequestLoadAddins` both send
  `commonFolderRootPath`, the resolved `%APPDATA%\twinBASIC` (`main.js@1047705` and
  `@1048667`). That makes it likely that the compiler loads add-ins from there too, and it
  is still **P6**. If it does, a DLL placed there loads into every IDE the user starts.
- **Load failures have their own messages** in the compiler's strings: `Failed to load
  addin.  LoadLibrary() failed.`, `Entry point not found.  Addin may have been compiled for
  a newer version of the twinBASIC IDE.`, `Entry point 'tbCreateCompilerAddin' call
  failed.` and `...returned an object that does not implement interface IAddInV1.` **They
  go to the DEBUG CONSOLE**, after the file's name in brackets --- measured with a 32-bit
  add-in in `addins\win64`: `[InFolder_win64.dll] Failed to load addin.  LoadLibrary()
  failed.` **An add-in that failed to load is still in the compiler's list**, as `Unknown
  Addin`, so a test looks for the name it expects rather than counting.
- **Holding Shift while a project opens skips the add-ins.** The page sends
  `RequestLoadAddins` only when `shiftKeyDown` is false, and otherwise writes `[IDE] SHIFT
  KEY DETECTED: DISABLED LOADING OF ADDINS` to the DEBUG CONSOLE (`main.js@1048443`).
  `shiftKeyDown` follows the keymap's `tbMisc_ShiftKeyStateDown` and `...Up` actions, so a
  test that presses Shift must not do it while a project is opening.
- **The loader also looks for `tbCreateCompilerAddin_v2`**, and the linker knows a
  `tbCreateCompilerAddin_v3`. The tbIDE package declares neither, and what they take is
  unknown (**P14**).
- **Add-ins cannot be switched off.** The Add-Ins menu lists the loaded add-ins with ticks,
  and every item calls `notSupportedMenuOption()` *(reported)*. Restarting the compiler
  removes every add-in's UI and shortcuts (`removeAddinAlterations`) *(reported)*; whether it
  also reloads the DLLs from disk is **P9**.
- **The build target picks the compiler, and the compiler picks the folder.** The IDE
  remembers the target of each project in the shared registry, as one JSON object in
  `IDESettings\targetArchitectureMemory` keyed by project path, and opens a project in the
  target remembered for it --- or, with none, in the first on its list, win32. Measured with
  a differently named DLL in each folder: a project with no memory got
  `twinBASIC_win32_noDEP.exe`, which loaded `addins\win32` alone; a project remembered as
  win64 got `twinBASIC_win64_noDEP.exe` with `twinBASIC_nativedbg_win64.exe`, which tried
  `addins\win64` alone. What switching the target of an open project (Ctrl+F1 / Ctrl+F2)
  does is the rest of **P7**; `changedActiveBuildConfig` in `ide/main2.js` records the new
  target and restarts the compiler. A shipped add-in needs both builds.

### Keyboard shortcuts

Read at `main.js@608242`, `@610953` and `@611152`.

- `KeyboardShortcuts.Add` lowercases the key string, deletes its whitespace and stores it
  as it is. Matching is a plain string comparison against `{ctrl}` + `{shift}` + `{alt}` +
  the key, built in that order --- so `{SHIFT}{CTRL}d` could never match, whatever else is
  true.
- **Add-in shortcuts are matched on key-up**, in `document.onkeyup`, after the IDE's own
  handling of that key-up. The built-in bindings run on key-down, in a capture-phase
  listener *(reported)*. The key-up only dispatches if the same key's key-down was recorded
  less than 500 ms earlier.
- **The key-down is recorded only when Ctrl and Alt are not held:**
  `if((!e.ctrlKey||e.key==="Control")&&(!e.altKey||e.key==="Alt")){realKeyPresses[o]=performance.now()}`.
  So **an add-in shortcut containing `{ctrl}` or `{alt}` cannot fire.** That includes the
  SDK's own example, `{CTRL}{SHIFT}d`, and three of the four rows of the key-string table on
  the published [KeyboardShortcuts](docs/Reference/Built-In/tbIDE/KeyboardShortcuts.md) page.
  Plain keys, `{shift}` keys and function keys work. **P1** confirms it by running it; then
  it goes to [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md) with a narrowed repro, and the published
  page gets a NOTE and the prefix-order rule above. Until P1 runs, change neither.
- **F1 is taken.** The default keymap binds it to `tbHelp_ToggleExpandSignatureHelp` on
  key-down ([Window.md](docs/IDE/Menu/Window.md) lists the keymap), and that command only
  acts while signature help is showing. An add-in's `f1` fires on key-up as well, and the
  add-in cannot stop the built-in. The key-down handler calls `preventDefault()` and
  `stopPropagation()` for the keys in `specialKeyMustNotPropagate` --- F1 to F12
  *(reported)* --- so Monaco never sees F1, and the add-in still gets it with focus in the
  code editor (**P2**).
- Both handlers return at once while a modal dialog or the rename widget is open.
- Letter keys are named from `e.code` (`KeyD` gives `d`), every other key from `e.key` (`F1`
  gives `f1`). So Shift+1 arrives as `{shift}!` on a US layout.

### Tool windows

Read at `main.js@1002292` (`toolWindowElementAddChild`) and `@1005960`
(`toolWindowElementSetProperty`).

- **A tool window is part of the main document**, inside an open shadow root, not an iframe
  *(reported)*. A harness reaches its content through `toolWindowsById[<guid>].bodyElement`.
- **`HtmlElements.Add(id, tagName)` accepts any tag.** The four IDE widget tags (`chartjs`,
  `monaco`, `listview`, `virtuallistview`) become a `div` with extra setup; every other name
  goes straight to `document.createElement`, so `iframe` is not refused. A parent is found
  with `querySelector(":scope #"+id)`, so element ids must be valid CSS identifiers.
- **Property sets go straight to the DOM**, as `r[a]=e.value`: `innerHTML`, `src` and
  `srcdoc` pass through unchanged. **A property whose name starts with `on` is dropped
  silently, and the call still reports success.** A step in a property path that is an
  array is called as a function, so DOM methods can be reached too.
- An inline handler inside `innerHTML` (`<img onerror="...">`, `<div onclick="...">`) is an
  attribute, not a property, so it is not dropped, and browsers run such handlers in the
  page's own JavaScript. That is the one way an add-in can call the IDE page's internals
  (**P4**). See [Open decisions](#open-decisions) for where it may be used.
- Events: a known DOM event gets a real `addEventListener`, and a copy of the event goes back
  to the add-in over the compiler's root socket; an unknown name becomes a callback for
  `raiseEvent(...)` to call *(reported)*. `raiseEvent` finds its handler by climbing
  `parentNode` to an element that has `rootEventHandler`, and only listview containers and
  `AddMonacoWidget` roots have one. In plain tool-window HTML it would climb to the shadow
  root, whose `parentNode` is `null`, and throw *(reported; **P12**)*. So give elements ids
  and use `AddEventListener`.

### Ways to show a page

1. **The external browser.** `ShellExecuteW` from the add-in DLL. Certain to work; it leaves
   the IDE. The IDE itself opens links with `hostAppObject.Shell('cmd.exe /c start "link"
   "'+url+'"',1)` *(reported)* --- a host object that only page script can reach.
2. **An `iframe` in a tool window.** Nothing refuses the tag. No file under `ide\` sets a
   Content-Security-Policy --- there is no `Content-Security-Policy`, `http-equiv` or
   `frame-ancestors` in any `ide\*.htm` --- and neither does the compiler's HTTP header
   template *(reported)*. docs.twinbasic.com sends neither X-Frame-Options nor CSP
   *(reported, from one HEAD request)*. So a documentation page should load in a pane
   (**P3**). If it does, the most expensive tier of the June draft --- whole pages inside
   the IDE --- becomes the cheapest, and the site's own navigation and search come with it.
   Keys pressed while focus is inside the iframe go to the page, not to the IDE, so F1 does
   nothing there.
3. **The IDE's WEBPAGE panel**, a second native WebView2 whose default URL is
   `https://www.google.com`, controlled through `hostAppObject.SetAdditionalWebview2Url` and
   the `tbWebpage_ShowPanel` command *(reported)*. Page internals only.
4. **The IDE's markdown preview**, which opens `.md` files found under a package
   (`viewFileAsMarkdownPreview`) *(reported)*. Our pages use kramdown extensions the preview
   does not know. A last resort for offline use.

**Offline** is harder. `_site-offline/` works over `file://`, and a page served from
`http://localhost` cannot frame a `file://` URL. The options are `srcdoc` with rewritten
links, or files under the IDE's `ide\` folder, which the compiler's HTTP server might serve
from the page's own origin (**P13**). Deferred.

### What is under the cursor

- **The add-in API gives the editor's text, selection and cursor, and nothing about
  symbols.** Hence the June draft's own word extraction ([Stage
  4](#stage-4-the-add-in-in-increments)) and, for context, its own parser of the project's
  source.
- **The compiler already knows** *(reported)*. Hover sends `textDocument/hover` over the
  `language` socket and shows markdown from `result.contents.value` (`main.js@842393`).
  Go To Definition (F12, Shift+F2) sends `textDocument/definition` and gets one `{uri,
  range}` (`@846297`). Completion results from `textDocument/lazyCompletion` carry each
  item's declaring `uri` and `line`. Signature help comes from the completion result's
  `signatures[]`, whose `doc` is the symbol's `[Description]` text.
- **Whether hover names the symbol's package, module and kind is P5**, and the answer picks
  between the two designs for context. From page script the call is
  `lspSocket.request(method, params, callback)`, so a harness can ask over CDP with no
  add-in involved.

### Dialogs

- `Host.ShowMessageBox` and `Host.ShowNotification` are drawn in the page --- a
  `.modalDialogContainer` with `.msgBoxButton` buttons, and the fixed boxes `#msgBox1` to
  `#msgBox3` --- not as native dialogs *(reported)*. A harness can read them and click them.
- **`main.js` calls `alert()` at 33 sites** *(reported)*. An `alert()` blocks the renderer,
  so the harness must record and dismiss every one (`Page.javascriptDialogOpening`, then
  `Page.handleJavaScriptDialog`). The ones an add-in test could reach: the rename provider
  (`alert("need to massage workspace edits here...")`), Find with an invalid regular
  expression, and an unknown message on any of the compiler's sockets. A notification's
  "Copy to clipboard" link also calls `alert()`, but plain `ShowNotification` messages hide
  that link.

### IDE state outside the install

- **All IDE settings are in `HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE`**:
  `IDESettings` (13 values --- `GENERAL`, `GENERAL2`, `LAYOUTv2`, `WEBPANEL_SETTINGS`,
  `targetArchitectureMemory`, the licence values, ...), `ProjectState` (one value per project
  ever opened), `RecentlyOpened` (21 values) and `Window` (6). Every IDE a user runs shares
  them, and so does every IDE a harness starts.
- **The existing harness already leaves entries there.** On 2026-09-23, **318 of the 424
  `ProjectState` values** were temp projects from `examples.bat` lanes, `%TEMP%\tbprobe` and
  scratchpad probes, and **all 21 `RecentlyOpened` entries** were temp projects: the user's
  own recent projects had been pushed out of the IDE's recent list entirely. Both were
  cleared by hand the same day --- 339 `ProjectState` values by then, because a harness run
  in another session had added 21 more in the meantime. [Stage
  1](#stage-1-testing-add-ins-by-machine) fixes this for every harness tool, not only for
  add-in tests.
- **The `.twinproj` association** is `HKCU\Software\Classes\.twinproj` →
  `twinBASIC.ProjectFile`, and it currently points at the BETA 983 `twinBASIC.exe`. A
  harvested finding said every launch re-registers it. Key timestamps say otherwise:
  `DefaultIcon` and `shell\open\command` were last written when BETA 983 was installed, and
  a day of launches of that build did not touch them. **The IDE rewrites them when its path
  differs**, measured in item 2: read while an IDE copy in `%TEMP%` was running, the keys
  pointed into the copy, while the real install's IDE, run the same way, left them alone.
  So a copy points the user's association at a folder that is about to be deleted, and
  [tb-registry.mjs](scripts/lib/tb-registry.mjs) puts it back (three writes).
- **`%APPDATA%\twinBASIC`** holds the user's downloaded packages and empty `addins\win32`,
  `addins\win64`, `locale` and `themes` folders, and it is shared by every install. A
  compile session wrote nothing to it.
- **`SaveSetting` from an add-in writes to the same tree**, under
  `VB and VBA Program Settings\<app name>`, so it is shared with any installed copy of the
  same add-in. A test that changes an add-in-wide option changes it for the user too.
- WebView2 profiles: `%LOCALAPPDATA%\twinBASIC\v0` for the IDE --- `tbbuild` replaces it per
  port with `WEBVIEW2_USER_DATA_FOLDER` --- and `%LOCALAPPDATA%\twinBASIC_WebPanel\v0` for
  the WEBPAGE panel *(reported)*.

## The plan

### Stage 0: this file

Done: the June draft is folded in here, and WIP.md points here. **The add-in's source goes
in `add-in/` at the repository root**, where the June draft put it, as an exported source
tree (`Settings` plus `Sources/*.twin`, the shape `tbrun` takes), so that it diffs as text
and stays outside `docs/`, where the publish allowlist would refuse it.

### Stage 1: testing add-ins by machine

Everything after this stage is developed against it.

1. **One library instead of logic inside two scripts.** The code that starts the IDE,
   attaches, waits for the project, reads the console, watches for a compiler crash and
   kills the process tree is written inline in [scripts/tbbuild.mjs](scripts/tbbuild.mjs)
   and [scripts/tbrun.mjs](scripts/tbrun.mjs), and finding the IDE is written three times
   (`tbbuild`, `tbrun`, [scripts/lib/tb-install.mjs](scripts/lib/tb-install.mjs)). Move it
   into `scripts/lib/`, keep both scripts' behaviour and exit codes exactly, and check the
   move with a full `examples.bat` run (1,116 samples, ~110 s) and a `tbrun` probe.

   **Done:** [scripts/lib/tb-ide.mjs](scripts/lib/tb-ide.mjs). 14 fixture cases were run
   before and after --- clean, compile errors, warnings, the BUGS-TO-REPORT crash, argument
   errors, and `tbrun` output and errors --- with every exit code and output line the same
   apart from two bug fixes, and `examples.bat` passed 1,116 of 1,116 both times. The two
   bugs, a relative project path that never loaded and `tbrun --ide` building with a
   different install, are in [WIP.Harness.md](WIP.Harness.md). Two more gaps showed up while
   reading the code, and both matter here, because add-in tests will hit dialogs: **`tbbuild`
   cannot record an `alert()`** --- it listens for `Page.javascriptDialogOpening` but never
   sends `Page.enable`, and CDP delivers no Page event without it --- and **no
   `Runtime.evaluate` has a timeout**, so a dialog blocking the renderer would hang the wait
   loop rather than let it time out. Neither is tested yet. Item 5 fixes both and proves the
   fix with a probe that opens a dialog.
2. **A private IDE for every lane.** The install is 91 MB (`bin` 37, `projects` 30, `ide`
   15, `packages` 7). Hardlink it into the lane's work folder, with a real, empty
   `addins\win32` and `addins\win64`, so that a test add-in never loads into the user's IDE
   and two lanes never share one. Copy, rather than link, anything the IDE writes to during a
   session (**P11**), and copy everything when `%TEMP%` and the install are on different
   volumes.

   **Done, as a copy rather than hardlinks:**
   [scripts/lib/tb-ide-copy.mjs](scripts/lib/tb-ide-copy.mjs), described in [WIP.Harness.md,
   A private IDE for every lane](WIP.Harness.md#a-private-ide-for-every-lane). P11 came back
   negative --- a session writes nothing into its install --- and without `projects\` the
   copy is 57 MB and takes 380 ms, so linking would have saved nothing worth the risk. The
   copy's compiler loaded no add-in where the real install's loaded Global Search, the 14
   fixture cases gave identical output from it, and the real install stayed byte-identical.
   **The work also found and closed a process leak** that every harness tool had: a compiler
   the IDE restarts after a crash can start while `taskkill /T` walks the tree, and survives
   it, holding the install's files open. The IDE now runs inside a kill-on-close job ([The IDE
   runs inside a job](WIP.Harness.md#the-ide-runs-inside-a-job)), which also means a run that
   dies takes its IDEs with it.
3. **Leave the registry as it was found**, for every harness tool:
   - save `HKCU\Software\Classes\.twinproj` and `twinBASIC.ProjectFile` before a run, and
     restore them once the last lane has ended;
   - delete the `ProjectState` values the run created, and restore `RecentlyOpened`. Match
     paths with either separator: some tools store them with forward slashes
     (`C:/Users/.../Temp/tbprobe/...`), and a backslash-only pattern missed 15 of them in the
     hand cleanup;
   - save and restore the add-in's own `SaveSetting` key;
   - refuse to start while `%APPDATA%\twinBASIC\addins\*` holds a DLL, until P6 says
     whether that folder matters.

   The complete answer is a separate Windows account for test runs, which only the user can
   create. Start with the above.

   **Done for `tbbuild`, `tbrun` and `check_examples`:**
   [scripts/lib/tb-registry.mjs](scripts/lib/tb-registry.mjs), described in [WIP.Harness.md,
   What a run leaves in the registry](WIP.Harness.md#what-a-run-leaves-in-the-registry-and-putting-it-back).
   The 14 fixture cases, run one at a time, and a full `examples.bat` run leave the
   registry identical, value for value, with every output line unchanged. The last two
   bullets wait for the add-in runner (item 7). `snapshotKeys` takes any key, so the add-in's
   `SaveSetting` key is one more entry in its list. The work also found an IDE bug, now in
   [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md): a recent list shorter than 21 entries gets its
   empty slots filled with copies of the last entry. Item 4 added a fourth thing to put
   back, the build target the IDE remembers for each project path, because a lane that
   inherits `win64` builds and loads the wrong bitness.
4. **Build, then load.** The add-in is a Standard DLL. In a staged copy of its tree, pin
   `project.buildPath` to an explicit file in the lane IDE's `addins\<arch>\`, the way
   `tbrun` pins its exe path: the default `${SourcePath}\Build\...` template has already
   cost a run with an invisible Save dialog, and whether the samples' `${IdePath}` template
   behaves any better is untested. Build, end that IDE, then start the same lane IDE on a
   test project; its compiler loads the add-in as it starts. One project per IDE, as always.

   **Done, building into the work folder instead:** `buildAddin` in
   [scripts/lib/tb-addin.mjs](scripts/lib/tb-addin.mjs) builds with the lane's copy into
   `<work>\out\`, and `addAddin` in `tb-ide-copy.mjs` then puts the DLL in the copy's
   `addins\win32`. Built straight into `addins`, a rebuild would meet the previous build
   loaded by the very IDE doing the building, and a loaded add-in cannot be overwritten
   (P8). [WIP.Harness.md, Building an add-in and loading it](WIP.Harness.md#building-an-add-in-and-loading-it)
   has the rest: how the build log is read, why only win32 for now, and what was measured.
   Samples 10 and 15 both built and loaded, and the tree staging that `tbrun` did is now
   [scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs), shared by both.
5. **Operating the IDE and reading it**, as library calls over CDP:
   - open a file: `fs.tree.resolvePath("twinbasic:/<Project>/Sources/<file>")`, then
     `openEditors.openFile(node,false,false,false,line,col)` *(reported)*;
   - move the cursor or select: `window.editor` is the one Monaco code editor
     (`setPosition`, `setSelection`, `getModel().getValue()`). Not
     `monaco.editor.getEditors()`, which also returns editors that add-ins created
     *(reported)*;
   - press keys: `Input.dispatchKeyEvent` key-down, then key-up, with real `key` and
     `code` values, less than 500 ms apart;
   - click: real `Input.dispatchMouseEvent` presses at the element's centre. The IDE's own
     controls ignore `element.click()` --- `tbrun` learned that on `#buildIcon`;
   - ask which add-ins loaded: `loadedAddins(c)` in `tb-ide.mjs` (done for item 2), which
     lists a DLL that failed to load as `Unknown Addin`;
   - build the open project: `buildProject(c)` in `tb-ide.mjs` (done for item 4);
   - read a tool window through `toolWindowsById[<guid>].bodyElement`; read the DEBUG
     CONSOLE's backing array, notifications and message boxes; dismiss any `alert()`;
     notice a compiler restart or crash, as `tbbuild`'s console check already does.
6. **No real side effects.** The add-in's URL opener checks an environment variable (name to
   be chosen) and, when it is set, prints `open <url>` to the DEBUG CONSOLE instead of
   starting a browser. On a private desktop a real browser would start where nobody can see
   it and outlive the run. **P10** checks that the variable reaches the compiler process.
7. **A runner.** Scenarios in JavaScript under `node:test`, one IDE per test project, lanes
   by `--port` as today. The add-in's pure twinBASIC logic --- word extraction, lookup --- is
   tested without loading any add-in: a test project holds those modules and a
   `[RunAfterBuild]` runner that prints one line per case, `tbrun` builds and runs it, and
   the JavaScript side checks the lines. The wrapper is `addin-test.bat`, outside every gate
   and CI for the reason `examples.bat` is: it needs Windows and a twinBASIC install.

**Done when** the harness operates two shipped samples end to end, and the user's registry
is unchanged afterwards:

- **Sample 10:** toolbar button, then its tool window, then a message box.
- **Sample 15:** type a search, see the results, click one, and the right file opens at the
  right line.

### Stage 2: probes that decide the design

Most probes are a small add-in plus a scenario. P5, P11 and P13 need only CDP and the file
system, and P14 is probably a question for upstream. Record every answer in this file with
the build number it was measured on.

| # | Question | What it decides |
|---|---|---|
| P1 | Do `{ctrl}` and `{alt}` add-in shortcuts ever fire? Register `{ctrl}{shift}d`, `{alt}f`, `{shift}d`, `d` and `f1`, and press each. | the bug report; which key the add-in uses; the NOTE on the KeyboardShortcuts page |
| P2 | Does the add-in's `f1` fire with focus in the code editor, and what happens with signature help showing? | F1 or another key |
| P3 | Does an `iframe` of a documentation page load and navigate inside a tool window? Size, scrolling, theme. | how pages are shown |
| P4 | Does `innerHTML` render, and do inline handlers in it run page script? | how summaries are drawn; whether the page-internals route exists |
| P5 | What does hover return for `MsgBox`, `Collection.Add`, `ToolWindows.Add` and a symbol declared in the project? What does definition return for a package symbol? | compiler-assisted context, or the add-in's own parser |
| P6 | Does the compiler also load add-ins from `%APPDATA%\twinBASIC\addins\<arch>`? This needs a DLL placed there for a moment, and the user's own IDE would load it too --- **ask before running it.** | harness isolation |
| P7 | Which bitness does the compiler start in, and does switching the build target restart it in the other one and load the other `addins` folder? **Half answered, BETA 983:** the target a project opens in picks the compiler --- win32 when the IDE remembers none, `twinBASIC_win64_noDEP.exe` for a project remembered as win64 --- and each compiler reads its own `addins` folder alone. Switching the target of an open project is untested. | building and testing both bitnesses |
| P8 | Is a loaded add-in DLL locked against being overwritten? **Answered, BETA 983: yes.** While its IDE runs, overwriting fails (`EBUSY`) and deleting fails (`EPERM`), though renaming works; the hold outlasts the compiler's exit by a few tens of milliseconds. | the rebuild loop --- the DLL is built outside `addins`, and copied in once the IDE has ended |
| P9 | Does a compiler restart reload add-ins from disk? | a rebuild loop without restarting the IDE |
| P10 | Does an environment variable set by the harness reach the add-in (`Environ$`)? | the side-effect switch |
| P11 | Does the IDE write into its own install folder during a session? **Answered, BETA 983: no.** A compile, a compiler crash and a `tbrun` build-and-run left all 233 files byte-identical, mtimes included. | hardlinks or copies --- copies, for safety, at 380 ms |
| P12 | Does `raiseEvent` from plain tool-window HTML throw? | how the pane's events are written |
| P13 | Does the compiler's HTTP server serve any file placed under `ide\`? | an offline route |
| P14 | What do `tbCreateCompilerAddin_v2` and `_v3` expect? | probably a question for upstream |

### Stage 3: the symbol index, generated by the docs build

The June draft hand-wrote about 80 entries, and some of its URLs were wrong: `Collection` is
at `/tB/Modules/Collection`, not under VBRUN. The index is generated instead.

- **From the documentation:** every page's `permalink:` exactly as written. Folder-style
  pages keep their trailing slash (`/tB/Packages/VB/CheckBox/`), single-file pages do not
  (`/tB/Packages/tbIDE/ToolWindows`), so a URL is copied, never assembled. **A member is
  either a page or a heading.** `Collection.Add` has its own page,
  `/tB/Modules/Collection/Add`; `ToolWindows.Add` is a heading on its class page, and its URL
  uses the id tbdocs gives that heading (`### Add` gives `#add`), read from the build and
  never computed a second time. Canonical URLs only, never a `redirect_from` alias. The
  documentation defines two kinds of alias the index must know: the `$`, `B` and `W`
  variants share the base page (`LenB` → `/tB/Modules/Strings/Len`), and attributes are
  `/tB/Core/Attributes#<name in lowercase>`.
- **From the packages:** the public API from an `export` of the shipped packages --- the
  export and its cache already exist in
  [builder/census_attributes.mjs](builder/census_attributes.mjs). That supplies each
  symbol's package, container and kind, and lists public symbols that have no page, which
  measures documentation coverage as a side effect.
- **Output:** one JSON file published with the site, emitted the way
  `assets/js/search-data.json` is, at a stable URL so that an installed add-in can fetch a
  newer index. A copy is also built into the add-in, for when the site cannot be reached.
- **Gates:** every URL is under `/tB/` and resolves; an entry that disappears fails the
  build, the way `builder/page-baseline.json` treats a fall in the page count --- which is
  what catches a reworded heading breaking a member's anchor; retiring an entry follows the
  rules in [Permanent Links](docs/Documentation/Permanent-Links.md).
- **Maybe an embedded mode for pages**, such as a query parameter that hides the site's
  header and navigation and takes the IDE's theme. We own the site, so this is cheap. Decide
  after P3.

The June data model stands:

```json
{ "name": "Add", "package": "tbIDE", "container": "ToolWindows", "kind": "method",
  "url": "/tB/Packages/tbIDE/ToolWindows#add" }
```

- `name` --- as written in source; matched without regard to case.
- `package` --- the owning package, or `null` for language keywords and statements.
- `container` --- the class or module, or `null` for a top-level symbol.
- `kind` --- `keyword`, `statement`, `function`, `class`, `module`, `enum`, `enumvalue`,
  `control`, `property`, `method` or `event`.
- `url` --- the path below the documentation root.

Names that belong to more than one page, to test lookup against:

- `FileSystem` --- the VBA module and the tbIDE class.
- `Line` --- the VB control, the CustomControls style class, and the `Line Input` statement.
- `App` --- the VB page and the AppGlobalClassObject `_App` pages.
- `Name` --- the statement, `AddIn.Name`, `ToolWindow.Name`, `HtmlElement.Name`, and the
  controls' `Name` properties.
- `Close` --- the statement, `ToolWindow.Close`, `Editor.Close` and `Project.Close`.
- `Timer` --- the VB control (`/tB/Packages/VB/Timer/`) and the VBA function
  (`/tB/Modules/DateTime/Timer`).
- `Add` --- `Collection.Add`, `ToolWindows.Add`, `HtmlElements.Add` and
  `KeyboardShortcuts.Add`.
- `Item` --- `Collection.Item`, and `Item` on six tbIDE classes (`Editors`, `Folder`,
  `HtmlElements`, `HtmlElementProperties`, `HtmlEventProperties`, `Toolbars`).

The generated index produces the complete list.

### Stage 4: the add-in, in increments

Each increment is finished with its scenarios.

1. **F1 to a page.** A toolbar button; the key (from P1 and P2); the name under the cursor;
   index lookup; open the page in the browser or the pane. A miss says `No help for '<name>'`
   through `ShowNotification`.
2. **The help pane.** Search over the index, results, and a page view --- an iframe if P3
   passes, otherwise a summary with a link to the browser. Theme: read
   `Host.Themes.ActiveThemeNameGroup` at start, handle `Host_OnChangedTheme` after, and pass
   a light or a dark stylesheet to `ToolWindow.ApplyCss`.
3. **Context: which `Add`?** From the compiler if P5 allows --- through the public API once
   upstream adds a call, not through page internals --- otherwise from the add-in's own parser
   below.
4. **Later:** hover help through `CodeEditor.AddMonacoWidget` after a pause (the cost of
   adding and removing widgets is not measured); offering only the packages the project
   references; the `[Description]` connection; offline use.

**Lookup**, from June:

1. A selection is looked up exactly as selected.
2. Otherwise take the dotted name under the cursor, and try it as `container.name` first.
3. With several matches, a language keyword wins a bare name; otherwise offer the choice.

**Word extraction**, from June. Given the line and the cursor's column:

1. If the character at the cursor is not `A-Z`, `a-z`, `0-9` or `_`, there is no word. A
   `.` at the cursor sits between two segments, so it also gives no word.
2. Extend left over those characters **and `.`**, to take the whole dotted chain on the
   left.
3. Extend right over those characters **without `.`**, stopping at the end of the current
   segment.

With the cursor on `Add` in `Set w = Host.ToolWindows.Add(name, id)` this gives
`Host.ToolWindows.Add`. Not handled in the first version: string literals and comments (the
lookup misses; `File.ReadText(CommentsToWhitespace)` can blank comments out if needed),
lines joined with `_`, and numbers (they miss the index). Whether `GetSelectionInfo` counts
columns from 1 is untested.

**Settings:** per project through `Project.SaveMetaData` / `LoadMetaData`, add-in-wide
through `SaveSetting` / `GetSetting` --- which is the shared registry tree, so Stage 1's
registry restore has to include it.

**The add-in's own parser**, the June draft's Phase 4, kept as the fallback for increment 3:

- On `Host_OnProjectLoaded`, go through the virtual file system with `For Each` --- never
  `Count` and `Item`, because the IDE is multi-threaded ([WIP.tbIDE.md](WIP.tbIDE.md)) ---
  read each source file with `File.ReadText`, and record declarations only: `Module`,
  `Class`, `Interface`, `Enum` and `Type` headers; member headers with their `As` types;
  `Dim`, `Private`, `Public`, `Static` and `Const` with their `As` types; `Implements`.
- Before a lookup, read again only the files that changed (`File.IsDirty`, or a hash).
- Resolve `x.Add` by finding the declaration of `x` in scope and taking its declared type.
- Work line by line and skip anything not understood; it is not a compiler. The census
  notes in [WIP.Harness.md](WIP.Harness.md#censusing-every-attribute-at-once) list the
  traps a line scanner meets in this language: attributes that span lines, comma-separated
  attribute lists, escaped identifiers such as `[_HiddenModule]`, comments between
  attribute groups, and `Type As Long` fields.
- June proposed scanning on a background thread. Measure the scan first; a second thread
  inside the IDE's process is the riskiest part of the whole design.

### Stage 5: shipping

- Build both bitnesses. Add a documentation page under
  [docs/IDE/AddIns/](docs/IDE/AddIns/).
- Distribution is upstream's decision: the community add-ins list, or bundled with the IDE.
- Take to upstream, with the probe results as evidence: the shortcut bug; a call to open a
  URL; a way to ask the compiler about the symbol at a position; what `_v2` and `_v3` are
  for.

## Open decisions

Recommended, and not yet confirmed:

- **Page internals are for probes only.** The shipped add-in uses the public API and
  `ShellExecuteW`, and whatever the API lacks is requested upstream.
- **Isolation starts with restoring the registry** (Stage 1, item 3). A separate Windows
  account for test runs comes only if that proves not to be enough.

## What changed from the June draft

- **It said add-ins could only be tested by hand.** Stage 1 exists to change that.
- **It hand-wrote the symbol index.** Its URL-scheme section named paths that do not exist
  (`/tB/Reference/Statements/<keyword>`, `/tB/Reference/Procedures-and-Functions/<function>`),
  although its examples used the real `/tB/Core/<Statement>` and
  `/tB/Modules/<Module>/<Symbol>`. **Of its five "VBRUN classes" only `PropertyBag` is in
  VBRUN**: `Collection` is `/tB/Modules/Collection`, `Err` is `/tB/Modules/ErrObject`, `App`
  is `/tB/Packages/VB/App/`, and the reference has no `Dictionary` page at all. Its
  name-collision table has the same package errors, and two more: it calls `Timer` a
  statement (it is the VB control and a VBA function), and it counts the IDE's `listview`
  widget tag, which is a tag name, not a symbol. The collisions themselves are real, and
  [Stage 3](#stage-3-the-symbol-index-generated-by-the-docs-build) lists them.
- **It asked whether F1 was free.** It is not; see [Keyboard
  shortcuts](#keyboard-shortcuts). It also took the key strings on the published page on
  trust, and `{ctrl}` and `{alt}` do not work for add-ins.
- **It said a tool window could not show a web page.** Nothing refuses an `iframe` (P3), and
  if P3 passes, the order of its three tiers reverses.
- **Its code skeletons are not kept.** They were never compiled; Stage 4 writes the modules
  against the compiler, with tests.

## Rules for once Stage 1 exists

Move these into WIP.md when the harness is built, because they will then bind every session:

- **Never build or copy a test add-in into the real install's `addins\`, or into
  `%APPDATA%\twinBASIC\addins\`.** Either way it loads into the user's own IDE.
- **A test never opens a real browser.**
- Kill by pid, never by image name, and one project per IDE --- both already rules in
  [WIP.md](WIP.md#driving-the-twinbasic-compiler).
