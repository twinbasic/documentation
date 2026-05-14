---
title: Themes
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Themes
has_toc: false
---

# Themes class
{: .no_toc }

The IDE's active-theme state — reached through [**Host.Themes**](Host#themes). Pair with the [**Host.OnChangedTheme**](Host#onchangedtheme) event to refresh any colour-sensitive elements the addin draws inside its tool windows.

```tb
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

The name of the current IDE theme — e.g. `"Classic"`, `"Dark"`, `"Light"`. **String**, read-only.

Note that the set of available themes is determined by the IDE and may grow in future versions; do not switch on this value with an exhaustive `Select Case`. For binary light-vs-dark colour decisions, use [**ActiveThemeNameGroup**](#activethemenamegroup) instead.

### ActiveThemeNameGroup
{: .no_toc }

The high-level "family" the current theme belongs to. **String**, read-only — exactly `"dark"` or `"light"`.

Useful for an addin that wants to flip its own colours between dark-on-light and light-on-dark without parsing [**ActiveThemeName**](#activethemename).
