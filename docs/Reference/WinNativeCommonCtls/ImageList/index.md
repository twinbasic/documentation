---
title: ImageList
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/ImageList/
has_toc: false
---

# ImageList class
{: .no_toc }

An **ImageList** is an off-screen container for pictures, all of which are scaled to the same [**ImageWidth**](#imagewidth) × [**ImageHeight**](#imageheight) bitmap size. The control has no visible representation at run time — its purpose is to feed icons to other controls that consume them through their [**Icons**](../ListView/#icons), [**SmallIcons**](../ListView/#smallicons), [**ColumnHeaderIcons**](../ListView/#columnheadericons), or [**ImageList**](../TreeView/#imagelist) properties.

```tb
Private Sub Form_Load()
    ' Load some pictures via the Add method
    ImageList1.ListImages.Add , "doc",    LoadPicture("doc.ico")
    ImageList1.ListImages.Add , "folder", LoadPicture("folder.ico")
    ImageList1.ListImages.Add , "image",  LoadPicture("image.ico")

    ' Bind to a TreeView
    Set TreeView1.ImageList = ImageList1

    ' Add nodes that reference images by Key
    TreeView1.Nodes.Add , , , "My Folder", "folder"
    TreeView1.Nodes.Add , , , "Report",    "doc"
End Sub
```

The control inherits the rectangular non-focusable base members from `BaseControlNotFocusable` — size and position (size is irrelevant at run time since the control isn't drawn), **Name**, **Tag**, **hWnd**. It does not expose **Visible**, **Anchors**, or **Dock** in any meaningful way, and never accepts focus.

* TOC
{:toc}

## Image size lock-in

The first picture added to the list fixes its [**ImageWidth**](#imagewidth) and [**ImageHeight**](#imageheight) — every subsequent picture is scaled to match those dimensions. The sizes can also be set explicitly *before* any image is added (typically through the design-time properties), in which case the first **Add** call honors the pre-set values rather than measuring the incoming picture.

Once any image is in the list, attempting to assign [**ImageWidth**](#imagewidth) or [**ImageHeight**](#imageheight) raises run-time error 35611 with the message *"Property is read-only if image list contains images"*. To resize an image list, call [**ListImages.Clear**](ListImages#clear) first.

## Mask color and transparency

When [**UseMaskColor**](#usemaskcolor) is **True** (the default), every bitmap added through [**ListImages.Add**](ListImages#add) is masked: pixels matching [**MaskColor**](#maskcolor) become transparent when the image is rendered into a consuming control. The default [**MaskColor**](#maskcolor) is `&H00C0C0C0` (silver), which matches the classic VB6 transparency convention. Icons (passed as `StdPicture` of type `vbPicTypeIcon`) carry their own alpha mask and are unaffected by **MaskColor** / **UseMaskColor**.

Setting [**ColorDepth**](#colordepth) to **ColorDepth32Bit** disables masking entirely — the alpha channel is preserved directly.

## Binding to consumers

When an **ImageList** is bound to a [**ListView**](../ListView/) (through [**Icons**](../ListView/#icons), [**SmallIcons**](../ListView/#smallicons), or [**ColumnHeaderIcons**](../ListView/#columnheadericons)) or a [**TreeView**](../TreeView/) (through [**ImageList**](../TreeView/#imagelist)), the consuming control increments the **ImageList**'s internal bound-count. While the bound-count is non-zero, attempts to call [**ListImages.Clear**](ListImages#clear) or [**ListImages.Remove**](ListImages#remove) raise run-time error 35617 (*"ImageList cannot be modified while another control is bound to it"*). To modify the contents, first unbind by setting the consuming control's image-list property to **Nothing**.

Properties
----------

### BackColor
{: .no_toc }

The background color used to render the image list into a target DC via [**ListImage.Draw**](ListImage#draw) when [**UseBackColor**](#usebackcolor) is **True**. **OLE_COLOR**. Default: **vbWindowBackground**.

### ColorDepth
{: .no_toc }

The pixel depth of the underlying bitmap storage. A member of [**ImageListColorDepth**](#imagelistcolordepth). Default: **ColorDepth32Bit**. Once images have been added, this value is fixed for the life of the list — to change it, call [**ListImages.Clear**](ListImages#clear) first.

### hImageList
{: .no_toc }

The Win32 `HIMAGELIST` handle of the underlying ComCtl32 image list. **LongPtr**, read-only. Useful for advanced interoperability with raw Win32 APIs (e.g. `ImageList_Draw`, custom-draw callbacks); the handle is owned by the **ImageList** control and must not be destroyed by user code.

### ImageHeight
{: .no_toc }

The pixel height every image in the list is scaled to. **Long**. Default: `0` (uses the first added image's height). Assigning is allowed only while the list is empty; otherwise run-time error 35611.

### ImageWidth
{: .no_toc }

The pixel width every image in the list is scaled to. **Long**. Default: `0`. Same locking semantics as [**ImageHeight**](#imageheight).

### ListImages
{: .no_toc }

The [**ListImages**](ListImages) collection holding the pictures. Read-only.

### MaskColor
{: .no_toc }

The color treated as transparent when adding bitmap pictures. **OLE_COLOR**. Default: `&H00C0C0C0` (silver). Only honoured when [**UseMaskColor**](#usemaskcolor) is **True** and [**ColorDepth**](#colordepth) is not **ColorDepth32Bit**.

### UseBackColor
{: .no_toc }

Whether the image list reports a fixed background color (via `ImageList_SetBkColor`) to consuming controls. **Boolean**. Default: **False**. When **False**, the consuming control treats masked pixels as transparent.

### UseMaskColor
{: .no_toc }

Whether [**MaskColor**](#maskcolor) is treated as transparent when bitmaps are added. **Boolean**. Default: **True**.

Methods
-------

### Overlay
{: .no_toc }

Composes two list-images into a single overlay picture. The first image is drawn, then the second is drawn over the top with its mask applied.

Syntax: *object*.**Overlay** ( *Key1*, *Key2* ) **As StdPicture**

*Key1*
: The **Index** or **Key** of the bottom image.

*Key2*
: The **Index** or **Key** of the top image.

Returns an **StdPicture** of type **vbPicTypeIcon** suitable for direct rendering or for use elsewhere — note this is a one-off snapshot, not a reference into the image list. The returned icon is destroyed when the **StdPicture** goes out of scope.

## ImageListColorDepth
{: #imagelistcolordepth }

Determines the pixel depth of the bitmap storage in an [**ImageList**](.). Declared on the **ImageList** class.

| Member                  | Value | Description                                                  |
|-------------------------|-------|--------------------------------------------------------------|
| **ColorDepth4Bit**{: #ImageListColorDepth_ColorDepth4Bit }   | 4  | 16-color palette.                          |
| **ColorDepth8Bit**{: #ImageListColorDepth_ColorDepth8Bit }   | 8  | 256-color palette.                         |
| **ColorDepth16Bit**{: #ImageListColorDepth_ColorDepth16Bit } | 16 | High color (RGB565).                       |
| **ColorDepth24Bit**{: #ImageListColorDepth_ColorDepth24Bit } | 24 | True color (RGB888), no alpha.             |
| **ColorDepth32Bit**{: #ImageListColorDepth_ColorDepth32Bit } | 32 | True color with full alpha channel; masking is disabled at this depth. |

## See Also

- [ListImage](ListImage) -- one picture in the list
- [ListImages](ListImages) -- the collection holding the pictures
- [ImlDrawConstants](../Enumerations/ImlDrawConstants) -- the *Style* parameter for [**ListImage.Draw**](ListImage#draw)
- [ListView](../ListView/) -- a typical consumer through [**Icons**](../ListView/#icons), [**SmallIcons**](../ListView/#smallicons), [**ColumnHeaderIcons**](../ListView/#columnheadericons)
- [TreeView](../TreeView/) -- a typical consumer through [**ImageList**](../TreeView/#imagelist)
- [ControlTypeConstants](../../VBRUN/Constants/ControlTypeConstants) -- where **vbImageList** lives
