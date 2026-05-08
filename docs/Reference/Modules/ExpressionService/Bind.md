---
title: Bind
parent: ExpressionService Module
permalink: /tB/Modules/ExpressionService/Bind
---
# Bind
{: .no_toc }

Resolves a symbol referenced in an expression to an [**ITbExpression**](./#itbexpression-interface) that produces its value.

Syntax: *binder*.**Bind(** *symbol*, *argCount* **)**

*binder*
: *required* An object expression that evaluates to an [**ITbCustomBinder**](./#itbcustombinder-interface) object.

*symbol*
: *required* A **String** containing the name being looked up — the identifier as it appears in the source of the expression being compiled.

*argCount*
: *required* A **Long** giving the number of arguments at the call site, or `0` if *symbol* is referenced as a bare value (a property-style access).

The return value is an [**ITbExpression**](./#itbexpression-interface) whose [**Evaluate**](Evaluate) method produces the value of *symbol* when invoked, or **Nothing** to indicate that this binder cannot resolve *symbol* and the engine should fall through to the next binder.

**Bind** is called by the engine during compilation — once per unresolved symbol encountered in the expression source — not at evaluation time. The implementer is expected either to construct an **ITbExpression** that, when later evaluated, produces the value, or to return **Nothing** so that another binder gets a chance.

The *argCount* parameter lets the implementer distinguish a property-style reference (`MyName`, where *argCount* is `0`) from a function-style call (`MyName(1, 2, 3)`, where *argCount* is `3`), and bind them to different things.

A class registers itself as a binder by including `Implements ITbCustomBinder` and then passing itself to [**AddCustomBinder**](AddCustomBinder).

### Example

This **ITbCustomBinder** implementation looks up zero-argument symbols against the current row of an external recordset, deferring to the next binder for everything else.

```tb
Implements ITbCustomBinder

Public Recordset As Object

Protected Function Bind(ByVal Symbol As String, ByVal ArgCount As Long) As ITbExpression _
        Implements ITbCustomBinder.Bind

    If ArgCount = 0 AndAlso Recordset IsNot Nothing Then
        Dim Field As Object = Recordset.GetFieldBinder(Symbol)
        If TypeOf Field Is ITbExpression Then
            Return CType(Of ITbExpression)(Field)
        End If
    End If
    ' Returning Nothing lets the next binder try.
End Function
```

### See Also

- [AddCustomBinder](AddCustomBinder) method
- [Evaluate](Evaluate) method
- [Compile](Compile) method
