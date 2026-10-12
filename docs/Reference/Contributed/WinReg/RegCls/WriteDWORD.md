---
title: WriteDWORD
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/WriteDWORD
has_toc: false
---
# WriteDWORD
{: .no_toc }

Writes a 32-bit integer value (**REG_DWORD**) to a registry key, creating the key if it does not already exist.

Syntax: *object*.**WriteDWORD**(*RootKey*, *KeyPath*, *ValueName*, *ValueData*)

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root key, such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** giving the subkey path relative to *RootKey*, for example `"Software\MyApp\Settings"`. The key is created if it does not exist.

*ValueName*
: *required* A **String** naming the value entry to write. Pass an empty string to write the default value of the key.

*ValueData*
: *required* A **Long** holding the 32-bit integer to store. The value is written with type **REG_DWORD**.

Return value: a **BOOL** (**True** on success, **False** on failure).

### Remarks

**WriteDWORD** calls `RegCreateKeyEx` to open or create the key at *KeyPath* under *RootKey*, then calls `RegSetValueEx` to store *ValueData* as a **REG_DWORD** entry. The key handle is closed before the function returns.

If `RegCreateKeyEx` fails (for example, due to insufficient permissions), the function returns **False** without attempting to write. Any error raised internally is suppressed by `On Error Resume Next`. The function reports only success or failure, not the Win32 error code.

The value is stored as a little-endian 32-bit integer, which is the standard **REG_DWORD** format on Windows. To read the value back, use [**ReadDWORD**](ReadDWORD).

> [!IMPORTANT]
> Writing to keys under `HKEY_LOCAL_MACHINE` typically requires the process to be running with elevated (administrator) privileges. Attempting to write without the necessary rights causes `RegCreateKeyEx` to fail and **WriteDWORD** to return **False**.

### Example

This example stores an application run count and a feature flag under `HKEY_CURRENT_USER`.

```tb check_build
Dim reg As New RegCls

If reg.WriteDWORD(HKEY_CURRENT_USER, "Software\MyApp", "RunCount", 1) Then
    Debug.Print "RunCount written."
Else
    Debug.Print "Failed to write RunCount."
End If

' Write a boolean flag as a DWORD (0 = False, 1 = True).
reg.WriteDWORD HKEY_CURRENT_USER, "Software\MyApp", "FeatureEnabled", 1
```

### See Also

- [ReadDWORD](ReadDWORD) -- reads a **REG_DWORD** value from a registry key
- [WriteString](WriteString) -- writes a **REG_SZ** string value to a registry key
- [ReadString](ReadString) -- reads a **REG_SZ** string value from a registry key
- [DeleteValue](DeleteValue) -- removes a named value entry from a registry key
