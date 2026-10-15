---
title: CdlOFNShareViResultConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlOFNShareViResultConstants
---

# CdlOFNShareViResultConstants enumeration
{: .no_toc }

Tells the File Open or File Save dialog how to answer a network sharing violation.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `OFN_SHAREWARN`, `OFN_SHARENOWARN` and `OFN_SHAREFALLTHROUGH` constants. An event handler sets one of them in the *Result* parameter of the [**FileShareViolation**](../CommonDialog#fileshareviolation) event.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlOFNShareViResultWarn**{: #CdlOFNShareViResultWarn } | `&H0` | The dialog shows its standard warning and stays open. This is the value when the handler sets nothing. |
| **CdlOFNShareViResultNoWarn**{: #CdlOFNShareViResultNoWarn } | `&H1` | The dialog shows no message and does not accept the file, so the handler can show a message of its own. |
| **CdlOFNShareViResultFallThrough**{: #CdlOFNShareViResultFallThrough } | `&H2` | The dialog accepts the file as if there were no violation and returns its name. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**FileShareViolation**](../CommonDialog#fileshareviolation) event (the *Result* parameter)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlOFNConstants](CdlOFNConstants) enumeration
