---
title: LlbLinks
parent: LinkLabel
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/LinkLabel/LlbLinks
has_toc: false
---

# LlbLinks class
{: .no_toc }

The collection of the links of a [**LinkLabel**](.), which its [**Links**](.#links) property returns. Its items are [**LlbLink**](LlbLink) objects, numbered from 1 in the order in which the links stand in the caption.

```tb check_build check_run arch=win32,win64
Dim Link As LlbLink
LinkLabel1.Caption = "<A>Back</A> | <A>Next</A> | <A>Close</A>"
For Each Link In LinkLabel1.Links
    Debug.Print Link.Index; Link.Caption
Next
Debug.Print LinkLabel1.Links.Exists(4)
' Output:
'  1 Back
'  2 Next
'  3 Close
' False
```

The collection has no method that adds or removes a link: the links are those of the marks in the control's [**Caption**](.#caption), and a program changes them by assigning another caption. A program cannot make an **LlbLinks** object with **New**.

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The number of links. **Long**, read-only. It is 0 for a caption without links.

### Item
{: .no_toc }

Returns one link. It is the default member, so `LinkLabel1.Links(2)` is `LinkLabel1.Links.Item(2)`.

Syntax: *object*.**Item**( *Index* ) **As LlbLink**

*Index*
: *required* A **Long**: the number of the link, from 1 to [**Count**](#count).

<!-- test: LinkLabelTests.Links_Item_OutOfRange_Raises35600 -->
A number outside that range raises run-time error 35600, *Index out of bounds*.
<!-- /test -->

Methods
-------

### Exists
{: .no_toc }

<!-- test: LinkLabelTests.Links_Exists_SaysWhetherTheNumberIsALink -->
Returns whether the collection has a link of a number, so that a program can ask before [**Item**](#item) raises an error.
<!-- /test -->

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* A **Long**: the number to look for.

## See Also

- [LinkLabel](.) class
- [LlbLink](LlbLink) class -- one link
