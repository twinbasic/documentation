---
title: mConsoleStyle
parent: TBMANLIB_ConsoleCore Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleCore/mConsoleStyle
has_toc: false
---

# mConsoleStyle module
{: .no_toc }

Builds the escape sequences that change colours and text styles, move the cursor, clear the screen and set the window title, and shortens, aligns, wraps and cleans text.

Each function returns a **String** and writes nothing: the program passes the string to [**WriteTo**](cConsole#writeto) or another output member. A sequence acts only when the console processes virtual-terminal sequences, which [**EnableVirtualTerminal**](cConsole#enablevirtualterminal) turns on; in a console without that mode the characters of the sequence appear as text. The module needs no console and no **cConsole** object, so its functions also run in a program that has none.

The functions are written with the name of the module, as in `mConsoleStyle.Bold`. A function that takes no arguments is called with or without parentheses.

```tb check_build check_run
Dim s As String

s = mConsoleStyle.Colored("Hi", mConsoleStyle.FgRed)
Debug.Print Replace(s, Chr$(27), "<ESC>")
s = mConsoleStyle.ColoredRGB("Hi", 255, 128, 0, 0, 0, 64)
Debug.Print Replace(s, Chr$(27), "<ESC>")
Debug.Print Replace(mConsoleStyle.CursorPosition(5, 10), Chr$(27), "<ESC>")
' Output:
' <ESC>[31mHi<ESC>[0m
' <ESC>[38;2;255;128;0m<ESC>[48;2;0;0;64mHi<ESC>[0m
' <ESC>[5;10H
```

* TOC
{:toc}

The sequences of the first sections start with `ESC [`, the control sequence introducer, written below as CSI; `ESC` is the character with code 27. The text styles and colours stay in force until another sequence changes them, so a program ends a coloured text with [**Reset**](#text-styles).

```tb check_build
Dim con As New cConsole

If con.EnableVirtualTerminal() Then
    con.WriteLine mConsoleStyle.Bold & "Title" & mConsoleStyle.Reset
    con.WriteLine mConsoleStyle.Colored("Warning", mConsoleStyle.FgYellow)
    con.WriteTo mConsoleStyle.CursorUp(1) & mConsoleStyle.ClearLine()
End If
con.Restore
```

## Known problems in version 0.0.0.0

- [**RepeatStr**](#repeatstr) repeats the first character of its string, not the string.
- [**StripAnsi**](#stripansi) ends a sequence only at one of eight letters, so it also removes the text after the sequences that end in another letter, such as the one made by **CursorHide**.

## Cursor movement

### Cursor functions
{: .no_toc }

| Function | Returns | Moves |
|---|---|---|
| **CursorUp** ( [ *n* ] ) | CSI *n* `A` | up *n* lines |
| **CursorDown** ( [ *n* ] ) | CSI *n* `B` | down *n* lines |
| **CursorForward** ( [ *n* ] ) | CSI *n* `C` | right *n* columns |
| **CursorBack** ( [ *n* ] ) | CSI *n* `D` | left *n* columns |
| **CursorNextLine** ( [ *n* ] ) | CSI *n* `E` | to the start of the line *n* lines down |
| **CursorPrevLine** ( [ *n* ] ) | CSI *n* `F` | to the start of the line *n* lines up |
| **CursorColumn** ( *n* ) | CSI *n* `G` | to column *n* of the current line |
| **CursorPosition** ( *row* , *col* ) | CSI *row* `;` *col* `H` | to the row and the column |
| **CursorSave** | CSI `s` | saves the position of the cursor |
| **CursorRestore** | CSI `u` | goes to the saved position |
| **CursorHide** | CSI `?25l` | hides the cursor |
| **CursorShow** | CSI `?25h` | shows the cursor |

*n*, *row* and *col* are **Long** values. *n* of the first six functions is optional and defaults to 1; **CursorColumn** has no default. The numbers of these sequences are counted from 1, whereas [**SetCursorPosition**](cConsole#setcursorposition) of **cConsole** counts from 0, takes the column first, and works on the screen buffer, not the window. **CursorPosition** takes the row first, as the sequence does. The value is written as it is: a negative number or 0 is not checked.

## Clearing

### ClearScreen, ClearLine
{: .no_toc }

Syntax: **ClearScreen** ( [ *mode* ] ) **As String**

Syntax: **ClearLine** ( [ *mode* ] ) **As String**

*mode*
: *optional* A **Long**. The default is 2. For **ClearScreen**: 0 clears from the cursor to the end of the screen, 1 from the start to the cursor, 2 the whole screen, and 3 the whole screen and the scrolled-off lines. For **ClearLine**: 0 clears from the cursor to the end of the line, 1 from the start of the line to the cursor, 2 the whole line.

**ClearScreen** returns CSI *mode* `J` and **ClearLine** returns CSI *mode* `K`. They differ from [**Clear**](cConsole#clear) and [**ClearLine**](cConsole#clearline) of **cConsole**, which fill the screen buffer with the tracked colours through the console functions; the sequences clear with the colours that are in force. Whether a console honours mode 3 depends on the console.

## Text styles

### Style functions
{: .no_toc }

| Function | Returns | Effect |
|---|---|---|
| **Reset** | CSI `0m` | ends every colour and style |
| **Bold** | CSI `1m` | bold, or brighter colour |
| **Dim_** | CSI `2m` | dim text |
| **Italic** | CSI `3m` | italic |
| **Underline** | CSI `4m` | underlined text |
| **Blink** | CSI `5m` | blinking text |
| **Reverse** | CSI `7m` | swaps the text and background colours |
| **Hidden** | CSI `8m` | hidden text |
| **Strikethrough** | CSI `9m` | struck-through text |

The function for dim text is called **Dim_** because **Dim** is a keyword of the language. Which of these styles a console draws depends on the console: a console may show bold as a brighter colour, or ignore blinking and italics.

## Colours

### Colour functions
{: .no_toc }

The 16 colours of the escape sequences. The foreground sequence ends in `m` and begins CSI; the number is the code in the table.

| Colour | Foreground function | Code | Background function | Code |
|---|---|---:|---|---:|
| Black | **FgBlack** | 30 | **BgBlack** | 40 |
| Red | **FgRed** | 31 | **BgRed** | 41 |
| Green | **FgGreen** | 32 | **BgGreen** | 42 |
| Yellow | **FgYellow** | 33 | **BgYellow** | 43 |
| Blue | **FgBlue** | 34 | **BgBlue** | 44 |
| Magenta | **FgMagenta** | 35 | **BgMagenta** | 45 |
| Cyan | **FgCyan** | 36 | **BgCyan** | 46 |
| White | **FgWhite** | 37 | **BgWhite** | 47 |
| Default | **FgDefault** | 39 | **BgDefault** | 49 |
| Bright black | **FgBrightBlack** | 90 | **BgBrightBlack** | 100 |
| Bright red | **FgBrightRed** | 91 | **BgBrightRed** | 101 |
| Bright green | **FgBrightGreen** | 92 | **BgBrightGreen** | 102 |
| Bright yellow | **FgBrightYellow** | 93 | **BgBrightYellow** | 103 |
| Bright blue | **FgBrightBlue** | 94 | **BgBrightBlue** | 104 |
| Bright magenta | **FgBrightMagenta** | 95 | **BgBrightMagenta** | 105 |
| Bright cyan | **FgBrightCyan** | 96 | **BgBrightCyan** | 106 |
| Bright white | **FgBrightWhite** | 97 | **BgBrightWhite** | 107 |

None of these functions has parameters. The order of the colours is that of the ANSI standard, not that of [**ConsoleColor**](Types#consolecolor), whose numbers are those of the Windows console attributes: ANSI red is 1 where **ConsoleColor.DarkRed** is 4. A program that uses both has to map the colours itself.

### Fg256, Bg256, FgRGB, BgRGB
{: .no_toc }

Syntax: **Fg256** ( *colorIndex* ) **As String**

Syntax: **Bg256** ( *colorIndex* ) **As String**

Syntax: **FgRGB** ( *r* , *g* , *b* ) **As String**

Syntax: **BgRGB** ( *r* , *g* , *b* ) **As String**

*colorIndex*
: *required* A **Long**, 0 to 255, an index of the 256-colour palette of the console.

*r*, *g*, *b*
: *required* **Long** values, 0 to 255, the red, green and blue parts of a 24-bit colour.

**Fg256** returns CSI `38;5;` *colorIndex* `m` and **Bg256** CSI `48;5;` *colorIndex* `m`. **FgRGB** returns CSI `38;2;` *r* `;` *g* `;` *b* `m` and **BgRGB** CSI `48;2;` *r* `;` *g* `;` *b* `m`. The numbers are written as given and not checked. A console that has no 256-colour or true-colour mode shows the nearest colour or ignores the sequence.

## Scrolling

### ScrollUp, ScrollDown
{: .no_toc }

Syntax: **ScrollUp** ( [ *n* ] ) **As String**

Syntax: **ScrollDown** ( [ *n* ] ) **As String**

*n*
: *optional* A **Long**, the number of lines. The default is 1.

**ScrollUp** returns CSI *n* `S`, which scrolls the text up, and **ScrollDown** returns CSI *n* `T`, which scrolls it down.

## Window and screen

### SetTitle
{: .no_toc }

Returns the sequence that sets the title of the window.

Syntax: **SetTitle** ( *title* ) **As String**

*title*
: *required* A **String**.

Returns `ESC ] 0 ;` *title* and the bell character (code 7). The title of the console window can also be set with the [**Title**](cConsole#title) property of **cConsole**, which calls a Windows function and does not need the virtual-terminal mode.

### AltScreenOn, AltScreenOff
{: .no_toc }

Syntax: **AltScreenOn** **As String**

Syntax: **AltScreenOff** **As String**

**AltScreenOn** returns CSI `?1049h`, which switches to the alternate screen buffer, a second screen that leaves the text of the main one intact; **AltScreenOff** returns CSI `?1049l`, which switches back. The full-screen mode of [**cConsole**](cConsole#enterfullscreenmode) does not use the alternate buffer. In a console with virtual-terminal processing on, **AltScreenOn** shows an empty screen, the text written afterwards goes to it, and **AltScreenOff** brings back the earlier text. A program that wants its picture to vanish when it ends writes **AltScreenOn** first and **AltScreenOff** last.

### Hyperlink
{: .no_toc }

Returns the sequence for a text that links to a web address.

Syntax: **Hyperlink** ( *url* , *text* ) **As String**

*url*
: *required* A **String**, the address.

*text*
: *required* A **String**, the visible text.

Returns `ESC ] 8 ; ;` *url* and the bell character, then *text*, then `ESC ] 8 ; ;` and the bell character. A console that supports this operating system command (OSC 8) shows *text* as a link; another console shows *text* only, or the characters of the sequence.

## Styled text

### Styled
{: .no_toc }

Wraps text in a style and ends the style after it.

Syntax: **Styled** ( *text* , *style* ) **As String**

*text*
: *required* A **String**.

*style*
: *required* A **String**, the sequences to put before the text, such as `mConsoleStyle.Bold & mConsoleStyle.FgCyan`.

Returns *style*, *text* and **Reset**.

### Colored
{: .no_toc }

Wraps text in a foreground colour, and optionally a background colour, and ends them after it.

Syntax: **Colored** ( *text* , *fgColor* [ , *bgColor* ] ) **As String**

*text*
: *required* A **String**.

*fgColor*
: *required* A **String**, a foreground sequence such as `mConsoleStyle.FgRed`.

*bgColor*
: *optional* A **String**, a background sequence. The default is an empty string, which leaves the background alone.

Returns *fgColor*, *bgColor*, *text* and **Reset**. The function does not check that the two strings are colour sequences; any strings are joined.

### ColoredRGB
{: .no_toc }

Wraps text in a true-colour foreground, and optionally a true-colour background.

Syntax: **ColoredRGB** ( *text* , *fgR* , *fgG* , *fgB* [ , *bgR* [ , *bgG* [ , *bgB* ] ] ] ) **As String**

*text*
: *required* A **String**.

*fgR*, *fgG*, *fgB*
: *required* **Long** values, 0 to 255, the foreground colour.

*bgR*, *bgG*, *bgB*
: *optional* **Long** values, 0 to 255, the background colour. They default to -1. The background is used only when all three are 0 or more.

Returns **FgRGB**, the background sequence when all three background values are given, *text*, and **Reset**.

## Text helpers

These functions count characters with **Len**, so they are correct for text that holds no escape sequences and no characters that the console draws double width. [**StripAnsi**](#stripansi) removes the sequences from a text first.

### CenterText
{: .no_toc }

Pads text to a width, with the text in the middle.

Syntax: **CenterText** ( *text* , *width* [ , *fillChar* ] ) **As String**

*text*
: *required* A **String**.

*width*
: *required* A **Long**, the length of the result.

*fillChar*
: *optional* A **String** whose first character is used to pad. The default is a space.

Returns a string *width* characters long. The padding on the left is `(width - Len(text)) \ 2` characters, and the rest goes to the right, so an odd amount of padding gives the extra character to the right. Text that is as long as *width* or longer is cut to *width* characters.

### LeftAlign
{: .no_toc }

Pads text on the right to a width.

Syntax: **LeftAlign** ( *text* , *width* [ , *fillChar* ] ) **As String**

Parameters as for [**CenterText**](#centertext). Text that is as long as *width* or longer is cut to *width* characters.

### RightAlign
{: .no_toc }

Pads text on the left to a width.

Syntax: **RightAlign** ( *text* , *width* [ , *fillChar* ] ) **As String**

Parameters as for [**CenterText**](#centertext). Text that is as long as *width* or longer is cut to its first *width* characters, not its last.

### RepeatStr
{: .no_toc }

Intended to repeat a string a number of times.

Syntax: **RepeatStr** ( *s* , *count* ) **As String**

*s*
: *required* A **String**.

*count*
: *required* A **Long**. A value of 0 or less returns an empty string.

The function is implemented with `String$(count, s)`, which repeats only the first character of *s*. `RepeatStr("ab", 3)` therefore returns `aaa`, and not `ababab`. For a one-character *s* the result is as expected. To repeat a longer string, build it with a loop or with `Replace(Space$(count), " ", s)`.

### StripAnsi
{: .no_toc }

Removes escape sequences from text.

Syntax: **StripAnsi** ( *text* ) **As String**

*text*
: *required* A **String**.

The function drops every character from an `ESC` character up to and including the next letter among `m`, `H`, `J`, `K`, `A`, `B`, `C` and `D`, and returns the rest. That covers the colour and style sequences (they end in `m`) and the cursor positioning and clearing sequences of this module that end in one of those letters. A sequence that ends in another letter, such as `l` of **CursorHide** and `h` of **CursorShow**, `s` and `u` of the save and restore, `S` and `T` of the scroll functions, `E`, `F` and `G` of the line functions, `?1049h` of **AltScreenOn**, or the bell character that ends **SetTitle** and **Hyperlink**, is not recognised: the function goes on dropping characters until it meets one of the eight letters, so some of the text that follows is lost too.

```tb check_build check_run
Debug.Print mConsoleStyle.StripAnsi(mConsoleStyle.Colored("Hello", mConsoleStyle.FgRed))
Debug.Print mConsoleStyle.StripAnsi(mConsoleStyle.CursorHide & "Hello")
Debug.Print mConsoleStyle.RepeatStr("ab", 3)
' Output:
' Hello
' ello
' aaa
```

The second line shows the loss: the sequence of **CursorHide** ends in `l`, so the function skips on to the `H` of `Hello`.

### Truncate
{: .no_toc }

Shortens text to a length, with a mark at the end.

Syntax: **Truncate** ( *text* , *maxLen* [ , *ellipsis* ] ) **As String**

*text*
: *required* A **String**.

*maxLen*
: *required* A **Long**, the longest result.

*ellipsis*
: *optional* A **String**, the mark that shows the text was cut. The default is three periods.

Returns *text* when it is no longer than *maxLen*. Otherwise it returns the first `maxLen - Len(ellipsis)` characters of *text* followed by *ellipsis*; when *maxLen* is not larger than the length of *ellipsis*, it returns the first *maxLen* characters of *ellipsis*.

### WordWrap
{: .no_toc }

Breaks text into lines of at most a width, at spaces.

Syntax: **WordWrap** ( *text* , *width* ) **As String**

*text*
: *required* A **String**.

*width*
: *required* A **Long**, the longest line in characters.

Splits *text* at the space characters and joins the words into lines, with a line feed (code 10) between lines. A word that is longer than *width* is not broken; it is put on a line of its own. Other characters, such as line breaks inside *text*, count as part of a word.

```tb check_build check_run
Dim lines() As String
Dim i As Long

lines = Split(mConsoleStyle.WordWrap("one two three four", 9), vbLf)
For i = 0 To UBound(lines)
    Debug.Print "[" & mConsoleStyle.CenterText(lines(i), 9) & "]"
Next
' Output:
' [ one two ]
' [  three  ]
' [  four   ]
```

## Characters

The module holds **String** constants for drawing text with characters that are not on the keyboard. Each is one character, and is written with the name of the module, as in `mConsoleStyle.BOX_HORIZONTAL`. The font of the console has to contain the character; otherwise the console draws a substitute.

### Box-drawing characters
{: .no_toc }

| Single line | | Double line | |
|---|---|---|---|
| **BOX_HORIZONTAL** | U+2500 | **BOX_D_HORIZONTAL** | U+2550 |
| **BOX_VERTICAL** | U+2502 | **BOX_D_VERTICAL** | U+2551 |
| **BOX_TOP_LEFT** | U+250C | **BOX_D_TOP_LEFT** | U+2554 |
| **BOX_TOP_RIGHT** | U+2510 | **BOX_D_TOP_RIGHT** | U+2557 |
| **BOX_BOTTOM_LEFT** | U+2514 | **BOX_D_BOTTOM_LEFT** | U+255A |
| **BOX_BOTTOM_RIGHT** | U+2518 | **BOX_D_BOTTOM_RIGHT** | U+255D |
| **BOX_T_LEFT** | U+251C | **BOX_D_T_LEFT** | U+2560 |
| **BOX_T_RIGHT** | U+2524 | **BOX_D_T_RIGHT** | U+2563 |
| **BOX_T_TOP** | U+252C | **BOX_D_T_TOP** | U+2566 |
| **BOX_T_BOTTOM** | U+2534 | **BOX_D_T_BOTTOM** | U+2569 |
| **BOX_CROSS** | U+253C | **BOX_D_CROSS** | U+256C |

### Block, progress and arrow characters
{: .no_toc }

| Constant | Code point | Constant | Code point |
|---|---|---|---|
| **BLOCK_FULL** | U+2588 | **ARROW_UP** | U+2191 |
| **BLOCK_UPPER_HALF** | U+2580 | **ARROW_DOWN** | U+2193 |
| **BLOCK_LOWER_HALF** | U+2584 | **ARROW_LEFT** | U+2190 |
| **BLOCK_LEFT_HALF** | U+258C | **ARROW_RIGHT** | U+2192 |
| **BLOCK_RIGHT_HALF** | U+2590 | **ARROW_UP_DOWN** | U+2195 |
| **BLOCK_LIGHT** | U+2591 | **ARROW_LEFT_RIGHT** | U+2194 |
| **BLOCK_MEDIUM** | U+2592 | **PROGRESS_FILLED** | U+2588 |
| **BLOCK_DARK** | U+2593 | **PROGRESS_EMPTY** | U+2591 |

### Symbol characters
{: .no_toc }

| Constant | Code point | Constant | Code point |
|---|---|---|---|
| **CHECK_MARK** | U+2713 | **SQUARE** | U+25A0 |
| **CROSS_MARK** | U+2717 | **SQUARE_EMPTY** | U+25A1 |
| **BULLET** | U+2022 | **STAR** | U+2605 |
| **DIAMOND** | U+25C6 | **STAR_EMPTY** | U+2606 |
| **CIRCLE** | U+25CF | **CIRCLE_EMPTY** | U+25CB |

## See Also

- [cConsole](cConsole) class -- **EnableVirtualTerminal**, and the members that write the strings
- [Types](Types) -- **ConsoleColor**, whose numbers differ from the ANSI colour numbers
- [TBMANLIB_ConsoleCore](./) package
