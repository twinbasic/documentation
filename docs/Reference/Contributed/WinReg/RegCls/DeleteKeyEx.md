---
title: DeleteKeyEx
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/DeleteKeyEx
has_toc: false
---
# DeleteKeyEx
{: .no_toc }

Recursively deletes a registry key and all of its subkeys and values.

Syntax: *object*.**DeleteKeyEx** ( *RootKey*, *KeyPath* )

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) value identifying the root hive, such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** specifying the path of the key to delete, relative to *RootKey*. For example, `"Software\MyApp"`.

Returns **True** if the key was deleted, **False** if the operation failed.

### Remarks

**DeleteKeyEx** opens the target key with `KEY_ENUMERATE_SUB_KEYS`, `KEY_QUERY_VALUE`, and `KEY_ALL_ACCESS` rights, then iterates through all subkeys using `RegEnumKeyEx`, calling itself recursively on each one. After all subkeys are deleted, it removes every value under the current key with `RegDeleteValue`, closes the handle, and removes the now-empty key with `RegDeleteKey`. The `KEY_ALL_ACCESS` that the class defines is `&H3F`, the six rights specific to a key, without the standard access rights that the Windows constant of the same name includes.

This function is necessary because the Win32 `RegDeleteKey` API fails if the target key has subkeys. Use [**DeleteKey**](DeleteKey) instead when the key is known to have no subkeys.

Both enumeration loops always request index 0 and rely on each deletion to expose the next entry. A subkey or value that cannot be deleted (for example, for lack of permission) therefore leaves the loop repeating on the same entry.

> [!IMPORTANT] timeless
> Deleting a registry key is irreversible. Verify that *RootKey* and *KeyPath* are correct before calling this function, as all subkeys and values under the specified path will be permanently removed.

### Example

This example removes the `Software\MyApp` key and all of its contents from `HKEY_CURRENT_USER`.

```tb check_build
Dim reg As New RegCls
Dim success As Boolean

success = reg.DeleteKeyEx(HKEY_CURRENT_USER, "Software\MyApp")
If success Then
    MsgBox "Key deleted successfully."
Else
    MsgBox "Failed to delete key."
End If
```

### See Also

- [DeleteKey](DeleteKey) function -- deletes a registry key that has no subkeys
- [DeleteValue](DeleteValue) function -- deletes a single named value from a key
- [KeyExists](KeyExists) function -- checks whether a key exists before attempting to delete it
