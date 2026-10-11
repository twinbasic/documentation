---
title: ReturnBase64
parent: cRes
permalink: /tB/Packages/Contributed/TBMANLIB_RES/cRes/ReturnBase64
has_toc: false
---
# ReturnBase64
{: .no_toc }

Returns the resource bytes as a Base64-encoded string, with an optional MIME-type data-URI prefix.

Syntax: *object*.**ReturnBase64** ( [ *Prefix* ] ) **As String**

*Prefix*
: *optional* A **Base64Prefix** enumeration value that selects a data-URI prefix to prepend to the encoded string. Defaults to **Base64Prefix_None**, which returns the raw Base64 string with no prefix.

**ReturnBase64** encodes the byte array held by the **cRes** instance using MSXML2's `bin.base64` data type and returns the result as a **String**. MSXML puts a line feed (`vbLf`) after every 72 characters of Base64, and **ReturnBase64** does not remove them. When *Prefix* is any value other than **Base64Prefix_None**, the corresponding `data:<type>;base64,` header is prepended, producing a data URI that can be used in an `<img src>`, `<video src>`, or `<audio src>` attribute in an HTML context.

The following **Base64Prefix** values are defined:

| Value | Prepended prefix |
|-------|-----------------|
| **Base64Prefix_None** | *(none --- raw Base64)* |
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

> [!IMPORTANT]
> **ReturnBase64** requires that MSXML2 is registered on the machine. It creates an `MSXML2.DOMDocument` COM object internally. This call will fail at run time on systems where MSXML2 is not available.

> [!NOTE]
> Call [**Read**](Read) before **ReturnBase64**. The method encodes whatever bytes are currently stored in the instance, and an instance on which **Read** has not been called holds none.

### Example

This example loads a PNG image from the resource file and shows it in a WebView2 control through a data URI in an `img` element.

```tb
Private Sub Form_Load()
    Dim Res As New cRes
    Res.Read 101, "PNG"

    Dim DataURI As String
    DataURI = Res.ReturnBase64(Base64Prefix_ImagePNG)

    ' DataURI starts with "data:image/png;base64,iVBOR..."
    WebView21.NavigateToString "<img src=""" & DataURI & """>"
End Sub
```

### See Also

- [Read](Read) method
- [ReturnBytes](ReturnBytes) method
- [ReturnString](ReturnString) method
- [ReturnHex](ReturnHex) method
- [ReturnPicture](ReturnPicture) method
