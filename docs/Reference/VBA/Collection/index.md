---
title: Collection
parent: VBA Package
nav_order: 10
permalink: /tB/Modules/Collection/
has_toc: false
---

# Collection class

A **Collection** is an ordered set of items that can be referred to as a unit. The members of a collection do not have to share a data type --- any value or object reference is acceptable. Items are accessed by their one-based numeric position in the collection or, if they were added with a key, by that key.

## Creating, populating, and disposing of a collection

A collection is created with **New**, populated with [**Add**](Add), and reduced with [**Remove**](Remove) (one item at a time) or [**Clear**](Clear) (every item at once). When the variable referring to the collection goes out of scope, or is set to **Nothing**, the collection --- together with any object references it holds --- is released.

```tb
Sub Demo()
    Dim Cars As Collection
    Set Cars = New Collection

    Cars.Add "Polestar 2", Key:="EV"      ' Add with a key.
    Cars.Add "Volvo XC40", Key:="ICE"
    Cars.Add "Toyota Mirai"               ' Add without a key.

    Debug.Print Cars.Count                ' 3
    Debug.Print Cars("EV")                ' "Polestar 2" — Item is the default member.
    Debug.Print Cars(3)                   ' "Toyota Mirai" — indexes are 1-based.

    Cars.Remove "ICE"                     ' Remove the Volvo XC40 by key.
    Cars.Remove 1                         ' Remove the Polestar 2 by index.

    Set Cars = Nothing                    ' Release the collection.
End Sub
```

## Iterating over a collection

A **Collection** can be iterated with the [**For Each...Next**](../../Core/For-Each-Next) statement, which yields each item in turn in insertion order, regardless of whether the item was added with a key. To iterate over the keys instead, fetch them with [**Keys**](Keys); to take a snapshot of the values as an array (for example, when the collection may be modified during iteration), use [**Items**](Items).

```tb
Dim Numbers As New Collection
Numbers.Add 10
Numbers.Add 20
Numbers.Add 30

Dim n As Variant
For Each n In Numbers
    Debug.Print n            ' Prints 10, then 20, then 30.
Next n
```

## Members

- [Add](Add) -- adds an element to the collection
- [Clear](Clear) -- removes all elements from the collection
- [Count](Count) -- returns the number of elements in the collection
- [Exists](Exists) -- returns whether an element with a specific key exists in the collection
- [Item](Item) -- returns an element from the collection by index or key (default member)
- [Items](Items) -- returns a **Variant** array of all elements in the collection
- [KeyCompareMode](KeyCompareMode) -- returns or sets the text comparison mode used for keys
- [KeyCountHint](KeyCountHint) -- returns or sets a hint for the expected number of keyed items
- [Keys](Keys) -- returns a **String** array of all keys in the collection
- [Remove](Remove) -- removes an element from the collection by index or key
