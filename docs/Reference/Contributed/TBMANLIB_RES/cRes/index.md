---
title: cRes
parent: TBMANLIB_RES Package
permalink: /tB/Packages/Contributed/TBMANLIB_RES/cRes/
has_toc: false
---

# cRes class
{: .no_toc }

A helper class that loads a binary resource from the compiled executable and converts it to bytes, a string, hex, Base64, or a picture.

Call [**Read**](#read) to load a resource by ID and type; it returns the same **cRes** instance so further conversion calls can be chained immediately. The loaded bytes are held internally and can be retrieved in multiple formats without reloading the resource.

```tb
Dim res As New cRes
res.Read 101, "BINARY"
Debug.Print res.ReturnHex(" ")
```

* TOC
{:toc}

## Enum: Base64Prefix

Controls the data-URI prefix prepended to the Base64 string returned by [**ReturnBase64**](#returnbase64). Pass a member to **ReturnBase64** when the result will be used directly in an HTML `src` or CSS `url()` attribute.

| Member | Data-URI prefix |
|---|---|
| **Base64Prefix_None** | *(none --- raw Base64 only)* |
| **Base64Prefix_ImagePNG** | `data:image/png;base64,` |
| **Base64Prefix_ImageJPEG** | `data:image/jpeg;base64,` |
| **Base64Prefix_ImageGIF** | `data:image/gif;base64,` |
| **Base64Prefix_ImageBMP** | `data:image/bmp;base64,` |
| **Base64Prefix_ImageICO** | `data:image/x-icon;base64,` |
| **Base64Prefix_ImageWebP** | `data:image/webp;base64,` |
| **Base64Prefix_VideoMP4** | `data:video/mp4;base64,` |
| **Base64Prefix_VideoWebM** | `data:video/webm;base64,` |
| **Base64Prefix_VideoOGG** | `data:video/ogg;base64,` |
| **Base64Prefix_AudioMP3** | `data:audio/mpeg;base64,` |
| **Base64Prefix_AudioWAV** | `data:audio/wav;base64,` |
| **Base64Prefix_AudioOGG** | `data:audio/ogg;base64,` |

## Methods

### Read
{: .no_toc }

Loads resource bytes from the compiled executable.

Syntax: *object*.**Read** ( *id*, *Type* ) **As cRes**

*id*
: *required* A **Variant** identifying the resource --- typically a **Long** resource ID or a **String** resource name.

*Type*
: *required* A **Variant** identifying the resource type --- typically a **String** such as `"BINARY"`, `"RCDATA"`, or a numeric type constant matching the resource's declared type.

Returns the same **cRes** instance, so calls can be chained:

```tb
Dim png As String
png = New cRes().Read(101, "PNG").ReturnBase64(Base64Prefix_ImagePNG)
```

The bytes are loaded with the **LoadResData** function. If no resource in the compiled binary matches the ID and type, **LoadResData** raises a run-time error.

### ReturnBytes
{: .no_toc }

Returns the loaded resource as a raw byte array.

Syntax: *object*.**ReturnBytes** ( ) **As Byte()**

Returns a **Byte** array containing the raw bytes loaded by [**Read**](#read). The array is a copy --- modifying it does not affect the internal buffer.

### ReturnString
{: .no_toc }

Converts the loaded bytes to a **String**.

Syntax: *object*.**ReturnString** ( [ *Conversion* ] ) **As String**

*Conversion*
: *optional* A **VbStrConv** constant passed to `StrConv` together with the byte array. Default: **vbUnicode**, which reads the bytes as text in the default ANSI code page of the system and converts it to a **String**.

Pass **vbFromUTF8** for a resource that holds UTF-8 text. **vbFromUnicode** converts in the opposite direction (a **String** to the ANSI code page) and does not suit a byte array. **ReturnString** has no option for UTF-16 LE text: assign the array from [**ReturnBytes**](#returnbytes) to a **String** variable instead.

### ReturnHex
{: .no_toc }

Returns the loaded bytes as a hex string.

Syntax: *object*.**ReturnHex** ( [ *Separator* [, *LineBreak* ] ] ) **As String**

*Separator*
: *optional* A **String** inserted between each byte's two-character hex value --- for example, `" "` for space-separated output or `"-"` for hyphen-separated. Default: `""` (no separator).

*LineBreak*
: *optional* A **Long** specifying the number of bytes per line. After every *LineBreak* bytes a `vbCrLf` is appended instead of *Separator*. Default: `0` (no line breaks).

Each byte is formatted as a two-character uppercase hex string (zero-padded). When both *Separator* and *LineBreak* are non-zero, the *LineBreak* threshold takes precedence at the end of each line.

```tb
' Print 16 bytes per line, space-separated.
Debug.Print New cRes().Read(101, "BINARY").ReturnHex(" ", 16)
```

### ReturnBase64
{: .no_toc }

Returns the loaded bytes encoded as a Base64 string, with an optional data-URI prefix.

Syntax: *object*.**ReturnBase64** ( [ *Prefix* ] ) **As String**

*Prefix*
: *optional* A member of the [**Base64Prefix**](#enum-base64prefix) enumeration. Default: **Base64Prefix_None** (raw Base64 with no prefix).

Base64 encoding is performed via the MSXML2 DOM: an XML element is created, its `DataType` is set to `"bin.base64"`, the byte array is assigned to `nodeTypedValue`, and the resulting text is read back. This requires `MSXML2.DOMDocument` to be available on the target machine. MSXML puts a line feed (`vbLf`) after every 72 characters of Base64, and **ReturnBase64** does not remove them.

```tb
' Embed a PNG resource as a Base64 data-URI for an HTML img tag.
Dim src As String
src = New cRes().Read(101, "PNG").ReturnBase64(Base64Prefix_ImagePNG)
' src is now: "data:image/png;base64,iVBORw0KGgo..."
```

### ReturnPicture
{: .no_toc }

Converts the loaded bytes to an **IPictureDisp** object.

Syntax: *object*.**ReturnPicture** ( ) **As IPictureDisp**

Passes the internal byte array to `Global.LoadPicture`, the twinBASIC form of **LoadPicture** that accepts a byte array, and returns the resulting **IPictureDisp**. The resource must contain a valid image in a format that **LoadPicture** supports (for example BMP, GIF, JPEG, PNG, ICO, WMF, or EMF).

The returned **IPictureDisp** can be assigned directly to the **Picture** property of a **PictureBox**, **Image**, or **Form**:

```tb
Picture1.Picture = New cRes().Read(101, "PNG").ReturnPicture()
```

## Example

This example loads a PNG resource by ID, displays it in a picture box, and also logs the Base64 representation to the immediate window.

```tb
Private Sub Form_Load()
    Dim res As New cRes

    ' Load resource ID 101 of custom type "PNG".
    res.Read 101, "PNG"

    ' Display in a PictureBox.
    Picture1.Picture = res.ReturnPicture()

    ' Log a data-URI suitable for an HTML img src attribute.
    Debug.Print res.ReturnBase64(Base64Prefix_ImagePNG)

    ' Log all the bytes as hex, space-separated, 16 bytes per line.
    Debug.Print res.ReturnHex(" ", 16)
End Sub
```

## See Also

- [TBMANLIB_RES](../) package -- overview
