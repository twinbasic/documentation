---
title: ShiftUnsignedRight
parent: Math Module
permalink: /tB/Modules/Math/ShiftUnsignedRight
---
# ShiftUnsignedRight
{: .no_toc }

*(twinBASIC)* Shifts the bits of an integral value right by a given number of positions, filling the vacated high-order bits with zeros.

Syntax: **ShiftUnsignedRight(** *number*, *shiftamount* **)**

*number*
: *required* An expression of an integral type: **Byte**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency** or **Boolean**. Any other type, a **Variant** included, is compile error **TB5023**, *first argument must be a simple integral type*.

*shiftamount*
: *required* A numeric expression giving the number of bit positions to shift. It is converted to a **Long**.

The result has the type of *number*. **ShiftUnsignedRight** treats *number* as unsigned: the vacated high-order bits are always zero, so a negative value becomes a positive one. This is a *logical* shift. The [**\>>**](../../Core/RightShift) operator makes an *arithmetic* shift instead, copying the sign bit into the vacated bits, so for a negative **Integer**, **Long**, **LongLong** or **LongPtr** the two differ: a **Long** holding `&H80000001`, shifted right by 1, is `&HC0000000` with **\>>** and `&H40000000` with **ShiftUnsignedRight**. For a value that is not negative, and for a **Byte**, they give the same result.

A **Currency** is shifted as the 64-bit integer that stores it, which is its value multiplied by 10,000. A **LongPtr** has 32 or 64 bits, as the build is 32-bit or 64-bit.

A shift by as many bits as the type holds, or more, gives 0. A negative *shiftamount* raises no error, but gives no useful result.

With constant arguments, the call is evaluated when the code is compiled, so it can be used in a [**Const**](../../Core/Const) declaration, an **Enum** member's value or a **Case** expression.

> [!WARNING]
> In twinBASIC BETA 1005, **ShiftUnsignedRight** ignores the names of named arguments and takes its arguments in the order they are written: `ShiftUnsignedRight(ShiftAmount:=4, Number:=&H12345678)` shifts 4 right by `&H12345678` bits, and gives 0. Write the arguments by position, *number* first.

> [!NOTE]
> **ShiftUnsignedRight** is a twinBASIC extension. VBA and VB6 have no function of this name: a call to it is the compile error *Sub or Function not defined*.

### Example

```tb check_run
Dim Value As Long = &H80000001
Debug.Print Hex(ShiftUnsignedRight(Value, 1))   ' 40000000
Debug.Print Hex(Value >> 1)                     ' C0000000
Debug.Print ShiftUnsignedRight(Value, 32)       ' 0
```

### See Also

- [ShiftRotateRight](ShiftRotateRight) function
- [ShiftRotateLeft](ShiftRotateLeft) function
- [ByteSwap](ByteSwap) function
- [**\>>** operator](../../Core/RightShift)
