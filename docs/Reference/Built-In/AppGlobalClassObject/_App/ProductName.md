---
title: ProductName
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/ProductName
has_toc: false
---
# ProductName
{: .no_toc }

Returns the product name stored in the project's version information. Read-only.

Syntax: *object*.**ProductName**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

The value is taken from the Product Name field in the project's version information, as set in the twinBASIC project settings. When the field has not been filled in, **ProductName** returns an empty string.

### Example

This example shows the product name in a message box.

```tb
MsgBox "Product: " & App.ProductName
```

### See Also

- [CompanyName](CompanyName) property
- [FileDescription](FileDescription) property
- [LegalCopyright](LegalCopyright) property
- [LegalTrademarks](LegalTrademarks) property
