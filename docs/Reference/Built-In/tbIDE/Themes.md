---
title: Themes
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Themes
has_toc: false
---

# Themes class
{: .no_toc }

The IDE's active-theme state --- reached through [**Host.Themes**](Host#themes). Pair with the [**Host.OnChangedTheme**](Host#onchangedtheme) event to refresh any colour-sensitive elements the addin draws inside its tool windows.

```tb check_build
Private Sub Host_OnProjectLoaded()
    ApplyThemeColors                      ' set initial colours based on the current theme
End Sub

Private Sub Host_OnChangedTheme(ByVal ThemeName As String)
    ApplyThemeColors                      ' user picked a new theme — re-apply
End Sub

Private Sub ApplyThemeColors()
    Select Case Host.Themes.ActiveThemeNameGroup
        Case "dark":  myToolWindow.ApplyCss "body { background: #1e1e1e; color: white; }"
        Case "light": myToolWindow.ApplyCss "body { background: white;   color: black; }"
    End Select
End Sub
```

* TOC
{:toc}

## Properties

### ActiveThemeName
{: .no_toc }

The name of the current IDE theme --- e.g. `"Classic"`, `"Dark"`, `"Light"`. **String**, read-only.

The set of available themes is determined by the IDE and may grow in future versions; do not switch on this value with an exhaustive `Select Case`. For binary light-vs-dark colour decisions, use [**ActiveThemeNameGroup**](#activethemenamegroup) instead.

### ActiveThemeNameGroup
{: .no_toc }

The high-level "family" the current theme belongs to. **String**, read-only --- exactly `"dark"` or `"light"`.

Useful for an addin that wants to flip its own colours between dark-on-light and light-on-dark without parsing [**ActiveThemeName**](#activethemename).

## Colours for addins

Each theme has eight colours for what an addin draws in its tool windows and its [designers](Designers). The IDE gives each to the addin's CSS as a variable named `--theme` followed by the theme property's name, as it does for every [property of a theme](../../IDE/Customising/Themes#the-format-of-a-theme-file). So a designer whose style sheet uses the variables follows the IDE's theme with no code in the addin, and a [**datasheet**](Datasheet) draws itself in them:

```tb check_build
myToolWindow.ApplyCss _
    "#panel { background: var(--themeAddinPanelBackColor, #2b2e40);" & _
    " color: var(--themeAddinForeColor, #eeeeee);" & _
    " border: 1px solid var(--themeAddinBorderColor, #454a60); }"
```

Give each `var()` a second value, as here, for an IDE whose theme does not set the colour.

<!-- test: bug toolwindow-addin-colours-stale, lane addin:menus -->
> [!NOTE] BETA 1045
> A [**ToolWindow**](ToolWindow) keeps the colours of the theme it was made in: after the user chooses another theme, its variables still hold the old values. A tool window made after the change has the new ones. For a tool window that follows the theme, set its colours in [**Host.OnChangedTheme**](Host#onchangedtheme), as the example at the top of this page does.

| Variable | For | Dark | Light |
|---|---|---|---|
| `--themeAddinBackColor` | The background of the whole window or designer. | `#2b2b2b` | `#FFFFFF` |
| `--themeAddinPanelBackColor` | The background of a panel inside it, such as a header or a toolbar. | `#494343` | `#F0F0F0` |
| `--themeAddinControlBackColor` | The background of a control: a button, a text box, a list. | `#575050` | `#E1E4E6` |
| `--themeAddinBorderColor` | Borders and dividing lines. | `#666060` | `#C3CDDA` |
| `--themeAddinForeColor` | Text. | `#eeeeee` | `#20232B` |
| `--themeAddinSecondaryForeColor` | Text of less weight, such as a hint or a count. | `#BCB5B5` | `#606A79` |
| `--themeAddinAccentBackColor` | The background of what stands out: a selection, the default button. | `#AC947A` | `#3E6FC1` |
| `--themeAddinAccentForeColor` | Text on the accent background. | `#1F1B18` | `#FFFFFF` |

A theme of your own can set them as `AddinBackColor` and the rest; see [Themes](../../IDE/Customising/Themes).
