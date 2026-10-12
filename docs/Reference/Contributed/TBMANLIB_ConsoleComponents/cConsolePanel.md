---
title: cConsolePanel
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/cConsolePanel
has_toc: false
---

# cConsolePanel class
{: .no_toc }

A rectangle of the console with a border, a title and padding, that draws its border into a [**cConsoleBuffer**](../TBMANLIB_ConsoleCore/cConsoleBuffer) and tells where its content area is.

A panel holds a position, a size and a few style fields, and draws nothing until [**Render**](#render) is called with a buffer. It does not hold content: the program writes into the area that [**ContentRect**](#contentrect) returns. The panel takes the buffer to draw into as a parameter and holds no console. [**cConsoleLayout**](cConsoleLayout) creates panels and keeps them by name.

```tb check_build
Dim panel As cConsolePanel = New cConsolePanel("main", 2, 1, 20, 6)
Dim buf As cConsoleBuffer = New cConsoleBuffer(30, 10)
Dim ci As ConsoleCharInfo

panel.Title = "Log"
panel.BorderStyle = PanelBorderStyle.Double
panel.Render buf, ConsoleColor.Cyan, ConsoleColor.Black

ci = buf.GetChar(2, 1)                      ' the upper left corner
Debug.Print Hex$(AscW(ci.Char)) & " " & ci.ForeColor
ci = buf.GetChar(4, 1)                      ' the first character of the title
Debug.Print ci.Char & " " & ci.ForeColor
Debug.Print panel.ContentWidth() & " " & panel.ContentHeight()
' Output:
' 2554 11
' L 15
' 16 2
```

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cConsolePanel**. Columns and rows are counted from 0 in the buffer.

## The rectangle and the content area

[**Rect**](#rect) is the rectangle of the panel with its edges inclusive: a panel at column 2, row 1, 20 columns wide and 6 rows high has `Rect.Left` 2, `Rect.Top` 1, `Rect.Right` 21 and `Rect.Bottom` 6. The border is drawn on the edge cells.

The content area is what is left inside. [**ContentRect**](#contentrect) takes one cell from each side for the border, unless [**BorderStyle**](#borderstyle) is **None**, and then [**Padding**](#padding) cells from each side. The sample above has a content area of 16 columns by 2 rows, from column 4, row 3 to column 19, row 4. The content area can be empty or have a negative size when the panel is small.

## Fields

The class has seven public fields, not properties. They are read and written as `panel.Title`, and a write takes effect at the next [**Render**](#render).

### BorderColor
{: .no_toc }

The colour of the two spaces that surround the title on the top border. A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor). The starting value is **Gray**.

The border itself is drawn in the colours that are passed to [**Render**](#render), and not in this one.

### BorderStyle
{: .no_toc }

The border style. A [**PanelBorderStyle**](#panelborderstyle). The starting value is **Single**.

### Name
{: .no_toc }

The name of the panel. **String**. The constructor sets it. [**cConsoleLayout**](cConsoleLayout) keeps its own list of names, so changing this field later does not change the name under which the layout finds the panel.

### Padding
{: .no_toc }

The number of cells between the border and the content area, on every side. **Long**. The starting value is 1.

### Rect
{: .no_toc }

The rectangle of the panel. A [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect), with inclusive edges. The constructor, [**Move**](#move) and [**Resize**](#resize) set it. A program that references the published package TBMANLIB_ConsoleCore cannot read its fields: see [The two packages](./#the-two-packages). [**ContentWidth**](#contentwidth) and [**ContentHeight**](#contentheight) give sizes as **Long** values.

### Title
{: .no_toc }

The text on the top border. **String**. The starting value is an empty string, which draws no title.

[**Render**](#render) writes a space, the title and a space, from column `Rect.Left + 1`, in the row `Rect.Top`. A title longer than `Rect.Right - Rect.Left - 3` characters is cut, without an ellipsis, and a panel that is too narrow for one character draws no title. The title is drawn on a black background.

### TitleColor
{: .no_toc }

The colour of the title text. A **ConsoleColor**. The starting value is **White**.

## Enumeration

### PanelBorderStyle
{: .no_toc }

The border style of a panel. The enumeration is declared in the class, and its members are written without the class, as in `PanelBorderStyle.Rounded`; the type is `cConsolePanel.PanelBorderStyle` or `PanelBorderStyle`.

| Member | Value | Border |
|---|---:|---|
| **None** | 0 | No border, and no title. The content area starts at the edge plus the padding. |
| **Single** | 1 | Single lines: U+250C, U+2510, U+2514, U+2518, U+2500, U+2502. The default. |
| **Double** | 2 | Double lines: U+2554, U+2557, U+255A, U+255D, U+2550, U+2551. |
| **Rounded** | 3 | Single lines with rounded corners: U+256D, U+256E, U+2570, U+256F, with U+2500 and U+2502. |
| **Bold** | 4 | Heavy lines: U+250F, U+2513, U+2517, U+251B, U+2501, U+2503. |

**Single** and **Double** are drawn by [**DrawBox**](../TBMANLIB_ConsoleCore/cConsoleBuffer#drawbox) of the buffer, and the other two by the panel itself.

## Constructor

### New
{: .no_toc }

Creates a panel.

Syntax: **New cConsolePanel** [ ( [ *name* [ , *left* [ , *top* [ , *width* [ , *height* ] ] ] ] ] ) ]

*name*
: *optional* A **String**. The default is an empty string.

*left*, *top*
: *optional* **Long** values, the position of the upper left corner. The defaults are 0.

*width*, *height*
: *optional* **Long** values, the size in columns and rows. The defaults are 10 and 5.

Sets [**Rect**](#rect) to `left`, `top`, `left + width - 1` and `top + height - 1`, [**BorderStyle**](#borderstyle) to **Single**, [**BorderColor**](#bordercolor) to **Gray**, [**TitleColor**](#titlecolor) to **White** and [**Padding**](#padding) to 1.

## Methods

### ClearContent
{: .no_toc }

Fills the content area with spaces.

Syntax: *object*.**ClearContent** ( *buffer* [ , *fore* [ , *back* ] ] )

*buffer*
: *required* A [**cConsoleBuffer**](../TBMANLIB_ConsoleCore/cConsoleBuffer).

*fore*
: *optional* A **ConsoleColor**, the colour of the cells. The default is **Gray**.

*back*
: *optional* A **ConsoleColor**, the background. The default is **Black**.

The padding and the border are left as they are. Nothing is done when the content area is less than 2 cells wide or 2 cells high.

### ContentHeight
{: .no_toc }

Returns the height of the content area.

Syntax: *object*.**ContentHeight** ( ) **As Long**

Returns `ContentRect.Bottom - ContentRect.Top + 1`. It is 0 or negative when the border and the padding take all the rows.

### ContentRect
{: .no_toc }

Returns the content area.

Syntax: *object*.**ContentRect** ( ) **As ConsoleRect**

Returns a [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect) that is [**Rect**](#rect) less one cell on each side for the border (none when [**BorderStyle**](#borderstyle) is **None**) and less [**Padding**](#padding) cells on each side.

### ContentWidth
{: .no_toc }

Returns the width of the content area.

Syntax: *object*.**ContentWidth** ( ) **As Long**

Returns `ContentRect.Right - ContentRect.Left + 1`.

### Move
{: .no_toc }

Moves the panel and keeps its size.

Syntax: *object*.**Move** ( *left* , *top* )

*left*, *top*
: *required* **Long** values, the new position of the upper left corner.

Nothing is drawn, and the old cells are not cleared.

### Render
{: .no_toc }

Draws the border and the title.

Syntax: *object*.**Render** ( *buffer* [ , *fore* [ , *back* ] ] )

*buffer*
: *required* A [**cConsoleBuffer**](../TBMANLIB_ConsoleCore/cConsoleBuffer).

*fore*
: *optional* A **ConsoleColor**, the colour of the border. The default is **Gray**. [**BorderColor**](#bordercolor) is not used for it.

*back*
: *optional* A **ConsoleColor**, the background of the border. The default is **Black**.

Draws the border of the style in [**BorderStyle**](#borderstyle) around [**Rect**](#rect) and then the [**Title**](#title). The inside of the panel is not changed: the text that was there stays, and [**ClearContent**](#clearcontent) removes it. With the style **None** the method draws nothing, not even the title. Cells outside the buffer are dropped.

### Resize
{: .no_toc }

Gives the panel a new size and keeps its position.

Syntax: *object*.**Resize** ( *width* , *height* )

*width*, *height*
: *required* **Long** values, the new size in columns and rows.

Sets `Rect.Right` to `Rect.Left + width - 1` and `Rect.Bottom` to `Rect.Top + height - 1`. Nothing is drawn.

## See Also

- [cConsoleLayout](cConsoleLayout) class -- creates and places named panels
- [cConsoleTheme](cConsoleTheme) class -- colours for **Render**
- [cConsoleBuffer](../TBMANLIB_ConsoleCore/cConsoleBuffer) class -- **DrawBox** and the other drawing members
