---
title: CreateGUID
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/CreateGUID
---
# CreateGUID
{: .no_toc }

Generates a fresh GUID and returns it as a string.

Syntax: **CreateGUID()** **As String**

The result is a fresh, unique GUID of 36 characters in the form `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`, without braces --- the form the **InterfaceId** and **ClassId** attributes take. Each call returns a different value.

This is a thin wrapper over the operating system's GUID generator (`CoCreateGuid` on Windows). The resulting GUID is suitable for use as an interface or class identifier; it is not, however, a cryptographically random number --- do not use it where unpredictability matters.

### Example

```tb check_build
Debug.Print CreateGUID()
' 2A1B6F2C-4D9F-4D5E-9C8A-EE9C8B5F3DCE
```

### See Also

- [vbaCastObj](vbaCastObj) function
