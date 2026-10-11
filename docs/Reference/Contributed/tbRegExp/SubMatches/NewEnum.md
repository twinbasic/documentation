---
title: NewEnum
parent: SubMatches
grand_parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/SubMatches/NewEnum
has_toc: false
---

# NewEnum
{: .no_toc }

Returns the enumerator that **For Each** uses to go through the strings of the collection.

Syntax: *object*.**NewEnum** **As IUnknown**

*object*
: *required* An object expression that evaluates to a **SubMatches**.

Returns an **IUnknown** that refers to the enumerator of a **Collection** holding the strings of the capture groups.

## Remarks

**NewEnum** is declared with the [**Enumerator**](../../../../Core/Attributes#enumerator) attribute, which makes it the member that [**For Each**](../../../../Core/For-Each-Next) calls to start an enumeration. [Custom Enumerators](../../../../../Features/Language/Custom-Enumerators) describes the rule. It is also declared [**Hidden**](../../../../Core/Attributes#hidden), so it does not appear in certain IntelliSense lists.

The elements come in the order of their positions, from 0 to [**Count**](Count) - 1, and each is the string of one group. A group that took no part in the match gives an empty string. A **Variant** variable receives each element, as in the example.

The class builds the **Collection** when the first enumeration asks for it, and keeps it for the later ones. Reading by position or by name with [**Item**](Item) does not build it.

A program does not need to call **NewEnum**. **For Each** does it.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(\w+)@(\w+)\.com"

Dim matches As MatchCollection
Set matches = re.Execute("ann@example.com")

Dim sm As SubMatches
Set sm = matches(0).SubMatches

Dim part As Variant
For Each part In sm
    Debug.Print part
Next
' Output:
' ann
' example
```

## See Also

- [Item](Item) property -- returns a string by position or by name
- [Count](Count) property -- the number of strings
- [For Each...Next](../../../../Core/For-Each-Next) statement -- uses the enumerator
- [SubMatches](./) class -- overview
