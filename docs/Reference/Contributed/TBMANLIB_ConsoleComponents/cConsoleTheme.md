---
title: cConsoleTheme
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/cConsoleTheme
has_toc: false
---

# cConsoleTheme class
{: .no_toc }

A set of 14 named colours, which a program uses to draw all its parts in one style, with three ready-made sets in the module **mConsoleThemeFactory**.

A **cConsoleTheme** has no behaviour of its own besides two methods. Its fields are [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor) values that a program reads when it draws. The package reads only three of them: [**cConsoleLayout**](cConsoleLayout) uses **Border** and **Background** to draw the borders of its panels, and **Foreground** and **Background** to clear their content areas. The other fields are for the program's own drawing, for example with [**cDataGrid**](cDataGrid) and [**cProgressBar**](cProgressBar).

```tb check_build check_run
Dim theme As cConsoleTheme = mConsoleThemeFactory.CreateHTOP()
Dim themeCopy As cConsoleTheme = theme.Clone()
Dim blank As New cConsoleTheme

themeCopy.Border = ConsoleColor.Red
Debug.Print theme.Border & " " & themeCopy.Border
Debug.Print theme.GetColor(ThemeColorType.tcSuccess)
Debug.Print blank.Background & " " & blank.Foreground
' Output:
' 7 12
' 10
' 0 0
```

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cConsoleTheme**.

## Fields

The class has 14 public fields, all of the type [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor). A theme that is made with `New cConsoleTheme` has every field at 0, **Black**, until the program sets it; the functions of [mConsoleThemeFactory](#mconsolethemefactory-module) return themes with all fields set.

| Field | Meant for | Read by the package |
|---|---|---|
| **Background** | the background of the screen and of panels | [**cConsoleLayout**](cConsoleLayout): the background of borders, and the colour of cleared areas |
| **Foreground** | ordinary text | [**cConsoleLayout.ClearAllContent**](cConsoleLayout#clearallcontent) and [**ClearPanelContent**](cConsoleLayout#clearpanelcontent) |
| **Border** | borders | [**cConsoleLayout.Render**](cConsoleLayout#render) and [**RenderPanel**](cConsoleLayout#renderpanel) |
| **Primary** | the main accent colour | no |
| **Secondary** | a second accent colour | no |
| **Success** | a good result | no |
| **Warning** | a result that needs attention | no |
| **Error** | a failure | no |
| **Info** | neutral information | no |
| **Muted** | less important text | no |
| **HeaderBackground** | the background of a header or a table heading | no |
| **HeaderForeground** | the text of a header or a table heading | no |
| **SelectedBackground** | the background of a selected item | no |
| **SelectedForeground** | the text of a selected item | no |

The class has no comment on the use of the fields, so the second column describes each from its name. [**cDataGrid**](cDataGrid) has its own colour properties and does not read a theme.

## Methods

### Clone
{: .no_toc }

Returns a copy of the theme.

Syntax: *object*.**Clone** ( ) **As cConsoleTheme**

Returns a new **cConsoleTheme** with the 14 fields of the object. Changing the copy does not change the original.

### GetColor
{: .no_toc }

Returns a colour by its kind.

Syntax: *object*.**GetColor** ( *colorType* ) **As ConsoleColor**

*colorType*
: *required* A [**ThemeColorType**](../TBMANLIB_ConsoleCore/Types#themecolortype): **tcPrimary**, **tcSecondary**, **tcSuccess**, **tcWarning**, **tcError**, **tcInfo**, **tcMuted**, **tcBackground**, **tcForeground**, **tcBorder**, **tcHeaderBackground**, **tcHeaderForeground**, **tcSelectedBackground** or **tcSelectedForeground**.

Returns the field of the same name. For a value that is not one of the 14 members, it returns **Foreground**. The enumeration is declared in the package [TBMANLIB_ConsoleCore](../TBMANLIB_ConsoleCore/Types#themecolortype).

## mConsoleThemeFactory module

The module has three functions that return a new, complete theme each time they are called. They have no parameters, and are written with the name of the module, as in `mConsoleThemeFactory.CreateLight()`.

| Field | **CreateDefault** | **CreateHTOP** | **CreateLight** |
|---|---|---|---|
| **Background** | Black | Black | White |
| **Foreground** | Gray | Gray | Black |
| **Primary** | Blue | Cyan | Blue |
| **Secondary** | DarkGray | DarkBlue | Gray |
| **Success** | Green | Green | DarkGreen |
| **Warning** | Yellow | Yellow | DarkYellow |
| **Error** | Red | Red | DarkRed |
| **Info** | Cyan | Cyan | DarkCyan |
| **Muted** | DarkGray | DarkGray | Gray |
| **Border** | DarkGray | Gray | Gray |
| **HeaderBackground** | DarkBlue | DarkBlue | DarkGray |
| **HeaderForeground** | White | White | White |
| **SelectedBackground** | DarkBlue | Blue | Gray |
| **SelectedForeground** | White | White | Black |

### CreateDefault
{: .no_toc }

Returns the dark theme: grey text on black, with a dark grey border and a blue accent.

Syntax: **CreateDefault** ( ) **As cConsoleTheme**

### CreateHTOP
{: .no_toc }

Returns a theme in the style of the Linux program `htop`: the dark theme with a cyan accent, a light grey border and a bright blue selection.

Syntax: **CreateHTOP** ( ) **As cConsoleTheme**

### CreateLight
{: .no_toc }

Returns the light theme: black text on white, with the darker colours for success, warning, error and information, and grey for the border, the muted text and the selection.

Syntax: **CreateLight** ( ) **As cConsoleTheme**

A console shows the colours of its own colour table, so the "white" of the light theme is the white of that table, and a console whose table is dark can show it differently.

## See Also

- [cConsoleLayout](cConsoleLayout) class -- draws with a theme
- [cConsolePanel](cConsolePanel) class
- [Types](../TBMANLIB_ConsoleCore/Types) of ConsoleCore -- **ConsoleColor** and **ThemeColorType**
