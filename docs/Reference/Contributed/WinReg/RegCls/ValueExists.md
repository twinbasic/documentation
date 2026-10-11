---
title: ValueExists
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/ValueExists
has_toc: false
---
# ValueExists
{: .no_toc }

Returns **True** if a named value exists under the specified registry key.

Syntax: *object*.**ValueExists**( *RootKey*, *KeyPath*, *ValueName* )

*RootKey*
: *required* A **RegKeyspace** value identifying the root hive to search, such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** giving the path of the key beneath *RootKey*, using backslash as the separator---for example, `"Software\MyApp"`.

*ValueName*
: *required* A **String** naming the value entry to look up within the key.

## Remarks

**ValueExists** opens the registry key identified by *RootKey* and *KeyPath* with query access, then calls `RegQueryValueEx` against *ValueName* without reading the value's data, then closes the key handle. If the key cannot be opened, or the named value does not exist, the function returns **False**; otherwise it returns **True**.

The function tests only for the presence of the named value; it does not return or validate the value's data or type. To read the value after confirming its existence, call [**ReadString**](ReadString) or [**ReadDWORD**](ReadDWORD).

To test whether a key itself exists---rather than a value within it---use [**KeyExists**](KeyExists).

### Example

This example checks whether a user preference value is present before reading it.

```tb
Dim reg As New RegCls

If reg.ValueExists(HKEY_CURRENT_USER, "Software\MyApp", "UserName") Then
    Dim sName As String
    sName = reg.ReadString(HKEY_CURRENT_USER, "Software\MyApp", "UserName")
    MsgBox "Welcome, " & sName
Else
    MsgBox "No user name stored."
End If
```

### See Also

- [KeyExists](KeyExists) function
- [ReadString](ReadString) function
- [ReadDWORD](ReadDWORD) function
