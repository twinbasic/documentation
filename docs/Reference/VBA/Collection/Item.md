---
title: Item
parent: Collection Module
permalink: /tB/Modules/Collection/Item
vba_attribution: true
---
# Item
{: .no_toc }

Returns a specific member of a **Collection** object, either by position or by key.

Syntax: *object*.**Item(** *index* **)**

*object*
: *required* An object expression that evaluates to a **Collection** object.

*index*
: *required* An expression that specifies the position of a member of the collection. If a numeric expression, *index* must be a number from 1 to the value of the collection's [**Count**](Count) property. If a string expression, *index* must correspond to the *key* argument specified when the member referred to was added to the collection.

If *index* doesn't match any existing member of the collection, an error occurs. If *index* is neither a number nor a string, an error also occurs.

**Item** is the default member of a **Collection** object. Therefore, the following lines of code are equivalent:

```tb
Debug.Print MyCollection(1)
Debug.Print MyCollection.Item(1)
```

Key comparison is governed by the [**KeyCompareMode**](KeyCompareMode) property.

### Example

This example uses the **Item** method to retrieve a reference to an object in a collection. Assuming `Birthdays` is a **Collection** object, the following code retrieves references to the objects representing Bill Smith's birthday and Adam Smith's birthday, using the keys `"SmithBill"` and `"SmithAdam"` as the *index* arguments.

The first call explicitly specifies the **Item** method; the second does not. Both calls work because **Item** is the default member of a **Collection** object.

```tb
Dim SmithBillBD As Object
Dim SmithAdamBD As Object
Dim Birthdays As Collection
' ... assume Birthdays has been populated ...
Set SmithBillBD = Birthdays.Item("SmithBill")
Set SmithAdamBD = Birthdays("SmithAdam")
```

### See Also

- [Add](Add) method
- [Count](Count) property
- [Exists](Exists) method
- [Items](Items) method
- [Remove](Remove) method
