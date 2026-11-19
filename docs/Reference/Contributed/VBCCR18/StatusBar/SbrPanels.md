---
title: SbrPanels
parent: StatusBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/StatusBar/SbrPanels
has_toc: false
---

# SbrPanels class
{: .no_toc }

The collection of the panels of a [**StatusBar**](.), which its [**Panels**](.#panels) property returns. Its items are [**SbrPanel**](SbrPanel) objects, numbered from 1 from the left, and an item can have a key as well.

A program goes through the panels with **For Each**, or by number from 1 to [**Count**](#count). It cannot make an **SbrPanels** object with **New**.

* TOC
{:toc}

## Numbers and keys

<!-- test: StatusBarTests.Remove_RenumbersTheLaterPanels, StatusBarTests.Add_AtAnIndex_MovesTheLaterPanelsUp -->
The number of a panel is its place in the bar, counted from the left. It changes when a panel is added before it or removed before it, so a program that keeps a number over such a change keeps the wrong panel. A key stays with its panel.
<!-- /test -->

<!-- test: StatusBarTests.Add_DuplicateKey_Raises457AndAddsNothing, StatusBarTests.Key_Assigned_RenamesTheTakesAwayAndRefusesAKeyInUse -->
A key is any string. No two panels of a bar have the same key. A panel needs no key: an empty string is no key, and any number of panels can be without one.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Panel As SbrPanel
StatusBar1.Panels.Add , "pos", "Ln 1"
StatusBar1.Panels.Add 1, "mode", "Insert"           ' before the first
For Each Panel In StatusBar1.Panels
    Debug.Print Panel.Index; "["; Panel.Key; "]"
Next
StatusBar1.Panels.Remove "mode"
Debug.Print StatusBar1.Panels("pos").Index
' Output:
'  1 [mode]
'  2 []
'  3 [pos]
'  2
```

Properties
----------

### Count
{: .no_toc }

The number of panels in the bar. **Long**, read-only. A bar can have at most 255 panels.

### Item
{: .no_toc }

Returns one panel. It is the default member, so `StatusBar1.Panels("pos")` is `StatusBar1.Panels.Item("pos")`.

Syntax: *object*.**Item**( *Index* ) **As SbrPanel**

*Index*
: *required* The number of the panel, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: StatusBarTests.Item_NumberOutOfRange_Raises9AndUnknownKeyRaises5 -->
A number outside that range raises run-time error 9, and a key that no panel has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Makes a panel and returns its [**SbrPanel**](SbrPanel).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Text* ] [, *Style* ] ) **As SbrPanel**

*Index*
: *optional* A **Long**: the number the new panel gets. The panels from that number on move up by one. Without it, or with 0, the panel goes after the last one.

*Key*
: *optional* A **String** by which the program can name the panel. See [Numbers and keys](#numbers-and-keys).

*Text*
: *optional* A **String**: the panel's [**Text**](SbrPanel#text). The default is empty.

*Style*
: *optional* A member of [**SbrPanelStyleConstants**](.#sbrpanelstyleconstants): what the panel shows. The default is **SbrPanelStyleText**.

A new panel has the values that [**SbrPanel**](SbrPanel) gives as defaults. The call has no argument for a picture, so a program sets [**Picture**](SbrPanel#picture) afterward.

<!-- test: StatusBarTests.Add_IndexOutOfRange_Raises35600, StatusBarTests.Add_MoreThan255Panels_Raises35616 -->
A negative *Index*, and one greater than [**Count**](#count) + 1, raises run-time error 35600, *Index out of bounds*. A call that would make the 256th panel raises run-time error 35616, *Maximum Panels Exceeded*.
<!-- /test -->

<!-- test: StatusBarTests.Add_DuplicateKey_Raises457AndAddsNothing -->
A *Key* that another panel has raises run-time error 457, and nothing is added.
<!-- /test -->

<!-- test: StatusBarTests.Add_InvalidStyle_Raises380AndAddsNothing -->
> [!WARNING] 1.8.136.0
> A *Style* that is not a member of **SbrPanelStyleConstants** raises run-time error 380 after the panel has been added. The collection keeps the new panel, with its key and its text, and the bar's window does not show it until another change lays the panels out again. A program checks the value before the call.

### Clear
{: .no_toc }

Removes every panel. A bar with no panels shows an empty strip, and [**Add**](#add) makes the first panel again.

Syntax: *object*.**Clear**

<!-- test: StatusBarTests.Clear_RemovesEveryPanel -->
A program that clears the bar adds the panels it needs again: the panel that a new bar has is removed too.
<!-- /test -->

### Exists
{: .no_toc }

Returns whether the bar has a panel of a number or a key, so that a program can ask before [**Item**](#item) raises an error.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one panel. The panels after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the panel. One that the bar does not have raises the error that [**Item**](#item) raises for it.

## See Also

- [StatusBar](.) -- the control
- [SbrPanel](SbrPanel) -- one panel
