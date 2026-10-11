---
title: NewEnum
parent: MatchCollection
permalink: /tB/Packages/Contributed/tbRegExp/MatchCollection/NewEnum
has_toc: false
---

# NewEnum
{: .no_toc }

Returns the enumerator that **For Each** uses to go through the [**Match**](../Match/) objects of the collection.

Syntax: *object*.**NewEnum** **As IUnknown**

*object*
: *required* An object expression that evaluates to a **MatchCollection**.

Returns an **IUnknown** that refers to the enumerator of the **Collection** holding the matches.

## Remarks

**NewEnum** is declared with the [**Enumerator**](../../../../Core/Attributes#enumerator) attribute, which makes it the member that [**For Each**](../../../../Core/For-Each-Next) calls to start an enumeration. [Custom Enumerators](../../../../../Features/Language/Custom-Enumerators) describes the rule. It is also declared [**Hidden**](../../../../Core/Attributes#hidden), so it does not appear in certain IntelliSense lists.

The enumerator is the one of the **Collection** inside the class, so each element is a **Match**, and the matches come in the order they were found. The element variable of a **For Each** loop can be declared **As Match**, as in the example.

A program does not need to call **NewEnum**. **For Each** does it.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "[a-z]+"
re.Global = True

Dim matches As MatchCollection
Set matches = re.Execute("one two three")

Dim s As String
Dim m As Match
For Each m In matches
    s = s & "[" & m.Value & "]"
Next
Debug.Print s  ' [one][two][three]
```

## See Also

- [Item](Item) property -- returns a match by position
- [Count](Count) property -- the number of matches
- [For Each...Next](../../../../Core/For-Each-Next) statement -- uses the enumerator
- [MatchCollection](./) class -- overview
