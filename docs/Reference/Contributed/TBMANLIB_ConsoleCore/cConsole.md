---
title: cConsole
parent: TBMANLIB_ConsoleCore Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleCore/cConsole
has_toc: false
---

# cConsole class
{: .no_toc }

Controls the console of a program: it writes text in colour, reads lines and keys, moves the cursor, changes the code pages and the virtual-terminal mode, and runs a full-screen mode that draws through a screen buffer and reports keyboard, mouse and window events.

A **cConsole** works on the standard input, output and error handles of the program, which it asks Windows for when it is created. Nearly every member is a thin layer over one or two functions of the Windows console API, and does not check whether the call worked. Each entry below names the functions it calls.

```tb check_build
Dim con As New cConsole
con.EnableUTF8
con.EnableVirtualTerminal

con.Title = "Report"
con.WriteLineColored "Done", ConsoleColor.Green
con.WriteAtColored 0, 2, "caf" & ChrW$(233), ConsoleColor.Yellow
con.WriteLine
con.Restore
```

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cConsole**. The page uses these terms: the *window* is the part of the screen buffer that the console window shows, and the *screen buffer* is the whole grid of character cells that Windows keeps for the console, which can be taller than the window. Columns and rows are counted from 0, and a position is a column and a row, in that order.

## Creating a cConsole

