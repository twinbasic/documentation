---
title: WriteString
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/WriteString
has_toc: false
---
# WriteString
{: .no_toc }

Writes a string value to a registry key, creating the key if it does not exist.

Syntax: *object*.**WriteString**( *RootKey*, *KeyPath*, *ValueName*, *ValueData* ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive, such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** specifying the subkey path within *RootKey*, for example `"Software\MyApp"`. Intermediate keys are created automatically if they do not exist.

*ValueName*
: *required* A **String** naming the registry value to write. Pass an empty string to write the default value of the key.

*ValueData*
: *required* A **String** containing the text to store. The value is written as a `REG_SZ` (null-terminated Unicode string).

## Remarks

**WriteString** calls `RegCreateKeyEx` to open or create *KeyPath* under *RootKey*, then calls `RegSetValueEx` to store *ValueData* as a `REG_SZ` value. The key handle is closed before the function returns.

The return value is a **BOOL**: **True** if the value was written successfully, **False** if any step failed. If the key was created but the value could not be written, the new key remains.

> [!NOTE]
> The data size passed to `RegSetValueEx` is `LenB(ValueData) + 2`, which accounts for the string's byte count plus the two-byte null terminator.

### Example

This example writes a user name string under `HKEY_CURRENT_USER`.

```tb check_build
Dim reg As New RegCls

If reg.WriteString(HKEY_CURRENT_USER, "Software\MyApp", "UserName", "Alice") Then
    MsgBox "Value written successfully."
Else
    MsgBox "Failed to write value."
End If
```

### See Also

- [ReadString](ReadString) function -- reads a REG_SZ value from a registry key
- [WriteDWORD](WriteDWORD) function -- writes a DWORD (32-bit integer) value to a registry key
- [DeleteValue](DeleteValue) function -- removes a value from a registry key
