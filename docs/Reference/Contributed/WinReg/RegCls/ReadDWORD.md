---
title: ReadDWORD
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/ReadDWORD
has_toc: false
---
# ReadDWORD
{: .no_toc }

Reads a **REG_DWORD** value from the Windows registry and returns it as a **Long**.

Syntax: *object*.**ReadDWORD** ( *RootKey*, *KeyPath*, *ValueName* [ , *DefaultValue* ] )

*RootKey*
: *required* A **RegKeyspace** constant identifying the registry hive to read from, such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** giving the path to the registry key, relative to *RootKey*. Components are separated by backslashes---for example, `"Software\MyApp\Settings"`.

*ValueName*
: *required* A **String** naming the registry value to read within the key identified by *RootKey* and *KeyPath*.

*DefaultValue*
: *optional* A **Long** returned when the key cannot be opened, when *ValueName* does not exist, or when the stored value is not of type **REG_DWORD**. Defaults to `-1` when omitted.

Returns the **Long** stored in the named **REG_DWORD** registry value, or *DefaultValue* if the value cannot be read.

### Remarks

**ReadDWORD** opens the key identified by *RootKey* and *KeyPath* with `KEY_QUERY_VALUE` access, queries *ValueName* using `RegQueryValueEx`, then closes the key. If the key cannot be opened or if the stored type is not **REG_DWORD**, the function returns *DefaultValue* without raising an error.

The function uses `On Error Resume Next` internally, so registry errors are suppressed. Check the return value against *DefaultValue* to detect a read failure, keeping in mind that the stored value itself might coincidentally equal *DefaultValue*.

Registry DWORD values are 32-bit unsigned integers; the Windows API stores them in a four-byte buffer. The **Long** type used for the return value and *DefaultValue* is a 32-bit signed integer in twinBASIC. Values between `&H80000000` and `&HFFFFFFFF` will therefore appear as negative numbers when stored in a **Long**.

### Example

This example reads a run-count value from the registry, increments it, and writes it back.

```tb
Dim reg As New RegCls
Dim RunCount As Long

RunCount = reg.ReadDWORD(HKEY_CURRENT_USER, "Software\MyApp", "RunCount", 0)
RunCount = RunCount + 1
reg.WriteDWORD HKEY_CURRENT_USER, "Software\MyApp", "RunCount", RunCount

Debug.Print "Application has been run " & RunCount & " time(s)."
```

### See Also

- [ReadString](ReadString) function
- [WriteDWORD](WriteDWORD) function
