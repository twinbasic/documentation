---
title: Toolbar
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Toolbar
has_toc: false
---

# Toolbar class
{: .no_toc }

One IDE toolbar — the strip of buttons that runs along the top of the IDE window. Addins add their own buttons and separators to it during start-up. Reached through `Host.Toolbars(0)` (currently the only toolbar).

```tb
Private Sub Host_OnProjectLoaded()
    With Host.Toolbars(0)
        .AddSplitter
        Set Button1 = .AddButton("MyAddInButton1", "Action 1", LoadResData("icon.png", "ICONS"))
        Set Button2 = .AddButton("MyAddInButton2", "Action 2")
    End With
End Sub
```

The toolbar is shared with the IDE's own commands and with every other loaded addin — pick button IDs that uniquely identify the addin so multiple addins do not collide.

* TOC
{:toc}

## Methods

### AddButton
{: .no_toc }

Adds a new button to the right-hand end of the toolbar and returns the [**Button**](Button) object for the addin to attach `WithEvents` against.

Syntax: *toolbar*.**AddButton**( *Id*, *Caption* [, *IconData* ] ) **As** [**Button**](Button)

*Id*
: *required* A unique string identifying the button. **String**. Pick an addin-prefixed value (e.g. `"MyAddIn.RefreshButton"`) so multiple loaded addins do not collide.

*Caption*
: *required* The button's label. **String**. When *IconData* is supplied, the caption appears as a tooltip only; when *IconData* is omitted, the caption is displayed inline as the button's text.

*IconData*
: *optional* The button's icon as a **Byte()** array — typically the bytes of an embedded PNG / ICO resource loaded with `LoadResData`. **Variant**. Pass an empty / **Empty** value to omit the icon and show the caption inline.

```tb
Dim icon() As Byte
icon = LoadResData("button1.png", "ICONS")
Set Button1 = Host.Toolbars(0).AddButton("MyAddIn.Button1", "Refresh Project", icon)
```

### AddSplitter
{: .no_toc }

Adds a vertical separator bar to the toolbar — a visual divider between groups of buttons.

Syntax: *toolbar*.**AddSplitter**

Conventional addin start-up pattern: one **AddSplitter** call to separate the addin's buttons from the IDE-native buttons, then a sequence of [**AddButton**](#addbutton) calls.
