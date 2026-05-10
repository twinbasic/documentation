---
title: Exists
parent: Collection Module
permalink: /tB/Modules/Collection/Exists
---
# Exists
{: .no_toc }

Returns **True** if a specified key exists in a **Collection** object; **False** if it does not.

Syntax: *object*.**Exists(** *key* **)**

*object*
: *required* An object expression that evaluates to a **Collection** object.

*key*
: *required* A **String** value identifying the item to locate in the collection.

> [!NOTE]
>
> **Exists** is a twinBASIC extension; the classic VBA **Collection** object has no **Exists** method. The same effect in VBA requires calling [**Item**](Item) inside an error-handling block.

Key comparison is governed by the [**KeyCompareMode**](KeyCompareMode) property.

### Example

```tb
Dim MyCollection As New Collection
MyCollection.Add "alpha", Key:="a"
MyCollection.Add "beta",  Key:="b"

If MyCollection.Exists("a") Then
    Debug.Print "Key 'a' is in the collection."
End If

If Not MyCollection.Exists("z") Then
    Debug.Print "Key 'z' is not in the collection."
End If
```

### See Also

- [Add](Add) method
- [Item](Item) method
- [Keys](Keys) method
- [KeyCompareMode](KeyCompareMode) property

{% include VBA-Attribution.md %}
