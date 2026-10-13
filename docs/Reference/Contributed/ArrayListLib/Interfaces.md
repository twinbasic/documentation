---
title: ArrayListLib Interfaces
parent: ArrayListLib Package
permalink: /tB/Packages/Contributed/ArrayListLib/Interfaces
has_toc: false
---

# ArrayListLib interfaces
{: .no_toc }

The package declares nine interfaces. Six have the name and the role of an interface of .NET: **ICloneable**, **ICollection**, **IComparer**, **IEnumerable**, **IEnumerator** and **IList**. **IListRange** and **IArrayList** are the package's own, and **IEnumVARIANT** is the interface of COM that **For Each** uses. Each one adds members to the one it extends:

```
IEnumerable
  ICollection
    IList
      IListRange
        IArrayList
ICloneable
IEnumVARIANT
  IEnumerator
IComparer
```

[**ArrayList**](ArrayList) and [**ListRange**](ListRange) implement **IArrayList** and **ICloneable**, so a variable of any of these types can hold a list. A function that only reads items can take an **IList**; a function that sorts or takes parts can take an **IListRange**. [**Enumerator**](Enumerator) implements **IEnumerator**, and [**Comparer**](Comparer) implements **IComparer**.

> [!WARNING]
> A **For Each** over a variable declared as **IList**, **ICollection**, **IEnumerable**, **IListRange** or **IArrayList** raises error -2147352567, *Exception occurred.* A call of **GetEnumerator** through such a variable with fewer than all four arguments does not compile. A variable declared as **ArrayList**, **ListRange**, **Object** or **Variant** can be used in a **For Each**; a function that takes an interface can loop over the items with an index. See [Known problems](./#known-problems).

```tb check_build
Dim items As IList = New ArrayList
items.Add "a"
items.Add "b"
Debug.Print items.Count
Debug.Print items.Item(1)
Dim i As Long
For i = 0 To items.Count - 1
    Debug.Print items.Item(i)
Next
```

The members of the interfaces that a list implements are described once, on the page of [ArrayList](ArrayList); the entries below give the syntax and point there.

* TOC
{:toc}

## IEnumerable

The base of the list interfaces: an object that **For Each** can go through. Interface identifier `F078EB73-3FA5-47F4-8003-520AEA1CE315`.

### GetEnumerator
{: #ienumerable-getenumerator .no_toc }

Returns the enumerator that **For Each** uses.

Syntax: *object*.**GetEnumerator** ( [ *Index* ] [ , *GetCount* ] [ , *GetStep* ] [ , *ThisEnumerator* ] ) **As stdole.IUnknown**

The member is marked [**[Enumerator]**](../../../Core/Attributes#enumerator). The parameters are those of [**GetEnumerator**](ArrayList#getenumerator) of **ArrayList**; here *ThisEnumerator* is declared **As Any**, an untyped reference. Called through a variable of an interface type, the member does not compile with fewer than all four arguments (TB5050), and a **For Each** that calls it raises error -2147352567.

## ICollection

Extends **IEnumerable**. The base interface of all collections. Interface identifier `B2E5C8F5-2847-450B-873B-F4BE7621F627`.

### Count
{: #icollection-count .no_toc }

The number of items. **Long**, read-only.

Syntax: *object*.**Count**

See [**Count**](ArrayList#count).

### CopyTo
{: #icollection-copyto .no_toc }

Copies the items to an array or over the items of another list.

Syntax: *object*.**CopyTo** ( *Target*, *Index* )

See [**CopyTo**](ArrayList#copyto).

### IsSynchronized
{: #icollection-issynchronized .no_toc }

Whether access to the collection is safe from several threads. **Boolean**, read-only. Always **False** in the package.

Syntax: *object*.**IsSynchronized**

### SyncRoot
{: #icollection-syncroot .no_toc }

An object to lock for access from several threads. **Variant**, read-only. Always **Nothing** in the package.

Syntax: *object*.**SyncRoot**

## IList

Extends **ICollection**. The base interface of all lists. Interface identifier `BC694131-C923-4813-9D34-C79C5E2F6980`.

### Add
{: #ilist-add .no_toc }

Adds an item at the end of the list and returns its index.

Syntax: *object*.**Add** ( *Value* ) **As Long**

See [**Add**](ArrayList#add).

### Clear
{: #ilist-clear .no_toc }

Removes all items.

Syntax: *object*.**Clear** ( )

See [**Clear**](ArrayList#clear).

### Contains
{: #ilist-contains .no_toc }

Returns whether the list holds an item that matches a value.

Syntax: *object*.**Contains** ( *Value* ) **As Boolean**

See [**Contains**](ArrayList#contains).

### IndexOf
{: #ilist-indexof .no_toc }

Returns the index of the first item that matches a value, or -1.

Syntax: *object*.**IndexOf** ( *Value* [ , *Index* [ , *GetCount* ] ] ) **As Long**

See [**IndexOf**](ArrayList#indexof).

### Insert
{: #ilist-insert .no_toc }

Inserts an item at a position.

Syntax: *object*.**Insert** ( *Index*, *Value* )

See [**Insert**](ArrayList#insert).

### IsFixedSize
{: #ilist-isfixedsize .no_toc }

Whether the list has a fixed size. **Boolean**, read-only. Always **False** in the package.

Syntax: *object*.**IsFixedSize**

### IsReadOnly
{: #ilist-isreadonly .no_toc }

Whether the list cannot be changed. **Boolean**, read-only. Always **False** in the package.

Syntax: *object*.**IsReadOnly**

### Item
{: #ilist-item .no_toc }

The item at a position. **Variant**, read/write.

Syntax: [ **Set** ] *object*.**Item** ( *Index* ) [ **=** *Value* ]

See [**Item**](ArrayList#item). The interface does not mark **Item** as the default member; the classes do.

### Remove
{: #ilist-remove .no_toc }

Removes the first item that matches a value.

Syntax: *object*.**Remove** ( *Value* )

See [**Remove**](ArrayList#remove).

### RemoveAt
{: #ilist-removeat .no_toc }

Removes the item at a position.

Syntax: *object*.**RemoveAt** ( *Index* )

See [**RemoveAt**](ArrayList#removeat).

## IListRange

Extends **IList**. A list with operations on runs of items. It is the type that [**GetRange**](ArrayList#getrange) returns. Interface identifier `480A22F9-91B0-483A-8A33-11634FCF644A`.

### AddRange
{: #ilistrange-addrange .no_toc }

Adds the items of an array or collection at the end.

Syntax: *object*.**AddRange** ( *Target* )

See [**AddRange**](ArrayList#addrange).

### BinarySearch
{: #ilistrange-binarysearch .no_toc }

Searches a sorted run of items.

Syntax: *object*.**BinarySearch** ( *Index*, *GetCount*, *Value* [ , *Comparer* ] ) **As Long**

See [**BinarySearch**](ArrayList#binarysearch).

### GetAddressOfItemAt
{: #ilistrange-getaddressofitemat .no_toc }

Returns the address in memory of an item. Hidden.

Syntax: *object*.**GetAddressOfItemAt** ( *Index* ) **As LongPtr**

The package uses it to copy runs of items between lists. The address stays valid only until the list changes, and a program has no use for it.

### GetRange
{: #ilistrange-getrange .no_toc }

Returns a view of a run of items.

Syntax: *object*.**GetRange** ( *Index*, *GetCount* ) **As IListRange**

See [**GetRange**](ArrayList#getrange).

### InsertRange
{: #ilistrange-insertrange .no_toc }

Inserts the items of an array or collection at a position.

Syntax: *object*.**InsertRange** ( *Index*, *Target* )

See [**InsertRange**](ArrayList#insertrange).

### RemoveRange
{: #ilistrange-removerange .no_toc }

Removes a run of items.

Syntax: *object*.**RemoveRange** ( *Index*, *GetCount* )

See [**RemoveRange**](ArrayList#removerange).

### SetRange
{: #ilistrange-setrange .no_toc }

Replaces items with the items of an array or collection.

Syntax: *object*.**SetRange** ( *Index*, *Target* )

See [**SetRange**](ArrayList#setrange).

### Sort
{: #ilistrange-sort .no_toc }

Sorts the items, or a run of them.

Syntax: *object*.**Sort** ( [ *Index* ] [ , *GetCount* ] [ , *Comparer* ] )

See [**Sort**](ArrayList#sort).

### ToArray
{: #ilistrange-toarray .no_toc }

Returns the items as an array.

Syntax: *object*.**ToArray** ( ) **As Variant()**

See [**ToArray**](ArrayList#toarray).

### ToString
{: #ilistrange-tostring .no_toc }

Returns the items as text.

Syntax: *object*.**ToString** ( *TextQualifier*, *UseNullAsEmpty* ) **As String**

*TextQualifier*
: *required* A **String**.

*UseNullAsEmpty*
: *required* A **Boolean**.

See [**ToString**](ArrayList#tostring). Through the interface both arguments are required; the classes declare them optional.

## IArrayList

Extends **IListRange**. The interface of a whole list. It does not have **Clone**, which belongs to [**ICloneable**](#icloneable). Interface identifier `1043D433-27BB-40F7-9255-50F4724FAB94`.

### BaseIndex
{: #iarraylist-baseindex .no_toc }

The number of the first item. **Long**, read/write.

Syntax: *object*.**BaseIndex** [ **=** *value* ]

See [**BaseIndex**](ArrayList#baseindex).

### Capacity
{: #iarraylist-capacity .no_toc }

The number of items the list has room for. **Long**, read/write.

Syntax: *object*.**Capacity** [ **=** *value* ]

See [**Capacity**](ArrayList#capacity).

### CloneTo
{: #iarraylist-cloneto .no_toc }

Fills the list with copies of items of another list. Hidden.

Syntax: *object*.**CloneTo** ( *Target*, *Source*, *Index*, *GetCount* )

[**Clone**](ArrayList#clone) calls it on the new list. The list it is called on takes copies of *GetCount* items of *Source*, from *Index*. *Target* is not used.

### Items
{: #iarraylist-items .no_toc }

Returns the items as an array that shares the memory of the list. Hidden.

Syntax: *object*.**Items** ( ) **As Variant()**

See [**Items**](ArrayList#items).

### LastIndexOf
{: #iarraylist-lastindexof .no_toc }

Returns the index of the last item that matches a value, or -1.

Syntax: *object*.**LastIndexOf** ( *Value* [ , *Index* [ , *GetCount* ] ] ) **As Long**

See [**LastIndexOf**](ArrayList#lastindexof).

### Reverse
{: #iarraylist-reverse .no_toc }

Reverses the order of the items, or of a run of them.

Syntax: *object*.**Reverse** ( [ *Index* ] [ , *GetCount* ] )

See [**Reverse**](ArrayList#reverse).

### Version
{: #iarraylist-version .no_toc }

A number that changes each time the list changes. **Long**, read-only. Hidden.

Syntax: *object*.**Version**

See [**Version**](ArrayList#version).

## ICloneable

An object that can make a copy of itself. [**ArrayList**](ArrayList#clone) and [**ListRange**](ListRange#clone) implement it. The interface **IArrayList** does not have **Clone**, so a variable of that type has to be assigned to an **ICloneable** variable to copy the list. Interface identifier `8ABD76D4-42F5-4920-927A-BC766E00CE46`.

### Clone
{: #icloneable-clone .no_toc }

Returns a copy of the object. Whether the copy is shallow or deep is up to the class.

Syntax: *object*.**Clone** ( ) **As Variant**

## IEnumVARIANT

The interface that **For Each** calls to go through the items of an object, one at a time. The package declares it as a public interface, with **Long** counts, because the declaration in **stdole** cannot be implemented in twinBASIC. Interface identifier `00020404-0000-0000-C000-000000000046`. See [IEnumVARIANT](../../../../Reference/COM-Interfaces/IEnumVARIANT) for the contract of the four methods, and [Enumerator](Enumerator) for the class that implements them.

### Clone
{: #ienumvariant-clone .no_toc }

Creates another enumerator over the same items.

Syntax: *object*.**Clone** ( *ppenum* )

*ppenum*
: *required* An **IEnumVARIANT** variable that receives the new enumerator.

### Next
{: #ienumvariant-next .no_toc }

Returns the next item.

Syntax: *object*.**Next** ( *celt*, *rgvar*, *pceltFetched* )

*celt*
: *required* A **Long**: the number of items asked for.

*rgvar*
: *required* A **Variant** that receives the item.

*pceltFetched*
: *required* A **Long** that receives the number of items returned.

### Reset
{: #ienumvariant-reset .no_toc }

Goes back to the first item.

Syntax: *object*.**Reset** ( )

### Skip
{: #ienumvariant-skip .no_toc }

Moves past items without returning them.

Syntax: *object*.**Skip** ( *celt* )

*celt*
: *required* A **Long**: the number of items to move past.

## IEnumerator

Extends **IEnumVARIANT**. An enumerator whose position, step and size can be read and changed. Interface identifier `8E42D737-24C2-4D3F-8903-4B30E9383C69`. It is the type of the *ThisEnumerator* argument of **GetEnumerator**.

### CurrentIndex
{: #ienumerator-currentindex .no_toc }

The position of the item last returned. **Long**, read/write.

Syntax: *object*.**CurrentIndex** [ **=** *value* ]

See [**CurrentIndex**](Enumerator#currentindex).

### CurrentSize
{: #ienumerator-currentsize .no_toc }

The number of items in the part that is enumerated. **Long**, read/write.

Syntax: *object*.**CurrentSize** [ **=** *value* ]

See [**CurrentSize**](Enumerator#currentsize).

### CurrentStep
{: #ienumerator-currentstep .no_toc }

How far the position moves for each item. **Long**, read/write.

Syntax: *object*.**CurrentStep** [ **=** *value* ]

See [**CurrentStep**](Enumerator#currentstep).

## IComparer

An object that compares two values. [**Sort**](ArrayList#sort) and [**BinarySearch**](ArrayList#binarysearch) take one. A class implements it with `Implements IComparer`, as the examples on the page of [**Comparer**](Comparer) show. Interface identifier `D60ABA2A-1176-4515-9B4C-B0312BA5FE7F`.

### Compare
{: #icomparer-compare .no_toc }

Compares two values.

Syntax: *object*.**Compare** ( *X*, *Y* ) **As Long**

*X*
: *required* The first value.

*Y*
: *required* The second value.

Returns a negative number when *X* goes before *Y*, 0 when they are equal and a positive number when *X* goes after *Y*. Only the sign of the number matters to the list.

## See Also

- [ArrayList](ArrayList) class -- implements **IArrayList**
- [ListRange](ListRange) class -- implements **IArrayList** over a run of a list
- [Enumerator](Enumerator) class -- implements **IEnumerator**
- [Comparer](Comparer) class -- implements **IComparer**
- [ArrayListLib package](./) -- overview
