---
title: GpEncoderParameterValueType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpEncoderParameterValueType
---

# GpEncoderParameterValueType enumeration
{: .no_toc }

Specifies the data types of the parameters of an image codec (an encoder or a decoder).

A value of this enumeration is the **Type** of a parameter of a codec. The last two members are not types: they give the lowest and the highest valid value.

| Member | Value | Description |
|:-------|:------|:------------|
| **EncoderParameterValueTypeByte**{: #EncoderParameterValueTypeByte } | `1` | An 8-bit unsigned integer. |
| **EncoderParameterValueTypeASCII**{: #EncoderParameterValueTypeASCII } | `2` | An 8-bit byte that holds one 7-bit ASCII code. The string ends with a null. |
| **EncoderParameterValueTypeShort**{: #EncoderParameterValueTypeShort } | `3` | A 16-bit unsigned integer. |
| **EncoderParameterValueTypeLong**{: #EncoderParameterValueTypeLong } | `4` | A 32-bit unsigned integer. |
| **EncoderParameterValueTypeRational**{: #EncoderParameterValueTypeRational } | `5` | Two longs. The first is the numerator and the second is the denominator. |
| **EncoderParameterValueTypeLongRange**{: #EncoderParameterValueTypeLongRange } | `6` | Two longs that give a range of integers. The first is the lower end and the second is the upper end. Both ends are included. |
| **EncoderParameterValueTypeUndefined**{: #EncoderParameterValueTypeUndefined } | `7` | An 8-bit byte that can have any value, depending on the definition of the field. |
| **EncoderParameterValueTypeRationalRange**{: #EncoderParameterValueTypeRationalRange } | `8` | Two rationals. The first is the lower end of a range and the second is the upper end. Both ends are included. |
| **EncoderParameterValueTypePointer**{: #EncoderParameterValueTypePointer } | `9` | A pointer to data that the parameter defines. |
| **MinEncoderParameterValueType**{: #MinEncoderParameterValueType } | `0` | The lowest valid value of the enumeration. |
| **MaxEncoderParameterValueType**{: #MaxEncoderParameterValueType } | `9` | The highest valid value of the enumeration, same as **EncoderParameterValueTypePointer**. |

## Used by

- [**GpEncoderParameter**](../Types/GpEncoderParameter) type: **Type**, **type**

## See Also

- [EncoderParameterValueType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-encoderparametervaluetype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
