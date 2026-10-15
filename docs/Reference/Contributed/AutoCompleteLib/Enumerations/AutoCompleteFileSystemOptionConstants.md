---
title: AutoCompleteFileSystemOptionConstants
parent: Enumerations
grand_parent: AutoCompleteLib Package
permalink: /tB/Packages/Contributed/AutoCompleteLib/Enumerations/AutoCompleteFileSystemOptionConstants
---

# AutoCompleteFileSystemOptionConstants enumeration
{: .no_toc }

Selects which file-system objects the file-system source offers as suggestions.

The enumeration is declared inside the [**AutoComplete**](../AutoComplete) class. The values are flags that can be combined with `Or`; each is the value of the Windows `ACLO_*` option of the same meaning. They apply to the sources [**AutoCompleteSourceFileSystem**](AutoCompleteSourceConstants#AutoCompleteSourceFileSystem) and [**AutoCompleteSourceAll**](AutoCompleteSourceConstants#AutoCompleteSourceAll). The members are used without a qualifier, or with the name of the enumeration.

| Member | Value | Description |
|:-------|:------|:------------|
| **AutoCompleteFileSystemOptionNone**{: #AutoCompleteFileSystemOptionNone } | `0` | No option is set. |
| **AutoCompleteFileSystemOptionCurrentDir**{: #AutoCompleteFileSystemOptionCurrentDir } | `1` | Includes the objects of the current directory. |
| **AutoCompleteFileSystemOptionMyComputer**{: #AutoCompleteFileSystemOptionMyComputer } | `2` | Includes the objects under *My Computer*, such as the drives. |
| **AutoCompleteFileSystemOptionDesktop**{: #AutoCompleteFileSystemOptionDesktop } | `4` | Includes the objects of the desktop. |
| **AutoCompleteFileSystemOptionFavorites**{: #AutoCompleteFileSystemOptionFavorites } | `8` | Includes the objects of the Favorites folder. |
| **AutoCompleteFileSystemOptionFileSysOnly**{: #AutoCompleteFileSystemOptionFileSysOnly } | `16` | Offers only file-system items, not the virtual shell folders. |
| **AutoCompleteFileSystemOptionFileSysDirs**{: #AutoCompleteFileSystemOptionFileSysDirs } | `32` | Offers only directories, not files. |

## Used by

- [**AutoComplete**](../AutoComplete) class: [**FileSystemOptions**](../AutoComplete#filesystemoptions)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [AutoCompleteSourceConstants](AutoCompleteSourceConstants) enumeration
- [AutoComplete](../AutoComplete) class
