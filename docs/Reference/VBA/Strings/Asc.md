---
title: Asc
parent: Strings Module
permalink: /tB/Modules/Strings/Asc
---
# Asc, AscB, AscW
{: .no_toc }

Returns an **Integer** representing the character code corresponding to the first letter in a string.

Syntax:

- **Asc(** *string* **)**
- **AscB(** *string* **)**
- **AscW(** *string* **)**

*string*
: *required* Any valid string expression. If *string* contains no characters, a run-time error occurs.

The range for returns from **Asc** is 0–255 on non-DBCS systems, but -32768–32767 on DBCS systems.

> [!NOTE]
> The **AscB** function is used with byte data contained in a string. Instead of returning the character code for the first character, **AscB** returns the first byte. The **AscW** function returns the Unicode character code.

The functions [**Chr**, **ChrB**, and **ChrW**](Chr) are the opposite of **Asc**, **AscB**, and **AscW**. The **Chr** functions convert an integer to a character string.

### Example

This example uses the **Asc** function to return a character code corresponding to the first letter in the string.

```tb
Dim MyNumber
MyNumber = Asc("A")        ' Returns 65.
MyNumber = Asc("a")        ' Returns 97.
MyNumber = Asc("Apple")    ' Returns 65.
```

### See Also

- [Chr](Chr) function

{% include VBA-Attribution.md %}
