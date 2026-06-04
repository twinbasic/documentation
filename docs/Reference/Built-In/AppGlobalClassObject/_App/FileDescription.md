---
title: FileDescription
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/FileDescription
has_toc: false
---
# FileDescription
{: .no_toc }

Returns the file description string from the project's version information. Read-only.

Syntax: *object*.**FileDescription**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**FileDescription** returns the value set in the project's **File Description** version-info field. This is the human-readable description of the executable that appears in Windows Explorer's file properties dialog. When no description has been set in the project settings, the property returns an empty string.

### Example

This example displays the file description in a message box.

```tb
MsgBox "File description: " & App.FileDescription
```

### See Also

- [ProductName](ProductName) property
- [CompanyName](CompanyName) property
- [LegalCopyright](LegalCopyright) property
- [Comments](Comments) property
