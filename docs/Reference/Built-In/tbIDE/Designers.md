---
title: Designers
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Designers
has_toc: false
---

# Designers class
{: .no_toc }

The registry of the designers that addins supply. A designer is an editor of the addin's own for a kind of file: the IDE opens the file in a tab, as it opens a code file, and the addin draws the tab's contents and gives the IDE the file's new bytes. Reached through [**Host.Designers**](Host#designers).

An addin supplies a designer in three parts:

- a class that implements [**DesignerFactory**](DesignerFactory), whose [**CreateDesigner**](DesignerFactory#createdesigner) makes one designer for each tab;
- a class that implements [**Designer**](Designer), whose methods the IDE calls as the tab opens, gets the file's bytes, becomes active and closes;
- a call to [**Register**](#register), which names the designer and the files it is for.

```tb check_build
Private Class HexAddin
    Implements AddIn
    Public WithEvents Host As Host

    Public Sub New(ByVal Host As Host)
        Set Me.Host = Host
    End Sub

    Private Property Get AddIn_Name() As String
        Return "Hex"
    End Property

    Private Sub Host_OnProjectLoaded()
        Host.Designers.Register "Hex view", ".bin", New HexFactory, IsDefault:=True
        Host.Designers.Register "Hex view", ".*", New HexFactory
    End Sub
End Class

Private Class HexFactory
    Implements DesignerFactory

    Private Function DesignerFactory_CreateDesigner() As Designer
        Return New HexDesigner
    End Function
End Class

Private Class HexDesigner
    Implements Designer
    Private Site As DesignerHost

    Private Sub Designer_OnAttached(ByVal DesignerHost As DesignerHost)
        Set Site = DesignerHost
    End Sub

    Private Sub Designer_OnFileDataChanged(ByRef byteData() As Byte)
        Site.RootDomElement.Properties.innerText = "bytes: " & (UBound(byteData) - LBound(byteData) + 1)
    End Sub

    Private Sub Designer_OnActivated(): End Sub
    Private Sub Designer_OnDeactivated(): End Sub
    Private Sub Designer_OnSaveCompleted(): End Sub
    Private Sub Designer_OnClosing(): End Sub
    Private Sub Designer_OnClosed(): End Sub
End Class
```

A `.bin` file opens in the designer when it is double-clicked in the **Project Explorer**, and every other file offers it in the **Project Explorer**'s **Open with** submenu. Samples 24, 25 and 27 are designers: the [Hex Editor](../../IDE/AddIns/HexEditor), the [ICO Designer](../../IDE/AddIns/IcoEditor) and the [Data Explorer](../../IDE/AddIns/DataExplorer).

* TOC
{:toc}

## Methods

### Register
{: .no_toc }

Offers a designer for the files whose extension matches.

Syntax: *designers*.**Register** *Name*, *Extension*, *Factory* [, *IsDefault* ] [, *IconData* ]

*Name*
: *required* The designer's name, as the **Open with** submenu lists it. **String**.

*Extension*
: *required* The files it is for, as an extension with its dot: `".bin"`. **String**. Upper and lower case are the same, so `".bin"` is also `DATA.BIN`. An extension without its dot, `"bin"`, matches no file. A `*` matches any text, so `".*"` is every file, a code file included.

*Factory*
: *required* The object that makes a designer for each tab. **As** [**DesignerFactory**](DesignerFactory).

*IsDefault*
: *optional* **True** to open a matching file in this designer when it is double-clicked. **Boolean**. With **False**, the default, the designer is offered only in the **Open with** submenu.

*IconData*
: *optional* The designer's icon: the text of an SVG picture, or the bytes of a PNG picture as a **Byte()** array. **Variant**. The text must start with `<svg`: an SVG with an `<?xml ...?>` line in front is not drawn. The **Open with** submenu shows the icon, and for the default designer, so do the file's row in the **Project Explorer** and its tab.

The **Open with** submenu lists every designer whose extension matches the file, in the order they were registered. A double-click uses a default designer only: a file that only a designer registered with *IsDefault* **False** matches opens as text, as before. A file the IDE has its own editor for opens in that editor whatever designer is the default: a `.twin`, `.bas` or `.cls` file, a form or a report, an image, the project's `Settings`, and its references. When two designers are the default for one file, the one registered first is used.

### Unregister
{: .no_toc }

Withdraws the designer registered for an extension.

Syntax: *designers*.**Unregister** *Extension*

*Extension*
: *required* The extension, as it was given to [**Register**](#register). **String**.

<!-- test: bug designers-unregister-crash, lane addin:designers -->
> [!WARNING] BETA 1045
> **Unregister** ends the compiler with an access violation, whatever the extension, and an error handler does not stop it. The compiler restarts and loads the addin again, so an addin that calls **Unregister** as it loads ends every compiler that loads it. Do not call it. A restart of the compiler withdraws every designer, and the addin registers its own again as it loads.

## See Also

- [Designer](Designer) class
- [DesignerFactory](DesignerFactory) class
- [DesignerHost](DesignerHost) class
- [Host.Designers](Host#designers) property
