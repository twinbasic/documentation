---
title: ListRange
parent: ArrayListLib Package
permalink: /tB/Packages/Contributed/ArrayListLib/ListRange
has_toc: false
---

# ListRange class
{: .no_toc }

A **ListRange** is a view of a run of items in an [**ArrayList**](ArrayList). It shows those items under indexes that start at its [**BaseIndex**](#baseindex), which it takes from its list when it is made, and it does not copy them: a change made through the view changes the list. [**GetRange**](ArrayList#getrange) of an **ArrayList** (or of another **ListRange**) returns one.

A range is made by **GetRange**; the class is marked as not creatable. **GetRange** returns the range as an [**IListRange**](Interfaces#ilistrange), which has no **Reverse**, **LastIndexOf**, **Capacity**, **BaseIndex** or **Items**. A range implements [**IArrayList**](Interfaces#iarraylist), [**ICloneable**](Interfaces#icloneable) and the class **ArrayList** as well; the type **IArrayList** has all the members of a range except **Clone**.

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

A range keeps the version number that the list had when the range was made. Each call of the range first compares that number with the list's. A change that the range makes itself keeps the numbers equal, with the two exceptions below. Any other change to the list --- [**Add**](ArrayList#add), [**Insert**](ArrayList#insert), [**RemoveAt**](ArrayList#removeat), [**Sort**](ArrayList#sort), an assignment to an item or an assignment to [**BaseIndex**](ArrayList#baseindex), for example --- makes them differ, and the next call of the range raises error -2146233079 (`vbObjectError + 988425`) with the text *This ArrayList range is no longer valid.* Make a new range with **GetRange** after such a change.

The number is the value that the documentation of the .NET class **InvalidOperationException** gives for its HRESULT, `COR_E_INVALIDOPERATION` (`&H80131509`).

Two changes made through the range itself make it invalid, because they count differently in the range and in the list. An assignment to an item (`r.Item(0) = x`, or with **Set**) adds 1 to the range's version number and nothing to the list's. [**SetRange**](#setrange) of a range, with a list or a range as its argument, adds 1 to the range's number and 2 to the list's. See [Known problems](./#known-problems).

A change made through one range adds to the version number of the list, so every other range of the same list is invalid afterwards. A range made by **GetRange** of another range compares its number with the number of that range, not with the list's: a change made through the outer range makes the inner one invalid, a change made through the inner one leaves the outer one valid, and a change made to the list directly invalidates the outer range and leaves the inner one valid.

## A range after the list grows

A range reads the items from the address they had when the range was made. A change made through the range that makes the list enlarge its array, such as [**Add**](#add), [**AddRange**](#addrange), [**Insert**](#insert) or [**InsertRange**](#insertrange) on a list with no room, can move the array. The range then goes on reading the old array, which has been released, and does not notice: the range and the list keep the same version number.

> [!WARNING] 1.6.151.1
> After such a change the items that the range shows can be the old ones, or whatever now occupies that memory. A range of two items of a list with room for five, after three calls of **Add** through the range, showed `a b c d` and an empty item, where the list held `a b X Y Z c d`. Make the list large enough first, by giving [**New**](ArrayList#new) a capacity or assigning [**Capacity**](ArrayList#capacity), or make a new range with **GetRange** after the change.

## Properties

### BaseIndex
{: .no_toc }

The number of the first item of the range. **Long**, read/write.

Syntax: *object*.**BaseIndex** [ **=** *value* ]

A range has the **BaseIndex** that its list or outer range has when the range is made. An assignment changes the numbering of this range only; the list and the other ranges keep theirs, and the range stays valid. See [**BaseIndex**](ArrayList#baseindex) of **ArrayList**.

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
: A **Long** from [**BaseIndex**](#baseindex) to **BaseIndex** + **Count** - 1 of the range. A value outside the range raises error 9.

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

Searches a sorted run of the range and returns the index of a value, counted from the [**BaseIndex**](#baseindex) of the range.

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

Returns a **Variant** that holds a new **ArrayList** with the items of the range and the **BaseIndex** of the range, as [**Clone**](ArrayList#clone) of an **ArrayList** does. **Clone** is the member of [**ICloneable**](Interfaces#icloneable); the interface **IArrayList** does not have it.

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

As [**GetEnumerator**](ArrayList#getenumerator), with *Index* counted from the first item of the range, which is 0 whatever the **BaseIndex** of the range is. The range keeps two enumerators in the same way as a list, with the same effects: see the warning there. A range with no items has no enumerator, and a **For Each** over it raises an error.

### GetRange
{: .no_toc }

Returns a view of a run of items of the range.

Syntax: *object*.**GetRange** ( *Index*, *GetCount* ) **As IListRange**

*Index* is counted from the **BaseIndex** of the range. Error 9 is raised when the run does not lie in the range. A range of a range is a view of the same items of the list. See [When a range stops being valid](#when-a-range-stops-being-valid) for which changes make which range invalid.

### IndexOf
{: .no_toc }

Returns the index in the range of the first item that matches a value, or -1.

Syntax: *object*.**IndexOf** ( *Value* [ , *Index* [ , *GetCount* ] ] ) **As Long**

As [**IndexOf**](ArrayList#indexof), with *Index* and the result counted from the **BaseIndex** of the range. The default of *Index* is that **BaseIndex**. Error 9 is raised when *Index* is outside the range or the run does not fit in it.

### Insert
{: .no_toc }

Inserts an item at a position of the range.

Syntax: *object*.**Insert** ( *Index*, *Value* )

*Index* is counted from the **BaseIndex** of the range, and the item is inserted in the list at that position. The range grows by one. *Index* is not checked against the range. The call is passed on to the list, so [**Insert**](ArrayList#insert) of the list applies, with its failure at the first position of a list that has little room, and the range can be left reading released memory: see [A range after the list grows](#a-range-after-the-list-grows).

### InsertRange
{: .no_toc }

Inserts the items of an array or of another collection at a position of the range.

Syntax: *object*.**InsertRange** ( *Index*, *Target* )

As [**InsertRange**](ArrayList#insertrange), with *Index* counted from the start of the range. The range grows by the number of items.

### LastIndexOf
{: .no_toc }

Returns the index in the range of the last item that matches a value, or -1.

Syntax: *object*.**LastIndexOf** ( *Value* [ , *Index* [ , *GetCount* ] ] ) **As Long**

As [**LastIndexOf**](ArrayList#lastindexof), with *Index* and the result counted from the **BaseIndex** of the range. The default of *Index* is the last item of the range.

### Remove
{: .no_toc }

Removes the first item of the range that matches a value.

Syntax: *object*.**Remove** ( *Value* )

As [**Remove**](ArrayList#remove), including its failure with a **BaseIndex** below 0. The item is removed from the list, and the range shrinks by one.

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

Syntax: *object*.**Reverse** ( [ *Index* ] [ , *GetCount* ] )

As [**Reverse**](ArrayList#reverse), with *Index* counted from the **BaseIndex** of the range, and with the same loop. A run with an even number of items keeps its two middle items in place: see the warning there.

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

As [**ToArray**](ArrayList#toarray), for the items of the range. The lower bound of the array is the **BaseIndex** of the range.

### ToString
{: .no_toc }

Returns the items of the range as text.

Syntax: *object*.**ToString** ( [ *TextQualifier* ] [ , *UseNullAsEmpty* ] ) **As String**

As [**ToString**](ArrayList#tostring), for the items of the range. Through a variable of type **IListRange** or **IArrayList** both arguments are required. It never returns for a range with no items.

## Hidden members

### Bind
{: .no_toc }

Makes the range a view of a run of a list.

Syntax: *object*.**Bind** ( *TargetList* [ , *Index* [ , *GetCount* ] ] ) **As ListRange**

*TargetList*
: *required* An [**IArrayList**](Interfaces#iarraylist): the list or range to look at.

*Index*
: *optional* A **Long**: the index in *TargetList* of the first item, counted from the **BaseIndex** of *TargetList*. The default is that **BaseIndex**. The parameter is declared as a **Variant**, so that a call can leave it out and give *GetCount*.

*GetCount*
: *optional* The number of items. The default is all the items from *Index*.

Returns the range itself, and gives it the **BaseIndex** of *TargetList*. **GetRange** calls **Bind**; a program has no reason to.

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

As [**Items**](ArrayList#items): use the result only as the subject of **For Each**. Its lower bound is 0.

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
