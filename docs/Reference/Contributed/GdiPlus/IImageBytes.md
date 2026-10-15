---
title: IImageBytes
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/IImageBytes
---

# IImageBytes interface
{: .no_toc }

The COM interface through which a stream gives GDI+ direct access to the bytes of an image in memory.

When GDI+ reads an image from a stream, it asks the stream object whether it also supports **IImageBytes**. A stream that does lets GDI+ lock a range of bytes in place and read them, so that the image does not have to be copied out of the stream first. A stream object that offers the interface can be passed to [**Image**](Image#creating) or [**Bitmap**](Bitmap#creating) as the *stream* argument. The interface ID is returned by **CodecIImageBytes** ([**ImageCodec**](ImageCodec#other-ids)). It mirrors the GDI+ [IImageBytes](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/nn-gdiplusimaging-iimagebytes) interface and derives from **IUnknown**.

## Methods

### CountBytes

Syntax: *obj*.**CountBytes**( *pcb* )

*pcb*
: *required* A **UINT** that receives the total number of bytes in the stream.

### LockBytes

Syntax: *obj*.**LockBytes**( *cb*, *ulOffset*, *ppvBytes* )

*cb*
: *required* The number of bytes to lock, a **UINT**.

*ulOffset*
: *required* The offset of the first byte to lock from the start of the stream, a **ULONG**.

*ppvBytes*
: *required* Receives the address of the first locked byte.

Locks *cb* bytes, starting at *ulOffset*, and returns the address of the locked memory. The memory must stay valid until the matching call of **UnlockBytes**.

### UnlockBytes

Syntax: *obj*.**UnlockBytes**( *pvBytes*, *cb*, *ulOffset* )

*pvBytes*
: *required* The address that **LockBytes** returned.

*cb*
: *required* The number of bytes locked, a **UINT**.

*ulOffset*
: *required* The offset that was locked, a **ULONG**.

Releases the range that **LockBytes** locked.

## Example

The interface ID is what GDI+ asks a stream for. A program that implements the interface in a class compares the requested ID with this one.

```tb check_build check_run
Dim wanted As GDIP_UUID = CodecIImageBytes()
Debug.Print Hex$(wanted.Data1)
Dim bytes As IImageBytes
Debug.Print bytes Is Nothing
' Output:
' 25D1823
' True
```

## See Also

- [IImageBytes](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/nn-gdiplusimaging-iimagebytes) -- Microsoft's documentation of the interface
- [Image](Image) class
- [Bitmap](Bitmap) class
- [ImageCodec](ImageCodec) -- the interface ID
