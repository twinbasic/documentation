---
title: ShiftRotateLeft
parent: Math Module
permalink: /tB/Modules/Math/ShiftRotateLeft
---
# ShiftRotateLeft
{: .no_toc }

*(twinBASIC)* Rotates the bits of an integral value left by a given number of positions. The bits shifted out at the high end come back in at the low end.

Syntax: **ShiftRotateLeft(** *number*, *shiftamount* **)**

*number*
: *required* An expression of an integral type: **Byte**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency** or **Boolean**. Any other type, a **Variant** included, is compile error **TB5023**, *first argument must be a simple integral type*.

*shiftamount*
: *required* A numeric expression giving the number of bit positions to rotate. It is converted to a **Long**.

The result has the type of *number*. The rotation works on all the bits of that type: 8 for a **Byte**, 16 for an **Integer** or a **Boolean**, 32 for a **Long**, 64 for a **LongLong** or a **Currency**, and 32 or 64 for a **LongPtr**, as the build is 32-bit or 64-bit. A **Currency** is rotated as the 64-bit integer that stores it, which is its value multiplied by 10,000.

The rotation count is taken modulo the number of bits, so rotating a **Long** by 32 gives the value unchanged, and by 33 the same as by 1. A negative *shiftamount* rotates right: rotating a **Long** left by -1 is the same as rotating it left by 31. No value of *shiftamount* raises an error.

Unlike the [**\<<**](../../Core/LeftShift) operator, which discards the bits shifted out and fills with zeros, **ShiftRotateLeft** loses no bits: `&H12345678 << 4` is `&H23456780`, and `ShiftRotateLeft(&H12345678, 4)` is `&H23456781`.

With constant arguments, the call is evaluated when the code is compiled, so it can be used in a [**Const**](../../Core/Const) declaration, an **Enum** member's value or a **Case** expression.

> [!WARNING]
> In twinBASIC BETA 1005, **ShiftRotateLeft** ignores the names of named arguments and takes its arguments in the order they are written: `ShiftRotateLeft(ShiftAmount:=4, Number:=&H12345678)` rotates 4 left by `&H12345678` bits, and gives the **Integer** `&H400`. Write the arguments by position, *number* first.

> [!NOTE]
> **ShiftRotateLeft** is a twinBASIC extension. VBA and VB6 have no function of this name: a call to it is the compile error *Sub or Function not defined*.

### Example

```tb check_run
Dim Value As Long = &H12345678
Debug.Print Hex(ShiftRotateLeft(Value, 4))      ' 23456781
Debug.Print Hex(ShiftRotateLeft(Value, 36))     ' 23456781
Debug.Print Hex(Value << 4)                     ' 23456780

Dim Flags As Byte = &H81
Debug.Print Hex(ShiftRotateLeft(Flags, 1))      ' 3
```

### See Also

- [ShiftRotateRight](ShiftRotateRight) function
- [ShiftUnsignedRight](ShiftUnsignedRight) function
- [ByteSwap](ByteSwap) function
- [**\<<** operator](../../Core/LeftShift)
