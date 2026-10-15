---
title: TBMANLIB_ConsoleCore Types
parent: TBMANLIB_ConsoleCore Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleCore/Types
has_toc: false
---

# TBMANLIB_ConsoleCore types
{: .no_toc }

The enumerations, structures, helper functions and handler types that [**cConsole**](cConsole) and [**cConsoleBuffer**](cConsoleBuffer) use in their parameters and results. They are declared in two modules, **mConsoleTypes** and **mConsoleDelegates**, and are public: a member of an enumeration is written with its enumeration, as in `ConsoleColor.Red`, a structure is used by its name, and the four functions are written with the name of the module or without it.

```tb check_build check_run
Dim r As ConsoleRect

r = ConsoleRect_Create(2, 1, 11, 4)
Debug.Print ConsoleRect_Width(r)
Debug.Print ConsoleRect_Height(r)
Debug.Print ConsoleRect_Contains(r, 11, 4)
Debug.Print ConsoleRect_Contains(r, 12, 4)
' Output:
' 10
' 4
' True
' False
```

* TOC
{:toc}

## Enumerations

### ConsoleColor
{: .no_toc }

The 16 colours of the console. The type of the colour parameters and properties of **cConsole** and **cConsoleBuffer**.

<!-- test: TypesTests.ConsoleColor_Values, TypesTests.ConsoleColorAttribute_ForegroundInTheLowFourBitsBackgroundInTheNext -->
| Member | Value | Member | Value |
|---|---:|---|---:|
| **Black** | 0 | **DarkGray** | 8 |
| **DarkBlue** | 1 | **Blue** | 9 |
| **DarkGreen** | 2 | **Green** | 10 |
| **DarkCyan** | 3 | **Cyan** | 11 |
| **DarkRed** | 4 | **Red** | 12 |
| **DarkMagenta** | 5 | **Magenta** | 13 |
| **DarkYellow** | 6 | **Yellow** | 14 |
| **Gray** | 7 | **White** | 15 |

The value is the colour as the Windows console writes it in a colour attribute: bit 0 is blue, bit 1 is green, bit 2 is red, and bit 3 makes the colour brighter. **DarkYellow** (6) is green and red together, and **Gray** (7) is all three without the brightness. A cell takes the text colour in the low four bits of its attribute and the background colour in the next four. The numbers are not those of the ANSI escape sequences, where 1 is red and 4 is blue; the functions of [**mConsoleStyle**](mConsoleStyle) write those sequences.
<!-- /test -->

What a colour looks like depends on the colour table of the console, which the user can change.

### ConsoleEventType
{: .no_toc }

<!-- test: TypesTests.ConsoleEventType_Values -->
Kinds of console event: **EventNone** (0), **EventResize** (1), **EventKeyPress** (2), **EventMouseClick** (3), **EventFocus** (4), **EventCtrlC** (5), **EventCtrlBreak** (6) and **EventClose** (7).
<!-- /test -->

