---
title: enumRegSzType
parent: WinReg Package
permalink: /tB/Packages/Contributed/WinReg/enumRegSzType
has_toc: false
---

# enumRegSzType enumeration
{: .no_toc }

Names the type codes that the registry stores with a value to say what its data is.

No parameter, property or return value of [**RegCls**](RegCls/) has the type **enumRegSzType**. [**GetRegistryValueType**](RegCls/GetRegistryValueType) returns the **REGTYPES** enumeration of **WinDevLib**, which has the same codes, adds `REG_QWORD` (11), and spells the ninth member `REG_FULL_RESOURCE_DESCRIPTOR`.

The enumeration is declared inside the **RegCls** class, and its members are written without the class: `enumRegSzType.REG_SZ`, or `REG_SZ` alone. The form `RegCls.enumRegSzType.REG_SZ` is refused (TB5027). A project that references **WinDevLib** as well also has **REGTYPES**, with members of the same names.

| Constant | Value | Description |
|----------|-------|-------------|
| **REG_SZ**{: #REG_SZ } | 1 | A string that ends with a null character. [**ReadString**](RegCls/ReadString) reads this type only. |
| **REG_EXPAND_SZ**{: #REG_EXPAND_SZ } | 2 | A string that ends with a null character and can contain unexpanded references to environment variables, such as `%PATH%`. |
| **REG_BINARY**{: #REG_BINARY } | 3 | Binary data of any form. |
| **REG_DWORD**{: #REG_DWORD } | 4 | A 32-bit number. [**ReadDWORD**](RegCls/ReadDWORD) reads this type only. |
| **REG_NONE**{: #REG_NONE } | 0 | No type. |
| **REG_DWORD_LITTLE_ENDIAN**{: #REG_DWORD_LITTLE_ENDIAN } | 4 | A 32-bit number with the least significant byte first. The same code as **REG_DWORD**. |
| **REG_DWORD_BIG_ENDIAN**{: #REG_DWORD_BIG_ENDIAN } | 5 | A 32-bit number with the most significant byte first. |
| **REG_LINK**{: #REG_LINK } | 6 | A Unicode string that names a symbolic link. |
| **REG_MULTI_SZ**{: #REG_MULTI_SZ } | 7 | A sequence of strings that each end with a null character, closed by an empty string. |
| **REG_RESOURCE_LIST**{: #REG_RESOURCE_LIST } | 8 | A list of the hardware resources of a device driver. |
| **REG_FULL_RESOURCE_DEscription**{: #REG_FULL_RESOURCE_DEscription } | 9 | A full description of the hardware resources of a device. The member is spelled `REG_FULL_RESOURCE_DEscription` in the package. |
| **REG_RESOURCE_REQUIREMENTS_LIST**{: #REG_RESOURCE_REQUIREMENTS_LIST } | 10 | A list of the hardware resources that a device driver requires. |

[**EnumValues**](RegCls/EnumValues) converts the data of **REG_SZ**, **REG_EXPAND_SZ**, **REG_DWORD**, **REG_DWORD_LITTLE_ENDIAN**, **REG_DWORD_BIG_ENDIAN** and **REG_BINARY** values to text, and gives `"Unsupported type: "` and the code for every other type.

```tb
Debug.Print enumRegSzType.REG_SZ         ' 1
Debug.Print enumRegSzType.REG_DWORD      ' 4
Debug.Print enumRegSzType.REG_MULTI_SZ   ' 7
```

## See Also

- [RegKeyspace](RegKeyspace) enumeration -- the root keys
- [GetRegistryValueType](RegCls/GetRegistryValueType) method -- the type code of a value
- [EnumValues](RegCls/EnumValues) method -- the values of a key as text
- [WinReg package](./) -- overview
