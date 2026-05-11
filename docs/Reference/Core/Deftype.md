---
title: Deftype
parent: Statements
permalink: /tB/Core/Deftype
---
# DefBool, DefByte, DefInt, DefLng, DefLngLng, DefLngPtr, DefCur, DefSng, DefDbl, DefDec, DefDate, DefStr, DefObj, DefVar
{: .no_toc }

Used at the module level to set the default data type for variables, arguments passed to procedures, and the return type for **Function** and **Property Get** procedures whose names start with the specified characters.

> [!WARNING]
> The **Def**_type_ family of statements is deprecated. They are supported for compatibility with legacy code, but new code should declare every variable, argument, and return type explicitly with **As** *type*. Combined with [**Option Explicit**](Option#Explicit), explicit declarations make code far easier to read and maintain.

Syntax:

- > **DefBool** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefByte** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefInt** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefLng** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefLngLng** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefLngPtr** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefCur** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefSng** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefDbl** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefDec** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefDate** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefStr** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefObj** *letterrange* [ **,** *letterrange* ] **. . .**
- > **DefVar** *letterrange* [ **,** *letterrange* ] **. . .**

*letterrange*
: A single letter, or a hyphenated range *letter1*-*letter2*. The letters specify the leading character of names that adopt the default type. Case is not significant.

The statement name determines the data type:

| Statement | Data type |
|:----------|:----------|
| **DefBool**   | **Boolean** |
| **DefByte**   | **Byte** |
| **DefInt**    | **Integer** |
| **DefLng**    | **Long** |
| **DefLngLng** | **LongLong** |
| **DefLngPtr** | **LongPtr** |
| **DefCur**    | **Currency** |
| **DefSng**    | **Single** |
| **DefDbl**    | **Double** |
| **DefDec**    | **Decimal** |
| **DefDate**   | **Date** |
| **DefStr**    | **String** |
| **DefObj**    | **Object** |
| **DefVar**    | **Variant** |

For example, in the following fragment, `Message` is a **String** variable:

```tb
DefStr A-Q
. . .
Message = "Out of stack space."
```

A **Def**_type_ statement affects only the module where it is used. The default data type for variables, arguments, and return types of items not declared explicitly and not covered by a **Def**_type_ statement is **Variant**.

When you specify a letter range, it usually defines the data type for variables that begin with letters in the first 128 characters of the character set. However, when you specify the range A-Z, you set the default to the specified data type for *all* names, including those starting with characters from the extended part of the character set (128-255).

After the range A-Z has been specified, you can't further redefine subranges by using **Def**_type_ statements. Once a range has been specified, including a previously defined letter in another **Def**_type_ statement is an error. You can, however, explicitly specify the data type of any variable — defined or not — by using a [**Dim**](Dim) statement with an **As** *type* clause:

```tb
DefInt A-Z
Dim TaxRate As Double   ' explicit declaration overrides the default
```

**Def**_type_ statements don't affect elements of user-defined types — those must be explicitly declared.

### See Also

- [**Dim** statement](Dim)
- [**Option** statement](Option) (for **Option Explicit**)
- [**Type** statement](Type)

{% include VBA-Attribution.md %}
