---
title: ListImage
parent: ImageList
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/ImageList/ListImage
has_toc: false
---

# ListImage class
{: .no_toc }

A **ListImage** is one picture inside an [**ImageList**](.)'s [**ListImages**](ListImages) collection. Returned from [**ListImages.Add**](ListImages#add) and from [**ListImages.Item**](ListImages#item).

The class is tagged `[COMCreatable(False)]` — user code never instantiates a **ListImage** directly; the [**ListImages**](ListImages) collection creates them as part of its **Add** method.

```tb
Dim img As ListImage = ImageList1.ListImages.Add(, "open", LoadPicture("open.ico"))
img.Tag = "Open document command"
```

* TOC
{:toc}

Properties
----------

### Index
{: .no_toc }

The 1-based position of the image within the parent collection. **Long**, read-only. Equals [**ListImages.Item**](ListImages#item)(*key*).Index for the same image.

### Key
{: .no_toc }

The string key the image was added under. **String**. Default: empty string. Lookups through [**ListImages.Item**](ListImages#item) accept either the numeric **Index** or the string **Key**.

### Picture
{: .no_toc }

The original `StdPicture` that was passed to [**ListImages.Add**](ListImages#add). **StdPicture**. The image list also keeps an internal scaled bitmap copy; modifying the returned **Picture** does not change what the list renders.

### Tag
{: .no_toc }

Arbitrary data the application can attach to the image. **Variant**.

Methods
-------

### Draw
{: .no_toc }

Renders the image into a Win32 device context at a given position. Useful for owner-draw scenarios where the application needs to paint the icon itself rather than going through a consumer control.

Syntax: *object*.**Draw** *hDC* [, *x* [, *y* [, *Style* ] ] ]

*hDC*
: An **OLE_HANDLE** to the destination device context.

*x*
: *optional* A **Variant** containing the horizontal pixel offset. Default: 0.

*y*
: *optional* A **Variant** containing the vertical pixel offset. Default: 0.

*Style*
: *optional* A combination of [**ImlDrawConstants**](../Enumerations/ImlDrawConstants) flags controlling the draw mode (normal, transparent, masked, selected, focused). Multiple flags can be **Or**-combined.

```tb
Private Sub PictureBox1_Paint()
    ImageList1.ListImages("doc").Draw _
        PictureBox1.hDC, 0, 0, _
        ImlDrawTransparent Or ImlDrawSelected
End Sub
```

### ExtractIcon
{: .no_toc }

Returns a fresh `StdPicture` containing the image rendered as an `HICON`. Distinct from the [**Picture**](#picture) property, which returns the original bitmap; **ExtractIcon** is a new icon built from the cached bitmap with transparency applied.

Syntax: *object*.**ExtractIcon** **As IPictureDisp**

The returned **IPictureDisp** owns its icon handle and destroys it when it goes out of scope.

## See Also

- [ImageList](.) -- the parent control
- [ListImages](ListImages) -- the collection holding **ListImage** instances
- [ImlDrawConstants](../Enumerations/ImlDrawConstants) -- the *Style* flag combinations for [**Draw**](#draw)
