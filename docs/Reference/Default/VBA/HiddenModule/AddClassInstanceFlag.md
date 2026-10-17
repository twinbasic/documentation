---
title: AddClassInstanceFlag
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/AddClassInstanceFlag
---
# AddClassInstanceFlag, RemoveClassInstanceFlag, InternalGetReturnAddress
{: .no_toc }

Set and clear a flag on a class instance, and read the return address of the calling procedure.

These three procedures are declared **Hidden** and **Restricted**, so IntelliSense lists leave them out. They exist for twinBASIC's own packages, which call them; ordinary code does not need them.

## AddClassInstanceFlag

Sets a flag on an object.

Syntax: **AddClassInstanceFlag** *ClassInstance*, *Flag*

*ClassInstance*
: *required* An **Object**. The instance to change. A **Nothing** reference is ignored without an error.

*Flag*
: *required* **Long**. The flag to set.

The one flag the packages use is 2048, which switches off the dispatch of the instance's event interfaces. The **VB** package's ActiveX control host sets it while a control's events are frozen (the host has called **IOleControl::FreezeEvents** with 1). Events that a twinBASIC class raises to a **WithEvents** handler are still delivered after the flag is set.

```tb check_build
Const DispatchInvokeEventsDisabled As Long = 2048
Dim Events As New Collection
AddClassInstanceFlag Events, DispatchInvokeEventsDisabled
RemoveClassInstanceFlag Events, DispatchInvokeEventsDisabled
```

## RemoveClassInstanceFlag

Clears a flag on an object.

Syntax: **RemoveClassInstanceFlag** *ClassInstance*, *Flag*

*ClassInstance*
: *required* An **Object**. The instance to change. A **Nothing** reference is ignored without an error.

*Flag*
: *required* **Long**. The flag to clear.

The **VB** package's ActiveX control host clears flag 2048 when the control's events are no longer frozen (**IOleControl::FreezeEvents** with 0).

## InternalGetReturnAddress

Returns the return address of the procedure that calls it.

Syntax: **InternalGetReturnAddress()** **As LongPtr**

The function is provided for code generated in debug mode. It uses special internal bindings, so it may not behave like a regular function. In a 32-bit build compiled without LLVM it returns a non-zero address, in an IDE run and in a built exe alike. In code compiled with LLVM it returns 0.

> [!NOTE] BETA 1010
> A procedure that calls **InternalGetReturnAddress** fails code generation in a 64-bit build, with or without LLVM, and the project does not build.

### See Also

- [StackOffset](StackOffset), [StackArgsSize](StackArgsSize) functions
- [GetNameFromDispID](GetNameFromDispID) function
