---
title: ReturnString
parent: cRes
permalink: /tB/Packages/Contributed/TBMANLIB_RES/cRes/ReturnString
has_toc: false
---
# ReturnString
{: .no_toc }

Returns the loaded resource bytes as a **String**, with an optional character-set conversion.

Syntax: *object*.**ReturnString** ( [ *Conversion* ] ) **As String**

*Conversion*
: *optional* A **VbStrConv** constant passed to **StrConv** together with the byte array. Defaults to **vbUnicode**, which reads the bytes as text in the default ANSI code page of the system and converts it to a **String**.

**ReturnString** passes the internal byte array held by the **cRes** instance to the **StrConv** function and returns the result. The byte array is the raw data loaded by a prior call to [**Read**](Read).

> [!NOTE] timeless
> The right value for *Conversion* depends on the encoding of the resource data. For ANSI text, use the default **vbUnicode**. For UTF-8 text, pass **vbFromUTF8**. **vbFromUnicode** converts in the opposite direction (a **String** to the ANSI code page), so it does not suit a byte array. **ReturnString** has no option for UTF-16 LE text: assign the array from [**ReturnBytes**](ReturnBytes) to a **String** variable instead. A constant that does not match the encoding of the resource gives the wrong characters.

### Example

This example loads an ANSI text resource by ID, converts it to a **String**, and displays it in a message box.

```tb check_build
Dim r As New cRes
Dim s As String

s = r.Read(101, "TEXT").ReturnString()
' For a UTF-8 text resource: s = r.Read(101, "TEXT").ReturnString(vbFromUTF8)
MsgBox s
```

### See Also

- [Read](Read) method
- [ReturnBytes](ReturnBytes) method
- [ReturnHex](ReturnHex) method
- [ReturnBase64](ReturnBase64) method
