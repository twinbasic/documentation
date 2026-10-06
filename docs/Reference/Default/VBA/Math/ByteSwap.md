---
title: ByteSwap
parent: Math Module
permalink: /tB/Modules/Math/ByteSwap
---
# ByteSwap
{: .no_toc }

*(twinBASIC)* Reverses the order of the bytes in an integral value.

Syntax: **ByteSwap(** *number* **)**

*number*
: *required* An expression of an integral type of two bytes or more: **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency** or **Boolean**. A **Byte** is compile error **TB5023**, *argument must be of a size >= 2 bytes*, and any other type, a **Variant** included, is **TB5023**, *argument must be a simple integral type*.

The result has the type of *number*, with its first byte last and its last byte first: **ByteSwap** of the **Long** `&H12345678` is `&H78563412`. It converts a value between little-endian order, which Windows uses, and big-endian order, which many file formats and network protocols use. Applying it twice gives the original value.

A **Currency** is swapped as the 64-bit integer that stores it, which is its value multiplied by 10,000. A **LongPtr** has 4 or 8 bytes, as the build is 32-bit or 64-bit.

With a constant argument, the call is evaluated when the code is compiled, so it can be used in a [**Const**](../../Core/Const) declaration, an **Enum** member's value or a **Case** expression.

> [!NOTE]
> **ByteSwap** is a twinBASIC extension. VBA and VB6 have no function of this name: a call to it is the compile error *Sub or Function not defined*.

### Example

```tb check_run
Dim Small As Integer = &H1234
Debug.Print Hex(ByteSwap(Small))                ' 3412

Dim Value As Long = &H12345678
Debug.Print Hex(ByteSwap(Value))                ' 78563412
Debug.Print Hex(ByteSwap(ByteSwap(Value)))      ' 12345678
```

### See Also

- [ShiftRotateLeft](ShiftRotateLeft) function
- [ShiftRotateRight](ShiftRotateRight) function
- [ShiftUnsignedRight](ShiftUnsignedRight) function
