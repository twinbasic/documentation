---
title: Environ
parent: Interaction Module
permalink: /tB/Modules/Interaction/Environ
redirect_from:
-  /tB/Core/Environ
vba_attribution: true
---
# Environ, Environ$
{: .no_toc }

Returns the value associated with an operating-system environment variable, looked up either by name or by 1-based position in the environment-string table.

Syntax:

- **Environ$(** *envstring* **)**, **Environ(** *envstring* **)**
- **Environ$(** *number* **)**, **Environ(** *number* **)**

*envstring*
: *required* String expression containing the name of an environment variable.

*number*
: *required* Numeric expression giving the 1-based position of an entry in the process environment-string table. *number* may be any numeric expression and is rounded to a whole number before being evaluated.

The `$`-suffixed forms return a **String**; the unsuffixed forms return a **Variant** (**String**).

When called with *envstring*, **Environ** returns the value assigned to that environment variable --- that is, the text following the equal sign (`=`) in the environment-string table for that variable. If *envstring* can't be found in the table, a zero-length string (`""`) is returned.

When called with *number*, **Environ** returns the entire entry at that position, including the variable name, the equal sign, and the value (e.g. `"PATH=C:\Windows;C:\Windows\System32"`). If there is no entry at that position, a zero-length string is returned.

### Example

This example iterates over the environment-string table to find the entry number and the value length for `PATH`.

```tb
Dim EnvString As String, Indx As Long, PathLen As Long
Indx = 1
Do
    EnvString = Environ(Indx)
    If Left(EnvString, 5) = "PATH=" Then
        PathLen = Len(Environ("PATH"))
        Debug.Print "PATH entry = " & Indx & " and length = " & PathLen
        Exit Do
    Else
        Indx = Indx + 1
    End If
Loop Until EnvString = ""

If PathLen = 0 Then
    Debug.Print "No PATH environment variable exists."
End If
```
