# The IDE Help Add-in

See [WIP.md](WIP.md) for the maintenance guide. This file covers the planned twinBASIC IDE
add-in that shows the documentation for the symbol under the cursor, and the harness that
tests IDE add-ins by machine, which the add-in is developed against.

**Status.** Stages 1 to 3 stand. Stage 4, the add-in itself in [add-in/](add-in/), has
increments 1 to 4 built and tested: F1 to a page, the help pane, the compiler's hover to tell
which `Add`, and a name with no page shown by its declaration and `[Description]`.

- `addin-test.bat` operates Samples 10 and 15 end to end and leaves the registry as it found it.
- All fifteen of Stage 2's questions are answered. Fourteen are held by nine probe lanes that
  fail when a later IDE build behaves differently.
- Every build publishes `tB/symbols.json`, 5,536 names at 4,086 URLs, under a drift guard that
  fails the build when one of its URLs goes.
- The site reads a `theme` parameter, and the help pane passes the IDE's theme with it
  (Stage 4, increment 2).

Facts about the IDE are from **BETA 983**, and were re-checked on BETA 995 where the text says
so. An offset like `main.js@611152` is a byte offset into the one-line `ide/main.js`. Offsets
move with every build, so in any other build search for the quoted text instead. Each fact is
one of three kinds:

- stated plainly: read in the IDE's code or registry;
- marked *(reported)*: from a static reading or a harvested finding, not re-checked;
- marked with a probe number (**P1** to **P15**): only running the IDE can settle it.
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
contract. [WIP.Authoring.md](WIP.Authoring.md#description-attributes-are-not-connected-to-this-documentation)
waits on it before `[Description]` text and these pages can be connected.

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
  folders cannot be read off the binary. There are two. One is the install's: the add-in
  samples build into `${IdePath}\addins\${Architecture}\`, and the shipped install has
  `addins\win32\` and `addins\win64\` beside `bin\`, each holding
  `tbGlobalSearchAddIn1.dll`. So every IDE that `tbbuild`, `tbrun` and `examples.bat` start
  loads the Global Search add-in, unless it is a private copy with empty `addins` folders
  (`loadedAddins` in `tb-ide-addins.mjs` asks the compiler: the real install reports
  `GlobalSearchAddIn AddIn`, the copy reports none). The other is the user's, in the next item.
- **The compiler also loads the add-ins in `%APPDATA%\twinBASIC\addins\<arch>` (P6).** The
  page makes that folder at startup. It gives the host's `CreateCommonFolders`
  (`main.js@961019`) the text `%APPDATA%\twinBASIC`, which the host expands in the IDE's
  own environment, creates `packages`, `themes`, `locale`, `addins\win32` and
  `addins\win64` in, and returns. The page keeps the path as `commonFolderRootPath` and
  passes it to the compiler when it starts it and when it asks it to load the add-ins
  (`main.js@1047705` and `@1048667`). Measured on BETA 983 and 995 by
  [test/addin/appdata.test.mjs](test/addin/appdata.test.mjs), with a probe add-in that
  prints the file it was loaded from: an IDE started with `APPDATA` naming a folder of the
  lane's own loaded the probe from `<APPDATA>\twinBASIC\addins\win32`, and not a second
  copy placed in `addins` itself. **The compiler loads from the folder it is sent, not from
  its own `%APPDATA%`**: with `commonFolderRootPath` pointed at a second folder and the
  compiler restarted, it loaded the copy there, while the probe still read the first folder
  in its own `APPDATA`. So a DLL in the user's folder loads into every IDE the user starts,
  from any install, and into every IDE `tbbuild`, `tbrun` and `examples.bat` start. An IDE
  started with `APPDATA` naming another folder loads none of the user's add-ins, which is
  how the add-in lanes keep them out (Stage 1, item 3). The FAQ's answer to "Does twinBASIC
  support addins?" names the `win32` and `win64` folders and says that a DLL placed in
  `addins\` itself is not loaded.
- **An add-in runs inside the compiler's process (P10).** The process id an add-in read with
  `GetCurrentProcessId` was that of `twinBASIC_win32_noDEP.exe`, which `twinBASIC.exe` starts
  as a direct child, beside the page server `twinBASIC_win32.exe --ide=<pid>`. So an add-in
  sees the environment the IDE was started with. **A compiler restart is a new process**: the
  toolbar's restart button (`#restartIcon`, bound to `tbCompiler_Restart`, which calls
  `root.forceTerminate()`) ended the compiler, and the next one, with a new process id,
  loaded the add-in again and ran its `OnProjectLoaded` a second time. The DEBUG CONSOLE was
  not cleared; the IDE added `restarting from MEMORY [<project>]`.
