---
title: Read
parent: cRes
permalink: /tB/Packages/Contributed/TBMANLIB_RES/cRes/Read
has_toc: false
---
# Read
{: .no_toc }

Loads a resource from the compiled executable into the **cRes** instance.

Syntax: *object*.**Read**( *id*, *Type* ) **As cRes**

*id*
: *required* A **Variant** identifying the resource to load. Pass a numeric **Long** to identify the resource by its integer ID, or a **String** to identify it by name.

*Type*
: *required* A **Variant** identifying the resource type. Pass a numeric **Long** for a predefined resource type (for example, `2` for `RT_BITMAP`), or a **String** for a named custom resource type (for example, `"CUSTOM"`).

**Read** calls the **LoadResData** function with the supplied *id* and *Type* arguments and stores the resulting byte array internally. The method returns the **cRes** instance itself, so calls to the retrieval methods ([**ReturnBytes**](ReturnBytes), [**ReturnString**](ReturnString), [**ReturnHex**](ReturnHex), [**ReturnBase64**](ReturnBase64), [**ReturnPicture**](ReturnPicture)) can be chained directly onto the **Read** call.

> [!IMPORTANT]
> **Read** must be called before any retrieval method. The resource data is not populated at construction time; a retrieval method called without a prior **Read** will operate on an empty byte array and may raise a runtime error.

> [!NOTE]
> **Read** can load only a resource that is part of the project. *Type* names a folder under **Resources** in the Project Explorer (or is the number of a standard resource type), and *id* identifies a resource in it. If no resource matches, **LoadResData** raises a run-time error.

### Example

This example loads a custom binary resource by name and retrieves it as a byte array, then loads an image resource by integer ID and assigns it to a **PictureBox**.

```tb
Private Sub Form_Load()
    ' Load a named custom resource and retrieve the raw bytes.
    Dim res As New cRes
    res.Read "CONFIG_DATA", "CUSTOM"
    Dim data() As Byte
    data = res.ReturnBytes()

    ' Load an image stored as a PNG resource by integer ID and display it.
    Dim imgRes As New cRes
    Picture1.Picture = imgRes.Read(101, "PNG").ReturnPicture()
End Sub
```

### See Also

- [ReturnBytes](ReturnBytes) method
- [ReturnString](ReturnString) method
- [ReturnHex](ReturnHex) method
- [ReturnBase64](ReturnBase64) method
- [ReturnPicture](ReturnPicture) method
