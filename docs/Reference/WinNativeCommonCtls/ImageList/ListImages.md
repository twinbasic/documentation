---
title: ListImages
parent: ImageList
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/ImageList/ListImages
has_toc: false
---

# ListImages class
{: .no_toc }

The **ListImages** collection is the entry point for managing the pictures inside an [**ImageList**](.). Reached as `<imageList>.ListImages`; supports adding, removing, indexed access, and `For Each` iteration.

The class is tagged `[COMCreatable(False)]` — user code reaches **ListImages** through the parent [**ImageList**](.) control's [**ListImages**](.#listimages) property, never by direct instantiation.

```tb
With ImageList1.ListImages
    .Add , "doc",    LoadPicture(App.Path & "\doc.ico")
    .Add , "folder", LoadPicture(App.Path & "\folder.ico")
    Debug.Print .Count    ' 2
End With

Dim img As ListImage
For Each img In ImageList1.ListImages
    Debug.Print img.Index, img.Key
Next
```

* TOC
{:toc}

## Modification while bound

If the parent [**ImageList**](.) is bound to a consuming control (a [**ListView**](../ListView/) or [**TreeView**](../TreeView/) has it set as their image-list property), [**Clear**](#clear) and [**Remove**](#remove) raise run-time error 35617 (*"ImageList cannot be modified while another control is bound to it"*). [**Add**](#add) is unaffected — new pictures can always be added.

To rebuild a bound image list, first unbind by setting the consuming control's image-list property to **Nothing**.

Properties
----------

### Count
{: .no_toc }

The number of images in the collection. **Long**, read-only.

### Item
{: .no_toc }

Returns the [**ListImage**](ListImage) at the given index or with the given key. The default member, so `ImageList1.ListImages("doc")` works without writing `.Item("doc")`.

Syntax: *object*.**Item** ( *Index* ) **As ListImage**

*Index*
: A **Variant** that is either a 1-based **Long** position in the collection or a **String** key (case-sensitive — the collection uses `vbBinaryCompare`).

Methods
-------

### Add
{: .no_toc }

Adds a picture to the collection.

Syntax: *object*.**Add** ( [ *Index* ] [, *Key* ] [, *Picture* ] [, *Tag* ] ) **As ListImage**

*Index*
: *optional* A **Long** giving the 1-based position at which to insert the new image. When omitted, the image is appended at the end. Out-of-range values raise run-time error 35600.

*Key*
: *optional* A **String** name under which the image can be looked up. When omitted, the image has no key. Numeric strings are rejected with run-time error 35603. Keys must be unique within the collection.

*Picture*
: *required* A **StdPicture** to add. Bitmaps (`vbPicTypeBitmap`) are scaled and masked according to [**MaskColor**](.#maskcolor) / [**UseMaskColor**](.#usemaskcolor). Icons (`vbPicTypeIcon`) are added directly with their own alpha mask. Omitting *Picture* raises run-time error 35607.

*Tag*
: *optional* Arbitrary data attached to the new image; available as [**ListImage.Tag**](ListImage#tag).

Returns the newly-created [**ListImage**](ListImage).

The first call to **Add** fixes [**ImageWidth**](.#imagewidth) and [**ImageHeight**](.#imageheight) (unless those were pre-set in the property sheet); all subsequent pictures are scaled to match.

### Clear
{: .no_toc }

Removes every picture from the collection. Resets [**ImageWidth**](.#imagewidth) and [**ImageHeight**](.#imageheight) to `0`, unlocking them for reassignment.

Syntax: *object*.**Clear**

Raises run-time error 35617 if the parent [**ImageList**](.) is currently bound to a consuming control.

### Exists
{: .no_toc }

Returns whether a picture with the given key exists in the collection.

Syntax: *object*.**Exists** ( *Index* ) **As Boolean**

*Index*
: A **Variant**, coerced to a **String** for the lookup. Case-sensitive.

### Remove
{: .no_toc }

Removes a picture from the collection. The remaining pictures' [**Index**](ListImage#index) values are recomputed so subsequent lookups by index still work.

Syntax: *object*.**Remove** ( *Index* )

*Index*
: A **Variant** — either a 1-based **Long** position or a **String** key. Out-of-range / non-existent values raise run-time error 35601. Non-string non-numeric values raise run-time error 35603.

Raises run-time error 35617 if the parent [**ImageList**](.) is currently bound to a consuming control.

### _NewEnum
{: .no_toc }

Returns the enumerator used by `For Each img In imageList.ListImages`. Iterates the pictures in **Index** order.

Syntax: *object*.**_NewEnum** **As Object**

## See Also

- [ImageList](.) -- the parent control
- [ListImage](ListImage) -- one picture in the collection
