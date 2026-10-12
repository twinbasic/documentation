---
title: WinReg Package
parent: Experimental Packages
has_toc: false
indexed_from: 0.0.0.0
permalink: /tB/Packages/Contributed/WinReg/
---

# WinReg Package
{: .no_toc }

**Author:** forliny. **Version:** 0.0.0.0. **On GitHub:** [forliny/TbWinReg](https://github.com/forliny/TbWinReg)

The **WinReg** contributed package provides a Windows Registry helper class that reads, writes, deletes, and enumerates registry keys and values through the Win32 `advapi32` API. The package exposes a single **RegCls** class wrapping the most common registry operations into a convenient interface. It depends on types and API declarations from the **WinDevLib** package.

**WinReg** references the **WinDevLib** package, but a project does not see the names a package's own references declare. A project that names WinDevLib's root keys (`HKEY_CURRENT_USER`), value types (`REGTYPES`) or `BOOL`, as the examples here do, references **WinDevLib** as well. One that declares the **Dictionary** that [**EnumValues**](RegCls/EnumValues) returns references the Microsoft Scripting Runtime.

> [!NOTE]
> Version 0.0.0.0 does not compile in twinBASIC BETA 1005, so a project that references it does not build. **RegCls** passes `VarPtr(0&)` to two `ByRef` structure parameters of WinDevLib's declarations: *lpSecurityAttributes* of `RegCreateKeyEx` and *lpftLastWriteTime* of `RegEnumKeyEx`. A pointer passed for a structure has to be passed `ByVal` (error TB5001).

## Classes

- [RegCls](RegCls/) -- a Windows Registry helper class that reads, writes, deletes, and enumerates registry keys and values through the Win32 `advapi32` API
  - [ConvertValueToString](RegCls/ConvertValueToString) -- converts a registry value (from an open key handle or a byte array) to its String representation
  - [CreateKey](RegCls/CreateKey) -- creates a registry key, including any intermediate keys in the path that do not already exist
  - [DeleteKey](RegCls/DeleteKey) -- deletes a registry key that has no subkeys
  - [DeleteKeyEx](RegCls/DeleteKeyEx) -- recursively deletes a registry key and all of its subkeys and values
  - [DeleteValue](RegCls/DeleteValue) -- deletes a named value from a registry key
  - [EnumValues](RegCls/EnumValues) -- returns a Dictionary containing the names and string representations of all values under a registry key
  - [GetRegistryValueType](RegCls/GetRegistryValueType) -- returns the data type of a named registry value without reading its data
  - [KeyExists](RegCls/KeyExists) -- returns True if the specified registry key exists, False otherwise
  - [ReadDWORD](RegCls/ReadDWORD) -- reads a REG_DWORD value from the Windows registry and returns it as a Long
  - [ReadString](RegCls/ReadString) -- reads a REG_SZ string value from the Windows registry and returns it as a String
  - [ValueExists](RegCls/ValueExists) -- returns True if a named value exists under the specified registry key
  - [WriteDWORD](RegCls/WriteDWORD) -- writes a 32-bit integer value (REG_DWORD) to a registry key, creating the key if it does not already exist
  - [WriteString](RegCls/WriteString) -- writes a string value to a registry key, creating the key if it does not exist
