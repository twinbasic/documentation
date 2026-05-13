---
title: Remove
parent: Collection
permalink: /tB/Modules/Collection/Remove
vba_attribution: true
---
# Remove
{: .no_toc }

Removes a member from a **Collection** object.

Syntax: *object*.**Remove(** *index* **)**

*object*
: *required* An object expression that evaluates to a **Collection** object.

*index*
: *required* An expression that specifies the member of the collection to remove. If a numeric expression, *index* must be a number from 1 to the value of the collection's [**Count**](Count) property. If a string expression, *index* must correspond to the *key* argument specified when the member was added to the collection.

If *index* doesn't match an existing member of the collection, an error occurs.

When an item is removed, the indexes of subsequent items decrease by one. Take this into account when iterating over a collection while removing items — see the example below.

Key comparison is governed by the [**KeyCompareMode**](KeyCompareMode) property.

### Example

This example uses the **Remove** method to remove every object from a **Collection** named `MyClasses`. Because items are reindexed automatically, the first item is removed on each iteration of the loop.

```tb
Dim Num As Long, MyClasses As Collection
Set MyClasses = New Collection
' ... assume MyClasses has been populated ...

For Num = 1 To MyClasses.Count
    MyClasses.Remove 1   ' Remove the first object each time
                         ' through the loop until there are
Next Num                 ' no objects left in the collection.
```

To clear a collection in a single call, use the [**Clear**](Clear) method instead.

### See Also

- [Add](Add) method
- [Clear](Clear) method
- [Count](Count) property
- [Item](Item) method
