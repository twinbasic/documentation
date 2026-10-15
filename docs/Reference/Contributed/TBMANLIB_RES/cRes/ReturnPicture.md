---
title: ReturnPicture
parent: cRes
permalink: /tB/Packages/Contributed/TBMANLIB_RES/cRes/ReturnPicture
has_toc: false
---
# ReturnPicture
{: .no_toc }

Returns the loaded resource bytes as an **IPictureDisp** object.

Syntax: *object*.**ReturnPicture**() **As IPictureDisp**

<!-- test: ReturnPictureTests.ReturnPicture_Bmp_ReturnsABitmapPicture, ReturnPictureTests.ReturnPicture_Png_ReturnsABitmapPicture, ReturnPictureTests.ReturnPicture_Gif_ReturnsABitmapPicture, ReturnPictureTests.ReturnPicture_NotAnImage_RaisesError -->
**ReturnPicture** passes the raw bytes stored by the preceding [**Read**](Read) call to **Global.LoadPicture**, the twinBASIC form of **LoadPicture** that accepts a byte array. **LoadPicture** interprets the bytes as an image and returns an **IPictureDisp** COM object. The returned picture can be assigned directly to the **Picture** property of any standard VB control that accepts one (such as **PictureBox** or **Image**). If the bytes are not an image that **LoadPicture** supports, **ReturnPicture** raises a run-time error.
<!-- /test -->

<!-- test: ReturnPictureTests.ReturnPicture_BeforeRead_RaisesError -->
> [!IMPORTANT] timeless
> [**Read**](Read) must be called before **ReturnPicture**. An instance on which **Read** has not been called holds no image data for **LoadPicture** to read.
<!-- /test -->

### Example

This example loads a PNG image embedded as a custom resource and assigns it to a **PictureBox** control.

```tb check_build
Private Sub Form_Load()
    Dim res As New cRes
    res.Read "MY_IMAGE", "CUSTOM"
    Picture1.Picture = res.ReturnPicture()
End Sub
```

### See Also

- [Read](Read) method
- [ReturnBytes](ReturnBytes) method
- [ReturnBase64](ReturnBase64) method
