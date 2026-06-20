---
title: Building a browser shell
parent: WebView2
grand_parent: Tutorials
nav_order: 4
permalink: /Tutorials/WebView2/Building-A-Browser-Shell
---

# Building a browser shell

A short worked tutorial: turn a [**WebView2**](../../tB/Packages/WebView2/WebView2/) control into a working browser with an address bar, back / forward / reload buttons, zoom, and a few helpers (DevTools, Task Manager, PDF export).

The complete project ships as *Sample 0 --- WebView2 Examples* in the New-Project dialog (form *Example 1*). This tutorial describes its key pieces.

## The form

Drop a [**WebView2**](../../tB/Packages/WebView2/WebView2/) control onto a Form and rename it `WebView`. Around it, add a `TextBox` named `AddressBar` plus seven `CommandButton`s --- `btnBack`, `btnForward`, `btnRefresh`, `btnZoomIn`, `btnZoomOut`, `btnPDF`, `btnDevTools`, `btnTaskMgr`.

## Navigating

The bare-bones navigation methods --- [**Navigate**](../../tB/Packages/WebView2/WebView2/#navigate), [**GoBack**](../../tB/Packages/WebView2/WebView2/#goback), [**GoForward**](../../tB/Packages/WebView2/WebView2/#goforward), [**Reload**](../../tB/Packages/WebView2/WebView2/#reload) --- are one-liners:

```tb
Private Sub btnBack_Click() Handles btnBack.Click
    WebView.GoBack()
End Sub

Private Sub btnForward_Click() Handles btnForward.Click
    WebView.GoForward()
End Sub

Private Sub btnRefresh_Click() Handles btnRefresh.Click
    WebView.Reload()
End Sub
```

To make the back / forward buttons follow the actual history state, sync them against [**CanGoBack**](../../tB/Packages/WebView2/WebView2/#cangoback) and [**CanGoForward**](../../tB/Packages/WebView2/WebView2/#cangoforward) after every navigation:

```tb
Private Sub WebView_NavigationComplete( _
        ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long) _
        Handles WebView.NavigationComplete
    btnBack.Enabled = WebView.CanGoBack
    btnForward.Enabled = WebView.CanGoForward
End Sub
```

## The address bar

Pressing **Enter** in the address bar triggers a navigation. The reverse direction --- keeping the visible URL in sync with the page --- is the [**SourceChanged**](../../tB/Packages/WebView2/WebView2/#sourcechanged) event, which fires whenever [**DocumentURL**](../../tB/Packages/WebView2/WebView2/#documenturl) changes (including same-document `history.pushState` updates):

```tb
Private Sub AddressBar_KeyDown(KeyCode As Integer, Shift As Integer) _
        Handles AddressBar.KeyDown
    If KeyCode = vbKeyReturn Then WebView.Navigate AddressBar.Text
End Sub

Private Sub WebView_SourceChanged(ByVal IsNewDocument As Boolean) _
        Handles WebView.SourceChanged
    AddressBar.Text = WebView.DocumentURL
End Sub
```

[**Navigate**](../../tB/Packages/WebView2/WebView2/#navigate) accepts any URI string; if the scheme prefix is missing, `https://` is added automatically.

## Zoom

[**ZoomFactor**](../../tB/Packages/WebView2/WebView2/#zoomfactor) is a **Double** --- `1.0` is 100%, `1.5` is 150%. The design-time default is `0`, meaning *"don't override Edge's default of 1.0"* --- so multiplying by `1.1` from cold gives `0`, not `1.1`. Clamp to `1` before scaling:

```tb
Private Sub btnZoomIn_Click() Handles btnZoomIn.Click
    If WebView.ZoomFactor = 0 Then WebView.ZoomFactor = 1
    WebView.ZoomFactor *= 1.1
End Sub

Private Sub btnZoomOut_Click() Handles btnZoomOut.Click
    If WebView.ZoomFactor = 0 Then WebView.ZoomFactor = 1
    WebView.ZoomFactor /= 1.1
End Sub
```

## PDF export

[**PrintToPdf**](../../tB/Packages/WebView2/WebView2/#printtopdf) saves the current document to disk asynchronously --- the result arrives as [**PrintToPdfCompleted**](../../tB/Packages/WebView2/WebView2/#printtopdfcompleted) or [**PrintToPdfFailed**](../../tB/Packages/WebView2/WebView2/#printtopdffailed):

```tb
Private Sub btnPDF_Click() Handles btnPDF.Click
    Dim outputPath As String = _
        Environ$("USERPROFILE") & "\Documents\page.pdf"
    WebView.PrintToPdf(outputPath)
End Sub

Private Sub WebView_PrintToPdfCompleted() Handles WebView.PrintToPdfCompleted
    MsgBox "PDF saved.", vbInformation
End Sub
```

## DevTools and Task Manager

Both windows are one-shot --- call the matching method and Edge opens the window in its own process:

```tb
Private Sub btnDevTools_Click() Handles btnDevTools.Click
    WebView.OpenDevToolsWindow()
End Sub

Private Sub btnTaskMgr_Click() Handles btnTaskMgr.Click
    WebView.OpenTaskManagerWindow()
End Sub
```

[**OpenDevToolsWindow**](../../tB/Packages/WebView2/WebView2/#opendevtoolswindow) works even when [**AreDevToolsEnabled**](../../tB/Packages/WebView2/WebView2/#aredevtoolsenabled) is **False** (that setting only disables the user-initiated path --- keyboard shortcut and context menu).

## Form-title sync

To make the host window's caption track the page's `<title>`, listen for [**DocumentTitleChanged**](../../tB/Packages/WebView2/WebView2/#documenttitlechanged) and read [**DocumentTitle**](../../tB/Packages/WebView2/WebView2/#documenttitle):

```tb
Private Sub WebView_DocumentTitleChanged() Handles WebView.DocumentTitleChanged
    Me.Caption = WebView.DocumentTitle
End Sub
```

## Where next

- [Hosting local web assets](Hosting-Local-Web-Assets) -- serve HTML / JS / CSS from a folder without an HTTP server.
- [JavaScript interop](JavaScript-Interop) -- pass values and method calls between BASIC and the page.
- [WebView2 reference](../../tB/Packages/WebView2/WebView2/) -- every property, method, and event.