The enumeration is the type of the **EventType** field of [**ConsoleEventInfo**](#consoleeventinfo). No member of the package returns that structure or reads this enumeration.

### ConsoleKey
{: .no_toc }

<!-- test: TypesTests.ConsoleKey_Values, TypesTests.ConsoleKey_FirstFiveMembersAreVirtualKeyCodes, TypesTests.ConsoleKey_NavigationAndFunctionMembersAreVirtualKeyCodes, ReadTests.ReadKey_EnterEscapeSpaceBackspaceTab_EqualTheConsoleKeyMembers, ReadTests.ReadKey_ArrowKeys_EqualTheConsoleKeyMembers, ReadTests.ReadKey_NavigationKeys_EqualTheConsoleKeyMembers, ReadTests.ReadKey_FunctionKeys_EqualTheConsoleKeyMembers, ReadTests.ReadKey_LetterH_IsNotTheKeyCodeOfConsoleKeyKeyUp, EventTests.OnKeyPress_HandlerGetsVirtualKeyCodes -->
Named key codes: **KeyEnter** (13), **KeyEscape** (27), **KeySpace** (32), **KeyBackspace** (8), **KeyTab** (9), **KeyUp** (72), **KeyDown** (80), **KeyLeft** (75), **KeyRight** (77), **KeyHome** (71), **KeyEnd** (79), **KeyPageUp** (73), **KeyPageDown** (81), **KeyInsert** (82), **KeyDelete** (83), **KeyF1** to **KeyF10** (59 to 68), **KeyF11** (133) and **KeyF12** (134).

The **KeyCode** field of a [**ConsoleKeyInfo**](#consolekeyinfo) holds the Windows virtual-key code of the key. Only the first five members of the enumeration, **KeyEnter**, **KeyEscape**, **KeySpace**, **KeyBackspace** and **KeyTab**, are virtual-key codes. The others are the codes that the C library function `_getch` returns for the same keys, so a comparison such as `keyInfo.KeyCode = ConsoleKey.KeyUp` does not test for the Up Arrow key: the virtual-key code 72 is that of the H key. The Up Arrow key has the code 38, and the H key gives 72.

For these keys, compare with the constants of Visual Basic:

| Key | Compare with | Value |
|---|---|---:|
| Up, Down, Left, Right | `vbKeyUp`, `vbKeyDown`, `vbKeyLeft`, `vbKeyRight` | 38, 40, 37, 39 |
| Home, End | `vbKeyHome`, `vbKeyEnd` | 36, 35 |
| Page Up, Page Down | `vbKeyPageUp`, `vbKeyPageDown` | 33, 34 |
| Insert, Delete | `vbKeyInsert`, `vbKeyDelete` | 45, 46 |
| F1 to F12 | `vbKeyF1` to `vbKeyF12` | 112 to 123 |
<!-- /test -->

```tb check_build slot=module
Public Sub OnKey(ByRef keyInfo As ConsoleKeyInfo, ByRef handled As Boolean)
    Select Case keyInfo.KeyCode
        Case vbKeyUp, vbKeyDown
            handled = True            ' the navigation keys
        Case ConsoleKey.KeyEnter, ConsoleKey.KeyEscape
            handled = True            ' these two members equal the virtual-key codes
    End Select
End Sub
```

### ConsoleMode
{: .no_toc }

<!-- test: TypesTests.ConsoleMode_And_ConsoleTextStyle_Values -->
Flags: **ModeNormal** (0), **ModeVirtualTerminal** (1), **ModeFullScreen** (2) and **ModeRaw** (4). No member of the package uses the enumeration; it is not the console mode that [**EnableVirtualTerminal**](cConsole#enablevirtualterminal) sets.
<!-- /test -->

### ConsoleTextStyle
{: .no_toc }

<!-- test: TypesTests.ConsoleMode_And_ConsoleTextStyle_Values, BufferTests.GetChar_StyleIsAlwaysNone -->
Flags: **StyleNone** (0), **StyleBold** (1), **StyleUnderline** (2) and **StyleReverse** (4). The enumeration is the type of the **Style** field of [**ConsoleCharInfo**](#consolecharinfo), and of a variable inside **cConsole**. Nothing sets or reads it: **GetChar** always returns **StyleNone**. Text styles come from the escape sequences of [**mConsoleStyle**](mConsoleStyle).
<!-- /test -->

### ThemeColorType
{: .no_toc }

The kinds of colour that a theme holds. It is declared in this package, and used by [**GetColor**](../TBMANLIB_ConsoleComponents/cConsoleTheme#getcolor) of the ConsoleComponents package.

<!-- test: TypesTests.ThemeColorType_Values -->
| Member | Value | Member | Value |
|---|---:|---|---:|
| **tcPrimary** | 1 | **tcBorder** | 10 |
| **tcSecondary** | 2 | **tcHeaderBackground** | 11 |
| **tcSuccess** | 3 | **tcHeaderForeground** | 12 |
| **tcWarning** | 4 | **tcSelectedBackground** | 13 |
| **tcError** | 5 | **tcSelectedForeground** | 14 |
| **tcInfo** | 6 | | |
| **tcMuted** | 7 | | |
| **tcBackground** | 8 | | |
| **tcForeground** | 9 | | |
<!-- /test -->

## Structures

### ConsoleCharInfo
{: .no_toc }

One cell of a [**cConsoleBuffer**](cConsoleBuffer), as [**GetChar**](cConsoleBuffer#getchar) returns it.

<!-- test: BufferTests.GetChar_OutsideTheGridReturnsTheEmptyStructure, BufferTests.GetChar_StyleIsAlwaysNone, BufferTests.SetChar_StoresTheFirstCharacterAndTheColours -->
| Field | Type | Meaning |
|---|---|---|
| **Char** | **String** | The character, one UTF-16 code unit; an empty string for a position outside the buffer. |
| **ForeColor** | [**ConsoleColor**](#consolecolor) | The text colour. |
| **BackColor** | [**ConsoleColor**](#consolecolor) | The background colour. |
| **Style** | [**ConsoleTextStyle**](#consoletextstyle) | Always 0. |
<!-- /test -->

### ConsoleEventInfo
{: .no_toc }

A structure for an event: **EventType** ([**ConsoleEventType**](#consoleeventtype)), **KeyInfo** ([**ConsoleKeyInfo**](#consolekeyinfo)), **MouseInfo** ([**ConsoleMouseInfo**](#consolemouseinfo)) and **NewSize** ([**ConsoleSize**](#consolesize)). No member of the package uses it.

### ConsoleKeyInfo
{: .no_toc }

A key press, as [**ReadKey**](cConsole#readkey), [**PeekEvent**](cConsole#peekevent) and the handler of [**OnKeyPress**](cConsole#onkeypress) deliver it.

<!-- test: ReadTests.ReadKey_ReturnsTheVirtualKeyCodeAndTheCharacter, ReadTests.ReadKey_ReportsTheLeftModifierKeys, ReadTests.ReadKey_ReportsTheRightModifierKeys, ReadTests.ReadKey_KeyWithoutACharacter_GivesTheCharacterWithCodeZero, TypesTests.ConsoleKeyInfo_EmptyStructure_HasNoKeyAndNoCharacter -->
| Field | Type | Meaning |
|---|---|---|
| **KeyCode** | **Long** | The Windows virtual-key code of the key. See [**ConsoleKey**](#consolekey). |
| **KeyChar** | **String** | The character that the key produced. A key without a character, such as an arrow key or Shift, gives the character with code 0. An empty structure, such as the result of a timeout, has an empty string. |
| **IsAltPressed** | **Boolean** | Alt, left or right, was down. |
| **IsCtrlPressed** | **Boolean** | Ctrl, left or right, was down. |
| **IsShiftPressed** | **Boolean** | Shift was down. |
<!-- /test -->

### ConsoleMouseInfo
{: .no_toc }

A mouse event, as the handler of [**OnMouseClick**](cConsole#onmouseclick) receives it.

<!-- test: EventTests.OnMouseClick_HandlerIsCalledForEveryMouseEvent -->
| Field | Type | Meaning |
|---|---|---|
| **Col**, **Row** | **Long** | The character cell under the pointer, counted from the top left of the screen buffer. |
| **Button** | **Long** | The `dwButtonState` value of the Windows event: a bit mask of the buttons that are down, 1 for the left button, 2 for the right button and 4 for the second button from the left, and 0 when none is down. For a turn of the wheel, Windows puts the direction and the distance of the turn in the upper 16 bits. |
| **IsDoubleClick** | **Boolean** | The event carries the double-click flag. |
<!-- /test -->

### ConsolePosition
{: .no_toc }

A position: **Col** and **Row**, both **Long**, counted from 0. [**GetCursorPosition**](cConsole#getcursorposition) returns one.

### ConsoleRect
{: .no_toc }

A rectangle of cells: **Left**, **Top**, **Right** and **Bottom**, all **Long**. The edges are inclusive, so the rectangle is `Right - Left + 1` cells wide and `Bottom - Top + 1` high. [**CenterRect**](cConsole#centerrect) and [**GetDirtyRect**](cConsoleBuffer#getdirtyrect) return one, and the layout members of the ConsoleComponents package use it.

### ConsoleSize
{: .no_toc }

A size: **Width** and **Height**, both **Long**, in cells. [**GetSize**](cConsole#getsize) and [**GetBufferSize**](cConsole#getbuffersize) return one.

## Functions

The functions are members of the module **mConsoleTypes**. They work on a [**ConsoleRect**](#consolerect), and are the only code of the module.

### ConsoleRect_Contains
{: .no_toc }

Tells whether a point lies in a rectangle.

Syntax: **ConsoleRect_Contains** ( *rect* , *x* , *y* ) **As Boolean**

*rect*
: *required* A [**ConsoleRect**](#consolerect).

*x*, *y*
: *required* **Long** values, the column and the row of the point.

<!-- test: TypesTests.ConsoleRect_Contains_EdgesBelongToTheRectangle -->
Returns **True** when `x >= rect.Left`, `x <= rect.Right`, `y >= rect.Top` and `y <= rect.Bottom`; the edges belong to the rectangle.
<!-- /test -->

### ConsoleRect_Create
{: .no_toc }

Makes a rectangle from four numbers.

Syntax: **ConsoleRect_Create** ( *left* , *top* , *right* , *bottom* ) **As ConsoleRect**

<!-- test: TypesTests.ConsoleRect_Create_ReturnsTheFourEdgesAsGiven -->
*left*, *top*, *right*, *bottom*
: *required* **Long** values, the edges, inclusive. Nothing is checked: a rectangle with *right* less than *left* is returned as given.
<!-- /test -->

### ConsoleRect_Height
{: .no_toc }

Returns the height of a rectangle.

Syntax: **ConsoleRect_Height** ( *rect* ) **As Long**

*rect*
: *required* A [**ConsoleRect**](#consolerect).

<!-- test: TypesTests.ConsoleRect_Width_And_Height_CountBothEdges -->
Returns `rect.Bottom - rect.Top + 1`.
<!-- /test -->

### ConsoleRect_Width
{: .no_toc }

Returns the width of a rectangle.

Syntax: **ConsoleRect_Width** ( *rect* ) **As Long**

*rect*
: *required* A [**ConsoleRect**](#consolerect).

<!-- test: TypesTests.ConsoleRect_Width_And_Height_CountBothEdges -->
Returns `rect.Right - rect.Left + 1`.
<!-- /test -->

## Handler types

The six types of the module **mConsoleDelegates** are delegates: the type of the address of a procedure. A program passes `AddressOf` and the name of a procedure of a module whose parameters match the type exactly. Four of them are the types of the handler properties of [**cConsole**](cConsole); the other two are not used by any member of the package.

### ConsoleCtrlHandler
{: .no_toc }

Syntax: **Delegate Function ConsoleCtrlHandler** ( **ByVal** *ctrlType* **As Long** ) **As Long**

The type of [**OnCtrlEvent**](cConsole#onctrlevent). Windows calls the procedure with the kind of event, on a thread of its own.

### ConsoleKeyHandler
{: .no_toc }

Syntax: **Delegate Sub ConsoleKeyHandler** ( **ByRef** *keyInfo* **As ConsoleKeyInfo** , **ByRef** *handled* **As Boolean** )

The type of [**OnKeyPress**](cConsole#onkeypress). *keyInfo* is the [**ConsoleKeyInfo**](#consolekeyinfo) of the key. The package does not read *handled* after the call.

### ConsoleMouseHandler
{: .no_toc }

Syntax: **Delegate Sub ConsoleMouseHandler** ( **ByRef** *mouseInfo* **As ConsoleMouseInfo** , **ByRef** *handled* **As Boolean** )

The type of [**OnMouseClick**](cConsole#onmouseclick).

### ConsoleRenderCallback
{: .no_toc }

Syntax: **Delegate Sub ConsoleRenderCallback** ( **ByVal** *buffer* **As cConsoleBuffer** )

Not used by any member. Meant, by its comment, as a procedure that draws in full-screen mode.

### ConsoleResizeHandler
{: .no_toc }

Syntax: **Delegate Sub ConsoleResizeHandler** ( **ByVal** *newWidth* **As Long** , **ByVal** *newHeight* **As Long** )

The type of [**OnResize**](cConsole#onresize).

### ConsoleTimerCallback
{: .no_toc }

Syntax: **Delegate Sub ConsoleTimerCallback** ( )

Not used by any member. Meant, by its comment, as a timer procedure.

## See Also

- [cConsole](cConsole) class -- the members that use these types
- [cConsoleBuffer](cConsoleBuffer) class
- [mConsoleStyle](mConsoleStyle) module -- text styles as escape sequences
