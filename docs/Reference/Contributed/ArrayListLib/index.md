---
title: ArrayListLib Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - LibMemory
  - LibMemoryEx
indexed_from: 1.4.0.134
permalink: /tB/Packages/Contributed/ArrayListLib/
---

# ArrayListLib Package
{: .no_toc }

**Author:** R.Beltran. **On GitHub:** [Theadd/ArrayList](https://github.com/Theadd/ArrayList), in the folder *ArrayListLib*.

The **ArrayListLib** contributed package is a list class for twinBASIC, in place of the `ArrayList` class of .NET's `mscorlib` library. A VBA or VB6 program that needs a list which grows as items are added can use that class through `CreateObject("System.Collections.ArrayList")`. [**ArrayList**](ArrayList) has the members of that class which a COM client can call, under the same names, and needs no .NET Framework.

This section documents version 1.4.0.134, which is the version on TWINSERV, published under the Unlicense. The repository is now at version 1.6, which has members that this section does not describe, such as a **BaseIndex** property and a **ToString** method; the sources of version 1.4 are in the history of the repository.

> [!NOTE]
> Version 1.4.0.134 does not compile in twinBASIC BETA 1005, so a project that references it does not build. **ArrayList** passes the addresses of two items, as **Long** values, to its private procedure **VSwap**, which declares both parameters as `ByRef` structures, in **Reverse** and in the two quicksort procedures that **Sort** calls (error TB5001, in `ArrayList.twin` at lines 236, 519 and 536).

```tb check_build
Dim scores As New ArrayList
scores.AddRange Array(72, 91, 65, 88)
scores.Sort

Dim total As Long
Dim v As Variant
For Each v In scores
    total += v
Next

Debug.Print "lowest " & scores(0) & ", highest " & scores(scores.Count - 1)
Debug.Print "average " & total / scores.Count
```

## How it differs from the .NET class

- **Creation.** A list is created with **New**, as in `Dim list As New ArrayList`, in place of `CreateObject`.
- **Members left out.** The package has none of the static members of the .NET class (**Adapter**, **FixedSize**, **ReadOnly**, **Repeat** and **Synchronized**), nor its **TrimToSize** method, and **ToArray** has no *Type* argument.
- **Overloads.** The README of the package says that COM has no overloaded methods, and that the hidden members with a number in their name, such as `IndexOf_2`, stand for the overloads of the .NET class. See [Hidden members](ArrayList#hidden-members).
- **Additions.** [**Count**](ArrayList#count) can be assigned, [**GetEnumerator**](ArrayList#getenumerator) takes a start, a count and a step so that **For Each** can go through part of a list or backwards, and the methods that take a collection also take any array.
- **Errors.** An index outside the list raises error 9, *Subscript out of range*, and an argument of the wrong kind error 13 or 6. The documentation of the .NET class lists an **ArgumentOutOfRangeException** for an index outside the list.
- **Changes during a loop.** A **For Each** over a list that changes while the loop runs is not detected. The documentation of the .NET class says that its enumerator is invalidated by such a change. See [Enumerating](ArrayList#enumerating).

The page [ArrayList](ArrayList#differences-from-the-net-class) lists the remaining differences.

## Classes and interfaces

- [ArrayList](ArrayList) -- the list: items added, inserted, found, removed, sorted and enumerated
  - [Capacity](ArrayList#capacity) -- returns or sets the number of items the list has room for
  - [Count](ArrayList#count) -- returns or sets the number of items
  - [Item](ArrayList#item) -- returns or sets one item (the default member)
  - [Add](ArrayList#add), [AddRange](ArrayList#addrange), [Insert](ArrayList#insert), [InsertRange](ArrayList#insertrange) -- add items
  - [Remove](ArrayList#remove), [RemoveAt](ArrayList#removeat), [RemoveRange](ArrayList#removerange), [Clear](ArrayList#clear) -- remove items
  - [Contains](ArrayList#contains), [IndexOf](ArrayList#indexof), [LastIndexOf](ArrayList#lastindexof), [BinarySearch](ArrayList#binarysearch) -- find items
  - [Sort](ArrayList#sort), [Reverse](ArrayList#reverse) -- reorder items
  - [GetRange](ArrayList#getrange), [SetRange](ArrayList#setrange), [CopyTo](ArrayList#copyto), [ToArray](ArrayList#toarray), [Clone](ArrayList#clone) -- parts and copies
  - [GetEnumerator](ArrayList#getenumerator) -- the enumerator that **For Each** uses
- [ListRange](ListRange) -- a view of a run of items in an ArrayList, returned by **GetRange**
- [Enumerator](Enumerator) -- the enumerator of **For Each**, with a start, a count and a step
- [Comparer](Comparer) -- compares two values for **Sort** and **BinarySearch**
- [Interfaces](Interfaces) -- the nine interfaces: **ICloneable**, **ICollection**, **IComparer**, **IEnumVARIANT**, **IEnumerable**, **IEnumerator**, **IList**, **IListRange** and **IArrayList**

## Name clashes

The package declares the names **ArrayList**, **Comparer**, **Enumerator**, **ListRange**, **ICloneable**, **ICollection**, **IComparer**, **IEnumVARIANT**, **IEnumerable**, **IEnumerator**, **IList**, **IListRange** and **IArrayList**, and its two memory modules declare more (see below). A name that another library or the project declares as well can be written with the name of the package in front, as in `ArrayListLib.ArrayList`.

## Known problems

These faults follow from the code of version 1.4.0.134. The package cannot be built in BETA 1005 (see the note above), so none of them has been run.

- **Reverse.** The loop runs for *i* from 0 up to and including half of the count, rounded down, and swaps the items at *i* and at the count - 1 - *i* from the start of the run. For an even count the last pass swaps the middle pair a second time, so those two items keep their order. For a run of no items the loop still runs once.
- **CopyTo.** An array is refused with error 6 when `UBound(Target) - Index` is less than **Count**, so an array with exactly **Count** elements from *Index* is refused. The same check is in **ListRange**.
- **Insert and InsertRange.** *Index* is not checked against **Count**, and the number of items the method moves is **Count** - *Index*.
- **Sort and BinarySearch.** On an **ArrayList**, *Index* and *GetCount* are not checked against the list. A **ListRange** checks them.
- **Capacity.** The assignment does not check its value against **Count**.
- **Count.** A smaller value ends the list without clearing the items cut off. A larger value within the capacity makes those items part of the list again.
- **ListRange.** An assignment to an item through a range, and **SetRange** of a range with a list as its argument, make the range invalid, because they add to the version number of the range and of the list by different amounts. **SetRange** of a range checks the number of items against the list and not the range.
- **Enumerator.** **Reset** does not clear the step that **Next** adds, so the first **Next** after it moves past the first item once an item has been returned. **Clone** starts at the beginning of the part and not at the position of the original.
- **For Each.** A change to the list during the loop is not detected.

## Memory modules

The package includes two modules, **LibMemory** and **LibMemoryEx**, which the list classes use to read and write memory directly: the array descriptor type **SAFEARRAY_1D** and its constants, the procedures **VarPtrArr** and **ArrPtr** that return the address of an array, and **ZeroMemory**, **MemMoveEx**, **VariantArrayClone** and **ReassignArrayTo**, which clear, move, copy and hand over blocks of memory. **LibMemory** is the *VBA-MemoryTools* code of Ion Cristian Buse, under the MIT licence. A project that references the package can call them, but this section does not document them.

## See Also

- [Experimental Packages](../../Experimental/) -- the packages from TWINSERV that are not yet ready for use in a program
- [Contributed Packages](../) -- the other contributed packages
- [Collection](../../../Modules/Collection/) class -- the list that twinBASIC provides, with items found by key
- [For Each...Next](../../../Core/For-Each-Next) statement
- [Custom Enumerators](../../../../Features/Language/Custom-Enumerators) -- how a class provides the enumerator that **For Each** uses
