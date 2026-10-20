---
title: Asc
parent: Strings Module
permalink: /tB/Modules/Strings/Asc
vba_attribution: true
---
# Asc, AscB, AscW
{: .no_toc }

Returns an **Integer** representing the character code corresponding to the first letter in a string.

Syntax:

- **Asc(** *string* **)**
- **AscB(** *string* **)**
- **AscW(** *string* **)**

*string*
: *required* Any valid string expression.

The range for returns from **Asc** is 0--255 on non-DBCS systems, but -32768--32767 on DBCS systems.

> [!NOTE]
> The **AscB** function is used with byte data contained in a string. Instead of returning the character code for the first character, **AscB** returns the first byte. The **AscW** function returns the Unicode character code.

The functions [**Chr**, **ChrB**, and **ChrW**](Chr) are the opposite of **Asc**, **AscB**, and **AscW**. The **Chr** functions convert an integer to a character string.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | *string* is zero-length |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | *string* is **Null** |

<!-- /errors -->

### Example

This example uses the **Asc** function to return a character code corresponding to the first letter in the string.

```tb check_build
Dim MyNumber
MyNumber = Asc("A")        ' Returns 65.
MyNumber = Asc("a")        ' Returns 97.
MyNumber = Asc("Apple")    ' Returns 65.
```

### See Also

- [Chr](Chr) function
