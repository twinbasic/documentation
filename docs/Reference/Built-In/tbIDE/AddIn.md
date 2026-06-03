---
title: AddIn
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/AddIn
has_toc: false
---

# AddIn class
{: .no_toc }

The contract every addin's main class must implement. One read-only property --- [**Name**](#name) --- that the IDE reads to label the addin in error messages, log lines, and any addin-management UI added later. The IDE never creates an **AddIn** itself; the addin DLL constructs the object inside [`tbCreateCompilerAddin`](.#building-and-loading-an-addin) and returns it.

```tb
Private Class MyAddIn
    Implements AddIn

    Private WithEvents Host As Host

    Public Sub New(ByVal Host As Host)
        Set Me.Host = Host
    End Sub

    Private Property Get AddIn_Name() As String
        Return "My AddIn"
    End Property
End Class
```

The class implementing **AddIn** is also the natural place to hold every other `WithEvents` reference the addin uses ([**Host**](Host), each [**Button**](Button), each [**ToolWindow**](ToolWindow), an optional [**AddinTimer**](AddinTimer), …) --- its lifetime is tied to the addin's loaded state.

## Properties

### Name
{: .no_toc }

A short human-readable name for the addin. **String**, read-only. The IDE captures this once when the addin is loaded.

Syntax: *addIn*.**Name** **As String**
