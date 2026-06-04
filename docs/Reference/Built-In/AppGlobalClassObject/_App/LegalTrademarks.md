---
title: LegalTrademarks
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/LegalTrademarks
has_toc: false
---
# LegalTrademarks
{: .no_toc }

Returns the legal trademarks string from the compiled executable's version information. Read-only.

Syntax: *object*.**LegalTrademarks**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

The value is taken from the **Legal Trademarks** field in the project's version information, set in the twinBASIC project settings. When no value has been specified, an empty string is returned.

### Example

This example displays the legal trademarks string in a message box.

```tb
If Len(App.LegalTrademarks) > 0 Then
    MsgBox App.LegalTrademarks
End If
```

### See Also

- [LegalCopyright](LegalCopyright) property
- [CompanyName](CompanyName) property
- [FileDescription](FileDescription) property
- [ProductName](ProductName) property
