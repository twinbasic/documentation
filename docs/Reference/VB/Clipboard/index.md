---
title: Clipboard
parent: VB Package
permalink: /tB/Packages/VB/Clipboard/
has_toc: false
---

# Clipboard class
{: .no_toc }

The **Clipboard** class wraps the system clipboard — the Win32 inter-application copy-and-paste API — and exposes it as a singleton object. Code reads and writes text, queries which formats are currently available, and (eventually — see [the picture caveat](#picture-data)) reads and writes pictures.

**Clipboard** is not creatable: there is exactly one instance per process, owned by the runtime and exposed through the [**Clipboard**](../Global/#clipboard) property on the [**Global**](../Global/) app-object. Code reaches it without qualification:

```tb
' Copy
Clipboard.Clear
Clipboard.SetText "Hello, world!"

' Paste
If Clipboard.GetFormat(vbCFText) Then
    txtEditor.Text = Clipboard.GetText()
End If
```

* TOC
{:toc}

## Formats

Clipboard contents are tagged with a *format* — text, bitmap, files, rich text, and so on. The [**ClipboardConstants**](../../VBRUN/Constants/ClipboardConstants) enum lists the predefined formats:

| Constant              | Value | Meaning                                        |
|-----------------------|-------|------------------------------------------------|
| **vbCFText**          | 1     | ANSI plain text.                               |
| **vbCFBitmap**        | 2     | DDB (device-dependent bitmap).                 |
| **vbCFMetafile**      | 3     | Windows metafile (`WMF`).                      |
| **vbCFDIB**           | 8     | DIB (device-independent bitmap).               |
| **vbCFPalette**       | 9     | Colour palette.                                |
| **vbCFUnicodeText**   | 13    | UTF-16 plain text.                             |
| **vbCFEMetafile**     | 14    | Enhanced metafile (`EMF`).                     |
| **vbCFFiles**         | 15    | A list of file paths (`CF_HDROP`).             |
| **vbCFLink**          | `&HFFFFBF00` | DDE link (legacy OLE-1 link source).     |
| **vbCFRTF**           | `&HFFFFBF01` | Rich Text Format.                        |

The [**GetText**](#gettext) / [**SetText**](#settext) methods take an optional *Format* argument constrained to the text-shaped subset (**vbCFText**, **vbCFUnicodeText**, **vbCFRTF**, **vbCFLink**). The [**GetData**](#getdata) / [**SetData**](#setdata) methods handle pictures, restricted to the bitmap and metafile formats.

## Picture data

The picture methods — [**GetData**](#getdata) and [**SetData**](#setdata) — are declared but not yet connected.

> [!NOTE]
> [**GetData**](#getdata) and [**SetData**](#setdata) are reserved for compatibility with VB6; they are not currently implemented in twinBASIC. For picture-clipboard interop, use the Win32 clipboard API (`OpenClipboard`, `GetClipboardData`, `SetClipboardData`, `CloseClipboard`) directly until the implementation lands.

[**Clear**](#clear), [**GetText**](#gettext), [**SetText**](#settext), and [**GetFormat**](#getformat) are all fully functional.

## Methods

### Clear
{: .no_toc }

Empties the clipboard, removing every format currently on it.

Syntax: *object*.**Clear**

### GetData
{: .no_toc }

Reads picture data from the clipboard. Returns the result as a **stdole.StdPicture**.

Syntax: *object*.**GetData**( [ *Format* ] )

*Format*
: *optional* A member of [**ClipboardConstants**](../../VBRUN/Constants/ClipboardConstants) selecting which picture format to retrieve (**vbCFBitmap**, **vbCFDIB**, **vbCFMetafile**, **vbCFEMetafile**, or **vbCFPalette**). When omitted, the implementation picks the most descriptive format the clipboard currently holds.

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### GetFormat
{: .no_toc }

Tests whether the clipboard currently contains data in the given format. Returns **True** if it does, **False** otherwise.

Syntax: *object*.**GetFormat**( *Format* )

*Format*
: *required* A member of [**ClipboardConstants**](../../VBRUN/Constants/ClipboardConstants) — the format to probe for.

```tb
If Clipboard.GetFormat(vbCFFiles) Then
    ' The clipboard holds a file list (e.g. from Explorer copy)
End If
```

### GetText
{: .no_toc }

Reads text data from the clipboard. Returns a **String**; returns an empty string if the clipboard does not currently hold data in the requested format.

Syntax: *object*.**GetText**( [ *Format* ] )

*Format*
: *optional* A member of [**ClipboardConstants**](../../VBRUN/Constants/ClipboardConstants) selecting which text format to retrieve: **vbCFText** (default), **vbCFUnicodeText**, **vbCFRTF**, or **vbCFLink**.

```tb
Dim s As String
s = Clipboard.GetText()                  ' plain text
Dim rtf As String
rtf = Clipboard.GetText(vbCFRTF)         ' RTF, if available
```

### SetData
{: .no_toc }

Places picture data onto the clipboard.

Syntax: *object*.**SetData** *Picture* [, *Format* ]

*Picture*
: *required* A **stdole.StdPicture** holding the picture to copy.

*Format*
: *optional* A member of [**ClipboardConstants**](../../VBRUN/Constants/ClipboardConstants) — which picture format to publish. When omitted, the format is inferred from the picture's underlying type.

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### SetText
{: .no_toc }

Places text data onto the clipboard. Note that **SetText** does *not* implicitly clear the clipboard first — call [**Clear**](#clear) explicitly when you want only this one value on the clipboard, so that no stale data of other formats survives.

Syntax: *object*.**SetText** *Str* [, *Format* ]

*Str*
: *required* The **String** to publish.

*Format*
: *optional* A member of [**ClipboardConstants**](../../VBRUN/Constants/ClipboardConstants) — **vbCFText** (default), **vbCFUnicodeText**, **vbCFRTF**, or **vbCFLink**.

```tb
Clipboard.Clear
Clipboard.SetText "Plain text"
Clipboard.SetText "{\rtf1 \b Bold \b0 plain.}", vbCFRTF   ' add an RTF alternative
```
