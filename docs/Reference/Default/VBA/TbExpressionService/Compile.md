---
title: Compile
parent: TbExpressionService
permalink: /tB/Modules/TbExpressionService/Compile
redirect_from:
  - /tB/Modules/ExpressionService/Compile
---
# Compile
{: .no_toc }

Parses an expression string and returns it as a compiled **ITbExpression**.

Syntax: *service*.**Compile(** *expression* **)**

*service*
: *required* An object expression that evaluates to a **TbExpressionService** object.

*expression*
: *required* A **String** containing a twinBASIC-syntax expression --- for example, `"Sqr(2) + 1"` or `"UCase(FirstName) & "" "" & UCase(LastName)"`.

The return value is an [**ITbExpression**](./#itbexpression-interface). Calling [**Evaluate**](Evaluate) on it runs the expression and produces the current value; the same instance can be evaluated as many times as needed.

Symbols referenced in *expression* --- function names, object members, properties --- are resolved against the binders registered with *service* at the time of the call. Without a binder only an expression that names nothing compiles, such as `"1 + 1"`; the most common starting point is [**AddStdLibraryBinder**](AddStdLibraryBinder), which exposes the standard runtime library.

Compilation is the relatively expensive step; evaluation reuses the compiled form. When a piece of source text will be used for repeated evaluation --- a formula column refreshed every row, a watch expression sampled in a debugger --- compile it once and keep the **ITbExpression** around.

An expression that compiles can still fail when it is evaluated: `"1 / 0"` compiles, and [**Evaluate**](Evaluate) raises the error.

> [!WARNING] BETA 1010
> Some malformed expressions are not refused: the part that cannot be read is left out, and no error is raised. `"2 +"`, `"2 Mod"`, `"(2"` and `"2)"` each compile to an expression whose value is 2.

> [!NOTE] BETA 1010
> In a built program, the first error the expression service raises has the description *Automation error*, and every later one *Unspecified error*. In a run from the IDE, every one has the description *Automation error*.

<!-- errors: generated from errors/VBA.TbExpressionService.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *expression* is a zero-length string or is not an expression<br>*expression* names something that no registered binder resolves (any name, when no binder is registered), or calls a function with the wrong number of arguments |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

```tb check_build
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