- **Load failures have their own messages** in the compiler's strings: `Failed to load
  addin.  LoadLibrary() failed.`, `Entry point not found.  Addin may have been compiled for
  a newer version of the twinBASIC IDE.`, `Entry point 'tbCreateCompilerAddin' call
  failed.` and `...returned an object that does not implement interface IAddInV1.` **They
  go to the DEBUG CONSOLE**, after the file's name in brackets --- measured with a 32-bit
  add-in in `addins\win64`: `[InFolder_win64.dll] Failed to load addin.  LoadLibrary()
  failed.` **An add-in that failed to load is still in the compiler's list**, as `Unknown
  Addin`, so a test looks for the name it expects rather than counting.
- **Holding Shift while a project opens skips the add-ins.** The page asks the compiler to
  load them only when `shiftKeyDown` is false, and otherwise writes `[IDE] SHIFT
  KEY DETECTED: DISABLED LOADING OF ADDINS` to the DEBUG CONSOLE (`main.js@1048443`).
  `shiftKeyDown` follows the keymap's `tbMisc_ShiftKeyStateDown` and `...Up` actions, so a
  test that presses Shift must not do it while a project is opening.
- **The linker exports `tbCreateCompilerAddin` as `tbCreateCompilerAddin_v3`, and the
  loader takes three names (P14).** Read in the compiler's code and measured on BETA 983 and
  995 by [test/addin/entry.test.mjs](test/addin/entry.test.mjs). The loader --- in BETA 983
  the code at `0x1EAB6275` in `twinBASIC_win32.dll`, and in another build the code that
  pushes the address of the string `tbCreateCompilerAddin_v2`, found with `dumpbin /disasm`;
  the same in `twinBASIC_win64.dll` --- asks `GetProcAddress` for
  `tbCreateCompilerAddin`, then `tbCreateCompilerAddin_v2`, then `tbCreateCompilerAddin_v3`,
  and calls the first it finds **the same way whichever it is**: one argument, the `Host`,
  `stdcall` on win32. It asks what that returns for `IAddInV1` ---
  `{F1BAB9A7-09A3-436C-8B57-A57A76C5DF98}`, the package's own --- and reads its `Name`. For
  each `[DllExport]` function, the linker swaps the export name for `tbCreateCompilerAddin_v3`
  when the function's name is `tbCreateCompilerAddin`, and exports nothing under the name
  written. So the three names are not three signatures: the suffix is a version stamp, and an
  IDE whose loader does not know the stamp refuses the DLL. With the probe's one export
  patched in four copies, the plain name, `_v2` and `_v3` all loaded, and `_v4` did not, with
  `[EntryV4.dll] Failed to load addin.  Entry point not found.  Addin may have been compiled
  for a newer version of the twinBASIC IDE.` in the DEBUG CONSOLE and an `Unknown Addin` in
  the compiler's list. Both of P7's builds, win32 and win64, exported `_v3` alone. Every
  install on this machine, BETA 947 to 995, has the same three names in its loader, and each
  one's shipped Global Search add-in exports `_v3` alone, so both stamps are older than BETA
  947.
- **Add-ins cannot be switched off.** The Add-Ins menu lists the loaded add-ins with ticks,
  and every item calls `notSupportedMenuOption()` *(reported)*.
- **A compiler restart loads every add-in again, from the file in its folder then (P9).**
  Measured on BETA 983 and 995 by [test/addin/reload.test.mjs](test/addin/reload.test.mjs). A
  restart is the toolbar's restart button, every switch of the build target (below), and the
  IDE's own restart after a compiler crash. The page's `restartCompiler` (`main.js@153451`)
  first takes away what every add-in added: `removeAddinAlterations` removes their toolbar
  buttons and shortcuts, and hides each tool window's body behind the text `(currently
  unavailable)`, leaving the window where it was. It ends the old compiler with `taskkill
  /F` (`forceTerminate`, `main.js@1050553`), so **no add-in's `Class_Terminate` runs**: the
  probe wrote a line to a file from it, which it did for an object it dropped as it loaded
  and never for itself. The new compiler then loads the add-ins as it starts, and each runs
  `OnProjectLoaded` again, in a new process, so **an add-in keeps no state across a
  restart.** A window it adds again under the same id is the same window, emptied and shown
  again (below, under Tool windows). So the rebuild loop works without ending the IDE:
  rename the loaded DLL aside, which P8 allows, put the new build in its place, and restart
  the compiler. With build A renamed aside, a restart loaded nothing, left no button or
  shortcut, and left both of A's windows showing the text; the renamed file could be
  deleted, since the compiler that held it had ended. With build B then copied in under A's
  name, the next restart loaded B, whose first line came 1.0 s after the click (4.4 s with
  another lane building at the same time); B had one button, one shortcut that fired B
  alone, and A's two windows, filled with B's content. A restart's compile settled after
  6.6 s, against 7.6 s for a new IDE to open the project and settle its compile, so a
  harness saves little by the loop; a person keeps the IDE, its open files and its layout.
- **The build target picks the compiler, and the compiler picks the folder (P7).** The IDE
  remembers the target of each project in the shared registry, as one JSON object in
  `IDESettings\targetArchitectureMemory` keyed by project path, and opens a project in the
  target remembered for it --- or, with none, in the first on its list, win32. With a
  differently named DLL in each folder, a project with no memory got
  `twinBASIC_win32_noDEP.exe`, which loaded `addins\win32` alone; a project remembered as
  win64 got `twinBASIC_win64_noDEP.exe` with `twinBASIC_nativedbg_win64.exe`, which tried
  `addins\win64` alone. **Switching the target of an open project (Ctrl+F1 / Ctrl+F2)
  restarts the compiler in the other bitness, and the new one loads the other folders.**
  `changedActiveBuildConfig` in `ide/main2.js` records the new target and kills the
  compiler. Measured on BETA 983 and 995 by [test/addin/arch.test.mjs](test/addin/arch.test.mjs),
  with a 32-bit and a 64-bit build of a probe in both folders of their bitness, the install's
  and `%APPDATA%`'s: the project opened in win32, whose compiler loaded the two 32-bit copies
  alone; a switch to win64 started `twinBASIC_win64_noDEP.exe`, which loaded the two 64-bit
  copies alone, each reporting that it ran 64-bit; and a switch back loaded the 32-bit ones
  again. A switch is a restart, with all that the item above says of one. **A shipped
  add-in needs both builds**, and one that should keep working across a switch needs both
  installed.

### Keyboard shortcuts

Read at `main.js@608242`, `@610953` and `@611152`, and measured on BETA 983 and 995 by P1 and P2,
whose lane is [test/addin/keys.test.mjs](test/addin/keys.test.mjs).

- `KeyboardShortcuts.Add` lowercases the key string, deletes its whitespace and stores it
  as it is: `{CTRL}{SHIFT}d`, `{SHIFT}D` and `F1` were stored as `{ctrl}{shift}d`,
  `{shift}d` and `f1`. Matching is a plain string comparison against `{ctrl}` + `{shift}` +
  `{alt}` + the key, built in that order --- so `{SHIFT}{CTRL}d` could never match,
  whatever else is true.
- **Add-in shortcuts are matched on key-up**, in `document.onkeyup`, after the IDE's own
  handling of that key-up. The built-in bindings run on key-down, in a capture-phase
  listener. The key-up only dispatches if the same key's key-down was recorded less than
  500 ms earlier.
- **The key-down is recorded only when Ctrl and Alt are not held:**
  `if((!e.ctrlKey||e.key==="Control")&&(!e.altKey||e.key==="Alt")){realKeyPresses[o]=performance.now()}`.
  **So a shortcut containing `{ctrl}` or `{alt}` does not fire (P1).** Pressed with nothing
  focused, `{ctrl}{shift}d`, `{ctrl}d` and `{alt}f` fired nothing, while `d`, `{shift}d`,
  `f1` and `{shift}f1` all fired. A record is never cleared, so such a shortcut does fire
  when the same key was pressed on its own less than 500 ms before: D, then Ctrl+D and
  Ctrl+Shift+D, and F, then Alt+F, fired all three. So the SDK's own example,
  `{CTRL}{SHIFT}d`, does not work. The bug is in [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md), and the published
  [KeyboardShortcuts](docs/Reference/Built-In/tbIDE/KeyboardShortcuts.md) page has a NOTE,
  the prefix-order rule, which keys fire, and an example on Shift+F12.
- **F1 fires, and is shared with the IDE (P2).** The default keymap binds it
  to `tbHelp_ToggleExpandSignatureHelp` on key-down ([Window.md](docs/IDE/Menu/Window.md) lists
  the keymap), a command that acts only while signature help is showing. The add-in's `f1`
  fired with the focus in the code editor, in the DEBUG CONSOLE's entry box and on nothing;
  it typed nothing, and Monaco's command palette, which Monaco binds to F1, did not open ---
  the key-down handler calls `preventDefault()` and `stopPropagation()` for F1 to F12
  (`specialKeyMustNotPropagate`), so Monaco never sees them. With signature help showing,
  F1 did both things: the IDE expanded the signature help, and the add-in's `f1` fired. The
  IDE also wrote `command failed: "tbHelp_ToggleExpandSignatureHelp"` to the DEBUG CONSOLE,
  a bug of its own (BUGS-TO-REPORT.md). An add-in cannot stop the built-in.
- **A shortcut on a key that types fires as the user types.** `d` typed into the code
  editor, and into the DEBUG CONSOLE's entry box, went in and fired the add-in's `d`.
- **Keys with no binding in the default keymap:** Shift+F1, F4, Shift+F4, Shift+F5,
  Shift+F6, F7 and Shift+F12. A user can rebind any of them.
- Both handlers return at once while a modal dialog or the rename widget is open.
- Letter keys are named from `e.code` (`KeyD` gives `d`), every other key from `e.key` (`F1`
  gives `f1`). So Shift+1 arrives as `{shift}!` on a US layout.

### Tool windows

Read at `main.js@1002292` (`toolWindowElementAddChild`) and `@1005960`
(`toolWindowElementSetProperty`), and measured on BETA 983 and 995 by P3, P4 and P12, whose lane is
[test/addin/panes.test.mjs](test/addin/panes.test.mjs).

- **A tool window is part of the main document**, inside an open shadow root, not an iframe.
  On Samples 10 and 15, `toolWindowsById` is keyed by the *second* argument the add-in gave
  `ToolWindows.Add` (`"GlobalSearchAddInData"`, `"WaynesWindowData"`), its `bodyElement` is
  in the shadow root, and the root's host is `#toolWindow<n>` (`#toolWindow900`). A window an
  add-in created and has not shown is there already, and every element in it has no size. A
  window's content can be taller than the window: Sample 10's eleventh button had a size and
  a place, but its place was under the window's bottom edge, where a click lands on the
  resize handle.
- **A window's id is its identity, and a window given none shares the id `""`.**
  `createToolWindow` (`main.js@992211`) files a window under the second argument of
  `ToolWindows.Add`, and `createToolWindowById` returns the window the page already has
  under that id, with its body emptied, rather than a new one; the add-in's new `ToolWindow`
  is then bound to it, since the page answers with its number. P9's window given no id was
  under `""`, and the last test of [panes.test.mjs](test/addin/panes.test.mjs) opened two
  windows given no id and got one, titled by the second, holding the second's element and
  what was then added through the first's object, while the first's own element was gone.
  So **every tool window needs an id of its own**; the published ToolWindows page has an
  IMPORTANT saying so. The same rule is why a restart does no harm to a window with an id:
  the add-in's `Add` after the restart gets its old window back, emptied and shown again
  (P9). None of the shipped samples leaves the id out.
- **An add-in's toolbar button is `#addinButton-<id>`**, with the id the add-in gave
  `AddButton`, inside `#rootMenu2`, and its caption as its `title`.
- **`HtmlElements.Add(id, tagName)` accepts any tag.** The four IDE widget tags (`chartjs`,
  `monaco`, `listview`, `virtuallistview`) become a `div` with extra setup; every other name
  goes straight to `document.createElement`, so `iframe` is not refused. A parent is found
  with `querySelector(":scope #"+id)`, so element ids must be valid CSS identifiers.
- **Showing a window sets its root's `display` to `block`.** `toolWindowSetVisible` sets
  `bodyElement.style.display` to `"block"` or `"none"`, so a flex or grid layout an add-in
  puts on the root is gone the moment the window shows: the probe's `display: flex` read
  `block` after `Visible = True`, and its iframe kept the default 150 px height. Sample 10
  lays its root out as a flex column and gets a block. A child of the root with its own
  `display: flex` and `height: 100%`, under a root with `height: 100%`, keeps the layout;
  the published ToolWindow page says so.
- **Property sets go straight to the DOM**, as `r[a]=e.value`: `innerHTML`, `src` and
  `srcdoc` pass through unchanged. **A property whose name starts with `on` is dropped
  silently, and the call still reports success** (P4): the probe's `.onclick = "..."` raised
  no error, and the element had neither an `onclick` property nor attribute. The test is on
  the last name of the path. A step in a property path that is an array is called as a
  function, so DOM methods can be reached too.
