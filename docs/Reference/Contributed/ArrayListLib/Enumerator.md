---
title: Enumerator
parent: ArrayListLib Package
permalink: /tB/Packages/Contributed/ArrayListLib/Enumerator
has_toc: false
---

# Enumerator class
{: .no_toc }

An **Enumerator** goes through a run of the items of an array of **Variant** for [**For Each**](../../../Core/For-Each-Next), starting at any item, in steps of any size and in either direction. [**GetEnumerator**](ArrayList#getenumerator) of an [**ArrayList**](ArrayList) returns one over the items of the list. The class is public, so a program can also use it over any array of **Variant**.

An **Enumerator** implements [**IEnumerator**](Interfaces#ienumerator), which extends [**IEnumVARIANT**](Interfaces#ienumvariant), the interface that **For Each** calls. It reads the memory of the array directly, without a copy.

```tb check_build
Dim a() As Variant
a = Array("x", "y", "z")

Dim v As Variant
For Each v In New Enumerator(a, 0, 3, -1)
    Debug.Print v
Next
```

* TOC
{:toc}

## Position, step and size

The enumerator covers a part of the array: *GetCount* items from *Index*. Its position, [**CurrentIndex**](#currentindex), counts from the first item of that part, which is 0 whatever *Index* is. [**CurrentStep**](#currentstep) is how far the position moves for each item; a negative step goes backwards, and the position then starts at the last item of the part. The loop ends when the position leaves the part, which is [**CurrentSize**](#currentsize) items long.

The properties can be changed inside the loop, through the **IEnumerator** variable that **GetEnumerator** or the constructor fills in. A change takes effect at the next item. Assigning **CurrentIndex** makes the next item the one at that index; assigning **CurrentStep** moves the next item by the new step from the present position.

```tb check_build
Dim list As New ArrayList
list.AddRange Array("a", "b", "c", "d", "e")

Dim e As IEnumerator
Dim v As Variant
For Each v In list.GetEnumerator(, , , e)
    Debug.Print v
    If v = "b" Then e.CurrentIndex = 3
Next
```

**Next** adds the step to the position before it reads an item, except for the first item, where the step to add is 0. **Reset** and [**Bind**](#bind) set the position to the first item of the part and make the step to add 0, so the first **Next** after either of them returns the first item.

Nothing checks that the array is unchanged during the loop. See [Enumerating](ArrayList#enumerating).

## Constructors

### New
{: .no_toc }

Creates an enumerator.

Syntax: **New Enumerator** [ ( *TargetArray* [ , *Index* [ , *GetCount* [ , *GetStep* [ , *ThisEnumerator* ] ] ] ] ) ]

*TargetArray*
: *required* An array of **Variant**, passed by reference. The enumerator reads its memory in place.

*Index*
: *optional* A **Long**: the index in the array of the first item of the part. The default is 0.

*GetCount*
: *optional* The number of items in the part. The default is all the items from *Index* to the end of the array.

*GetStep*
: *optional* A **Long**: how far the position moves for each item. The default is 1. A negative value goes backwards.

*ThisEnumerator*
: *optional* An [**IEnumerator**](Interfaces#ienumerator) variable that receives the new enumerator.

Without arguments, the enumerator has no array; call [**Bind**](#bind) to give it one. Until then its [**CurrentSize**](#currentsize) and [**CurrentStep**](#currentstep) are 0, and **Next** reports the end of the part at once. With arguments, it is bound by **Bind** at once.

## Properties

### CurrentIndex
{: .no_toc }

The position of the item that was last returned, counted from the first item of the part. **Long**, read/write.

Syntax: *object*.**CurrentIndex** [ **=** *value* ]

*value*
: A **Long**. The next item is the one at this index. A value outside the part ends the loop.

Before the first item is returned, the position is 0, or the last item of the part for a negative step.

### CurrentSize
{: .no_toc }

The number of items in the part that is enumerated. **Long**, read/write.

Syntax: *object*.**CurrentSize** [ **=** *value* ]

*value*
: A **Long**. Use it with care, and only to shorten the part of a larger array: the value is not checked, so one larger than the array reads past its items.

### CurrentStep
{: .no_toc }

How far the position moves for each item. **Long**, read/write.

Syntax: *object*.**CurrentStep** [ **=** *value* ]

*value*
: A **Long**. A negative value goes backwards. The next item is the one at the present position plus *value*.

A step of 0 returns the same item for ever, so a loop with it does not end.

### IsAvailable
{: .no_toc }

Whether the enumerator is free for a new loop. **Boolean**, read-only.

Syntax: *object*.**IsAvailable**

The value is **True** for a new enumerator. It becomes **False** when [**Reset**](#reset) is called, which **For Each** does at the start of a loop, and **True** again when a call of **Next** reaches the end of the part. A loop left with **Exit For** leaves it **False**. The property belongs to the class **Enumerator**; the interface **IEnumerator** does not have it. [**GetEnumerator**](ArrayList#getenumerator) of a list uses it to find out whether the enumerator it kept can serve another loop.

## Methods

### Bind
{: .no_toc }

Gives the enumerator a part of an array to go through.

Syntax: *object*.**Bind** ( *TargetArray*, *Index*, *GetCount*, *GetStep* )

*TargetArray*
: *required* An array of **Variant**, passed by reference.

*Index*
: *required* A **Long**: the index in the array of the first item of the part.

*GetCount*
: *required* A **Long**: the number of items in the part.

*GetStep*
: *required* A **Long**: how far the position moves for each item.

The enumerator reads the memory of the array in place, so the array must not be resized or erased while the enumerator is in use. The position is set to the first item of the part, or to the last one for a negative *GetStep*, and the step that **Next** adds becomes 0, so the next **Next** returns that item. **Bind** does not change [**IsAvailable**](#isavailable).

### GetEnumerator
{: .no_toc }

Returns the enumerator itself.

Syntax: *object*.**GetEnumerator** ( ) **As stdole.IUnknown**

The method is marked [**[Enumerator]**](../../../Core/Attributes#enumerator), so **For Each** can be used on an **Enumerator** object, as in the first example.

## Members of IEnumerator

The class implements these members privately. They are reached through an [**IEnumerator**](Interfaces#ienumerator) or [**IEnumVARIANT**](Interfaces#ienumvariant) variable, such as the one that *ThisEnumerator* fills in.

```tb check_build
Dim list As New ArrayList
list.AddRange Array(10, 20)

Dim e As IEnumerator
list.GetEnumerator 0, , 1, e

Dim v As Variant
Dim fetched As Long
e.Next 1, v, fetched
Debug.Print v & " " & fetched
e.Next 1, v, fetched
Debug.Print v & " " & fetched
e.Next 1, v, fetched
Debug.Print fetched
```

### Clone
{: .no_toc }

Creates another enumerator over the same part.

Syntax: *object*.**Clone** ( *ppenum* )

*ppenum*
: *required* An **IEnumVARIANT** variable that receives the new enumerator.

The new enumerator has the same items and step and starts at the beginning of the part, not at the position of the original.

### Next
{: .no_toc }

Returns the next item.

Syntax: *object*.**Next** ( *celt*, *rgvar*, *pceltFetched* )

*celt*
: *required* A **Long**, which has to be 1. Any other value fails with the error code `E_INVALIDARG` (&H80070057), which a program that calls the member through an **IEnumerator** variable sees as error 5.

*rgvar*
: *required* A **Variant** that receives the item. An object is stored as a reference.

*pceltFetched*
: *required* A **Long** that receives 1 when an item was returned and 0 when the part is finished.

Returns `S_OK` when it returned an item. At the end of the part it sets *pceltFetched* to 0 and returns `S_FALSE`, which **For Each** reads as the end of the loop.

### Reset
{: .no_toc }

Goes back to the start of the part.

Syntax: *object*.**Reset** ( )

The position becomes 0, or the last item of the part for a negative step, and the step that **Next** adds becomes 0, so the first **Next** after it returns the first item. **For Each** calls **Reset** before the first **Next**. [**IsAvailable**](#isavailable) becomes **False**.

### Skip
{: .no_toc }

Moves past items without returning them.

Syntax: *object*.**Skip** ( *celt* )

*celt*
: *required* A **Long**: the number of items to move past. The position moves by *celt* times the step. A position above the size of the part becomes the size plus 1, and one below 0 becomes -1.

## See Also

- [ArrayList](ArrayList) class -- its **GetEnumerator** returns an **Enumerator**
- [IEnumerator](Interfaces#ienumerator) interface -- the position, step and size properties
- [IEnumVARIANT](Interfaces#ienumvariant) interface -- the methods that **For Each** calls
- [Custom Enumerators](../../../../Features/Language/Custom-Enumerators) -- how a class provides the enumerator that **For Each** uses
- [ArrayListLib package](./) -- overview
