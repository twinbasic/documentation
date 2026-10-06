---
title: ShiftRotateRight
parent: Math Module
permalink: /tB/Modules/Math/ShiftRotateRight
---
# ShiftRotateRight
{: .no_toc }

*(twinBASIC)* Rotates the bits of an integral value right by a given number of positions. The bits shifted out at the low end come back in at the high end.

Syntax: **ShiftRotateRight(** *number*, *shiftamount* **)**

*number*
: *required* An expression of an integral type: **Byte**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency** or **Boolean**. Any other type, a **Variant** included, is compile error **TB5023**, *first argument must be a simple integral type*.

*shiftamount*
: *required* A numeric expression giving the number of bit positions to rotate. It is converted to a **Long**.

The result has the type of *number*. The rotation works on all the bits of that type: 8 for a **Byte**, 16 for an **Integer** or a **Boolean**, 32 for a **Long**, 64 for a **LongLong** or a **Currency**, and 32 or 64 for a **LongPtr**, as the build is 32-bit or 64-bit. A **Currency** is rotated as the 64-bit integer that stores it, which is its value multiplied by 10,000.

The rotation count is taken modulo the number of bits, so rotating a **Long** by 32 gives the value unchanged, and by 33 the same as by 1. A negative *shiftamount* rotates left. No value of *shiftamount* raises an error.

Unlike the [**\>>**](../../Core/RightShift) operator, which discards the bits shifted out, **ShiftRotateRight** loses no bits, and it never copies the sign bit: `&H12345678 >> 4` is `&H1234567`, and `ShiftRotateRight(&H12345678, 4)` is `&H81234567`.

With constant arguments, the call is evaluated when the code is compiled, so it can be used in a [**Const**](../../Core/Const) declaration, an **Enum** member's value or a **Case** expression.

> [!NOTE]
> **ShiftRotateRight** is a twinBASIC extension. VBA and VB6 have no function of this name: a call to it is the compile error *Sub or Function not defined*.

### Example

```tb check_run
Dim Value As Long = &H12345678
Debug.Print Hex(ShiftRotateRight(Value, 4))     ' 81234567
Debug.Print Hex(ShiftRotateRight(Value, -4))    ' 23456781
Debug.Print Hex(Value >> 4)                     ' 1234567
```

### See Also

- [ShiftRotateLeft](ShiftRotateLeft) function
- [ShiftUnsignedRight](ShiftUnsignedRight) function
- [ByteSwap](ByteSwap) function
- [**\>>** operator](../../Core/RightShift)
