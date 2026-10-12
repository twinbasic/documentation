---
title: cConsoleLayout
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/cConsoleLayout
has_toc: false
---

# cConsoleLayout class
{: .no_toc }

Keeps a set of named [**cConsolePanel**](cConsolePanel) objects, creates them in common arrangements (a split, a grid, a sidebar, a header and footer), and draws their borders.

A **cConsoleLayout** is made with a [**cConsole**](../TBMANLIB_ConsoleCore/cConsole). It does not place content: it works out the rectangles of panels and draws the borders and titles of all of them in one call. The program writes the content of each panel into the area that the panel's [**ContentRect**](cConsolePanel#contentrect) returns.

```tb check_build
Dim con As New cConsole
Dim layout As cConsoleLayout = New cConsoleLayout(con)
Dim p As cConsolePanel

layout.AddPanel "root", 0, 0, 40, 12, "Monitor"
layout.SplitHorizontal "root", 0.25, "list", "detail"

Set p = layout.GetPanel("list")
Debug.Print p.ContentWidth() & " " & p.ContentHeight()
Set p = layout.GetPanel("detail")
Debug.Print p.ContentWidth() & " " & p.ContentHeight()
Debug.Print layout.PanelCount
' Output:
' 5 4
' 22 4
' 3
```

The root panel covers columns 0 to 39 and rows 0 to 11, so its content area is columns 2 to 37 and rows 2 to 9. **list** takes columns 2 to 10 and **detail** columns 12 to 37, both in rows 2 to 9; the sample prints the size of the content area inside the border and padding of each. A program that references only the published package TBMANLIB_ConsoleCore cannot read the **Rect** of a panel; see [The two packages](./#the-two-packages).

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cConsoleLayout**. Columns and rows are counted from 0 in the buffer.

## Panels, names and the root panel

Each panel has a name, which is unique in the layout and case-sensitive. [**GetPanel**](#getpanel) finds a panel by it. The layout keeps the panels in the order of creation, which is the order in which [**Render**](#render) draws them, so a later panel is drawn over an earlier one.

The first panel that is added becomes the *root panel*, by any member that adds one: [**AddPanel**](#addpanel), [**AddPanelByRect**](#addpanelbyrect), or one of the arrangements. When the root panel is removed, the first remaining panel becomes the root. The root panel decides the area in which the arrangements work: [**CreateGrid**](#creategrid), [**CreateSidebar**](#createsidebar) and [**CreateHeaderFooter**](#createheaderfooter) use the content area of the root panel, and the whole console, as it was when the layout was made or last resized, when the layout has no panel. A layout that has no panel yet and starts with an arrangement, such as [**CreateHeaderFooter**](#createheaderfooter), makes the first panel of that arrangement the root panel, and the arrangements that follow then work inside its content area. A program that wants the arrangements to work inside one panel adds that panel first.

[**SplitHorizontal**](#splithorizontal) and [**SplitVertical**](#splitvertical) work inside the content area of the panel they name. The panels they make are new entries of the layout; the panel that was split stays where it is, and the new panels lie over its inside.

The arrangements make panels with the default style of [**cConsolePanel**](cConsolePanel): a single border and a padding of 1. A panel needs at least 5 columns and 5 rows to have a content area of one cell.

The members that make several panels return them in a **Variant** that holds an array of **cConsolePanel**, in a fixed order. A program takes the panels out one at a time, or finds them with **GetPanel**:

```tb check_build
Dim con As New cConsole
Dim layout As cConsoleLayout = New cConsoleLayout(con)
Dim parts As Variant
Dim leftPanel As cConsolePanel
Dim rightPanel As cConsolePanel

layout.AddPanel "root", 0, 0, 40, 12
parts = layout.SplitHorizontal("root", 0.5, "left", "right")
Set leftPanel = parts(0)
Set rightPanel = parts(1)
leftPanel.Title = "Files"
rightPanel.BorderStyle = PanelBorderStyle.Double
```

## Constructor

### New
{: .no_toc }

Creates a layout for a console.

Syntax: **New cConsoleLayout** ( *console* )

*console*
: *required* A [**cConsole**](../TBMANLIB_ConsoleCore/cConsole).

Keeps the console, reads its [**Width**](../TBMANLIB_ConsoleCore/cConsole#width) and [**Height**](../TBMANLIB_ConsoleCore/cConsole#height) as the size of the layout, and creates the empty list and the `Scripting.Dictionary` object in which the panels are kept by name. The console does not have to be in full-screen mode yet: the layout reads the console's [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer) each time it draws, not when it is made.

## Properties

### PanelCount
{: .no_toc }

The number of panels in the layout. **Long**, read-only.

Syntax: *object*.**PanelCount**

## Methods

### AddPanel
{: .no_toc }

Creates a panel and adds it to the layout.

Syntax: *object*.**AddPanel** ( *name* , *left* , *top* , *width* , *height* [ , *title* ] ) **As cConsolePanel**

*name*
: *required* A **String**, the name of the panel. It has to be new.

*left*, *top*
: *required* **Long** values, the position of the upper left corner.

*width*, *height*
: *required* **Long** values, the size in columns and rows.

*title*
: *optional* A **String**, the title on the top border. The default is an empty string, which draws no title.

Returns the new [**cConsolePanel**](cConsolePanel), with its default style. The first panel of a layout is its root panel. A name that is in use raises error 457, *This key is already associated with an element of this collection*, from the dictionary, but the panel has been added to the list by then, so [**PanelCount**](#panelcount) counts it, [**Render**](#render) draws it, and no name leads to it.

### AddPanelByRect
{: .no_toc }

Creates a panel from a rectangle and adds it to the layout.

Syntax: *object*.**AddPanelByRect** ( *name* , *rect* [ , *title* ] ) **As cConsolePanel**

*name*
: *required* A **String**, the name of the panel.

*rect*
: *required* A [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect), with inclusive edges.

*title*
: *optional* A **String**.

Calls [**AddPanel**](#addpanel) with the left and top edges of *rect* and a width and height of `Right - Left + 1` and `Bottom - Top + 1`.

### AutoResize
{: .no_toc }

Sets the size of the layout to the current size of the console.

Syntax: *object*.**AutoResize**

Calls [**Resize**](#resize) with the console's [**Width**](../TBMANLIB_ConsoleCore/cConsole#width) and [**Height**](../TBMANLIB_ConsoleCore/cConsole#height).

### Clear
{: .no_toc }

Removes every panel.

Syntax: *object*.**Clear**

Replaces the list and the dictionary with empty ones, and leaves the layout with no root panel. Nothing is erased from the buffer.

### ClearAllContent
{: .no_toc }

Fills the content area of every panel with spaces.

Syntax: *object*.**ClearAllContent** [ ( *theme* ) ]

*theme*
: *optional* A [**cConsoleTheme**](cConsoleTheme). The default is **Nothing**.

Calls [**ClearContent**](cConsolePanel#clearcontent) of each panel with the buffer of the console, using the theme's **Foreground** and **Background** colours, or **Gray** on **Black** when no theme is given. Raises error 91 when the console has no buffer.

### ClearPanelContent
{: .no_toc }

Fills the content area of one panel with spaces.

Syntax: *object*.**ClearPanelContent** ( *name* [ , *theme* ] )

*name*
: *required* A **String**, the name of the panel. A name that is not in the layout does nothing.

*theme*
: *optional* A **cConsoleTheme**, as for [**ClearAllContent**](#clearallcontent).

### CreateGrid
{: .no_toc }

Divides the root panel's content area into a grid of panels.

Syntax: *object*.**CreateGrid** ( *cols* , *rows* , *namePrefix* ) **As Variant**

*cols*, *rows*
: *required* **Long** values, the number of columns and rows of the grid. A value of 0 raises error -2147467259, *Unspecified error*.

*namePrefix*
: *required* A **String**. The panels are named *namePrefix*`_0`, *namePrefix*`_1` and so on.

Creates `cols * rows` panels, row by row from the top left, and returns them in a **Variant** that holds an array in that order, with indexes from 0. The area is the content area of the root panel, or the whole console when the layout has no panel. Its width is divided by *cols* with whole numbers, and its height by *rows*; call the results *colStep* and *rowStep*. A panel that is not in the last column is `colStep - 1` cells wide, which leaves one blank column to its right, and a panel that is not in the last row is `rowStep - 1` rows high; the panels of the last column and the last row reach to the edge of the area, so they take the remainder.

```tb check_build
Dim con As New cConsole
Dim layout As cConsoleLayout = New cConsoleLayout(con)
Dim p As cConsolePanel
Dim i As Long

layout.AddPanel "root", 0, 0, 60, 20                ' the content area is columns 2 to 57, rows 2 to 17
layout.CreateGrid 2, 2, "cell"
For i = 0 To 3
    Set p = layout.GetPanel("cell_" & i)
    Debug.Print p.ContentWidth() & " " & p.ContentHeight()
Next
' Output:
' 23 3
' 24 3
' 23 4
' 24 4
```

The content area of the root panel has 56 columns and 16 rows, so *colStep* is 28 and *rowStep* is 8. The cells are columns 2 to 28 and 30 to 57, and rows 2 to 8 and 10 to 17; the sample prints the size of the content area inside the border and padding of each cell.

### CreateHeaderFooter
{: .no_toc }

Divides the root panel's content area into a header, a body and a footer.

Syntax: *object*.**CreateHeaderFooter** ( *headerHeight* , *footerHeight* , *headerName* , *contentName* , *footerName* ) **As Variant**

*headerHeight*, *footerHeight*
: *required* **Long** values, the number of rows of the header and of the footer.

*headerName*, *contentName*, *footerName*
: *required* **String** values, the names of the three panels.

Returns the header, the body and the footer, in that order, as an array of three panels. The header takes the first *headerHeight* rows of the area, the footer the last *footerHeight* rows, and the body the rows between them, with no blank row between the panels. Each panel is as wide as the area. See [Panels, names and the root panel](#panels-names-and-the-root-panel) for the area.

### CreateSidebar
{: .no_toc }

Divides the root panel's content area into a sidebar on the left and a content panel.

Syntax: *object*.**CreateSidebar** ( *sidebarWidth* , *sidebarName* , *contentName* ) **As Variant**

*sidebarWidth*
: *required* A **Long**, the number of columns of the sidebar.

*sidebarName*, *contentName*
: *required* **String** values, the names of the two panels.

Returns the sidebar and the content panel, in that order, as an array of two panels. The sidebar takes the first *sidebarWidth* columns of the area and the content panel the rest, with no blank column between them. Both are as high as the area.

### GetAllPanels
{: .no_toc }

Returns every panel.

Syntax: *object*.**GetAllPanels** ( ) **As Variant**

Returns a **Variant** that holds an array of **cConsolePanel** in the order of creation, with indexes from 0.

### GetPanel
{: .no_toc }

Finds a panel by its name.

Syntax: *object*.**GetPanel** ( *name* ) **As cConsolePanel**

*name*
: *required* A **String**. The comparison is case-sensitive.

Returns the panel, or **Nothing** when the layout has no panel of that name.

### GetPanelNames
{: .no_toc }

Returns the names of the panels.

Syntax: *object*.**GetPanelNames** ( ) **As Variant**

Returns a **Variant** that holds an array of **String**, with indexes from 0, in the order of the dictionary, which is the order in which the names were added.

### HasPanel
{: .no_toc }

Tells whether a name is in use.

Syntax: *object*.**HasPanel** ( *name* ) **As Boolean**

*name*
: *required* A **String**.

### RemovePanel
{: .no_toc }

Removes a panel.

Syntax: *object*.**RemovePanel** ( *name* )

*name*
: *required* A **String**. A name that is not in the layout does nothing.

Removes the panel from the dictionary and the list. When it was the root panel, the first panel that is left becomes the root, or the layout has none. Nothing is erased from the buffer.

### Render
{: .no_toc }

Draws the border and title of every panel.

Syntax: *object*.**Render** [ ( *theme* ) ]

*theme*
: *optional* A [**cConsoleTheme**](cConsoleTheme). The default is **Nothing**.

Calls [**Render**](cConsolePanel#render) of each panel in order of creation, with the buffer of the console. The border colour is the theme's **Border** and the background is its **Background**; without a theme they are **Gray** and **Black**. The insides of the panels are not changed; [**ClearAllContent**](#clearallcontent) does that. When the console is not in full-screen mode, the buffer is **Nothing** and the call raises error 91.

```tb check_build
Dim con As New cConsole
Dim layout As cConsoleLayout
Dim theme As cConsoleTheme = mConsoleThemeFactory.CreateHTOP()

con.EnterFullScreenMode
Set layout = New cConsoleLayout(con)
layout.AddPanel "root", 0, 0, con.Width, con.Height, "Application"
layout.CreateHeaderFooter 1, 1, "head", "body", "foot"

layout.ClearAllContent theme
layout.Render theme
con.Refresh
```

### RenderPanel
{: .no_toc }

Draws the border and title of one panel.

Syntax: *object*.**RenderPanel** ( *name* [ , *theme* ] )

*name*
: *required* A **String**. A name that is not in the layout does nothing.

*theme*
: *optional* A **cConsoleTheme**, as for [**Render**](#render).

### Resize
{: .no_toc }

Meant to scale the panels to a new console size.

Syntax: *object*.**Resize** ( *newWidth* , *newHeight* )

*newWidth*, *newHeight*
: *required* **Long** values, the new size of the console area in columns and rows.

The method stores the new size, then computes the factors `newWidth / stored width` and `newHeight / stored height` and moves and resizes every panel by them. The stored size is replaced before the factors are computed, so both are 1, and no panel changes. The only effect is the new size, which [**CreateGrid**](#creategrid), [**CreateSidebar**](#createsidebar) and [**CreateHeaderFooter**](#createheaderfooter) use when the layout has no panel. A *newWidth* or *newHeight* of 0 raises error 6, *Overflow*, since the factor is 0 divided by 0.

A program that has to follow the size of the window ([**OnResize**](../TBMANLIB_ConsoleCore/cConsole#onresize) of the console reports it) calls [**Clear**](#clear) and makes the panels again.

### SplitHorizontal
{: .no_toc }

Divides a panel's content area into a left panel and a right panel.

Syntax: *object*.**SplitHorizontal** ( *parentName* , *ratio* , *leftName* , *rightName* ) **As Variant**

*parentName*
: *required* A **String**, the name of the panel to divide.

*ratio*
: *required* A **Double**, the share of the width for the left panel, from 0 to 1. It is not checked.

*leftName*, *rightName*
: *required* **String** values, the names of the new panels.

Returns an array of two panels, the left one first, in a **Variant**. When the parent is not in the layout, the method creates nothing and returns **Nothing** in the **Variant**.

The left panel is `CLng(ContentWidth * ratio)` columns wide, starting at the left edge of the parent's content area, and the right panel starts one column after it and reaches the right edge. Both are as high as the content area. The method divides the width, so the line between the panels is vertical. The member of the same name in [**cLayoutHelper**](Helpers#splithorizontal) divides the height instead.

### SplitVertical
{: .no_toc }

Divides a panel's content area into a top panel and a bottom panel.

Syntax: *object*.**SplitVertical** ( *parentName* , *ratio* , *topName* , *bottomName* ) **As Variant**

*parentName*
: *required* A **String**, the name of the panel to divide.

*ratio*
: *required* A **Double**, the share of the height for the top panel, from 0 to 1.

*topName*, *bottomName*
: *required* **String** values, the names of the new panels.

Returns an array of two panels, the top one first, or **Nothing** when the parent is not in the layout. The top panel is `CLng(ContentHeight * ratio)` rows high, from the top edge of the parent's content area, and the bottom panel starts one row after it and reaches the bottom edge. The line between them is horizontal. The member of the same name in [**cLayoutHelper**](Helpers#splitvertical) divides the width instead.

## See Also

- [cConsolePanel](cConsolePanel) class -- one panel
- [cConsoleTheme](cConsoleTheme) class -- the colours for **Render** and **ClearAllContent**
- [Helpers](Helpers) -- **cLayoutHelper**, which works out rectangles without panels
- [cConsole](../TBMANLIB_ConsoleCore/cConsole) class -- the console and its buffer
