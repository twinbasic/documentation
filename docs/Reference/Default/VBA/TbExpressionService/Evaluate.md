---
title: Evaluate
parent: TbExpressionService
permalink: /tB/Modules/TbExpressionService/Evaluate
redirect_from:
  - /tB/Modules/ExpressionService/Evaluate
---
# Evaluate
{: .no_toc }

Runs a compiled expression and returns its current value.

Syntax: *expression*.**Evaluate()**

*expression*
: *required* An object expression that evaluates to an [**ITbExpression**](./#itbexpression-interface), typically the value returned by [**Compile**](Compile).

The return value is a **Variant** holding the result of the expression. Its subtype reflects the natural type of the value --- for example, **Double** for a numeric expression, **String** for a text-producing one, **Boolean** for a comparison.

Each call re-runs the expression against the current state of its bindings. If the bound objects expose properties whose values can change between calls --- host application state, the current row of a recordset, configurable parameters --- evaluating the same compiled expression twice may legitimately return different values.

A run-time error raised inside the expression --- division by zero, type mismatch, an invalid call into a bound object --- stops **Evaluate**, which raises an error of its own.

> [!NOTE] BETA 1010
> **Evaluate** raises -2147467259 for any error inside the expression: the error's own number and description are lost. `"1 / 0"` raises -2147467259, not 11, and a **Scripting.Dictionary**'s **Add** of a key it holds raises -2147467259, not 457.

> [!NOTE] BETA 1010
> In a built program, the first error the expression service raises has the description *Automation error*, and every later one *Unspecified error*. In a run from the IDE, every one has the description *Automation error*. An error of a bound object's member has the description *Automation error* in both.

<!-- errors: generated from errors/VBA.TbExpressionService.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | evaluating the expression raises an error, whatever its number: division by zero, a type mismatch, an argument a function refuses<br>the expression calls a member of a bound object that the object does not have, or with the wrong number of arguments |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Automation error* | a member of a bound object that the expression calls raises an error, whatever its number |

<!-- /errors -->

### Example

This example compiles an expression that references a property on the host object via [**AddCustomBinderObject**](AddCustomBinderObject), then evaluates it twice with the property having different values.

```tb check_build
' In the host class:
Public Counter As Long

Public Sub EvaluateTwice()
    Dim Service As TbExpressionService = New TbExpressionService
    Service.AddStdLibraryBinder()
    Service.AddCustomBinderObject "State", Me, IsAppObject

    Dim Expr As ITbExpression = Service.Compile("Counter * 2")

    Me.Counter = 1 : Debug.Print Expr.Evaluate()    ' 2
    Me.Counter = 5 : Debug.Print Expr.Evaluate()    ' 10
End Sub
```

### See Also

- [Compile](Compile) method
- [Bind](Bind) method
