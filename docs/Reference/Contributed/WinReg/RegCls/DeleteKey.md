---
title: DeleteKey
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/DeleteKey
has_toc: false
---
# DeleteKey
{: .no_toc }

Deletes a registry key that has no subkeys.

Syntax: *object*.**DeleteKey** ( *RootKey*, *KeyPath* )

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) value identifying the root hive --- for example, `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** specifying the path of the key to delete, relative to *RootKey*. Segments are separated by backslashes --- for example, `"Software\MyApp"`.

Returns **True** if the key was deleted successfully, or **False** if the call failed.

> [!IMPORTANT] timeless
> The underlying Win32 `RegDeleteKey` call succeeds only when the target key has no subkeys. If the key contains subkeys, the call returns **False**. Use [DeleteKeyEx](DeleteKeyEx) to remove a key together with all its subkeys and values.

### Example

This example removes the `Settings` key under `HKEY_CURRENT_USER\Software\MyApp` and reports whether the deletion succeeded. The call fails if the key has subkeys.

```tb
Dim reg As New RegCls

If reg.DeleteKey(HKEY_CURRENT_USER, "Software\MyApp\Settings") Then
    Debug.Print "Key deleted."
Else
    Debug.Print "Deletion failed -- key may have subkeys or may not exist."
End If
```

### See Also

- [DeleteKeyEx](DeleteKeyEx) -- removes a key and all its subkeys and values recursively
- [DeleteValue](DeleteValue) function
- [CreateKey](CreateKey) function
- [KeyExists](KeyExists) function
