---
title: CType
parent: Conversion Module
permalink: /tB/Modules/Conversion/CType
redirect_from:
-  /tB/Core/CType
---
# CType
{: .no_toc }

Performs an explicit type conversion to a type chosen by the caller.

Syntax: **CType(Of** *type* **)** **(** *value* **)**

*type*
: *required* The type to convert *value* to. Any type known to the compiler is accepted, including built-in types, **Enum** types, classes, interfaces, and user-defined types.

*value*
: *required* The expression being converted.

The return type matches *type*.

> [!NOTE]
> **CType** is a twinBASIC extension; VBA has no equivalent.

**CType** has two roles:

1. **As an explicit cast**, used wherever an implicit conversion would either be disallowed or produce a compiler warning. It conveys the same intent as [**CInt**](CInt), [**CLng**](CLng), and the rest of the C-prefix functions, but for any target type --- most usefully when the target is an **Enum** or an interface. For example, assigning a numeric literal or another **Enum** member to an **Enum**-typed variable triggers a compiler warning that **CType** silences:

   ```tb
   Dim day As VbDayOfWeek
   day = CType(Of VbDayOfWeek)(1)
   ```

2. **As a pointer-to-UDT cast**, used to view the memory pointed to by a **LongPtr** as a particular user-defined type without copying it. See [Enhanced Pointer Functionality](../../../Features/Language/Pointers#ctypeof-type) for the canonical examples.

In both roles **CType** is an operator-like form recognized by the compiler; it isn't called like a regular function and the unparameterized name `CType` cannot be assigned to a function reference.

### See Also

- [Enhanced Pointer Functionality](../../../Features/Language/Pointers#ctypeof-type)
- [Generics](../../../Features/Language/Generics)
- [Compiler Warnings](../../../Features/Compiler-IDE/Compiler-Warnings)
- [CBool](CBool), [CByte](CByte), [CInt](CInt), [CLng](CLng), [CDbl](CDbl), [CStr](CStr), [CVar](CVar) functions
