---
title: TBMANLIB_ConsoleComponents Package
parent: Experimental Packages
has_toc: false
indexed_from: 0.0.0.0
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/
---

# TBMANLIB_ConsoleComponents Package
{: .no_toc }

**Author:** woeoio. **Version:** 0.0.0.0

The **TBMANLIB_ConsoleComponents** contributed package is a set of text-interface components for console programs. It has progress bars ([**cProgressBar**](cProgressBar)), small line charts ([**cSparkline**](cSparkline)), bar charts ([**cVBar**](cVBar)), a table ([**cDataGrid**](cDataGrid)), bordered panels ([**cConsolePanel**](cConsolePanel)), a manager that places panels in a grid, a sidebar or a header and footer ([**cConsoleLayout**](cConsoleLayout)), colour themes ([**cConsoleTheme**](cConsoleTheme)), and helpers for colours and positions ([**cColorHelper**, **cLayoutHelper**](Helpers)). The components draw into the screen buffer of the full-screen mode of [**cConsole**](../TBMANLIB_ConsoleCore/cConsole), in the package [TBMANLIB_ConsoleCore](../TBMANLIB_ConsoleCore/); the program then writes the buffer to the console with [**Refresh**](../TBMANLIB_ConsoleCore/cConsole#refresh). This section documents version 0.0.0.0, published on TWINSERV on 1 February 2026 with no licence declared. The package describes itself as "TBMAN: Text UI (TUI) component library base on ConsoleCore".

> [!NOTE]
> The tools that check this documentation's samples run a sample and compare what it prints with **Debug.Print**. They cannot yet read what a program writes to a console. So the samples on these pages are compiled, and what the components draw on the console has not been checked by running them. Statements about what a component draws follow the package's source, and will be checked once the tools can capture a console.

```tb check_build
Dim con As New cConsole
Dim layout As cConsoleLayout
Dim bar As cProgressBar
Dim theme As cConsoleTheme = mConsoleThemeFactory.CreateHTOP()

con.EnterFullScreenMode                           ' the components need the buffer of this mode
Set layout = New cConsoleLayout(con)
Set bar = New cProgressBar(con)

layout.AddPanel "main", 0, 0, con.Width, 5, "Copying"
layout.Render theme
bar.RenderWithLabel 2, 2, con.Width - 4, 62, "files"
con.Refresh

con.ReadKey True
con.Restore
```

> [!WARNING]
> In version 0.0.0.0 the components that take a **cConsole** cannot be used with the published package [TBMANLIB_ConsoleCore](../TBMANLIB_ConsoleCore/). The package compiles, but the constructors of [**cProgressBar**](cProgressBar), [**cSparkline**](cSparkline), [**cVBar**](cVBar), [**cDataGrid**](cDataGrid), [**cConsoleLayout**](cConsoleLayout) and [**cLayoutHelper**](Helpers), and the members of [**cConsolePanel**](cConsolePanel) that take a **cConsoleBuffer**, raise error -2147467262, *No such interface supported*, when they are given an object of the published ConsoleCore, and a program cannot read the **ConsoleRect** and **ConsolePosition** values that the components return. [The two packages](#the-two-packages) has the details. Only [**cConsoleTheme**](cConsoleTheme), the module **mConsoleThemeFactory**, [**cColorHelper**](Helpers#ccolorhelper-class) and the geometry of **cConsolePanel** work. The outputs that the samples on these pages show are those of the code of the two packages compiled into one project, and not of a project that references the two packages.

* TOC
{:toc}

## Using the package

### The two packages

Like ConsoleCore, the package is meant for a console application; see [Which project it needs](../TBMANLIB_ConsoleCore/cConsole#which-project-it-needs).

A component names types of ConsoleCore in its constructor and its parameters: **cConsole**, **cConsoleBuffer**, **ConsoleColor**, **ConsoleRect** and others. The references of a package are not visible to the project that uses it, so a program that creates a component, or names one of these types, references **TBMANLIB_ConsoleCore** as well as this package. Both are added as [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) describes. TWINSERV lists both packages at version 0.0.0.0.

The project file of this package lists ConsoleCore as an embedded reference: a copy of version 1.0.0.0, named *New project*, with the identifier `{EAEAEAEA-EAEA-EAEA-EAEA-EAEAEAEAEA00}`. The published package is version 0.0.0.0, named TBMANLIB_ConsoleCore, with an identifier of its own. The six source files of the embedded copy are the same as those of the published package; its project data differs in the identifier, the name and the description, and it does not declare its package visibility as public.

The components are compiled against the embedded copy, whose types are not those of the published package, although they have the same names. A project that references both therefore meets two sets of types, and this is the result:

- **Objects.** Passing a **cConsole** or a **cConsoleBuffer** of the published package to a component compiles. At run time the call raises error -2147467262, *No such interface supported*: the constructors of **cProgressBar**, **cSparkline**, **cVBar**, **cDataGrid**, **cConsoleLayout** and **cLayoutHelper** do, and so do **Render** and **ClearContent** of **cConsolePanel**.
- **Structures.** A **ConsoleRect** or **ConsolePosition** that a component returns, such as the **Rect** field of **cConsolePanel**, or the result of **ContentRect**, **CenterRect**, **Center** or **Grid**, has the type of the embedded copy. The compiler refuses to read a member of it (TB5027, *[ConsoleRect] does not contain 'Left', or it is inaccessible in this context*) and to assign it to a **ConsoleRect** variable or pass it to **ConsoleRect_Contains** (TB5028, *Unable to convert type 'ConsoleRect' to type 'ConsoleRect'*).
- **Enumerations.** A **ConsoleColor** is a number, so the colour members work: **cConsoleTheme**, **mConsoleThemeFactory** and **cColorHelper** give and take colours, and **cConsolePanel** keeps its style fields.
- **Nested enumerations.** The enumerations of the components, such as **PanelBorderStyle**, are written without the class: `PanelBorderStyle.Double`. The form `cConsolePanel.PanelBorderStyle.Double` is refused (TB5079, *Unrecognized symbol 'cConsolePanel'*).

A program that references only this package cannot create a **cConsole**, and a component cannot be created without one. The members that this documentation describes for the components are the members of the package's code; the sample outputs show what that code prints when it is compiled together with the code of ConsoleCore.

### How a component works

Every component keeps what its constructor was given and draws only into the buffer. The pattern for a drawing component is:

1. Create a [**cConsole**](../TBMANLIB_ConsoleCore/cConsole) and call [**EnterFullScreenMode**](../TBMANLIB_ConsoleCore/cConsole#enterfullscreenmode).
2. Create the component with the console: `Set bar = New cProgressBar(con)`.
3. Call the component's `Render` members to draw into the buffer.
4. Call [**Refresh**](../TBMANLIB_ConsoleCore/cConsole#refresh) to show the buffer.

**cProgressBar**, **cSparkline**, **cVBar** and **cDataGrid** take `console.Buffer` in their constructor and keep it. If the console is not in full-screen mode at that moment, **Buffer** is **Nothing**, the component holds **Nothing**, and its first draw raises error 91, *Object variable or With block variable not set*. A component keeps the buffer it was given: after [**ExitFullScreenMode**](../TBMANLIB_ConsoleCore/cConsole#exitfullscreenmode) and a new **EnterFullScreenMode** the console has a new buffer, and the component still draws into the old one, which the console no longer shows. [**cConsolePanel**](cConsolePanel) and the themes take no console, and [**cConsoleLayout**](cConsoleLayout) reads the buffer of the console each time it draws.

The components do not clear the area they draw in, except where a page says so, do not check that what they draw lies inside the buffer (cells outside it are dropped), and do not flush. A bar drawn over earlier text leaves the rest of that text in place.

Positions are columns and rows of the buffer, counted from 0 at the top left, in that order. A component draws on a black background unless a parameter sets another; the defaults of each member are in its entry. The bars, borders and charts use characters such as U+2588 and U+2500, so the font of the console has to contain them.

## Defects in version 0.0.0.0

- [**cSparkline**](cSparkline#braille) with the Braille character set draws a chart taller than 4 dots with its character rows in reverse order, and draws nothing for a value equal to the minimum when the height is a multiple of 4.
- [**cDataGrid**](cDataGrid) raises error 9 in **Render** unless all four of its arrays are set; [**SetRowColors**](cDataGrid#setrowcolors) is indexed like the data array, header included; [**ScrollTo**](cDataGrid#scrollto) only selects a row and scrolls nothing; its properties can be set and not read.
- [**cConsoleLayout.Resize**](cConsoleLayout#resize) computes the scale factors after it stores the new size, so they are always 1 and no panel changes. [**AddPanel**](cConsoleLayout#addpanel) with a name in use raises error 457 after it has added the panel to the list, which then counts it. The first panel added becomes the root panel whatever method adds it.
- [**cConsoleLayout.SplitHorizontal**](cConsoleLayout#splithorizontal) makes a left and a right panel, and [**cLayoutHelper.SplitHorizontal**](Helpers#splithorizontal) makes a top and a bottom rectangle.
- [**cColorHelper.BrightenColor**](Helpers#brightencolor) returns 16 for **DarkGray**, which is not a **ConsoleColor**. [**DimColor**](Helpers#dimcolor) of a dark colour returns **DarkGray**. [**IntensityColor**](Helpers#intensitycolor) ignores its base colour, and [**GradientColor**](Helpers#gradientcolor) is a three-step choice, not a gradient.
- [**cVBar**](cVBar#barcharstyle) has a style, **Custom**, that draws the same character as **Block**, and [**cProgressBar.RenderWithBrackets**](cProgressBar#renderwithbrackets) draws no percentage.

## Classes and modules

- [cConsoleLayout](cConsoleLayout) -- a set of named panels, with splits, a grid, a sidebar and a header and footer
- [cConsolePanel](cConsolePanel) -- a rectangle with a border, a title and padding, and the content area inside it
- [cConsoleTheme](cConsoleTheme) -- a set of 14 named colours, and the three ready-made themes of **mConsoleThemeFactory**
- [cDataGrid](cDataGrid) -- a table of text with column widths, alignments and a selected row
- [cProgressBar](cProgressBar) -- horizontal and vertical progress bars
- [cSparkline](cSparkline) -- a small line or bar chart of a series of values
- [cVBar](cVBar) -- vertical bar charts, single, grouped and as a history
- [Helpers](Helpers) -- **cColorHelper** picks colours for values, and **cLayoutHelper** computes rectangles and positions in the console window

## See Also

- [TBMANLIB_ConsoleCore](../TBMANLIB_ConsoleCore/) package -- the console, the screen buffer and the types that the components use
- [cConsole](../TBMANLIB_ConsoleCore/cConsole) class -- the full-screen mode and **Refresh**
- [cConsoleBuffer](../TBMANLIB_ConsoleCore/cConsoleBuffer) class -- the grid that the components draw into
- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project
