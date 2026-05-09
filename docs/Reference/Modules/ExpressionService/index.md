---
title: ExpressionService Module
parent: VBA Modules
permalink: /tB/Modules/ExpressionService/
has_toc: false
---

# ExpressionService module

The **ExpressionService** module provides a runtime expression engine: a way to take twinBASIC-syntax expressions supplied as ordinary strings and compile and evaluate them on the fly, without going through a separate build step. It powers calculators, formula columns in reports, scriptable property bindings, and any other feature that needs to turn user-supplied text into a value.

The module exposes one class and two interfaces:

- [**TbExpressionService**](#tbexpressionservice-class) — the engine; instantiate one with **New**, register its binders, then [**Compile**](Compile) expressions against it.
- [**ITbExpression**](#itbexpression-interface) — a compiled expression handle returned by [**Compile**](Compile), evaluated with [**Evaluate**](Evaluate).
- [**ITbCustomBinder**](#itbcustombinder-interface) — implement this to provide fully custom symbol resolution.

## Compiling and evaluating an expression

Create a **TbExpressionService**, register at least one binder, then call [**Compile**](Compile) to get back an [**ITbExpression**](#itbexpression-interface). The same compiled expression can be evaluated as many times as needed, so reuse it whenever the source text doesn't change.

```tb
Sub Demo()
    Dim Service As TbExpressionService = New TbExpressionService
    Service.AddStdLibraryBinder()                       ' enable Sin, Sqr, Len, ...

    Dim Expr As ITbExpression = Service.Compile("2 * (Sqr(2) + 1)")
    Debug.Print Expr.Evaluate()                         ' 4.82842712474619
End Sub
```

## Binding to your own objects

Anything beyond the standard library — application objects, configuration values, helper functions, recordset fields — has to be made visible to the engine through a *binder*.

The simplest form is [**AddCustomBinderObject**](AddCustomBinderObject), which takes a name and an object and exposes the object's public members under that name. Pass the **IsAppObject** flag to make the object behave like an Office host's **Application**: its members become reachable both qualified (`Report.Title`) and unqualified (`Title`).

```tb
Sub UseCustomObject()
    Dim Service As TbExpressionService = New TbExpressionService
    Service.AddStdLibraryBinder()
    Service.AddCustomBinderObject "Report", Me, IsAppObject

    Debug.Print Service.Compile("Report.Title").Evaluate()  ' qualified
    Debug.Print Service.Compile("Title").Evaluate()         ' unqualified — IsAppObject in effect
End Sub
```

For full control over symbol resolution — for example, to look up names dynamically against a recordset, virtualize a name into something other than a member access, or fall through to a custom default — implement [**ITbCustomBinder**](#itbcustombinder-interface) and register it with [**AddCustomBinder**](AddCustomBinder). Multiple binders can coexist; the engine consults them in registration order until one returns a non-**Nothing** result.

## TbExpressionService class

`New TbExpressionService` returns the default interface, **ITbExpressionService**. Multiple services can coexist; each carries its own list of binders and is independent of the others.

### Members

- [Compile](Compile) -- parses an expression string and returns it as an executable **ITbExpression**
- [AddStdLibraryBinder](AddStdLibraryBinder) -- registers the built-in binder for the standard runtime library (**Sin**, **Sqr**, **Len**, **CStr**, ...)
- [AddCustomBinderObject](AddCustomBinderObject) -- exposes a live object's members under a chosen name, optionally as an unqualified application object
- [AddCustomBinder](AddCustomBinder) -- registers a user-supplied [**ITbCustomBinder**](#itbcustombinder-interface) implementation

### ExpressionEngineBinderFlags

Flags accepted by [**AddCustomBinderObject**](AddCustomBinderObject):

| Constant | Value | Description |
|----------|-------|-------------|
| **IsAppObject**{: #IsAppObject } | 1 | Members of the bound object are reachable without the qualifying name, the way an Office host's **Application** members are. |

## ITbExpression interface

A handle to a compiled expression. Returned by [**Compile**](Compile) and by an [**ITbCustomBinder.Bind**](Bind) implementation. Calling [**Evaluate**](Evaluate) runs the expression against the current state of its bindings and returns the result; the same instance can be evaluated as many times as needed.

### Members

- [Evaluate](Evaluate) -- runs the compiled expression and returns its result

## ITbCustomBinder interface

Implement this interface to register a fully custom resolver with [**AddCustomBinder**](AddCustomBinder). The engine calls [**Bind**](Bind) during compilation for each unresolved symbol it encounters in the expression source, supplying the symbol name and the number of arguments at the call site, and expects an **ITbExpression** that produces the value when **Evaluate** is called — or **Nothing** to defer to the next binder.

### Members

- [Bind](Bind) -- resolves a symbol reference to an **ITbExpression**, or returns **Nothing** to defer to the next binder
