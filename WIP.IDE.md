# The IDE section — finishing it

Every page of the IDE section (`docs/IDE/`, `/tB/IDE`) is fit for the book, and
`docs/_book.yml` holds no IDE entry under `left_out:`: keep it so. This file covers the
structure, the conventions, where each fact comes from, and how a chapter is written. Owner
decisions:

- task chapters plus a reference part;
- flat permalinks, with redirects for a page that moves;
- the how-to material of `Features/Compiler-IDE` lives here;
- no `.af` files under `docs/IDE/`.

What is open is in the kit, `TODO.md` in `.claude/scratch/ide-docs/` (gitignored), under
*RESUME HERE*: read it before anything else. The kit also holds each chapter's fact sheet and
its briefs.

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

| # | Chapter | Permalink | Covers |
|---|---|---|---|
| 1 | A tour of the IDE (landing page) | `/tB/IDE` | `index.md` |
| 2 | Starting a project | `/tB/IDE/Starting/` + children | New Project, Splash Screen, FAQ's first-launch and VBP-import parts |
| 3 | Projects and files | `/tB/IDE/Projects` | Project Explorer (file and object views, Add, context menu; no resource editors: images preview, the rest open as text), references and packages (links to Features/Packages), Export Project (from Menu/File) |
| 3a | Project Settings (reference) | `/tB/IDE/Project-Settings` | `Project Settings.md`, kept whole; **its anchors stay**, as 19 links use them |
| 4 | Writing code | `/tB/IDE/Code` + children | Editor, Find/Replace, Outline, Open Editors, History, Diagnostics, `Features/Compiler-IDE/CodeLens` |
| 5 | Designing forms and reports | `/tB/IDE/Forms`, `/tB/IDE/Reports` | tbForm, Toolbox, Properties, the Format menu's operations, tbReport |
| 6 | Running and debugging | `/tB/IDE/Debugging` + children | Menu/Debug's run-time error walkthrough and Debugger Options, Menu/Run, Debug Console, Variables, Watches, Call Stack, Memory, `Features/Compiler-IDE/Debugging` |
| 7 | Building | `/tB/IDE/Building` | Toolbar's Build configuration, Menu/File's Build and Clean, Package Publishing, links to LLVM and Project-Types |
| 8 | Customising the IDE | `/tB/IDE/Customising/` + children | IDE Options (all of them), themes and custom `.theme` files, panel layouts, keyboard shortcuts, language (from Menu/Window and Menu/Tools) |
| 9 | Add-ins | `/tB/IDE/AddIns/` | AddIns/* (no community add-in is listed yet) |
| 10 | When something goes wrong | `/tB/IDE/Troubleshooting/` + children | Status Bar's service states, Restart the compiler, TRACE mode, error reporting |

**Part B, Reference.** Written impersonally. One page per menu, plus the Toolbar, the Status Bar
and the keyboard shortcuts, under `/tB/IDE/Reference/…`. Each entry gives the item, its
shortcut, one or two sentences, and a link to the chapter that explains it.

- The keymap is a page of its own, `Reference/Keyboard-Shortcuts.md`, one table for each prefix
  of a command's name, generated from `main.js` by `ide_js.mjs keymap`: never edit a section
  before its See Also by hand, and put prose above the first `## `. A section's heading is the
  prefix in code, with no title in words, because a heading such as `Call Stack` would be a title
  match against the pages that explain the panel (WIP.Search.md).
- Webpage, the one pane that is not in a chapter, has a page of its own here.

**Moving pages.** When a page moves, its old permalink goes into `redirect_from:`, and every
inbound link is changed to the new canonical URL. Inbound links come from `Features/`,
`Reference/`, `Tutorials/`, `LLVM/`, `Miscellaneous/FAQs.md`, `Documentation/` and
`docs/index.md`. An anchor another page links to keeps its heading text.
`redirect_from` cannot rescue an anchor, so check these:

- `Project-Settings#…`;
- `Window#language`, from `FAQs.md`.

Where a merged page's pictures live does not change: `shoot_docs.mjs` writes them by path
(`out`), so leave the files in `docs/IDE/Images/` and `Menu/Images/` and change only the links.

A page that a chapter will absorb keeps its old URL until that chapter is written; the chapter
then takes the old URL into its `redirect_from:`, so nothing moves twice.

**Features/Compiler-IDE** keeps a short "what's new compared to VB6" page that links into
the chapters; the how-to material is in the chapters. A page there gets `redirect_from` only if
it is removed outright.

**A landing page with children has a trailing slash** (`/tB/IDE/Customising/`, as
`/tB/IDE/AddIns/`). Without the slash, the link check resolves `Customising#anchor` to the
child folder.

**Language names in a script the font subsets lack** (Cyrillic, Devanagari, Malayalam, CJK) are
written in English only. The subsets cover Latin and Greek; see `scripts/build_fonts.py`.

**Nav order.** The chapters take `nav_order` 1--10 in the order of the table above.
`IDE Reference` has 99. The nav sorts numbered pages before unnumbered ones, so a page with no
`nav_order` sorts after the Reference.

**The book.** `_book.yml`'s IDE part is Part A's chapters followed by Part B. A new IDE page goes
into it when it is finished, not before.

## Conventions

These apply across `docs/IDE/`. The first three also apply to any page that names the IDE's
controls or keys, and `docs/Documentation/Authoring.md` (*Formatting conventions*) states them
for contributors.

- **UI names** in bold, as the IDE spells them: **Project Explorer**, **Break On All Errors**.
  The search reads this bold (`WIP.Search.md`, "Term entries"): a label that is not bold
  is not found. A run-in sentence in bold ends in a full stop: as a definition term or at the
  start of a list item it still gets its search entry and deep link, but its text is not
  taken as a label term.
- **Menu paths** in bold with an arrow: **File → Export Project**.
- **Keys**: `<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>`, with key names in mixed case and no
  spaces around the `+`. Every key is written by name: `<kbd>Enter</kbd>`, `<kbd>F5</kbd>`,
  `<kbd>Break</kbd>`, and arrows as `<kbd>Up</kbd>`, `<kbd>Down</kbd>`, `<kbd>Left</kbd>` and
  `<kbd>Right</kbd>`. Glyphs are avoided, because the font subsets need not hold them.
- **Never re-list a picture's labels** (owner). The screenshots are SVGs whose text is
  accessible, so a bare list of a menu's or dialog's items (label and keys, nothing else) only
  repeats the picture. A reference entry says what the item does. An item with nothing to say
  beyond its label is left to the picture.
- **Headings** in sentence case, with no icon and no shortcut inside them.
- **The section names no build**, except in a defect callout's label, `> [!NOTE] BETA 1010`
  (owner's standing rule; WIP.md rule 6). Lines such
  as "Components list coming soon" go, unless the IDE itself shows that text and the page says
  so.
- **Defects the twinBASIC developers already know of** (owner) are not queued, but a page that
  describes the feature still carries the callout rule 6 calls for:
  - Rename Symbol renames nothing (on BETA 1034 it opens no box at all, and <kbd>F2</kbd>, which
    the right-click menu still shows beside it, opens the Object Browser);
  - accepting a function from the completion list by typing `(` doubles the parenthesis
    (`Area(()`).
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
  - `runningProcessesContainer`: the running programs, shown as **PROCESS** boxes in the
    status bar (not in the Run menu);
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
- The kit `.claude/scratch/ide-docs/ide-driving-survey.md` (gitignored)
  maps the debugger, Settings and Export internals.

## Writing a chapter

1. **Fact sheet.** A Sonnet agent reads `main.js` and the existing pages and writes
   `.claude/scratch/ide-docs/<chapter>-facts.md`. Each item in it has its source,
   a command id or a regex, and is marked *read* or *needs trying*.
2. **Trying.** The *needs trying* items are tried in a lane IDE. Use an Opus agent, one at a
   time, recording the registry hashes before and after as for any harness run.
3. **Pictures.** New `shoot_docs` shots for what the chapter shows and no picture shows yet. Use
   an Opus agent, then `--svg`.
4. **Writing.** A Sonnet agent writes the pages from the fact sheet only, nothing from memory.
5. **Review.** Read the diff against the fact sheet, then run `build.bat && check.bat`. Then move
   the pages into the book part, run `book.bat`, and check the pages there.