A **cConsole** is created with `New`. [**New**](#new) reads the standard handles and records the state that [**Restore**](#restore) puts back: the input and output modes, the colour attributes and the two code pages.

The class is predeclared, so the name `cConsole` can also be used as an object, as in `cConsole.WriteLine "Hello"`, without `New`.

A program should create one **cConsole**. Each object records the console state at the moment it is created, and puts that state back when it is restored. A second object created after the first one has changed the modes records the changed modes as the original ones.

The object restores the console when it is destroyed: its terminate event calls [**Restore**](#restore). A program that must put the console back at once, for example before it starts another program, calls **Restore** itself.

## Which project it needs

The package is meant for a console application: a project with [*Is Console Application*](../../../IDE/Project-Settings#is-console-application) set to **Yes**, as the **Standard EXE (Console App)** template does (see [Console Applications](../../../../Features/Project-Configuration/Project-Types#console-applications)). Such a program runs in the Command Prompt window it was started from, or in a console window of its own, and Windows gives it the three standard handles that **cConsole** uses.

A program with a window and no console can create a **cConsole**, but every call that reaches Windows fails; see [Without a console](#without-a-console). Such a program can call `AllocConsole`, which the module `mConsoleAPI` declares, before it creates the object: the program then has a console of its own, and the write members show their text in it.

## Without a console

The members that read or draw on the console depend on Windows handing the program a console. A program built as a GUI program has no standard handles: `GetStdHandle` returns 0 for all three, and Windows refuses each console call that **cConsole** makes.

The class checks the result of two functions only. [**EnableVirtualTerminal**](#enablevirtualterminal) returns **False** when `SetConsoleMode` fails for the output handle, and [**New**](#new), [**Clear**](#clear), [**ClearLine**](#clearline), [**GetSize**](#getsize), [**GetBufferSize**](#getbuffersize) and [**GetCursorPosition**](#getcursorposition) look at the result of `GetConsoleScreenBufferInfo`. Every other call is unchecked: a failed call raises no error, changes nothing, and leaves the value it should have filled in at its starting value, which is 0, **False** or an empty string. The table lists what a program without a console sees.

| Member | Without a console |
|---|---|
| [**New**](#new) | Succeeds. The size is taken as 80 columns by 25 rows, and the original colours as Gray on Black. |
| [**WriteTo**](#writeto) and the other write members | Write nothing. |
| [**Width**](#width), [**Height**](#height), [**GetSize**](#getsize) | 80 and 25. |
| [**GetBufferSize**](#getbuffersize) | 80 by 300. |
| [**GetCursorPosition**](#getcursorposition) | Column 0, row 0. |
| [**CursorVisible**](#cursorvisible), [**CursorSize**](#cursorsize) | **False** and 0. |
| [**Title**](#title) | An empty string. |
| [**WindowHandle**](#windowhandle) | 0. |
| [**InputCodePage**](#inputcodepage), [**OutputCodePage**](#outputcodepage) | 0. |
| [**EnableVirtualTerminal**](#enablevirtualterminal) | **False**. |
| [**ReadLine**](#readline) | An empty string, at once. |
| [**KeyAvailable**](#keyavailable), [**PeekEvent**](#peekevent) | **False**, and an empty [**ConsoleKeyInfo**](Types#consolekeyinfo). |
| [**ReadKeyTimeout**](#readkeytimeout) | Returns the empty structure when the time is over. |
| [**ReadKey**](#readkey), [**ReadPassword**](#readpassword) | Do not return; see [Known problems](#known-problems-in-version-0000). |
| [**EnterFullScreenMode**](#enterfullscreenmode) | Creates the 80 by 25 [**cConsoleBuffer**](cConsoleBuffer); [**Refresh**](#refresh) writes nothing. |
| [**IsKeyPressed**](#iskeypressed) | Works, since it does not use the console. |

A buffer made by [**EnterFullScreenMode**](#enterfullscreenmode) is an ordinary in-memory grid, so a program without a console can still draw into it and read the cells back with [**GetChar**](cConsoleBuffer#getchar).

### Redirected input and output

A console application can also have its output sent to a file or a pipe (`mytool > out.txt`) or its input read from one. The members write and read with `WriteConsoleW`, `ReadConsoleW` and `ReadConsoleInputW`, which work only on a console handle. With the output redirected, the write members therefore write nothing: after [**WriteLine**](#writeline) and [**WriteErrorLine**](#writeerrorline) the files are empty. They raise no error, since they do not check the result; the template's `Console.WriteLine` raises error 5 in the same case (see [Writing a command-line tool](../../../../Features/Project-Configuration/Project-Types#writing-a-command-line-tool-output-exit-code-and-arguments)). The members that need a screen buffer fail as they do without a console: [**GetSize**](#getsize) gives 80 by 25 and [**EnableVirtualTerminal**](#enablevirtualterminal) returns **False**.

A program that must work with redirected output writes with `WriteFile` in that case, as the page cited above shows, and uses **cConsole** only when the handles are console handles.

With the input read from the null device or from a file, [**ReadLine**](#readline) returns an empty string at once and [**KeyAvailable**](#keyavailable) is **False**. [**ReadKey**](#readkey) does not return.

## Known problems in version 0.0.0.0

> [!WARNING]
> In version 0.0.0.0, [**ReadKey**](#readkey) and [**ReadPassword**](#readpassword) never return when the program has no console input: `ReadKey` loops until `ReadConsoleInputW` delivers a key-down event, and the call fails at once when the program has no console or its input is not a console. A comparison of a key with a member of the [**ConsoleKey**](Types#consolekey) enumeration is true for the wrong key and raises no error: [**KeyCode**](Types#consolekeyinfo) holds Windows virtual-key codes, but the arrow, navigation and function keys of **ConsoleKey** have other values, so `keyInfo.KeyCode = ConsoleKey.KeyUp` is false for the Up Arrow key (38) and true for the H key (72).

- **KeyAvailable and the key-up events.** [**KeyAvailable**](#keyavailable) is true while the input queue holds any event, including the event for a key that was released, so a loop that tests it and then calls [**ReadKey**](#readkey) can block in **ReadKey** until the next key press.
- **The colours of the Write members.** [**WriteColored**](#writecolored), [**WriteLineColored**](#writelinecolored) and [**WriteAtColored**](#writeatcolored) use a black background unless one is given, and put back the colours that the object tracks, which are Gray on Black until a property sets others, and not the colours that the console had.
- **Full-screen drawing.** [**Refresh**](#refresh) writes the buffer at the top left of the screen buffer, not of the window; see [**EnterFullScreenMode**](#enterfullscreenmode). A negative column or row in the buffer's dirty rectangle makes the next **Refresh** draw nothing; see [The dirty rectangle](cConsoleBuffer#the-dirty-rectangle).
- **The handlers.** A handler set with [**OnCtrlEvent**](#onctrlevent) cannot be removed again, and the compiler refuses `0` and **Nothing** for the other three handler properties, so none can be cleared.
- **The resize sizes.** [**OnResize**](#onresize) is given the size of the screen buffer, and not of the window that [**Width**](#width) and [**Height**](#height) report.

## Constructor

### New
{: .no_toc }

Creates a **cConsole** and records the state of the console.

Syntax: **New cConsole** [ ( *inputBufferSize* ) ]

*inputBufferSize*
: *optional* A **Long**, the number of characters that [**ReadLine**](#readline) can read in one call. The default is 4096.

The constructor asks Windows for the three standard handles and for the console window, saves the input and output modes, the colour attributes, the width of the screen buffer and the height of the window, and the two code pages, and sets the tracked colours to Gray on Black. A negative *inputBufferSize* raises error 5, *Invalid procedure call or argument*, since the constructor makes the read buffer with `String$`.

Calls `GetStdHandle` (three times), `GetConsoleWindow`, `GetConsoleMode` (twice), `GetConsoleScreenBufferInfo`, `GetConsoleCP` and `GetConsoleOutputCP`. Without a console, the size is taken as 80 by 25 and the original colours as Gray on Black.

## Properties

### BackColor
{: .no_toc }

The background colour that the object tracks, and that the write members use. A [**ConsoleColor**](Types#consolecolor).

Syntax: *object*.**BackColor** [ **=** *value* ]

*value*
: A [**ConsoleColor**](Types#consolecolor).

Setting the property stores the value and applies the pair of [**ForeColor**](#forecolor) and **BackColor** to the console. Reading it returns the stored value, which is **Black** at the start, and not a colour read from the console.

Calls `SetConsoleTextAttribute` when it is set. Without a console, nothing is applied.

### Buffer
{: .no_toc }

The screen buffer of the full-screen mode. A [**cConsoleBuffer**](cConsoleBuffer), read-only.

Syntax: *object*.**Buffer**

Returns the buffer that [**EnterFullScreenMode**](#enterfullscreenmode) made, and **Nothing** when the object is not in full-screen mode. A component object of the [ConsoleComponents](../TBMANLIB_ConsoleComponents/) package keeps the buffer that this property returned when it was created, so it must be created after **EnterFullScreenMode**.

### CursorSize
{: .no_toc }

The height of the cursor, as a percentage of the character cell. **Long**, read/write.

Syntax: *object*.**CursorSize** [ **=** *value* ]

*value*
: A **Long**. A value below 1 is stored as 1, and a value above 100 as 100.

Calls `GetConsoleCursorInfo`, and `SetConsoleCursorInfo` when it is set. Without a console, reading it gives 0.

### CursorVisible
{: .no_toc }

Whether the cursor is shown. **Boolean**, read/write.

Syntax: *object*.**CursorVisible** [ **=** *value* ]

*value*
: A **Boolean**.

Reading the property asks the console each time. [**EnterFullScreenMode**](#enterfullscreenmode) hides the cursor and [**ExitFullScreenMode**](#exitfullscreenmode) shows it, whatever it was before.

Calls `GetConsoleCursorInfo`, and `SetConsoleCursorInfo` when it is set. Without a console, reading it gives **False**.

### ForeColor
{: .no_toc }

The text colour that the object tracks, and that the write members use. A [**ConsoleColor**](Types#consolecolor).

Syntax: *object*.**ForeColor** [ **=** *value* ]

*value*
: A [**ConsoleColor**](Types#consolecolor).

Works as [**BackColor**](#backcolor). The stored value is **Gray** at the start. Calls `SetConsoleTextAttribute` when it is set.

### FPS
{: .no_toc }

An estimate of the frames drawn per second. **Double**, read-only.

Syntax: *object*.**FPS**

The value is the number of calls of [**Refresh**](#refresh) and [**RefreshAll**](#refreshall) since the start of the current count, multiplied by 1000 and divided by the milliseconds since then. It is 0 before the first call. **Refresh** starts a new count when it finds that a second has passed since the start of the count, and **RefreshAll** only adds to the count, so a program that calls only **RefreshAll** gets the average since its first call. When the program stops drawing, the value falls, since the time keeps running. The clock is `GetTickCount`, whose steps are about 15 milliseconds.

### FullScreenMode
{: .no_toc }

Whether the object is in full-screen mode. **Boolean**, read-only.

Syntax: *object*.**FullScreenMode**

**True** between [**EnterFullScreenMode**](#enterfullscreenmode) and [**ExitFullScreenMode**](#exitfullscreenmode).

### Height
{: .no_toc }

The number of rows of the console window. **Long**, read-only.

Syntax: *object*.**Height**

The height of the window, and not of the screen buffer; [**GetBufferSize**](#getbuffersize) returns that. Each read calls [**GetSize**](#getsize). Without a console it is 25.

### InputCodePage
{: .no_toc }

The code page that the console uses for input. **Long**, read/write.

Syntax: *object*.**InputCodePage** [ **=** *value* ]

*value*
: A **Long**, a code page number such as 65001 for UTF-8.

Calls `GetConsoleCP`, and `SetConsoleCP` when it is set. A value that Windows refuses is ignored without an error. [**Restore**](#restore) and [**DisableUTF8**](#disableutf8) put back the code page that the console had when the object was created. Without a console, reading it gives 0.

### LastRenderTime
{: .no_toc }

The time that the last [**Refresh**](#refresh) or [**RefreshAll**](#refreshall) took, in milliseconds. **Long**, read-only.

Syntax: *object*.**LastRenderTime**

The value is the difference of two `GetTickCount` readings, so it is a multiple of the clock step, about 15 milliseconds, and is often 0 for a small draw. It is 0 until the first draw.

### OnCtrlEvent
{: .no_toc }

Sets the procedure that Windows calls when the user presses Ctrl+C or Ctrl+Break, closes the console window, logs off or shuts down. Write-only.

Syntax: *object*.**OnCtrlEvent** **=** *handler*

*handler*
: A [**ConsoleCtrlHandler**](Types#consolectrlhandler), the address of a procedure of a module with one **Long** parameter that returns a **Long**, as in `con.OnCtrlEvent = AddressOf CtrlHandler`.

The procedure receives the kind of event in *ctrlType*, one of the constants `CTRL_C_EVENT` (0), `CTRL_BREAK_EVENT` (1), `CTRL_CLOSE_EVENT` (2), `CTRL_LOGOFF_EVENT` (5) and `CTRL_SHUTDOWN_EVENT` (6) of the module `mConsoleAPI`. It returns a non-zero value to say that it handled the event, and 0 to pass the event to the next handler; the default handler of Windows ends the program.

```tb check_build slot=module
Public Function CtrlHandler(ByVal ctrlType As Long) As Long
    If ctrlType = CTRL_C_EVENT Then
        CtrlHandler = 1        ' handled: the program goes on
    End If
End Function

Public Sub Setup(ByVal con As cConsole)
    con.OnCtrlEvent = AddressOf CtrlHandler
End Sub
```

Windows calls the procedure on a thread of its own, not on the thread that runs the program, so it should do little: set a flag that the main loop reads.

The property registers the address with `SetConsoleCtrlHandler`. The registration is not removed again: assigning another procedure adds a second registration and leaves the first, [**Restore**](#restore) does not remove it, and the code never calls `SetConsoleCtrlHandler` with the remove option. [**ProcessEvents**](#processevents) does not call the procedure; only Windows does.

### OnKeyPress
{: .no_toc }

Sets the procedure that [**ProcessEvents**](#processevents) calls for each key that is pressed. Write-only.

Syntax: *object*.**OnKeyPress** **=** *handler*

*handler*
: A [**ConsoleKeyHandler**](Types#consolekeyhandler), the address of a procedure of a module with the parameters `ByRef keyInfo As ConsoleKeyInfo, ByRef handled As Boolean`.

**ProcessEvents** calls the procedure once for each key-down event, with the key in *keyInfo*, including the keys that are only modifiers, such as Shift. The key-up events are not passed. The value that the procedure stores in *handled* is not read. While no handler is set, **ProcessEvents** leaves the key events in the queue, so that [**ReadKey**](#readkey) and [**ReadLine**](#readline) can read them. Once a handler is set it cannot be removed: the compiler refuses `0` and **Nothing** for the property.

```tb check_build slot=module
Public Sub OnKey(ByRef keyInfo As ConsoleKeyInfo, ByRef handled As Boolean)
    If keyInfo.IsCtrlPressed And keyInfo.KeyCode = vbKeyQ Then
        handled = True
    End If
End Sub

Public Sub Setup(ByVal con As cConsole)
    con.OnKeyPress = AddressOf OnKey
End Sub
```

### OnMouseClick
{: .no_toc }

Sets the procedure that [**ProcessEvents**](#processevents) calls for each mouse event. Write-only.

Syntax: *object*.**OnMouseClick** **=** *handler*

*handler*
: A [**ConsoleMouseHandler**](Types#consolemousehandler), the address of a procedure of a module with the parameters `ByRef mouseInfo As ConsoleMouseInfo, ByRef handled As Boolean`.

Setting a handler also changes the input mode of the console: it turns on mouse input, turns on the extended flags, and turns off quick-edit mode, so that the console passes mouse events to the program instead of selecting text with them. [**DisableVirtualTerminal**](#disablevirtualterminal) and [**Restore**](#restore) put the original mode back, and so does [**ExitFullScreenMode**](#exitfullscreenmode) while the full-screen mode is on.

Despite the name, the procedure is called for every mouse event: a move, a button press, a button release and a turn of the wheel, as well as a double click. *mouseInfo* holds the position in **Col** and **Row**, the buttons that are down in **Button** (a bit mask of the Windows `dwButtonState` field: 1 for the left button, 2 for the right button, and 0 when none is down), and **IsDoubleClick**, which is true when the event carries the double-click flag. The program has to compare **Button** with its previous value to find a click.

### OnResize
{: .no_toc }

Sets the procedure that [**ProcessEvents**](#processevents) calls when the size of the console changes. Write-only.

Syntax: *object*.**OnResize** **=** *handler*

*handler*
: A [**ConsoleResizeHandler**](Types#consoleresizehandler), the address of a procedure of a module with the parameters `ByVal newWidth As Long, ByVal newHeight As Long`.

Windows reports a change of the size only while the input mode has the window-input flag, which [**EnterFullScreenMode**](#enterfullscreenmode) turns on and nothing else in the class does. Outside full-screen mode the handler is not called. When an event arrives and the size differs from the one the object last saw, the object resizes its buffer to it, which discards the contents of the buffer, and then calls the handler; the program draws the buffer again.

The two numbers are copied from the event record, which holds the new size of the screen buffer. They are not read from the window, whose size [**Width**](#width) and [**Height**](#height) report, and the two can differ, since the screen buffer can be taller than the window.

### OutputCodePage
{: .no_toc }

The code page that the console uses for output. **Long**, read/write.

Syntax: *object*.**OutputCodePage** [ **=** *value* ]

*value*
: A **Long**, a code page number such as 65001 for UTF-8.

Works as [**InputCodePage**](#inputcodepage), with `GetConsoleOutputCP` and `SetConsoleOutputCP`.

### Title
{: .no_toc }

The title of the console window. **String**, read/write.

Syntax: *object*.**Title** [ **=** *value* ]

*value*
: A **String**.

Reading it returns up to 259 characters. Calls `GetConsoleTitleW`, and `SetConsoleTitleW` when it is set. Without a console, reading it gives an empty string and setting it does nothing.

### VirtualTerminalEnabled
{: .no_toc }

Whether [**EnableVirtualTerminal**](#enablevirtualterminal) turned the virtual-terminal mode on. **Boolean**, read-only.

Syntax: *object*.**VirtualTerminalEnabled**

The value comes from the object and not from the console. It is **False** when the console had the mode on already, until the program calls **EnableVirtualTerminal**.

### Width
{: .no_toc }

The number of columns of the console window. **Long**, read-only.

Syntax: *object*.**Width**

The width of the window, and not of the screen buffer. Each read calls [**GetSize**](#getsize). Without a console it is 80.

### WindowHandle
{: .no_toc }

The window handle of the console, as `GetConsoleWindow` returned it when the object was created. **LongPtr**, read-only.

Syntax: *object*.**WindowHandle**

It is 0 when the program had no console window at that time.

## Methods

### Beep
{: .no_toc }

Writes the bell character, code 7.

Syntax: *object*.**Beep**

The method calls [**WriteTo**](#writeto) with `Chr$(7)`. Whether the console makes a sound, and which, is the console's choice; the method does not call the Windows `Beep` function.

### CenterRect
{: .no_toc }

Returns a rectangle of a given size, centred in the window.

Syntax: *object*.**CenterRect** ( *contentWidth* , *contentHeight* ) **As ConsoleRect**

*contentWidth*
: *required* A **Long**, the width in columns.

*contentHeight*
: *required* A **Long**, the height in rows.

Returns a [**ConsoleRect**](Types#consolerect) whose **Left** is [**CenterX**](#centerx) of the width and **Top** is [**CenterY**](#centery) of the height, with **Right** and **Bottom** set so that it has the given size. A rectangle larger than the window has negative **Left** and **Top**. Uses the size of the window, 80 by 25 without a console.

### CenterX
{: .no_toc }

Returns the column at which text of a given width is centred in the window.

Syntax: *object*.**CenterX** ( *textWidth* )

*textWidth*
: *required* A **Long**, the width in columns.

Returns `(Width - textWidth) \ 2`, a **Long**; it is negative when the text is wider than the window.

### CenterY
{: .no_toc }

Returns the row at which content of a given height is centred in the window.

Syntax: *object*.**CenterY** ( *textHeight* )

*textHeight*
: *required* A **Long**, the height in rows.

Returns `(Height - textHeight) \ 2`, a **Long**.

### Clear
{: .no_toc }

Fills the screen buffer with spaces in the tracked colours and moves the cursor to the top left.

Syntax: *object*.**Clear**

The method fills the whole screen buffer, not only the part that the window shows, with a space in the colours of [**ForeColor**](#forecolor) and [**BackColor**](#backcolor), and then moves the cursor to column 0, row 0 of the screen buffer. When the window shows another part of the buffer, the cursor moves out of sight. In full-screen mode it does not clear the [**Buffer**](#buffer); [**Clear**](cConsoleBuffer#clear) of the buffer does that.

Calls `GetConsoleScreenBufferInfo`, `FillConsoleOutputCharacterW`, `FillConsoleOutputAttribute` and `SetConsoleCursorPosition`. Without a console, the first call fails and the method returns at once.

### ClearLine
{: .no_toc }

Fills the current line, from the cursor to the end of the line, with spaces in the tracked colours.

Syntax: *object*.**ClearLine**

The cursor does not move. Calls `GetConsoleScreenBufferInfo`, `FillConsoleOutputCharacterW` and `FillConsoleOutputAttribute`. Without a console, the method returns at once.

### DisableUTF8
{: .no_toc }

Puts back the code pages that the console had when the object was created.

Syntax: *object*.**DisableUTF8**

Despite its name, the method does not switch to a particular code page: it sets the input and the output code page to the saved values, whatever they are now. Calls `SetConsoleCP` and `SetConsoleOutputCP`.

### DisableVirtualTerminal
{: .no_toc }

Puts back the input and output modes that the console had when the object was created.

Syntax: *object*.**DisableVirtualTerminal**

The method restores both modes as they were, so it also undoes other changes of the input mode, such as the window input that [**EnterFullScreenMode**](#enterfullscreenmode) turns on and the mouse input that [**OnMouseClick**](#onmouseclick) turns on. It sets [**VirtualTerminalEnabled**](#virtualterminalenabled) to **False**. Calls `SetConsoleMode` twice.

### DrawBox
{: .no_toc }

Draws a rectangle of line-drawing characters directly on the console.

Syntax: *object*.**DrawBox** ( *left* , *top* , *right* , *bottom* [ , *doubleLine* ] )

*left*, *top*
: *required* **Long** values, the column and the row of the upper left corner.

*right*, *bottom*
: *required* **Long** values, the column and the row of the lower right corner.

*doubleLine*
: *optional* A **Boolean**. **True** draws with the double-line characters (U+2554, U+2557, U+255A, U+255D, U+2550, U+2551), and **False**, the default, with the single-line ones (U+250C, U+2510, U+2514, U+2518, U+2500, U+2502).

The box is drawn with [**WriteAt**](#writeat), in the current colour attributes of the console; the inside is left as it is. *right* has to be greater than *left*: for *right* equal to or less than *left* the method raises error 5, *Invalid procedure call or argument*, since the length of the horizontal line is negative, and it raises it after it has written the four corners.

The method draws on the console, not on the full-screen [**Buffer**](#buffer). To draw a box on the buffer use [**DrawBox**](cConsoleBuffer#drawbox) of the buffer, which takes the colours as parameters.

Calls `SetConsoleCursorPosition` and `WriteConsoleW`, through **WriteAt**. A position that is not in the screen buffer is ignored by Windows. Without a console, nothing is drawn.

### DrawProgressBar
{: .no_toc }

Draws a bar with a percentage directly on the console.

Syntax: *object*.**DrawProgressBar** ( *col* , *row* , *width* , *percent* [ , *usedColor* [ , *freeColor* ] ] )

*col*, *row*
: *required* **Long** values, the column and the row of the left bracket.

*width*
: *required* A **Long**, the number of cells between the brackets.

*percent*
: *required* A **Double**. A value below 0 is taken as 0, and a value above 100 as 100.

*usedColor*
: *optional* A [**ConsoleColor**](Types#consolecolor), the colour of the filled part. The default is **Green**.

*freeColor*
: *optional* A [**ConsoleColor**](Types#consolecolor), the colour of the empty part. The default is **DarkGray**.

Writes `[`, then `CLng(percent / 100 * width)` full blocks (U+2588) in *usedColor*, then the rest as light-shade blocks (U+2591) in *freeColor*, and then `] ` and the percentage rounded to a whole number with a percent sign. The brackets and the percentage are in the current colour attributes of the console; the blocks have a black background. The whole line is *width* + 4 cells plus the digits of the percentage. A negative *width* raises error 5. The cursor is left after the text. The conversion rounds half to even: a width of 10 and 25 percent gives 2 blocks.

Calls `SetConsoleCursorPosition` and `WriteConsoleW`. Without a console, nothing is drawn.

### EnableUTF8
{: .no_toc }

Sets the input and the output code page of the console to UTF-8, code page 65001.

Syntax: *object*.**EnableUTF8**

Calls `SetConsoleCP` and `SetConsoleOutputCP`. The write and read members of this class use the wide-character functions of Windows, which do not depend on the code page, so the setting does not change what they put in the screen buffer: a euro sign written with [**WriteTo**](#writeto) is stored as U+20AC with the output code page 437 and with 65001. The setting matters for text that reaches the console in another way, such as the output of a program that this program starts.

The code pages are put back by [**DisableUTF8**](#disableutf8) and [**Restore**](#restore). Without a console, the calls fail without an error.

### EnableVirtualTerminal
{: .no_toc }

Turns on the processing of escape sequences, so that the strings of [mConsoleStyle](mConsoleStyle) change colours and move the cursor.

Syntax: *object*.**EnableVirtualTerminal** **As Boolean**

Adds `ENABLE_VIRTUAL_TERMINAL_PROCESSING` to the output mode. When Windows refuses, for example on a system or a console that does not have the mode, or when there is no console, the method returns **False** and changes nothing else. Otherwise it adds `ENABLE_VIRTUAL_TERMINAL_INPUT` to the input mode, ignoring whether that call worked, sets [**VirtualTerminalEnabled**](#virtualterminalenabled) and returns **True**.

[**ReadKey**](#readkey) is not affected by the input flag, since it turns the input mode off while it waits.

The mode is put back by [**DisableVirtualTerminal**](#disablevirtualterminal) and [**Restore**](#restore). Calls `GetConsoleMode` and `SetConsoleMode` for both handles.

### EnterFullScreenMode
{: .no_toc }

Starts the full-screen mode: it makes an in-memory screen buffer of the size of the window, hides the cursor and turns on window input.

Syntax: *object*.**EnterFullScreenMode**

The method does nothing when the mode is already on. It creates a [**cConsoleBuffer**](cConsoleBuffer) with the width and height of the window, which [**Buffer**](#buffer) returns; sets [**CursorVisible**](#cursorvisible) to **False**; and adds `ENABLE_WINDOW_INPUT` to the input mode, so that Windows reports a change of size.

Despite the name, the window is not enlarged, the console does not switch to an alternate screen buffer, and the text that is on the screen is neither saved nor cleared. The program draws into the buffer with its [methods](cConsoleBuffer), and [**Refresh**](#refresh) copies the changed cells to the console. [**ExitFullScreenMode**](#exitfullscreenmode) ends the mode and leaves the last picture on the screen.

[**Refresh**](#refresh) writes the cells of the buffer to the rows 0 to *Height* - 1 of the screen buffer, from column 0. When the screen buffer is taller than the window and the window shows another part of it, as it does in a classic console window that has scrolled, the picture is drawn out of sight.

Calls `GetConsoleScreenBufferInfo`, `GetConsoleCursorInfo`, `SetConsoleCursorInfo`, `GetConsoleMode` and `SetConsoleMode`. Without a console, the buffer is 80 by 25.

```tb check_build slot=module
Private m_Running As Boolean

Public Sub OnKey(ByRef keyInfo As ConsoleKeyInfo, ByRef handled As Boolean)
    If keyInfo.KeyCode = ConsoleKey.KeyEscape Then m_Running = False
End Sub

Public Sub RunDemo()
    Dim con As New cConsole
    Dim n As Long

    con.OnKeyPress = AddressOf OnKey
    con.EnterFullScreenMode
    m_Running = True

    Do While m_Running
        con.ProcessEvents
        n += 1
        con.Buffer.Clear
        con.Buffer.WriteAt 2, 1, "Press Escape to quit. Frame " & n, ConsoleColor.Yellow, ConsoleColor.Black
        con.Refresh
        mConsoleAPI.Sleep 30
    Loop

    con.ExitFullScreenMode
    con.Restore
End Sub
```

### ExitFullScreenMode
{: .no_toc }

Ends the full-screen mode.

Syntax: *object*.**ExitFullScreenMode**

The method does nothing when the mode is off. It releases the buffer, so that [**Buffer**](#buffer) returns **Nothing** again, shows the cursor, and sets the input mode to the one saved when the object was created, which also turns off the mouse input that [**OnMouseClick**](#onmouseclick) turned on. An object that was made with the old buffer, such as a component of the ConsoleComponents package, still holds it, and the console no longer shows it. The screen is not cleared. Calls `SetConsoleMode` and `SetConsoleCursorInfo`.

### FlushInput
{: .no_toc }

Discards the events that are waiting in the input queue.

Syntax: *object*.**FlushInput**

All events are discarded: keys, mouse events and size events. Calls `FlushConsoleInputBuffer`.

### GetBufferSize
{: .no_toc }

Returns the size of the screen buffer.

Syntax: *object*.**GetBufferSize** **As ConsoleSize**

Returns a [**ConsoleSize**](Types#consolesize) with the columns and rows of the whole screen buffer, which can be larger than the window. Calls `GetConsoleScreenBufferInfo`. Without a console, it is 80 by 300.

### GetCursorPosition
{: .no_toc }

Returns the position of the cursor.

Syntax: *object*.**GetCursorPosition** **As ConsolePosition**

Returns a [**ConsolePosition**](Types#consoleposition). The column and the row are counted from the top left of the screen buffer, not of the window. Calls `GetConsoleScreenBufferInfo`. Without a console, it is column 0, row 0.

### GetSize
{: .no_toc }

Returns the size of the console window.

Syntax: *object*.**GetSize** **As ConsoleSize**

Returns a [**ConsoleSize**](Types#consolesize) with the columns and rows of the window, from the window rectangle that Windows reports. [**Width**](#width) and [**Height**](#height) return its two fields. Calls `GetConsoleScreenBufferInfo`. Without a console, it is 80 by 25.

### IsKeyPressed
{: .no_toc }

Tells whether a key is down at this moment.

Syntax: *object*.**IsKeyPressed** ( *keyCode* ) **As Boolean**

*keyCode*
: *required* A **Long**, a Windows virtual-key code, such as 27 for Escape or 38 for the Up Arrow.

Returns **True** when the most significant bit of the result of `GetAsyncKeyState` is set. The function asks Windows for the state of the keyboard, so it does not read the console's input queue, does not remove any event from it, and does not depend on which window has the focus. It works without a console.

### KeyAvailable
{: .no_toc }

Tells whether the input queue holds an event.

Syntax: *object*.**KeyAvailable** **As Boolean**

Returns **True** when the queue holds one or more events. The queue holds every kind of input: key presses and key releases, mouse events, focus events and size events, so a **True** result does not mean that a key is waiting. After a key is read, the event for its release is still in the queue, and **KeyAvailable** is true until a following [**ReadKey**](#readkey) or [**FlushInput**](#flushinput) removes it.

Calls `GetNumberOfConsoleInputEvents`. Without a console, it returns **False**.

### PeekEvent
{: .no_toc }

Returns the first event in the queue, when it is a key press, without removing it.

Syntax: *object*.**PeekEvent** **As ConsoleKeyInfo**

Returns the [**ConsoleKeyInfo**](Types#consolekeyinfo) of the first event when that event is a key-down event. For any other first event, a key release, a mouse event or an empty queue, it returns an empty structure: **KeyCode** 0 and an empty **KeyChar**. It does not look past the first event. Calls `PeekConsoleInputW`.

### PercentX
{: .no_toc }

Returns the column that lies a given percentage across the window.

Syntax: *object*.**PercentX** ( *percent* )

*percent*
: *required* A **Double**. A value below 0 is taken as 0, and a value above 100 as 100.

Returns `CLng(Width * percent / 100)`, a **Long**, rounded half to even.

### PercentY
{: .no_toc }

Returns the row that lies a given percentage down the window.

Syntax: *object*.**PercentY** ( *percent* )

*percent*
: *required* A **Double**. A value below 0 is taken as 0, and a value above 100 as 100.

Returns `CLng(Height * percent / 100)`, a **Long**.

### ProcessEvents
{: .no_toc }

Reads the events in the input queue and calls the handlers.

Syntax: *object*.**ProcessEvents**

A full-screen program calls this method once in each pass of its main loop. It takes the events from the queue in order, while the queue is not empty, and treats each by its kind.

| Event | Handling |
|---|---|
| Size change | Always taken from the queue. It resizes the full-screen buffer and calls [**OnResize**](#onresize), as described there. |
| Key | Taken from the queue and passed to [**OnKeyPress**](#onkeypress) when a key handler is set. Without a handler the method stops at once and leaves this event and everything behind it in the queue. |
| Mouse | Taken from the queue, and passed to [**OnMouseClick**](#onmouseclick) when a mouse handler is set. |
| Any other | Taken from the queue and dropped. |

A program that wants to read keys with [**ReadKey**](#readkey) or [**ReadLine**](#readline) therefore sets no key handler. A queue that holds a key event for which nobody asks stops the processing of the size and mouse events behind it.

The method calls `GetNumberOfConsoleInputEvents` (through [**KeyAvailable**](#keyavailable)), `PeekConsoleInputW` and `ReadConsoleInputW`. Without a console, **KeyAvailable** is **False** and nothing happens.

### ReadKey
{: .no_toc }

Waits for a key press and returns it.

Syntax: *object*.**ReadKey** [ ( *intercept* ) ] **As ConsoleKeyInfo**

*intercept*
: *optional* A **Boolean**. When it is **False**, the default, the character of the key is also written to the console. **True** writes nothing.

Returns a [**ConsoleKeyInfo**](Types#consolekeyinfo) for the first key-down event. **KeyCode** is the Windows virtual-key code, and **KeyChar** the character of the key, or the character with code 0 when the key has none, such as an arrow key. The three flags say whether Alt, Ctrl and Shift were down. Any key-down event counts, including the keys that are only modifiers, so a press of Shift is returned as **KeyCode** 16. Other events are taken from the queue and dropped while the method waits, and the release of a key is ignored. A key that is held down gives one result for each repeat.

While it waits, the method sets the input mode to 0 and puts the old mode back before it returns. With no mode flags the console does not echo the key, does not edit a line, and does not turn Ctrl+C into an interruption. When *intercept* is **False** the method writes **KeyChar** itself with [**WriteTo**](#writeto), even when it is the character with code 0.

Calls `GetConsoleMode`, `SetConsoleMode` (twice) and `ReadConsoleInputW`. Without a console, or with the input redirected, `ReadConsoleInputW` fails at once and the method never returns; see [Known problems](#known-problems-in-version-0000).

```tb check_build
Dim con As New cConsole
Dim key As ConsoleKeyInfo

con.WriteTo "Press a key: "
key = con.ReadKey(True)
con.WriteLine
con.WriteLine "Key code " & key.KeyCode & ", character " & AscW(key.KeyChar)
```

### ReadKeyTimeout
{: .no_toc }

Waits for a key press for a given time.

Syntax: *object*.**ReadKeyTimeout** ( *timeoutMs* [ , *intercept* ] ) **As ConsoleKeyInfo**

*timeoutMs*
: *required* A **Long**, the time to wait in milliseconds.

*intercept*
: *optional* A **Boolean**, as for [**ReadKey**](#readkey).

The method asks [**KeyAvailable**](#keyavailable) every millisecond (it calls `Sleep` between the asks) until the time is over. As soon as the queue holds any event it returns [**ReadKey**](#readkey). When the time is over it returns an empty structure, with **KeyCode** 0.

Since **KeyAvailable** is true for any event, a pending event that is not a key press, such as a key release, makes **ReadKey** wait for the next key press with no time limit. Calls `GetNumberOfConsoleInputEvents`, `Sleep`, `GetTickCount` and the functions of **ReadKey**. Without a console, it returns the empty structure after the time.

### ReadLine
{: .no_toc }

Reads a line of text.

Syntax: *object*.**ReadLine** [ ( *prompt* ) ] **As String**

*prompt*
: *optional* A **String**, written with [**WriteTo**](#writeto) before the console reads. The default is an empty string.

Waits in the console's line mode, with its echo and editing, until the user presses Enter, and returns the text without the carriage return and the line feed (all of them are removed). At most the number of characters of the read buffer (see [**New**](#new)) is read in one call. Calls `ReadConsoleW`. When the console is not in line mode, the result is that of the current mode. Without a console, or with the input redirected, `ReadConsoleW` fails and the method returns an empty string at once.

```tb check_build
Dim con As New cConsole
Dim userName As String

userName = con.ReadLine("Name: ")
con.WriteLineF "Hello, {0}.", userName
```

### ReadPassword
{: .no_toc }

Reads a line of text and shows a mask character for each key.

Syntax: *object*.**ReadPassword** ( [ *prompt* [ , *maskChar* ] ] ) **As String**

*prompt*
: *optional* A **String**, written before the input. The default is an empty string.

*maskChar*
: *optional* A **String**, written once for each character typed. The default is `*`. An empty string shows nothing.

Reads with [**ReadKey**](#readkey), with the echo off. Enter ends the input and writes a line break. Backspace takes off the last character of the result and writes a backspace, a space and a backspace, which erases one cell. That is one cell even when *maskChar* has more than one character, and when *maskChar* is empty it is a cell of the prompt, since no mask was written. Escape cancels: the method returns an empty string. A key whose character has a code of 32 or more is added to the result and the mask is written. Keys with other characters, such as Tab, and keys without a character are ignored. Without a console it does not return, as **ReadKey** does not.

```tb check_build
Dim con As New cConsole
Dim secret As String

secret = con.ReadPassword("Password: ", "*")
con.WriteLine "Read " & Len(secret) & " characters."
```

### Refresh
{: .no_toc }

Writes the changed part of the full-screen buffer to the console.

Syntax: *object*.**Refresh**

In full-screen mode the method calls [**Flush**](cConsoleBuffer#flush) of the buffer, which writes only the rectangle that has changed since the last write, measures the time for [**LastRenderTime**](#lastrendertime) and updates [**FPS**](#fps). Outside full-screen mode it does nothing. Calls `WriteConsoleOutputW`, with the standard output handle. Without a console, the call fails and nothing is shown.

### RefreshAll
{: .no_toc }

Writes the whole full-screen buffer to the console.

Syntax: *object*.**RefreshAll**

Like [**Refresh**](#refresh), but the whole buffer is written, whether or not it has changed. A program uses it after something else has drawn on the screen, for example after an error message, to restore the picture. Outside full-screen mode it does nothing.

### ResetColors
{: .no_toc }

Puts back the colour attributes that the console had when the object was created.

Syntax: *object*.**ResetColors**

Sets the attributes with `SetConsoleTextAttribute` and sets [**ForeColor**](#forecolor) and [**BackColor**](#backcolor) to the colours in the saved attributes (the low four bits, and the next four). Without a console, the saved attributes are Gray on Black.

### Restore
{: .no_toc }

Puts the console back as it was when the object was created.

Syntax: *object*.**Restore**

The method leaves the full-screen mode if it is on, sets the input mode and the output mode to the saved ones, sets the saved colour attributes, and sets the two saved code pages. It does not clear the screen, and does not put back the cursor size. The object stays usable, and the method can be called again. Calls `SetConsoleMode` (twice), `SetConsoleTextAttribute`, `SetConsoleCP` and `SetConsoleOutputCP`. The terminate event of the object calls it.

### SetBufferSize
{: .no_toc }

Sets the size of the screen buffer of the console.

Syntax: *object*.**SetBufferSize** ( *width* , *height* )

*width*, *height*
: *required* **Long** values, the columns and rows of the buffer.

A value outside the range of an **Integer** raises error 6, *Overflow*. Windows refuses a buffer smaller than the window, and the method does not check. The buffer of full-screen mode is not changed here: it is resized when the size event arrives, which [**ProcessEvents**](#processevents) reads. Calls `SetConsoleScreenBufferSize`.

### SetColors
{: .no_toc }

Sets the text and background colours.

Syntax: *object*.**SetColors** ( *fore* [ , *back* ] )

*fore*
: *required* A [**ConsoleColor**](Types#consolecolor), the text colour.

*back*
: *optional* A [**ConsoleColor**](Types#consolecolor), the background colour. The default is **Black**, and not the current background.

Stores both values in [**ForeColor**](#forecolor) and [**BackColor**](#backcolor), and applies them with `SetConsoleTextAttribute`.

### SetCursorPosition
{: .no_toc }

Moves the cursor.

Syntax: *object*.**SetCursorPosition** ( *col* , *row* )

*col*, *row*
: *required* **Long** values, the column and the row, counted from the top left of the screen buffer.

A value outside the range of an **Integer** raises error 6, *Overflow*. A position outside the screen buffer is refused by Windows, and the method does not check. Calls `SetConsoleCursorPosition`.

### WriteAt
{: .no_toc }

Writes text at a position.

Syntax: *object*.**WriteAt** ( *col* , *row* , *text* )

*col*, *row*
: *required* **Long** values, the column and the row.

*text*
: *required* A **String**.

Moves the cursor with [**SetCursorPosition**](#setcursorposition) and writes the text with [**WriteTo**](#writeto), in the current colour attributes of the console. The cursor stays after the text.

### WriteAtColored
{: .no_toc }

Writes text at a position in given colours.

Syntax: *object*.**WriteAtColored** ( *col* , *row* , *text* , *fore* [ , *back* ] )

*col*, *row*
: *required* **Long** values, the column and the row.

*text*
: *required* A **String**.

*fore*
: *required* A [**ConsoleColor**](Types#consolecolor).

*back*
: *optional* A [**ConsoleColor**](Types#consolecolor). The default is **Black**.

Moves the cursor and calls [**WriteColored**](#writecolored), so the colours that were tracked before are put back after the text.

### WriteColored
{: .no_toc }

Writes text in given colours.

Syntax: *object*.**WriteColored** ( *text* , *fore* [ , *back* ] )

*text*
: *required* A **String**.

*fore*
: *required* A [**ConsoleColor**](Types#consolecolor), the text colour.

*back*
: *optional* A [**ConsoleColor**](Types#consolecolor), the background colour. The default is **Black**, whatever the current background is.

Sets the colours with [**SetColors**](#setcolors), writes the text with [**WriteTo**](#writeto), and sets [**ForeColor**](#forecolor) and [**BackColor**](#backcolor) back to the values they had before the call. Those are the values that the object tracks: Gray on Black until a property or [**SetColors**](#setcolors) changes them. They are not read from the console, so a console that started in other colours ends up in Gray on Black after the first call, and not in its own colours. [**ResetColors**](#resetcolors) puts back the original ones.

```tb check_build
Dim con As New cConsole

con.WriteTo "Status: "
con.WriteColored "OK", ConsoleColor.Black, ConsoleColor.Green
con.WriteLine
```

### WriteError
{: .no_toc }

Writes text to the standard error handle.

Syntax: *object*.**WriteError** ( *text* )

*text*
: *required* A **String**.

Calls `WriteConsoleW` on the standard error handle, so the text is written when that handle is a console and is lost when the error output is redirected to a file or a pipe. No line break is added.

### WriteErrorLine
{: .no_toc }

Writes text and a line feed to the standard error handle.

Syntax: *object*.**WriteErrorLine** ( *text* )

*text*
: *required* A **String**.

Calls [**WriteError**](#writeerror) with the text and a line feed (code 10).

### WriteF
{: .no_toc }

Writes text with numbered placeholders.

Syntax: *object*.**WriteF** ( *format* , *args* ... )

*format*
: *required* A **String** with the placeholders `{0}`, `{1}` and so on.

*args*
: *optional* A list of values, one for each placeholder, with `{0}` for the first.

Replaces `{0}` with the first value, `{1}` with the second, and so on, in that order, each converted with **CStr**, and writes the result with [**WriteTo**](#writeto). The only form of a placeholder is a number in braces; a format such as `{0:N2}` is not understood and stays as it is. The replacements are made one after the other on the whole text, so a value that contains `{1}` has that text replaced by the second value. A value that **CStr** cannot convert raises the error that **CStr** raises. A placeholder with no value stays in the text.

```tb check_build
Dim con As New cConsole

con.WriteLineF "{0} + {1} = {2}", 2, 3, 2 + 3
```

### WriteLine
{: .no_toc }

Writes text and a line feed.

Syntax: *object*.**WriteLine** [ ( *text* ) ]

*text*
: *optional* A **String**. The default is an empty string, which writes only the line feed.

Calls [**WriteTo**](#writeto) with the text and `vbLf`, the line feed (code 10) alone. The console moves to the start of the next line when it processes output, which it does by default.

### WriteLineColored
{: .no_toc }

Writes text in given colours, and a line feed.

Syntax: *object*.**WriteLineColored** ( *text* , *fore* [ , *back* ] )

*text*
: *required* A **String**.

*fore*
: *required* A [**ConsoleColor**](Types#consolecolor).

*back*
: *optional* A [**ConsoleColor**](Types#consolecolor). The default is **Black**.

Calls [**WriteColored**](#writecolored) with the text and a line feed, so the line feed is written in the given colours too.

### WriteLineF
{: .no_toc }

Writes text with numbered placeholders, and a line feed.

Syntax: *object*.**WriteLineF** ( *format* , *args* ... )

Replaces the placeholders as [**WriteF**](#writef) does and writes the result with [**WriteLine**](#writeline).

### WriteTo
{: .no_toc }

Writes text, without a line break.

Syntax: *object*.**WriteTo** ( *text* )

*text*
: *required* A **String**. Every UTF-16 code unit of the string is written, in the current colour attributes of the console.

Calls `WriteConsoleW` on the standard output handle with the characters of the string, and ignores the result. The text is not converted, so any Unicode character that the console font can draw appears as it is. Control characters are handled by the console: a carriage return, a line feed, a backspace and the bell take effect, and escape sequences take effect only when the virtual-terminal mode is on; see [**EnableVirtualTerminal**](#enablevirtualterminal). When the output is redirected, or the program has no console, nothing is written.

## See Also

- [cConsoleBuffer](cConsoleBuffer) class -- the screen buffer of the full-screen mode
- [Types](Types) -- the colours, the key, mouse and size structures, and the handler types
- [mConsoleStyle](mConsoleStyle) module -- escape sequences for colours and cursor movement
- [TBMANLIB_ConsoleCore](./) package
- [TBMANLIB_ConsoleComponents](../TBMANLIB_ConsoleComponents/) package -- text interface components that draw into the buffer
