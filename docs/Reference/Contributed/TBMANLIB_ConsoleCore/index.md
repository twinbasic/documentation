---
title: TBMANLIB_ConsoleCore Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - mConsoleAPI
indexed_from: 1.0.0.1
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleCore/
---

# TBMANLIB_ConsoleCore Package
{: .no_toc }

**Author:** woeoio. **Version:** 1.0.0.1

The **TBMANLIB_ConsoleCore** contributed package is a library for the console of a twinBASIC program. Its class [**cConsole**](cConsole) writes text in 16 colours, reads lines, single keys and passwords, moves the cursor, switches the console to UTF-8 and to the escape-sequence mode, and has a full-screen mode in which a program draws into an in-memory grid, [**cConsoleBuffer**](cConsoleBuffer), and receives key, mouse and window-size events. The module [**mConsoleStyle**](mConsoleStyle) builds the escape sequences for colours, text styles and cursor movement, and has helpers that align, shorten and wrap text. This section documents version 1.0.0.1, published on TWINSERV on 3 February 2026 under the MIT licence. The package describes itself as "TBMAN: Modern console library with UTF-8, colors, and full-screen support".

The library is built on the Windows console functions of `kernel32.dll`. The package [TBMANLIB_ConsoleComponents](../TBMANLIB_ConsoleComponents/), by the same author, is a set of text-interface components that draw into the buffer of this package.

```tb check_build
Dim con As New cConsole

con.EnableUTF8
con.EnableVirtualTerminal
con.Title = "Demo"
con.WriteLineColored "Hello, world", ConsoleColor.Green
con.WriteAt 0, 2, mConsoleStyle.Bold & "Bold text" & mConsoleStyle.Reset
con.WriteLine
con.Restore
```

