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

> [!NOTE] BETA 1010
> When the member called raises an error itself with a constant number, as in `Err.Raise 380`, or with the [**Error**](../../Core/Error) statement, **CallByName** raises error -2147352567 (`&H80020009`), *Exception occurred.*, not that number. VB6 raises the member's own number. A number the member passes in a variable, as in `Err.Raise Number`, and a run-time error such as a division by zero arrive unchanged.

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [438 (`&H1B6`)](tb:Errors#438), *Object doesn't support this property or method* | *object* has no member named *procname*, or none of the kind *calltype* names<br>*procname* is a zero-length string |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *calltype* is not one of the **VbCallType** values (3, **vbMethod** + **vbGet**, is accepted)<br>*object* is **Nothing** |
| [-2147352562 (`&H8002000E`)](tb:Errors#-2147352562), *Invalid number of parameters.* | the number of *args* is not the number the member takes, or a read-only property is assigned |
| [-2147352559 (`&H80020011`)](tb:Errors#-2147352559), *Does not support a collection.* | *args* are given to a property that takes none |
| [-2147352567 (`&H80020009`)](tb:Errors#-2147352567), *Exception occurred.* | the member raises an error of its own, such as **Add** of a **Dictionary** given a key it holds<br>the member raises an error of its own, such as a **Dictionary**'s **CompareMode** set when it has items |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *procname* or *calltype* is **Null** |

> [!NOTE] BETA 1010
> When *procname* is a zero-length string, VB6 and 64-bit VBA raise error [450 (`&H1C2`)](tb:Errors#450), *Wrong number of arguments or invalid property assignment*, instead.

> [!NOTE] BETA 1010
> When *calltype* is not one of the **VbCallType** values (3, **vbMethod** + **vbGet**, is accepted), VB6 and 64-bit VBA raise error [438 (`&H1B6`)](tb:Errors#438), *Object doesn't support this property or method*, instead.

> [!NOTE] BETA 1010
> When *object* is **Nothing**, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When the number of *args* is not the number the member takes, or a read-only property is assigned, VB6 and 64-bit VBA raise error [450 (`&H1C2`)](tb:Errors#450), *Wrong number of arguments or invalid property assignment*, instead.

> [!NOTE] BETA 1010
> When *args* are given to a property that takes none, VB6 and 64-bit VBA raise error [451 (`&H1C3`)](tb:Errors#451), *Property let procedure not defined and property get procedure did not return an object*, instead.

> [!NOTE] BETA 1010
> When the member raises an error of its own, such as **Add** of a **Dictionary** given a key it holds, VB6 and 64-bit VBA raise error [457 (`&H1C9`)](tb:Errors#457), *This key is already associated with an element of this collection*, instead.

> [!NOTE] BETA 1010
> When the member raises an error of its own, such as a **Dictionary**'s **CompareMode** set when it has items, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

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
