---
title: Item
parent: Collection
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

To test for a key without raising an error, use [**Exists**](Exists).

**Item** is the default member of a **Collection** object. Therefore, the following lines of code are equivalent:

```tb check_build
Dim MyCollection As New Collection
Debug.Print MyCollection(1)
Debug.Print MyCollection.Item(1)
```

Key comparison is governed by the [**KeyCompareMode**](KeyCompareMode) property.

<!-- errors: generated from errors/VBA.Collection.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [9 (`&H9`)](tb:Errors#9), *Subscript out of range* | *index* is a number that, rounded, is less than 1 or greater than **Count**, and the collection is not empty<br>the collection is empty and *index* is not a string<br>*index* is **Null**, an object, **Nothing**, an array, an error value or a number outside the **Long** range, and the collection is not empty<br>*index* is a **Currency**, **Decimal** or **Date** value |
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *index* is a string that is not the key of an item |

> [!NOTE] BETA 1010
> When the collection is empty and *index* is not a string, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *index* is **Null**, an object, **Nothing**, an array, an error value or a number outside the **Long** range, and the collection is not empty, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

> [!NOTE] BETA 1010
> When *index* is a **Currency**, **Decimal** or **Date** value, VB6 and 64-bit VBA raise no error.

<!-- /errors -->

### Example

This example uses the **Item** method to retrieve a reference to an object in a collection. Assuming `Birthdays` is a **Collection** object, the following code retrieves references to the objects representing Bill Smith's birthday and Adam Smith's birthday, using the keys `"SmithBill"` and `"SmithAdam"` as the *index* arguments.

The first call explicitly specifies the **Item** method; the second does not. Both calls work because **Item** is the default member of a **Collection** object.

```tb check_build
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
