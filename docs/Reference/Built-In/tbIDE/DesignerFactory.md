---
title: DesignerFactory
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/DesignerFactory
has_toc: false
---

# DesignerFactory class
{: .no_toc }

The interface an addin implements to make its designers. The addin passes an object of its own class to [**Designers.Register**](Designers#register), and the IDE calls [**CreateDesigner**](#createdesigner) on it each time it opens a file in that designer.

```tb hidden
' Context for the sample below: the designer it makes.
Private Class HexDesigner
    Implements Designer
    Private Owner As Object

    Public Sub New(ByVal Owner As Object)
        Set Me.Owner = Owner
    End Sub

    Private Sub Designer_OnAttached(ByVal DesignerHost As DesignerHost): End Sub
    Private Sub Designer_OnFileDataChanged(ByRef byteData() As Byte): End Sub
    Private Sub Designer_OnActivated(): End Sub
    Private Sub Designer_OnDeactivated(): End Sub
    Private Sub Designer_OnSaveCompleted(): End Sub
    Private Sub Designer_OnClosing(): End Sub
    Private Sub Designer_OnClosed(): End Sub
End Class
```

```tb check_build
Private Class HexFactory
    Implements DesignerFactory
    Private Owner As Object

    Public Sub New(ByVal Owner As Object)
        Set Me.Owner = Owner
    End Sub

    Private Function DesignerFactory_CreateDesigner() As Designer
        Return New HexDesigner(Owner)
    End Function
End Class
```

A factory usually holds the addin's own object, as here, and hands it to each designer it makes, so that the designer can reach the [**Host**](Host) and the addin's settings. Write `Set Me.Owner = Owner` when the parameter has the field's name: without `Me.`, the parameter is set to itself and the field stays **Nothing**.

* TOC
{:toc}

## Methods

### CreateDesigner
{: .no_toc }

Returns a new designer for one tab. The IDE calls it as it opens a file in the designer, and again for each designer tab that is open when the compiler restarts.

Syntax: *factory*.**CreateDesigner**() **As** [**Designer**](Designer)

Return a new object each time: each tab has a designer of its own.

## See Also

- [Designers.Register](Designers#register) method
- [Designer](Designer) class
