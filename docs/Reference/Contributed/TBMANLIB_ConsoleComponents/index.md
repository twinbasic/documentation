---
title: TBMANLIB_ConsoleComponents Package
parent: Experimental Packages
has_toc: false
indexed_from: 1.0.0.1
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/
---

# TBMANLIB_ConsoleComponents Package
{: .no_toc }

**Author:** woeoio. **Version:** 1.0.0.1

The **TBMANLIB_ConsoleComponents** contributed package is a set of text-interface components for console programs. It has progress bars ([**cProgressBar**](cProgressBar)), small line charts ([**cSparkline**](cSparkline)), bar charts ([**cVBar**](cVBar)), a table ([**cDataGrid**](cDataGrid)), bordered panels ([**cConsolePanel**](cConsolePanel)), a manager that places panels in a grid, a sidebar or a header and footer ([**cConsoleLayout**](cConsoleLayout)), colour themes ([**cConsoleTheme**](cConsoleTheme)), and helpers for colours and positions ([**cColorHelper**, **cLayoutHelper**](Helpers)). The components draw into the screen buffer of the full-screen mode of [**cConsole**](../TBMANLIB_ConsoleCore/cConsole), in the package [TBMANLIB_ConsoleCore](../TBMANLIB_ConsoleCore/); the program then writes the buffer to the console with [**Refresh**](../TBMANLIB_ConsoleCore/cConsole#refresh). This section documents version 1.0.0.1, published on TWINSERV on 3 February 2026 under the MIT licence. The package describes itself as "TBMAN: Text UI (TUI) component library base on ConsoleCore".

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

> [!WARNING] 1.0.0.1, BETA 1005
> The components that take a **cConsole** cannot be used with the published package [TBMANLIB_ConsoleCore](../TBMANLIB_ConsoleCore/). The package compiles, but the constructors of [**cProgressBar**](cProgressBar), [**cSparkline**](cSparkline), [**cVBar**](cVBar), [**cDataGrid**](cDataGrid), [**cConsoleLayout**](cConsoleLayout) and [**cLayoutHelper**](Helpers), and the members of [**cConsolePanel**](cConsolePanel) that take a **cConsoleBuffer**, raise error -2147467262, *No such interface supported*, when they are given an object of the published ConsoleCore, and a program cannot read the **ConsoleRect** and **ConsolePosition** values that the components return. The package carries a copy of ConsoleCore of its own, and the compiler treats the types of that copy as different from the types of the published package. [The two packages](#the-two-packages) has the details, and the one arrangement in which the components work. Only [**cConsoleTheme**](cConsoleTheme), the module **mConsoleThemeFactory**, [**cColorHelper**](Helpers#ccolorhelper-class) and the geometry of **cConsolePanel** work with the package as it is. The outputs that the samples on these pages show are those of the source files of the components compiled into a project that references ConsoleCore, and not of a project that references the two packages.

* TOC
{:toc}

## Using the package

### The two packages

Like ConsoleCore, the package is meant for a console application; see [Which project it needs](../TBMANLIB_ConsoleCore/cConsole#which-project-it-needs).

A component names types of ConsoleCore in its constructor and its parameters: **cConsole**, **cConsoleBuffer**, **ConsoleColor**, **ConsoleRect** and others. The references of a package are not visible to the project that uses it, so a program that creates a component, or names one of these types, references **TBMANLIB_ConsoleCore** as well as this package. Both are added as [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) describes. TWINSERV lists both packages at version 1.0.0.1.

The project file of this package lists ConsoleCore as an embedded reference: version 1.0.0.1, with the identifier `{A0CCFE06-651A-40A4-84D9-0CA4200A8224}` of the published package, and the package file holds that copy in its own `Packages` folder. The six source files of the copy are the same as those of the published package. A project that imports this package gets the copy inside it, at `/Packages/TBMANLIB_ConsoleComponents/Packages/TBMANLIB_ConsoleCore`, and a program that imports ConsoleCore as well gets a second copy, at `/Packages/TBMANLIB_ConsoleCore`. That is so in either order of import: the program's copy does not replace the one inside the package.

The components are compiled against the copy inside the package. The compiler treats its types as different from those of the copy that the program references, although they have the same names and the same code. A project that references both therefore meets two sets of types, and this is the result:

- **Objects.** Passing a **cConsole** or a **cConsoleBuffer** of the published package to a component compiles. At run time the call raises error -2147467262, *No such interface supported*: the constructors of **cProgressBar**, **cSparkline**, **cVBar**, **cDataGrid**, **cConsoleLayout** and **cLayoutHelper** do, and so do **Render** and **ClearContent** of **cConsolePanel**.
- **Structures.** A **ConsoleRect** or **ConsolePosition** that a component returns, such as the **Rect** field of **cConsolePanel**, or the result of **ContentRect**, **CenterRect**, **Center** or **Grid**, has the type of the copy inside the package. The compiler refuses to read a member of it (TB5027, *[ConsoleRect] does not contain 'Left', or it is inaccessible in this context*), to assign it to a **ConsoleRect** variable (TB5028, *Unable to convert type 'ConsoleRect' to type 'ConsoleRect'*) and to pass it to **ConsoleRect_Contains** (TB5001, *Validation of call to 'ConsoleRect_Contains' failed. Argument for 'rect': cannot coerce type 'ConsoleRect' to 'ConsoleRect'*).
- **Enumerations.** A **ConsoleColor** is a number, so the colour members work: **cConsoleTheme**, **mConsoleThemeFactory** and **cColorHelper** give and take colours, and **cConsolePanel** keeps its style fields.
- **Nested enumerations.** The enumerations of the components, such as **PanelBorderStyle**, are written without the class: `PanelBorderStyle.Double`. The form `cConsolePanel.PanelBorderStyle.Double` is refused (TB5079, *Unrecognized symbol 'cConsolePanel'*).

A program that references only this package cannot create a **cConsole**, and a component cannot be created without one.

The components work when their source files are part of the program's own project and the project references ConsoleCore and not this package: there is then one set of types, and a **cConsole** reaches every component. The files are the `.twin` files of the `Components` folder in the sources of this package, which is published under the MIT licence. The members that this documentation describes for the components are the members of that code, and the sample outputs show what it prints in such a project.

### How a component works

Every component keeps what its constructor was given and draws only into the buffer. The pattern for a drawing component is:

1. Create a [**cConsole**](../TBMANLIB_ConsoleCore/cConsole) and call [**EnterFullScreenMode**](../TBMANLIB_ConsoleCore/cConsole#enterfullscreenmode).
2. Create the component with the console: `Set bar = New cProgressBar(con)`.
3. Call the component's `Render` members to draw into the buffer.
4. Call [**Refresh**](../TBMANLIB_ConsoleCore/cConsole#refresh) to show the buffer.

**cProgressBar**, **cSparkline**, **cVBar** and **cDataGrid** take `console.Buffer` in their constructor and keep it. If the console is not in full-screen mode at that moment, **Buffer** is **Nothing**, the component holds **Nothing**, and its first draw raises error 91, *Object variable or With block variable not set*. A component keeps the buffer it was given: after [**ExitFullScreenMode**](../TBMANLIB_ConsoleCore/cConsole#exitfullscreenmode) and a new **EnterFullScreenMode** the console has a new buffer, and the component still draws into the old one, which the console no longer shows. [**cConsolePanel**](cConsolePanel) and the themes take no console, and [**cConsoleLayout**](cConsoleLayout) reads the buffer of the console each time it draws.

The components do not clear the area they draw in, except where a page says so, do not check that what they draw lies inside the buffer (cells outside it are dropped), and do not flush. A bar drawn over earlier text leaves the rest of that text in place.

Positions are columns and rows of the buffer, counted from 0 at the top left, in that order. A component draws on a black background unless a parameter sets another; the defaults of each member are in its entry. The bars, borders and charts use characters such as U+2588 and U+2500, so the font of the console has to contain them.

No component reads a key or a mouse event. A program that reacts to them uses [**ReadKey**](../TBMANLIB_ConsoleCore/cConsole#readkey) and the handlers of **cConsole**, and meets the defects that [ConsoleCore lists](../TBMANLIB_ConsoleCore/#defects-in-version-1001): **ReadKey** never returns in a program that has no console input, and most key codes of **ConsoleKey** are not the virtual-key codes that **ReadKey** and the key handler return.

## Defects in version 1.0.0.1

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
