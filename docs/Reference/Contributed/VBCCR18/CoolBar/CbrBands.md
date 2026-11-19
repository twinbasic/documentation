---
title: CbrBands
parent: CoolBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/CoolBar/CbrBands
has_toc: false
---

# CbrBands class
{: .no_toc }

The collection of the bands of a [**CoolBar**](.), which its [**Bands**](.#bands) property returns. Its items are [**CbrBand**](CbrBand) objects, numbered from 1, and an item can have a key as well.

```tb check_build check_run arch=win32,win64
Dim Band As CbrBand
CoolBar1.Bands.Clear
CoolBar1.Bands.Add , "edit", "Edit"
CoolBar1.Bands.Add , "view", "View"
CoolBar1.Bands.Add 1, "file", "File"              ' before the first
For Each Band In CoolBar1.Bands
    Debug.Print Band.Index; Band.Key
Next
' Output:
'  1 file
'  2 edit
'  3 view
```

A program goes through the bands with **For Each**, or by number from 1 to [**Count**](#count). It cannot make a **CbrBands** object with **New**.

* TOC
{:toc}

## Numbers and keys

<!-- test: CoolBarTests.Bands_Add_AtAnIndex_MovesTheLaterBands, CoolBarTests.Bands_Remove_RenumbersTheLaterBands -->
The number of a band in the collection is its [**Index**](CbrBand#index). It changes when a band is added before it or removed before it, so that a program that keeps a number over such a change keeps the wrong band. A key stays with its band.
<!-- /test -->

 The order of the collection is not the order in the cool bar: the user moves a band, and so does the program with [**Position**](CbrBand#position), and its **Index** does not change. [**ItemFromPosition**](#itemfromposition) returns a band by its place in the cool bar.

<!-- test: CoolBarTests.Bands_Add_DuplicateKey_Raises457, CoolBarTests.Bands_Item_OutOfRangeOrUnknown_RaisesItsError -->
A key is any string, and capital and small letters in it are the same: `"File"` and `"FILE"` are one key. No two bands of a cool bar have the same key. A band needs no key: an empty string is no key, and any number of bands can be without one.
<!-- /test -->

Properties
----------

### Count
{: .no_toc }

The number of bands in the collection. **Long**, read-only.

### Item
{: .no_toc }

Returns one band. It is the default member, so `CoolBar1.Bands("file")` is `CoolBar1.Bands.Item("file")`.

Syntax: *object*.**Item**( *Index* ) **As CbrBand**

*Index*
: *required* The number of the band, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: CoolBarTests.Bands_Item_OutOfRangeOrUnknown_RaisesItsError -->
A number outside that range raises run-time error 9, and a key that no band has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

### ItemFromPosition
{: .no_toc }

Returns the band at a place in the cool bar.

Syntax: *object*.**ItemFromPosition**( *Position* ) **As CbrBand**

*Position*
: *required* A **Long**: the [**Position**](CbrBand#position) of the band, from 1 to [**Count**](#count).

<!-- test: CoolBarTests.Band_Position_MovesTheBandNotItsIndex -->
The band is the one whose **Position** is the argument, so that after a band moves, `ItemFromPosition(1)` returns the band now first.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Puts a band into the cool bar and returns its [**CbrBand**](CbrBand).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Caption* ] [, *Image* ] [, *NewRow* ] [, *Child* ] [, *Visible* ] ) **As CbrBand**

*Index*
: *optional* A **Long**: the number the new band gets. The bands from that number on move up by one, and the new band takes their place in the cool bar. Without it, or with 0, the band goes after the last one.

*Key*
: *optional* A **String** by which the program can name the band. See [Numbers and keys](#numbers-and-keys).

*Caption*
: *optional* A **String**: the text shown in the band.

*Image*
: *optional* A **Variant**: the number of a picture in the cool bar's [**ImageList**](.#imagelist), or its key as a **String**.

*NewRow*
: *optional* A **Boolean**: whether the band starts a row. Default: **False**.

*Child*
: *optional* The control that the band holds: a control on the cool bar, as [Holding a control](.#holding-a-control) says.

*Visible*
: *optional* A **Boolean**: whether the band is shown. Default: **True**.

<!-- test: CoolBarTests.Bands_Add_IndexOutOfRange_Raises35600, CoolBarTests.Bands_Add_NewRowOnTheFirstBand_Raises35801, CoolBarTests.Bands_Add_ChildNotOnTheCoolBar_Raises380, CoolBarTests.Band_Image_KeyWithoutAnImageListOrNegativeNumber_RaisesItsError -->
An *Index* below 0, and one above [**Count**](#count) + 1, raises run-time error 35600, *Index out of bounds*. A *NewRow* of **True** for the first band, which is an empty cool bar or an *Index* of 1, raises error 35801, because the first band cannot start a row. A *Child* that is not a control on the cool bar raises error 380. A key as *Image* needs an image list on the cool bar that has a picture of that key: where it has not, the call raises error 35601, *Element not found*, and a negative number raises error 35600. None of these calls adds a band.
<!-- /test -->

<!-- test: CoolBarTests.Bands_Add_DuplicateKey_AddsNothingToTheWindow -->
> [!WARNING] 1.8.136.0
> A call that raises error 457 for its key has already put its band into the cool bar. The collection is as it was, and the cool bar shows one band more than [**Count**](#count) says, which no **CbrBand** reaches. A program asks [**Exists**](#exists) before it adds a band with a key that the cool bar may have.

### Clear
{: .no_toc }

Removes every band.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

Returns whether the collection has a band of a number or a key, so that a program can ask before [**Item**](#item) raises an error.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one band. The bands after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the band. One that the collection does not have raises the error that [**Item**](#item) raises for it.

## See Also

- [CoolBar](.) class
- [CbrBand](CbrBand) class -- one band
