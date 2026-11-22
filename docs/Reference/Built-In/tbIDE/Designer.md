---
title: Designer
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Designer
has_toc: false
---

# Designer class
{: .no_toc }

The interface an addin implements for one tab of its designer. Its [**DesignerFactory**](DesignerFactory) makes one for each tab, and the IDE calls its methods as the tab opens, gets the file's bytes, becomes active or not, is saved and closes. Every method is the IDE telling the designer something: none returns a value.

```tb check_build
Private Class NotesDesigner
    Implements Designer
    Private Site As DesignerHost
    Private Box As HtmlElement

    Private Sub Designer_OnAttached(ByVal DesignerHost As DesignerHost)
        Set Site = DesignerHost
        Set Box = Site.RootDomElement.ChildDomElements.Add("box", "textarea")
        Box.Properties.style.width = "100%"
        Box.Properties.style.height = "100%"
        Box.AddEventListener("input", AddressOf BoxChanged)
    End Sub

    Private Sub Designer_OnFileDataChanged(ByRef byteData() As Byte)
        Box.Properties.value = StrConv(byteData, vbUnicode)
    End Sub

    Private Sub BoxChanged(ByVal e As HtmlEventProperties)
        Dim bytes() As Byte = StrConv(CStr(Box.Properties.value), vbFromUnicode)
        Site.SetFileData bytes
    End Sub

    Private Sub Designer_OnActivated(): End Sub
    Private Sub Designer_OnDeactivated(): End Sub
    Private Sub Designer_OnSaveCompleted(): End Sub
    Private Sub Designer_OnClosing(): End Sub
    Private Sub Designer_OnClosed(): End Sub
End Class
```

The designer keeps the [**DesignerHost**](DesignerHost) it is given, builds its page in the host's [**RootDomElement**](DesignerHost#rootdomelement), shows the bytes it is given, and gives the IDE the new bytes with [**SetFileData**](DesignerHost#setfiledata) at each change.

* TOC
{:toc}

## The order of the calls

| When | The calls |
|---|---|
| A file opens in the designer | [**DesignerFactory.CreateDesigner**](DesignerFactory#createdesigner), [**OnAttached**](#onattached), [**OnActivated**](#onactivated), [**OnFileDataChanged**](#onfiledatachanged). When another designer's tab was the active one, its **OnDeactivated** comes between **OnAttached** and **OnActivated**. |
| Another tab is chosen, and then this one again | [**OnDeactivated**](#ondeactivated); later **OnActivated**. |
| The project is saved, or the tab with <kbd>Ctrl</kbd>+<kbd>S</kbd> | [**OnSaveCompleted**](#onsavecompleted). |
| A tab with no changes is closed | [**OnClosing**](#onclosing), **OnDeactivated**, [**OnClosed**](#onclosed). |
| A tab with changes is closed, and the user answers **Discard Changes** | **OnClosing**, **OnDeactivated**, **OnClosed**. The file keeps the bytes it was saved with. |
| A tab with changes is closed, and the user answers **Save** | **OnDeactivated**, **OnClosed**, then **OnSaveCompleted**. There is no **OnClosing**. |
| The compiler restarts | The designer is gone with the compiler. The addin is loaded again, and for each tab of its designers the IDE calls **CreateDesigner**, **OnAttached** and **OnFileDataChanged**, with the tab's bytes, the changes not saved yet included. There is no **OnActivated**, though the tab may be the active one. |

**OnActivated** comes before the first **OnFileDataChanged**, so a designer has to be ready for it with no data yet.

## Methods

### OnActivated
{: .no_toc }

The tab has become the active editor.

Syntax: *designer*.**OnActivated**()

### OnAttached
{: .no_toc }

The tab has been made, and *DesignerHost* is the designer's way to it. The first call. Keep the host, and build the page here.

Syntax: *designer*.**OnAttached**( *DesignerHost* )

*DesignerHost*
: The tab. **As** [**DesignerHost**](DesignerHost).

### OnClosed
{: .no_toc }

The tab has been closed. The last call. Let go of what the designer holds: its elements, its timers, its connections.

Syntax: *designer*.**OnClosed**()

### OnClosing
{: .no_toc }

The tab is closing without a save: it had no changes, or the user chose **Discard Changes**. A tab closed with **Save** gets no **OnClosing**.

Syntax: *designer*.**OnClosing**()

### OnDeactivated
{: .no_toc }

The tab is no longer the active editor: another tab has been chosen, or the tab is closing.

Syntax: *designer*.**OnDeactivated**()

### OnFileDataChanged
{: .no_toc }

The bytes of the file, for the designer to show. The IDE calls it as the file opens, and again after a restart of the compiler. It is not called after the designer's own [**SetFileData**](DesignerHost#setfiledata), nor after a save.

Syntax: *designer*.**OnFileDataChanged**( *byteData* )

*byteData*
: The file's bytes. **Byte()**, passed **ByRef**. A new, empty file gives an array with no elements: test it with an error handler round `UBound`, as Samples 24 and 25 do.

### OnSaveCompleted
{: .no_toc }

The file has been written with the bytes the designer gave last. A designer that marks its changes can clear the marks here.

Syntax: *designer*.**OnSaveCompleted**()

## See Also

- [DesignerFactory](DesignerFactory) class
- [DesignerHost](DesignerHost) class
- [Designers.Register](Designers#register) method
