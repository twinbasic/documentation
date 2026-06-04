---
title: RaiseEventByName2
parent: Interaction Module
permalink: /tB/Modules/Interaction/RaiseEventByName2
---
# RaiseEventByName2
{: .no_toc }

Raises an event by name on an object, with the event arguments supplied as a variable-length argument list. **RaiseEventByName2** is a twinBASIC addition; the equivalent at compile time is the **RaiseEvent** statement, which requires the event name to be known when the code is written.

Syntax: **RaiseEventByName2(** *object* **,** *procname* [ **,** *arg1* **,** *arg2* **, ...** ] **)**

*object*
: *required* **Object**. The object on which to raise the event. The object must declare a public event with the matching *procname* and an arity matching the number of arguments supplied.

*procname*
: *required* **String**. The name of the event to raise.

*arg1*, *arg2*, ...
: *optional* **ParamArray** of **Variant**. The arguments to pass to the event handler(s), in declaration order.

Returns a **Variant**. The returned value is the value left in the last `ByRef` event argument by the handler --- useful only when the event has a `ByRef` "out" or "cancel" parameter.

> [!NOTE]
> The array-based variant of this function --- [**RaiseEventByName**](RaiseEventByName) --- takes the argument list as a single packed **Variant** array, which is more convenient when the argument list is itself constructed dynamically. Use **RaiseEventByName2** when the argument list is fixed at the call site.

If *procname* doesn't match any event declared on *object*, or the supplied arity doesn't match the event declaration, a run-time error occurs.

### Example

```tb
RaiseEventByName2 MyControl, "ValueChanged", "First argument", 123, True
```

### See Also

- [RaiseEventByName](RaiseEventByName) function
- [CallByName](CallByName) function
