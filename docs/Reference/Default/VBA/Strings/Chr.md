---
title: Chr
parent: Strings Module
permalink: /tB/Modules/Strings/Chr
vba_attribution: true
---
# Chr, ChrB, ChrW
{: .no_toc }

Returns a **String** containing the character associated with the specified character code.

Syntax:

- **Chr$(** *charcode* **)**, **Chr(** *charcode* **)**
- **ChrB$(** *charcode* **)**, **ChrB(** *charcode* **)**
- **ChrW$(** *charcode* **)**, **ChrW(** *charcode* **)**

*charcode*
: *required* A **Long** that identifies a character.

The `$`-suffixed forms return a **String**; the unsuffixed forms return a **Variant** (**String**).

Numbers from 0--31 are the same as standard, nonprintable ASCII codes. For example, `Chr(10)` returns a linefeed character. The normal range for *charcode* is 0--255. However, on DBCS systems, the actual range for *charcode* is -32768--65535.

> [!NOTE]
> The **ChrB** function is used with byte data contained in a **String**. Instead of returning a character, which may be one or two bytes, **ChrB** always returns a single byte.
>
> The **ChrW** function returns a **String** containing the Unicode character.

The functions [**Asc**, **AscB**, and **AscW**](Asc) are the opposite of **Chr**, **ChrB**, and **ChrW**. The **Asc** functions convert a string to an integer.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | **Chr** or **Chr$** is given a *charcode* less than 0 or greater than 255<br>**ChrW** or **ChrW$** is given a *charcode* less than -32,768 or greater than 65,535 |
| [6 (`&H6`)](../../../Reference/Run-time-Errors#error-6), *Overflow* | **ChrB** or **ChrB$** is given a *charcode* less than 0 or greater than 255 |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | *charcode* is **Null** |

<!-- /errors -->

### Example

This example uses the **Chr** function to return the character associated with the specified character code.

```tb check_build
Dim MyChar
MyChar = Chr(65)    ' Returns A.
MyChar = Chr(97)    ' Returns a.
MyChar = Chr(62)    ' Returns >.
MyChar = Chr(37)    ' Returns %.
```

### See Also

- [Asc](Asc) function
