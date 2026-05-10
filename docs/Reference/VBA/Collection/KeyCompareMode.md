---
title: KeyCompareMode
parent: Collection Module
permalink: /tB/Modules/Collection/KeyCompareMode
---
# KeyCompareMode
{: .no_toc }

Returns or sets the comparison mode used when matching string keys in a **Collection** object. Read/write.

Syntax:
- *object*.**KeyCompareMode**
- *object*.**KeyCompareMode** **=** *compare*

*object*
: *required* An object expression that evaluates to a **Collection** object.

*compare*
: A **VbCompareMethod** value specifying the comparison mode used by [**Add**](Add), [**Item**](Item), [**Remove**](Remove) and [**Exists**](Exists) when looking up keys.

The *compare* argument settings are:

| Constant            | Value | Description                          |
|---------------------|-------|--------------------------------------|
| **vbBinaryCompare** | 0     | Performs a case-sensitive binary comparison.   |
| **vbTextCompare**   | 1     | Performs a case-insensitive textual comparison. |

> [!NOTE]
>
> **KeyCompareMode** is a twinBASIC extension; the classic VBA **Collection** object always uses case-insensitive comparison and does not expose this property.

The default comparison mode is **vbTextCompare**. Changing the comparison mode rehashes the existing keys, so for large collections it is most efficient to set **KeyCompareMode** before adding items.

### Example

```tb
Dim col As New Collection

' Default mode is binary (case-sensitive).
col.Add "first",  Key:="A"
col.Add "second", Key:="a"   ' Distinct from "A" — succeeds.

Dim col2 As New Collection
col2.KeyCompareMode = vbTextCompare
col2.Add "first", Key:="A"
' col2.Add "second", Key:="a"  ' Would raise an error — same key as "A".
```

### See Also

- [Add](Add) method
- [Exists](Exists) method
- [KeyCountHint](KeyCountHint) property
- [StrComp](../Strings/StrComp) function
- [Option Compare](../../Core/Option) statement

{% include VBA-Attribution.md %}
