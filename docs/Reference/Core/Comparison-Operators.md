---
title: Comparison
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Comparison-Operators
vba_attribution: true
---
# Comparison operators
{: .no_toc }

Used to compare expressions and return a **Boolean** result.

Syntax:
> *result* **=** *expression1* *comparisonoperator* *expression2*  
> *result* **=** *object1* **Is** *object2*  
> *result* **=** *string* **Like** *pattern*

*result*
: Any numeric variable.

*expression*
: Any expression.

*comparisonoperator*
: Any of `<`, `<=`, `>`, `>=`, `=`, `<>`.

*object*
: Any object reference.

*string*
: Any string expression.

*pattern*
: Any string expression or range of characters.

The following table lists the comparison operators and the conditions that determine whether *result* is **True**, **False**, or **Null**:

| Operator                          | **True** if                | **False** if               | **Null** if                              |
|:----------------------------------|:---------------------------|:---------------------------|:-----------------------------------------|
| `<`  (Less than)                  | *expression1* < *expression2*  | *expression1* >= *expression2* | *expression1* or *expression2* = **Null** |
| `<=` (Less than or equal to)      | *expression1* <= *expression2* | *expression1* > *expression2*  | *expression1* or *expression2* = **Null** |
| `>`  (Greater than)               | *expression1* > *expression2*  | *expression1* <= *expression2* | *expression1* or *expression2* = **Null** |
| `>=` (Greater than or equal to)   | *expression1* >= *expression2* | *expression1* < *expression2*  | *expression1* or *expression2* = **Null** |
| `=`  (Equal to)                   | *expression1* = *expression2*  | *expression1* <> *expression2* | *expression1* or *expression2* = **Null** |
| `<>` (Not equal to)               | *expression1* <> *expression2* | *expression1* = *expression2*  | *expression1* or *expression2* = **Null** |

> [!NOTE]
> The [**Is**](Is) and [**Like**](Like) operators have their own dedicated comparison semantics and are documented separately.

The `=` symbol is also the assignment operator (`*variable* = *expression*`). The context — whether `=` appears in an expression or at the top of a statement — determines which meaning applies; you do not need to choose between them explicitly.

When comparing two expressions, you may not be able to easily determine whether the expressions are being compared as numbers or as strings. The following table shows how the expressions are compared, or the result when either expression is not a **Variant**:

| If                                                                                       | Then                                                  |
|:-----------------------------------------------------------------------------------------|:------------------------------------------------------|
| Both expressions are numeric (**Byte**, **Boolean**, **Integer**, **Long**, **LongLong**, **Single**, **Double**, **Date**, **Currency**) | Perform a numeric comparison.                         |
| Both expressions are **String**                                                          | Perform a string comparison.                          |
| One expression is numeric and the other is a **Variant** that is, or can be, a number    | Perform a numeric comparison.                         |
| One expression is numeric and the other is a string **Variant** that can't be converted to a number | A `Type Mismatch` error occurs.                       |
| One expression is a **String** and the other is any **Variant** except a **Null**        | Perform a string comparison.                          |
| One expression is **Empty** and the other is a numeric data type                         | Perform a numeric comparison, using 0 as the **Empty** expression. |
| One expression is **Empty** and the other is a **String**                                | Perform a string comparison, using `""` as the **Empty** expression. |

If *expression1* and *expression2* are both **Variant** expressions, their underlying type determines how they are compared:

| If                                                                  | Then                                                  |
|:--------------------------------------------------------------------|:------------------------------------------------------|
| Both **Variant** expressions are numeric                            | Perform a numeric comparison.                         |
| Both **Variant** expressions are strings                            | Perform a string comparison.                          |
| One **Variant** expression is numeric and the other is a string     | The numeric expression is less than the string expression. |
| One **Variant** expression is **Empty** and the other is numeric    | Perform a numeric comparison, using 0 as the **Empty** expression. |
| One **Variant** expression is **Empty** and the other is a string   | Perform a string comparison, using `""` as the **Empty** expression. |
| Both **Variant** expressions are **Empty**                          | The expressions are equal.                            |

When a **Single** is compared to a **Double**, the **Double** is rounded to the precision of the **Single**. If a **Currency** is compared with a **Single** or **Double**, the **Single** or **Double** is converted to a **Currency**. For **Currency**, any fractional value less than `.0001` may be lost, which can cause two values to compare as equal when they are not.

String comparisons are governed by the module's [**Option Compare**](Option) setting — **Binary** (the default; case-sensitive, ordinal) or **Text** (case-insensitive, locale-sensitive).

### Example

```tb
Dim MyResult, Var1, Var2
MyResult = (45 < 35)            ' Returns False.
MyResult = (45 = 45)            ' Returns True.
MyResult = (4 <> 3)             ' Returns True.
MyResult = ("5" > "4")          ' Returns True.

Var1 = "5": Var2 = 4            ' Initialize variables.
MyResult = (Var1 > Var2)        ' Returns True (string compared as string).

Var1 = 5: Var2 = Empty
MyResult = (Var1 > Var2)        ' Returns True (Empty treated as 0).

Var1 = 0: Var2 = Empty
MyResult = (Var1 = Var2)        ' Returns True.
```

### See Also

- [**Is** operator](Is)
- [**IsNot** operator](IsNot)
- [**Like** operator](Like)
- [**Option** statement](Option)
- [Operators](../../Reference/Operators)
