---
title: GetRegistryValueType
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/GetRegistryValueType
has_toc: false
---
# GetRegistryValueType
{: .no_toc }

Returns the data type of a named registry value without reading its data.

Syntax: *object*.**GetRegistryValueType**( *hKey*, *subKey*, *valueName* ) **As REGTYPES**

*hKey*
: *required* A **Long** holding a key handle, usually a predefined root key. Pass a `RegKeyspace` constant such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*subKey*
: *required* A **String** specifying the path to the registry key beneath *hKey*, for example `"Software\MyApp"`.

*valueName*
: *required* A **String** naming the value whose type is queried.

**GetRegistryValueType** opens *subKey* under *hKey* with `KEY_QUERY_VALUE` access, calls `RegQueryValueEx` to retrieve the type code without reading the value data, then closes the key. It returns a `REGTYPES` member identifying the data type stored under *valueName*---for example `REG_SZ`, `REG_DWORD`, or `REG_BINARY`.

If the key cannot be opened or the value query fails, the function returns `REGTYPES.REG_NONE`.

> [!NOTE]
> *hKey* is declared as **Long**, not as **RegKeyspace**. The two types are assignment-compatible in twinBASIC, so passing a `RegKeyspace` constant works without an explicit cast.

### Example

This example reads the data type of the `UserName` value under `HKEY_CURRENT_USER\Software\MyApp` and displays a message describing the type.

```tb
Dim reg As New RegCls
Dim t As REGTYPES

t = reg.GetRegistryValueType(HKEY_CURRENT_USER, "Software\MyApp", "UserName")

Select Case t
    Case REGTYPES.REG_SZ, REGTYPES.REG_EXPAND_SZ
        MsgBox "UserName is a string value."
    Case REGTYPES.REG_DWORD
        MsgBox "UserName is a DWORD value."
    Case REGTYPES.REG_NONE
        MsgBox "Value not found or key could not be opened."
    Case Else
        MsgBox "UserName has type code " & CStr(t) & "."
End Select
```

### See Also

- [ReadString](ReadString) method
- [ReadDWORD](ReadDWORD) method
- [ValueExists](ValueExists) method
