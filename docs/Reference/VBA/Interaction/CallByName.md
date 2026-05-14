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

Calls a method, or reads or writes a property, on an object — looked up by name at run time.

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

### Example

These three calls use **CallByName** to operate on a control by name. The first sets its **MousePointer** property to the crosshair cursor, the second reads the same property back out, and the third invokes the **Move** method to reposition the control.

```tb
CallByName Text1, "MousePointer", vbLet, vbCrosshair
Result = CallByName(Text1, "MousePointer", vbGet)
CallByName Text1, "Move", vbMethod, 100, 100
```

### See Also

- [CallByDispId](CallByDispId) function
- [VbCallType](../Constants/VbCallType) enumeration
