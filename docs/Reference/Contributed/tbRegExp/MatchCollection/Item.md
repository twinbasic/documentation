---
title: Item
parent: MatchCollection
permalink: /tB/Packages/Contributed/tbRegExp/MatchCollection/Item
has_toc: false
---

# Item
{: .no_toc }

Returns the [**Match**](../Match/) at a position in the collection.

Syntax: *object*.**Item** ( *pItemIndex* )

*object*
: *required* An object expression that evaluates to a **MatchCollection**.

*pItemIndex*
: *required* A **Variant** holding the zero-based position of the match. The first match is 0 and the last is [**Count**](Count) - 1.

Returns a [**Match**](../Match/). The property is read-only.

## Remarks

**Item** is the default member of the class, so `matches(1)` is the same as `matches.Item(1)`.

The position is zero-based, as in the VBScript object model that the package replaces, although the **Collection** inside the class is one-based. A match has no key, so the argument is always a position.

A position below 0, or not below [**Count**](Count), raises run-time error `vbObjectError + 9` with the message *Requested item not found in Matches collection*.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "[a-z]+"
re.Global = True

Dim matches As MatchCollection
Set matches = re.Execute("one two three")
Debug.Print matches.Item(0).Value  ' one
Debug.Print matches(2).Value       ' three
```

This example asks for a position that the collection does not have.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "[a-z]+"
re.Global = True

Dim matches As MatchCollection
Set matches = re.Execute("one two three")

Dim m As Match
On Error Resume Next
Set m = matches.Item(3)
Debug.Print (Err.Number = vbObjectError + 9)  ' True
Debug.Print Err.Description                   ' Requested item not found in Matches collection
```

## See Also

- [Count](Count) property -- the number of matches
- [NewEnum](NewEnum) method -- the enumerator for **For Each**
- [Match](../Match/) class -- one match
- [MatchCollection](./) class -- overview