<!-- test: ReadTests.ReadKey_WithoutConsoleInput_Returns, ReadTests.ReadPassword_WithoutConsoleInput_Returns, TypesTests.ConsoleKey_NavigationAndFunctionMembersAreVirtualKeyCodes, ReadTests.ReadKey_ArrowKeys_EqualTheConsoleKeyMembers, ReadTests.ReadKey_NavigationKeys_EqualTheConsoleKeyMembers, ReadTests.ReadKey_FunctionKeys_EqualTheConsoleKeyMembers, ReadTests.ReadKey_LetterH_IsNotTheKeyCodeOfConsoleKeyKeyUp -->
> [!WARNING] 1.0.0.1
> Several members do not do what their names suggest. [**ReadKey**](cConsole#readkey) never returns in a program that has no console input, and a comparison of a key with a member of [**ConsoleKey**](Types#consolekey) is true for the wrong key. [Defects in version 1.0.0.1](#defects-in-version-1001) lists them with the pages that describe them.

* TOC
{:toc}

## Which project it needs

The package works on the standard input, output and error handles that Windows gives a program, and the members that read or draw reach Windows through them. It is meant for a console application: a project with [*Is Console Application*](../../../IDE/Project-Settings#is-console-application) set to **Yes**, which the **Standard EXE (Console App)** template does, as [Console Applications](../../../../Features/Project-Configuration/Project-Types#console-applications) describes. Add the package as [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) describes.

A program with no console can create a **cConsole**, and the buffer of the full-screen mode then works as an in-memory grid, but nothing is shown and the members that wait for a key never return. [Without a console](cConsole#without-a-console) lists what each member does in that case. When the output of a console program is redirected to a file or a pipe, the write members write nothing; see [Redirected input and output](cConsole#redirected-input-and-output).

## What the package offers

- **Text output.** [**WriteTo**](cConsole#writeto), [**WriteLine**](cConsole#writeline), [**WriteF**](cConsole#writef) with numbered placeholders, the coloured variants, [**WriteAt**](cConsole#writeat) at a position, and [**WriteError**](cConsole#writeerror) for the standard error handle.
- **Input.** [**ReadLine**](cConsole#readline), [**ReadKey**](cConsole#readkey), [**ReadKeyTimeout**](cConsole#readkeytimeout), [**ReadPassword**](cConsole#readpassword), and tests for pending input.
- **Console state.** Colours, the cursor, the title, the code pages, the escape-sequence mode and the size, and [**Restore**](cConsole#restore), which puts the state of the console back as it was.
- **Full-screen mode.** [**EnterFullScreenMode**](cConsole#enterfullscreenmode), [**ProcessEvents**](cConsole#processevents) with handlers for keys, the mouse and the window size, and [**Refresh**](cConsole#refresh), which writes the changed part of the buffer in one call.
- **The buffer.** [**cConsoleBuffer**](cConsoleBuffer) draws characters, lines, boxes and filled rectangles, copies and scrolls regions, and keeps a dirty rectangle so that [**Flush**](cConsoleBuffer#flush) writes only what changed.
- **Escape sequences.** [**mConsoleStyle**](mConsoleStyle) returns the sequences for 16, 256 and 24-bit colours, bold, underline and the other styles, cursor movement, clearing, scrolling and the alternate screen, and constants for box-drawing, block, arrow and symbol characters.

## Defects in version 1.0.0.1

<!-- test: ReadTests.ReadKey_WithoutConsoleInput_Returns, ReadTests.ReadPassword_WithoutConsoleInput_Returns, TypesTests.ConsoleKey_NavigationAndFunctionMembersAreVirtualKeyCodes, ReadTests.ReadKey_EnterEscapeSpaceBackspaceTab_EqualTheConsoleKeyMembers, ReadTests.KeyAvailable_KeyReleaseOnly_IsFalse, ReadTests.KeyAvailable_AfterReadKey_IsFalse, OutputTests.WriteColored_NoBackground_KeepsTheCurrentBackground, OutputTests.WriteLineColored_NoBackground_KeepsTheCurrentBackground, OutputTests.WriteAtColored_NoBackground_KeepsTheCurrentBackground, OutputTests.WriteColored_LeavesTheConsoleInTheColoursItHad, OutputTests.WriteLineColored_LeavesTheConsoleInTheColoursItHad, OutputTests.WriteAtColored_LeavesTheConsoleInTheColoursItHad, FullScreenTests.Refresh_WindowShowsAnotherPartOfTheScreenBuffer_DrawsInTheWindow, FullScreenTests.Refresh_AfterAWriteAtWithANegativeColumn_DrawsTheChangedCells, EventTests.OnResize_IsGivenTheSizeOfTheWindow, EventTests.OnCtrlEvent_Restore_RemovesTheRegistration, EventTests.OnCtrlEvent_AnotherProcedure_ReplacesTheFirst, compile KeyHandlerZero, compile KeyHandlerNothing, compile MouseHandlerZero, compile MouseHandlerNothing, compile ResizeHandlerZero, compile ResizeHandlerNothing, compile CtrlHandlerZero, compile CtrlHandlerNothing, BufferTests.ScrollRegion_Down_AtTheTopEdge_MovesTheRowsByTheDistanceAsked, BufferTests.ScrollRegion_Right_AtTheLeftEdge_MovesTheColumnsByTheDistanceAsked, StyleTests.RepeatStr_LongerStringIsRepeatedWhole, StyleTests.StripAnsi_SequenceEndingInAnotherLetter_KeepsTheTextAfterIt, StateTests.Title_LongTitle_IsReturnedWithAtMost259Characters -->
- [**ReadKey**](cConsole#readkey) and [**ReadPassword**](cConsole#readpassword) never return when the program has no console input.
- The key codes of [**ConsoleKey**](Types#consolekey) are not the virtual-key codes that [**ReadKey**](cConsole#readkey) and the key handler return, except for Enter, Escape, Space, Backspace and Tab.
- [**KeyAvailable**](cConsole#keyavailable) is true for any input event, including a key release.
- [**WriteColored**](cConsole#writecolored), [**WriteLineColored**](cConsole#writelinecolored) and [**WriteAtColored**](cConsole#writeatcolored) default the background to black, and leave the console in Gray on Black.
- [**Refresh**](cConsole#refresh) draws at the top of the screen buffer, which is out of sight when the window shows another part of it, and draws nothing after a [**WriteAt**](cConsoleBuffer#writeat) with a negative column or row.
- [**OnResize**](cConsole#onresize) is given the size of the screen buffer, not of the window.
- [**OnCtrlEvent**](cConsole#onctrlevent) adds a registration with Windows that is never removed, and the compiler refuses `0` and **Nothing** for all four handler properties, so none of them can be cleared.
- [**ScrollRegion**](cConsoleBuffer#scrollregion) of the buffer moves a region by less than the distance asked for when the region is near the top or left edge of the buffer.
- [**RepeatStr**](mConsoleStyle#repeatstr) repeats only the first character of its string, and [**StripAnsi**](mConsoleStyle#stripansi) removes text after some sequences.
- [**Title**](cConsole#title) of a title longer than 259 characters ends in a character with code 0.
<!-- /test -->
- Of the types in [Types](Types), [**ConsoleTextStyle**](Types#consoletextstyle), [**ConsoleMode**](Types#consolemode), [**ConsoleEventType**](Types#consoleeventtype), [**ConsoleEventInfo**](Types#consoleeventinfo) and the delegates **ConsoleTimerCallback** and **ConsoleRenderCallback** are not used by any member.

## Classes and modules

- [cConsole](cConsole) -- writes and reads text, controls the cursor, colours and modes of the console, and runs the full-screen mode
- [cConsoleBuffer](cConsoleBuffer) -- a grid of characters and colours in memory, written to the console in one call
- [mConsoleStyle](mConsoleStyle) -- escape sequences for colours, styles and cursor movement, text helpers and drawing characters
- [Types](Types) -- the enumerations, the structures such as **ConsoleRect** and **ConsoleKeyInfo**, and the handler types

## Declarations of the Windows API

A fifth public module, **mConsoleAPI**, has no page of its own, since a program does not need it, but a project that references the package can use its members. It declares 51 functions of `kernel32.dll`, `user32.dll` and `oleaut32.dll`: the console functions that **cConsole** calls and others, such as `AllocConsole`, `FreeConsole`, `AttachConsole` and `CreateConsoleScreenBuffer`, and the general functions `Sleep`, `GetTickCount`, `GetAsyncKeyState`, `SetTimer` and `KillTimer`. It also declares 12 structures (among them `COORD`, `SMALL_RECT`, `CHAR_INFO`, `INPUT_RECORD` and `RECT`), 47 constants for modes, events, code pages and key states, and five helper functions: `MakeCOORD` and `MakeDWORD` pack two 16-bit values into a **Long**, `LoWord` and `HiWord` take them out, and `ColorAttribute` combines a text and a background [**ConsoleColor**](Types#consolecolor) into a console attribute. All these names are public, so they are visible in a project that references the package.

## See Also

- [cConsole](cConsole) class -- the console
- [cConsoleBuffer](cConsoleBuffer) class -- the screen buffer of the full-screen mode
- [TBMANLIB_ConsoleComponents](../TBMANLIB_ConsoleComponents/) package -- progress bars, charts, panels, layouts and a data grid that draw into the buffer
- [Console Applications](../../../../Features/Project-Configuration/Project-Types#console-applications) -- the project type that the package is made for
- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project

## Test cases

The notes and warnings of this section are checked by the test cases in [TBMANLIB_ConsoleCore-tests.twinproj](TBMANLIB_ConsoleCore-tests.twinproj), a twinBASIC project. It uses TBMANLIB_ConsoleCore as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
