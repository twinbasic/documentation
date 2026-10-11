---
title: EnumValues
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/EnumValues
has_toc: false
---
# EnumValues
{: .no_toc }

Returns a **Dictionary** containing the names and string representations of all values under a registry key.

Syntax: *object*.**EnumValues** ( *RootKey*, *KeyPath* )

*RootKey*
: *required* A **Long** identifying the root hive. Pass one of the `RegKeyspace` constants: **HKEY_CLASSES_ROOT**, **HKEY_CURRENT_USER**, **HKEY_LOCAL_MACHINE**, **HKEY_USERS**, etc.

*KeyPath*
: *required* A **String** giving the path to the subkey beneath *RootKey*, for example `"Software\MyApp"`.

Returns a **Dictionary** whose keys are the value names found under *KeyPath* and whose items are the corresponding data converted to a **String**. If the key cannot be opened, the function returns **Nothing**. The **Dictionary** is the `Scripting.Dictionary` class of the Microsoft Scripting Runtime, which the package references.

### Remarks

The function opens the key with **KEY_READ** combined with **KEY_WOW64_64KEY**, so it always reads from the 64-bit registry view on a 64-bit system regardless of the process's bitness. The other **RegCls** methods open keys without that flag.

Values are enumerated in the order returned by the Win32 `RegEnumValue` API. The default value (the unnamed value, displayed as `(Default)` in Regedit) is included if present, with an empty string as its key in the returned **Dictionary**.

Each value's data is converted to a **String** as follows:

- **REG_SZ** and **REG_EXPAND_SZ** --- the raw string content, null terminator stripped.
- **REG_DWORD**, **REG_DWORD_LITTLE_ENDIAN**, **REG_DWORD_BIG_ENDIAN** --- the bytes written last byte first as two-digit uppercase hexadecimal pairs, with no `0x` prefix. For **REG_DWORD** this is the number itself as eight hexadecimal digits.
- **REG_BINARY** --- the bytes written in order as two-digit hexadecimal pairs with no separators.
- Any other type, such as **REG_MULTI_SZ** --- the string `"Unsupported type: "` followed by the numeric type code.

> [!NOTE]
> The enumeration stops at the first value that cannot be enumerated or read (for example, a value name longer than 259 characters, which does not fit the 260-character name buffer), and the function returns the entries collected up to that point.

### Example

This example enumerates all values under a registry key and prints each name and its data to the debug console.

```tb check_build
Dim reg As New RegCls
Dim dict As Dictionary
Dim key As Variant

Set dict = reg.EnumValues(HKEY_CURRENT_USER, "Software\MyApp")

If dict Is Nothing Then
    Debug.Print "Key not found or could not be opened."
Else
    For Each key In dict.Keys
        Debug.Print key & " = " & dict(key)
    Next key
    Set dict = Nothing
End If
```

### See Also

- [RegCls](.) class -- Windows registry read/write helper
