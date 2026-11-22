---
title: UnsupportedHostAddin
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/UnsupportedHostAddin
has_toc: false
---

# UnsupportedHostAddin class
{: .no_toc }

An [**AddIn**](AddIn) that does nothing, for an addin to return from `tbCreateCompilerAddin` when the IDE is too old for what it uses. It is a class of the package, compiled into the addin, so it can be created with `New` whatever IDE loads the addin.

```tb hidden
' Context for the sample below: the addin's own class.
Private Class MyAddIn
    Implements AddIn

    Public Sub New(ByVal Host As Host)
    End Sub

    Private Property Get AddIn_Name() As String
        Return "My AddIn"
    End Property
End Class
```

```tb check_build
Module MainModule
    [DllExport]
    Public Function tbCreateCompilerAddin(ByVal Host As Host) As AddIn
        ' Designers and Menus came with BETA 1045.
        If CLng(Split(Host.CompilerVersion, ".")(2)) < 1045 Then
            Return New UnsupportedHostAddin()
        End If
        Return New MyAddIn(Host)
    End Function
End Module
```

The third number of [**Host.CompilerVersion**](Host#compilerversion) is the number of the BETA: `"0.15.1045"` for BETA 1045. Samples 24 to 27 check it this way.

Returning an object, rather than **Nothing**, loads the addin quietly: an addin whose `tbCreateCompilerAddin` returns **Nothing** fails to load, and the DEBUG CONSOLE says so (see [When an addin does not load](../../IDE/AddIns/#when-an-addin-does-not-load)). An addin that returns an **UnsupportedHostAddin** adds nothing to the IDE, and the DEBUG CONSOLE says nothing about it.

## Properties

### Name
{: .no_toc }

An empty string. **String**, read-only. The **Add-Ins** menu shows the addin as a separator line.

## See Also

- [AddIn](AddIn) class
- [Host.CompilerVersion](Host#compilerversion) property
