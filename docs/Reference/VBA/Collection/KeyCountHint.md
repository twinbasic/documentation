---
title: KeyCountHint
parent: Collection Module
permalink: /tB/Modules/Collection/KeyCountHint
vba_attribution: true
---
# KeyCountHint
{: .no_toc }

Returns or sets a hint to a **Collection** object about the number of keyed items it is expected to hold, allowing the underlying hash table to be sized accordingly. Read/write.

Syntax:
- *object*.**KeyCountHint**
- *object*.**KeyCountHint** **=** *hint*

*object*
: *required* An object expression that evaluates to a **Collection** object.

*hint*
: A **Long** value giving the estimated number of keyed items that will be added to the collection.

> [!NOTE]
>
> **KeyCountHint** is a twinBASIC extension and has no equivalent in the classic VBA **Collection** object.

Setting **KeyCountHint** is optional. It is most effective when set before any items are added to the collection: the hint is used to pre-allocate the hash table and avoid repeated resizing as items are inserted. If the actual number of keyed items exceeds the hint, the collection still functions correctly, but performance may be reduced while the hash table grows.

The hint affects only keyed items (those added with a **Key** argument); items added without a key are unaffected.

### Example

```tb
Dim Big As New Collection
Big.KeyCountHint = 100000   ' We expect about 100k keyed items.

Dim i As Long
For i = 1 To 100000
    Big.Add i, Key:=CStr(i)
Next
```

### See Also

- [Add](Add) method
- [Exists](Exists) method
- [KeyCompareMode](KeyCompareMode) property
