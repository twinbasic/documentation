---
title: Keyboard Shortcuts
parent: IDE Reference
grand_parent: IDE
nav_order: 15
permalink: /tB/IDE/Reference/Keyboard-Shortcuts
---

# Keyboard shortcuts
{: .no_toc }

The IDE's built-in group of keyboard shortcuts, **Default Built-in Keyboard Shortcuts**. [Keyboard shortcuts](../Customising/Keyboard-Shortcuts) explains how to change them.

Every command of the IDE is in one of the tables below, with a line that says what it does. Each table has the commands whose names start with the same prefix, the text up to the first underscore, and the prefix is the table's heading. A row leaves it out: `Clean` under `tbBuild_` is the command `tbBuild_Clean`. The whole name is the one a group of your own uses. On the website, copying a name from a row gives the whole name, and the browser's find on the page and the site's search both take it. The names are the IDE's own, so `tbFormDesginer_` is spelled as the IDE spells it.

The **Keys** column gives a command's default keys, and is empty for a command that has none. A table with no **Keys** column has no command with a default key. The same key can be in several rows, because what a key does depends on what has the focus: <kbd>Ctrl</kbd>+<kbd>V</kbd> runs one command in the code editor and another in the form designer. Many commands apply only in some state, such as a project being loaded or a program stopped at a breakpoint; a command that does not apply does nothing.

