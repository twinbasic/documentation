---
title: EmitAny
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/EmitAny
---
# EmitAny
{: .no_toc }

Splices typed literal values into the codegen output of the enclosing procedure. The size of the output is inferred from each value's data type.

Syntax: **EmitAny** *Values* ...

*Values*
: *required* A **ParamArray** of typed literals. Each value contributes its in-memory representation — one byte for **Byte**, two for **Integer**, four for **Long** or **Single**, eight for **Currency**, **Double**, or **LongLong**, and pointer-sized for **LongPtr**.

The values are written into the procedure's machine code at the spot where **EmitAny** appears. Useful when an instruction's operand mixes opcodes and a multi-byte immediate — letting **EmitAny** size the immediate correctly avoids splitting it into a sequence of [**Emit**](Emit) calls.

### Example

```tb
' mov eax, 0x12345678  — emit the opcode + a 32-bit immediate.
EmitAny(CByte(&HB8), CLng(&H12345678))
```

### See Also

- [Emit](Emit) procedure
- [Direct Assembly Insertion](../../../Features/Advanced/Assembly)
