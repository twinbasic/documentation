---
title: Keys
parent: Collection Module
permalink: /tB/Modules/Collection/Keys
---
# Keys
{: .no_toc }

Returns a **String** array containing all the keys associated with items in a **Collection** object.

Syntax: *object*.**Keys()**

*object*
: *required* An object expression that evaluates to a **Collection** object.

> [!NOTE]
>
> **Keys** is a twinBASIC extension; the classic VBA **Collection** object has no **Keys** method.

Only items that were added with a **Key** argument appear in the returned array. If no items have keys, the array is empty.

### Example

```tb
Dim col As New Collection
col.Add "Athens",   Key:="a"
col.Add "Belgrade", Key:="b"
col.Add "Cairo",    Key:="c"

Dim k() As String
k = col.Keys

Dim i As Long
For i = LBound(k) To UBound(k)
    Debug.Print k(i), col(k(i))
Next i
```

### See Also

- [Add](Add) method
- [Exists](Exists) method
- [Item](Item) method
- [Items](Items) method
- [Count](Count) property

{% include VBA-Attribution.md %}
