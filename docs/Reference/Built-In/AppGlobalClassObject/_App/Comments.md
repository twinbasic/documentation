---
title: Comments
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/Comments
has_toc: false
---
# Comments
{: .no_toc }

Returns the Comments string from the project's version information. Read-only.

Syntax: *object*.**Comments**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**Comments** returns the text entered in the **Comments** field of the project's version information. This field is embedded in the compiled executable's `VS_VERSION_INFO` resource and is typically used to record build notes or other free-form text about the release. When running inside the twinBASIC IDE, the value is read from the current project settings.

### Example

This example prints the project's comments string to the debug console.

```tb
Debug.Print "Comments: " & App.Comments
```

### See Also

- [Title](Title) property
- [FileDescription](FileDescription) property
- [LegalCopyright](LegalCopyright) property
- [LegalTrademarks](LegalTrademarks) property
- [CompanyName](CompanyName) property
- [ProductName](ProductName) property
