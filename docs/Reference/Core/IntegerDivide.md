---
title: "&#92;, &#92;="
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/IntegerDivide
vba_attribution: true
---
# \\ and \\= operators
{: .no_toc }

Used to divide two numbers and return an integer result. The compound form **\\=** divides-and-assigns in one step.

Syntax:
> *result* **=** *number1* **\\** *number2*  
> *variable* **\\=** *number*       *(twinBASIC)*

*result*
: Any numeric variable.

*variable*
: *(twinBASIC)* Any numeric variable or writable property.

*number*, *number1*, *number2*
: Any numeric expressions.

Before division is performed, the numeric expressions are rounded to whole numbers. A value exactly halfway between two whole numbers is rounded to the even one, so `6.5 \ 2` is 3 and `7.5 \ 2` is 4.

Usually, the data type of *result* is a **Byte**, **Byte** variant, **Integer**, **Integer** variant, **Long**, **Long** variant, **LongLong**, or **LongLong** variant, regardless of whether *result* is a whole number: **Byte** when both expressions are **Byte**, **Integer** when both are **Byte**, **Integer** or **Boolean**, **LongLong** when either is **LongLong**, and **Long** otherwise. A **Boolean** *number1* with a **String** *number2* is the exception: the **String** is converted to **Boolean**, and *result* is a **Boolean**, so `True \ "2"` is **True**. A **String** *number1* with a **Boolean** *number2* gives a **Long**. A declared **Decimal** expression gives a **Decimal** *result*, still a whole number; a **Decimal** held in a **Variant** gives a **Long**. See [Result types and promotion](../../Reference/Operators#result-types-and-promotion).

Any fractional portion of the quotient is discarded, so the quotient is truncated toward zero: `-7 \ 2` is -3. However, if any expression is **Null**, *result* is **Null**. Any expression that is **Empty** is treated as 0.

Dividing by zero raises error 11, *Division by zero*.

Dividing the most negative **Integer** (-32,768), **Long** (-2,147,483,648) or **LongLong** by -1 raises error 6, *Overflow*, because the quotient does not fit the type. It does so even where overflow checks are turned off, by the project setting or by [**IntegerOverflowChecks(False)**](Attributes#integeroverflowchecks). A **Variant** holding the **Integer** gives a **Long** 32,768 instead; one holding the **Long** or **LongLong** raises error 6.

> [!NOTE]
> **Decimal** can be a declared type in twinBASIC, and integer division keeps it: a declared **Decimal** on either side gives a **Decimal** *result*. In VBA, **Decimal** exists only inside a **Variant**. **LongLong** takes part in 32-bit builds as well; VBA has it only in 64-bit builds.

### Compound assignment

`x \= y` is the twinBASIC shorthand for `x = x \ y`. The left-hand side is evaluated once and rounded to an integral type before the division. **\\=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Value As Long = 100
Value \= 4                      ' Value is now 25.
Value \= 7                      ' Value is now 3 (truncating).
```

### Example

This example uses the **\\** operator to perform integer division.

```tb check_build
Dim MyValue
MyValue = 11 \ 4                ' Returns 2.
MyValue = 9 \ 3                 ' Returns 3.
MyValue = 100 \ 3               ' Returns 33.
```

A **Boolean** on the left of a **String** keeps the **Boolean** type, and the operands the other way round give a **Long**:

```tb check_run
Dim b As Boolean
b = True
Debug.Print TypeName(b \ "2"); " "; b \ "2"     ' Boolean True
Debug.Print TypeName("2" \ b); " "; "2" \ b     ' Long -2
```

### See Also

- [**/** operator](Divide)
- [**Mod** operator](Mod)
- [Operators](../../Reference/Operators)
