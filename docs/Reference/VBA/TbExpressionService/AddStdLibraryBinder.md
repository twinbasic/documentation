---
title: AddStdLibraryBinder
parent: TbExpressionService
permalink: /tB/Modules/TbExpressionService/AddStdLibraryBinder
redirect_from:
  - /tB/Modules/ExpressionService/AddStdLibraryBinder
---
# AddStdLibraryBinder
{: .no_toc }

Registers the standard-library binder so compiled expressions can call the common runtime functions.

Syntax: *service*.**AddStdLibraryBinder**

*service*
: *required* An object expression that evaluates to a **TbExpressionService** object.

After **AddStdLibraryBinder** has been called, expressions compiled by *service* can reference any procedure or property in the standard runtime library — math functions like [**Sqr**](../Math/Sqr), [**Sin**](../Math/Sin), and [**Round**](../Math/Round); string functions like [**Len**](../Strings/Len), [**Mid**](../Strings/Mid), and [**Format**](../Strings/Format); conversion functions like [**CStr**](../Conversion/CStr) and [**CInt**](../Conversion/CInt); and so on.

A new **TbExpressionService** has no binders registered. Without at least one binder, compiled expressions can do little more than evaluate literal arithmetic — any reference to a named symbol fails compilation with a run-time error.

### Example

```tb
Dim Service As TbExpressionService = New TbExpressionService
Service.AddStdLibraryBinder()

Debug.Print Service.Compile("Sqr(2) + Sqr(3)").Evaluate()    ' 3.14...
Debug.Print Service.Compile("UCase(""hello"")").Evaluate()   ' HELLO
```

### See Also

- [Compile](Compile) method
- [AddCustomBinderObject](AddCustomBinderObject) method
- [AddCustomBinder](AddCustomBinder) method
