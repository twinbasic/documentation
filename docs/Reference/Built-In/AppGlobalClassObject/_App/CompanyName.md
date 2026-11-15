---
title: CompanyName
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/CompanyName
has_toc: false
---
# CompanyName
{: .no_toc }

Returns the company name stored in the project's version information. Read-only.

Syntax: *object*.**CompanyName**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

The value is taken from the **Company Name** field of the project's version information, set in [Project Settings](../../../IDE/Project-Settings#company-name). When the field has not been filled in, **CompanyName** returns an empty string.

### Example

This example shows the company name in a message box.

```tb check_build
MsgBox "Company: " & App.CompanyName
```

### See Also

- [ProductName](ProductName) property
- [FileDescription](FileDescription) property
- [LegalCopyright](LegalCopyright) property
- [LegalTrademarks](LegalTrademarks) property
