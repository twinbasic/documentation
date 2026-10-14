---
title: DeleteValue
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/DeleteValue
has_toc: false
---
# DeleteValue
{: .no_toc }

Deletes a named value from a registry key and returns **True** if the deletion succeeded.

Syntax: *object*.**DeleteValue**( **ByVal** *RootKey* **As RegKeyspace**, **ByVal** *KeyPath* **As String**, **ByVal** *ValueName* **As String** ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive to open. Typical values are **HKEY_CURRENT_USER** and **HKEY_LOCAL_MACHINE**.

*KeyPath*
: *required* A **String** giving the path to the subkey that contains the value, relative to *RootKey*. Path components are separated by backslashes---for example, `"Software\MyApp"`.

*ValueName*
: *required* A **String** naming the value entry to delete within the key identified by *RootKey* and *KeyPath*.

## Remarks

**DeleteValue** opens the key *KeyPath* under *RootKey* with write access (`KEY_SET_VALUE`), calls the Win32 `RegDeleteValue` API to remove the named entry, then closes the key handle.

The function returns **True** when both the open and the delete operations return `ERROR_SUCCESS`. It returns **False** when the key cannot be opened (for example, the path does not exist or the calling process lacks write permission) or when the value entry is not found under the opened key.

Deleting a value entry is permanent. The value cannot be recovered through this API once removed.

> [!IMPORTANT] timeless
> The calling process must have write access to the target key. Standard user processes typically have write access under **HKEY_CURRENT_USER** but may require elevation for keys under **HKEY_LOCAL_MACHINE**.

### Example

This example removes the `"RunCount"` value from `HKEY_CURRENT_USER\Software\MyApp`. If the value does not exist or the key cannot be opened, the call returns **False** and no error is raised.

```tb check_build
Dim reg As New RegCls
Dim bDeleted As BOOL

bDeleted = reg.DeleteValue(HKEY_CURRENT_USER, "Software\MyApp", "RunCount")
If bDeleted Then
    MsgBox "Value deleted."
Else
    MsgBox "Value not found or could not be deleted."
End If
```

### See Also

- [WriteString](WriteString) method
- [WriteDWORD](WriteDWORD) method
- [ValueExists](ValueExists) method
- [DeleteKey](DeleteKey) method
