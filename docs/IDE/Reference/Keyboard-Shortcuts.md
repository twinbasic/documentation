---
title: Keyboard Shortcuts
parent: IDE Reference
grand_parent: IDE
nav_order: 15
permalink: /tB/IDE/Reference/Keyboard-Shortcuts
---

# Keyboard shortcuts

The IDE's built-in group of keyboard shortcuts, **Default Built-in Keyboard Shortcuts**. [Keyboard shortcuts](../Customising/Keyboard-Shortcuts) explains how to change them.

Every command of the IDE is on one of the two tables below, with a line that says what it does. The first table has the commands that have a default key, and gives the keys. The [second](#commands-with-no-default-key) has the commands that have none. The names are the IDE's own, and they are what a group of your own uses. The same key can be on several rows, because what a key does depends on what has the focus: <kbd>Ctrl</kbd>+<kbd>V</kbd> runs one command in the code editor and another in the form designer. Many commands apply only in some state, such as a project being loaded or a program stopped at a breakpoint; a command that does not apply does nothing.

A key marked *on release* runs when the key is released, not when it goes down. **Window → Keyboard Shortcuts → Manage Keyboard Shortcuts...** shows the same group as text, with the exact key strings, which also say which keys repeat while they are held down. [Shortcut strings](../Customising/Keyboard-Shortcuts#shortcut-strings) explains them.

| Command | Keys | What it does |
|---|---|---|
| `tbBuild_Fusion` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> | Builds the Fusion host program that a project with ActiveX controls may need, without building the project. |
| `tbBuild_SwitchToWin32` | <kbd>Ctrl</kbd>+<kbd>F2</kbd> | Sets the build target to 32-bit Windows. |
| `tbBuild_SwitchToWin64` | <kbd>Ctrl</kbd>+<kbd>F1</kbd> | Sets the build target to 64-bit Windows. |
| `tbCallStack_ShowPanel` | <kbd>Ctrl</kbd>+<kbd>L</kbd> | Shows the Call Stack panel. |
| `tbDebug_BreakInto` | <kbd>Ctrl</kbd>+<kbd>Break</kbd> | Pauses the running program. |
| `tbDebug_BreakpointsClear` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F9</kbd> | Removes every breakpoint from the project. |
| `tbDebug_RunOrPreview` | <kbd>F6</kbd> | Runs the procedure at the cursor, or shows a preview of the form when the active file is a form. |
| `tbDebug_SetNextExecutionStatement` | <kbd>Ctrl</kbd>+<kbd>F9</kbd> | At a breakpoint, makes the line at the cursor the next one to run. |
| `tbDebug_StartOrContinue` | <kbd>F5</kbd> | Starts the project, or continues it from a breakpoint. |
| `tbDebug_StepInto` | <kbd>F8</kbd>, <kbd>F11</kbd> | At a breakpoint, runs the current statement and stops at the next, entering any procedure it calls. |
| `tbDebug_StepOut` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F8</kbd>, <kbd>Shift</kbd>+<kbd>F11</kbd> | At a breakpoint, runs on until the current procedure ends and stops in its caller. |
| `tbDebug_StepOver` | <kbd>Shift</kbd>+<kbd>F8</kbd>, <kbd>F10</kbd> | At a breakpoint, runs the current statement and stops at the next, without entering any procedure it calls. |
| `tbDebug_ToggleBreakpoint` | <kbd>F9</kbd> | Sets a breakpoint on the cursor's line, or removes the one that is there. |
| `tbDebugConsole_ExecuteEnteredLine` | <kbd>Enter</kbd> | Runs the line typed in the Debug Console's entry box, or inserts the selected entry of the completion list. |
| `tbDebugConsole_FocusPanel` | <kbd>Ctrl</kbd>+<kbd>G</kbd> | Moves the focus to the Debug Console's entry box. |
| `tbDebugConsole_GoToDefinition` | <kbd>Shift</kbd>+<kbd>F2</kbd>, <kbd>F12</kbd> | Goes to the definition of the symbol selected in the Debug Console's completion list. |
| `tbDebugConsole_HistoryCycleNext` | <kbd>Down</kbd> | In the Debug Console's entry box, shows the next line of its history. |
| `tbDebugConsole_HistoryCyclePrevious` | <kbd>Up</kbd> | In the Debug Console's entry box, shows the previous line of its history. |
| `tbDebugConsole_SelectAllEntryBox` | <kbd>Ctrl</kbd>+<kbd>A</kbd> | Selects the whole text of the Debug Console's entry box. |
| `tbDebugConsole_ShowPanel` | <kbd>Ctrl</kbd>+<kbd>G</kbd> | Shows the Debug Console panel. |
| `tbEditor_ActivateNextTab` | <kbd>Ctrl</kbd>+<kbd>Tab</kbd> | Switches to the next editor tab. |
| `tbEditor_ActivatePrevTab` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Tab</kbd> | Switches to the previous editor tab. |
| `tbEditor_AddCursorAbove` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Up</kbd> | Adds a cursor on the line above. |
| `tbEditor_AddCursorBelow` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Down</kbd> | Adds a cursor on the line below. |
| `tbEditor_AddCursorsAtLineEndsOfSelection` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>I</kbd> | Puts a cursor at the end of each line of the selection. |
| `tbEditor_AddSelectionToNextFindMatch` | <kbd>Ctrl</kbd>+<kbd>D</kbd> | Adds the next occurrence of the selected text to the selection, with a cursor at each. |
| `tbEditor_ClipboardCopy` | <kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> | Copies the selection to the clipboard, replacing tabs with spaces. |
| `tbEditor_ClipboardCut` | <kbd>Ctrl</kbd>+<kbd>X</kbd>, <kbd>Shift</kbd>+<kbd>Delete</kbd> | Cuts the selection to the clipboard, replacing tabs with spaces. |
| `tbEditor_ClipboardCutPlain` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd> | Cuts the selection to the clipboard as plain text, with the editor's own handling of tabs left out. |
| `tbEditor_ClipboardPaste` | <kbd>Ctrl</kbd>+<kbd>V</kbd> | Pastes the clipboard into the code editor, re-indenting the pasted text. |
| `tbEditor_ClipboardPasteAsComment` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd> | Pastes the clipboard into the code editor as comment lines. |
| `tbEditor_ClipboardPlainCopy` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> | Copies the selection to the clipboard as plain text, with the editor's own handling of tabs left out. |
| `tbEditor_ClipboardPlainPaste` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | Pastes the clipboard into the code editor exactly as it is, without re-indenting. |
| `tbEditor_CloseTab` | <kbd>Ctrl</kbd>+<kbd>F4</kbd>, <kbd>Ctrl</kbd>+<kbd>W</kbd> | Closes the current editor tab. |
| `tbEditor_CodeSelector1_Dropdown` | <kbd>Ctrl</kbd>+<kbd>1</kbd> | Opens box 1 above the code editor, which lists the components of the file. |
| `tbEditor_CodeSelector2_Dropdown` | <kbd>Ctrl</kbd>+<kbd>2</kbd> | Opens box 2 above the code editor, which lists the objects of the component. |
| `tbEditor_CodeSelector3_Dropdown` | <kbd>Ctrl</kbd>+<kbd>3</kbd> | Opens box 3 above the code editor, which lists the procedures or events. |
| `tbEditor_CommentSelection` | <kbd>Ctrl</kbd>+<kbd>K</kbd> | Turns the selected lines into comments. |
| `tbEditor_CopyLineDown` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Down</kbd> | Copies the current line, or the selected lines, below themselves. |
| `tbEditor_CopyLineUp` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Up</kbd> | Copies the current line, or the selected lines, above themselves. |
| `tbEditor_CursorMoveBottom` | <kbd>Ctrl</kbd>+<kbd>End</kbd> | Moves the cursor to the end of the document. |
| `tbEditor_CursorMoveDown` | <kbd>Down</kbd> | Moves the cursor down one line. |
| `tbEditor_CursorMoveEndOfLine` | <kbd>End</kbd> | Moves the cursor to the end of the line. |
| `tbEditor_CursorMoveLeft` | <kbd>Left</kbd> | Moves the cursor one character to the left. |
| `tbEditor_CursorMoveLeftWord` | <kbd>Ctrl</kbd>+<kbd>Left</kbd> | Moves the cursor to the start of the previous word. |
| `tbEditor_CursorMovePageDown` | <kbd>Page Down</kbd> | Moves the cursor down by one page. |
| `tbEditor_CursorMovePageUp` | <kbd>Page Up</kbd> | Moves the cursor up by one page. |
| `tbEditor_CursorMoveRight` | <kbd>Right</kbd> | Moves the cursor one character to the right. |
| `tbEditor_CursorMoveRightWord` | <kbd>Ctrl</kbd>+<kbd>Right</kbd> | Moves the cursor to the start of the next word. |
| `tbEditor_CursorMoveStartOfLineHome` | <kbd>Home</kbd> | Moves the cursor to the first non-blank character of the line, or to the first column if it is already there. |
| `tbEditor_CursorMoveTop` | <kbd>Ctrl</kbd>+<kbd>Home</kbd> | Moves the cursor to the start of the document. |
| `tbEditor_CursorMoveUp` | <kbd>Up</kbd> | Moves the cursor up one line. |
| `tbEditor_CursorSelectBottom` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>End</kbd> | Extends the selection to the end of the document. |
| `tbEditor_CursorSelectDown` | <kbd>Shift</kbd>+<kbd>Down</kbd> | Extends the selection down one line. |
| `tbEditor_CursorSelectLeft` | <kbd>Shift</kbd>+<kbd>Left</kbd> | Extends the selection one character to the left. |
| `tbEditor_CursorSelectLeftWord` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Left</kbd> | Extends the selection to the start of the previous word. |
| `tbEditor_CursorSelectLineEnd` | <kbd>Shift</kbd>+<kbd>End</kbd> | Extends the selection to the end of the line. |
| `tbEditor_CursorSelectLineStartHome` | <kbd>Shift</kbd>+<kbd>Home</kbd> | Extends the selection to the first non-blank character of the line, or to the first column if it is already there. |
| `tbEditor_CursorSelectPageDown` | <kbd>Shift</kbd>+<kbd>Page Down</kbd> | Extends the selection down by one page. |
| `tbEditor_CursorSelectPageUp` | <kbd>Shift</kbd>+<kbd>Page Up</kbd> | Extends the selection up by one page. |
| `tbEditor_CursorSelectRight` | <kbd>Shift</kbd>+<kbd>Right</kbd> | Extends the selection one character to the right. |
| `tbEditor_CursorSelectRightWord` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> | Extends the selection to the start of the next word. |
| `tbEditor_CursorSelectTop` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Home</kbd> | Extends the selection to the start of the document. |
| `tbEditor_CursorSelectUp` | <kbd>Shift</kbd>+<kbd>Up</kbd> | Extends the selection up one line. |
| `tbEditor_CursorUndo` | <kbd>Ctrl</kbd>+<kbd>U</kbd> | Undoes the last cursor movement or selection change, without undoing any text change. |
| `tbEditor_DecreaseFontSize` | <kbd>Ctrl</kbd>+<kbd>-</kbd> | Makes the code editor's font one pixel smaller, down to a size of 8 pixels, and saves the size as the Code Editor Font Size option. |
| `tbEditor_DeleteLeft` | <kbd>Backspace</kbd>, <kbd>Shift</kbd>+<kbd>Backspace</kbd> | Deletes the character before the cursor, or the selection. |
| `tbEditor_DeleteLeftWord` | <kbd>Ctrl</kbd>+<kbd>Backspace</kbd> | Deletes the word before the cursor. |
| `tbEditor_DeleteLines` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Delete</kbd> | Deletes the current line, or the selected lines. |
| `tbEditor_DeleteRight` | <kbd>Delete</kbd> | Deletes the character after the cursor, or the selection. |
| `tbEditor_DeleteRightWord` | <kbd>Ctrl</kbd>+<kbd>Delete</kbd> | Deletes the word after the cursor. |
| `tbEditor_ExpandLineSelection` | <kbd>Ctrl</kbd>+<kbd>L</kbd> | Extends the selection to include the whole of the current line. |
| `tbEditor_ExpandSelection` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Right</kbd> | Widens the selection to the next larger syntactic block. |
| `tbEditor_Find` | <kbd>Ctrl</kbd>+<kbd>F</kbd> | Opens the Find and Replace panel, searching for the selected text, or the word at the cursor. |
| `tbEditor_FindReplace` | <kbd>Ctrl</kbd>+<kbd>H</kbd> | Opens the Find and Replace panel, as the Find command does. |
| `tbEditor_FindSelectedNext` | <kbd>Ctrl</kbd>+<kbd>F3</kbd> | Moves to the next occurrence of the selected text. |
| `tbEditor_FindSelectedPrev` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F3</kbd> | Moves to the previous occurrence of the selected text. |
| `tbEditor_FindWidget_Next` | <kbd>Alt</kbd>+<kbd>F3</kbd> | Moves to the next match of the current search. |
| `tbEditor_FindWidget_Prev` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F3</kbd> | Moves to the previous match of the current search. |
| `tbEditor_FindWidget_SelectAllMatches` | <kbd>Alt</kbd>+<kbd>A</kbd> | Selects every match of the current search in the editor. |
| `tbEditor_Fold` | <kbd>Ctrl</kbd>+<kbd>{</kbd> | Folds the block at the cursor. |
| `tbEditor_FoldProcedures` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Left</kbd> | Folds every procedure in the file except the one the cursor is in. |
| `tbEditor_GoToDefinition` | <kbd>Shift</kbd>+<kbd>F2</kbd>, <kbd>F12</kbd> | Goes to the definition of the symbol at the cursor. |
| `tbEditor_IncreaseFontSize` | <kbd>Ctrl</kbd>+<kbd>+</kbd> | Makes the code editor's font one pixel larger and saves the size as the Code Editor Font Size option. |
| `tbEditor_Indent` | <kbd>Tab</kbd> | Indents the line or the selected lines, or inserts a tab at the cursor. |
| `tbEditor_IndentLine` | <kbd>Ctrl</kbd>+<kbd>]</kbd> | Indents the selected lines. |
| `tbEditor_InsertAmpersand` | <kbd>&amp;</kbd> | Types an ampersand. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertBackslash` | <kbd>&#92;</kbd> | Types a backslash. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertColon` | <kbd>:</kbd> | Types a colon. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertComma` | <kbd>,</kbd> | Types a comma. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertEquals` | <kbd>=</kbd> | Types an equals sign. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertExclamation` | <kbd>!</kbd> | Types an exclamation mark. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertLineAbove` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> | Inserts an empty line above the cursor's line and moves the cursor to it. |
| `tbEditor_InsertLineBelow` | <kbd>Ctrl</kbd>+<kbd>Enter</kbd> | Inserts an empty line below the cursor's line and moves the cursor to it. |
| `tbEditor_InsertLineBreak` | <kbd>Enter</kbd> | Breaks the line at the cursor, as the Enter key does. This is bound to the key so that the IDE can do its own work on the new line. |
| `tbEditor_InsertMinus` | <kbd>-</kbd> | Types a minus sign. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertMultiply` | <kbd>&#42;</kbd> | Types an asterisk. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertPeriod` | <kbd>.</kbd> | Types a full stop. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertPlus` | <kbd>+</kbd> | Types a plus sign. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertSlash` | <kbd>/</kbd> | Types a slash. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_InsertSpace` | <kbd>Space</kbd>, <kbd>Shift</kbd>+<kbd>Space</kbd> | Types a space. The key is bound to a command so that the IDE can react to it. |
| `tbEditor_JumpToNextProblem` | <kbd>Alt</kbd>+<kbd>F8</kbd> | Moves the cursor to the next error or warning in the document. |
| `tbEditor_JumpToPrevProblem` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F8</kbd> | Moves the cursor to the previous error or warning in the document. |
| `tbEditor_LastPosition` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F2</kbd> | Returns to the most recently recorded position, at the start of its line, opening its file if needed. |
| `tbEditor_MoveLinesDown` | <kbd>Alt</kbd>+<kbd>Down</kbd> | Moves the current line, or the selected lines, down one line. |
| `tbEditor_MoveLinesUp` | <kbd>Alt</kbd>+<kbd>Up</kbd> | Moves the current line, or the selected lines, up one line. |
| `tbEditor_MoveToProcedureNext` | <kbd>Ctrl</kbd>+<kbd>Down</kbd> | Moves the cursor to the start of the next procedure. |
| `tbEditor_MoveToProcedurePrev` | <kbd>Ctrl</kbd>+<kbd>Up</kbd> | Moves the cursor to the start of the previous procedure. |
| `tbEditor_Outdent` | <kbd>Shift</kbd>+<kbd>Tab</kbd> | Outdents the line or the selected lines. |
| `tbEditor_OutdentLine` | <kbd>Ctrl</kbd>+<kbd>[</kbd> | Outdents the selected lines. |
| `tbEditor_PrevBookmark` | <kbd>Ctrl</kbd>+<kbd>M</kbd> | Moves the cursor to the previous bookmark. |
| `tbEditor_Redo` | <kbd>Ctrl</kbd>+<kbd>Y</kbd> | Redoes the last change that was undone in the current document. |
| `tbEditor_RenameSymbol` | <kbd>F2</kbd> | Renames the symbol at the cursor everywhere it is used. |
| `tbEditor_ReopenLastClosedTab` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> | Reopens the editor tab that was closed last. |
| `tbEditor_SelectAll` | <kbd>Ctrl</kbd>+<kbd>A</kbd> | Selects the whole document. |
| `tbEditor_SelectAllMatches` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> | Selects every occurrence of the word at the cursor, or of the selected text. |
| `tbEditor_ShowContextMenu` | <kbd>Shift</kbd>+<kbd>F10</kbd> | Opens the code editor's context menu at the top left of the editor. |
| `tbEditor_ShrinkSelection` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Left</kbd> | Narrows the selection to the next smaller syntactic block. |
| `tbEditor_SwitchToFormDesign` | <kbd>Shift</kbd>+<kbd>F7</kbd> | Switches from the code of a file to its form designer. |
| `tbEditor_ToggleBlockComment` | <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>A</kbd> | Wraps the selection in a block comment, or removes the block comment around it. |
| `tbEditor_ToggleBookmark` | <kbd>Ctrl</kbd>+<kbd>B</kbd> | Sets a bookmark on the cursor's line, or removes the one that is there. |
| `tbEditor_ToggleLineComment` | <kbd>Ctrl</kbd>+<kbd>/</kbd> | Comments the selected lines, or uncomments them if they are all comments already. |
| `tbEditor_ToggleWordWrap` | <kbd>Alt</kbd>+<kbd>Z</kbd> | Turns word wrap on or off in the code editor. |
| `tbEditor_TurnShowCodeHintsOff` | <kbd>Ctrl</kbd>, on release | Hides the inline code hints. The Ctrl key runs it when it is released. |
| `tbEditor_TurnShowCodeHintsOn` | <kbd>Ctrl</kbd> | Shows the inline code hints. The Ctrl key runs it when it goes down. |
| `tbEditor_UncommentSelection` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> | Removes the comment marker from the selected lines. |
| `tbEditor_Undo` | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undoes the last change in the current document. |
| `tbEditor_Unfold` | <kbd>Ctrl</kbd>+<kbd>}</kbd> | Unfolds the block at the cursor. |
| `tbEditor_UnfoldProcedures` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Right</kbd> | Unfolds every procedure in the file. |
| `tbFindReplace_Cancel` | <kbd>Esc</kbd> | Closes the Find and Replace panel, or hides it if it is floating. |
| `tbFindReplace_FocusCurrentModule` | <kbd>Alt</kbd>+<kbd>M</kbd> | Chooses the Current Module scope in the Find and Replace panel. |
| `tbFindReplace_FocusCurrentProcedure` | <kbd>Alt</kbd>+<kbd>P</kbd> | Chooses the Current Procedure scope in the Find and Replace panel. |
| `tbFindReplace_FocusCurrentProject` | <kbd>Alt</kbd>+<kbd>C</kbd> | Chooses the Current Project scope in the Find and Replace panel. |
| `tbFindReplace_FocusDirection` | <kbd>Alt</kbd>+<kbd>D</kbd> | Moves the focus to the Direction box of the Find and Replace panel. |
| `tbFindReplace_FocusFindWhat` | <kbd>Alt</kbd>+<kbd>F</kbd> | Moves the focus to the Find What box of the Find and Replace panel. |
| `tbFindReplace_FocusMatchCaseToggle` | <kbd>Alt</kbd>+<kbd>S</kbd> | Turns the Match Case option of the Find and Replace panel on or off. |
| `tbFindReplace_FocusNext` | <kbd>Alt</kbd>+<kbd>N</kbd> | Finds the next match in the Find and Replace panel. |
| `tbFindReplace_FocusReplaceWith` | <kbd>Alt</kbd>+<kbd>W</kbd> | Moves the focus to the Replace With box of the Find and Replace panel. |
| `tbFindReplace_FocusUsePatternMatchingToggle` | <kbd>Alt</kbd>+<kbd>U</kbd> | Turns the Use Pattern Matching option of the Find and Replace panel on or off. |
| `tbFindReplace_FocusWholeWordOnlyToggle` | <kbd>Alt</kbd>+<kbd>O</kbd> | Turns the Whole Word Only option of the Find and Replace panel on or off. |
| `tbFindReplace_Next` | <kbd>F3</kbd> | Finds the next match in the Find and Replace panel, or in the editor's quick find box when only that is showing. |
| `tbFindReplace_Prev` | <kbd>Shift</kbd>+<kbd>F3</kbd> | Finds the previous match in the Find and Replace panel. |
| `tbFindReplace_ReplaceAll` | <kbd>Alt</kbd>+<kbd>A</kbd> | Replaces every match in the scope chosen in the Find and Replace panel. |
| `tbFindReplace_ReplaceNext` | <kbd>Alt</kbd>+<kbd>R</kbd> | Replaces the current match in the Find and Replace panel and finds the next. |
| `tbFindWidget_FindNext` | <kbd>Enter</kbd> | In the quick find box, moves to the next match. |
| `tbFindWidget_FindNextInSelection` | <kbd>Ctrl</kbd>+<kbd>F3</kbd> | In the quick find box, moves to the next occurrence of the selected text. |
| `tbFindWidget_FindPrevInSelection` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F3</kbd> | In the quick find box, moves to the previous occurrence of the selected text. |
| `tbFindWidget_FindPrevious` | <kbd>Shift</kbd>+<kbd>Enter</kbd> | Has the default key Shift+Enter, but the IDE has no command of this name. The command that moves to the previous match in the quick find box is tbFindWidget_FindPrev. |
| `tbFindWidget_Hide` | <kbd>Esc</kbd> | Closes the editor's quick find box. |
| `tbFindWidget_HistoryCycleNext` | <kbd>Down</kbd> | In the quick find box, shows the next entry of the search history. |
| `tbFindWidget_HistoryCyclePrevious` | <kbd>Up</kbd> | In the quick find box, shows the previous entry of the search history. |
| `tbFindWidget_ShowFind` | <kbd>Alt</kbd>+<kbd>F</kbd> | Opens the editor's quick find box. |
| `tbFindWidget_ShowReplace` | <kbd>Alt</kbd>+<kbd>H</kbd> | Opens the editor's quick find and replace box. |
| `tbFormDesigner_AlignSelectedControlsBottom` | <kbd>Alt</kbd>+<kbd>Down</kbd> | Aligns the bottom edges of the selected controls. |
| `tbFormDesigner_AlignSelectedControlsLeft` | <kbd>Alt</kbd>+<kbd>Left</kbd> | Aligns the left edges of the selected controls. |
| `tbFormDesigner_AlignSelectedControlsRight` | <kbd>Alt</kbd>+<kbd>Right</kbd> | Aligns the right edges of the selected controls. |
| `tbFormDesigner_AlignSelectedControlsTop` | <kbd>Alt</kbd>+<kbd>Up</kbd> | Aligns the top edges of the selected controls. |
| `tbFormDesigner_ClipboardCopy` | <kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> | Copies the selected controls to the clipboard. |
| `tbFormDesigner_ClipboardCut` | <kbd>Ctrl</kbd>+<kbd>X</kbd>, <kbd>Shift</kbd>+<kbd>Delete</kbd> | Cuts the selected controls to the clipboard. |
| `tbFormDesigner_ClipboardPaste` | <kbd>Ctrl</kbd>+<kbd>V</kbd> | Pastes the controls on the clipboard into the form designer. |
| `tbFormDesigner_DeleteSelectedControls` | <kbd>Delete</kbd> | Deletes the selected controls. |
| `tbFormDesigner_MenuEditorDelete` | <kbd>Delete</kbd> | In the menu editor, deletes the selected menu item. |
| `tbFormDesigner_MenuEditorMoveDown` | <kbd>Ctrl</kbd>+<kbd>Down</kbd> | In the menu editor, moves the selected menu item down one place. |
| `tbFormDesigner_MenuEditorMoveLeft` | <kbd>Ctrl</kbd>+<kbd>Left</kbd> | In the menu editor, moves the selected top-level menu one place to the left. |
| `tbFormDesigner_MenuEditorMoveRight` | <kbd>Ctrl</kbd>+<kbd>Right</kbd> | In the menu editor, moves the selected top-level menu one place to the right. |
| `tbFormDesigner_MenuEditorMoveUp` | <kbd>Ctrl</kbd>+<kbd>Up</kbd> | In the menu editor, moves the selected menu item up one place. |
| `tbFormDesigner_MenuEditorRename` | <kbd>F2</kbd> | In the menu editor, renames the selected menu item. |
| `tbFormDesigner_MenuEditorToggleChecked` | <kbd>Space</kbd> | In the menu editor, turns the Checked property of the selected menu item on or off. |
| `tbFormDesigner_MoveSelectedControlsDown` | <kbd>Down</kbd> | Moves the selected controls down by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_MoveSelectedControlsLeft` | <kbd>Left</kbd> | Moves the selected controls left by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_MoveSelectedControlsRight` | <kbd>Right</kbd> | Moves the selected controls right by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_MoveSelectedControlsUp` | <kbd>Up</kbd> | Moves the selected controls up by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_Redo` | <kbd>Ctrl</kbd>+<kbd>Y</kbd> | Redoes the last change that was undone in the form designer. |
| `tbFormDesigner_ResizeSelectedControlsNarrower` | <kbd>Shift</kbd>+<kbd>Left</kbd> | Makes the selected controls narrower by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_ResizeSelectedControlsNarrowest` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Left</kbd> | Makes the selected controls as narrow as the narrowest of them. |
| `tbFormDesigner_ResizeSelectedControlsShorter` | <kbd>Shift</kbd>+<kbd>Up</kbd> | Makes the selected controls shorter by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_ResizeSelectedControlsShortest` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Up</kbd> | Makes the selected controls as short as the shortest of them. |
| `tbFormDesigner_ResizeSelectedControlsTaller` | <kbd>Shift</kbd>+<kbd>Down</kbd> | Makes the selected controls taller by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_ResizeSelectedControlsTallest` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Down</kbd> | Makes the selected controls as tall as the tallest of them. |
| `tbFormDesigner_ResizeSelectedControlsWider` | <kbd>Shift</kbd>+<kbd>Right</kbd> | Makes the selected controls wider by one grid step, or one pixel when the grid is off. |
| `tbFormDesigner_ResizeSelectedControlsWidest` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> | Makes the selected controls as wide as the widest of them. |
| `tbFormDesigner_SelectAllControls` | <kbd>Ctrl</kbd>+<kbd>A</kbd> | Selects every control on the form. |
| `tbFormDesigner_SelectParentOfSelectedControl` | <kbd>Esc</kbd> | With a control selected, selects its container, or the form. |
| `tbFormDesigner_SelectToolboxPointer` | <kbd>Esc</kbd> | With no control selected, returns to the pointer tool in the Toolbox. |
| `tbFormDesigner_TurnShowTabIndexOff` | <kbd>Ctrl</kbd>, on release | Hides the tab index of each control. The Ctrl key runs it when it is released. |
| `tbFormDesigner_TurnShowTabIndexOn` | <kbd>Ctrl</kbd> | Shows the tab index of each control. The Ctrl key runs it when it goes down. |
| `tbFormDesigner_Undo` | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undoes the last change in the form designer. |
| `tbHelp_ToggleExpandSignatureHelp` | <kbd>F1</kbd> | Expands or collapses the signature help that is showing. |
| `tbIde_DecreaseFontSize` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>-</kbd> | Makes the IDE's font one pixel smaller, down to a size of 8 pixels. |
| `tbIde_IncreaseFontSize` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>+</kbd> | Makes the IDE's font one pixel larger. |
| `tbIdeWindow_Close` | <kbd>Alt</kbd>+<kbd>F4</kbd> | Closes the IDE window. |
| `tbIntellisense_AcceptSelectedEntry` | <kbd>Tab</kbd>; <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>,</kbd>, <kbd>.</kbd>, <kbd>+</kbd>, <kbd>-</kbd>, <kbd>&amp;</kbd>, <kbd>(</kbd>, <kbd>)</kbd>, <kbd>!</kbd>, <kbd>&#42;</kbd>, <kbd>&#92;</kbd>, <kbd>/</kbd>, <kbd>:</kbd>, <kbd>=</kbd>, on release | Inserts the selected entry of the completion list, then types the key that was pressed. |
| `tbIntellisense_AcceptSelectedOrFirstEntry` | <kbd>Tab</kbd>, <kbd>Space</kbd> | Inserts the selected entry of the completion list, or the first entry if none is selected. |
| `tbIntellisense_Cancel` | <kbd>Esc</kbd>, <kbd>Left</kbd>, <kbd>Right</kbd>, <kbd>Backspace</kbd> | Closes the completion list and the signature help. |
| `tbIntellisense_SelectNext` | <kbd>Down</kbd> | Selects the next entry of the open completion list. |
| `tbIntellisense_SelectPrevious` | <kbd>Up</kbd> | Selects the previous entry of the open completion list. |
| `tbIntellisense_ShowAfterKeyPress` | every key its `{ALLEXCEPT}` list does not name, on release | Opens the completion list after any key that is not one of the keys its binding excludes, according to the IntelliSense mode option. |
| `tbIntellisense_ShowNow` | <kbd>Ctrl</kbd>+<kbd>Space</kbd> | Opens the completion list at the cursor. |
| `tbMenu_Cancel` | <kbd>Esc</kbd> | Closes the open menu. |
| `tbMenu_ExecuteFocusedEntry` | <kbd>Enter</kbd> | While a menu is open, runs the focused entry. |
| `tbMenu_FocusAdjacentDown` | <kbd>Down</kbd> | While a menu is open, moves the focus to the entry below. |
| `tbMenu_FocusAdjacentLeft` | <kbd>Left</kbd> | While a menu is open, closes the open submenu, or moves to the menu on the left. |
| `tbMenu_FocusAdjacentRight` | <kbd>Right</kbd> | While a menu is open, opens the submenu of the focused entry, or moves to the menu on the right. |
| `tbMenu_FocusAdjacentUp` | <kbd>Up</kbd> | While a menu is open, moves the focus to the entry above. |
| `tbMisc_AltKeyStateDown` | <kbd>Alt</kbd> | Records that the Alt key is held down, so that releasing it alone can open the File menu. The IDE uses it internally. |
| `tbMisc_AltKeyStateUp` | <kbd>Alt</kbd>, on release | Opens the File menu when the Alt key is released without another key having been pressed, or closes a menu that is open. |
| `tbMisc_PreventDefaultKeyBehaviour` | <kbd>Ctrl</kbd>+<kbd>A</kbd>, <kbd>Tab</kbd> | Stops the web view's own handling of the key. The IDE binds it to keys whose default action it does not want. |
| `tbMisc_SaveProjectMetaStateInTwinproj` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>M</kbd> | Saves the project's meta state to the project file and shows a message box. |
| `tbMisc_ShiftKeyStateDown` | <kbd>Shift</kbd> | Records that the Shift key is held down. The IDE uses it internally. |
| `tbMisc_ShiftKeyStateUp` | <kbd>Shift</kbd>, on release | Records that the Shift key has been released. The IDE uses it internally. |
| `tbPanels_SetActiveLayoutDefault` | <kbd>Ctrl</kbd>+<kbd>#</kbd> | Switches to the default built-in panel layout. |
| `tbProject_Export` | <kbd>Ctrl</kbd>+<kbd>E</kbd> | Exports the project's sources to a folder. |
| `tbProject_FindInFiles` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | Opens the Find and Replace panel with the Current Project scope chosen. |
| `tbProject_New` | <kbd>Ctrl</kbd>+<kbd>N</kbd> | Opens the front page on the list of templates for a new project. |
| `tbProject_Open` | <kbd>Ctrl</kbd>+<kbd>O</kbd> | Opens the dialog for choosing a project to open. |
| `tbProject_SaveAllChanges` | <kbd>Ctrl</kbd>+<kbd>S</kbd> | Saves the project and every document with unsaved changes. |
| `tbProject_ShowReferences` | <kbd>Ctrl</kbd>+<kbd>T</kbd> | Opens the project's References list. |
| `tbProjectExplorer_ClipboardPaste` | <kbd>Ctrl</kbd>+<kbd>V</kbd> | In the Project Explorer's file view, pastes the items on the clipboard. |
| `tbProjectExplorer_SelectedItemsClipboardCopy` | <kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> | In the Project Explorer's file view, copies the selected items to the clipboard. |
| `tbProjectExplorer_SelectedItemsClipboardCut` | <kbd>Ctrl</kbd>+<kbd>X</kbd>, <kbd>Shift</kbd>+<kbd>Delete</kbd> | In the Project Explorer's file view, cuts the selected items to the clipboard. |
| `tbProjectExplorer_SelectedItemsDeletePermanently` | <kbd>Delete</kbd> | In the Project Explorer's file view, deletes the selected items, after asking if the Ask Before Delete Files option is on. |
| `tbProjectExplorer_SelectedItemsRename` | <kbd>F2</kbd> | In the Project Explorer's file view, renames the selected item. |
| `tbProjectExplorer_ToggleFileMode` | <kbd>Ctrl</kbd>+<kbd>R</kbd> | Switches the Project Explorer between its file view and its object view. |
| `tbShowObjectBrowser` | <kbd>F2</kbd>, on release | Opens the Object Browser, for the text selected in the code editor. |
| `tbSignatureHelpCancel` | <kbd>Esc</kbd>, <kbd>Up</kbd>, <kbd>Down</kbd> | Dismisses the signature help that is showing. |
| `tbToolbox_SelectNextTool` | <kbd>Down</kbd>, <kbd>Right</kbd> | In the Toolbox, selects the next tool. |
| `tbToolbox_SelectPrevTool` | <kbd>Up</kbd>, <kbd>Left</kbd> | In the Toolbox, selects the previous tool. |
| `tbWatches_Add` | <kbd>Shift</kbd>+<kbd>F9</kbd> | Adds a watch, starting from the text selected in the code editor. |

## Commands with no default key

These commands run from a menu, a button or another command, and no key starts them. Any of them can be given a key in a group of your own, by writing its name and a key string, as [Keyboard shortcuts](../Customising/Keyboard-Shortcuts#the-text-of-a-group) explains. For example, `"tbMenu_ShowFileMenu": ["{KEYDOWN}{CTRL}{ALT}F"]` opens the File menu with <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>.

| Command | What it does |
|---|---|
| `tbBuild_Clean` | Cleans the project's build. |
| `tbBuild_Start` | Builds the project. |
| `tbCallStack_FocusPanel` | Moves the focus to the Call Stack panel. |
| `tbCallStack_HidePanel` | Closes the Call Stack panel. |
| `tbCompiler_Restart` | Restarts the compiler. With the Alt key held down, it also empties the LLVM compiler cache. |
| `tbCompiler_RestartAndFlushLlvmCache` | Restarts the compiler and empties the LLVM compiler cache. |
| `tbDebug_Stop` | Ends the running program. |
| `tbDebug_ToggleBreakOnAllErrors` | Turns the project's Break On All Errors setting on or off. |
| `tbDebug_ToggleDebuggable` | Turns the project's Allow Breakpoints (Debuggable) setting on or off. |
| `tbDebugConsole_Clear` | Clears the Debug Console. |
| `tbDebugConsole_ClipboardCopyAll` | Copies everything in the Debug Console to the clipboard. |
| `tbDebugConsole_ClipboardCopyAllWithTimestamps` | Copies everything in the Debug Console to the clipboard, each line with its time. |
| `tbDebugConsole_ExecuteCode` | Runs the line of code given as its argument in the Debug Console, as in `tbDebugConsole_ExecuteCode('? 6*7')`. It does nothing without an argument. |
| `tbDebugConsole_HidePanel` | Closes the Debug Console panel. |
| `tbDebugConsole_ToggleAutoScroll` | Turns the Debug Console's Auto Scroll on or off. |
| `tbDebugConsole_ToggleInvertOutputDirection` | Turns the Debug Console's Invert Output Direction option on or off. |
| `tbDebugConsole_ToggleShowTimestamps` | Turns the Debug Console's Show Timestamps option on or off. |
| `tbDebugConsole_TurnAutoScrollOff` | Turns the Debug Console's Auto Scroll off. |
| `tbDebugConsole_TurnAutoScrollOn` | Turns the Debug Console's Auto Scroll on. |
| `tbDebugConsole_TurnInvertOutputDirectionOff` | Turns the Debug Console's Invert Output Direction option off. |
| `tbDebugConsole_TurnInvertOutputDirectionOn` | Turns the Debug Console's Invert Output Direction option on. |
| `tbDebugConsole_TurnShowTimestampsOff` | Turns the Debug Console's Show Timestamps option off. |
| `tbDebugConsole_TurnShowTimestampsOn` | Turns the Debug Console's Show Timestamps option on. |
| `tbEditor_ChangeAllOccurrences` | Selects every occurrence of the word at the cursor, for changing all at once. |
| `tbEditor_ClearBookmarks` | Removes every bookmark from the current document. |
| `tbEditor_ClearBookmarksProject` | Removes every bookmark from the project. |
| `tbEditor_ClipboardCopyWithSyntaxHighlighting` | Copies the selection to the clipboard with its syntax colours. |
| `tbEditor_ConvertIndentationToSpaces` | Replaces the tabs that indent the document's lines with spaces. |
| `tbEditor_ConvertIndentationToTabs` | Replaces the spaces that indent the document's lines with tabs. |
| `tbEditor_CursorMoveStartOfLine` | Moves the cursor to the first column of the line. |
| `tbEditor_CursorRedo` | Redoes a cursor movement or selection change that Cursor Undo undid. |
| `tbEditor_CursorSelectLineStart` | Extends the selection to the first column of the line. |
| `tbEditor_FocusPanel` | Moves the focus to the code editor. |
| `tbEditor_FoldAll` | Folds every block in the document. |
| `tbEditor_FormatDocument` | Formats the whole document. |
| `tbEditor_FormatSelection` | Formats the selected code. |
| `tbEditor_GotoLineColumn` | Opens the box for going to a line and column. |
| `tbEditor_HidePanel` | Closes the code editor panel. |
| `tbEditor_InsertBracketClose` | Types a closing parenthesis. |
| `tbEditor_InsertBracketOpen` | Types an opening parenthesis, or puts the selected text in parentheses. |
| `tbEditor_NextBookmark` | Moves the cursor to the next bookmark. |
| `tbEditor_OpenTabsDropDown` | Opens the list of open editor tabs. |
| `tbEditor_Save` | Never runs: saving a single document is turned off. Use the commands that save the project. |
| `tbEditor_ScrollTabLeft` | Scrolls the row of editor tabs to the left. The left tab button runs it. |
| `tbEditor_ScrollTabRight` | Scrolls the row of editor tabs to the right. The right tab button runs it. |
| `tbEditor_ShowMonacoCommandPalette` | Opens the command palette of the Monaco code editor. |
| `tbEditor_ShowPanel` | Shows the code editor panel. |
| `tbEditor_SortLinesAscending` | Sorts the selected lines in ascending order. |
| `tbEditor_SortLinesDescending` | Sorts the selected lines in descending order. |
| `tbEditor_SwitchToCode` | Switches from a form designer to the code of the same file. |
| `tbEditor_SwitchToggleFormDesignCode` | Switches between the form designer and the code of the same file. |
| `tbEditor_ToggleAdvancedInfoOnHover` | Turns the Show Advanced Info On Hover option on or off. |
| `tbEditor_ToggleAutoPrettifyCode` | Turns the project's Auto Prettify option on or off. |
| `tbEditor_ToggleCodeFoldingAlways` | Turns on or off showing the code folding arrows all the time, not only when the pointer is over the margin. |
| `tbEditor_ToggleCodeFoldingVisibility` | Shows or hides the code folding arrows. |
| `tbEditor_ToggleCodeHintsAlwaysVisible` | Turns the Code Hints Always Visible option on or off. |
| `tbEditor_ToggleCodeLensShowProc` | Turns the project's Show CodeLens Run Procedure option on or off. |
| `tbEditor_ToggleMiniMapVisibility` | Shows or hides the minimap. |
| `tbEditor_ToggleShowCodeHints` | Shows or hides the inline code hints. |
| `tbEditor_ToggleShowIndentGuides` | Shows or hides the indent guides. |
| `tbEditor_ToggleShowLineNumbers` | Shows or hides the line numbers. |
| `tbEditor_ToggleShowSingleRowOfTabs` | Turns the Show Single Row Of Tabs option on or off. |
| `tbEditor_ToggleStickyScroll` | Turns the Sticky Scroll option on or off. |
| `tbEditor_TransformToLowercase` | Changes the selected text to lower case. |
| `tbEditor_TransformToSnakecase` | Changes the selected text to snake case. |
| `tbEditor_TransformToTitlecase` | Changes the selected text to title case. |
| `tbEditor_TransformToUppercase` | Changes the selected text to upper case. |
| `tbEditor_TurnWordWrapOff` | Turns word wrap off in the code editor. |
| `tbEditor_TurnWordWrapOn` | Turns word wrap on in the code editor. |
| `tbEditor_UnfoldAll` | Unfolds every block in the document. |
| `tbFileSystem_AddClassCLS` | Adds a class in a .cls file to the project, with a name box for its name. |
| `tbFileSystem_AddClassTWIN` | Adds a class in a .twin file to the project, with a name box for its name. |
| `tbFileSystem_AddCustomControlsForm` | Adds a CustomControls form to the project, with a name box for its name. If the project does not reference the CustomControls package, asks to add it. |
| `tbFileSystem_AddFolder` | Adds a folder to the project, with a name box for its name. |
| `tbFileSystem_AddModuleBAS` | Adds a module in a .bas file to the project, with a name box for its name. |
| `tbFileSystem_AddModuleTWIN` | Adds a module in a .twin file to the project, with a name box for its name. |
| `tbFileSystem_AddOtherFile` | Adds a file of any other type to the project, with a name box for its name. |
| `tbFileSystem_AddResourceMessageTable` | Adds a message table to the project's resources and opens it. |
| `tbFileSystem_AddResourceStringTable` | Adds a string table to the project's resources and opens it. |
| `tbFileSystem_AddResourceVisualStylesManifest` | Adds the Visual Styles manifest to the project's resources and opens it. |
| `tbFileSystem_AddWindowsForm` | Adds a Windows form to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| `tbFileSystem_AddWindowsMDIForm` | Adds a Windows MDI form to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| `tbFileSystem_AddWindowsPropertyPage` | Adds a Windows property page to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| `tbFileSystem_AddWindowsReport` | Adds a Windows report to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| `tbFileSystem_AddWindowsUserControl` | Adds a Windows user control to the project, with a name box for its name. If the project does not reference the WinNativeForms package, asks to add it. |
| `tbFileSystem_ImportFile` | Opens the dialog for choosing files to import into the project. |
| `tbFindReplace_FocusPanel` | Moves the focus to the Find and Replace panel. |
| `tbFindReplace_HidePanel` | Closes the Find and Replace panel. |
| `tbFindReplace_ShowPanel` | Shows the Find and Replace panel. |
| `tbFindWidget_FindNextAlways` | In the quick find box, moves to the next match. It has no default key. |
| `tbFindWidget_FindPrev` | In the quick find box, moves to the previous match. It has no default key. |
| `tbFormDesginer_DecreaseSpacingHorizontal` | Narrows the horizontal gaps between the selected controls by one grid step. |
| `tbFormDesginer_DecreaseSpacingVertical` | Narrows the vertical gaps between the selected controls by one grid step. |
| `tbFormDesginer_IncreaseSpacingHorizontal` | Widens the horizontal gaps between the selected controls by one grid step. |
| `tbFormDesginer_IncreaseSpacingVertical` | Widens the vertical gaps between the selected controls by one grid step. |
| `tbFormDesginer_MakeEqualSpacingHorizontal` | Spaces three or more selected controls evenly from left to right. |
| `tbFormDesginer_MakeEqualSpacingVertical` | Spaces three or more selected controls evenly from top to bottom. |
| `tbFormDesginer_RemoveSpacingHorizontal` | Removes the horizontal gaps between the selected controls. |
| `tbFormDesginer_RemoveSpacingVertical` | Removes the vertical gaps between the selected controls. |
| `tbFormDesigner_AlignSelectedControlsCenterHorizontal` | Aligns the horizontal centres of the selected controls. |
| `tbFormDesigner_AlignSelectedControlsCenterVertical` | Aligns the vertical centres of the selected controls. |
| `tbFormDesigner_AlignSelectedControlsToGrid` | Moves the selected controls to the nearest grid points. |
| `tbFormDesigner_BringControlToFront` | Brings the selected controls to the front. |
| `tbFormDesigner_CenterSelectedGroupInContainerHorizontal` | Centres the selected controls as a group, from left to right, in their container. |
| `tbFormDesigner_CenterSelectedGroupInContainerVertical` | Centres the selected controls as a group, from top to bottom, in their container. |
| `tbFormDesigner_ClipboardPasteControlArray` | Pastes the controls on the clipboard with their names kept, so that they join the control arrays of the controls with those names. |
| `tbFormDesigner_DuplicateControlsIntoControlArray` | Duplicates the selected controls as members of control arrays. |
| `tbFormDesigner_DuplicateControlsWithNewNames` | Duplicates the selected controls, giving each copy a new name. |
| `tbFormDesigner_LaunchPreview` | Runs a preview of the form being designed. |
| `tbFormDesigner_LockAllControls` | Locks every control on the form. |
| `tbFormDesigner_LockSelectedControls` | Locks the selected controls. |
| `tbFormDesigner_MenuEditorCopy` | In the menu editor, copies the selected menu item to the clipboard. |
| `tbFormDesigner_MenuEditorCut` | In the menu editor, cuts the selected menu item to the clipboard. |
| `tbFormDesigner_MenuEditorInsertAbove` | In the menu editor, inserts a new item above the selected menu item. |
| `tbFormDesigner_MenuEditorInsertBelow` | In the menu editor, inserts a new item below the selected menu item. |
| `tbFormDesigner_MenuEditorInsertLeft` | In the menu editor, inserts a new menu to the left of the selected top-level menu. |
| `tbFormDesigner_MenuEditorInsertRight` | In the menu editor, inserts a new menu to the right of the selected top-level menu. |
| `tbFormDesigner_MenuEditorInsertSeperatorAfter` | In the menu editor, inserts a separator below the selected menu item. |
| `tbFormDesigner_MenuEditorInsertSeperatorBefore` | In the menu editor, inserts a separator above the selected menu item. |
| `tbFormDesigner_MenuEditorPasteAfter` | In the menu editor, pastes the clipboard after the selected menu item. |
| `tbFormDesigner_MenuEditorPasteBefore` | In the menu editor, pastes the clipboard before the selected menu item. |
| `tbFormDesigner_MenuEditorPasteInto` | In the menu editor, pastes the clipboard into the selected menu item. |
| `tbFormDesigner_MenuEditorToggleEnabled` | In the menu editor, turns the Enabled property of the selected menu item on or off. |
| `tbFormDesigner_MenuEditorToggleVisible` | In the menu editor, turns the Visible property of the selected menu item on or off. |
| `tbFormDesigner_SendControlToBack` | Sends the selected controls to the back. |
| `tbFormDesigner_ShowSelectedControlActiveXPropertyPage` | Opens the property page of the selected ActiveX control. |
| `tbFormDesigner_ToggleAlignControlsToGrid` | Turns on or off snapping controls to the grid. |
| `tbFormDesigner_ToggleControlOutlines` | Shows or hides the outlines of the controls. |
| `tbFormDesigner_ToggleGridIndicators` | Shows or hides the grid in the form designer. |
| `tbFormDesigner_ToggleInPlaceEditingToolbar` | Shows or hides the small in-place editing toolbar below a selected control. |
| `tbFormDesigner_ToggleLockAllControls` | Locks every control on the form that is unlocked, and unlocks each one that is locked. |
| `tbFormDesigner_ToggleLockSelectedControls` | Locks each selected control that is unlocked, and unlocks each one that is locked. |
| `tbFormDesigner_ToggleMultiColouredGrabbers` | Turns the multi-coloured selection handles on or off. |
| `tbFormDesigner_ToggleShowTabIndex` | Shows or hides the tab index of each control. |
| `tbFormDesigner_TurnAlignControlsToGridOff` | Turns off snapping controls to the grid. |
| `tbFormDesigner_TurnAlignControlsToGridOn` | Turns on snapping controls to the grid. |
| `tbFormDesigner_TurnControlOutlinesOff` | Hides the outlines of the controls. |
| `tbFormDesigner_TurnControlOutlinesOn` | Shows the outlines of the controls. |
| `tbFormDesigner_TurnGridIndicatorsOff` | Hides the grid in the form designer. |
| `tbFormDesigner_TurnGridIndicatorsOn` | Shows the grid in the form designer. |
| `tbFormDesigner_TurnInPlaceEditingToolbarOff` | Hides the small in-place editing toolbar below a selected control. |
| `tbFormDesigner_TurnInPlaceEditingToolbarOn` | Shows the small in-place editing toolbar below a selected control. |
| `tbFormDesigner_UnlockAllControls` | Unlocks every control on the form. |
| `tbFormDesigner_UnlockSelectedControls` | Unlocks the selected controls. |
| `tbFormDesigner_ZoomDecrease` | Moves to the next smaller zoom in the form designer's zoom list. |
| `tbFormDesigner_ZoomDropDown` | Opens the zoom list of the form designer. |
| `tbFormDesigner_ZoomIncrease` | Moves to the next larger zoom in the form designer's zoom list. |
| `tbHelp_AskErrorReporting` | Opens the dialog that asks whether the IDE may report its errors automatically. |
| `tbHelp_EnterLicenceKey` | Opens the dialog for entering a licence key. |
| `tbHelp_OpenDiscordWebsite` | Opens the twinBASIC Discord invitation in the default web browser. |
| `tbHelp_OpenGithubWebsite` | Opens the twinBASIC GitHub repository in the default web browser. |
| `tbHelp_OpenKofiWebsite` | Opens the twinBASIC Ko-fi page in the default web browser. |
| `tbHelp_OpenTwitterWebsite` | Opens the twinBASIC author's Twitter page in the default web browser. |
| `tbHelp_PurchaseALicence` | Opens the twinBASIC licence purchase page in the default web browser. |
| `tbHelp_ShowAboutWindow` | Opens the About window. |
| `tbHelp_ShowLicenceAgreement` | Shows the licence agreement. |
| `tbHelp_ToggleCompilerTraceMode` | Turns the compiler's trace mode on or off and restarts the compiler. |
| `tbHistory_FocusPanel` | Moves the focus to the History panel. |
| `tbHistory_HidePanel` | Closes the History panel. |
| `tbHistory_ShowPanel` | Shows the History panel. |
| `tbIde_ShowIDEOptions` | Opens the IDE Options dialog. |
| `tbIdeDevTools_Show` | Opens the developer tools of the IDE's web view. |
| `tbIdeWindow_MaximizeOrRestore` | Maximises the IDE window, or restores it when it is already maximised. |
| `tbIdeWindow_Minimize` | Minimises the IDE window. |
| `tbKeyboardShortcuts_ShowManageKeyboardShortcuts` | Opens the dialog for managing keyboard shortcut groups. |
| `tbKeyboardShortcuts_ShowWarningCannotDisableBuilinGroup` | Shows a message that the built-in keyboard shortcut group cannot be turned off, and says to override a command in a group of your own instead. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom1` | Turns on or off the keyboard shortcut group that is number 1 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom10` | Turns on or off the keyboard shortcut group that is number 10 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom2` | Turns on or off the keyboard shortcut group that is number 2 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom3` | Turns on or off the keyboard shortcut group that is number 3 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom4` | Turns on or off the keyboard shortcut group that is number 4 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom5` | Turns on or off the keyboard shortcut group that is number 5 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom6` | Turns on or off the keyboard shortcut group that is number 6 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom7` | Turns on or off the keyboard shortcut group that is number 7 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom8` | Turns on or off the keyboard shortcut group that is number 8 in the list of your own groups, if there is one. |
| `tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom9` | Turns on or off the keyboard shortcut group that is number 9 in the list of your own groups, if there is one. |
| `tbMenu_ShowAddinsMenu` | Opens the Addins menu. |
| `tbMenu_ShowDebugMenu` | Opens the Debug menu. |
| `tbMenu_ShowEditMenu` | Opens the Edit menu. |
| `tbMenu_ShowFileMenu` | Opens the File menu. |
| `tbMenu_ShowFormatMenu` | Opens the Format menu. |
| `tbMenu_ShowHelpMenu` | Opens the Help menu. |
| `tbMenu_ShowProjectMenu` | Opens the Project menu. |
| `tbMenu_ShowRunMenu` | Opens the Run menu. |
| `tbMenu_ShowToolsMenu` | Opens the Tools menu. |
| `tbMenu_ShowViewMenu` | Opens the View menu. |
| `tbMenu_ShowWindowMenu` | Opens the Window menu. |
| `tbMisc_ShowTestMessage` | Shows a test message box. |
| `tbOpenEditors_FocusPanel` | Moves the focus to the Open Editors panel. |
| `tbOpenEditors_HidePanel` | Closes the Open Editors panel. |
| `tbOpenEditors_ShowPanel` | Shows the Open Editors panel. |
| `tbOutline_FocusPanel` | Moves the focus to the Outline panel. |
| `tbOutline_HidePanel` | Closes the Outline panel. |
| `tbOutline_ShowPanel` | Shows the Outline panel. |
| `tbPackagePublishing_FocusPanel` | Moves the focus to the Package Publishing panel. |
| `tbPackagePublishing_HidePanel` | Closes the Package Publishing panel. |
| `tbPackagePublishing_ShowPanel` | Shows the Package Publishing panel. |
| `tbPanels_SaveCurrentPanelLayoutAs` | Asks for a name and saves the current panel layout under it. |
| `tbPanels_SetActiveLayoutCustom1` | Switches to the panel layout that is number 1 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom10` | Switches to the panel layout that is number 10 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom2` | Switches to the panel layout that is number 2 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom3` | Switches to the panel layout that is number 3 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom4` | Switches to the panel layout that is number 4 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom5` | Switches to the panel layout that is number 5 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom6` | Switches to the panel layout that is number 6 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom7` | Switches to the panel layout that is number 7 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom8` | Switches to the panel layout that is number 8 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutCustom9` | Switches to the panel layout that is number 9 in the list of saved layouts, if there is one. |
| `tbPanels_SetActiveLayoutFullScreen` | Switches to the full screen editor panel layout. |
| `tbPanels_ShowManagePanelLayouts` | Opens the dialog for managing the saved panel layouts. |
| `tbPanels_TogglePreventDockedMove` | Turns on or off the option that stops docked panels from being moved. |
| `tbPanels_TogglePreventDockedResize` | Turns on or off the option that stops docked panels from being resized. |
| `tbPanels_TogglePreventDockedTearout` | Turns on or off the option that stops docked panels from being pulled out of their dock. |
| `tbPanels_TogglePreventFloatingMove` | Turns on or off the option that stops floating panels from being moved. |
| `tbPanels_TogglePreventFloatingResize` | Turns on or off the option that stops floating panels from being resized. |
| `tbProblems_ClipboardCopyAll` | Copies everything in the Problems panel to the clipboard as a compilation error report. |
| `tbProblems_ClipboardCopyAllErrors` | Copies the errors of the Problems panel to the clipboard as a compilation error report. |
| `tbProblems_CollapseAll` | Collapses every entry in the Problems panel. |
| `tbProblems_ExpandAll` | Expands every entry in the Problems panel. |
| `tbProblems_FocusPanel` | Moves the focus to the Problems panel. |
| `tbProblems_HidePanel` | Closes the Problems panel. |
| `tbProblems_ShowPanel` | Shows the Problems panel. |
| `tbProblems_ToggleShowErrors` | Shows or hides the errors in the Problems panel. |
| `tbProblems_ToggleShowHints` | Shows or hides the hints in the Problems panel. |
| `tbProblems_ToggleShowInfos` | Shows or hides the information messages in the Problems panel. |
| `tbProblems_ToggleShowWarnings` | Shows or hides the warnings in the Problems panel. |
| `tbProblems_TurnShowErrorsOff` | Hides the errors in the Problems panel. |
| `tbProblems_TurnShowErrorsOn` | Shows the errors in the Problems panel. |
| `tbProblems_TurnShowHintsOff` | Hides the hints in the Problems panel. |
| `tbProblems_TurnShowHintsOn` | Shows the hints in the Problems panel. |
| `tbProblems_TurnShowInfosOff` | Hides the information messages in the Problems panel. |
| `tbProblems_TurnShowInfosOn` | Shows the information messages in the Problems panel. |
| `tbProblems_TurnShowWarningsOff` | Hides the warnings in the Problems panel. |
| `tbProblems_TurnShowWarningsOn` | Shows the warnings in the Problems panel. |
| `tbProject_AddCustomControlsPackage` | Adds the CustomControls package to the project. |
| `tbProject_AddWinNativeFormsPackage` | Adds the WinNativeForms package to the project. |
| `tbProject_Close` | Closes the project. |
| `tbProject_OpenBuildFolder` | Opens the project's build folder in Windows Explorer. A project that has not been saved gets a message instead. |
| `tbProject_OpenProjectFolder` | Opens the folder that holds the project file in Windows Explorer. A project that has not been saved gets a message instead. |
| `tbProject_OpenRecent` | Opens the front page on the list of recent projects. |
| `tbProject_SaveAs` | Asks for a new name and place for the project and saves it there. |
| `tbProject_ShowSettings` | Opens the project's Settings in an editor. |
| `tbProjectExplorer_FocusPanel` | Moves the focus to the Project Explorer. |
| `tbProjectExplorer_HidePanel` | Closes the Project Explorer panel. |
| `tbProjectExplorer_ObjectList_DeleteSelected` | Shows only a message box with its own name; deleting is not implemented. |
| `tbProjectExplorer_ObjectList_RenameSelected` | Shows only a message box with its own name; renaming is not implemented. |
| `tbProjectExplorer_ObjectList_ViewSelectedCode` | In the object view of the Project Explorer, opens the code of the selected object. |
| `tbProjectExplorer_ObjectList_ViewSelectedObject` | In the object view of the Project Explorer, opens the form of the selected object. |
| `tbProjectExplorer_Search` | Opens the search box of the Project Explorer's object view, or moves the focus to it. |
| `tbProjectExplorer_SelectedItemsClipboardCopyName` | In the Project Explorer's file view, copies the names of the selected items to the clipboard. |
| `tbProjectExplorer_SelectedItemsClipboardCopyPath` | In the Project Explorer's file view, copies the paths of the selected items to the clipboard. |
| `tbProjectExplorer_SelectedItemsExport` | In the Project Explorer's file view, exports the selected items to a folder. |
| `tbProjectExplorer_SelectedItemsViewAsJSON` | In the Project Explorer's file view, opens the selected file as JSON. |
| `tbProjectExplorer_SelectedItemsViewAsMarkdownPreview` | In the Project Explorer's file view, opens the selected file as a Markdown preview. |
| `tbProjectExplorer_ShowAddMenu` | Opens the menu for adding a component to the project, below the Add button of the Project Explorer. |
| `tbProjectExplorer_ShowPanel` | Shows the Project Explorer panel. |
| `tbProjectExplorer_ToggleFileModeOff` | Switches the Project Explorer to its object view. |
| `tbProjectExplorer_ToggleFileModeOn` | Switches the Project Explorer to its file view. |
| `tbProperties_FocusPanel` | Moves the focus to the Properties panel. |
| `tbProperties_HidePanel` | Closes the Properties panel. |
| `tbProperties_Search` | Opens the search box of the Properties panel, or moves the focus to it. |
| `tbProperties_ShowPanel` | Shows the Properties panel. |
| `tbTheme_SwitchToDarkMode` | Switches the IDE to the dark colour theme. |
| `tbTheme_SwitchToggle` | Switches the IDE between the dark and light colour themes. |
| `tbTheme_SwitchToLightClassicMode` | Switches the IDE to the classic light colour theme. |
| `tbTheme_SwitchToLightMode` | Switches the IDE to the light colour theme. |
| `tbThemes_Reload` | Reloads the themes from their files on disk. |
| `tbThemes_ShowList` | Opens the list of themes beside the colour mode button. |
| `tbToolbar_HidePanel` | Closes the Toolbar panel. |
| `tbToolbar_ShowPanel` | Shows the Toolbar panel. |
| `tbToolbox_FocusPanel` | Moves the focus to the Toolbox panel. |
| `tbToolbox_HidePanel` | Closes the Toolbox panel. |
| `tbToolbox_Search` | Opens the search box of the Toolbox, or moves the focus to it. |
| `tbToolbox_ShowMoreComponents` | Shows a message about adding components to the Toolbox, which says to add an ordinary COM reference to the ActiveX type library. |
| `tbToolbox_ShowPanel` | Shows the Toolbox panel. |
| `tbToolbox_ToggleShowControlNames` | Shows or hides the names of the controls in the Toolbox. |
| `tbToolbox_TurnShowControlNamesOff` | Hides the names of the controls in the Toolbox, leaving their icons. |
| `tbToolbox_TurnShowControlNamesOn` | Shows the names of the controls in the Toolbox. |
| `tbTraceOutput_Clear` | Clears the Trace Output panel. |
| `tbVariables_FocusPanel` | Moves the focus to the Variables panel. |
| `tbVariables_HidePanel` | Closes the Variables panel. |
| `tbVariables_ShowPanel` | Shows the Variables panel. |
| `tbWatches_Clear` | Removes every watch. |
| `tbWatches_FocusPanel` | Moves the focus to the Watches panel. |
| `tbWatches_HidePanel` | Closes the Watches panel. |
| `tbWatches_ShowPanel` | Shows the Watches panel. |
| `tbWebpage_FocusPanel` | Moves the focus to the Webpage panel. |
| `tbWebpage_GoBack` | Goes back one page in the Webpage panel. |
| `tbWebpage_GoForward` | Goes forward one page in the Webpage panel. |
| `tbWebpage_HidePanel` | Closes the Webpage panel. |
| `tbWebpage_Reload` | Reloads the page in the Webpage panel. |
| `tbWebpage_ShowPanel` | Shows the Webpage panel. |
| `tbWebpage_ToggleMobileMode` | Turns the Webpage panel's Use Mobile Mode option on or off. |
| `tbWebpage_TurnMobileModeOff` | Turns the Webpage panel's Use Mobile Mode option off. |
| `tbWebpage_TurnMobileModeOn` | Turns the Webpage panel's Use Mobile Mode option on. |

## See Also

- [Keyboard shortcuts](../Customising/Keyboard-Shortcuts) -- switching groups on and off, and writing your own
- [Window menu](Menu/Window#keyboard-shortcuts) -- the **Keyboard Shortcuts** entry
- [**KeyboardShortcuts** class](../../Packages/tbIDE/KeyboardShortcuts) -- how an add-in adds a shortcut of its own
