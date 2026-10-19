---
title: RegKeyspace
parent: WinReg Package
permalink: /tB/Packages/Contributed/WinReg/RegKeyspace
has_toc: false
---

# RegKeyspace enumeration
{: .no_toc }

Names the predefined root keys of the registry.

**RegKeyspace** is the type of the *RootKey* parameter of [**ReadString**](RegCls/ReadString), [**ReadDWORD**](RegCls/ReadDWORD), [**WriteString**](RegCls/WriteString), [**WriteDWORD**](RegCls/WriteDWORD), [**DeleteValue**](RegCls/DeleteValue), [**DeleteKey**](RegCls/DeleteKey), [**DeleteKeyEx**](RegCls/DeleteKeyEx), [**KeyExists**](RegCls/KeyExists), [**ValueExists**](RegCls/ValueExists) and [**CreateKey**](RegCls/CreateKey). [**EnumValues**](RegCls/EnumValues) and [**GetRegistryValueType**](RegCls/GetRegistryValueType) declare the same argument as a **Long** and take the same constants.

The enumeration is declared inside the [**RegCls**](RegCls/) class, and its members are written without the class: `RegKeyspace.HKEY_CURRENT_USER`, or `HKEY_CURRENT_USER` alone. The form `RegCls.RegKeyspace.HKEY_CURRENT_USER` is refused (TB5027).

| Constant | Value | Description |
|----------|-------|-------------|
| **HKEY_CLASSES_ROOT**{: #HKEY_CLASSES_ROOT } | `&H80000000` | File-type associations and COM class registrations. |
| **HKEY_CURRENT_USER**{: #HKEY_CURRENT_USER } | `&H80000001` | The settings of the user who runs the program. |
| **HKEY_LOCAL_MACHINE**{: #HKEY_LOCAL_MACHINE } | `&H80000002` | The settings of the computer. Writing under it typically requires administrator rights. |
| **HKEY_USERS**{: #HKEY_USERS } | `&H80000003` | The profiles of the users loaded on the computer. |
| **HKEY_PERFORMANCE_DATA**{: #HKEY_PERFORMANCE_DATA } | `&H80000004` | The performance data of the system, which Windows serves through the registry functions. |
| **HKEY_PERFORMANCE_TEXT**{: #HKEY_PERFORMANCE_TEXT } | `&H80000050` | The names and explanations of the performance counters. |
| **HKEY_PERFORMANCE_NLSTEXT**{: #HKEY_PERFORMANCE_NLSTEXT } | `&H80000060` | The national-language variant of **HKEY_PERFORMANCE_TEXT**. |
| **HKEY_CURRENT_CONFIG**{: #HKEY_CURRENT_CONFIG } | `&H80000005` | The hardware profile that the computer uses. |
| **HKEY_DYN_DATA**{: #HKEY_DYN_DATA } | `&H80000006` | Dynamic data of Windows 95, 98 and Me. Later versions of Windows do not have this key. |
| **HKEY_CURRENT_USER_LOCAL_SETTINGS**{: #HKEY_CURRENT_USER_LOCAL_SETTINGS } | `&H80000007` | The local settings of the current user. |

The high bit of every value is set, so each value is a negative **Long**: `CLng(RegKeyspace.HKEY_CURRENT_USER)` is -2147483647.

```tb
Debug.Print Hex$(RegKeyspace.HKEY_CLASSES_ROOT)   ' 80000000
Debug.Print Hex$(RegKeyspace.HKEY_CURRENT_USER)   ' 80000001
Debug.Print CLng(RegKeyspace.HKEY_CURRENT_USER)   ' -2147483647
```

The **WinDevLib** package declares an enumeration of the same name with the same members and values. A project that references both **WinReg** and **WinDevLib** has two enumerations named **RegKeyspace**, and `WinReg.RegKeyspace` names this one. A member of either is accepted as an argument of a **RegCls** method.

```tb
Dim reg As New RegCls
Dim root As WinReg.RegKeyspace

root = WinReg.RegKeyspace.HKEY_CURRENT_USER
Debug.Print reg.KeyExists(root, "Software\Microsoft")
Debug.Print reg.KeyExists(WinDevLib.RegKeyspace.HKEY_LOCAL_MACHINE, "SOFTWARE")
```

## See Also

- [RegCls](RegCls/) class -- the methods that take a root key
- [enumRegSzType](enumRegSzType) enumeration -- the codes of the value types
- [WinReg package](./) -- overview
