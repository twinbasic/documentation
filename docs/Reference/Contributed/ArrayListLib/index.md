---
title: ArrayListLib Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - CommonModule
  - LibMemory
  - LibMemoryEx
indexed_from: 1.6.151.1
permalink: /tB/Packages/Contributed/ArrayListLib/
---

# ArrayListLib Package
{: .no_toc }

**Author:** R.Beltran. **Version:** 1.6.151.1. **On GitHub:** [Theadd/ArrayList](https://github.com/Theadd/ArrayList), in the folder *ArrayListLib*.

The **ArrayListLib** contributed package is a list class for twinBASIC, in place of the `ArrayList` class of .NET's `mscorlib` library. A VBA or VB6 program that needs a list which grows as items are added can use that class through `CreateObject("System.Collections.ArrayList")`. [**ArrayList**](ArrayList) has the members of that class which a COM client can call, under the same names, and needs no .NET Framework.

This section documents version 1.6.151.1, which is the version on TWINSERV, published under the Unlicense.

> [!NOTE]
> Version 1.6.151.1 does not compile in twinBASIC BETA 1005, so a project that references it does not build (error TB5001, in a 32-bit and in a 64-bit build). **ArrayList** passes the addresses of two items, as **Long** values, to its private procedure **VSwap**, which declares both parameters as `ByRef` structures, in **Reverse** (`ArrayList.twin`, line 297) and in the two quicksort procedures that **Sort** calls (lines 585 and 602). **MemMoveBSTR**, a private procedure of the module **LibMemoryEx**, passes an address to **LSetByVal** in the same way (`Modules/LibMemoryEx.twin`, line 104), and **LSetByVal** declares its parameter as a `ByRef` structure that holds a string pointer. A pointer passed for a structure has to be passed `ByVal`. The behaviour described on these pages is that of the package with the two arguments of each **VSwap** call passed `ByVal`, and with **LSetByVal** taking the address as a **LongPtr** and putting it in a structure of its own. That copy builds in 32-bit and in 64-bit programs, and both give the same results.

> [!WARNING]
> Several members give wrong results, damage memory or never return. A **For Each** over a list with no items raises an error, and one that runs under `On Error Resume Next` never ends. A call to **GetEnumerator** after a **For Each** over the same list ran to the end ignores its arguments. **Reverse** keeps the two middle items of a run with an even number of items in place, and overwrites memory when the run has no items. **ToString** never returns for a list with no items. **Insert** at the first position fails unless the list has room for 31 more items. **Remove** with a negative **BaseIndex** removes the wrong item. A range reads released memory after a change made through it makes the list grow. See [Known problems](#known-problems).

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

- **Creation.** A list is created with **New**, as in `Dim list As New ArrayList`, in place of `CreateObject`. **New** takes an optional capacity and an optional index base, which needs a variable declared first: `Dim list As ArrayList = New ArrayList(100, 1)`. See [New](ArrayList#new).
- **Members left out.** The package has none of the static members of the .NET class (**Adapter**, **FixedSize**, **ReadOnly**, **Repeat** and **Synchronized**), nor its **TrimToSize** method, and **ToArray** has no *Type* argument.
- **Overloads.** The README of the package says that COM has no overloaded methods, and that the hidden members with a number in their name, such as `IndexOf_2`, stand for the overloads of the .NET class. See [Hidden members](ArrayList#hidden-members).
- **Additions.** [**BaseIndex**](ArrayList#baseindex) makes the first item number 1, or any other number, in place of 0. [**Count**](ArrayList#count) can be assigned, [**GetEnumerator**](ArrayList#getenumerator) takes a start, a count and a step so that **For Each** can go through part of a list or backwards, and the methods that take a collection also take any array. [**ToString**](ArrayList#tostring) writes the items as text, in the notation of a JSON array.
- **Errors.** An index outside the list raises error 9, *Subscript out of range*, and an argument of the wrong kind error 13 or 6. The documentation of the .NET class lists an **ArgumentOutOfRangeException** for an index outside the list.
- **Changes during a loop.** A **For Each** over a list that changes while the loop runs is not detected. The documentation of the .NET class says that its enumerator is invalidated by such a change. See [Enumerating](ArrayList#enumerating).

The page [ArrayList](ArrayList#differences-from-the-net-class) lists the remaining differences.

## Classes and interfaces

- [ArrayList](ArrayList) -- the list: items added, inserted, found, removed, sorted and enumerated
  - [BaseIndex](ArrayList#baseindex) -- returns or sets the number of the first item
  - [Capacity](ArrayList#capacity) -- returns or sets the number of items the list has room for
  - [Count](ArrayList#count) -- returns or sets the number of items
  - [Item](ArrayList#item) -- returns or sets one item (the default member)
  - [Add](ArrayList#add), [AddRange](ArrayList#addrange), [Insert](ArrayList#insert), [InsertRange](ArrayList#insertrange) -- add items
  - [Remove](ArrayList#remove), [RemoveAt](ArrayList#removeat), [RemoveRange](ArrayList#removerange), [Clear](ArrayList#clear) -- remove items
  - [Contains](ArrayList#contains), [IndexOf](ArrayList#indexof), [LastIndexOf](ArrayList#lastindexof), [BinarySearch](ArrayList#binarysearch) -- find items
  - [Sort](ArrayList#sort), [Reverse](ArrayList#reverse) -- reorder items
  - [GetRange](ArrayList#getrange), [SetRange](ArrayList#setrange), [CopyTo](ArrayList#copyto), [ToArray](ArrayList#toarray), [Clone](ArrayList#clone) -- parts and copies
  - [ToString](ArrayList#tostring) -- the items as text
  - [GetEnumerator](ArrayList#getenumerator) -- the enumerator that **For Each** uses
- [ListRange](ListRange) -- a view of a run of items in an ArrayList, returned by **GetRange**
- [Enumerator](Enumerator) -- the enumerator of **For Each**, with a start, a count and a step
- [Comparer](Comparer) -- compares two values for **Sort** and **BinarySearch**
- [Interfaces](Interfaces) -- the nine interfaces: **ICloneable**, **ICollection**, **IComparer**, **IEnumVARIANT**, **IEnumerable**, **IEnumerator**, **IList**, **IListRange** and **IArrayList**

## Name clashes

The package declares the names **ArrayList**, **Comparer**, **Enumerator**, **ListRange**, **ICloneable**, **ICollection**, **IComparer**, **IEnumVARIANT**, **IEnumerable**, **IEnumerator**, **IList**, **IListRange** and **IArrayList**, and its three modules declare more (see below). A name that another library or the project declares as well can be written with the name of the package in front, as in `ArrayListLib.ArrayList`.

## Known problems

These faults are those of the package as described in the note above. The ones marked as wrong results, memory damage or a hang are the ones a program is likely to meet.

- **For Each over a list with no items.** [**GetEnumerator**](ArrayList#getenumerator) returns nothing for a list or a range with no items, and the **For Each** raises error -2147467259 (`E_FAIL`, *Unspecified error*). Under `On Error Resume Next` the statement is repeated without end. The same holds for a list that **Clear** or the removal of its last item has emptied.
- **For Each over a variable of an interface type.** A **For Each** over a variable declared as **IList**, **ICollection**, **IEnumerable**, **IListRange** or **IArrayList** raises error -2147352567, *Exception occurred.* A variable declared as **ArrayList**, **ListRange**, **Object** or **Variant** works. A call of **GetEnumerator** through an interface variable with fewer than all four arguments does not compile (TB5050).
- **GetEnumerator reuses its enumerators.** Each list keeps two enumerators and gives out the first one when it is not in use. The first one is in use from the start of a **For Each** until the loop ran to the end; leaving the loop with **Exit For** keeps it in use. When the list has not changed since the enumerator was bound, the arguments of **GetEnumerator** (*Index*, *GetCount* and *GetStep*) are ignored, so a second loop over the same list gives the part, the count and the direction of the first. A third loop nested inside two others reuses the second enumerator while it is in use, and gives wrong items. Assigning [**Capacity**](ArrayList#capacity) can move the items to another place in memory without changing the list's version number, so the next loop over the list can read the memory the items left.
- **Reverse.** The loop runs for *i* from 0 up to and including half of the count, rounded down, and swaps the items at *i* and at the count - 1 - *i* from the start of the run. For an even count the last pass swaps the middle pair a second time, so those two items keep their order: a run of two items is not reversed at all. For a run of no items the loop still runs once, and swaps the item at the start of the run with the item-sized block before it (16 bytes in a 32-bit program, 24 in a 64-bit one). With the run at the start of the list, that block is the header of the memory block that holds the items. The next growth of the list raised error -2147024882 (*Not enough memory resources are available*) in a 32-bit program, and ended a 64-bit program with the exception 0xC0000374 (damage to the heap).
- **ToString.** The method goes through the items with **For Each** under `On Error Resume Next`. It never returns for a list with no items, for a nested list with no items, and for an item that is an object with no enumerator, such as an instance of a class of the program.
- **Insert at the first position.** [**Insert**](ArrayList#insert) at **BaseIndex** on a list that has items needs room for 31 more items than the list holds. Without it, the method enlarges the array with `ReDim Preserve` and a lower bound of -30, which twinBASIC refuses, and raises error 9. A list with room for 31 more items does not fail.
- **Insert and InsertRange.** *Index* is not checked against **Count**, and the number of items the method moves is **Count** - *Index*. An *Index* above **Count** + **BaseIndex** crashed the program in **Insert** with an access violation.
- **CopyTo.** An array is refused with error 6 when `UBound(Target) - Index` is less than **Count**, so an array with exactly **Count** elements from *Index* is refused. The same check is in **ListRange**.
- **Sort and BinarySearch.** On an **ArrayList**, *Index* and *GetCount* are not checked against the list: a run that reaches past **Count** but not past the capacity takes in the unused places, and **Sort** then moves items out of the list. A **ListRange** checks them.
- **Capacity.** The assignment does not check its value against **Count**. A value below **Count** keeps **Count** as it was, and an item at an index past the capacity raises error 9. A value of 0 or less raises error -2147467259. The same error comes from `New ArrayList(0)` and from **Clone** of a list with no items.
- **Count.** A smaller value ends the list without clearing the items cut off. A larger value within the capacity makes those items part of the list again.
- **BaseIndex below 0.** [**IndexOf**](ArrayList#indexof) returns -1 for an item that is not in the list, and -1 is an index of such a list. **Remove** of a value that is not in the list removes the item at index -1, or raises error 9 when there is none. The hidden member **LastIndexOf_2** searches too few items with a negative **BaseIndex**, and raises error 9 with a positive one.
- **ListRange.** A change made through a range that makes the list enlarge its array leaves the range reading the old array, which has been released, so that it shows items the list no longer has in those places. An assignment to an item through a range, and **SetRange** of a range with a list as its argument, make the range invalid, because they add to the version number of the range and of the list by different amounts. **SetRange** of a range checks the number of items against the list and not the range.
- **Enumerator.** **Clone** starts at the beginning of the part and not at the position of the original.
- **For Each.** A change to the list during the loop is not detected.

## Memory modules

The package includes three modules. **LibMemory** and **LibMemoryEx** are used by the list classes to read and write memory directly: the array descriptor type **SAFEARRAY_1D** and its constants, the procedures **VarPtrArr** and **ArrPtr** that return the address of an array, and **ZeroMemory**, **MemMoveEx**, **VariantArrayClone** and **ReassignArrayTo**, which clear, move and copy blocks of memory and give an array to another variable. **LibMemory** is the *VBA-MemoryTools* code of Ion Cristian Buse, under the MIT licence. **CommonModule** holds **Stringify**, a hidden function that [**ToString**](ArrayList#tostring) calls for each value. A project that references the package can call them, but this section does not document them.

## See Also

- [Experimental Packages](../../Experimental/) -- the packages from TWINSERV that are not yet ready for use in a program
- [Contributed Packages](../) -- the other contributed packages
- [Collection](../../../Modules/Collection/) class -- the list that twinBASIC provides, with items found by key
- [For Each...Next](../../../Core/For-Each-Next) statement
- [Custom Enumerators](../../../../Features/Language/Custom-Enumerators) -- how a class provides the enumerator that **For Each** uses
