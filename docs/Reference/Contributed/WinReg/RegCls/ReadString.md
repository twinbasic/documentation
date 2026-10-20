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
: *required* A [**RegKeyspace**](../RegKeyspace) value identifying the root hive to open. Common values are `HKEY_CURRENT_USER` and `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** giving the path to the registry key beneath *RootKey*, using backslashes as separators (for example, `"Software\MyApp"`).

*ValueName*
: *required* A **String** naming the value entry to read within the key.

*DefaultValue*
: *optional* A **String** to return when the key cannot be opened, the named value does not exist, or the value is not of type **REG_SZ**. Defaults to `""` (empty string) when omitted.

Returns a **String** containing the data stored in the registry value, or *DefaultValue* if the value cannot be read.

> [!WARNING] 1.0.1.1
> The string that **ReadString** returns is longer than the stored text. For a text of *n* characters the result has 2*n* + 1: the text, then *n* + 1 NUL characters (`Chr(0)`). The method cuts its buffer to the size that `RegQueryValueEx` reports, less one, and that size counts bytes while a character of the buffer is two bytes. `ReadString(...) = "Alice"` is therefore **False** for a stored `Alice`, and a stored empty string comes back as one NUL character. A *DefaultValue* is returned as it is, with no NUL characters. To get the text, cut the result at the first NUL, as the second example does.

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

This example cuts the result at the first NUL character, which leaves the stored text, or the default:

```tb
Dim Reg As New RegCls
Dim UserName As String

UserName = Reg.ReadString(HKEY_CURRENT_USER, "Software\MyApp", "UserName", "DefaultUser")
UserName = Split(UserName, vbNullChar)(0)
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
