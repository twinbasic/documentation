# The IDE section — finishing it

The IDE section (`docs/IDE/`, `/tB/IDE`) is being rewritten so that every page is fit for
the book. The goal is that `docs/_book.yml` holds no IDE entry under `left_out:`. This file
covers the structure, the conventions, where each fact comes from, and how a chapter is
written. Owner decisions, 2026-10-11:

- task chapters plus a reference part;
- permalinks flattened, with redirects;
- the how-to material in `Features/Compiler-IDE` moved here;
- `docs/IDE/_Images/*.af` deleted.

The section is not bound to the structure it had. The existing pages are raw material.

## What "book-ready" means for a page

- No heading without text under it, no TODO, and no list of labels copied off a screenshot.
  Every menu item, button and option has at least a sentence saying what it does.
- Every claim about behaviour has been checked against BETA 1005 or newer: read from `main.js`,
  or tried in an IDE on a private desktop. A screenshot or an older page is not a source.
- The prose carries the information. Alt text describes the picture and holds no fact the
  prose lacks; a long alt text that lists labels is a sign the prose is missing.
- The conventions below are followed, and the page is in the IDE part of `_book.yml`.

## Structure

**Part A, Working in the IDE.** Each chapter is one page, or a short landing page with a few
children. Second person ("you") is allowed here, as in tutorials.

