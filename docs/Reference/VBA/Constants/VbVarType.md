---
title: VbVarType
parent: Constants Module
permalink: /tB/Modules/Constants/VbVarType
redirect_from:
- /tB/Core/VbVarType
- /tB/Core/vbEmpty
- /tB/Core/vbNull
- /tB/Core/vbInteger
- /tB/Core/vbLong
- /tB/Core/vbSingle
- /tB/Core/vbDouble
- /tB/Core/vbCurrency
- /tB/Core/vbDate
- /tB/Core/vbString
- /tB/Core/vbObject
- /tB/Core/vbError
- /tB/Core/vbBoolean
- /tB/Core/vbVariant
- /tB/Core/vbDataObject
- /tB/Core/vbDecimal
- /tB/Core/vbByte
- /tB/Core/vbLongLong
- /tB/Core/vbUserDefinedType
- /tB/Core/vbArray
vba_attribution: true
---
# VbVarType
{: .no_toc }

Variant subtype codes returned by the **VarType** function. Most calls return a single value from the table below. Arrays are reported as **vbArray** added to the element subtype --- for example, an array of **Long** returns `vbArray + vbLong` = 8195.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbEmpty**{: #vbEmpty } | 0 | Empty (uninitialized). |
| **vbNull**{: #vbNull } | 1 | **Null** (no valid data). |
| **vbInteger**{: #vbInteger } | 2 | **Integer**. |
| **vbLong**{: #vbLong } | 3 | **Long** integer. |
| **vbSingle**{: #vbSingle } | 4 | Single-precision floating-point number. |
| **vbDouble**{: #vbDouble } | 5 | Double-precision floating-point number. |
| **vbCurrency**{: #vbCurrency } | 6 | **Currency** value. |
| **vbDate**{: #vbDate } | 7 | **Date** value. |
| **vbString**{: #vbString } | 8 | **String**. |
| **vbObject**{: #vbObject } | 9 | Object reference. |
| **vbError**{: #vbError } | 10 | Error value. |
| **vbBoolean**{: #vbBoolean } | 11 | **Boolean** value. |
| **vbVariant**{: #vbVariant } | 12 | **Variant** (used only with arrays of variants). |
| **vbDataObject**{: #vbDataObject } | 13 | A data access object. |
| **vbDecimal**{: #vbDecimal } | 14 | **Decimal** value. |
| **vbByte**{: #vbByte } | 17 | **Byte** value. |
| **vbLongLong**{: #vbLongLong } | 20 | **LongLong** integer (64-bit only). |
| **vbUserDefinedType**{: #vbUserDefinedType } | 36 | **Variant** containing a user-defined type. |
| **vbArray**{: #vbArray } | 8192 | Array. Always added to another value when returned. |
