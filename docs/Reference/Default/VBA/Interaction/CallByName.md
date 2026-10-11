---
title: CallByName
parent: Interaction Module
permalink: /tB/Modules/Interaction/CallByName
redirect_from:
-  /tB/Core/CallByName
vba_attribution: true
---
# CallByName
{: .no_toc }

Calls a method, or reads or writes a property, on an object --- looked up by name at run time.

Syntax: **CallByName(** *object* **,** *procname* **,** *calltype* [ **,** *args* ... ] **)**

*object*
: *required* **Object**. The object whose member is to be invoked.

*procname*
: *required* **String**. The name of the method or property to invoke on *object*.

*calltype*
: *required* A [**VbCallType**](../Constants/VbCallType) value indicating the kind of member: `vbMethod`, `vbGet`, `vbLet`, or `vbSet`.

*args*
: *optional* The arguments to pass to the method, **Property Get**, **Property Let**, or **Property Set**.

The return value is a **Variant** containing whatever the call returned. For methods that return nothing, or for property assignments, the result is **Empty**.

> [!NOTE]
> In BETA 1005, when the member called raises an error itself with a constant number, as in `Err.Raise 380`, or with the [**Error**](../../Core/Error) statement, **CallByName** raises error -2147352567 (`&H80020009`), *Exception occurred.*, not that number. VB6 raises the member's own number. A number the member passes in a variable, as in `Err.Raise Number`, and a run-time error such as a division by zero arrive unchanged.

### Example

These three calls use **CallByName** to operate on a control by name. The first sets its **MousePointer** property to the crosshair cursor, the second reads the same property back out, and the third invokes the **Move** method to reposition the control.

```tb check_build
Dim Result As Variant
CallByName Text1, "MousePointer", vbLet, vbCrosshair
Result = CallByName(Text1, "MousePointer", vbGet)
CallByName Text1, "Move", vbMethod, 100, 100
```

### See Also

- [CallByDispId](CallByDispId) function
- [VbCallType](../Constants/VbCallType) enumeration