| # | Chapter | Permalink | Takes in |
|---|---|---|---|
| 1 | A tour of the IDE (landing page) | `/tB/IDE` | `index.md` |
| 2 | Starting a project | `/tB/IDE/Starting` | New Project, Splash Screen, FAQ's first-launch and VBP-import parts |
| 3 | Projects and files | `/tB/IDE/Projects` | Project Explorer (file and object views, Add, context menu, resource editors), references and packages (links to Features/Packages), Export Project (from Menu/File) |
| 3a | Project Settings (reference) | `/tB/IDE/Project-Settings` | `Project Settings.md`, kept whole; **its anchors stay**, as 19 links use them |
| 4 | Writing code | `/tB/IDE/Code` + children | Editor, Find/Replace, Outline, Open Editors, History, Diagnostics, `Features/Compiler-IDE/CodeLens` |
| 5 | Designing forms and reports | `/tB/IDE/Forms`, `/tB/IDE/Reports` | tbForm, Toolbox, Properties, the Format menu's operations, tbReport |
| 6 | Running and debugging | `/tB/IDE/Debugging` + children | Menu/Debug's run-time error walkthrough and Debugger Options, Menu/Run, Debug Console, Variables, Watches, Call Stack, Memory, `Features/Compiler-IDE/Debugging` |
| 7 | Building | `/tB/IDE/Building` | Toolbar's Build configuration, Menu/File's Build and Clean, Package Publishing, links to LLVM and Project-Types |
| 8 | Customising the IDE | `/tB/IDE/Customising` + children | IDE Options (all of them), themes and custom `.theme` files, panel layouts, keyboard shortcuts, language (from Menu/Window and Menu/Tools) |
| 9 | Add-ins | `/tB/IDE/AddIns/` | AddIns/* as they are, Community given content |
| 10 | When something goes wrong | `/tB/IDE/Troubleshooting` | Status Bar's service states, Restart the compiler, TRACE mode, error reporting |

**Part B, Reference.** Written impersonally. One page per menu, plus the Toolbar, the Status Bar
and the keyboard shortcuts, under `/tB/IDE/Reference/…`. Each entry gives the item, its
shortcut, one or two sentences, and a link to the chapter that explains it.

- The keymap is shown as a table, not the JSON dump `Menu/Window.md` holds now. The table can be
  generated from `main.js` if keeping it by hand proves error-prone. Decide that when the page is
  written.
- Webpage and the other panes that are not in a chapter get a reference entry.

**Moving pages.** When a page moves, its old permalink goes into `redirect_from:`, and every
inbound link is changed to the new canonical URL. The 61 inbound links are in
`Features/`, `Reference/`, `Tutorials/`, `LLVM/`, `Miscellaneous/FAQs.md`, `Documentation/`
and `docs/index.md`. An anchor another page links to keeps its heading text.
`redirect_from` cannot rescue an anchor, so check these:

- `Project-Settings#…`;
- `Window#language`, from `FAQs.md`.

Where a merged page's pictures live does not change: `shoot_docs.mjs` writes them by path
(`out`), so leave the files in `docs/IDE/Images/` and `Menu/Images/` and change only the links.

**Features/Compiler-IDE** keeps a short "what's new compared to VB6" page that links into
the chapters. The how-to sections of `IDE-Features.md`, `Debugging.md` and `CodeLens.md` move
here, and those pages get `redirect_from` only if they are removed outright.

**The book.** `_book.yml`'s IDE part becomes Part A's chapters followed by Part B. A page leaves
`left_out:` when it is finished, not before.

## Conventions

These apply across `docs/IDE/` and also go into `WIP.Authoring.md` and
`docs/Documentation/Authoring.md` so other sections follow them.

- **UI names** in bold, as the IDE spells them: **Project Explorer**, **Break On All Errors**.
- **Menu paths** in bold with an arrow: **File → Export Project**.
- **Keys**: `<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>`, with key names in mixed case and no
  spaces around the `+`. Every key is written by name: `<kbd>Enter</kbd>`, `<kbd>F5</kbd>`,
  `<kbd>Break</kbd>`, and arrows as `<kbd>Up</kbd>`, `<kbd>Down</kbd>`, `<kbd>Left</kbd>` and
  `<kbd>Right</kbd>`. Glyphs are avoided, because the font subsets need not hold them. The 59 existing `<kbd>CTRL</kbd>`
  are converted in one mechanical pass.
- **Headings** in sentence case, with no icon and no shortcut inside them.
- **The section names no build**, except in a defect callout (owner's standing rule). Lines such
  as "Components list coming soon" go, unless the IDE itself shows that text and the page says
  so.
- Callouts follow WIP.md rule 6. A twinBASIC defect found while writing goes into
  `BUGS-TO-REPORT.md` with a reproducer, never into a page alone.

## Where the facts come from

- **`<install>\ide\main.js`** (one line, about 1.3 MB). Search it with a Node script and
  bounded regexes, never with `grep`, which takes minutes on one line. Useful landmarks, by
  name, since offsets move between builds:
  - `ideCommands`: every command id, such as `tbEditor_ClipboardPasteAsComment`, and its default
    keys;
  - `ideOptionsSchema`: the IDE Options, one flat list of about 30 options;
  - `rootMenu…offsetHeight` blocks: the menus;
  - `runningProcessesContainer`: the Run menu's process list;
  - `createDropDowns`: the editor's three combo boxes;
  - `showDesignerContextMenu`: the form designer's context menu;
  - `tbFormDesigner_MenuEditor*`: the menu editor;
  - `tbProblems_*`: Diagnostics;
  - `reloadThemesFromDisk`: `.theme` files;
  - `statusErrorsDiv` and `statusMemUsageDiv`: the status bar.
- **The running IDE**, for behaviour the code does not show plainly. Use `Lane` from
  `scripts/lib/tb-lane.mjs` on a private desktop, as `shoot_docs.mjs` setups do. Never use the
  owner's IDE or the real `APPDATA`.
- **`shoot_docs.mjs` and WIP.Screenshots.md** hold the states the screenshots already set up,
  which are often the quickest way to reach a dialog. A new picture is a new shot there, taken
  in both themes; never make a picture by hand.
- The kit `.claude/tooling-review-scratch/beta995-probes/ide-driving-survey.md` (gitignored)
  maps the debugger, Settings and Export internals.

## Writing a chapter

1. **Fact sheet.** A Sonnet agent reads `main.js` and the existing pages and writes
   `.claude/tooling-review-scratch/ide-docs/<chapter>-facts.md`. Each item in it has its source,
   a command id or a regex, and is marked *read* or *needs trying*.
2. **Trying.** The *needs trying* items are tried in a lane IDE. Use an Opus agent, one at a
   time, recording the registry hashes before and after as for any harness run.
3. **Pictures.** New `shoot_docs` shots for what the chapter shows and no picture shows yet. Use
   an Opus agent, then `--svg`.
4. **Writing.** A Sonnet agent writes the pages from the fact sheet only, nothing from memory.
5. **Review.** Read the diff against the fact sheet, then run `build.bat && check.bat`. Then move
   the pages into the book part, run `book.bat`, and check the pages there.

**Order**, by what readers need most:

1. Customising (IDE Options)
2. Writing code
3. Running and debugging
4. Forms and reports
5. Projects and files
6. Building
7. Starting a project
8. Troubleshooting
9. Reference
10. The tour

The restructure comes first, in its own commit, before any chapter is written. It moves only
the pages whose place in the new structure is settled:

- Project Settings;
- the menus, the Toolbar and the Status Bar, into Part B.

It also sets up the nav and the book parts.

A page that a chapter will absorb keeps its old URL until that chapter is written. The chapter
then takes the old URL into its `redirect_from:`. That way nothing moves twice.

## What the IDE has that no page covers yet

From the survey of BETA 1005. Each chapter's fact sheet confirms the items in its own chapter.

- **IDE Options:** all of them except Tab Size and the LLVM options. Examples are Intellisense
  mode, the Handles/Implements syntax, Show Hidden Members, advanced hover, sticky scrolling,
  Restore Editors State, the fonts, and the real OS title bar.
- **Code editor:**
  - the component, scope and procedure combo boxes, which also insert event handlers;
  - Rename Symbol, Go To Definition and Last Position;
  - bookmarks;
  - the right-click menu and the tab context menu;
  - Paste As Comment;
  - Monaco's command palette and multi-cursor commands;
  - automatic backups.
- **Finding:** Find In Project, the Quick Find widget, Go To Line/Column.
- **Form designer:** the menu editor, control arrays, locking, tab-index overlay, grid and zoom,
  "Launch the form in isolation", Select Parent, the in-place toolbar, the context menu, and the
  Toolbox's search, names toggle and "more components".
- **Properties:** search, the system-colour picker, ActiveX property pages.
- **Report designer:** everything beyond the list of bands and tools.
- **Running:**
  - the Run menu's process list (Terminate, Bring To Front);
  - **Run Or Preview** (<kbd>F6</kbd>);
  - setting a breakpoint in the gutter, and whether breakpoints persist;
  - Step Out (on the toolbar, not on the Debug menu).
- **Diagnostics:** the four filter toggles and the context menu.
- **Debug Console:** the copy commands in its context menu.
- **Project Explorer:** the file context menu (Copy Path, View As JSON, View As Markdown Preview,
  Export…), the object view, search, and the empty headings for each Add item.
- **Packages:** the Available Packages tab, Import from file, the link and overwrite prompts, and
  the "package needed" prompts for WinNativeForms and CustomControls.
- **Status bar:** the error, warning, hint and info counters, and the memory figure.
- **Themes:** custom `.theme` files in a `themes` folder.
- **Webpage:** mobile mode, and back, forward and reload.
- **Troubleshooting:** the DevTools command (`tbIdeDevTools_Show`, which has no menu item).
- The **View → Object Browser** item does nothing; say so.
