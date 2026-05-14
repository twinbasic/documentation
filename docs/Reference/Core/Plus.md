---
title: +, +=
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Plus
vba_attribution: true
---
# + and += operators
{: .no_toc }

Used to sum two numbers, or — depending on operand types — to concatenate two strings. The compound form **+=** adds-and-assigns in one step.

Syntax:
> *result* **=** *expression1* **+** *expression2*  
> *variable* **+=** *expression*       *(twinBASIC)*

*result*
: Any numeric variable.

*variable*
: *(twinBASIC)* Any numeric or **String** variable, or any writable property.

*expression*, *expression1*, *expression2*
: Any expressions.

When the **+** operator is used, it may not be obvious whether addition or string concatenation will occur. Use the [**&**](Concat) operator for concatenation to eliminate ambiguity and produce self-documenting code.

If at least one expression is not a **Variant**, the following rules apply:

| If                                                                              | Then                                                  |
|:--------------------------------------------------------------------------------|:------------------------------------------------------|
| Both expressions are numeric (**Byte**, **Boolean**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Single**, **Double**, **Date**, **Currency**) | Add. |
| Both expressions are **String**                                                 | Concatenate.                                          |
| One expression is numeric and the other is any **Variant** except **Null**      | Add.                                                  |
| One expression is **String** and the other is any **Variant** except **Null**   | Concatenate.                                          |
| One expression is an **Empty** **Variant**                                      | Return the remaining expression unchanged as *result*.|
| One expression is numeric and the other is a **String**                         | A `Type mismatch` error occurs.                       |
| Either expression is **Null**                                                   | *result* is **Null**.                                 |

If both expressions are **Variant** expressions, the following rules apply:

| If                                                              | Then         |
|:----------------------------------------------------------------|:-------------|
| Both **Variant** expressions are numeric                        | Add.         |
| Both **Variant** expressions are strings                        | Concatenate. |
| One **Variant** expression is numeric and the other is a string | Add.         |

For simple arithmetic addition involving only numeric expressions, the data type of *result* is usually the same as that of the most precise expression. The order of precision, from least to most precise, is **Byte**, **Integer**, **Long**, **LongLong**, **Single**, **Double**, **Currency**. The following are exceptions:

| If                                                                                        | Then *result* is                  |
|:------------------------------------------------------------------------------------------|:----------------------------------|
| A **Single** and a **Long** are added                                                     | A **Double**.                     |
| *result* is a **Long**, **Single**, or **Date** variant that overflows its legal range    | Converted to a **Double** variant.|
| *result* is a **Byte** variant that overflows its legal range                             | Converted to an **Integer** variant.|
| *result* is an **Integer** variant that overflows its legal range                         | Converted to a **Long** variant.  |
| A **Date** is added to any data type                                                      | A **Date**.                       |

If one or both expressions are **Null** expressions, *result* is **Null**. If both expressions are **Empty**, *result* is an **Integer**. However, if only one expression is **Empty**, the other expression is returned unchanged as *result*.

> [!NOTE]
> The order of precision used by addition and subtraction is not the same as the order of precision used by multiplication.

### Compound assignment

`x += y` is the twinBASIC shorthand for `x = x + y`. The left-hand side is evaluated once; the result follows the same type-promotion and **Null** / **Empty** rules described above. Like all of twinBASIC's compound-assignment operators, **+=** is a statement, not an expression — it does not produce a value.

```tb
Dim Total As Long = 0
Total += 5                      ' Total is now 5.
Total += 7                      ' Total is now 12.

Dim Greeting As String = "Hello"
Greeting += ", world"           ' Greeting is now "Hello, world".
```

### Example

This example uses the **+** operator to sum numbers. The **+** operator can also be used to concatenate strings, but to eliminate ambiguity use the [**&**](Concat) operator instead.

```tb
Dim MyNumber, Var1, Var2
MyNumber = 2 + 2                ' Returns 4.
MyNumber = 4257.04 + 98112      ' Returns 102369.04.

Var1 = "34": Var2 = 6           ' Initialize mixed variables.
MyNumber = Var1 + Var2          ' Returns 40.

Var1 = "34": Var2 = "6"         ' Initialize variables with strings.
MyNumber = Var1 + Var2          ' Returns "346" (string concatenation).
```

### See Also

- [**-** operator](Minus)
- [**&** operator](Concat)
- [**\*** operator](Multiply)
- [Operators](../../Reference/Operators)
