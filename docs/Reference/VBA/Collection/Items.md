---
title: Items
parent: Collection
permalink: /tB/Modules/Collection/Items
vba_attribution: true
---
# Items
{: .no_toc }

Returns a **Variant** array containing all the items in a **Collection** object. The lower bound of the returned array is zero.

Syntax: *object*.**Items()**

*object*
: *required* An object expression that evaluates to a **Collection** object.

> [!NOTE]
>
> **Items** is a twinBASIC extension; the classic VBA **Collection** object has no **Items** method. The same effect in VBA requires iterating the collection with **For Each** and copying each item into an array.

If the collection is empty, **Items** returns an empty array.

The **Items** method is useful when passing the collection's contents to a procedure expecting an array, or to iterate without holding a reference to the collection.

### Example

```tb
Dim col As New Collection
col.Add "Athens"
col.Add "Belgrade"
col.Add "Cairo"

Dim a As Variant
a = col.Items   ' Get all items as a Variant array.

Dim i As Long
For i = LBound(a) To UBound(a)
    Debug.Print a(i)
Next i
```

### See Also

- [Item](Item) method
- [Keys](Keys) method
- [Count](Count) property
- [Add](Add) method
