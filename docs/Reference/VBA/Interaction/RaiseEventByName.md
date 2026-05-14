---
title: RaiseEventByName
parent: Interaction Module
permalink: /tB/Modules/Interaction/RaiseEventByName
---
# RaiseEventByName
{: .no_toc }

Raises an event by name on an object, with the event arguments supplied as a **Variant** array. **RaiseEventByName** is a twinBASIC addition; the equivalent at compile time is the **RaiseEvent** statement, which requires the event name to be known when the code is written.

Syntax: **RaiseEventByName(** *object* **,** *procname* [ **,** *argsarray* ] **)**

*object*
: *required* **Object**. The object on which to raise the event. The object must declare a public event with the matching *procname* and an arity matching the number of items in *argsarray*.

*procname*
: *required* **String**. The name of the event to raise.

*argsarray*
: *optional* **Variant**. A one-dimensional array containing the arguments to pass to the event handler(s), in declaration order. Pass an uninitialized **Variant** for an event that takes no parameters.

Returns a **Variant**. The returned value is the value left in the last `ByRef` event argument by the handler --- useful only when the event has a `ByRef` "out" or "cancel" parameter.

> [!NOTE]
> The variable-length-argument variant of this function --- [**RaiseEventByName2**](RaiseEventByName2) --- accepts arguments directly via **ParamArray**, which is usually more readable when the event signature is fixed. Use **RaiseEventByName** when the argument list is itself constructed dynamically.

If *procname* doesn't match any event declared on *object*, or the supplied arity doesn't match the event declaration, a run-time error occurs.

### Example

```tb
Dim Args(0) As Variant
Args(0) = "Some argument value"
RaiseEventByName MyControl, "ValueChanged", Args
```

### See Also

- [RaiseEventByName2](RaiseEventByName2) function
- [CallByName](CallByName) function
