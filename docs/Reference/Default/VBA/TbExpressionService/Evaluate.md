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

A run-time error raised inside the expression --- division by zero, type mismatch, an invalid call into a bound object --- propagates out of **Evaluate** like any other run-time error.

### Example

This example compiles an expression that references a property on the host object via [**AddCustomBinderObject**](AddCustomBinderObject), then evaluates it twice with the property having different values.

```tb
Dim Service As TbExpressionService = New TbExpressionService
Service.AddStdLibraryBinder()
Service.AddCustomBinderObject "State", Me, IsAppObject

Dim Expr As ITbExpression = Service.Compile("Counter * 2")

Me.Counter = 1 : Debug.Print Expr.Evaluate()    ' 2
Me.Counter = 5 : Debug.Print Expr.Evaluate()    ' 10
```

### See Also

- [Compile](Compile) method
- [Bind](Bind) method