A key marked *on release* runs when the key is released, not when it goes down. **Window → Keyboard Shortcuts → Manage Keyboard Shortcuts...** shows the same group as text, with the exact key strings, which also say which keys repeat while they are held down. [Shortcut strings](../Customising/Keyboard-Shortcuts#shortcut-strings) explains them.

A command with no default key runs from a menu, a button or another command. Any of them can be given a key in a group of your own, by writing its name and a key string, as [Keyboard shortcuts](../Customising/Keyboard-Shortcuts#the-text-of-a-group) explains. For example, `"tbMenu_ShowFileMenu": ["{KEYDOWN}{CTRL}{ALT}F"]` opens the File menu with <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>.

<div class="command-index">

* TOC goes here
{:toc}

</div>

## `tbBuild_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbBuild_</span>Clean</code> |  | Cleans the project's build. |
| <code><span class="command-prefix">tbBuild_</span>Fusion</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> | Builds the Fusion host program that a project with ActiveX controls may need, without building the project. |
| <code><span class="command-prefix">tbBuild_</span>Start</code> |  | Builds the project. |
| <code><span class="command-prefix">tbBuild_</span>SwitchToWin32</code> | <kbd>Ctrl</kbd>+<kbd>F2</kbd> | Sets the build target to 32-bit Windows. |
| <code><span class="command-prefix">tbBuild_</span>SwitchToWin64</code> | <kbd>Ctrl</kbd>+<kbd>F1</kbd> | Sets the build target to 64-bit Windows. |

## `tbCallStack_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbCallStack_</span>FocusPanel</code> |  | Moves the focus to the Call Stack panel. |
| <code><span class="command-prefix">tbCallStack_</span>HidePanel</code> |  | Closes the Call Stack panel. |
| <code><span class="command-prefix">tbCallStack_</span>ShowPanel</code> | <kbd>Ctrl</kbd>+<kbd>L</kbd> | Shows the Call Stack panel. |

## `tbCompiler_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbCompiler_</span>Restart</code> | Restarts the compiler. With the Alt key held down, it also empties the LLVM compiler cache. |
| <code><span class="command-prefix">tbCompiler_</span>RestartAndFlushLlvmCache</code> | Restarts the compiler and empties the LLVM compiler cache. |

## `tbDebug_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbDebug_</span>BreakInto</code> | <kbd>Ctrl</kbd>+<kbd>Break</kbd> | Pauses the running program. |
| <code><span class="command-prefix">tbDebug_</span>BreakpointsClear</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F9</kbd> | Removes every breakpoint from the project. |
| <code><span class="command-prefix">tbDebug_</span>RunOrPreview</code> | <kbd>F6</kbd> | Runs the procedure at the cursor, or shows a preview of the form when the active file is a form. |
| <code><span class="command-prefix">tbDebug_</span>SetNextExecutionStatement</code> | <kbd>Ctrl</kbd>+<kbd>F9</kbd> | At a breakpoint, makes the line at the cursor the next one to run. |
| <code><span class="command-prefix">tbDebug_</span>StartOrContinue</code> | <kbd>F5</kbd> | Starts the project, or continues it from a breakpoint. |
| <code><span class="command-prefix">tbDebug_</span>StepInto</code> | <kbd>F8</kbd>, <kbd>F11</kbd> | At a breakpoint, runs the current statement and stops at the next, entering any procedure it calls. |
| <code><span class="command-prefix">tbDebug_</span>StepOut</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F8</kbd>, <kbd>Shift</kbd>+<kbd>F11</kbd> | At a breakpoint, runs on until the current procedure ends and stops in its caller. |
| <code><span class="command-prefix">tbDebug_</span>StepOver</code> | <kbd>Shift</kbd>+<kbd>F8</kbd>, <kbd>F10</kbd> | At a breakpoint, runs the current statement and stops at the next, without entering any procedure it calls. |
| <code><span class="command-prefix">tbDebug_</span>Stop</code> |  | Ends the running program. |
| <code><span class="command-prefix">tbDebug_</span>ToggleBreakOnAllErrors</code> |  | Turns the project's Break On All Errors setting on or off. |
| <code><span class="command-prefix">tbDebug_</span>ToggleBreakOnAllErrorsInPackages</code> |  | Turns the project's Break On All Errors (inside packages) setting on or off. |
| <code><span class="command-prefix">tbDebug_</span>ToggleBreakpoint</code> | <kbd>F9</kbd> | Sets a breakpoint on the cursor's line, or removes the one that is there. |
| <code><span class="command-prefix">tbDebug_</span>ToggleDebuggable</code> |  | Turns the project's Allow Breakpoints (Debuggable) setting on or off. |

## `tbDebugConsole_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbDebugConsole_</span>Clear</code> |  | Clears the Debug Console. |
| <code><span class="command-prefix">tbDebugConsole_</span>ClipboardCopyAll</code> |  | Copies everything in the Debug Console to the clipboard. |
| <code><span class="command-prefix">tbDebugConsole_</span>ClipboardCopyAllWithTimestamps</code> |  | Copies everything in the Debug Console to the clipboard, each line with its time. |
| <code><span class="command-prefix">tbDebugConsole_</span>ExecuteCode</code> |  | Runs the line of code given as its argument in the Debug Console, as in `tbDebugConsole_ExecuteCode('? 6*7')`. It does nothing without an argument. |
| <code><span class="command-prefix">tbDebugConsole_</span>ExecuteEnteredLine</code> | <kbd>Enter</kbd> | Runs the line typed in the Debug Console's entry box, or inserts the selected entry of the completion list. |
| <code><span class="command-prefix">tbDebugConsole_</span>FocusPanel</code> | <kbd>Ctrl</kbd>+<kbd>G</kbd> | Moves the focus to the Debug Console's entry box. |
| <code><span class="command-prefix">tbDebugConsole_</span>GoToDefinition</code> | <kbd>Shift</kbd>+<kbd>F2</kbd>, <kbd>F12</kbd> | Goes to the definition of the symbol selected in the Debug Console's completion list. |
| <code><span class="command-prefix">tbDebugConsole_</span>HidePanel</code> |  | Closes the Debug Console panel. |
| <code><span class="command-prefix">tbDebugConsole_</span>HistoryCycleNext</code> | <kbd>Down</kbd> | In the Debug Console's entry box, shows the next line of its history. |
| <code><span class="command-prefix">tbDebugConsole_</span>HistoryCyclePrevious</code> | <kbd>Up</kbd> | In the Debug Console's entry box, shows the previous line of its history. |
| <code><span class="command-prefix">tbDebugConsole_</span>SelectAllEntryBox</code> | <kbd>Ctrl</kbd>+<kbd>A</kbd> | Selects the whole text of the Debug Console's entry box. |
| <code><span class="command-prefix">tbDebugConsole_</span>ShowPanel</code> | <kbd>Ctrl</kbd>+<kbd>G</kbd> | Shows the Debug Console panel. |
| <code><span class="command-prefix">tbDebugConsole_</span>ToggleAutoScroll</code> |  | Turns the Debug Console's Auto Scroll on or off. |
| <code><span class="command-prefix">tbDebugConsole_</span>ToggleInvertOutputDirection</code> |  | Turns the Debug Console's Invert Output Direction option on or off. |
| <code><span class="command-prefix">tbDebugConsole_</span>ToggleShowTimestamps</code> |  | Turns the Debug Console's Show Timestamps option on or off. |
| <code><span class="command-prefix">tbDebugConsole_</span>ToggleSmoothScrolling</code> |  | Turns the Debug Console's Smoother Scrolling option on or off. |
| <code><span class="command-prefix">tbDebugConsole_</span>TurnAutoScrollOff</code> |  | Turns the Debug Console's Auto Scroll off. |
| <code><span class="command-prefix">tbDebugConsole_</span>TurnAutoScrollOn</code> |  | Turns the Debug Console's Auto Scroll on. |
| <code><span class="command-prefix">tbDebugConsole_</span>TurnInvertOutputDirectionOff</code> |  | Turns the Debug Console's Invert Output Direction option off. |
| <code><span class="command-prefix">tbDebugConsole_</span>TurnInvertOutputDirectionOn</code> |  | Turns the Debug Console's Invert Output Direction option on. |
| <code><span class="command-prefix">tbDebugConsole_</span>TurnShowTimestampsOff</code> |  | Turns the Debug Console's Show Timestamps option off. |
| <code><span class="command-prefix">tbDebugConsole_</span>TurnShowTimestampsOn</code> |  | Turns the Debug Console's Show Timestamps option on. |

## `tbEditor_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbEditor_</span>ActivateNextTab</code> | <kbd>Ctrl</kbd>+<kbd>Tab</kbd> | Switches to the next editor tab. |
| <code><span class="command-prefix">tbEditor_</span>ActivatePrevTab</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Tab</kbd> | Switches to the previous editor tab. |
| <code><span class="command-prefix">tbEditor_</span>AddCursorAbove</code> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Up</kbd> | Adds a cursor on the line above. |
| <code><span class="command-prefix">tbEditor_</span>AddCursorBelow</code> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Down</kbd> | Adds a cursor on the line below. |
| <code><span class="command-prefix">tbEditor_</span>AddCursorsAtLineEndsOfSelection</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>I</kbd> | Puts a cursor at the end of each line of the selection. |
| <code><span class="command-prefix">tbEditor_</span>AddSelectionToNextFindMatch</code> | <kbd>Ctrl</kbd>+<kbd>D</kbd> | Adds the next occurrence of the selected text to the selection, with a cursor at each. |
| <code><span class="command-prefix">tbEditor_</span>ChangeAllOccurrences</code> |  | Selects every occurrence of the word at the cursor, for changing all at once. |
| <code><span class="command-prefix">tbEditor_</span>ClearBookmarks</code> |  | Removes every bookmark from the current document. |
| <code><span class="command-prefix">tbEditor_</span>ClearBookmarksProject</code> |  | Removes every bookmark from the project. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardCopy</code> | <kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> | Copies the selection to the clipboard, replacing tabs with spaces. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardCopyWithSyntaxHighlighting</code> |  | Copies the selection to the clipboard with its syntax colours. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardCut</code> | <kbd>Ctrl</kbd>+<kbd>X</kbd>, <kbd>Shift</kbd>+<kbd>Delete</kbd> | Cuts the selection to the clipboard, replacing tabs with spaces. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardCutPlain</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd> | Cuts the selection to the clipboard as plain text, with the editor's own handling of tabs left out. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardPaste</code> | <kbd>Ctrl</kbd>+<kbd>V</kbd> | Pastes the clipboard into the code editor, re-indenting the pasted text. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardPasteAsComment</code> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd> | Pastes the clipboard into the code editor as comment lines. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardPlainCopy</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> | Copies the selection to the clipboard as plain text, with the editor's own handling of tabs left out. |
| <code><span class="command-prefix">tbEditor_</span>ClipboardPlainPaste</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | Pastes the clipboard into the code editor exactly as it is, without re-indenting. |
| <code><span class="command-prefix">tbEditor_</span>CloseTab</code> | <kbd>Ctrl</kbd>+<kbd>F4</kbd>, <kbd>Ctrl</kbd>+<kbd>W</kbd> | Closes the current editor tab. |
| <code><span class="command-prefix">tbEditor_</span>CodeSelector1_Dropdown</code> | <kbd>Ctrl</kbd>+<kbd>1</kbd> | Opens box 1 above the code editor, which lists the components of the file. |
| <code><span class="command-prefix">tbEditor_</span>CodeSelector2_Dropdown</code> | <kbd>Ctrl</kbd>+<kbd>2</kbd> | Opens box 2 above the code editor, which lists the objects of the component. |
| <code><span class="command-prefix">tbEditor_</span>CodeSelector3_Dropdown</code> | <kbd>Ctrl</kbd>+<kbd>3</kbd> | Opens box 3 above the code editor, which lists the procedures or events. |
| <code><span class="command-prefix">tbEditor_</span>CommentSelection</code> | <kbd>Ctrl</kbd>+<kbd>K</kbd> | Turns the selected lines into comments. |
| <code><span class="command-prefix">tbEditor_</span>ConvertIndentationToSpaces</code> |  | Replaces the tabs that indent the document's lines with spaces. |
| <code><span class="command-prefix">tbEditor_</span>ConvertIndentationToTabs</code> |  | Replaces the spaces that indent the document's lines with tabs. |
| <code><span class="command-prefix">tbEditor_</span>CopyLineDown</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Down</kbd> | Copies the current line, or the selected lines, below themselves. |
| <code><span class="command-prefix">tbEditor_</span>CopyLineUp</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Up</kbd> | Copies the current line, or the selected lines, above themselves. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveBottom</code> | <kbd>Ctrl</kbd>+<kbd>End</kbd> | Moves the cursor to the end of the document. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveDown</code> | <kbd>Down</kbd> | Moves the cursor down one line. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveEndOfLine</code> | <kbd>End</kbd> | Moves the cursor to the end of the line. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveLeft</code> | <kbd>Left</kbd> | Moves the cursor one character to the left. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveLeftWord</code> | <kbd>Ctrl</kbd>+<kbd>Left</kbd> | Moves the cursor to the start of the previous word. |
| <code><span class="command-prefix">tbEditor_</span>CursorMovePageDown</code> | <kbd>Page Down</kbd> | Moves the cursor down by one page. |
| <code><span class="command-prefix">tbEditor_</span>CursorMovePageUp</code> | <kbd>Page Up</kbd> | Moves the cursor up by one page. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveRight</code> | <kbd>Right</kbd> | Moves the cursor one character to the right. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveRightWord</code> | <kbd>Ctrl</kbd>+<kbd>Right</kbd> | Moves the cursor to the start of the next word. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveStartOfLine</code> |  | Moves the cursor to the first column of the line. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveStartOfLineHome</code> | <kbd>Home</kbd> | Moves the cursor to the first non-blank character of the line, or to the first column if it is already there. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveTop</code> | <kbd>Ctrl</kbd>+<kbd>Home</kbd> | Moves the cursor to the start of the document. |
| <code><span class="command-prefix">tbEditor_</span>CursorMoveUp</code> | <kbd>Up</kbd> | Moves the cursor up one line. |
| <code><span class="command-prefix">tbEditor_</span>CursorRedo</code> |  | Redoes a cursor movement or selection change that Cursor Undo undid. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectBottom</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>End</kbd> | Extends the selection to the end of the document. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectDown</code> | <kbd>Shift</kbd>+<kbd>Down</kbd> | Extends the selection down one line. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectLeft</code> | <kbd>Shift</kbd>+<kbd>Left</kbd> | Extends the selection one character to the left. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectLeftWord</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Left</kbd> | Extends the selection to the start of the previous word. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectLineEnd</code> | <kbd>Shift</kbd>+<kbd>End</kbd> | Extends the selection to the end of the line. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectLineStart</code> |  | Extends the selection to the first column of the line. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectLineStartHome</code> | <kbd>Shift</kbd>+<kbd>Home</kbd> | Extends the selection to the first non-blank character of the line, or to the first column if it is already there. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectPageDown</code> | <kbd>Shift</kbd>+<kbd>Page Down</kbd> | Extends the selection down by one page. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectPageUp</code> | <kbd>Shift</kbd>+<kbd>Page Up</kbd> | Extends the selection up by one page. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectRight</code> | <kbd>Shift</kbd>+<kbd>Right</kbd> | Extends the selection one character to the right. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectRightWord</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> | Extends the selection to the start of the next word. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectTop</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Home</kbd> | Extends the selection to the start of the document. |
| <code><span class="command-prefix">tbEditor_</span>CursorSelectUp</code> | <kbd>Shift</kbd>+<kbd>Up</kbd> | Extends the selection up one line. |
| <code><span class="command-prefix">tbEditor_</span>CursorUndo</code> | <kbd>Ctrl</kbd>+<kbd>U</kbd> | Undoes the last cursor movement or selection change, without undoing any text change. |
| <code><span class="command-prefix">tbEditor_</span>DecreaseFontSize</code> | <kbd>Ctrl</kbd>+<kbd>-</kbd> | Makes the code editor's font one pixel smaller, down to a size of 8 pixels, and saves the size as the Code Editor Font Size option. |
| <code><span class="command-prefix">tbEditor_</span>DeleteLeft</code> | <kbd>Backspace</kbd>, <kbd>Shift</kbd>+<kbd>Backspace</kbd> | Deletes the character before the cursor, or the selection. |
| <code><span class="command-prefix">tbEditor_</span>DeleteLeftWord</code> | <kbd>Ctrl</kbd>+<kbd>Backspace</kbd> | Deletes the word before the cursor. |
| <code><span class="command-prefix">tbEditor_</span>DeleteLines</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Delete</kbd> | Deletes the current line, or the selected lines. |
| <code><span class="command-prefix">tbEditor_</span>DeleteRight</code> | <kbd>Delete</kbd> | Deletes the character after the cursor, or the selection. |
| <code><span class="command-prefix">tbEditor_</span>DeleteRightWord</code> | <kbd>Ctrl</kbd>+<kbd>Delete</kbd> | Deletes the word after the cursor. |
| <code><span class="command-prefix">tbEditor_</span>ExpandLineSelection</code> | <kbd>Ctrl</kbd>+<kbd>L</kbd> | Extends the selection to include the whole of the current line. |
| <code><span class="command-prefix">tbEditor_</span>ExpandSelection</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Right</kbd> | Widens the selection to the next larger syntactic block. |
| <code><span class="command-prefix">tbEditor_</span>Find</code> | <kbd>Ctrl</kbd>+<kbd>F</kbd> | Opens the Find and Replace panel, searching for the selected text, or the word at the cursor. |
| <code><span class="command-prefix">tbEditor_</span>FindReplace</code> | <kbd>Ctrl</kbd>+<kbd>H</kbd> | Opens the Find and Replace panel, as the Find command does. |
| <code><span class="command-prefix">tbEditor_</span>FindSelectedNext</code> | <kbd>Ctrl</kbd>+<kbd>F3</kbd> | Moves to the next occurrence of the selected text. |
| <code><span class="command-prefix">tbEditor_</span>FindSelectedPrev</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F3</kbd> | Moves to the previous occurrence of the selected text. |
| <code><span class="command-prefix">tbEditor_</span>FindWidget_Next</code> | <kbd>Alt</kbd>+<kbd>F3</kbd> | Moves to the next match of the current search. |
| <code><span class="command-prefix">tbEditor_</span>FindWidget_Prev</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F3</kbd> | Moves to the previous match of the current search. |
| <code><span class="command-prefix">tbEditor_</span>FindWidget_SelectAllMatches</code> | <kbd>Alt</kbd>+<kbd>A</kbd> | Selects every match of the current search in the editor. |
| <code><span class="command-prefix">tbEditor_</span>FocusPanel</code> |  | Moves the focus to the code editor. |
| <code><span class="command-prefix">tbEditor_</span>Fold</code> | <kbd>Ctrl</kbd>+<kbd>{</kbd> | Folds the block at the cursor. |
| <code><span class="command-prefix">tbEditor_</span>FoldAll</code> |  | Folds every block in the document. |
| <code><span class="command-prefix">tbEditor_</span>FoldProcedures</code> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Left</kbd> | Folds every procedure in the file except the one the cursor is in. |
| <code><span class="command-prefix">tbEditor_</span>FormatDocument</code> |  | Formats the whole document. |
| <code><span class="command-prefix">tbEditor_</span>FormatSelection</code> |  | Formats the selected code. |
| <code><span class="command-prefix">tbEditor_</span>GoToDefinition</code> | <kbd>Shift</kbd>+<kbd>F2</kbd>, <kbd>F12</kbd> | Goes to the definition of the symbol at the cursor. |
| <code><span class="command-prefix">tbEditor_</span>GotoLineColumn</code> |  | Opens the box for going to a line and column. |
| <code><span class="command-prefix">tbEditor_</span>HidePanel</code> |  | Closes the code editor panel. |
| <code><span class="command-prefix">tbEditor_</span>IncreaseFontSize</code> | <kbd>Ctrl</kbd>+<kbd>+</kbd> | Makes the code editor's font one pixel larger and saves the size as the Code Editor Font Size option. |
| <code><span class="command-prefix">tbEditor_</span>Indent</code> | <kbd>Tab</kbd> | Indents the line or the selected lines, or inserts a tab at the cursor. |
| <code><span class="command-prefix">tbEditor_</span>IndentLine</code> | <kbd>Ctrl</kbd>+<kbd>]</kbd> | Indents the selected lines. |
| <code><span class="command-prefix">tbEditor_</span>InsertAmpersand</code> | <kbd>&amp;</kbd> | Types an ampersand. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertBackslash</code> | <kbd>&#92;</kbd> | Types a backslash. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertBracketClose</code> |  | Types a closing parenthesis. |
| <code><span class="command-prefix">tbEditor_</span>InsertBracketOpen</code> |  | Types an opening parenthesis, or puts the selected text in parentheses. |
| <code><span class="command-prefix">tbEditor_</span>InsertColon</code> | <kbd>:</kbd> | Types a colon. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertComma</code> | <kbd>,</kbd> | Types a comma. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertEquals</code> | <kbd>=</kbd> | Types an equals sign. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertExclamation</code> | <kbd>!</kbd> | Types an exclamation mark. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertLineAbove</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> | Inserts an empty line above the cursor's line and moves the cursor to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertLineBelow</code> | <kbd>Ctrl</kbd>+<kbd>Enter</kbd> | Inserts an empty line below the cursor's line and moves the cursor to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertLineBreak</code> | <kbd>Enter</kbd> | Breaks the line at the cursor, as the Enter key does. This is bound to the key so that the IDE can do its own work on the new line. |
| <code><span class="command-prefix">tbEditor_</span>InsertMinus</code> | <kbd>-</kbd> | Types a minus sign. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertMultiply</code> | <kbd>&#42;</kbd> | Types an asterisk. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertPeriod</code> | <kbd>.</kbd> | Types a full stop. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertPlus</code> | <kbd>+</kbd> | Types a plus sign. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertSlash</code> | <kbd>/</kbd> | Types a slash. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>InsertSpace</code> | <kbd>Space</kbd>, <kbd>Shift</kbd>+<kbd>Space</kbd> | Types a space. The key is bound to a command so that the IDE can react to it. |
| <code><span class="command-prefix">tbEditor_</span>JumpToNextProblem</code> | <kbd>Alt</kbd>+<kbd>F8</kbd> | Moves the cursor to the next error or warning in the document. |
| <code><span class="command-prefix">tbEditor_</span>JumpToPrevProblem</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F8</kbd> | Moves the cursor to the previous error or warning in the document. |
| <code><span class="command-prefix">tbEditor_</span>LastPosition</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F2</kbd> | Returns to the most recently recorded position, at the start of its line, opening its file if needed. |
| <code><span class="command-prefix">tbEditor_</span>MoveLinesDown</code> | <kbd>Alt</kbd>+<kbd>Down</kbd> | Moves the current line, or the selected lines, down one line. |
| <code><span class="command-prefix">tbEditor_</span>MoveLinesUp</code> | <kbd>Alt</kbd>+<kbd>Up</kbd> | Moves the current line, or the selected lines, up one line. |
| <code><span class="command-prefix">tbEditor_</span>MoveToProcedureNext</code> | <kbd>Ctrl</kbd>+<kbd>Down</kbd> | Moves the cursor to the start of the next procedure. |
| <code><span class="command-prefix">tbEditor_</span>MoveToProcedurePrev</code> | <kbd>Ctrl</kbd>+<kbd>Up</kbd> | Moves the cursor to the start of the previous procedure. |
| <code><span class="command-prefix">tbEditor_</span>NextBookmark</code> |  | Moves the cursor to the next bookmark. |
| <code><span class="command-prefix">tbEditor_</span>OpenTabsDropDown</code> |  | Opens the list of open editor tabs. |
| <code><span class="command-prefix">tbEditor_</span>Outdent</code> | <kbd>Shift</kbd>+<kbd>Tab</kbd> | Outdents the line or the selected lines. |
| <code><span class="command-prefix">tbEditor_</span>OutdentLine</code> | <kbd>Ctrl</kbd>+<kbd>[</kbd> | Outdents the selected lines. |
| <code><span class="command-prefix">tbEditor_</span>PrevBookmark</code> | <kbd>Ctrl</kbd>+<kbd>M</kbd> | Moves the cursor to the previous bookmark. |
| <code><span class="command-prefix">tbEditor_</span>Redo</code> | <kbd>Ctrl</kbd>+<kbd>Y</kbd> | Redoes the last change that was undone in the current document. |
| <code><span class="command-prefix">tbEditor_</span>RenameSymbol</code> | <kbd>F2</kbd> | Renames the symbol at the cursor everywhere it is used. |
| <code><span class="command-prefix">tbEditor_</span>ReopenLastClosedTab</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> | Reopens the editor tab that was closed last. |
| <code><span class="command-prefix">tbEditor_</span>Save</code> |  | Never runs: saving a single document is turned off. Use the commands that save the project. |
| <code><span class="command-prefix">tbEditor_</span>ScrollTabLeft</code> |  | Scrolls the row of editor tabs to the left. The left tab button runs it. |
| <code><span class="command-prefix">tbEditor_</span>ScrollTabRight</code> |  | Scrolls the row of editor tabs to the right. The right tab button runs it. |
| <code><span class="command-prefix">tbEditor_</span>SelectAll</code> | <kbd>Ctrl</kbd>+<kbd>A</kbd> | Selects the whole document. |
| <code><span class="command-prefix">tbEditor_</span>SelectAllMatches</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> | Selects every occurrence of the word at the cursor, or of the selected text. |
| <code><span class="command-prefix">tbEditor_</span>ShowContextMenu</code> | <kbd>Shift</kbd>+<kbd>F10</kbd> | Opens the code editor's context menu at the top left of the editor. |
| <code><span class="command-prefix">tbEditor_</span>ShowMonacoCommandPalette</code> |  | Opens the command palette of the Monaco code editor. |
| <code><span class="command-prefix">tbEditor_</span>ShowPanel</code> |  | Shows the code editor panel. |
| <code><span class="command-prefix">tbEditor_</span>ShrinkSelection</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Left</kbd> | Narrows the selection to the next smaller syntactic block. |
| <code><span class="command-prefix">tbEditor_</span>SortLinesAscending</code> |  | Sorts the selected lines in ascending order. |
| <code><span class="command-prefix">tbEditor_</span>SortLinesDescending</code> |  | Sorts the selected lines in descending order. |
| <code><span class="command-prefix">tbEditor_</span>SwitchToCode</code> |  | Switches from a form designer to the code of the same file. |
| <code><span class="command-prefix">tbEditor_</span>SwitchToFormDesign</code> | <kbd>Shift</kbd>+<kbd>F7</kbd> | Switches from the code of a file to its form designer. |
| <code><span class="command-prefix">tbEditor_</span>SwitchToggleFormDesignCode</code> |  | Switches between the form designer and the code of the same file. |
| <code><span class="command-prefix">tbEditor_</span>ToggleAdvancedInfoOnHover</code> |  | Turns the Show Advanced Info On Hover option on or off. |
| <code><span class="command-prefix">tbEditor_</span>ToggleAutoPrettifyCode</code> |  | Turns the project's Auto Prettify option on or off. |
| <code><span class="command-prefix">tbEditor_</span>ToggleBlockComment</code> | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>A</kbd> | Wraps the selection in a block comment, or removes the block comment around it. |
| <code><span class="command-prefix">tbEditor_</span>ToggleBookmark</code> | <kbd>Ctrl</kbd>+<kbd>B</kbd> | Sets a bookmark on the cursor's line, or removes the one that is there. |
| <code><span class="command-prefix">tbEditor_</span>ToggleCodeFoldingAlways</code> |  | Turns on or off showing the code folding arrows all the time, not only when the pointer is over the margin. |
| <code><span class="command-prefix">tbEditor_</span>ToggleCodeFoldingVisibility</code> |  | Shows or hides the code folding arrows. |
| <code><span class="command-prefix">tbEditor_</span>ToggleCodeHintsAlwaysVisible</code> |  | Turns the Code Hints Always Visible option on or off. |
| <code><span class="command-prefix">tbEditor_</span>ToggleCodeLensShowProc</code> |  | Turns the project's Show CodeLens Run Procedure option on or off. |
| <code><span class="command-prefix">tbEditor_</span>ToggleLineComment</code> | <kbd>Ctrl</kbd>+<kbd>/</kbd> | Comments the selected lines, or uncomments them if they are all comments already. |
| <code><span class="command-prefix">tbEditor_</span>ToggleMiniMapVisibility</code> |  | Shows or hides the minimap. |
| <code><span class="command-prefix">tbEditor_</span>ToggleShowCodeHints</code> |  | Shows or hides the inline code hints. |
| <code><span class="command-prefix">tbEditor_</span>ToggleShowIndentGuides</code> |  | Shows or hides the indent guides. |
| <code><span class="command-prefix">tbEditor_</span>ToggleShowLineNumbers</code> |  | Shows or hides the line numbers. |
| <code><span class="command-prefix">tbEditor_</span>ToggleShowSingleRowOfTabs</code> |  | Turns the Show Single Row Of Tabs option on or off. |
| <code><span class="command-prefix">tbEditor_</span>ToggleStickyScroll</code> |  | Turns the Sticky Scroll option on or off. |
| <code><span class="command-prefix">tbEditor_</span>ToggleWordWrap</code> | <kbd>Alt</kbd>+<kbd>Z</kbd> | Turns word wrap on or off in the code editor. |
| <code><span class="command-prefix">tbEditor_</span>TransformToLowercase</code> |  | Changes the selected text to lower case. |
| <code><span class="command-prefix">tbEditor_</span>TransformToSnakecase</code> |  | Changes the selected text to snake case. |
| <code><span class="command-prefix">tbEditor_</span>TransformToTitlecase</code> |  | Changes the selected text to title case. |
| <code><span class="command-prefix">tbEditor_</span>TransformToUppercase</code> |  | Changes the selected text to upper case. |
| <code><span class="command-prefix">tbEditor_</span>TurnShowCodeHintsOff</code> | <kbd>Ctrl</kbd>, on release | Hides the inline code hints. The Ctrl key runs it when it is released. |
| <code><span class="command-prefix">tbEditor_</span>TurnShowCodeHintsOn</code> | <kbd>Ctrl</kbd> | Shows the inline code hints. The Ctrl key runs it when it goes down. |
| <code><span class="command-prefix">tbEditor_</span>TurnWordWrapOff</code> |  | Turns word wrap off in the code editor. |
| <code><span class="command-prefix">tbEditor_</span>TurnWordWrapOn</code> |  | Turns word wrap on in the code editor. |
| <code><span class="command-prefix">tbEditor_</span>UncommentSelection</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> | Removes the comment marker from the selected lines. |
| <code><span class="command-prefix">tbEditor_</span>Undo</code> | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undoes the last change in the current document. |
| <code><span class="command-prefix">tbEditor_</span>Unfold</code> | <kbd>Ctrl</kbd>+<kbd>}</kbd> | Unfolds the block at the cursor. |
| <code><span class="command-prefix">tbEditor_</span>UnfoldAll</code> |  | Unfolds every block in the document. |
| <code><span class="command-prefix">tbEditor_</span>UnfoldProcedures</code> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Right</kbd> | Unfolds every procedure in the file. |

## `tbFileSystem_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbFileSystem_</span>AddClassCLS</code> | Adds a class in a .cls file to the project, with a name box for its name. |
| <code><span class="command-prefix">tbFileSystem_</span>AddClassTWIN</code> | Adds a class in a .twin file to the project, with a name box for its name. |
| <code><span class="command-prefix">tbFileSystem_</span>AddCustomControlsForm</code> | Adds a CustomControls form to the project, with a name box for its name. If the project does not reference the CustomControls package, asks to add it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddFolder</code> | Adds a folder to the project, with a name box for its name. |
| <code><span class="command-prefix">tbFileSystem_</span>AddModuleBAS</code> | Adds a module in a .bas file to the project, with a name box for its name. |
| <code><span class="command-prefix">tbFileSystem_</span>AddModuleTWIN</code> | Adds a module in a .twin file to the project, with a name box for its name. |
| <code><span class="command-prefix">tbFileSystem_</span>AddOtherFile</code> | Adds a file of any other type to the project, with a name box for its name. |
| <code><span class="command-prefix">tbFileSystem_</span>AddResourceMessageTable</code> | Adds a message table to the project's resources and opens it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddResourceStringTable</code> | Adds a string table to the project's resources and opens it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddResourceVisualStylesManifest</code> | Adds the Visual Styles manifest to the project's resources and opens it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddWindowsForm</code> | Adds a Windows form to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddWindowsMDIForm</code> | Adds a Windows MDI form to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddWindowsPropertyPage</code> | Adds a Windows property page to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddWindowsReport</code> | Adds a Windows report to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| <code><span class="command-prefix">tbFileSystem_</span>AddWindowsUserControl</code> | Adds a Windows user control to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| <code><span class="command-prefix">tbFileSystem_</span>ImportFile</code> | Opens the dialog for choosing files to import into the project. |

## `tbFindReplace_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbFindReplace_</span>Cancel</code> | <kbd>Esc</kbd> | Closes the Find and Replace panel, or hides it if it is floating. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusCurrentModule</code> | <kbd>Alt</kbd>+<kbd>M</kbd> | Chooses the Current Module scope in the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusCurrentProcedure</code> | <kbd>Alt</kbd>+<kbd>P</kbd> | Chooses the Current Procedure scope in the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusCurrentProject</code> | <kbd>Alt</kbd>+<kbd>C</kbd> | Chooses the Current Project scope in the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusDirection</code> | <kbd>Alt</kbd>+<kbd>D</kbd> | Moves the focus to the Direction box of the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusFindWhat</code> | <kbd>Alt</kbd>+<kbd>F</kbd> | Moves the focus to the Find What box of the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusMatchCaseToggle</code> | <kbd>Alt</kbd>+<kbd>S</kbd> | Turns the Match Case option of the Find and Replace panel on or off. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusNext</code> | <kbd>Alt</kbd>+<kbd>N</kbd> | Finds the next match in the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusPanel</code> |  | Moves the focus to the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusReplaceWith</code> | <kbd>Alt</kbd>+<kbd>W</kbd> | Moves the focus to the Replace With box of the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusUsePatternMatchingToggle</code> | <kbd>Alt</kbd>+<kbd>U</kbd> | Turns the Use Pattern Matching option of the Find and Replace panel on or off. |
| <code><span class="command-prefix">tbFindReplace_</span>FocusWholeWordOnlyToggle</code> | <kbd>Alt</kbd>+<kbd>O</kbd> | Turns the Whole Word Only option of the Find and Replace panel on or off. |
| <code><span class="command-prefix">tbFindReplace_</span>HidePanel</code> |  | Closes the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>Next</code> | <kbd>F3</kbd> | Finds the next match in the Find and Replace panel, or in the editor's quick find box when only that is showing. |
| <code><span class="command-prefix">tbFindReplace_</span>Prev</code> | <kbd>Shift</kbd>+<kbd>F3</kbd> | Finds the previous match in the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>ReplaceAll</code> | <kbd>Alt</kbd>+<kbd>A</kbd> | Replaces every match in the scope chosen in the Find and Replace panel. |
| <code><span class="command-prefix">tbFindReplace_</span>ReplaceNext</code> | <kbd>Alt</kbd>+<kbd>R</kbd> | Replaces the current match in the Find and Replace panel and finds the next. |
| <code><span class="command-prefix">tbFindReplace_</span>ShowPanel</code> |  | Shows the Find and Replace panel. |

## `tbFindWidget_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbFindWidget_</span>FindNext</code> | <kbd>Enter</kbd> | In the quick find box, moves to the next match. |
| <code><span class="command-prefix">tbFindWidget_</span>FindNextAlways</code> |  | In the quick find box, moves to the next match. It has no default key. |
| <code><span class="command-prefix">tbFindWidget_</span>FindNextInSelection</code> | <kbd>Ctrl</kbd>+<kbd>F3</kbd> | In the quick find box, moves to the next occurrence of the selected text. |
| <code><span class="command-prefix">tbFindWidget_</span>FindPrev</code> |  | In the quick find box, moves to the previous match. It has no default key. |
| <code><span class="command-prefix">tbFindWidget_</span>FindPrevInSelection</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F3</kbd> | In the quick find box, moves to the previous occurrence of the selected text. |
| <code><span class="command-prefix">tbFindWidget_</span>FindPrevious</code> | <kbd>Shift</kbd>+<kbd>Enter</kbd> | Has the default key Shift+Enter, but the IDE has no command of this name. The command that moves to the previous match in the quick find box is tbFindWidget_FindPrev. |
| <code><span class="command-prefix">tbFindWidget_</span>Hide</code> | <kbd>Esc</kbd> | Closes the editor's quick find box. |
| <code><span class="command-prefix">tbFindWidget_</span>HistoryCycleNext</code> | <kbd>Down</kbd> | In the quick find box, shows the next entry of the search history. |
| <code><span class="command-prefix">tbFindWidget_</span>HistoryCyclePrevious</code> | <kbd>Up</kbd> | In the quick find box, shows the previous entry of the search history. |
| <code><span class="command-prefix">tbFindWidget_</span>ShowFind</code> | <kbd>Alt</kbd>+<kbd>F</kbd> | Opens the editor's quick find box. |
| <code><span class="command-prefix">tbFindWidget_</span>ShowReplace</code> | <kbd>Alt</kbd>+<kbd>H</kbd> | Opens the editor's quick find and replace box. |

## `tbFormDesginer_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbFormDesginer_</span>DecreaseSpacingHorizontal</code> | Narrows the horizontal gaps between the selected controls by one grid step. |
| <code><span class="command-prefix">tbFormDesginer_</span>DecreaseSpacingVertical</code> | Narrows the vertical gaps between the selected controls by one grid step. |
| <code><span class="command-prefix">tbFormDesginer_</span>IncreaseSpacingHorizontal</code> | Widens the horizontal gaps between the selected controls by one grid step. |
| <code><span class="command-prefix">tbFormDesginer_</span>IncreaseSpacingVertical</code> | Widens the vertical gaps between the selected controls by one grid step. |
| <code><span class="command-prefix">tbFormDesginer_</span>MakeEqualSpacingHorizontal</code> | Spaces three or more selected controls evenly from left to right. |
| <code><span class="command-prefix">tbFormDesginer_</span>MakeEqualSpacingVertical</code> | Spaces three or more selected controls evenly from top to bottom. |
| <code><span class="command-prefix">tbFormDesginer_</span>RemoveSpacingHorizontal</code> | Removes the horizontal gaps between the selected controls. |
| <code><span class="command-prefix">tbFormDesginer_</span>RemoveSpacingVertical</code> | Removes the vertical gaps between the selected controls. |

## `tbFormDesigner_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbFormDesigner_</span>AlignSelectedControlsBottom</code> | <kbd>Alt</kbd>+<kbd>Down</kbd> | Aligns the bottom edges of the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>AlignSelectedControlsCenterHorizontal</code> |  | Aligns the horizontal centres of the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>AlignSelectedControlsCenterVertical</code> |  | Aligns the vertical centres of the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>AlignSelectedControlsLeft</code> | <kbd>Alt</kbd>+<kbd>Left</kbd> | Aligns the left edges of the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>AlignSelectedControlsRight</code> | <kbd>Alt</kbd>+<kbd>Right</kbd> | Aligns the right edges of the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>AlignSelectedControlsToGrid</code> |  | Moves the selected controls to the nearest grid points. |
| <code><span class="command-prefix">tbFormDesigner_</span>AlignSelectedControlsTop</code> | <kbd>Alt</kbd>+<kbd>Up</kbd> | Aligns the top edges of the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>BringControlToFront</code> |  | Brings the selected controls to the front. |
| <code><span class="command-prefix">tbFormDesigner_</span>CenterSelectedGroupInContainerHorizontal</code> |  | Centres the selected controls as a group, from left to right, in their container. |
| <code><span class="command-prefix">tbFormDesigner_</span>CenterSelectedGroupInContainerVertical</code> |  | Centres the selected controls as a group, from top to bottom, in their container. |
| <code><span class="command-prefix">tbFormDesigner_</span>ClipboardCopy</code> | <kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> | Copies the selected controls to the clipboard. |
| <code><span class="command-prefix">tbFormDesigner_</span>ClipboardCut</code> | <kbd>Ctrl</kbd>+<kbd>X</kbd>, <kbd>Shift</kbd>+<kbd>Delete</kbd> | Cuts the selected controls to the clipboard. |
| <code><span class="command-prefix">tbFormDesigner_</span>ClipboardPaste</code> | <kbd>Ctrl</kbd>+<kbd>V</kbd> | Pastes the controls on the clipboard into the form designer. |
| <code><span class="command-prefix">tbFormDesigner_</span>ClipboardPasteControlArray</code> |  | Pastes the controls on the clipboard with their names kept, so that they join the control arrays of the controls with those names. |
| <code><span class="command-prefix">tbFormDesigner_</span>DeleteSelectedControls</code> | <kbd>Delete</kbd> | Deletes the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>DuplicateControlsIntoControlArray</code> |  | Duplicates the selected controls as members of control arrays. |
| <code><span class="command-prefix">tbFormDesigner_</span>DuplicateControlsWithNewNames</code> |  | Duplicates the selected controls, giving each copy a new name. |
| <code><span class="command-prefix">tbFormDesigner_</span>LaunchPreview</code> |  | Runs a preview of the form being designed. |
| <code><span class="command-prefix">tbFormDesigner_</span>LockAllControls</code> |  | Locks every control on the form. |
| <code><span class="command-prefix">tbFormDesigner_</span>LockSelectedControls</code> |  | Locks the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorCopy</code> |  | In the menu editor, copies the selected menu item to the clipboard. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorCut</code> |  | In the menu editor, cuts the selected menu item to the clipboard. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorDelete</code> | <kbd>Delete</kbd> | In the menu editor, deletes the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorInsertAbove</code> |  | In the menu editor, inserts a new item above the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorInsertBelow</code> |  | In the menu editor, inserts a new item below the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorInsertLeft</code> |  | In the menu editor, inserts a new menu to the left of the selected top-level menu. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorInsertRight</code> |  | In the menu editor, inserts a new menu to the right of the selected top-level menu. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorInsertSeperatorAfter</code> |  | In the menu editor, inserts a separator below the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorInsertSeperatorBefore</code> |  | In the menu editor, inserts a separator above the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorMoveDown</code> | <kbd>Ctrl</kbd>+<kbd>Down</kbd> | In the menu editor, moves the selected menu item down one place. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorMoveLeft</code> | <kbd>Ctrl</kbd>+<kbd>Left</kbd> | In the menu editor, moves the selected top-level menu one place to the left. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorMoveRight</code> | <kbd>Ctrl</kbd>+<kbd>Right</kbd> | In the menu editor, moves the selected top-level menu one place to the right. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorMoveUp</code> | <kbd>Ctrl</kbd>+<kbd>Up</kbd> | In the menu editor, moves the selected menu item up one place. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorPasteAfter</code> |  | In the menu editor, pastes the clipboard after the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorPasteBefore</code> |  | In the menu editor, pastes the clipboard before the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorPasteInto</code> |  | In the menu editor, pastes the clipboard into the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorRename</code> | <kbd>F2</kbd> | In the menu editor, renames the selected menu item. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorToggleChecked</code> | <kbd>Space</kbd> | In the menu editor, turns the Checked property of the selected menu item on or off. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorToggleEnabled</code> |  | In the menu editor, turns the Enabled property of the selected menu item on or off. |
| <code><span class="command-prefix">tbFormDesigner_</span>MenuEditorToggleVisible</code> |  | In the menu editor, turns the Visible property of the selected menu item on or off. |
| <code><span class="command-prefix">tbFormDesigner_</span>MoveSelectedControlsDown</code> | <kbd>Down</kbd> | Moves the selected controls down by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>MoveSelectedControlsLeft</code> | <kbd>Left</kbd> | Moves the selected controls left by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>MoveSelectedControlsRight</code> | <kbd>Right</kbd> | Moves the selected controls right by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>MoveSelectedControlsUp</code> | <kbd>Up</kbd> | Moves the selected controls up by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>Redo</code> | <kbd>Ctrl</kbd>+<kbd>Y</kbd> | Redoes the last change that was undone in the form designer. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsNarrower</code> | <kbd>Shift</kbd>+<kbd>Left</kbd> | Makes the selected controls narrower by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsNarrowest</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Left</kbd> | Makes the selected controls as narrow as the narrowest of them. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsShorter</code> | <kbd>Shift</kbd>+<kbd>Up</kbd> | Makes the selected controls shorter by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsShortest</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Up</kbd> | Makes the selected controls as short as the shortest of them. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsTaller</code> | <kbd>Shift</kbd>+<kbd>Down</kbd> | Makes the selected controls taller by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsTallest</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Down</kbd> | Makes the selected controls as tall as the tallest of them. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsWider</code> | <kbd>Shift</kbd>+<kbd>Right</kbd> | Makes the selected controls wider by one grid step, or one pixel when the grid is off. |
| <code><span class="command-prefix">tbFormDesigner_</span>ResizeSelectedControlsWidest</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> | Makes the selected controls as wide as the widest of them. |
| <code><span class="command-prefix">tbFormDesigner_</span>SelectAllControls</code> | <kbd>Ctrl</kbd>+<kbd>A</kbd> | Selects every control on the form. |
| <code><span class="command-prefix">tbFormDesigner_</span>SelectParentOfSelectedControl</code> | <kbd>Esc</kbd> | With a control selected, selects its container, or the form. |
| <code><span class="command-prefix">tbFormDesigner_</span>SelectToolboxPointer</code> | <kbd>Esc</kbd> | With no control selected, returns to the pointer tool in the Toolbox. |
| <code><span class="command-prefix">tbFormDesigner_</span>SendControlToBack</code> |  | Sends the selected controls to the back. |
| <code><span class="command-prefix">tbFormDesigner_</span>ShowSelectedControlActiveXPropertyPage</code> |  | Opens the property page of the selected ActiveX control. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleAlignControlsToGrid</code> |  | Turns on or off snapping controls to the grid. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleControlOutlines</code> |  | Shows or hides the outlines of the controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleGridIndicators</code> |  | Shows or hides the grid in the form designer. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleInPlaceEditingToolbar</code> |  | Shows or hides the small in-place editing toolbar below a selected control. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleLockAllControls</code> |  | Locks every control on the form that is unlocked, and unlocks each one that is locked. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleLockSelectedControls</code> |  | Locks each selected control that is unlocked, and unlocks each one that is locked. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleMultiColouredGrabbers</code> |  | Turns the multi-coloured selection handles on or off. |
| <code><span class="command-prefix">tbFormDesigner_</span>ToggleShowTabIndex</code> |  | Shows or hides the tab index of each control. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnAlignControlsToGridOff</code> |  | Turns off snapping controls to the grid. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnAlignControlsToGridOn</code> |  | Turns on snapping controls to the grid. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnControlOutlinesOff</code> |  | Hides the outlines of the controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnControlOutlinesOn</code> |  | Shows the outlines of the controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnGridIndicatorsOff</code> |  | Hides the grid in the form designer. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnGridIndicatorsOn</code> |  | Shows the grid in the form designer. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnInPlaceEditingToolbarOff</code> |  | Hides the small in-place editing toolbar below a selected control. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnInPlaceEditingToolbarOn</code> |  | Shows the small in-place editing toolbar below a selected control. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnShowTabIndexOff</code> | <kbd>Ctrl</kbd>, on release | Hides the tab index of each control. The Ctrl key runs it when it is released. |
| <code><span class="command-prefix">tbFormDesigner_</span>TurnShowTabIndexOn</code> | <kbd>Ctrl</kbd> | Shows the tab index of each control. The Ctrl key runs it when it goes down. |
| <code><span class="command-prefix">tbFormDesigner_</span>Undo</code> | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undoes the last change in the form designer. |
| <code><span class="command-prefix">tbFormDesigner_</span>UnlockAllControls</code> |  | Unlocks every control on the form. |
| <code><span class="command-prefix">tbFormDesigner_</span>UnlockSelectedControls</code> |  | Unlocks the selected controls. |
| <code><span class="command-prefix">tbFormDesigner_</span>ZoomDecrease</code> |  | Moves to the next smaller zoom in the form designer's zoom list. |
| <code><span class="command-prefix">tbFormDesigner_</span>ZoomDropDown</code> |  | Opens the zoom list of the form designer. |
| <code><span class="command-prefix">tbFormDesigner_</span>ZoomIncrease</code> |  | Moves to the next larger zoom in the form designer's zoom list. |

## `tbHelp_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbHelp_</span>AskErrorReporting</code> |  | Opens the dialog that asks whether the IDE may report its errors automatically. |
| <code><span class="command-prefix">tbHelp_</span>EnterLicenceKey</code> |  | Opens the dialog for entering a licence key. |
| <code><span class="command-prefix">tbHelp_</span>OpenDiscordWebsite</code> |  | Opens the twinBASIC Discord invitation in the default web browser. |
| <code><span class="command-prefix">tbHelp_</span>OpenGithubWebsite</code> |  | Opens the twinBASIC GitHub repository in the default web browser. |
| <code><span class="command-prefix">tbHelp_</span>OpenKofiWebsite</code> |  | Opens the twinBASIC Ko-fi page in the default web browser. |
| <code><span class="command-prefix">tbHelp_</span>OpenTwitterWebsite</code> |  | Opens the twinBASIC author's Twitter page in the default web browser. |
| <code><span class="command-prefix">tbHelp_</span>PurchaseALicence</code> |  | Opens the twinBASIC licence purchase page in the default web browser. |
| <code><span class="command-prefix">tbHelp_</span>ShowAboutWindow</code> |  | Opens the About window. |
| <code><span class="command-prefix">tbHelp_</span>ShowLicenceAgreement</code> |  | Shows the licence agreement. |
| <code><span class="command-prefix">tbHelp_</span>ToggleCompilerTraceMode</code> |  | Turns the compiler's trace mode on or off and restarts the compiler. |
| <code><span class="command-prefix">tbHelp_</span>ToggleExpandSignatureHelp</code> | <kbd>F1</kbd> | Expands or collapses the signature help that is showing. |

## `tbHistory_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbHistory_</span>FocusPanel</code> | Moves the focus to the History panel. |
| <code><span class="command-prefix">tbHistory_</span>HidePanel</code> | Closes the History panel. |
| <code><span class="command-prefix">tbHistory_</span>ShowPanel</code> | Shows the History panel. |

## `tbIde_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbIde_</span>DecreaseFontSize</code> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>-</kbd> | Makes the IDE's font one pixel smaller, down to a size of 8 pixels. |
| <code><span class="command-prefix">tbIde_</span>IncreaseFontSize</code> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>+</kbd> | Makes the IDE's font one pixel larger. |
| <code><span class="command-prefix">tbIde_</span>ShowIDEOptions</code> |  | Opens the IDE Options dialog. |

## `tbIdeDevTools_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbIdeDevTools_</span>Show</code> | Opens the developer tools of the IDE's web view. |

## `tbIdeWindow_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbIdeWindow_</span>Close</code> | <kbd>Alt</kbd>+<kbd>F4</kbd> | Closes the IDE window. |
| <code><span class="command-prefix">tbIdeWindow_</span>MaximizeOrRestore</code> |  | Maximises the IDE window, or restores it when it is already maximised. |
| <code><span class="command-prefix">tbIdeWindow_</span>Minimize</code> |  | Minimises the IDE window. |

## `tbIntellisense_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbIntellisense_</span>AcceptSelectedEntry</code> | <kbd>Tab</kbd>; <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>,</kbd>, <kbd>.</kbd>, <kbd>+</kbd>, <kbd>-</kbd>, <kbd>&amp;</kbd>, <kbd>(</kbd>, <kbd>)</kbd>, <kbd>!</kbd>, <kbd>&#42;</kbd>, <kbd>&#92;</kbd>, <kbd>/</kbd>, <kbd>:</kbd>, <kbd>=</kbd>, on release | Inserts the selected entry of the completion list, then types the key that was pressed. |
| <code><span class="command-prefix">tbIntellisense_</span>AcceptSelectedOrFirstEntry</code> | <kbd>Tab</kbd>, <kbd>Space</kbd> | Inserts the selected entry of the completion list, or the first entry if none is selected. |
| <code><span class="command-prefix">tbIntellisense_</span>Cancel</code> | <kbd>Esc</kbd>, <kbd>Left</kbd>, <kbd>Right</kbd>, <kbd>Backspace</kbd> | Closes the completion list and the signature help. |
| <code><span class="command-prefix">tbIntellisense_</span>SelectNext</code> | <kbd>Down</kbd> | Selects the next entry of the open completion list. |
| <code><span class="command-prefix">tbIntellisense_</span>SelectPrevious</code> | <kbd>Up</kbd> | Selects the previous entry of the open completion list. |
| <code><span class="command-prefix">tbIntellisense_</span>ShowAfterKeyPress</code> | every key its `{ALLEXCEPT}` list does not name, on release | Opens the completion list after any key that is not one of the keys its binding excludes, according to the IntelliSense mode option. |
| <code><span class="command-prefix">tbIntellisense_</span>ShowNow</code> | <kbd>Ctrl</kbd>+<kbd>Space</kbd> | Opens the completion list at the cursor. |

## `tbKeyboardShortcuts_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ShowManageKeyboardShortcuts</code> | Opens the dialog for managing keyboard shortcut groups. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ShowWarningCannotDisableBuilinGroup</code> | Shows a message that the built-in keyboard shortcut group cannot be turned off, and says to override a command in a group of your own instead. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom1</code> | Turns on or off the keyboard shortcut group that is number 1 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom10</code> | Turns on or off the keyboard shortcut group that is number 10 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom2</code> | Turns on or off the keyboard shortcut group that is number 2 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom3</code> | Turns on or off the keyboard shortcut group that is number 3 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom4</code> | Turns on or off the keyboard shortcut group that is number 4 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom5</code> | Turns on or off the keyboard shortcut group that is number 5 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom6</code> | Turns on or off the keyboard shortcut group that is number 6 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom7</code> | Turns on or off the keyboard shortcut group that is number 7 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom8</code> | Turns on or off the keyboard shortcut group that is number 8 in the list of your own groups, if there is one. |
| <code><span class="command-prefix">tbKeyboardShortcuts_</span>ToggleActiveKeyboardShortcutGroupCustom9</code> | Turns on or off the keyboard shortcut group that is number 9 in the list of your own groups, if there is one. |

## `tbMenu_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbMenu_</span>Cancel</code> | <kbd>Esc</kbd> | Closes the open menu. |
| <code><span class="command-prefix">tbMenu_</span>ExecuteFocusedEntry</code> | <kbd>Enter</kbd> | While a menu is open, runs the focused entry. |
| <code><span class="command-prefix">tbMenu_</span>FocusAdjacentDown</code> | <kbd>Down</kbd> | While a menu is open, moves the focus to the entry below. |
| <code><span class="command-prefix">tbMenu_</span>FocusAdjacentLeft</code> | <kbd>Left</kbd> | While a menu is open, closes the open submenu, or moves to the menu on the left. |
| <code><span class="command-prefix">tbMenu_</span>FocusAdjacentRight</code> | <kbd>Right</kbd> | While a menu is open, opens the submenu of the focused entry, or moves to the menu on the right. |
| <code><span class="command-prefix">tbMenu_</span>FocusAdjacentUp</code> | <kbd>Up</kbd> | While a menu is open, moves the focus to the entry above. |
| <code><span class="command-prefix">tbMenu_</span>ShowAddinsMenu</code> |  | Opens the Addins menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowDebugMenu</code> |  | Opens the Debug menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowEditMenu</code> |  | Opens the Edit menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowFileMenu</code> |  | Opens the File menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowFormatMenu</code> |  | Opens the Format menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowHelpMenu</code> |  | Opens the Help menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowProjectMenu</code> |  | Opens the Project menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowRunMenu</code> |  | Opens the Run menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowToolsMenu</code> |  | Opens the Tools menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowViewMenu</code> |  | Opens the View menu. |
| <code><span class="command-prefix">tbMenu_</span>ShowWindowMenu</code> |  | Opens the Window menu. |

## `tbMisc_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbMisc_</span>AltKeyStateDown</code> | <kbd>Alt</kbd> | Records that the Alt key is held down, so that releasing it alone can open the File menu. The IDE uses it internally. |
| <code><span class="command-prefix">tbMisc_</span>AltKeyStateUp</code> | <kbd>Alt</kbd>, on release | Opens the File menu when the Alt key is released without another key having been pressed, or closes a menu that is open. |
| <code><span class="command-prefix">tbMisc_</span>PreventDefaultKeyBehaviour</code> | <kbd>Ctrl</kbd>+<kbd>A</kbd>, <kbd>Tab</kbd> | Stops the web view's own handling of the key. The IDE binds it to keys whose default action it does not want. |
| <code><span class="command-prefix">tbMisc_</span>SaveProjectMetaStateInTwinproj</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>M</kbd> | Saves the project's meta state to the project file and shows a message box. |
| <code><span class="command-prefix">tbMisc_</span>ShiftKeyStateDown</code> | <kbd>Shift</kbd> | Records that the Shift key is held down. The IDE uses it internally. |
| <code><span class="command-prefix">tbMisc_</span>ShiftKeyStateUp</code> | <kbd>Shift</kbd>, on release | Records that the Shift key has been released. The IDE uses it internally. |
| <code><span class="command-prefix">tbMisc_</span>ShowTestMessage</code> |  | Shows a test message box. |

## `tbOpenEditors_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbOpenEditors_</span>FocusPanel</code> | Moves the focus to the Open Editors panel. |
| <code><span class="command-prefix">tbOpenEditors_</span>HidePanel</code> | Closes the Open Editors panel. |
| <code><span class="command-prefix">tbOpenEditors_</span>ShowPanel</code> | Shows the Open Editors panel. |

## `tbOutline_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbOutline_</span>FocusPanel</code> | Moves the focus to the Outline panel. |
| <code><span class="command-prefix">tbOutline_</span>HidePanel</code> | Closes the Outline panel. |
| <code><span class="command-prefix">tbOutline_</span>ShowPanel</code> | Shows the Outline panel. |

## `tbPackagePublishing_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbPackagePublishing_</span>FocusPanel</code> | Moves the focus to the Package Publishing panel. |
| <code><span class="command-prefix">tbPackagePublishing_</span>HidePanel</code> | Closes the Package Publishing panel. |
| <code><span class="command-prefix">tbPackagePublishing_</span>ShowPanel</code> | Shows the Package Publishing panel. |

## `tbPanels_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbPanels_</span>SaveCurrentPanelLayoutAs</code> |  | Asks for a name and saves the current panel layout under it. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom1</code> |  | Switches to the panel layout that is number 1 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom10</code> |  | Switches to the panel layout that is number 10 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom2</code> |  | Switches to the panel layout that is number 2 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom3</code> |  | Switches to the panel layout that is number 3 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom4</code> |  | Switches to the panel layout that is number 4 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom5</code> |  | Switches to the panel layout that is number 5 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom6</code> |  | Switches to the panel layout that is number 6 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom7</code> |  | Switches to the panel layout that is number 7 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom8</code> |  | Switches to the panel layout that is number 8 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutCustom9</code> |  | Switches to the panel layout that is number 9 in the list of saved layouts, if there is one. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutDefault</code> | <kbd>Ctrl</kbd>+<kbd>#</kbd> | Switches to the default built-in panel layout. |
| <code><span class="command-prefix">tbPanels_</span>SetActiveLayoutFullScreen</code> |  | Switches to the full screen editor panel layout. |
| <code><span class="command-prefix">tbPanels_</span>ShowManagePanelLayouts</code> |  | Opens the dialog for managing the saved panel layouts. |
| <code><span class="command-prefix">tbPanels_</span>TogglePreventDockedMove</code> |  | Turns on or off the option that stops docked panels from being moved. |
| <code><span class="command-prefix">tbPanels_</span>TogglePreventDockedResize</code> |  | Turns on or off the option that stops docked panels from being resized. |
| <code><span class="command-prefix">tbPanels_</span>TogglePreventDockedTearout</code> |  | Turns on or off the option that stops docked panels from being pulled out of their dock. |
| <code><span class="command-prefix">tbPanels_</span>TogglePreventFloatingMove</code> |  | Turns on or off the option that stops floating panels from being moved. |
| <code><span class="command-prefix">tbPanels_</span>TogglePreventFloatingResize</code> |  | Turns on or off the option that stops floating panels from being resized. |

## `tbProblems_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbProblems_</span>ClipboardCopyAll</code> | Copies everything in the Problems panel to the clipboard as a compilation error report. |
| <code><span class="command-prefix">tbProblems_</span>ClipboardCopyAllErrors</code> | Copies the errors of the Problems panel to the clipboard as a compilation error report. |
| <code><span class="command-prefix">tbProblems_</span>CollapseAll</code> | Collapses every entry in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>ExpandAll</code> | Expands every entry in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>FocusPanel</code> | Moves the focus to the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>HidePanel</code> | Closes the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>ShowPanel</code> | Shows the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>ToggleShowErrors</code> | Shows or hides the errors in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>ToggleShowHints</code> | Shows or hides the hints in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>ToggleShowInfos</code> | Shows or hides the information messages in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>ToggleShowWarnings</code> | Shows or hides the warnings in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowErrorsOff</code> | Hides the errors in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowErrorsOn</code> | Shows the errors in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowHintsOff</code> | Hides the hints in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowHintsOn</code> | Shows the hints in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowInfosOff</code> | Hides the information messages in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowInfosOn</code> | Shows the information messages in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowWarningsOff</code> | Hides the warnings in the Problems panel. |
| <code><span class="command-prefix">tbProblems_</span>TurnShowWarningsOn</code> | Shows the warnings in the Problems panel. |

## `tbProject_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbProject_</span>AddCustomControlsPackage</code> |  | Adds the CustomControls package to the project. |
| <code><span class="command-prefix">tbProject_</span>AddWinNativeFormsPackage</code> |  | Adds the WinNativeForms package to the project. |
| <code><span class="command-prefix">tbProject_</span>Close</code> |  | Closes the project. |
| <code><span class="command-prefix">tbProject_</span>Export</code> | <kbd>Ctrl</kbd>+<kbd>E</kbd> | Exports the project's sources to a folder. |
| <code><span class="command-prefix">tbProject_</span>FindInFiles</code> | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | Opens the Find and Replace panel with the Current Project scope chosen. |
| <code><span class="command-prefix">tbProject_</span>New</code> | <kbd>Ctrl</kbd>+<kbd>N</kbd> | Opens the front page on the list of templates for a new project. |
| <code><span class="command-prefix">tbProject_</span>Open</code> | <kbd>Ctrl</kbd>+<kbd>O</kbd> | Opens the dialog for choosing a project to open. |
| <code><span class="command-prefix">tbProject_</span>OpenBuildFolder</code> |  | Opens the project's build folder in Windows Explorer. A project that has not been saved gets a message instead. |
| <code><span class="command-prefix">tbProject_</span>OpenProjectFolder</code> |  | Opens the folder that holds the project file in Windows Explorer. A project that has not been saved gets a message instead. |
| <code><span class="command-prefix">tbProject_</span>OpenRecent</code> |  | Opens the front page on the list of recent projects. |
| <code><span class="command-prefix">tbProject_</span>SaveAllChanges</code> | <kbd>Ctrl</kbd>+<kbd>S</kbd> | Saves the project and every document with unsaved changes. |
| <code><span class="command-prefix">tbProject_</span>SaveAs</code> |  | Asks for a new name and place for the project and saves it there. |
| <code><span class="command-prefix">tbProject_</span>ShowReferences</code> | <kbd>Ctrl</kbd>+<kbd>T</kbd> | Opens the project's References list. |
| <code><span class="command-prefix">tbProject_</span>ShowSettings</code> |  | Opens the project's Settings in an editor. |

## `tbProjectExplorer_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbProjectExplorer_</span>ClipboardPaste</code> | <kbd>Ctrl</kbd>+<kbd>V</kbd> | In the Project Explorer's file view, pastes the items on the clipboard. |
| <code><span class="command-prefix">tbProjectExplorer_</span>FocusPanel</code> |  | Moves the focus to the Project Explorer. |
| <code><span class="command-prefix">tbProjectExplorer_</span>HidePanel</code> |  | Closes the Project Explorer panel. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ObjectList_DeleteSelected</code> |  | Shows only a message box with its own name; deleting is not implemented. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ObjectList_RenameSelected</code> |  | Shows only a message box with its own name; renaming is not implemented. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ObjectList_ViewSelectedCode</code> |  | In the object view of the Project Explorer, opens the code of the selected object. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ObjectList_ViewSelectedObject</code> |  | In the object view of the Project Explorer, opens the form of the selected object. |
| <code><span class="command-prefix">tbProjectExplorer_</span>Search</code> |  | Opens the search box of the Project Explorer's object view, or moves the focus to it. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsClipboardCopy</code> | <kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> | In the Project Explorer's file view, copies the selected items to the clipboard. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsClipboardCopyName</code> |  | In the Project Explorer's file view, copies the names of the selected items to the clipboard. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsClipboardCopyPath</code> |  | In the Project Explorer's file view, copies the paths of the selected items to the clipboard. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsClipboardCut</code> | <kbd>Ctrl</kbd>+<kbd>X</kbd>, <kbd>Shift</kbd>+<kbd>Delete</kbd> | In the Project Explorer's file view, cuts the selected items to the clipboard. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsDeletePermanently</code> | <kbd>Delete</kbd> | In the Project Explorer's file view, deletes the selected items, after asking if the Ask Before Delete Files option is on. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsExport</code> |  | In the Project Explorer's file view, exports the selected items to a folder. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsRename</code> | <kbd>F2</kbd> | In the Project Explorer's file view, renames the selected item. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsViewAsJSON</code> |  | In the Project Explorer's file view, opens the selected file as JSON. |
| <code><span class="command-prefix">tbProjectExplorer_</span>SelectedItemsViewAsMarkdownPreview</code> |  | In the Project Explorer's file view, opens the selected file as a Markdown preview. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ShowAddMenu</code> |  | Opens the menu for adding a component to the project, below the Add button of the Project Explorer. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ShowPanel</code> |  | Shows the Project Explorer panel. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ToggleFileMode</code> | <kbd>Ctrl</kbd>+<kbd>R</kbd> | Switches the Project Explorer between its file view and its object view. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ToggleFileModeOff</code> |  | Switches the Project Explorer to its object view. |
| <code><span class="command-prefix">tbProjectExplorer_</span>ToggleFileModeOn</code> |  | Switches the Project Explorer to its file view. |

## `tbProperties_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbProperties_</span>FocusPanel</code> | Moves the focus to the Properties panel. |
| <code><span class="command-prefix">tbProperties_</span>HidePanel</code> | Closes the Properties panel. |
| <code><span class="command-prefix">tbProperties_</span>Search</code> | Opens the search box of the Properties panel, or moves the focus to it. |
| <code><span class="command-prefix">tbProperties_</span>ShowPanel</code> | Shows the Properties panel. |
| <code><span class="command-prefix">tbProperties_</span>ToggleAlphabeticSort</code> | Turns the alphabetic sort order of the Properties panel on or off. |

## `tbTheme_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbTheme_</span>SwitchToDarkMode</code> | Switches the IDE to the dark colour theme. |
| <code><span class="command-prefix">tbTheme_</span>SwitchToggle</code> | Switches the IDE between the dark and light colour themes. |
| <code><span class="command-prefix">tbTheme_</span>SwitchToLightClassicMode</code> | Switches the IDE to the classic light colour theme. |
| <code><span class="command-prefix">tbTheme_</span>SwitchToLightMode</code> | Switches the IDE to the light colour theme. |

## `tbThemes_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbThemes_</span>Reload</code> | Reloads the themes from their files on disk. |
| <code><span class="command-prefix">tbThemes_</span>ShowList</code> | Opens the list of themes beside the colour mode button. |

## `tbToolbar_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbToolbar_</span>HidePanel</code> | Closes the Toolbar panel. |
| <code><span class="command-prefix">tbToolbar_</span>ShowPanel</code> | Shows the Toolbar panel. |

## `tbToolbox_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbToolbox_</span>FocusPanel</code> |  | Moves the focus to the Toolbox panel. |
| <code><span class="command-prefix">tbToolbox_</span>HidePanel</code> |  | Closes the Toolbox panel. |
| <code><span class="command-prefix">tbToolbox_</span>Search</code> |  | Opens the search box of the Toolbox, or moves the focus to it. |
| <code><span class="command-prefix">tbToolbox_</span>SelectNextTool</code> | <kbd>Down</kbd>, <kbd>Right</kbd> | In the Toolbox, selects the next tool. |
| <code><span class="command-prefix">tbToolbox_</span>SelectPrevTool</code> | <kbd>Up</kbd>, <kbd>Left</kbd> | In the Toolbox, selects the previous tool. |
| <code><span class="command-prefix">tbToolbox_</span>ShowMoreComponents</code> |  | Shows a message about adding components to the Toolbox, which says to add an ordinary COM reference to the ActiveX type library. |
| <code><span class="command-prefix">tbToolbox_</span>ShowPanel</code> |  | Shows the Toolbox panel. |
| <code><span class="command-prefix">tbToolbox_</span>ToggleShowControlNames</code> |  | Shows or hides the names of the controls in the Toolbox. |
| <code><span class="command-prefix">tbToolbox_</span>TurnShowControlNamesOff</code> |  | Hides the names of the controls in the Toolbox, leaving their icons. |
| <code><span class="command-prefix">tbToolbox_</span>TurnShowControlNamesOn</code> |  | Shows the names of the controls in the Toolbox. |

## `tbTraceOutput_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbTraceOutput_</span>Clear</code> | Clears the Trace Output panel. |

## `tbVariables_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbVariables_</span>FocusPanel</code> | Moves the focus to the Variables panel. |
| <code><span class="command-prefix">tbVariables_</span>HidePanel</code> | Closes the Variables panel. |
| <code><span class="command-prefix">tbVariables_</span>ShowPanel</code> | Shows the Variables panel. |

## `tbWatches_`

| Command | Keys | What it does |
|---|---|---|
| <code><span class="command-prefix">tbWatches_</span>Add</code> | <kbd>Shift</kbd>+<kbd>F9</kbd> | Adds a watch, starting from the text selected in the code editor. |
| <code><span class="command-prefix">tbWatches_</span>Clear</code> |  | Removes every watch. |
| <code><span class="command-prefix">tbWatches_</span>FocusPanel</code> |  | Moves the focus to the Watches panel. |
| <code><span class="command-prefix">tbWatches_</span>HidePanel</code> |  | Closes the Watches panel. |
| <code><span class="command-prefix">tbWatches_</span>ShowPanel</code> |  | Shows the Watches panel. |

## `tbWebpage_`

| Command | What it does |
|---|---|
| <code><span class="command-prefix">tbWebpage_</span>FocusPanel</code> | Moves the focus to the Webpage panel. |
| <code><span class="command-prefix">tbWebpage_</span>GoBack</code> | Goes back one page in the Webpage panel. |
| <code><span class="command-prefix">tbWebpage_</span>GoForward</code> | Goes forward one page in the Webpage panel. |
| <code><span class="command-prefix">tbWebpage_</span>HidePanel</code> | Closes the Webpage panel. |
| <code><span class="command-prefix">tbWebpage_</span>Reload</code> | Reloads the page in the Webpage panel. |
| <code><span class="command-prefix">tbWebpage_</span>ShowPanel</code> | Shows the Webpage panel. |
| <code><span class="command-prefix">tbWebpage_</span>ToggleMobileMode</code> | Turns the Webpage panel's Use Mobile Mode option on or off. |
| <code><span class="command-prefix">tbWebpage_</span>TurnMobileModeOff</code> | Turns the Webpage panel's Use Mobile Mode option off. |
| <code><span class="command-prefix">tbWebpage_</span>TurnMobileModeOn</code> | Turns the Webpage panel's Use Mobile Mode option on. |

## Commands with no prefix

| Command | Keys | What it does |
|---|---|---|
| `tbShowObjectBrowser` | <kbd>F2</kbd>, on release | Opens the Object Browser, for the text selected in the code editor. |
| `tbSignatureHelpCancel` | <kbd>Esc</kbd>, <kbd>Up</kbd>, <kbd>Down</kbd> | Dismisses the signature help that is showing. |

## See Also

- [Keyboard shortcuts](../Customising/Keyboard-Shortcuts) -- switching groups on and off, and writing your own
- [Window menu](Menu/Window#keyboard-shortcuts) -- the **Keyboard Shortcuts** entry
- [**KeyboardShortcuts** class](../../Packages/tbIDE/KeyboardShortcuts) -- how an add-in adds a shortcut of its own
