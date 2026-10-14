---
title: ArrayList
parent: ArrayListLib Package
permalink: /tB/Packages/Contributed/ArrayListLib/ArrayList
has_toc: false
---

# ArrayList class
{: .no_toc }

An **ArrayList** is a list of **Variant** values that grows as items are added. It has the members of the .NET class `System.Collections.ArrayList` which a COM client can call, and it is written in twinBASIC, so it needs no .NET.

Items are numbered from [**BaseIndex**](#baseindex), which is 0 unless the list is made with another number or the property is assigned. An item can be any value: a number, a string, an array or an object, and an object is stored as a reference. A list is created with [**New**](#new), as the class is not predeclared. [**Item**](#item) is the default member, so `list(0)` is the first item of a list with the base 0, and **For Each** goes through the items in order.

```tb check_build
Dim list As New ArrayList
list.Add "pear"
list.Add "apple"
list.Add "fig"
list.Sort

Dim v As Variant
For Each v In list
    Debug.Print v
Next
Debug.Print list.Count
Debug.Print list.IndexOf("fig")
```

**ArrayList** implements [**IArrayList**](Interfaces#iarraylist), which extends [**IListRange**](Interfaces#ilistrange), [**IList**](Interfaces#ilist), [**ICollection**](Interfaces#icollection) and [**IEnumerable**](Interfaces#ienumerable) in turn, and also implements [**ICloneable**](Interfaces#icloneable). A variable can be declared with the class or with any of these interfaces; an interface offers a smaller set of members. The class has one member that no interface has: assigning to [**Count**](#count). A **For Each** over a variable declared with an interface type raises an error: see [Known problems](./#known-problems).

* TOC
{:toc}

## Items and equality

[**Add**](#add), [**Insert**](#insert) and the assignment to [**Item**](#item) store a value as it is. An object is stored as a reference to the object, and an array is copied.

[**Contains**](#contains), [**IndexOf**](#indexof), [**LastIndexOf**](#lastindexof) and [**Remove**](#remove) look for an item that matches the value they are given. Two values match when they have the same subtype and are equal:

- A number matches a number of the same type. An **Integer** 1 does not match a **Long** 1, and neither matches a **Double** 1.
- A string matches a string with the same characters. The letter case counts.
- An object matches the same object, not an object that merely looks alike.
- **Null** matches **Null**, and **Empty** matches **Empty**.

```tb check_build
Dim list As New ArrayList
list.Add 1
list.Add "1"
Debug.Print list.Contains(1)
Debug.Print list.Contains(1&)
Debug.Print list.Contains("1")
Debug.Print list.IndexOf("1")
```

## Capacity and growth

The list keeps its items in an internal array. A new list has room for 2 items, or for the number that [**New**](#new) was given, and [**Capacity**](#capacity) returns the number of items the array holds. When an item is added to a full list, the capacity becomes twice the old capacity plus 1: 2, 5, 11, 23 and so on. [**Clear**](#clear) returns the capacity to 2, and [**Clone**](#clone) gives its copy a capacity equal to the number of items. Assigning to **Capacity** sets it exactly.

```tb check_build
Dim list As New ArrayList
Debug.Print list.Capacity
list.Add "a"
list.Add "b"
Debug.Print list.Capacity
list.Add "c"
Debug.Print list.Capacity
list.Capacity = 100
Debug.Print list.Capacity
list.Clear
Debug.Print list.Capacity
```

## Index base

The first item of a list has the number [**BaseIndex**](#baseindex), which is 0 for a list made with `New ArrayList`. A list made with `New ArrayList(, 1)` numbers its items from 1, as a Visual Basic **Collection** does. Every member that takes or returns the number of an item counts from the base: [**Item**](#item), [**Add**](#add), [**Insert**](#insert), [**IndexOf**](#indexof), [**LastIndexOf**](#lastindexof), [**RemoveAt**](#removeat), [**GetRange**](#getrange), [**BinarySearch**](#binarysearch) and the others that take an *Index*. [**ToArray**](#toarray) returns an array with the same lower bound. A [**ListRange**](ListRange) has the base of its list when it is made.

Three things are counted from 0 in any case: the *Index* of [**GetEnumerator**](#getenumerator) and the positions of the [**Enumerator**](Enumerator) it returns, the array that [**Items**](#items) returns, and the *Index* of [**CopyTo**](#copyto) when the target is an array, which is an index of that array.

```tb check_build
Dim list As ArrayList = New ArrayList(, 1)
list.Add "first"
list.Add "second"
list.Add "third"
Debug.Print list(1)
Debug.Print list.IndexOf("third")
Debug.Print list.BaseIndex
list.BaseIndex = 10
Debug.Print list(10)
Dim a() As Variant
a = list.ToArray()
Debug.Print LBound(a)
```

## Enumerating

**For Each** goes through the items from the first to the last, with a **Variant** as its variable. [**GetEnumerator**](#getenumerator) is the member that **For Each** calls; a program can call it with arguments to go through a part of the list, backwards, or in steps. [**Items**](#items), a hidden member, returns the items as an array.

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "b", "c", "d", "e")

Dim v As Variant
For Each v In list.GetEnumerator(1, 3)
    Debug.Print v
Next
```

The enumerator reads the array of the list in place, and nothing checks that the list is unchanged while **For Each** runs. The documentation of the .NET class says that its enumerator is invalidated by a change to the list and raises an **InvalidOperationException**. A program should not add or remove items inside the loop.

> [!WARNING] 1.6.151.1
> A **For Each** over a list with no items raises error -2147467259, *Unspecified error*, and one that runs under `On Error Resume Next` never ends. A program has to test **Count** first. A second call of **GetEnumerator** on the same unchanged list, after the first loop ran to the end, ignores its *Index*, *GetCount* and *GetStep* arguments and gives the first loop's part again; a **For Each** with no arguments then gives that part too. See [Known problems](./#known-problems).

## Ranges

[**GetRange**](#getrange) returns a [**ListRange**](ListRange), a view of a run of items, not a copy. A change made through the view changes the list. A change made to the list invalidates the view, and its next use raises an error. See [ListRange](ListRange).

## Sorting

[**Sort**](#sort) is a quicksort, so items that compare equal can change places. Without a comparer, items are compared with the `<` operator on **Variant** values. With a comparer, an object that implements [**IComparer**](Interfaces#icomparer), the sign of the number that **Compare** returns decides the order. The [**Comparer**](Comparer) class is a ready-made comparer. [**BinarySearch**](#binarysearch) needs the items in the order that the comparer, or the `<` operator, gives.

## Errors

| Number | Text | Raised by |
|--------|------|-----------|
| 9 | Subscript out of range | [**Item**](#item) and [**RemoveAt**](#removeat) with an index outside the list; [**RemoveRange**](#removerange), [**Reverse**](#reverse), [**GetRange**](#getrange), [**IndexOf**](#indexof), [**LastIndexOf**](#lastindexof) and [**SetRange**](#setrange) with a run that does not lie in the list; [**Count**](#count) with a negative value; [**CopyTo**](#copyto) with an index outside the array |
| 13 | Type mismatch | [**CopyTo**](#copyto), [**InsertRange**](#insertrange), [**AddRange**](#addrange) and [**SetRange**](#setrange) with something that is neither an array nor an object |
| 6 | Overflow | [**CopyTo**](#copyto) with an array that is too small |
| 438 | Object doesn't support this property or method | [**InsertRange**](#insertrange), [**AddRange**](#addrange) and [**SetRange**](#setrange) with an object that has no **Count** property |
| -2147467259 | Unspecified error | [**New**](#new) and [**Capacity**](#capacity) with a capacity of 0 or less; [**Clone**](#clone) of a list with no items; **For Each** over a list with no items |

Apart from the last row, the numbers are raised with the standard text of the run time.

## Differences from the .NET class

- **Count.** The .NET property is read only. Here it can be assigned.
- **BaseIndex.** The .NET class always numbers its items from 0. Here [**BaseIndex**](#baseindex) sets the number of the first item.
- **ToString.** The .NET class inherits **ToString** from **Object**, which returns the name of the type. Here [**ToString**](#tostring) writes the items as text.
- **Sort.** Without a comparer, strings are compared by their characters, so an upper-case letter comes before a lower-case one. The .NET class compares them as the current culture does, where `apple` comes before `Apple`. Items of different kinds, such as numbers and strings, make the .NET method raise an error; here they are put in the order of the `<` operator.
- **Capacity.** A new .NET list has room for no items, and doubles its room from 4 items on; **Clear** keeps it. Here a new list has room for 2, the room becomes twice the old room plus 1, and **Clear** returns it to 2.
- **Empty lists.** A **For Each** over a .NET list with no items makes no pass, and **Clone** of one works. Here both raise an error.
- **Checks.** [**Insert**](#insert), [**InsertRange**](#insertrange), [**Sort**](#sort) and [**BinarySearch**](#binarysearch) do not check their index and count against the list, and the assignment to [**Capacity**](#capacity) does not check its value against **Count**. The documentation of the .NET class lists an **ArgumentOutOfRangeException** for an **Insert** index outside the list and for a **Capacity** below **Count**.
- **Changes during a loop.** See [Enumerating](#enumerating).
- **Parameters.** The count parameters are named *GetCount*, not *count*, and a named argument has to use that name.

## Constructors

### New
{: .no_toc }

Creates a list.

Syntax: **New ArrayList** [ ( [ *Capacity* ] [ , *BaseIndex* ] ) ]

*Capacity*
: *optional* A **Long**: the number of items the list has room for. The default is 2. A value of 0 or less raises error -2147467259 (*Unspecified error*).

*BaseIndex*
: *optional* A **Long**: the number of the first item. The default is 0.

**New** with arguments is a part of an expression, so the variable is declared first. `Dim list As New ArrayList(10)` is a syntax error; `Dim list As ArrayList = New ArrayList(10)` and `Set list = New ArrayList(10)` work. The arguments can be named or left out, as in `New ArrayList(, 1)`.

```tb check_build
Dim a As ArrayList = New ArrayList(100)
Dim b As ArrayList = New ArrayList(, 1)
Dim c As ArrayList = New ArrayList(Capacity:=10, BaseIndex:=1)
Set a = New ArrayList(5)
Debug.Print a.Capacity & " " & b.BaseIndex & " " & c.Capacity
```

## Properties

### BaseIndex
{: .no_toc }

The number of the first item. **Long**, read/write.

Syntax: *object*.**BaseIndex** [ **=** *value* ]

*value*
: A **Long**. The default is 0.

Assigning a value renumbers the items: the first item has the number *value*, and the others follow. The items do not move. The assignment counts as a change of the list, so a [**ListRange**](ListRange) made before it is invalid afterwards. See [Index base](#index-base).

[**IndexOf**](#indexof) and [**LastIndexOf**](#lastindexof) return -1 for an item they do not find. With a **BaseIndex** below 0, -1 can also be the number of an item, and [**Remove**](#remove) acts on it. See [Known problems](./#known-problems).

### Capacity
{: .no_toc }

The number of items the list has room for. **Long**, read/write.

Syntax: *object*.**Capacity** [ **=** *value* ]

*value*
: A **Long**, at least [**Count**](#count). A value of 0 or less raises error -2147467259.

A new list has a capacity of 2, or the number that [**New**](#new) was given. The list grows by itself when an item is added to a full list, so setting the capacity is needed only to avoid repeated growth when the final size is known. The value is used exactly.

The assignment does not check *value* against [**Count**](#count). With a value below **Count**, the items past the capacity cannot be read, and error 9 is raised for them. The assignment does not change the version number of the list, so an enumerator that a previous **For Each** left behind does not notice the move of the items; see [Known problems](./#known-problems).

### Count
{: .no_toc }

The number of items in the list. **Long**, read/write.

Syntax: *object*.**Count** [ **=** *value* ]

*value*
: A **Long**, 0 or more. A negative value raises error 9.

Assigning a value larger than the current count makes the positions up to that count part of the list. They hold what the internal array holds there: **Empty** in an array that the assignment had to enlarge, or the items left by an earlier, smaller count.

Assigning a smaller value ends the list at that count, but does not clear or release the items that follow: an object among them stays referenced until the position is written again. See [Known problems](./#known-problems).

The assignment is a member of the class only; the interfaces have **Count** as a read-only property. The .NET class has no assignment.

```tb check_build
Dim list As New ArrayList
list.Count = 3
list(1) = "middle"
Debug.Print list.Count
Debug.Print IsEmpty(list(0))
Debug.Print list(1)
```

### Item
{: .no_toc }

The item at a position. **Variant**, read/write, and the default member.

Syntax: [ **Set** ] *object*.**Item** ( *index* ) [ **=** *value* ]

*index*
: A **Long** from [**BaseIndex**](#baseindex) to **BaseIndex** + **Count** - 1. A value outside the list raises error 9.

*value*
: The new item. Use **Set** to store an object reference.

Writing replaces the item. The previous value, and the reference if it was an object, is released.

```tb check_build
Dim list As New ArrayList
list.Add "a"
list.Add "b"
list(0) = "first"
list.Item(1) = "second"
Debug.Print list(0) & " " & list(1)
Set list(1) = New Collection
Debug.Print TypeName(list(1))
```

## Methods

### Add
{: .no_toc }

Adds an item at the end of the list and returns its index.

Syntax: *object*.**Add** ( *value* ) **As Long**

*value*
: *required* The item: any **Variant**, an object included.

Returns the index of the new item, which is [**BaseIndex**](#baseindex) plus the value of [**Count**](#count) before the call.

```tb check_build
Dim list As New ArrayList
Debug.Print list.Add("a")
Debug.Print list.Add("b")
Debug.Print list.Count
```

### AddRange
{: .no_toc }

Adds the items of an array or of another collection at the end of the list.

Syntax: *object*.**AddRange** ( *Target* )

*Target*
: *required* An array, or an object. See [**InsertRange**](#insertrange) for the kinds of *Target*.

**AddRange** is the same as [**InsertRange**](#insertrange) at index **Count**.

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "b")
Dim more As New Collection
more.Add "c"
more.Add "d"
list.AddRange more
Debug.Print list.Count
Debug.Print list(3)
```

### BinarySearch
{: .no_toc }

Searches a sorted run of items and returns the index of a value.

Syntax: *object*.**BinarySearch** ( *Index*, *GetCount*, *Value* [ , *Comparer* ] ) **As Long**

*Index*
: *required* A **Long**: the index of the first item to search, counted from [**BaseIndex**](#baseindex).

*GetCount*
: *required* A **Long**: the number of items to search.

*Value*
: *required* The value to look for.

*Comparer*
: *optional* An object that implements [**IComparer**](Interfaces#icomparer). Without it, the items are compared with the `<` operator, and equality with `=`.

Returns the index of a matching item. When there is none, the result is negative: **Not** *result* is the index of the first item that is larger than *Value*, or **BaseIndex** + **Count** if there is none. When several items match, the result is the index of any one of them.

The items from *Index* must be sorted in the order that *Comparer*, or the `<` operator, gives. The method does not check *Index* and *GetCount* against the list.

```tb check_build
Dim list As New ArrayList
list.AddRange Array(10, 20, 30, 40)
Debug.Print list.BinarySearch(0, list.Count, 30)
Dim pos As Long = list.BinarySearch(0, list.Count, 25)
Debug.Print pos
Debug.Print Not pos
```

### Clear
{: .no_toc }

Removes all items from the list.

Syntax: *object*.**Clear** ( )

The objects among the items are released. The capacity returns to 2.

### Clone
{: .no_toc }

Returns a copy of the list.

Syntax: *object*.**Clone** ( ) **As Variant**

Returns a **Variant** that holds a new **ArrayList** with the same items and the same [**BaseIndex**](#baseindex). The copy is shallow: an object among the items is shared with the copy, not duplicated. **Clone** is the member of [**ICloneable**](Interfaces#icloneable), which **ArrayList** implements; the interface **IArrayList** does not have it, so a variable of that type needs an **ICloneable** variable to call it.

```tb check_build
Dim a As New ArrayList
a.AddRange Array(1, 2, 3)
Dim b As ArrayList
Set b = a.Clone()
a.Add 4
Debug.Print a.Count
Debug.Print b.Count
```

> [!NOTE] 1.6.151.1
> **Clone** of a list with no items raises error -2147467259, *Unspecified error*.

### Contains
{: .no_toc }

Returns whether the list holds an item that matches a value.

Syntax: *object*.**Contains** ( *Value* ) **As Boolean**

*Value*
: *required* The value to look for. See [Items and equality](#items-and-equality) for what matches.

### CopyTo
{: .no_toc }

Copies the items to an array, or over the items of another list.

Syntax: *object*.**CopyTo** ( *Target*, *Index* )

*Target*
: *required* An array of any type, or an object that implements [**IListRange**](Interfaces#ilistrange), such as an **ArrayList**. The items are assigned one by one to the elements of an array of another type than **Variant**.

*Index*
: *required* A **Long**: the index in *Target* of the first item copied. For a list it is counted from the **BaseIndex** of *Target*.

The array is filled in place; it keeps its size. When *Target* is a list, its items from *Index* are replaced and its count does not change, as for [**SetRange**](#setrange).

Errors: error 9 when *Index* is below 0 or above the last index of an array; error 13 when *Target* is not an array and not a list; error 6, *Overflow*, when `UBound(Target) - Index` is less than **Count**. The last check is one element too strict: an array that has exactly **Count** elements from *Index* is refused. See [Known problems](./#known-problems).

```tb check_build
Dim list As New ArrayList
list.AddRange Array("x", "y", "z")
Dim target(0 To 4) As Variant
list.CopyTo target, 1
Debug.Print target(1) & target(2) & target(3)
Debug.Print IsEmpty(target(0))
```

### GetEnumerator
{: .no_toc }

Returns the enumerator that **For Each** uses, optionally for a part of the list, in steps, or backwards.

Syntax: *object*.**GetEnumerator** ( [ *Index* ] [ , *GetCount* ] [ , *GetStep* ] [ , *ThisEnumerator* ] ) **As stdole.IUnknown**

*Index*
: *optional* A **Long**: the index of the first item, counted from 0 whatever the [**BaseIndex**](#baseindex) of the list is. The default is 0.

*GetCount*
: *optional* The number of items in the part to go through. The default is all the items from *Index*.

*GetStep*
: *optional* A **Long**: how far the enumerator moves for each item. The default is 1. A negative value goes backwards, starting at the last item of the part.

*ThisEnumerator*
: *optional* An [**IEnumerator**](Interfaces#ienumerator) variable that receives the enumerator, so that the loop can change its position, step or size. The positions of that enumerator are counted from 0 as well. See [**Enumerator**](Enumerator).

**For Each** calls this method without arguments. Calling it with arguments inside the loop header goes through part of the list. The method is marked [**[Enumerator]**](../../../Core/Attributes#enumerator). The result is an [**Enumerator**](Enumerator) object, or nothing when *GetCount* is 0 or less, which is the case for every call of a list with no items.

The method does not check *GetCount* against the number of items.

The list keeps two enumerators and returns the first one whenever it is not in use, binding it again only when the list has changed.

> [!WARNING] 1.6.151.1
> After a **For Each** over the list ran to the end, and while the list is unchanged, a call with other values of *Index*, *GetCount* and *GetStep* gives the enumerator of the first call. A **For Each** over the list with no arguments then goes through the part of the first loop, not through all the items. A loop that was left with **Exit For** does not do this, as it leaves the first enumerator in use. A third loop nested inside two others, over the same list, gives wrong items. Assigning to [**Capacity**](#capacity) does not count as a change of the list, so the next loop can read memory that the items have left. The loops in the example below are over lists of their own for this reason.

```tb check_build
Dim backwards As New ArrayList
backwards.AddRange Array("a", "b", "c", "d", "e")
Dim everyOther As New ArrayList
everyOther.AddRange Array("a", "b", "c", "d", "e")

Dim v As Variant
For Each v In backwards.GetEnumerator(, , -1)
    Debug.Print v
Next
Debug.Print "--"
For Each v In everyOther.GetEnumerator(0, , 2)
    Debug.Print v
Next
```

### GetRange
{: .no_toc }

Returns a view of a run of items.

Syntax: *object*.**GetRange** ( *Index*, *GetCount* ) **As IListRange**

*Index*
: *required* A **Long**: the index of the first item of the run, counted from [**BaseIndex**](#baseindex).

*GetCount*
: *required* A **Long**: the number of items in the run.

Returns a [**ListRange**](ListRange), as an [**IListRange**](Interfaces#ilistrange). The view shares the items of the list, so changing an item in the view changes the list. The view has the **BaseIndex** that the list has now. Error 9 is raised when the run does not lie in the list. A change made through the view can leave it reading released memory: see [A range after the list grows](ListRange#a-range-after-the-list-grows).

The type **IListRange** has no **Reverse**, **LastIndexOf**, **Capacity**, **BaseIndex** or **Items**; the type **IArrayList** has them. Neither of them has **Clone**, which belongs to **ICloneable**.

```tb check_build
Dim list As New ArrayList
list.AddRange Array(10, 20, 30, 40, 50)
Dim r As IListRange = list.GetRange(1, 3)
r.Add 35
Debug.Print r.Count
Debug.Print list.Count
Debug.Print list(4)
list.Add 60
On Error Resume Next
Debug.Print r.Count
Debug.Print Err.Number
Debug.Print Err.Description
```

### IndexOf
{: .no_toc }

Returns the index of the first item that matches a value, or -1.

Syntax: *object*.**IndexOf** ( *Value* [ , *Index* [ , *GetCount* ] ] ) **As Long**

*Value*
: *required* The value to look for. See [Items and equality](#items-and-equality).

*Index*
: *optional* A **Long**: the index where the search starts. The default is [**BaseIndex**](#baseindex). The parameter is declared as a **Variant**, so that a call can leave it out and give *GetCount*.

*GetCount*
: *optional* The number of items to search. The default is all the items from *Index*.

Returns -1 when no item matches. Error 9 is raised when *Index* is above **BaseIndex** + **Count**, *GetCount* is negative, or the run does not fit in the list.

### Insert
{: .no_toc }

Inserts an item at a position and moves the items from there on up by one.

Syntax: *object*.**Insert** ( *Index*, *Value* )

*Index*
: *required* A **Long** from [**BaseIndex**](#baseindex) to **BaseIndex** + **Count**. With **BaseIndex** + **Count**, the item is added at the end.

*Value*
: *required* The item.

*Index* is not checked against the list. The method moves **Count** + **BaseIndex** - *Index* items up to make room, so the number is negative for a value above the end, and the program can crash. See [Known problems](./#known-problems).

> [!WARNING] 1.6.151.1
> **Insert** at **BaseIndex**, the first position of a list that has items, raises error 9 unless the list has room for 31 more items than it holds (its [**Capacity**](#capacity) is at least **Count** + 31). Give [**New**](#new) a capacity, or assign **Capacity**, to avoid the error.

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "c")
list.Insert 1, "b"
list.Insert list.Count, "d"
Dim v As Variant
For Each v In list
    Debug.Print v
Next
```

### InsertRange
{: .no_toc }

Inserts the items of an array or of another collection at a position.

Syntax: *object*.**InsertRange** ( *Index*, *Target* )

*Index*
: *required* A **Long** from [**BaseIndex**](#baseindex) to **BaseIndex** + **Count**. The items are inserted in front of the item that is at *Index* now. As for [**Insert**](#insert), the value is not checked. An *Index* of **BaseIndex** with a *Target* of exactly one item raises error 9, as [**Insert**](#insert) does, unless the list has room for 31 more items than it holds; a *Target* of two or more items does not.

*Target*
: *required* The items to insert: an array or an object, as described below.

*Target* is one of:

- an array of any type. The items of an array of **Variant** are copied; the others are read one by one;
- an **ArrayList** or a [**ListRange**](ListRange), or any other object that implements [**IListRange**](Interfaces#ilistrange);
- any other object that has a **Count** property and that **For Each** can go through, such as a **Collection**.

Error 13 is raised when *Target* is neither an array nor an object.

```tb check_build
Dim list As New ArrayList
list.AddRange Array(1, 2)
list.InsertRange 1, Array("a", "b")
Dim v As Variant
For Each v In list
    Debug.Print v
Next
```

### LastIndexOf
{: .no_toc }

Returns the index of the last item that matches a value, or -1.

Syntax: *object*.**LastIndexOf** ( *Value* [ , *Index* [ , *GetCount* ] ] ) **As Long**

*Value*
: *required* The value to look for.

*Index*
: *optional* The index where the search starts, going towards the start of the list. The default is the last item. The parameter is declared as a **Variant**, so that a call can leave it out and give *GetCount*.

*GetCount*
: *optional* The number of items to search, counted back from *Index*. The default is all the items from *Index* down to the first.

Returns -1 when no item matches. Error 9 is raised when *Index* is **BaseIndex** + **Count** or more, or *GetCount* is more than *Index* - **BaseIndex** + 1.

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "b", "a", "c")
Debug.Print list.LastIndexOf("a")
Debug.Print list.LastIndexOf("a", 1)
Debug.Print list.LastIndexOf("a", 3, 1)
```

### Remove
{: .no_toc }

Removes the first item that matches a value.

Syntax: *object*.**Remove** ( *Value* )

*Value*
: *required* The value to remove. See [Items and equality](#items-and-equality).

Nothing happens, and no error is raised, when no item matches.

> [!WARNING] 1.6.151.1
> With a [**BaseIndex**](#baseindex) below 0, **Remove** of a value that is not in the list removes the item at index -1, or raises error 9 when the list has no such item. The method takes the -1 that [**IndexOf**](#indexof) returns for a missing value as the index of an item.

### RemoveAt
{: .no_toc }

Removes the item at a position and moves the later items down by one.

Syntax: *object*.**RemoveAt** ( *Index* )

*Index*
: *required* A **Long** from [**BaseIndex**](#baseindex) to **BaseIndex** + **Count** - 1. A value outside the list raises error 9.

### RemoveRange
{: .no_toc }

Removes a run of items.

Syntax: *object*.**RemoveRange** ( *Index*, *GetCount* )

*Index*
: *required* A **Long**: the index of the first item to remove, counted from [**BaseIndex**](#baseindex).

*GetCount*
: *required* A **Long**: the number of items to remove.

Error 9 is raised when *Index* or *GetCount* is negative, or the run does not lie in the list.

### Reverse
{: .no_toc }

Reverses the order of the items, or of a run of them.

Syntax: *object*.**Reverse** ( [ *Index* ] [ , *GetCount* ] )

*Index*
: *optional* A **Long**: the index of the first item of the run. The default is [**BaseIndex**](#baseindex). The parameter is declared as a **Variant**, so that a call can leave it out and give *GetCount*.

*GetCount*
: *optional* The number of items in the run. The default is all the items from *Index*.

Error 9 is raised when the run does not lie in the list.

The loop runs for *i* from 0 up to and including half of *GetCount*, rounded down, and swaps item *Index* + *i* with item *Index* + *GetCount* - 1 - *i*. For an even *GetCount* the last pass swaps the middle pair a second time, so those two items keep their order; for a *GetCount* of 0 the loop still runs once.

> [!WARNING] 1.6.151.1
> A run with an even number of items is not reversed correctly: its two middle items stay where they are, so `a b c d` becomes `d b c a` and a run of two items does not change at all. A run of an odd number of items is reversed correctly. With a *GetCount* of 0, and so for a list with no items, the single pass swaps the item at *Index* with the one before it; for a list with no items that writes outside the array that holds the items and damages the memory, and a later growth of the list failed. See [Known problems](./#known-problems).

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "b", "c", "d", "e")
list.Reverse
Dim v As Variant
For Each v In list
    Debug.Print v
Next
```

### SetRange
{: .no_toc }

Replaces the items from a position with the items of an array or of another collection.

Syntax: *object*.**SetRange** ( *Index*, *Target* )

*Index*
: *required* A **Long**: the index of the first item to replace, counted from [**BaseIndex**](#baseindex).

*Target*
: *required* An array, or an object. The kinds are those of [**InsertRange**](#insertrange).

The count of the list does not change. Error 9 is raised when the items of *Target* do not fit in the list from *Index* on, and error 13 when *Target* is neither an array nor an object.

```tb check_build
Dim list As New ArrayList
list.AddRange Array(1, 2, 3, 4)
list.SetRange 1, Array("x", "y")
Dim v As Variant
For Each v In list
    Debug.Print v
Next
```

### Sort
{: .no_toc }

Sorts the items, or a run of them.

Syntax: *object*.**Sort** ( [ *Index* ] [ , *GetCount* ] [ , *Comparer* ] )

*Index*
: *optional* A **Long**: the index of the first item of the run. The default is [**BaseIndex**](#baseindex). The parameter is declared as a **Variant**, so that a call can leave it out and give *GetCount*.

*GetCount*
: *optional* The number of items in the run. The default is all the items from *Index*.

*Comparer*
: *optional* An object that implements [**IComparer**](Interfaces#icomparer). Without it, the items are compared with the `<` operator.

The order is ascending. To sort in the other direction, give a comparer that reverses its result, or call [**Reverse**](#reverse) afterwards, which keeps the two middle items of an even number in place. The method does not check *Index* and *GetCount* against the list: a run that reaches past the last item takes in places that hold nothing, which are sorted in front of the items, and moves items out of the list.

Items of different kinds, such as numbers and strings, are put in the order that the `<` operator gives for **Variant** values. A **Null** or an **Empty** among the items does not take a place in that order, and the result is not sorted.

```tb check_build projname=arraylist-sort slot=file
Class LengthComparer
    Implements IComparer

    Public Function Compare(X As Variant, Y As Variant) As Long Implements IComparer.Compare
        Return Len(X) - Len(Y)
    End Function
End Class
```

```tb check_build projname=arraylist-sort
Dim list As New ArrayList
list.AddRange Array("elderberry", "fig", "banana", "kiwi", "apple")
list.Sort 0, , New LengthComparer

Dim v As Variant
For Each v In list
    Debug.Print v
Next
```

### ToArray
{: .no_toc }

Returns the items as an array.

Syntax: *object*.**ToArray** ( ) **As Variant()**

Returns a new array of **Variant**, with the lower bound [**BaseIndex**](#baseindex). The array is a copy; an object among the items is shared with it. A list with no items gives an array with no elements, with the bounds 0 and -1, whatever **BaseIndex** is.

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "b", "c")
Dim a() As Variant
a = list.ToArray()
Debug.Print LBound(a) & " " & UBound(a)
list.Clear
a = list.ToArray()
Debug.Print UBound(a)
```

### ToString
{: .no_toc }

Returns the items as text, in the notation of a JSON array.

Syntax: *object*.**ToString** ( [ *TextQualifier* ] [ , *UseNullAsEmpty* ] ) **As String**

*TextQualifier*
: *optional* A **String** written before and after each string and each date. Where it occurs in a string, it is written twice. The default is a double quote, `"`. An empty string writes strings and dates without any mark.

*UseNullAsEmpty*
: *optional* A **Boolean**. When **True**, which is the default, an **Empty** item is written as `null`. When **False**, it is written as nothing.

Returns the items between square brackets, separated by a comma and a space. A value is written as follows:

| Value | Text |
|---|---|
| a number | the number as **Str** writes it, without the leading space, with a point as the decimal separator |
| a **Boolean** | `True` or `False` |
| a **String** | the characters between two *TextQualifier* |
| a **Date** | the date and time in UTC, in the form `yyyy-mm-ddThh:mm:ss.000Z`, between two *TextQualifier*. The offset of the time zone is the one the system has now, not the one the date had |
| **Null** | `null` |
| **Empty** | `null`, or nothing with *UseNullAsEmpty* **False** |
| an array, a list or any other object that **For Each** can go through | its items, written in the same way between square brackets |

The text is not valid JSON where a value is written as `True` or `False`, or where *TextQualifier* is not a double quote. The numbering of the items does not change the text.

Through a variable of type **IListRange** or **IArrayList** both arguments are required.

```tb check_build
Dim list As New ArrayList
list.AddRange Array(1, 2.5, "text", "say ""hi""", Null, True)
Debug.Print list.ToString()
Debug.Print list.ToString("'")
```

> [!WARNING] 1.6.151.1
> **ToString** never returns for a list with no items, for a nested list with no items, and for an item that is an object that **For Each** cannot go through, such as an instance of a class of the program. See [Known problems](./#known-problems).

## Hidden members

These members do not appear in IntelliSense. They can be called all the same. COM has no overloaded methods, so the members with a number in their name, from **BinarySearch_2** to **Sort_2**, stand for overloads of the .NET class; the README of the package gives this reason. The others are properties that a list has to offer for compatibility, and the two that serve the package itself, **Items** and **Version**.

### BinarySearch_2
{: .no_toc }

Searches the whole list with the `<` operator. The same as **BinarySearch** (**BaseIndex**, **Count**, *Value*).

Syntax: *object*.**BinarySearch_2** ( *Value* ) **As Long**

### BinarySearch_3
{: .no_toc }

Searches the whole list with a comparer. The same as **BinarySearch** (**BaseIndex**, **Count**, *Value*, *Comparer*).

Syntax: *object*.**BinarySearch_3** ( *Value*, *Comparer* ) **As Long**

### IndexOf_2
{: .no_toc }

The same as **IndexOf** with all three arguments.

Syntax: *object*.**IndexOf_2** ( *Value*, *Index*, *GetCount* ) **As Long**

### IndexOf_3
{: .no_toc }

The same as **IndexOf** with the value only: searches the whole list.

Syntax: *object*.**IndexOf_3** ( *Value* ) **As Long**

### IsFixedSize
{: .no_toc }

Always **False**. **Boolean**, read-only. A list can always grow.

### IsReadOnly
{: .no_toc }

Always **False**. **Boolean**, read-only. A list can always be changed.

### IsSynchronized
{: .no_toc }

Always **False**. **Boolean**, read-only. A list does not protect itself against use from several threads.

### Items
{: .no_toc }

Returns the items as an array that shares the memory of the list.

Syntax: *object*.**Items** ( ) **As Variant()**

The array is not a copy, and its elements are not counted as references to the objects they hold. Its lower bound is 0, whatever [**BaseIndex**](#baseindex) is. It is meant for one use only, as the subject of **For Each**:

```tb check_build
Dim list As New ArrayList
list.AddRange Array(3, 4, 5)
Dim v As Variant
For Each v In list.Items
    Debug.Print v
Next
```

The comment in the source warns against assigning the result to a variable: the variable would release the objects when it goes out of scope, and the list would release them again. The array descriptor is kept in a static variable of the method.

### LastIndexOf_2
{: .no_toc }

The same as **LastIndexOf** with the value and the index.

Syntax: *object*.**LastIndexOf_2** ( *Value*, *Index* ) **As Long**

Searches from *Index* back to the first item. It calls **LastIndexOf** with a *GetCount* of *Index* + 1, which is the number of items only when [**BaseIndex**](#baseindex) is 0.

> [!NOTE] 1.6.151.1
> With a **BaseIndex** above 0, **LastIndexOf_2** raises error 9, and with a **BaseIndex** below 0 it searches only *Index* + 1 items, counted back from *Index*, and so can miss an item.

### LastIndexOf_3
{: .no_toc }

The same as **LastIndexOf** with all three arguments.

Syntax: *object*.**LastIndexOf_3** ( *Value*, *Index*, *GetCount* ) **As Long**

### Sort_2
{: .no_toc }

Sorts the whole list with a comparer. The same as **Sort** **BaseIndex**, , *Comparer*.

Syntax: *object*.**Sort_2** ( *Comparer* )

### SyncRoot
{: .no_toc }

Always **Nothing**. **Variant**, read-only. The .NET class returns an object here.

### Version
{: .no_toc }

A number that changes each time the list changes. **Long**, read-only. A [**ListRange**](ListRange) compares it with the value it saw when it was created, to find out whether the list has changed since. It changes for the assignment to **Item**, **Count** and **BaseIndex**, and for **Add**, **AddRange**, **Clear**, **Insert**, **InsertRange**, **Remove**, **RemoveAt**, **RemoveRange**, **Reverse**, **SetRange** and **Sort**. The assignment to **Capacity** does not change it, although it can move the items.

## See Also

- [ListRange](ListRange) class -- the view that **GetRange** returns
- [Enumerator](Enumerator) class -- the enumerator of **For Each**
- [Comparer](Comparer) class -- a comparer for **Sort** and **BinarySearch**
- [IArrayList](Interfaces#iarraylist) interface -- the members of the list as an interface
- [ArrayListLib package](./) -- overview
