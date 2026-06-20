---
title: Array
parent: Information Module
permalink: /tB/Modules/Information/Array
redirect_from:
  - /tB/Core/Array
  - /tB/Modules/HiddenModule/Array
vba_attribution: true
---
# Array
{: .no_toc }

Returns a **Variant** containing an array built from a comma-separated list of values, or --- when used on the left of an assignment --- destructures an array on the right-hand side into the supplied variables.

Syntax:
- *result* **= Array(** [ *ArgList* ] **)** --- array creation.
- **Array(** *Var1*, *Var2*, ... **) =** *RhsArray* --- destructuring assignment.

*ArgList*
: *optional* A comma-delimited list of values that are assigned to the elements of the new array. If no arguments are supplied, an empty array is returned.

*Var1*, *Var2*, ...
: *required* (destructuring form) The variables to receive successive elements of *RhsArray*. Pass `_` to skip an element.

*RhsArray*
: *required* (destructuring form) An array; non-array values raise an error.

The lower bound of an array created with **Array** is determined by the **Option Base** statement at the component scope, defaulting to `0`.

```tb
Option Base 1
Dim a As Variant
a = Array(10, 20, 30)
Debug.Print a(1)             ' 10
```

The destructuring form unpacks an array into the named variables in order, starting from the array's lower bound. The argument list can mix variables and the `_` placeholder to skip elements:

```tb
Dim x As Variant, y As Variant, z As Variant
Array(x, y, z) = Array("one", "two", "three")
' x = "one", y = "two", z = "three"

Dim a As Variant, b As Variant
Array(a, _, b) = Array(1, 2, 3)
' a = 1, b = 3 — the second element is discarded
```

> [!NOTE]
> A **Variant** that is not declared as an array can still contain an array, and a **Variant** array can hold values of any type except fixed-length strings and user-defined types. Although a **Variant** containing an array is conceptually different from an array of **Variant** elements, indexing works the same way for both.

### Example

This example uses the **Array** function to return a **Variant** containing an array.

```tb
Dim MyWeek As Variant
Dim MyDay As Variant
MyWeek = Array("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
MyDay = MyWeek(2)        ' MyDay contains "Wed" with default Option Base 0,
                         ' or "Tue" under Option Base 1.
```

### See Also

- [Option](../../Core/Option) statement
- [LBound](LBound), [UBound](UBound) functions
