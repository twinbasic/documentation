---
title: CreateKey
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/CreateKey
has_toc: false
---
# CreateKey
{: .no_toc }

Creates a registry key, including any intermediate keys in the path that do not already exist.

Syntax: *object*.**CreateKey** ( *RootKey*, *KeyPath* )

*RootKey*
: *required* A **RegKeyspace** value identifying the root key under which the new key is created. Typical values are **HKEY_CURRENT_USER**, **HKEY_LOCAL_MACHINE**, and the other root constants of the **RegKeyspace** enumeration from **WinDevLib**.

*KeyPath*
: *required* A **String** giving the subkey path relative to *RootKey*, using backslashes as separators --- for example, `"Software\MyApp\Settings\Advanced"`. All intermediate keys that do not yet exist are created.

Returns **True** if the key was created or already existed, **False** if the operation failed (for example, due to insufficient permissions).

**CreateKey** calls the Win32 `RegCreateKeyEx` function with `KEY_CREATE_SUB_KEY` access and does not write any values. If the key already exists, the function succeeds and the existing key and its values are left unchanged.

> [!NOTE]
> Writing values to the new key requires a subsequent call to [**WriteString**](WriteString) or [**WriteDWORD**](WriteDWORD), which open the key with write access internally.

### Example

This example creates a multi-level registry key under **HKEY_CURRENT_USER** and checks whether the operation succeeded.

```tb check_build
Dim Reg As New RegCls
Dim Success As Boolean

Success = Reg.CreateKey(HKEY_CURRENT_USER, "Software\MyApp\Settings\Advanced")
If Success Then
    Debug.Print "Key created (or already exists)."
Else
    Debug.Print "Failed to create key."
End If
```

### See Also

- [KeyExists](KeyExists) method
- [WriteString](WriteString) method
- [WriteDWORD](WriteDWORD) method
- [DeleteKey](DeleteKey) method
- [DeleteKeyEx](DeleteKeyEx) method
