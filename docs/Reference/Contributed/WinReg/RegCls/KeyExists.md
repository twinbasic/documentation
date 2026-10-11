---
title: KeyExists
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/KeyExists
has_toc: false
---
# KeyExists
{: .no_toc }

Returns **True** if the specified registry key exists, **False** otherwise.

Syntax: *object*.**KeyExists**( *RootKey*, *KeyPath* ) **As Boolean**

*RootKey*
: *required* A **RegKeyspace** constant identifying the root hive, such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** specifying the subkey path within *RootKey*, for example `"Software\MyApp"`.

## Remarks

**KeyExists** calls `RegOpenKeyEx` with `KEY_QUERY_VALUE` access and returns **True** if the call succeeds (`ERROR_SUCCESS`). The key handle is closed immediately after the check regardless of whether the key was found.

No error is raised when the key does not exist. On any failure, including access-denied conditions, the function returns **False**.

### Example

This example checks for a registry key before attempting to read a value from it.

```tb
Dim reg As New RegCls

If reg.KeyExists(HKEY_CURRENT_USER, "Software\MyApp") Then
    Dim userName As String
    userName = reg.ReadString(HKEY_CURRENT_USER, "Software\MyApp", "UserName", "")
    MsgBox "Found user: " & userName
Else
    MsgBox "Key does not exist."
End If
```

### See Also

- [ValueExists](ValueExists) function -- checks whether a specific value exists within a registry key
- [ReadString](ReadString) function -- reads a REG_SZ value from a registry key
- [CreateKey](CreateKey) function -- creates a registry key, including any intermediate subkeys
