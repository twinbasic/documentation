---
title: Eval
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/Eval
---
# Eval
{: .no_toc }

Compiles and evaluates a twinBASIC expression supplied as a string, returning the result as a **Variant**.

Syntax: **Eval(** *Expression* **)** **As Variant**

*Expression*
: *required* **String**. A twinBASIC expression that resolves to a value --- for example, `"2 + 2"`, `"Sqr(2)"`, or `"UCase(""hello"")"`.

A fresh [**TbExpressionService**](../TbExpressionService/) is built for every call, with the standard library binder registered so the standard runtime functions ([**Sin**](../Math/Sin), [**Sqr**](../Math/Sqr), [**Len**](../Strings/Len), [**CStr**](../Conversion/CStr), and the rest) are visible. The expression is then compiled and evaluated once, and the service is discarded.

For repeated evaluation of the same source, or for expressions that need to see application objects, construct the service explicitly and reuse a compiled [**ITbExpression**](../TbExpressionService/#itbexpression-interface).

<!-- bug: expression-service-dangling-tokens -->
> [!WARNING] BETA 1010
> Some malformed expressions are not refused: the part that cannot be read is left out, and no error is raised. `Eval("2 +")`, `Eval("2 Mod")`, `Eval("(2")` and `Eval("2)")` each return 2.

<!-- bug: expression-service-error-numbers -->
> [!NOTE] BETA 1010
> **Eval** raises -2147467259 for any error inside the expression: the error's own number and description are lost. `Eval("1 / 0")` raises -2147467259, not 11. It raises the same for an expression whose value is an **Error** value, such as `Eval("CVErr(5)")`, and for **Len** of **Null**, which outside an expression returns **Null**.

<!-- bug: expression-service-error-numbers -->
> [!NOTE] BETA 1010
> In a built program, the first error the expression service raises has the description *Automation error*, and every later one *Unspecified error*. In a run from the IDE, every one has the description *Automation error*.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *Expression* is a zero-length string or is not an expression, or it names something the standard library does not have<br>evaluating *Expression* raises an error, whatever its number: division by zero, an overflow, a type mismatch, an argument a function refuses<br>the value of *Expression* is an **Error** value, or *Expression* calls **Len** with **Null** |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *Expression* is **Null** |

<!-- /errors -->

### Example

```tb check_build
Debug.Print Eval("2 * (Sqr(2) + 1)")    ' 4.82842712474619
Debug.Print Eval("UCase(""hello"")")     ' "HELLO"
```

### See Also

- [ExpressionService module](../ExpressionService/)
