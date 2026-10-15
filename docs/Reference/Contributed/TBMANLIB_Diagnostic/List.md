---
title: List
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/List
has_toc: false
---

# List class
{: .no_toc }

A list of values of one type, in the order in which they were added. It is a generic class, **List(Of T)**, and the index of its first item is 0. The engine uses it for the collectors and the results, a result uses it for its items, and a program can use it for any type. The class keeps its items in a **Collection** of the runtime library.

```tb check_build check_run
Dim names As New List(Of String)
names.Add "Ann"
names.Add "Bob"
names.Add "Cy"
Debug.Print names.Count & " " & names.Item(0) & " " & names.IndexOf("Bob")

names.RemoveAt 1
Debug.Print names.Count & " " & names.Item(1)
Debug.Print names.Contains("Bob")
' Output:
' 3 Ann 1
' 2 Cy
' False
```

**Item** is a function, so an item is read as `names.Item(0)`. The class has no default member and no enumerator: there is no `names(0)`, and the items are visited with an index loop from 0 to **Count** - 1.

**Insert**, and **SetItem** with the index 0, put the item in the wrong place in version 1.0.0.1, and **SetItem** can lose an item. Both pass the position as the fourth argument of **Collection.Add**, which is *after*, where the code needs *before*. [**Insert**](#insert) puts the new item one place too late, and [**SetItem**](#setitem) with the index 0 puts it in the second place. See [Known problems](.#known-problems-in-version-1001).

```tb check_build check_run
Dim text As String
Dim i As Long

Dim a As New List(Of String)
a.Add "a"
a.Add "b"
a.Add "c"
a.Insert 1, "X"
For i = 0 To a.Count - 1
    text = text & a.Item(i)
Next i
Debug.Print text

Dim b As New List(Of String)
b.Add "a"
b.Add "b"
b.Add "c"
b.Insert 0, "Y"
text = ""
For i = 0 To b.Count - 1
    text = text & b.Item(i)
Next i
Debug.Print text

Dim c As New List(Of String)
c.Add "a"
c.Add "b"
c.Add "c"
c.SetItem 0, "Z"
text = ""
For i = 0 To c.Count - 1
    text = text & c.Item(i)
Next i
Debug.Print text
' Output:
' abXc
' aYbc
' bZc
```

The same position is an error when the list has too few items. **Insert** with the index 0 on an empty list raises run-time error 5, *Invalid procedure call or argument*. **SetItem** with the index 0 on a list of one item removes the item and then raises error 5, so the list is left empty and the item is lost:

```tb check_build check_run
Dim one As New List(Of String)
one.Add "a"
On Error Resume Next
one.SetItem 0, "Z"
Debug.Print Err.Number
Err.Clear
Debug.Print one.Count

Dim blank As New List(Of String)
blank.Insert 0, "Y"
Debug.Print Err.Number & ": " & Err.Description
Debug.Print blank.Count
' Output:
' 5
' 0
' 5: Invalid procedure call or argument
' 0
```

<!-- test: ListTests.SetItem_AtZeroOnOneItemList_ErrorHasTheRuntimeText -->
> [!NOTE] BETA 1005
> In a 32-bit run in the IDE, **Err.Description** of the error that **SetItem** raises here is *Automation error*, not *Invalid procedure call or argument*, when the list is declared with `Dim one As New List(Of String)`. **Err.Number** is 5 in every run. A built program, 32-bit or 64-bit, and a 64-bit run in the IDE give the text *Invalid procedure call or argument*, as VB6 does for the same call of **Collection.Add**. A program that tests the number is not affected.

* TOC
{:toc}

## Properties

### Capacity
{: .no_toc }

The capacity of the list.

Syntax: *list*.**Capacity** **As Long**

Read-only. It is the same as [**Count**](#count): the **Collection** under the list has no capacity to set.

### Count
{: .no_toc }

The number of items.

Syntax: *list*.**Count** **As Long**

Read-only.

## Methods

### Add
{: .no_toc }

Adds an item at the end.

Syntax: *list*.**Add** ( *item* )

*item*
: *required* A value of type *T*.

### Clear
{: .no_toc }

Removes all items.

Syntax: *list*.**Clear**

<!-- test: ListTests.Clear_RemovesEveryItem -->
Count and Capacity are 0 afterwards.
<!-- /test -->

### Contains
{: .no_toc }

Tests whether the list holds a value.

Syntax: *list*.**Contains** ( *item* ) **As Boolean**

*item*
: *required* A value of type *T*.

<!-- test: ListTests.Contains_Text_ComparesByValue, ListTests.Contains_Object_FindsIt, ListTests.IndexOf_Object_ReturnsItsPosition, ListTests.Remove_Object_RemovesIt, ListTests.Add_Object_ItemReturnsIt, ListTests.RemoveAt_Object_RemovesIt -->
Returns **True** when an item is equal to *item*. The items are compared with the `=` operator, so the comparison is by value for text and numbers. For objects the operator compares what an object offers by default, and a class that has no default member makes it raise run-time error 438, *Object doesn't support this property or method*, as soon as the list holds an item to compare. **IndexOf** and **Remove**, which calls **IndexOf**, raise the same error. **Item**, **Add** and **RemoveAt** work with objects.
<!-- /test -->

```tb check_build slot=file projname=diag-list
Class Person
    Public Name As String
End Class
```

```tb check_build check_run projname=diag-list
Dim people As New List(Of Person)
Dim ann As New Person
ann.Name = "Ann"
people.Add ann
Debug.Print people.Count & " " & people.Item(0).Name

On Error Resume Next
Debug.Print people.Contains(ann)
Debug.Print Err.Number & ": " & Err.Description
Err.Clear
Debug.Print people.IndexOf(ann)
Debug.Print Err.Number
Err.Clear
Debug.Print people.Remove(ann)
Debug.Print Err.Number & " " & people.Count
' Output:
' 1 Ann
' 438: Object doesn't support this property or method
' 438
' 438 1
```

### IndexOf
{: .no_toc }

Returns the position of a value.

Syntax: *list*.**IndexOf** ( *item* ) **As Long**

*item*
: *required* A value of type *T*.

<!-- test: ListTests.IndexOf_Text_ReturnsZeroBasedIndex -->
Returns the index of the first item that is equal to *item*, compared as in [**Contains**](#contains), or -1 when there is none.
<!-- /test -->

### Insert
{: .no_toc }

Inserts an item at a position.

Syntax: *list*.**Insert** ( *index*, *item* )

<!-- test: ListTests.Insert_AtCount_PutsItemLast, ListTests.Insert_OutOfRange_Raises9 -->
*index*
: *required* A **Long**, the position of the new item, from 0 to [**Count**](#count). With **Count** the item goes at the end.

*item*
: *required* A value of type *T*.

Raises error 9 with the source `List(Of T).Insert` and the text `Index out of range: ` and the index, when *index* is below 0 or above **Count**. See the start of the page for the position of the new item and for the empty list.
<!-- /test -->

### Item
{: .no_toc }

Returns the item at a position.

Syntax: *list*.**Item** ( *index* ) **As T**

*index*
: *required* A **Long**, from 0 to [**Count**](#count) - 1.

<!-- test: ListTests.Item_OutOfRange_Raises9 -->
Raises error 9 with the source `List(Of T).Item` and the text `Index out of range: ` and the index, when *index* is outside the list.
<!-- /test -->

### New
{: .no_toc }

Creates a list.

Syntax: **New** **List(Of T)** [ ( *initialCapacity* ) ]

*initialCapacity*
: *optional* A **Long**. It is accepted and not used.

### Remove
{: .no_toc }

Removes the first item with a value.

Syntax: *list*.**Remove** ( *item* ) **As Boolean**

*item*
: *required* A value of type *T*.

<!-- test: ListTests.Remove_Text_RemovesFirstMatch -->
Returns **True** when an item was found, with [**IndexOf**](#indexof), and removed. Returns **False** when none is equal to *item*.
<!-- /test -->

### RemoveAt
{: .no_toc }

Removes the item at a position.

Syntax: *list*.**RemoveAt** ( *index* )

*index*
: *required* A **Long**, from 0 to [**Count**](#count) - 1.

<!-- test: ListTests.RemoveAt_Text_MovesLaterItemsDown, ListTests.RemoveAt_OutOfRange_Raises9 -->
The items after it move down by one place. Raises error 9 with the source `List(Of T).RemoveAt` and the text `Index out of range: ` and the index, when *index* is outside the list.
<!-- /test -->

### SetItem
{: .no_toc }

Replaces the item at a position.

Syntax: *list*.**SetItem** ( *index*, *item* )

*index*
: *required* A **Long**, from 0 to [**Count**](#count) - 1.

*item*
: *required* A value of type *T*.

<!-- test: ListTests.SetItem_InMiddle_ReplacesItem, ListTests.SetItem_AtLastIndex_ReplacesLastItem, ListTests.SetItem_OutOfRange_Raises9 -->
Removes the item at *index* and adds *item* in its place. Raises error 9 with the source `List(Of T).SetItem` and the text `Index out of range: ` and the index, when *index* is outside the list. See the start of the page for the case of index 0.
<!-- /test -->

### ToArray
{: .no_toc }

Returns the items as an array.

Syntax: *list*.**ToArray** **As Variant()**

<!-- test: ListTests.ToArray_ReturnsZeroBasedVariantArray, ListTests.ToArray_EmptyList_HasNoBounds -->
Returns a **Variant** array whose first element has the index 0. For an empty list it returns an array that has no bounds, and **UBound** and **LBound** raise error 9 for it.
<!-- /test -->

```tb check_build check_run
Dim names As New List(Of String)
Dim items() As Variant
items = names.ToArray()
On Error Resume Next
Debug.Print UBound(items)
Debug.Print Err.Number
Err.Clear

names.Add "a"
names.Add "b"
names.Add "c"
items = names.ToArray()
Debug.Print LBound(items) & " " & UBound(items) & " " & items(2)
' Output:
' 9
' 0 2 c
```

## See Also

- [Dictionary](Dictionary) class -- keys and values, built on two lists
- [DiagnosticResult](DiagnosticResult) class -- holds its items in a list
- [DiagnosticEngine](DiagnosticEngine) class -- holds its collectors in a list
- [Collection](../../../Modules/Collection/) class -- the class that the list keeps its items in