- **An inline handler inside `innerHTML` runs as the IDE page's own script (P4).** It is an
  attribute, not a property, so it is not dropped. An `<img src='data:,' onerror='...'>` set
  through `innerHTML` ran its handler at once, with nothing clicked, and an inline `onclick`
  ran when clicked; both saw `typeof openEditors === "object"`, a global of the IDE's page.
  That is the one way an add-in can call the page's internals; see [Open
  decisions](#open-decisions) for where it may be used. **Sample 15 already relies on it:**
  each search result it gives its list view's `addItem` is HTML with an inline
  `onclick='raiseEvent("onClickMatch", event, true, path, line, column)'`, and a click on
  one runs it. The event travels only from the element that carries the handler: Sample
  15's `[line,col]` label sits beside the clickable line rather than inside it, so a click
  on the label reaches the handler of the whole file's entry, which opens the file's first
  match. Text from a file or the user must be escaped before it goes into such HTML; the
  published HtmlElementProperties page says so.
- **Events.** A name the element has as a property or as `on<name>` gets a real
  `addEventListener`, and a copy of the event goes back to the add-in through the
  compiler, with `target` reduced to its `id` and `value` (`copyEvent`). Any other name is
  stored as a function on the element, or on the object at the end of the property path,
  under that name (`toolWindowElementSetPropertyCallback`) --- that function is what
  `raiseEvent` calls. `raiseEvent` climbs `parentNode` to the first node with a
  `rootEventHandler` and calls `rootEventHandler[name](event)`. Only three kinds of node
  have one: a `listview` or `virtuallistview` container (the list view object), the shadow
  root of an `AddMonacoWidget` widget (the widget's own element), and one of the IDE's
  dialogs. **So `raiseEvent` from plain tool-window HTML throws (P12):**
  `TypeError: Cannot read properties of null (reading 'rootEventHandler')`, at the shadow
  root, whose `parentNode` is `null`, and the add-in's listener is not called. **The stored
  function can be called directly:** `onclick='this.parentNode.p12Event(event)'` reached the
  listener its parent registered as `"p12Event"`, with `eventInfo.target.id` =
  `p12direct`. So: `AddEventListener` on elements with ids for a few controls; a list view
  with `raiseEvent` in its items for a list; the direct call for HTML set through
  `innerHTML` outside a list view.

### Ways to show a page

1. **The external browser.** `ShellExecuteW` from the add-in DLL. Certain to work; it leaves
   the IDE. The IDE itself opens links with `hostAppObject.Shell('cmd.exe /c start "link"
   "'+url+'"',1)` *(reported)* --- a host object that only page script can reach.
2. **An `iframe` in a tool window --- it works (P3, BETA 983 and 995).** Nothing refuses the tag. No
   file under `ide\` sets a Content-Security-Policy --- there is no
   `Content-Security-Policy`, `http-equiv` or `frame-ancestors` in any `ide\*.htm` --- and
   neither does the compiler's HTTP header template *(reported)*. The host DLL,
   `bin/twinBASIC_ide_win32.dll`, names no WebView2 navigation event at all, so nothing
   intercepts a frame's navigation. So whole pages inside the IDE are the cheapest option,
   and the site's own navigation and search come with it. With the probe lane serving pages
   itself on `localhost`:
   - the frame loaded the page whose URL the add-in set as `src` (the server saw
     `sec-fetch-dest: iframe`), followed a link in the page, and moved again when the add-in
     set `src` a second time; the add-in's `"load"` listener heard every load;
   - the mouse wheel over the frame scrolled the page;
   - with a wrapper's flex layout the frame filled the window below the other elements;
   - **keys pressed with the focus in the frame go to the page**: F1 there did not fire the
     add-in's `f1`, and did once the focus was back in the IDE's own document;
   - **the page's colour scheme is WebView2's, never the IDE's.** The IDE sets none on its
     WebView2 --- no `ColorScheme` in `main.js`, no `PreferredColorScheme` in the host DLL
     --- so a page's `prefers-color-scheme` is Windows' app mode by default. On the lab
     machine all three were dark, so the lane cannot tell them apart; a lab IDE whose
     WebView2 was told to prefer light (`--blink-settings=preferredColorScheme=1` added to
     its `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`) showed the framed page light, and its own
     page reported light, while the IDE's theme stayed dark. The site follows
     `prefers-color-scheme` unless its own toggle has stored a choice, so **a page given no
     theme matches the IDE only when Windows' app mode happens to agree**; the help pane
     passes one (Stage 4, increment 2).

   **The live site works in the frame too** (checked in the lab, not a lane). The
   KeyboardShortcuts page on docs.twinbasic.com loaded in 0.9 s as a cross-site frame, with
   a process and a DevTools target of its own (type `iframe` in `/json/list`; the page's
   `Page.getFrameTree` does not list it). It applied its own dark theme, had its search box
   and `lunr`, scrolled under the wheel, and a link to Host navigated the frame. The site,
   served by GitHub Pages, sends neither `X-Frame-Options` nor a CSP (`curl -I`), and no page
   of the built site has a `target="_blank"` link, so its links stay in the frame. The host
   DLL does name `NewWindowRequested`, and what it does with a new window was not tried,
   since it might start a browser. A link to a site that refuses to be framed, such as
   GitHub, would show the browser's error page in the pane; not tried either.
3. **The IDE's WEBPAGE panel**, a second native WebView2 whose default URL is
   `https://www.google.com`, controlled through `hostAppObject.SetAdditionalWebview2Url` and
   the `tbWebpage_ShowPanel` command *(reported)*. Page internals only.
4. **The IDE's markdown preview**, which opens `.md` files found under a package
   (`viewFileAsMarkdownPreview`) *(reported)*. Our pages use kramdown extensions the preview
   does not know. A last resort for offline use.

**Offline** is harder. `_site-offline/` works over `file://`, and a page served from
`http://localhost` cannot frame a `file://` URL. The options are `srcdoc` with rewritten
links, or files under the IDE's `ide\` folder. **The IDE serves any file placed there (P13,
BETA 983 and 995)**, measured by [test/addin/ideserver.test.mjs](test/addin/ideserver.test.mjs)
with files put in a lane's copy of the install:

- The server is the page server, `bin\twinBASIC_win32.exe --ide=<pid>`, not the compiler:
  it was the process listening on the page's port. The page's URL starts its path with a
  key the IDE makes for the run, a GUID, and the page's base URL points there, so a
  relative URL is a path under `ide\`.
- Fifteen files of the kinds the offline site is made of came back byte for byte: pages,
  stylesheets, scripts, images and fonts, in folders two deep, a name with a space in it,
  4 MB of JavaScript, and a file written after the IDE had started. A frame given the
  relative `src` `p13/page.html` showed the page, with its stylesheet and script working.
- Three things differ from a real web server. **A query string makes any request a 404**,
  so `page.html?theme=dark` is not found, and the site's `theme` parameter cannot be a
  query on this route; a fragment is not sent, and does no harm. `.html`, `.json`, `.jpg`,
  `.woff2`, `.mjs` and `.txt` come with no `Content-Type` --- the browser sniffs the page
  and it renders --- while `.htm`, `.css`, `.js`, `.svg`, `.png` and `.gif` get the usual
  types. A folder is not a page, and nothing is served without the key.
- **A page served this way is on the IDE page's own origin**, so its script can reach the
  IDE's internals: the framed page read `typeof parent.openEditors` as `"object"`. Only our
  own pages, then, and `sandbox` on the frame if that matters.

So the offline site would work copied into `ide\`, with one cost the live site does not
have: writing into the install, which every new build replaces. Still deferred.

### What is under the cursor

- **The add-in API gives the editor's text, selection and cursor, and nothing about
  symbols.** Hence the add-in's own word extraction ([Stage
  4](#stage-4-the-add-in-in-increments)) and, for context, the compiler's hover asked
  through the page (increment 3), with its own parser of the project's source deferred.
- **The compiler knows, and names the package, the container and the kind (P5).** Measured
  on BETA 983 and 995 by [test/addin/symbols.test.mjs](test/addin/symbols.test.mjs), which puts each
  question the way the IDE's own code does. Hover (`main.js@842393`)
  returns markdown: for a procedure, its declaration, then a heading naming where it is
  declared, then its `[Description]` text, which for a VBA function is several paragraphs:

  ```
  Function MsgBox ( ByRef Prompt As Variant, ... ) As VbMsgBoxResult
  ___
  ## **MsgBox** &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; `in VBA.Interaction`
  ```

  The heading gives the package and the module for a function (`VBA.Interaction`,
  `VBA.Conversion`, `SymbolsProbe.Symbols` for the project's own), and the package and the
  **interface** for a class's member: `c.Add` is `in VBA._Collection`, and
  `Host.ToolWindows.Add` `in tbIDE.IToolWindowsV1`. Those are the classes' default
  interfaces, not the names the documentation's pages have; hover over the class itself
  says `*class* **Collection** ... in package VBA` and lists `*[default]* VBA._Collection`.
  Other kinds have forms of their own, with `in` after the name on the first line: an
  enumeration `*enum* **VbMsgBoxStyle** ... \`in component VBA.Constants\``, its value
  `*enum-value* **vbOKOnly** = 0 ... \`in VBA.Constants.VbMsgBoxStyle\``, a constant
  `*constant* **vbCrLf As String** = ...` then `` `in VBA.Constants` ``. A VB control's
  member is named by its control's interface, `cb.Value` `in VB._CheckBox`, which the
  `interfaces` map lacks, and a `PropertyBag`'s `ReadProperty` by an interface its default
  one inherits, `in VBRUN.PropertyBag_VB5`. Some members name **another procedure**, the
  one behind them: `Err.Number` is `GetErrNumber` `in VBA._HiddenModule`, `App.Path`
  `GetAppPath` and `Screen.Width` `ScreenGetWidth`, both `in VB.HiddenModule2`. A member
  inside `With` is named as it would be written in full, and a function called as a
  statement, with or without parentheses or `Call`, as it is in an expression. A comment
  gets the empty answer a statement gets. The symbols lane asserts the VBA and VBRUN forms, the help lane what the add-in
  does with the VB and tbIDE ones.
  A variable gives its declaration, `*local variable* Dim c As Collection`. `Debug`,
  `Debug.Print` and a statement such as `Dim` give nothing, and a type such as `Long` a line
  about it. BETA 983 gives no hover for those three, and BETA 987 and 995 a hover whose text is
  empty, so the add-in must treat both as nothing. Over a procedure's name in its own declaration, hover gives a debug block
  instead, `TB-DEBUG CODEGEN SIZE: [NOT-READY]`; over a `ByVal` parameter of a class,
  `String`, `Variant` or `Object` it adds a wrong note about `Option Explicit`
  ([BUGS-TO-REPORT.md](BUGS-TO-REPORT.md)).
- **Go To Definition names the package's own source.** Definition (`@846297`) returns one
  file and range. For `MsgBox` the file is
  `twinbasic:/SymbolsProbe/Packages/tbIDE/Packages/VBA/Sources/Interaction.twin` and the
  range the declaration's lines, and the IDE's file system opens the file. Each package's
  own references sit under its `Packages` folder again, so in a project that references
  tbIDE, VBA is in the tree twice, and definition named tbIDE's copy: the package is the
  name after the last `Packages/`. The file is the module for a function, and for a class's
  member the file the interface is in (`Collection.twin`, `ToolWindows.twin`). Nothing for
  `Debug.Print`.
- **Signature help and completion say the same.** The signatures that the completion
  request returns (the request the code editor's intellisense sends) carry documentation
  that starts with the same heading, for package procedures as for the project's own: P2
  saw `in AddinHost.Haystack` in the expanded signature help. The request for a
  completion's details gives its declaring file and line, the same as definition's.
- **Only page script can ask.** The question is a call on the page's own socket to the
  compiler, answered through a callback. A harness makes it over CDP; an add-in could only
  through an inline handler in HTML it sets (P4), which [Open decisions](#open-decisions)
  keeps for probes, except for the help add-in's hover (Stage 4, increment 3).

### Dialogs

- `Host.ShowMessageBox` and `Host.ShowNotification` are drawn in the page, not as native
  dialogs, and a harness reads them and clicks them (checked on Sample 10). A message box
  is a `.modalDialogContainer` holding a `.modalTitleBar` (the title as a text node, then a
  close button), a `.simpleMsgBox` with the message and a `.msgBoxButton` per button; the
  add-in's call returns once one is clicked. A notification's text is the `.msgBoxText` of
  one of the fixed boxes `#msgBox1` to `#msgBox3`.
- **The IDE calls `alert()` at 37 sites**, 33 in `main.js` and 4 in `main2.js`, and never
  `confirm()` or `prompt()`. An `alert()` blocks the renderer, so the harness records and
  dismisses every one (`Page.javascriptDialogOpening`, then `Page.handleJavaScriptDialog`),
  which `attachIde` does. The ones an add-in test could reach: the rename provider
  (`alert("need to massage workspace edits here...")`), Find with an invalid regular
  expression, and an unknown message on any of the compiler's sockets. A notification's
  "Copy to clipboard" link also calls `alert()`, but plain `ShowNotification` messages hide
  that link. **An alert that opened before the harness attached cannot be dismissed over
  CDP**: the page then answers nothing, and the harness reports it as the likely cause. The
  IDE's own candidates are its "IDE startup failure" alert and "Bad command line syntax.",
  which `launchIde`'s single argument never provokes.

### IDE state outside the install

- **All IDE settings are in `HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE`**:
  `IDESettings` (13 values --- `GENERAL`, `GENERAL2`, `LAYOUTv2`, `WEBPANEL_SETTINGS`,
  `targetArchitectureMemory`, the licence values, ...), `ProjectState` (one value per project
  ever opened), `RecentlyOpened` (21 values) and `Window` (6). Every IDE a user runs shares
  them, and so does every IDE a harness starts. A harness that opens temp projects fills
  `ProjectState` with them and pushes the user's own recent projects out of
  `RecentlyOpened`, so every harness tool puts the registry back ([Stage
  1](#stage-1-testing-add-ins-by-machine)).
- **The `.twinproj` association** is `HKCU\Software\Classes\.twinproj` →
  `twinBASIC.ProjectFile`, and it points at the newest install's `twinBASIC.exe`. **The IDE
  rewrites `DefaultIcon` and `shell\open\command` when its path differs** (an IDE copy in
  `%TEMP%` pointed them into the copy; the real install's IDE left them alone), and does not
  rewrite them on every launch. So a copy points the user's association at a folder that is
  about to be deleted, and [tb-registry.mjs](scripts/lib/tb-registry.mjs) puts it back
  (three writes).
- **`%APPDATA%\twinBASIC`** holds the user's downloaded packages and empty `addins\win32`,
  `addins\win64`, `locale` and `themes` folders, and it is shared by every install. A
  compile session writes nothing to it.
- **`SaveSetting` from an add-in writes to the same tree**, under
  `VB and VBA Program Settings\<app name>`, so it is shared with any installed copy of the
  same add-in. A test that changes an add-in-wide option changes it for the user too, which
  is why the add-in runner records and puts back every application a lane names (Stage 1,
  item 7).
- WebView2 profiles: `%LOCALAPPDATA%\twinBASIC\v0` for the IDE --- `tbbuild` replaces it per
  port with `WEBVIEW2_USER_DATA_FOLDER` --- and `%LOCALAPPDATA%\twinBASIC_WebPanel\v0` for
  the WEBPAGE panel *(reported)*.

## The plan

### Stage 0: where the add-in lives

**The add-in's source goes in `add-in/` at the repository root**, as an exported source
tree (`Settings` plus `Sources/*.twin`, the shape `tbrun` takes), so that it diffs as text
and stays outside `docs/`, where the publish allowlist would refuse it. `add-in/` holds the
add-in's tree and nothing else: `stageProject` copies the whole folder it is given and packs
the copy, so a probe kept inside it would be packed into the add-in's project.

**The symbol index is committed there**, as `Resources/SYMBOLS/symbols.json`, which the add-in
reads as a resource, so the tree builds as it is. It is a copy of the docs build's
`tB/symbols.json`, and a local build rewrites it whenever the index changes (a page added, a
heading reworded), to be committed with the pages
([builder/addin-index.mjs](builder/addin-index.mjs)). Built without it, the add-in loads and says `no index` in its
loaded line.

### Stage 1: testing add-ins by machine

Built. Everything after this stage is developed against it. [WIP.Harness.md](WIP.Harness.md)
has the harness side of each item.

1. **One library for starting and driving the IDE:**
   [scripts/lib/tb-ide.mjs](scripts/lib/tb-ide.mjs), shared by `tbbuild`, `tbrun` and
   `check_examples`. Every CDP call has a time limit, and the connection records and
   dismisses `alert()` dialogs. An alert already open before the harness attached is the one
   case it cannot handle, and it says so. `launchIde` refuses a DevTools port another IDE
   holds, since the harness would otherwise operate that IDE.
2. **A private IDE for every lane:** [scripts/lib/tb-ide-copy.mjs](scripts/lib/tb-ide-copy.mjs),
   described in [WIP.Harness.md, A private IDE for every
   lane](WIP.Harness.md#a-private-ide-for-every-lane). It is a copy, not hardlinks: a session
   writes nothing into its install (P11), and without `projects\` the copy is 57 MB and takes
   380 ms. The copy's `addins\win32` and `addins\win64` are real and empty, so a test add-in
   never loads into the user's IDE and two lanes never share one. The IDE runs inside a
   kill-on-close job ([The IDE runs inside a
   job](WIP.Harness.md#the-ide-runs-inside-a-job)), so a run that dies takes its IDEs with it
   and no restarted compiler outlives `taskkill /T`.
3. **The registry is left as it was found**, for every harness tool:
   [scripts/lib/tb-registry.mjs](scripts/lib/tb-registry.mjs), described in
   [WIP.Harness.md, What a run leaves in the
   registry](WIP.Harness.md#what-a-run-leaves-in-the-registry-and-putting-it-back).
   - It saves `HKCU\Software\Classes\.twinproj` and `twinBASIC.ProjectFile` before a run and
     restores them once the last lane has ended, and never puts back an association that
     points into the temp folder.
   - It deletes the `ProjectState` values the run created and restores the whole
     `RecentlyOpened` list as found. Match paths with either separator: some tools store them
     with forward slashes (`C:/Users/.../Temp/tbprobe/...`). A full list loses its oldest
     entry for every project a run opens.
   - It puts back the build target the IDE remembers for each project path, because a lane
     that inherits `win64` builds and loads the wrong bitness.
   - The add-in runner (item 7) records the `SaveSetting` keys a lane names and puts them back.
   - Every IDE a lane starts, the add-in builds' included, gets an `APPDATA` of the lane's
     own, `<work>\appdata`, and the lane checks afterwards that the IDE's add-ins folder is
     under it (`checkAddinsRoot` in `tb-ide-addins.mjs`). So the user's add-ins never load
     into a test IDE, and the user need not move them out to run the tests.
   - A recent list shorter than 21 entries gets its empty slots filled with copies of the
     last entry (an IDE bug, in [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md)).

   The complete answer would be a separate Windows account for test runs, which only the
   user can create.
4. **Build, then load.** `buildAddin` in [scripts/lib/tb-addin.mjs](scripts/lib/tb-addin.mjs)
   builds the add-in with the lane's copy into `<work>\out\`, for win32 or win64, and
   `addAddin` in `tb-ide-copy.mjs` then puts the DLL in the copy's `addins\<arch>`. Built
   straight into `addins`, a rebuild would meet the previous build loaded by the very IDE
   doing the building, and a loaded add-in cannot be overwritten (P8).
   [WIP.Harness.md, Building an add-in and loading
   it](WIP.Harness.md#building-an-add-in-and-loading-it) has how the build log is read. The
   tree staging is [scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs), shared with
   `tbrun`. One project per IDE, as always: build, end that IDE, then start the same lane IDE
   on a test project, and its compiler loads the add-in as it starts.
5. **Operating the IDE and reading it**, as library calls over CDP:
   [scripts/lib/tb-operate.mjs](scripts/lib/tb-operate.mjs), with `readCrash` in
   `tb-ide.mjs`, described in [WIP.Harness.md, Operating the IDE and reading
   it](WIP.Harness.md#operating-the-ide-and-reading-it).
   - open a file: `fs.tree.resolvePath("twinbasic:/<Project>/Sources/<file>")`, then
     `openEditors.openFile(node,false,false,false,line,col)`, line and column counted from 1;
   - move the cursor or select: `window.editor` is the one Monaco code editor, given the
     model of whichever file's tab is selected (`setPosition`, `setSelection`,
     `getModel().getValue()`). Not `monaco.editor.getEditors()`, which also
     returns editors that add-ins created *(reported)*;
   - press keys: `Input.dispatchKeyEvent` key-down, then key-up, with real `key` and
     `code` values, less than 500 ms apart;
   - click: real `Input.dispatchMouseEvent` presses at the element's centre. The IDE's own
     controls ignore `element.click()`. `click` waits up to five seconds for its target,
     since a list view draws a row a moment after the row is in its data;
   - ask which add-ins loaded: `loadedAddins(c)` in `tb-ide-addins.mjs`, which lists a DLL
     that failed to load as `Unknown Addin`;
   - build the open project: `buildProject(c)` in `tb-ide.mjs`;
   - read a tool window through `toolWindowsById[<guid>].bodyElement`; read the DEBUG
     CONSOLE's backing array, notifications and message boxes; dismiss any `alert()`;
     notice a compiler restart or crash, as `tbbuild`'s console check does.
6. **No real side effects: `TB_ADDIN_TEST`.** An add-in's URL opener treats the variable as
   set when it is not empty, and then prints `open <url>` to the DEBUG CONSOLE instead of
   starting a browser. On a private desktop a real browser would start where nobody can see
   it and outlive the run. `launchIde` in [tb-ide.mjs](scripts/lib/tb-ide.mjs) sets it to `1`
   for **every** IDE the harness starts, `tbbuild`'s, `tbrun`'s and `examples.bat`'s
   included, because each of them loads whatever add-ins the user has installed, on a desktop
   nobody watches; a caller's `env` can set it otherwise, or leave it out with the value
   `undefined`. `openedUrls(c, { since })` in [tb-operate.mjs](scripts/lib/tb-operate.mjs)
   reads the `open <url>` lines back, and `consoleMark(c)` in `tb-ide-console.mjs` takes the
   mark that `since` names, so a scenario asks what was opened after the key it pressed. A
   line counts only when what follows `open ` has no white space in it, as a URL has none.
   `PrintText` stores its text escaped (`<b>` as `&lt;b&gt;`), so a URL comes back exactly as
   printed, `&` included. The rule rests on P10, which is a lane:
   [test/addin/probes/env](test/addin/probes/env) with [env.test.mjs](test/addin/env.test.mjs).
7. **A runner.** [scripts/addin_test.mjs](scripts/addin_test.mjs), with the lanes in
   [test/addin/](test/addin/) and what a scenario gets in
   [scripts/lib/tb-lane.mjs](scripts/lib/tb-lane.mjs), described in [WIP.Harness.md, The
   add-in test runner](WIP.Harness.md#the-add-in-test-runner). A lane is one scenario file
   under `node:test`, run in a process of its own with its own port and copy of the install;
   the runner owns the registry, the add-ins' saved settings included, and checks it
   afterwards. Ctrl+C and a lane timeout both end the lanes and still put the registry back.
   The wrapper is `addin-test.bat`, outside every gate and CI for the reason `examples.bat`
   is: it needs Windows and a twinBASIC install. `removeTree` retries a delete that an ending
   IDE still blocks, since on Node 24 `rmSync`'s own `maxRetries` does not.

   **Stage 4's code is tested end to end**, through the editor: the help lane puts the
   cursor or a selection on each case and reads what the add-in opened. Word extraction and
   lookup have no tests of their own. If a case comes up that the editor cannot set up, a
   test project would hold those modules and a `[RunAfterBuild]` runner printing one line
   per case, built and run in a lane's own copy rather than by `tbrun`: a `tbrun` started
   under the runner leaves its registry entries to the runner, which sweeps only the lanes'
   folders.

Stage 1's acceptance, met: both scenarios pass under `addin-test.bat`, and the whole
registry, `IDESettings` included through hashes, is identical around the run.

- **Sample 10:** toolbar button, then its tool window, then a message box (the three-button
  box answered `button2`, the follow-up answered `ok`, then a notification and a DEBUG
  CONSOLE line).
- **Sample 15:** type a search, see the results, click one, and the right file opens at the
  right line (`Haystack.twin`, line 4, column 13).

### Stage 2: probes that decide the design

Most probes are a small add-in plus a scenario. P5, P11 and P13 need only CDP and the file
system. Record every answer in this file with the build number it was measured on.

All fifteen questions are answered, and the ten lanes (eight probe lanes and the two sample
lanes) pass together in about 2 minutes 21 seconds at two at a time.

**A probe whose answer something else rests on becomes a lane**: its add-in in
`test/addin/probes/<name>/`, its scenario beside the others, listed in `lanes.mjs`, with each
test asserting what the build did. A later build that behaves differently then fails the
run, and the failure says what to update. The lanes and what rests on each:

- [keys.test.mjs](test/addin/keys.test.mjs) (P1, P2): the KeyboardShortcuts page's NOTE and
  two entries in BUGS-TO-REPORT.md.
- [panes.test.mjs](test/addin/panes.test.mjs) (P3, P4, P12, and the shared id `""` found
  with P9): the NOTEs on the HtmlElement, HtmlElementProperties, HtmlElements and ToolWindow
  pages.
- [symbols.test.mjs](test/addin/symbols.test.mjs) (P5): Stage 4's context and an entry in
  BUGS-TO-REPORT.md. It needs no add-in, only the project in `probes/symbols`.
- [ideserver.test.mjs](test/addin/ideserver.test.mjs) (P13): the offline route.
- [appdata.test.mjs](test/addin/appdata.test.mjs) (P6): the lanes' own `APPDATA` and the
  FAQ's answer on where add-ins go.
- [arch.test.mjs](test/addin/arch.test.mjs) (P7): the Add Ins page's account of which folder
  loads when, and the win64 builds `buildAddin` makes.
- [reload.test.mjs](test/addin/reload.test.mjs) (P8, P9): the account of a compiler restart
  on the tbIDE package page and the ToolWindows page.
- [entry.test.mjs](test/addin/entry.test.mjs) (P14): the entry point's NOTE on the tbIDE
  package page.
- [env.test.mjs](test/addin/env.test.mjs) (P10): the rule that an add-in under test opens
  nothing, which reads `TB_ADDIN_TEST`.

A probe that settles a question once stays in scratch. So do the two P3 checks that need the
network or a changed WebView2: the live site in the frame, and the colour scheme with
WebView2 preferring light.

The table gives each answer in brief; the sections above have the detail.

| # | Question | What it decides |
|---|---|---|
| P1 | Do `{ctrl}` and `{alt}` add-in shortcuts ever fire? **Answered, BETA 983 and 995: no.** `d`, `{shift}d`, `f1` and `{shift}f1` fire; `{ctrl}{shift}d`, `{ctrl}d` and `{alt}f` fire only when the same key was pressed on its own less than 500 ms before. Queued in BUGS-TO-REPORT.md; the KeyboardShortcuts page has a NOTE. | the bug report; which key the add-in uses; the NOTE on the KeyboardShortcuts page |
| P2 | Does the add-in's `f1` fire with focus in the code editor, and what happens with signature help showing? **Answered, BETA 983 and 995: yes.** It fires with the focus in the code editor, in the DEBUG CONSOLE and on nothing, and types nothing. With signature help showing, the IDE expands or collapses it as well, and logs `command failed: "tbHelp_ToggleExpandSignatureHelp"`. | F1 or another key --- F1 |
| P3 | Does an `iframe` of a documentation page load and navigate inside a tool window? **Answered, BETA 983 and 995: yes.** It loads, follows its own links, moves when the add-in sets `src`, scrolls, and fills the window under a wrapper's flex layout; the live site works too. Keys in the frame never reach the add-in, and the page's colour scheme is Windows', not the IDE's. | how pages are shown --- in the pane |
| P4 | Does `innerHTML` render, and do inline handlers in it run page script? **Answered, BETA 983 and 995: yes, and yes.** Inline handlers run as the IDE page's own script, with its globals in reach. A property whose name starts with `on` is dropped, and the add-in hears no error. | how summaries are drawn; whether the page-internals route exists --- it does |
| P5 | What does hover return for `MsgBox`, `Collection.Add`, `ToolWindows.Add` and a symbol declared in the project? What does definition return for a package symbol? **Answered, BETA 983 and 995:** hover gives the declaration, then a heading naming where it is declared: `in VBA.Interaction`, `in VBA._Collection`, `in tbIDE.IToolWindowsV1`, `in SymbolsProbe.Symbols` --- a class's members by its default interface, not by the class's name. Definition gives the declaration in the package's own source, which the IDE opens. Nothing for `Debug.Print` or a statement. Only page script can ask. | compiler-assisted context is possible; which route is [Stage 4](#stage-4-the-add-in-in-increments), increment 3 |
| P6 | Does the compiler also load add-ins from `%APPDATA%\twinBASIC\addins\<arch>`? Needs a DLL placed there, which the user's own IDE would load too --- **ask before running it against the real `%APPDATA%`.** **Answered, BETA 983 and 995: yes**, from `addins\win32` there and not from `addins` itself. The compiler loads from the folder the page sends it. The lane points `APPDATA` at a folder of its own, so no DLL goes in the user's. | harness isolation --- every lane IDE gets an `APPDATA` of its own |
| P7 | Which bitness does the compiler start in, and does switching the build target restart it in the other one and load the other `addins` folder? **Answered, BETA 983 and 995: yes, and yes.** The target a project opens in picks the compiler, and each compiler loads the folders of its own bitness alone, the install's and `%APPDATA%`'s. | building and testing both bitnesses --- `buildAddin` builds either, and a shipped add-in needs both |
| P8 | Is a loaded add-in DLL locked against being overwritten? **Answered, BETA 983 and 995: yes.** While its IDE runs, overwriting fails (`EBUSY`) and deleting fails (`EPERM`), though renaming works; the hold outlasts the compiler's exit by a few tens of milliseconds. The P9 lane checks all three again. | the rebuild loop --- the DLL is built outside `addins`, and copied in once the IDE has ended, or renamed aside first (P9) |
| P9 | Does a compiler restart reload add-ins from disk? **Answered, BETA 983 and 995: yes.** The restart removes every add-in's buttons and shortcuts, leaves its windows showing `(currently unavailable)`, kills the old compiler so that no `Class_Terminate` runs, and starts a compiler that loads whatever file is in the folders then. A window comes back by its id. | a rebuild loop without restarting the IDE --- it works: rename aside, copy in, restart |
| P10 | Does an environment variable set by the harness reach the add-in (`Environ$`)? **Answered, BETA 983 and 995: yes**, through the launcher, the IDE and the compiler the IDE starts, and again in a compiler a restart starts. With `TB_ADDIN_TEST=1` in `launchIde`'s environment, `Environ$` and `GetEnvironmentVariableW` both returned `1`; left out, `Environ$` was empty and the Win32 call said unset. `WEBVIEW2_USER_DATA_FOLDER`, which `launchIde` always sets, arrived with the lane's port in it. | the side-effect switch |
| P11 | Does the IDE write into its own install folder during a session? **Answered, BETA 983 and 995: no.** On 983 a compile, a compiler crash and a `tbrun` build-and-run left all 233 files byte-identical, mtimes included. On 995 the install (235 files) was byte-identical after exports, a `tbbuild` and two `tbrun` runs; `%APPDATA%` was not re-checked. | hardlinks or copies --- copies, for safety, at 380 ms |
| P12 | Does `raiseEvent` from plain tool-window HTML throw? **Answered, BETA 983 and 995: yes** --- `TypeError: Cannot read properties of null (reading 'rootEventHandler')`, and the listener is not called. An inline handler that calls the listener `AddEventListener` stored on its parent, `this.parentNode.<name>(event)`, reaches the add-in. | how the pane's events are written |
| P13 | Does the compiler's HTTP server serve any file placed under `ide\`? **Answered, BETA 983 and 995: yes**, and it is the page server, `twinBASIC_win32.exe --ide=<pid>`, not the compiler. A frame with a relative `src` shows the file on the IDE page's own origin. A query string makes a 404, and `.html` has no `Content-Type`. | an offline route --- it exists ([Offline](#ways-to-show-a-page)) |
| P14 | What do `tbCreateCompilerAddin_v2` and `_v3` expect? **Answered, BETA 983 and 995: what `tbCreateCompilerAddin` does.** The names are version stamps: the linker exports a function named `tbCreateCompilerAddin` as `tbCreateCompilerAddin_v3` alone, and an IDE that knows none of a DLL's names refuses it as `compiled for a newer version of the twinBASIC IDE`, as a patched `_v4` was. | nothing in the design --- the add-in declares `tbCreateCompilerAddin` as the package says; the tbIDE page has a NOTE |
| P15 | Does the compiler say anything about a name's `[Description]`, or a COM type library's help string? **Answered, BETA 995: hover gives it**, after the line naming where the name is declared, for a procedure, a member, a constant, a module variable, an enumeration, a `Type`, a class and a module, and a type library's member (`Scripting.IDictionary.Add`: "Add a new key and item to the dictionary."). Classes and modules, the project's and a type library's, are `in library <name>`. A procedure with none gets the IDE's tip, `*no further info available. Tip: use [Description("")] ...*`. On a procedure's name where it is declared, hover gives a block of code-generation details (`TB-DEBUG CODEGEN SIZE: [NOT-READY]`) instead. Signature help gives the same text. A member of an enumeration is the exception: its `[Description]` is listed as a member of the enumeration and not shown on the member (filed as twinbasic/twinbasic#2465, `bugs/filed/enum-member-description-hover/`). | Stage 4, increment 4: a name with no page shows its declaration and description from the hover; no parser of the project's source is needed |

### Stage 3: the symbol index, generated by the docs build

The index is the `symbolIndex` task of the build, in [builder/symbols.mjs](builder/symbols.mjs),
and it publishes [`/tB/symbols.json`](docs/Documentation/Permanent-Links.md#the-symbol-index) ---
under `/tB/` because the file is part of the same contract as the URLs in it, and its URL is
fixed from here on. Permanent Links documents the format for any reader;
[Building](docs/Documentation/Building.md#the-symbol-index) and
[WIP.Build.md](WIP.Build.md#the-symbol-index-and-the-drift-guard-on-its-urls) the build side.
It has 5,536 entries at 4,086 distinct URLs; 782 KB, 52 KB gzipped, under 100 ms of the build.
The file is emitted the way `assets/js/search-data.json` is, so an installed add-in can fetch
a newer index; a copy is also to be built into the add-in, for when the site cannot be reached.

The data model:

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

**The entries come from the pages, and the packages annotate them.** An index built from the
packages would carry page-less names and put the pages' own layout in the wrong place: of the
2,368 public members of VB's documented classes, 173 have no page or heading, and of
WinNativeCommonCtls' 738, 294 --- inherited members that pages name in a sentence
(`DTPicker` "inherits ... Anchors, Dock, Font ...") or not at all.

- **From the documentation:** every page's `permalink:` exactly as written. Folder-style
  pages keep their trailing slash (`/tB/Packages/VB/CheckBox/`), single-file pages do not
  (`/tB/Packages/tbIDE/ToolWindows`), so a URL is copied, never assembled. Canonical URLs
  only, never a `redirect_from` alias. **A member is either a page or a heading.**
  `Collection.Add` has its own page, `/tB/Modules/Collection/Add`; `ToolWindows.Add` is a
  heading on its class page, and its URL uses the id tbdocs gives that heading (`### Add`
  gives `#add`), read from the build and never computed a second time. Two kinds of alias:
  the `$`, `B` and `W` variants share the base page (`LenB` → `/tB/Modules/Strings/Len`), and
  attributes are `/tB/Core/Attributes#<name in lowercase>`.
- **The reading rules**, in [builder/symbols.mjs](builder/symbols.mjs)'s header: a page's
  title and its first heading's comma list name a type or member; a page under a type's page
  in the nav is one of its members; a heading on a type's page whose every part is an
  identifier and one a member is that member's, as is any heading under Properties, Methods
  or Events; an inherited member documented on its declaring type's page has that URL from
  every type that inherits it (`CodeEditor.Close` is `Editor#close`); a page filed under one
  module and declared in another belongs to the declarer (VBA's `Array` is under Information
  and declared in `_HiddenModule`); a `$` form shares its base's URL; and a Core page's title
  gives its statement and keywords (`Do...Loop`: `Do`, and `Loop` as a keyword). **Every
  package page gives at least one entry**; a build names any that stops.
- **`symbols:`**, an optional frontmatter key, names what a page documents when its title
  cannot: the (Default) module is `_HiddenModule`, and the comparison operators page
  documents `=`, `<>` and four more. A page's first heading `# \ and \= operators` must be
  written `\\=`, since `\=` is a markdown escape.
- **From the packages:** [builder/package-api.json](builder/package-api.json), which
  [scripts/build_package_api.mjs](scripts/build_package_api.mjs) writes from the packages of
  an install, through the export of [scripts/lib/tb-packages.mjs](scripts/lib/tb-packages.mjs)
  (shared with `census_attributes.mjs`) and a declaration scanner,
  [scripts/lib/twin-api.mjs](scripts/lib/twin-api.mjs). It is committed, like
  `inter-metrics.json`, because CI has no install. 1,379 types in 16 exports, 255 KB. It
  supplies each symbol's package, container and kind, lists the public symbols that have no
  page (documentation coverage as a side effect), and supplies each class's default
  interface, which is what the compiler names a class's members by (P5). Four facts about
  the packages shaped it:
  - **A package is known by its project name, not its folder's.** TwinBasicAssertions is
    `Assert`, all three CEF builds are `cefPackage` (their declared APIs are identical, and
    the generator checks that they stay so), and AppGlobalClassObject is
    `AppGlobalClassProject`. That is what code writes and hover says, so the index's
    `package` is the project name, and its `packages` map gives each project's name on the
    pages.
  - **Visibility cannot be read off one declaration.** CEF's `CefLogSeverity` is a `Public
    Enum` inside a `Private Module`, documented and used; CustomControls' `Borders` is a
    `Private Class` a control's `Borders` property returns; `CheckBox` declares almost
    nothing itself, its members being on `Private Class CheckBoxBaseCtl` and four classes
    above it; and VB's `Clipboard` is a public CoClass whose members are on `Private
    Interface _Clipboard`. So every declared type is kept and marked, a non-public one
    keeping its members only when a public type exposes them, by inheritance or as the
    interface a public CoClass is built on.
  - **`[Hidden]` is not "absent".** `Module [_HiddenModule]` carries it, and its members are
    globals.
  - **The default-interface map comes from CoClasses:** `interfaces` maps `VBA._Collection`
    to `VBA.Collection` and `tbIDE.IToolWindowsV1` to `tbIDE.ToolWindows`, 37 in all, which
    is P5's hover answer turned into a lookup. A lookup that takes the compiler's word has
    to map `_Collection` to `Collection`.
- **Regenerate** `package-api.json` with `node scripts/build_package_api.mjs` when the
  reference is re-indexed against a newer build, and commit it with the pages.

**The gates.** `builder/symbol-baseline.json` lists every published URL, and a build that
loses one fails --- the case it exists for is a reworded member heading, which moves an
anchor an installed add-in still holds. A new URL rewrites the baseline. Retiring an entry
follows the rules in [Permanent Links](docs/Documentation/Permanent-Links.md).
`scripts/check_symbol_index.mjs`, a `test.bat` gate, asserts each derivation rule, each
scanner trap and the guard's refusals on fixtures. Every URL resolves by construction, and
`tB/symbols.json` is in the online tree's index, so `--check-audit-index` sees it written.
The build's summary gives the count of public symbols no page documents, 602 today, and
`--symbol-gaps <file>` lists them: 173 VB and 294 WinNativeCommonCtls members inherited and
named only in prose, 48 WinNativeCommonCtls types --- enumerations and structures declared in
its controls' base classes and its public `...Consts` modules --- 39 members of VBA's
`_HiddenModule` and `Interaction`, and a tail of a few each.

**Names that belong to more than one page**, to test lookup against (the generated index
has the complete list):

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

**Not done, and why:**

- **The rest of an embedded mode for pages.** The theme is done: the site reads a
  `theme=dark|light` query parameter (Stage 4, increment 2), since the add-in cannot reach
  into a cross-site frame. Hiding the header and navigation is a separate, optional
  question, untested. The parameter serves the live site only: the IDE's own server answers
  any URL with a query string with a 404 (P13), so the offline route would need the theme
  some other way.
- **Keywords with no page of their own** --- `ElseIf`, `Until`, `Step`, `To`, `In`,
  `ByVal`, `ByRef`, `Optional`, `As` --- are in the index only where a page's title gives
  them. Adding one is a `symbols:` line on the page that explains it, which is a content
  decision per keyword. Deferred.
- **Data types** --- `Long`, `String`, `LongPtr` --- have their page at
  `/Reference/Data-Types`, outside `/tB/`, so the index cannot carry them without breaking
  its own rule. Giving that page a `/tB/` permalink, with the old one in `redirect_from:`,
  would. Deferred.
- **The offline tree has no copy of the index**, since the offline route is deferred.

### Stage 4: the add-in, in increments

Each increment is finished with its scenarios. Worked on by hand, a new build replaces the
loaded one without ending the IDE: rename the loaded DLL aside, put the new build in its
place, and click the compiler's restart button (P9). The lanes need not: a restart saves a
harness about a second against opening a new IDE.

1. **F1 to a page. Built**, tested by [help.test.mjs](test/addin/help.test.mjs) on BETA
   995. F1 takes the selection or the name under the cursor (below) and looks it up in the
   embedded index. One page is shown in the help pane (increment 2); a miss says
   `No help for '<name>'` through `ShowNotification`; an empty spot puts the focus in the
   pane's search box. Several pages fill the pane's results list, labelled
   `Container.Name`, and leave the page as it was. Before the pane, they were a
   `ShowMessageBox` with a button per page: `Add` on an unknown object gave twelve and
   Cancel, and the IDE showed thirteen buttons without complaint.

   **The key is F1**: P1 and P2 do not rule it out. It fires wherever the focus
   is in the IDE's window. The one overlap is signature help: while it shows, F1 also expands
   or collapses it, and the cursor is then inside a call's parentheses, often on an argument
   rather than the procedure. If that proves a nuisance, Shift+F1 has no binding of its own.
   Never a key with `{ctrl}` or `{alt}` while the P1 bug stands.

   **The URL opener honours the test switch.** It calls `ShellExecuteW`, except while
   `Environ$("TB_ADDIN_TEST")` is not empty: then it prints `open <url>` to the DEBUG CONSOLE
   and starts nothing (Stage 1, item 6). When the add-in loads it prints whether the switch
   is on, and every scenario checks that line before it presses anything. An IDE build that
   stopped passing the variable on to the compiler then fails the run, instead of starting a
   browser on the private desktop.
2. **The help pane. Built**, tested by the same lane on BETA 995. The tool window
   `tbDocsHelpPane`, titled `TWINBASIC HELP`, holds a search box, an *Open in browser*
   button, a results list and the page in an iframe (P3), laid out by a flex wrapper
   inside the root, because showing the window resets the root's `display`. The toolbar's
   Help button shows the pane with the focus in the search box.
   - **Search** runs on every `keyup`: the entries whose name starts with the text, then
     those that contain it, at most 100; text with a dot is matched against
     `Container.Name`. Enter shows the first. A row shows the label and the entry's
     `kind`.
   - **The results** are a list view whose rows carry
     `raiseEvent("onPick", event, true, <entry number>)`, as in Sample 15, since
     `raiseEvent` works nowhere else (P12). Only the number goes into the handler, and the
     label and kind are HTML-escaped.
   - **Open in browser** opens the page the add-in last gave the frame, through
     `OpenUrl`, so it honours the test switch. A link followed inside the frame is not
     seen: the live site is on another origin, whose location the IDE's page cannot read.
   - **Theme.** The pane's stylesheet, the resource `Resources/STYLESHEETS/pane.css` given
     to `ApplyCss`, uses the IDE theme's own custom properties (`--themeGeneralPanelBackColor`,
     `--themeToolWindowBodyForeColor`, ...). They are set on the IDE's document and
     inherited by the shadow root, so the pane needs no code for a theme change. This
     departs from the plan's light and dark stylesheets. The lane checks the background,
     which the window does not otherwise inherit: the window already has the theme's text
     colour.
   - **The page's theme** is the IDE's: the frame's URL carries `?theme=` and
     `Themes.ActiveThemeNameGroup` (`FrameUrl`), before any fragment, and the site applies
     it before its first paint and keeps it in `sessionStorage` for the pages reached from
     it (the head script in `renderHead`, and `theme-toggle.js`), never in the reader's
     `localStorage` choice; a click on the site's theme button replaces it. Without it the
     page follows WebView2's colour scheme, which is Windows' app mode (P3).
     `Host_OnChangedTheme` gives the frame its page again with the new theme, so a link
     followed inside the frame is lost. *Open in browser* passes no theme. The lane works
     out the IDE's group from its panel colour, not from the API, checks every page's
     `data-theme`, and switches the theme with the IDE's own commands
     (`executeIdeCommand("tbTheme_SwitchToLightMode")`, `...DarkMode`, `main.js` BETA 995),
     which save it in `twinBASIC_IDE\IDESettings\GENERAL` (`colorTheme`), where the user's
     own IDE reads it; the registry tidy puts that one entry back (`restoreTheme`). Fault
     runs: without the handler only the theme-change case fails; with the site ignoring the
     parameter every case that shows a page fails.
   - F1 pressed while the focus is in the page goes to the page, not to the add-in, so a
     lookup from there goes through the search box.

   **The pane has an id of its own**, never none: every window given no id is the same
   window. **And it outlives the add-in.** Every compiler restart, which every switch of
   build target is, ends the add-in and loads a new instance, which gets the same window
   back, emptied (P9). So the pane is built in `Host_OnProjectLoaded`, every time. The
   page it showed is kept with `SaveSetting "tbDocsHelp", "Pane", "Page"` (the site path,
   add-in-wide), which the lane's `settings` entry restores, and is read back there; the
   lane checks that a new frame comes back with it. `ToolWindow_OnClose` builds the pane
   again, as Sample 15 does; nothing tests closing the pane.

   **The lane serves the built site.** With the test switch on, the add-in takes its site
   from `TB_DOCS_HELP_SITE`; [help.test.mjs](test/addin/help.test.mjs) serves `docs/_site`
   on localhost with `builder/static-files.mjs`, the handler `tbdocs --serve` uses, so each
   case loads the build's real page, and a 404 fails it. The frame is then same-site, and
   `Page.getFrameTree` reads its URL. The offline tree cannot be used: a page served over
   http cannot frame a `file://` URL. So the lane needs `build.bat` first.
3. **Context: which `Add`? Built**, tested by the same lane on BETA 995. **The route is the
   page's socket** (the owner, 2026-10-04): the add-in's own parser would have to be close
   to a whole twinBASIC parser, so it waits, and the socket stands until upstream gives the
   API a call for it. For the name under the cursor, F1 asks the compiler's hover about
   the character the name starts from (`Words.NameColumn`); a selection is looked up as it
   is, without asking.
   - **The question** is an `<img src='data:,' onerror='...'>` set as the `innerHTML` of a
     hidden `div` in the pane (P4). Its handler is `Resources/SCRIPTS/hover.js`, which
     `CompilerHover.HoverQuestion` fills in with a question number, line and character
     (numbers only) and escapes for the attribute. It asks `lspSocket` for
     `textDocument/hover` on `twinbasic:` + the selected editor's `getFullPath()`, as the
     IDE's own hover provider does, and answers by calling the function the add-in's
     `AddEventListener("tbDocsHover", ...)` stored on that `div` (P12's direct call), with a
     plain object `{ seq, status, value }`: `copyEvent` keeps its strings. **It answers
     exactly once**: `ok` with the hover's markdown (possibly empty), `unavailable` when the
     socket is not open, `timeout` after 3 s, `error` with the exception's text, which the
     add-in prints. A request sent across a compiler restart never gets its callback, which
     is why the timeout exists. An answer to an older question is dropped.
   - **The answer** is read by `Declared.ReadHover` (the forms are in P5 under [What is
     under the cursor](#what-is-under-the-cursor)) into a name, a package and a container.
     A package the index does not document is the project's own, an undocumented
     package's or a type library's, and has no page (increment 4), even though VBA has a
     `Beep`. When the hover's name is the name written (case and a trailing `$`
     ignored), the entries are those of that package and container, the container mapped
     through the index's `interfaces` or with its leading `_` dropped
     (`VB._CheckBox` is `CheckBox`), else those of that name anywhere in the package (an
     interface the map lacks, such as `VBRUN.PropertyBag_VB5`). When it is not --- `App.Path`
     is `GetAppPath in VB.HiddenModule2`, `Err.Number` `GetErrNumber in VBA._HiddenModule`
     --- the plain lookup's entries are kept to the package, which still picks VB's `App`
     over AppGlobalClassObject's and `ErrObject.Number` over every other `Number`. No answer
     to read (a statement, `Debug.Print`, a comment, a late-bound `o.Add`) is the plain
     lookup.
   - **The fault run** (the question made to answer `unavailable` every time) failed the
     cases that need the compiler: `c.Add`, `.Add` inside `With`, a CheckBox's `Value`,
     `App.Path`, `Err.Number` and the project's `Beep`.
   - The socket code is in files of its own, `CompilerHover.twin` and `hover.js`, without
     comments, so that it can be replaced whole once the API has a call.
4. **A name with no page. Built**, tested by the same lane on BETA 995, at the owner's
   request (2026-10-04): a user who documents their own code with `[Description]` sees it,
   and is not sent to a page for another name. When the hover names a package the index
   does not document --- the project, another package, a type library --- F1 shows, in
   place of the frame, the declaration, the description and where the name is declared,
   all from the hover (P15), read by `Declared.ReadSummary`; a name with none says
   `No description.`. *Open in browser* is disabled meanwhile, and showing a page puts the
   frame back. The saved page is unchanged, so a restart shows the last page.
   - `ReadHover` also reads `in library <name>`, a class's or module's: a class of the
     project named as a documented one no longer finds that one's page.
   - On a procedure's name where it is declared, the hover is the code-generation block, so
     F1 says `No help for 'Beep': it is declared here`.
   - **The lane's own race.** F1 on the name whose page shows already sets the same `src`
     again, which reloads the frame, and until the reload starts the old page looks loaded.
     `f1Shows` marks the page before pressing F1 and waits for a page without the mark. A
     page showing again after a summary is waited for too, since its `src` can already be
     right.
   - **The fault run** (`ShowPage` not putting the frame back) failed the four cases that
     show a page after a summary.
5. **Later:** hover help through `CodeEditor.AddMonacoWidget` after a pause (the cost of
   adding and removing widgets is not measured); offering only the packages the project
   references; offline use.

**Lookup:**

1. A selection on one line is looked up exactly as selected.
2. Otherwise take the dotted name under the cursor. Its last two segments are tried as
   `Container.Name` and as `Package.Name` first (`VBA.Interaction.MsgBox`,
   `VBA.Interaction`); a container written with the compiler's leading `_` matches without
   it.
3. Otherwise every entry with that name. For a bare name, the language's own entries
   (package `null`) win: `Close` is the statement. For a qualified name whose qualifier
   matched nothing (`c.Add`, `Me.Close`), only members count, since a statement cannot
   follow a dot. Several pages left: offer the choice. Entries that share a URL
   (`CodeEditor.Close` and `Editor.Close`) are one choice.

**Word extraction.** Given the line and the cursor's column:

1. If the character at the cursor is not `A-Z`, `a-z`, `0-9` or `_`, take the one before
   it instead, so that a cursor just after a name, as after typing it, takes that name. If
   that one is not either, there is no word.
2. Extend left over those characters **and `.`**, to take the whole dotted chain on the
   left.
3. Extend right over those characters **without `.`**, stopping at the end of the current
   segment.

With the cursor on `Add` in `Set w = Host.ToolWindows.Add(name, id)` this gives
`Host.ToolWindows.Add`. A chain cut off on its left by `)` or by nothing, inside a `With`,
starts with a dot, which is dropped: `.Add`. Not handled in the first version: string
literals and comments are read like code, so a name in a comment finds its page and a word
in a string usually misses (`File.ReadText(CommentsToWhitespace)` can blank comments out if
needed); lines joined with `_`; numbers, which miss the index. `GetSelectionInfo` counts
lines and columns from 1, as Monaco does (the help lane's cases depend on it).

**Settings:** per project through `Project.SaveMetaData` / `LoadMetaData`, add-in-wide
through `SaveSetting` / `GetSetting` --- which is the shared registry tree, so the runner's
registry restore has to include it.

**The add-in's own parser**, deferred (increment 3 takes the page's socket instead), and
the route once the socket is gone, if the API never gains a call for it:

- On `Host_OnProjectLoaded`, which runs again after every compiler restart, in a new
  instance of the add-in (P9), go through the virtual file system with `For Each` --- never
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
- Scanning on a background thread is possible. Measure the scan first; a second thread
  inside the IDE's process is the riskiest part of the whole design.

The add-in's code skeletons are written in Stage 4 against the compiler, with tests.

### Stage 5: shipping

- Build both bitnesses, which `buildAddin` does (P7). Add a documentation page under
  [docs/IDE/AddIns/](docs/IDE/AddIns/).
- Distribution is upstream's decision: the community add-ins list, or bundled with the IDE.
- Take to upstream, with the probe results as evidence: the shortcut bug; a call to open a
  URL; a way to ask the compiler about the symbol at a position, whose answer hover already
  has (P5); tool windows given no id sharing one window. The shortcut bug and the windows
  are in [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md).

## Open decisions

Recommended, and not yet confirmed:

- **Page internals are for probes only, with one exception the owner made**
  (2026-10-04): increment 3 asks the compiler's hover through the page's socket, until the
  API has a call for it. Otherwise the shipped add-in uses the public API and
  `ShellExecuteW`, and whatever the API lacks is requested upstream. P4 showed the route
  exists: any inline handler can reach the page's globals, `openEditors`, the socket to the
  compiler and `hostAppObject` among them. `raiseEvent` in a list view's items is the
  other exception, since the IDE's own samples use it that way and it is the only way a
  list view reports a click.
- **Isolation starts with restoring the registry** (Stage 1, item 3), and a private
  `APPDATA` for every lane IDE (P6). A separate Windows account for test runs comes only if
  that proves not to be enough.

## Rules

Stage 1 is built, so the rules for testing add-ins bind every session and are in
[WIP.md, Driving the twinBASIC compiler](WIP.md#driving-the-twinbasic-compiler): no test
add-in in the real install's `addins\` or in `%APPDATA%\twinBASIC\addins\`, no real browser
from a test, every `SaveSetting` application named in `lanes.mjs`, IDEs ended by pid, and
one project per IDE.
