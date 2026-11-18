---
title: LlbLink
parent: LinkLabel
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/LinkLabel/LlbLink
has_toc: false
---

# LlbLink class
{: .no_toc }

One link of a [**LinkLabel**](.): its text, its address, its name and its state. A program gets one from the control's [**Links**](LlbLinks) collection, from [**SelectedItem**](.#selecteditem) and [**HitTest**](.#hittest), and as the *Link* argument of the control's events.

```tb check_build check_run arch=win32,win64
LinkLabel1.Caption = "<A HREF=""https://example.com/docs"" ID=""docs"">Documentation</A>"
With LinkLabel1.Links(1)
    Debug.Print .Caption
    Debug.Print .IDName
    .Visited = True
    .Enabled = False
    Debug.Print .Visited
    Debug.Print .Enabled
End With
' Output:
' Documentation
' docs
' True
' False
```

<!-- test: LinkLabelTests.Link_KeptAfterTheCaptionChanged_IsTheLinkOfItsNumber -->
An **LlbLink** stands for the link of its number, not for a link it once was. Every property reads and writes the control at the time of the call, so an object kept in a variable while the control's caption changes is then the link that has that number in the new caption. Where the new caption has no link of that number, its properties return empty strings and **False**.
<!-- /test -->

A program cannot make an **LlbLink** object with **New**.

* TOC
{:toc}

Properties
----------

### Caption
{: .no_toc }

The text of the link, without its marks. **String**. An assignment puts the new text in the link's place in the control's [**Caption**](.#caption), and with that makes all the links again from the marks: see [The caption and its links](.#the-caption-and-its-links).

### Enabled
{: .no_toc }

Whether the link takes a click and the Enter key. **Boolean**. A new link is enabled.

### Height, Left, Top, Width
{: .no_toc }

The place and the size of the link in the control, in the scale units of the control's container, **Left** and **Top** measured from the control's top left corner. **Single**, read-only.

<!-- test: LinkLabelTests.Link_LeftAssigned_Raises383 -->
An assignment to any of the four raises run-time error 383.
<!-- /test -->

### Hot
{: .no_toc }

Whether the link is the hot one, drawn as the link under the pointer is. **Boolean**. With the control's [**HotTracking**](.#hottracking) the control sets it as the pointer moves.

### IDName
{: .no_toc }

The name of the link, a string of the program's own by which a handler can tell the links apart. **String**. It is the `ID` of the link's mark in the caption, or what the program assigned.

### Index
{: .no_toc }

The number of the link in the [**LlbLinks**](LlbLinks) collection, from 1. **Long**, read-only.

### Selected
{: .no_toc }

Whether the link has the focus rectangle of the control. **Boolean**. Setting it to **True** selects this link in place of the one that was selected.

### URL
{: .no_toc }

The address of the link. **String**. It is the `HREF` of the link's mark in the caption, or what the program assigned. The control does nothing with it: a [**LinkActivate**](.#linkactivate) handler reads it. It is the default member, so a link used as a value gives its address.

### Visited
{: .no_toc }

Whether the link is drawn in the color of a link that the user has followed. **Boolean**. The control never sets it: a [**LinkActivate**](.#linkactivate) handler does.

## See Also

- [LinkLabel](.) class
- [LlbLinks](LlbLinks) class -- the collection of the links
