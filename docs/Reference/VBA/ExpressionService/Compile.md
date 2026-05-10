---
title: Compile
parent: ExpressionService Module
permalink: /tB/Modules/ExpressionService/Compile
---
# Compile
{: .no_toc }

Parses an expression string and returns it as a compiled **ITbExpression**.

Syntax: *service*.**Compile(** *expression* **)**

*service*
: *required* An object expression that evaluates to a **TbExpressionService** object.

*expression*
: *required* A **String** containing a twinBASIC-syntax expression — for example, `"Sqr(2) + 1"` or `"UCase(FirstName) & "" "" & UCase(LastName)"`.

The return value is an [**ITbExpression**](./#itbexpression-interface). Calling [**Evaluate**](Evaluate) on it runs the expression and produces the current value; the same instance can be evaluated as many times as needed.

Symbols referenced in *expression* — function names, object members, properties — are resolved against the binders registered with *service* at the time of the call. At least one binder must be registered before **Compile** is called; the most common starting point is [**AddStdLibraryBinder**](AddStdLibraryBinder), which exposes the standard runtime library.

Compilation is the relatively expensive step; evaluation reuses the compiled form. When a piece of source text is going to drive repeated evaluation — a formula column refreshed every row, a watch expression sampled in a debugger — compile it once and keep the **ITbExpression** around.

If *expression* is malformed, or references a symbol that no registered binder can resolve, **Compile** raises a run-time error.

### Example

```tb
Dim Service As TbExpressionService = New TbExpressionService
Service.AddStdLibraryBinder()

Dim Square As ITbExpression = Service.Compile("Sqr(2)")
Debug.Print Square.Evaluate()    ' 1.4142135623731
Debug.Print Square.Evaluate()    ' Same compiled instance, evaluated again.
```

### See Also

- [Evaluate](Evaluate) method
- [AddStdLibraryBinder](AddStdLibraryBinder) method
- [AddCustomBinderObject](AddCustomBinderObject) method
- [AddCustomBinder](AddCustomBinder) method
