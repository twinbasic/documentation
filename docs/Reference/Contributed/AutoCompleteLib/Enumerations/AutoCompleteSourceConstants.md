---
title: AutoCompleteSourceConstants
parent: Enumerations
grand_parent: AutoCompleteLib Package
permalink: /tB/Packages/Contributed/AutoCompleteLib/Enumerations/AutoCompleteSourceConstants
---

# AutoCompleteSourceConstants enumeration
{: .no_toc }

Selects where the suggestions of an [**AutoComplete**](../AutoComplete) object come from.

The enumeration is declared inside the **AutoComplete** class, and its members are used without a qualifier, or with the name of the enumeration. The value is passed to the *Source* parameter of **Init**, which attaches the source to a text box.

| Member | Value | Description |
|:-------|:------|:------------|
| **AutoCompleteSourceNone**{: #AutoCompleteSourceNone } | `0` | Not a source. **Init** raises run-time error 380 for it. |
| **AutoCompleteSourceHistory**{: #AutoCompleteSourceHistory } | `1` | The shell history list. |
| **AutoCompleteSourceFileSystem**{: #AutoCompleteSourceFileSystem } | `2` | File-system paths. The [**AutoCompleteFileSystemOptionConstants**](AutoCompleteFileSystemOptionConstants) set in **FileSystemOptions** choose which objects are offered. |
| **AutoCompleteSourceMRU**{: #AutoCompleteSourceMRU } | `3` | The shell most-recently-used list. |
| **AutoCompleteSourceAll**{: #AutoCompleteSourceAll } | `4` | The history, the file system and the most-recently-used list together, in that order. |
| **AutoCompleteSourceCustomSource**{: #AutoCompleteSourceCustomSource } | `5` | The strings of the array set in **CustomSource**. |

## Used by

- [**AutoComplete**](../AutoComplete) class: [**Init**](../AutoComplete#init)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [AutoCompleteFileSystemOptionConstants](AutoCompleteFileSystemOptionConstants) enumeration
- [AutoComplete](../AutoComplete) class
