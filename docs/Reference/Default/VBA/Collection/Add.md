---
title: Add
parent: Collection
permalink: /tB/Modules/Collection/Add
vba_attribution: true
---
# Add
{: .no_toc }

Adds a member to a **Collection** object.

Syntax: *object*.**Add** *item* [ **,** *key* ] [ **,** *before* ] [ **,** *after* ]

*object*
: *required* An object expression that evaluates to a **Collection** object.

*item*
: *required* An expression of any type that specifies the member to add to the collection.

*key*
: *optional* A unique string expression that specifies a key string that can be used, instead of a positional index, to access a member of the collection.

*before*
: *optional* An expression that specifies a relative position in the collection. The member to be added is placed in the collection before the member identified by the *before* argument. If a numeric expression, *before* must be a number from 1 to the value of the collection's [**Count**](Count) property. If a string expression, *before* must correspond to the *key* specified when the member being referred to was added to the collection. Specify a *before* position or an *after* position, but not both.

*after*
: *optional* An expression that specifies a relative position in the collection. The member to be added is placed in the collection after the member identified by the *after* argument. The same numeric and string-key constraints as *before* apply. Specify a *before* position or an *after* position, but not both.

If neither *before* nor *after* is specified, the new item is added at the end of the collection.

> [!NOTE]
> A *before* of one more than **Count** adds the item at the end, and an *after* of 0 adds it at the start. VB6 and 64-bit VBA raise error 9, *Subscript out of range*, for both.

Key comparison is governed by the [**KeyCompareMode**](KeyCompareMode) property.

<!-- errors: generated from errors/VBA.Collection.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [457 (`&H1C9`)](tb:Errors#457), *This key is already associated with an element of this collection* | *key* is already the key of an item in the collection, as [**KeyCompareMode**](KeyCompareMode) compares keys (by default `"A"` and `"a"` are the same key) |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *key* is not a **String**: a number, **True**, **Null**, an object, **Nothing** or an array<br>*before* or *after* is -1, **True** or **Empty**<br>*before* or *after* is a **Currency**, **Decimal** or **Date** value<br>*before* or *after* is **Null**, an object or **Nothing**, and the collection is not empty |
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | both *before* and *after* are given<br>*before* or *after* is given and the collection is empty<br>*before* or *after* is a string that is not the key of an item |
| [9 (`&H9`)](tb:Errors#9), *Subscript out of range* | *before* is a number that, rounded, is less than 1 or greater than **Count** + 1, or *after* one that is less than 0 or greater than **Count**<br>*before* or *after* is a number outside the **Long** range |

> [!NOTE] BETA 1010
> When *key* is **Empty**, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When *before* or *after* is -1, **True** or **Empty**, VB6 and 64-bit VBA raise error [9 (`&H9`)](tb:Errors#9), *Subscript out of range*, instead.

> [!NOTE] BETA 1010
> When *before* or *after* is a **Currency**, **Decimal** or **Date** value, VB6 and 64-bit VBA raise no error.

> [!NOTE] BETA 1010
> When *before* or *after* is a number outside the **Long** range, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

<!-- /errors -->

### Example

This example uses the **Add** method to add `Inst` objects (instances of a class called `Class1` containing a **Public** variable `InstanceName`) to a collection called `MyClasses`. To run this code, insert a class module and declare a public variable called `InstanceName` at module level of `Class1` (type `Public InstanceName`) to hold the names of each instance. Leave the default name as `Class1`.

```tb hidden
' Context for the sample below: the class module its prose asks the reader to
' insert, with the public variable it names.
Class Class1
    Public InstanceName As Variant
End Class
```

```tb check_build
Dim MyClasses As New Collection    ' Create a Collection object.
Dim Num As Integer                 ' Counter for individualizing keys.
Dim Msg As String
Dim TheName As Variant             ' Holder for names user enters.
Do
    Dim Inst As New Class1         ' Create a new instance of Class1.
    Num = Num + 1                  ' Increment Num, then get a name.
    Msg = "Please enter a name for this object." & vbNewLine _
        & "Press Cancel to see names in collection."
    TheName = InputBox(Msg, "Name the Collection Items")
    Inst.InstanceName = TheName    ' Put name in object instance.
    ' If user entered name, add it to the collection.
    If Inst.InstanceName <> "" Then
        ' Add the named object to the collection.
        MyClasses.Add Item := Inst, Key := CStr(Num)
    End If
    ' Clear the current reference in preparation for next one.
    Set Inst = Nothing
Loop Until TheName = ""
Dim x As Variant
For Each x In MyClasses
    MsgBox x.InstanceName, , "Instance Name"
Next
```

### See Also

- [Count](Count) property
- [Item](Item) method
- [Remove](Remove) method
- [Exists](Exists) method
