---
title: ReadString
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/ReadString
has_toc: false
---
# ReadString
{: .no_toc }

Reads a **REG_SZ** string value from the Windows registry and returns it as a **String**.

Syntax: *object*.**ReadString** ( *RootKey*, *KeyPath*, *ValueName* [, *DefaultValue* ] )

*RootKey*
: *required* A **RegKeyspace** value identifying the root hive to open. Common values are `HKEY_CURRENT_USER` and `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** giving the path to the registry key beneath *RootKey*, using backslashes as separators (for example, `"Software\MyApp"`).

*ValueName*
: *required* A **String** naming the value entry to read within the key.

*DefaultValue*
: *optional* A **String** to return when the key cannot be opened, the named value does not exist, or the value is not of type **REG_SZ**. Defaults to `""` (empty string) when omitted.

Returns a **String** containing the data stored in the registry value, or *DefaultValue* if the value cannot be read.

### Remarks

**ReadString** opens the specified key with `KEY_QUERY_VALUE` access, queries the size and type of the named value, reads the data into a string buffer, then closes the key handle. The key handle is closed whether the read succeeds or fails, provided the key was opened successfully.

If the named value exists but its registry type is not **REG_SZ**, **ReadString** returns *DefaultValue* without raising an error. Values of type **REG_EXPAND_SZ** (expandable strings containing environment-variable references) are not read by this function; use the Win32 `RegQueryValueEx` API directly if expansion is required.

The function uses `On Error Resume Next` internally. Errors from the Win32 registry API are detected by checking return codes rather than by raising twinBASIC run-time errors.

### Example

This example reads an application setting stored under `HKEY_CURRENT_USER`, falling back to a hard-coded default when the value is absent.

```tb
Dim Reg As New RegCls
Dim UserName As String

UserName = Reg.ReadString(HKEY_CURRENT_USER, "Software\MyApp", "UserName", "DefaultUser")
Debug.Print "User: " & UserName
```

This example checks whether a value was present by comparing the result against the default:

```tb
Dim Reg As New RegCls
Const NotFound As String = "<not found>"

Dim InstallDir As String
InstallDir = Reg.ReadString(HKEY_LOCAL_MACHINE, "Software\MyApp", "InstallDir", NotFound)

If InstallDir = NotFound Then
    MsgBox "MyApp does not appear to be installed."
Else
    MsgBox "Installed at: " & InstallDir
End If
```

### See Also

- [WriteString](WriteString) function
- [ReadDWORD](ReadDWORD) function
- [ValueExists](ValueExists) function
- [RegCls Class](.) class
