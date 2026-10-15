---
title: ReturnBytes
parent: cRes
permalink: /tB/Packages/Contributed/TBMANLIB_RES/cRes/ReturnBytes
has_toc: false
---
# ReturnBytes
{: .no_toc }

Returns the raw byte array loaded from the resource file.

Syntax: *object*.**ReturnBytes**() **As Byte()**

<!-- test: ReturnBytesTests.ReturnBytes_ReturnsEveryByte, ReturnBytesTests.ReturnBytes_BeforeRead_HasNoElements -->
Returns a **Byte()** containing every byte of the resource data loaded by the preceding [**Read**](Read) call. If **Read** has not been called, the returned array is unallocated and has no elements.
<!-- /test -->


### Remarks

**ReturnBytes** is the lowest-level retrieval method on **cRes**. The other retrieval methods---[**ReturnString**](ReturnString), [**ReturnHex**](ReturnHex), [**ReturnBase64**](ReturnBase64), and [**ReturnPicture**](ReturnPicture)---all derive their output from the same internal byte array that **ReturnBytes** exposes directly.

<!-- test: ReturnBytesTests.ReturnBytes_IsACopy -->
The returned array is a copy of the internal storage; modifying it does not affect the **cRes** instance.
<!-- /test -->


### Example

This example loads a binary resource and writes it to a file.

```tb check_build
Dim res As New cRes
res.Read "MyData", "BINARY"

Dim b() As Byte
b = res.ReturnBytes()

Dim fileNum As Integer
fileNum = FreeFile()
Open "C:\output\data.bin" For Binary Access Write As #fileNum
Put #fileNum, , b
Close #fileNum
```

### See Also

- [Read](Read) method
- [ReturnString](ReturnString) method
- [ReturnHex](ReturnHex) method
- [ReturnBase64](ReturnBase64) method
- [ReturnPicture](ReturnPicture) method
