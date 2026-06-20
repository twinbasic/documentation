---
title: StackOffset
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/StackOffset
---
# StackOffset
{: .no_toc }

Returns the stack-frame offset of a variable.

Syntax: **StackOffset(** *Variable* **)** **As Long**

*Variable*
: *required* A local variable, argument, or other stack-resident reference. The value passed is taken **As Any** so the call works for any type.

The result is the offset, in bytes, from the procedure's stack frame base to the storage of *Variable*. Typically used inside a **Naked** procedure to compute addresses for inline assembly emitted with [**Emit**](Emit) or [**EmitAny**](EmitAny). The offset is resolved at compile time and folded in as a numeric constant.

### See Also

- [StackArgsSize](StackArgsSize) function
- [Emit](Emit), [EmitAny](EmitAny) procedures
- [Direct Assembly Insertion](../../../Features/Advanced/Assembly)
