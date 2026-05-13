---
title: Building a browser shell
parent: CEF
grand_parent: Tutorials
nav_order: 4
permalink: /Tutorials/CEF/Building-A-Browser-Shell
---

# Building a browser shell

A short worked tutorial: turn a [**CefBrowser**](../../tB/Packages/CEF/CefBrowser/) control into a working browser with an address bar, back / forward / reload buttons, zoom, and a few helpers (DevTools, PDF export).

The complete project ships as *Sample 1b — Chromium Embedded Framework Examples* in the New-Project dialog (form *Example 1*). This tutorial walks through its key pieces.

## The form

Drop a [**CefBrowser**](../../tB/Packages/CEF/CefBrowser/) control onto a Form and rename it `WebView`. Around it, add a `TextBox` named `AddressBar` plus six `CommandButton`s — `btnBack`, `btnForward`, `btnRefresh`, `btnZoomIn`, `btnZoomOut`, `btnPDF`, `btnDevTools`.

## Navigating

The bare-bones navigation surface — [**Navigate**](../../tB/Packages/CEF/CefBrowser/#navigate), [**GoBack**](../../tB/Packages/CEF/CefBrowser/#goback), [**GoForward**](../../tB/Packages/CEF/CefBrowser/#goforward), [**Reload**](../../tB/Packages/CEF/CefBrowser/#reload) — is one-liners:

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

To make the back / forward buttons follow the actual history state, sync them against [**CanGoBack**](../../tB/Packages/CEF/CefBrowser/#cangoback) and [**CanGoForward**](../../tB/Packages/CEF/CefBrowser/#cangoforward) after every navigation:

```tb
Private Sub WebView_NavigationComplete( _
        ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long) _
        Handles WebView.NavigationComplete
    btnBack.Enabled = WebView.CanGoBack
    btnForward.Enabled = WebView.CanGoForward
End Sub
```

> [!NOTE]
> *IsSuccess* and *WebErrorStatus* are part of the event signature but currently return placeholder values (`True` and `0`) — use [**DocumentURL**](../../tB/Packages/CEF/CefBrowser/#documenturl) to confirm where the browser actually landed.

## The address bar

Pressing **Enter** in the address bar triggers a navigation. The reverse direction — keeping the visible URL in sync with the page — is the [**SourceChanged**](../../tB/Packages/CEF/CefBrowser/#sourcechanged) event, which fires whenever [**DocumentURL**](../../tB/Packages/CEF/CefBrowser/#documenturl) changes (including same-document `history.pushState` updates):

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

[**Navigate**](../../tB/Packages/CEF/CefBrowser/#navigate) requires a full URI with scheme — `http://`, `https://`, `file://`, … Unlike [**WebView2**](../../tB/Packages/WebView2/WebView2/#navigate), no automatic `https://` prefix is added when the scheme is missing.

## Zoom

[**ZoomFactor**](../../tB/Packages/CEF/CefBrowser/#zoomfactor) is a **Double** — `1.0` is 100%, `1.5` is 150%. The value reads as `0` until the browser has reached [**Ready**](../../tB/Packages/CEF/CefBrowser/#ready), so arithmetic that multiplies the current value silently starts from zero unless you clamp first:

```tb
Private Sub btnZoomIn_Click() Handles btnZoomIn.Click
    If WebView.ZoomFactor = 0 Then WebView.ZoomFactor = 1
    On Error Resume Next
    WebView.ZoomFactor *= 1.1
End Sub

Private Sub btnZoomOut_Click() Handles btnZoomOut.Click
    If WebView.ZoomFactor = 0 Then WebView.ZoomFactor = 1
    On Error Resume Next
    WebView.ZoomFactor /= 1.1
End Sub
```

The `On Error Resume Next` catches the "control not ready" error that fires when the button is clicked before [**Ready**](../../tB/Packages/CEF/CefBrowser/#ready) has fired.

## PDF export

[**PrintToPdf**](../../tB/Packages/CEF/CefBrowser/#printtopdf) saves the current document to disk asynchronously — the result surfaces as [**PrintToPdfCompleted**](../../tB/Packages/CEF/CefBrowser/#printtopdfcompleted) or [**PrintToPdfFailed**](../../tB/Packages/CEF/CefBrowser/#printtopdffailed):

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

The optional parameters that follow *outputPath* — [**cefPrintOrientation**](../../tB/Packages/CEF/Enumerations/cefPrintOrientation), page size in microns, margins, header/footer toggles — let the host override Chromium's defaults. See the [**PrintToPdf** reference](../../tB/Packages/CEF/CefBrowser/#printtopdf) for the full signature.

## DevTools

The Chromium DevTools window opens in its own top-level window:

```tb
Private Sub btnDevTools_Click() Handles btnDevTools.Click
    WebView.OpenDevToolsWindow()
End Sub
```

The CEF package does not currently expose **WebView2**'s **OpenTaskManagerWindow** equivalent — see the [WebView2 parity](../../tB/Packages/CEF/#webview2-parity) section of the reference for the current gap list.

## Form-title sync

To make the host window's caption track the page's `<title>`, listen for [**DocumentTitleChanged**](../../tB/Packages/CEF/CefBrowser/#documenttitlechanged) and read [**DocumentTitle**](../../tB/Packages/CEF/CefBrowser/#documenttitle):

```tb
Private Sub WebView_DocumentTitleChanged() Handles WebView.DocumentTitleChanged
    Me.Caption = WebView.DocumentTitle
End Sub
```

## Where next

- [Hosting local web assets](Hosting-Local-Web-Assets) — serve HTML / JS / CSS from a folder without an HTTP server.
- [JavaScript interop](JavaScript-Interop) — pass values and method calls between BASIC and the page.
- [Re-entrancy](Re-entrancy) — the one thing to know about [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun) before you use it.
- [CefBrowser reference](../../tB/Packages/CEF/CefBrowser/) — every property, method, and event.
