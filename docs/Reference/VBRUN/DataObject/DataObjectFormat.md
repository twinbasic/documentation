---
title: DataObjectFormat
parent: DataObject Module
permalink: /tB/Packages/VBRUN/DataObject/DataObjectFormat
---
# DataObjectFormat
{: .no_toc }

A **DataObjectFormat** describes one of the formats a [**DataObject**](.) holds a value in. The descriptor is the element type yielded when iterating a [**DataObjectFormats**](DataObjectFormats) collection, and exposes everything the runtime needs to negotiate a transfer: which clipboard format type the data is in, which aspect (rendering) of it is on offer, and how the bytes are stored.

## Members

### AspectIndex

Returns or sets a one-based index into the chosen [**AspectType**](#aspecttype), as a **Long**.

Syntax: *object*.**AspectIndex** [ **=** *value* ]

For aspects that have several pages or frames — for example a multi-page metafile rendered with `dvaspect_Content` — **AspectIndex** picks which one this descriptor refers to. For single-aspect formats, leave at the default.

### AspectType

Returns or sets which rendering of the underlying data the descriptor refers to, as an **AspectTypeConstants** value.

Syntax: *object*.**AspectType** [ **=** *value* ]

Common values are `dvaspect_Content` (the data itself), `dvaspect_Thumbnail` (a small preview), `dvaspect_Icon`, and `dvaspect_DocPrint` (a print-time rendering). Most formats only ever expose `dvaspect_Content`.

### FormatType

Returns or sets the clipboard format type, as a **ClipboardConstants** value.

Syntax: *object*.**FormatType** [ **=** *value* ]

Examples: `vbCFText`, `vbCFUnicodeText`, `vbCFBitmap`, `vbCFFiles`. The same numeric identifier can be passed to [**GetData**](GetData) or [**GetFormat**](GetFormat).

### Name

Returns the human-readable name of the format, as a **String**. Read-only.

Syntax: *object*.**Name**

For built-in clipboard formats this is a stable label such as `"Text"` or `"Bitmap"`; for formats registered with `RegisterClipboardFormat`, this is the name they were registered under, which is also the key accepted by [**GetDataByName**](GetDataByName) and [**GetFormatByName**](GetFormatByName).

### StorageType

Returns or sets how the data is stored, as a **StorageTypeConstants** value.

Syntax: *object*.**StorageType** [ **=** *value* ]

Identifies the medium used to transfer the bytes — a global memory handle, a file path, an `IStream`, an `IStorage`, a GDI handle, a metafile, or an enhanced metafile. The runtime normally negotiates this automatically; setting it directly is only needed when interoperating with another component that requires a specific medium.

## See Also

- [DataObject](.)
- [DataObjectFormats](DataObjectFormats) collection
- [AvailableFormats](AvailableFormats) method
