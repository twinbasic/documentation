---
title: Tools
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/Tools
has_toc: false
---

# Tools module
{: .no_toc }

The module that holds the shared instances **ToolsStr** and **ToolsStream**. Its two public variables let a program write `ToolsStr.TrimEx(...)` and `ToolsStream.LoadFileAsText(...)` with no `New`, as it could when these two were modules of the package. The module has no procedures.

```tb check_build check_run
Debug.Print TypeName(ToolsStr)
Debug.Print TypeName(Tools.ToolsStr)
Debug.Print ToolsStr Is Tools.ToolsStr
Debug.Print TypeName(ToolsStream)
' Output:
' cToolsStr
' cToolsStr
' True
' cToolsStream
```

The two names can be written alone, as in the first line of the example, because the members of the module are found without the name of the module. The names `TBMANLIB.Tools.ToolsStr` and `TBMANLIB.ToolsStr` also work, and are needed when another package the project references has a member of the same name.

* TOC
{:toc}

## Members

### ToolsStr
{: .no_toc }

The shared [**cToolsStr**](cToolsStr), the string functions.

Syntax: **ToolsStr** **As cToolsStr**

A field, declared `Public ToolsStr As New cToolsStr`, created the first time it is used. The class has no fields, so sharing the instance shares no state.

### ToolsStream
{: .no_toc }

The shared [**cToolsStream**](cToolsStream), the file reader and writer.

Syntax: **ToolsStream** **As cToolsStream**

A field, declared `Public ToolsStream As New cToolsStream`, created the first time it is used. The package's own classes use this instance, [**cJson**](cJson) among them, so the open stream that the text functions leave behind is shared by the program and the package; see the warning on the page of [**cToolsStream**](cToolsStream).

## See Also

- [cToolsStr](cToolsStr) class -- string functions
- [cToolsStream](cToolsStream) class -- whole files as text or bytes
- [TBMAN](TBMAN) module -- the shared instances of the other classes
- [TBMANLIB](.) package -- overview
