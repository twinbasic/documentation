---
title: ListRange
parent: ArrayListLib Package
permalink: /tB/Packages/Contributed/ArrayListLib/ListRange
has_toc: false
---

# ListRange class
{: .no_toc }

A **ListRange** is a view of a run of items in an [**ArrayList**](ArrayList). It shows those items under indexes that start at 0, and it does not copy them: a change made through the view changes the list. [**GetRange**](ArrayList#getrange) of an **ArrayList** (or of another **ListRange**) returns one.

A range is made by **GetRange**; the class is marked as not creatable. **GetRange** returns the range as an [**IListRange**](Interfaces#ilistrange), which has no **Reverse**, **LastIndexOf**, **Capacity**, **Clone** or **Items**. A range implements [**IArrayList**](Interfaces#iarraylist) and the class **ArrayList** as well; the type **IArrayList** has all the members of a range.

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "b", "c", "d", "e")

Dim r As IArrayList = list.GetRange(1, 3)
r.Reverse
Debug.Print r.Item(0) & r.Item(1) & r.Item(2)
r.RemoveAt 0
Debug.Print list.Count

Dim v As Variant
For Each v In list
    Debug.Print v
Next
```

* TOC
{:toc}

## When a range stops being valid

A range keeps the version number that the list had when the range was made. Each call of the range first compares that number with the list's. A change that the range makes itself keeps the numbers equal, with the two exceptions below. Any other change to the list --- [**Add**](ArrayList#add), [**Insert**](ArrayList#insert), [**RemoveAt**](ArrayList#removeat), [**Sort**](ArrayList#sort) or an assignment to an item, for example --- makes them differ, and the next call of the range raises error -2146233079 (`vbObjectError + 988425`) with the text *This ArrayList range is no longer valid.* Make a new range with **GetRange** after such a change.

The number is the value that the documentation of the .NET class **InvalidOperationException** gives for its HRESULT, `COR_E_INVALIDOPERATION` (`&H80131509`).

Two changes made through the range itself make it invalid, because they count differently in the range and in the list. An assignment to an item (`r.Item(0) = x`, or with **Set**) adds 1 to the range's version number and nothing to the list's. [**SetRange**](#setrange) of a range, with a list or a range as its argument, adds 1 to the range's number and 2 to the list's. See [Known problems](./#known-problems).

A change made through one range adds to the version number of the list, so every other range of the same list is invalid afterwards.

## Properties

### Capacity
{: .no_toc }

The capacity of the list. **Long**, read/write.

Syntax: *object*.**Capacity** [ **=** *value* ]

Returns the [**Capacity**](ArrayList#capacity) of the list. An assignment is accepted and has no effect.

### Count
{: .no_toc }

The number of items in the range. **Long**, read-only.

Syntax: *object*.**Count**

Raises the error of an invalid range when the list has changed. A range cannot be resized by assigning to **Count**.

### Item
{: .no_toc }

The item at a position in the range. **Variant**, read/write, and the default member.

Syntax: [ **Set** ] *object*.**Item** ( *index* ) [ **=** *value* ]

*index*
: A **Long** from 0 to **Count** - 1 of the range. A value outside the range raises error 9.

See [**Item**](ArrayList#item) of **ArrayList**. An assignment makes the range invalid, as described above.

## Methods

### Add
{: .no_toc }

Adds an item at the end of the range and returns its index in the range.

Syntax: *object*.**Add** ( *value* ) **As Long**

The item is inserted in the list just after the last item of the range, and the range grows by one. See [**Add**](ArrayList#add).

### AddRange
{: .no_toc }

Adds the items of an array or of another collection at the end of the range.

Syntax: *object*.**AddRange** ( *Target* )

The items are inserted in the list after the last item of the range, and the range grows by their number. See [**AddRange**](ArrayList#addrange).

### BinarySearch
{: .no_toc }

Searches a sorted run of the range and returns the index of a value, counted from the start of the range.

Syntax: *object*.**BinarySearch** ( *Index*, *GetCount*, *Value* [ , *Comparer* ] ) **As Long**

As [**BinarySearch**](ArrayList#binarysearch) of **ArrayList**, with *Index* counted from the start of the range and the result too, including the complement of the index that is returned when there is no match. Error 9 is raised when the run does not lie in the range.

### Clear
{: .no_toc }

Removes the items of the range from the list.

Syntax: *object*.**Clear** ( )

The items are removed from the list, and the range is left with no items. The range stays valid.

### Clone
{: .no_toc }

Returns a copy of the items of the range.

Syntax: *object*.**Clone** ( ) **As Variant**

Returns a **Variant** that holds a new **ArrayList** with the items of the range, as [**Clone**](ArrayList#clone) of an **ArrayList** does.
### Contains
{: .no_toc }

Returns whether the range holds an item that matches a value.

Syntax: *object*.**Contains** ( *Value* ) **As Boolean**

As [**Contains**](ArrayList#contains), over the items of the range.

### CopyTo
{: .no_toc }

Copies the items of the range to an array, or over the items of another list.

Syntax: *object*.**CopyTo** ( *Target*, *Index* )

As [**CopyTo**](ArrayList#copyto), for the items of the range, including the check that refuses an array with exactly the room needed.

### GetEnumerator
{: .no_toc }

Returns the enumerator that **For Each** uses over the items of the range.

Syntax: *object*.**GetEnumerator** ( [ *Index* ] [ , *GetCount* ] [ , *GetStep* ] [ , *ThisEnumerator* ] ) **As stdole.IUnknown**

As [**GetEnumerator**](ArrayList#getenumerator), with *Index* counted from the start of the range.

### GetRange
{: .no_toc }

Returns a view of a run of items of the range.

Syntax: *object*.**GetRange** ( *Index*, *GetCount* ) **As IListRange**

*Index* is counted from the start of the range. Error 9 is raised when the run does not lie in the range. A range of a range is a view of the same items of the list; a change through either makes the other invalid.

### IndexOf
{: .no_toc }

Returns the index in the range of the first item that matches a value, or -1.

Syntax: *object*.**IndexOf** ( *Value* [ , *Index* [ , *GetCount* ] ] ) **As Long**

As [**IndexOf**](ArrayList#indexof), with *Index* and the result counted from the start of the range. Error 9 is raised when *Index* is outside the range or the run does not fit in it.

### Insert
{: .no_toc }

Inserts an item at a position of the range.

Syntax: *object*.**Insert** ( *Index*, *Value* )

*Index* is counted from the start of the range, and the item is inserted in the list at that position. The range grows by one. *Index* is not checked against the range.

### InsertRange
{: .no_toc }

Inserts the items of an array or of another collection at a position of the range.

Syntax: *object*.**InsertRange** ( *Index*, *Target* )

As [**InsertRange**](ArrayList#insertrange), with *Index* counted from the start of the range. The range grows by the number of items.

### LastIndexOf
{: .no_toc }

Returns the index in the range of the last item that matches a value, or -1.

Syntax: *object*.**LastIndexOf** ( *Value*, *Index*, *GetCount* ) **As Long**

As [**LastIndexOf**](ArrayList#lastindexof), with *Index* and the result counted from the start of the range. On a range, *Index* and *GetCount* are declared without **Optional**.

### Remove
{: .no_toc }

Removes the first item of the range that matches a value.

Syntax: *object*.**Remove** ( *Value* )

As [**Remove**](ArrayList#remove). The item is removed from the list, and the range shrinks by one.

### RemoveAt
{: .no_toc }

Removes the item at a position of the range.

Syntax: *object*.**RemoveAt** ( *Index* )

*Index* is counted from the start of the range; a value outside the range raises error 9. The item is removed from the list, and the range shrinks by one.

### RemoveRange
{: .no_toc }

Removes a run of items of the range.

Syntax: *object*.**RemoveRange** ( *Index*, *GetCount* )

*Index* is counted from the start of the range. Error 9 is raised when the run does not lie in the range. The items are removed from the list, and the range shrinks by their number.

### Reverse
{: .no_toc }

Reverses the order of the items of the range, or of a run of them.

Syntax: *object*.**Reverse** ( *Index*, *GetCount* )

As [**Reverse**](ArrayList#reverse), with *Index* counted from the start of the range, with the same loop. On a range, both arguments are declared without **Optional**.

### SetRange
{: .no_toc }

Replaces items of the range with the items of an array or of another collection.

Syntax: *object*.**SetRange** ( *Index*, *Target* )

As [**SetRange**](ArrayList#setrange), with *Index* counted from the start of the range. Error 9 is raised when *Index* is outside the range. The check of the number of items is made against the list, not the range, so a *Target* longer than the rest of the range replaces items of the list after the range.

### Sort
{: .no_toc }

Sorts the items of the range, or a run of them.

Syntax: *object*.**Sort** ( [ *Index* ] [ , *GetCount* ] [ , *Comparer* ] )

As [**Sort**](ArrayList#sort), with *Index* counted from the start of the range. Unlike the list, the range checks that the run lies in it and raises error 9 otherwise.

### ToArray
{: .no_toc }

Returns the items of the range as an array.

Syntax: *object*.**ToArray** ( ) **As Variant()**

As [**ToArray**](ArrayList#toarray), for the items of the range.

## Hidden members

### Bind
{: .no_toc }

Makes the range a view of a run of a list.

Syntax: *object*.**Bind** ( *TargetList* [ , *Index* [ , *GetCount* ] ] ) **As ListRange**

*TargetList*
: *required* An [**IArrayList**](Interfaces#iarraylist): the list or range to look at.

*Index*
: *optional* A **Long**: the index in *TargetList* of the first item. The default is 0.

*GetCount*
: *optional* The number of items. The default is all the items from *Index*.

Returns the range itself. **GetRange** calls **Bind**; a program has no reason to.

### IndexOf_2, IndexOf_3, LastIndexOf_2, LastIndexOf_3, BinarySearch_2, BinarySearch_3, Sort_2
{: .no_toc }

The hidden overloads of [ArrayList](ArrayList#hidden-members), over the items of the range, with the same arguments.

### IsFixedSize, IsReadOnly, IsSynchronized
{: .no_toc }

Always **False**, as for [**ArrayList**](ArrayList#isfixedsize).

### Items
{: .no_toc }

Returns the items of the range as an array that shares their memory.

Syntax: *object*.**Items** ( ) **As Variant()**

As [**Items**](ArrayList#items): use the result only as the subject of **For Each**.

### SyncRoot
{: .no_toc }

Always **Nothing**, as for [**ArrayList**](ArrayList#syncroot).

### Version
{: .no_toc }

The version number that the range expects the list to have. **Long**, read-only.

## See Also

- [ArrayList](ArrayList) class -- the list; its **GetRange** returns a range
- [IListRange](Interfaces#ilistrange) interface -- the type that **GetRange** returns
- [IArrayList](Interfaces#iarraylist) interface -- all the members of a range
- [ArrayListLib package](./) -- overview
