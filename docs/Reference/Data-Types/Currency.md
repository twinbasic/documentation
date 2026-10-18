---
title: Currency
parent: Data Types
grand_parent: Reference Section
nav_order: 9
permalink: /tB/Core/Currency
vba_attribution: true
---

# Currency
{: .no_toc }

A fixed-point number with four decimal places, from -922,337,203,685,477.5808 to 922,337,203,685,477.5807.

Syntax:

- [**Dim**](Dim) *varname* **As Currency** [ **=** *expression* ]
- **Dim** *varname*`@`
- [**DefCur**](Deftype) *letterrange*

A **Currency** variable is declared **As Currency**, or by the type-declaration character `@` after its name. [**DefCur**](Deftype) makes **Currency** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. A **Currency** that is not given a value holds 0.

**Currency** suits money and other calculations in which the digits must come out exactly. It stores a decimal number with exactly four digits after the point, so it has none of the binary rounding errors of [**Double**](Double). The **Variant** subtype for a **Currency** is **vbCurrency** (6), and [**TypeName**](../Modules/Information/TypeName) gives `Currency`.

## Storage and range

A **Currency** is stored in 8 bytes as a 64-bit integer that is scaled by 10,000, so it has 15 digits before the decimal point and 4 after it. It has the same size in a 32-bit and a 64-bit build.

A value with more than four decimal places is rounded to four, and a value exactly halfway between two is rounded to the even digit: the string `"0.12345"` becomes 0.1234 and `"0.12355"` becomes 0.1236. A **Double** is first converted to the nearest value it can represent, which is not always exactly halfway, so rounding a **Double** can go either way.

```tb check_run
Dim Price As Currency
Dim Tax@
Debug.Print Price                   ' 0
Debug.Print LenB(Price)             ' 8
Debug.Print TypeName(Tax)           ' Currency
Debug.Print VarType(Price) = vbCurrency ' True
Debug.Print CCur("0.12345")         ' 0.1234
Debug.Print CCur("0.12355")         ' 0.1236
Debug.Print 0.1@ * 3 = 0.3@         ' True
Debug.Print 0.1 * 3 = 0.3           ' False
```

## Literals

The suffix `@` makes a number a **Currency**: `5@` and `1.5@`. Without it a number with a decimal point is a **Double**. A literal with more than four decimals is rounded: `0.12345@` is 0.1234. The largest literal is `922337203685477.5807@`.

## Conversions

[**CCur**](../Modules/Conversion/CCur) converts an expression to a **Currency**, and so does assigning one to a **Currency** variable. A string is read as a number, and `True` is -1. A value outside the range raises error 6, *Overflow*: `CCur(1E+15)` does. A string that is not a number raises error 13, *Type mismatch*.

A **Currency** converted to a whole number is rounded to the nearest, with halves going to the even number: `CLng(2.5@)` is 2 and `CLng(3.5@)` is 4.

```tb check_run
Debug.Print CCur(" 12.5 ")          ' 12.5
Debug.Print CCur(True)              ' -1
Debug.Print CLng(2.5@)              ' 2
Debug.Print CLng(3.5@)              ' 4
On Error Resume Next
Debug.Print CCur(1E+15)
Debug.Print Err.Number              ' 6
```

## Arithmetic and overflow

An operation on two **Currency** values gives a **Currency**, and so does a **Currency** combined with a **Byte**, **Integer**, **Long**, **LongLong**, **Boolean** or **String** under `+`, `-` and `*`, and with a **Single** or a **Double** under `+` and `-`. A **Currency** multiplied by a **Single** or a **Double** gives a **Double**, and so does any division with `/`: `10@ / 3@` is the **Double** 3.33333333333333. `\` and `Mod` give a **Long** and `^` a **Double**. Combined with a **Decimal** it gives a **Decimal**. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

A product keeps four places and drops the rest: `0.0001@ * 0.0001@` is 0. A result outside the range raises error 6, *Overflow*, and a division by zero raises error 11. A **Variant** holding a **Currency** raises error 6 on overflow too, where a **Variant** holding a smaller type widens.

For money with more than four decimal places, or results of division that must stay exact, use [**Decimal**](Decimal); [Decimal or Currency for money](Decimal#decimal-or-currency-for-money) compares the two.

```tb check_run
Dim Price As Currency = 19.99
Debug.Print TypeName(Price * 3)     ' Currency
Debug.Print TypeName(Price + 0.5)   ' Currency
Debug.Print TypeName(Price * 0.5)   ' Double
Debug.Print TypeName(Price / 3)     ' Double
Debug.Print Price * 3               ' 59.97
Debug.Print 0.0001@ * 0.0001@       ' 0
```

## Example

This example adds a 7.25% tax to an order of three items. The tax is rounded to whole cents with [**Round**](../Modules/Math/Round) before it is added, so the total never carries a fraction of a cent.

```tb check_run
Dim Subtotal As Currency
Dim Tax As Currency
Subtotal = 19.99@ * 3
Tax = Round(Subtotal * 0.0725, 2)
Debug.Print Subtotal                ' 59.97
Debug.Print Tax                     ' 4.35
Debug.Print Subtotal + Tax          ' 64.32
```

## See Also

- [Data Types](../../Reference/Data-Types#currency) -- the summary of all fourteen intrinsic types
- [Decimal](Decimal), [Double](Double), [Single](Single) -- the other non-integer types
- [CCur](../Modules/Conversion/CCur) function
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
