---
title: Driving Monaco from twinBASIC
parent: WebView2
grand_parent: Tutorials
nav_order: 7
permalink: /Tutorials/WebView2/Driving-Monaco
---

# Driving Monaco from twinBASIC

A case study combining everything from the previous tutorials: a form with **two** [**WebView2**](../../tB/Packages/WebView2/WebView2/) controls --- the Microsoft Monaco editor on the left, a live HTML preview on the right. As the user types, Monaco posts the edited source to twinBASIC, which mirrors it into the preview pane.

The complete project ships as *Sample 0 --- WebView2 Examples* in the New-Project dialog (form *Example 3*).

## Architecture

![](Images/MonacoArchitecture.svg)

The editor runs as a local web app under a virtual hostname; the preview pane is fed raw HTML through [**NavigateToString**](../../tB/Packages/WebView2/WebView2/#navigatetostring).

## Setting up the editor's assets

The Monaco editor ships as a ~2 MB collection of JavaScript, CSS, and font files. Drop them into a `Resources` sub-folder of your project --- call it `MONACO_DEMO` --- alongside an `index.html` and a small bootstrap `script.js`. The [Hosting local web assets](Hosting-Local-Web-Assets) tutorial describes the layout.

The page itself is a single `<div id='container'>` plus the bootstrap script that listens for an *initial-content* message from the host:

```html
<!DOCTYPE html>
<html>
    <head>
        <script src="/vs/loader.js"></script>
        <script src="/script.js"></script>
        <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
        <div id="container"></div>
    </body>
</html>
```

```js
window.chrome.webview.addEventListener('message', (event) => {
    let initialHTML = event.data;

    require.config({ paths: { 'vs': 'https://monaco.example/vs' } });
    require(["vs/editor/editor.main"], () => {
        let editor = monaco.editor.create(document.getElementById('container'), {
            value: initialHTML,
            language: 'html',
            theme: 'vs-dark',
            minimap: { enabled: false }
        });

        editor.onDidChangeModelContent(() => {
            // Inform the host of every edit.
            window.chrome.webview.postMessage(editor.getValue());
        });
    });
});
```

## The BASIC side

Drop two `WebView2` controls on a form --- `WebView` (the editor) and `WebViewPreview` (the renderer). The `Ready` handler deploys the assets, registers the virtual host, and navigates:

```tb
Private localPath As String

Private Sub WebView_Ready() Handles WebView.Ready
    localPath = Environ$("USERPROFILE") & "\Documents\tbMonacoDemo"
    CopyResourcesFolderContentsToLocalPath "MONACO_DEMO", localPath

    WebView.SetVirtualHostNameToFolderMapping _
        "monaco.example", localPath & "\", wv2ResourceAllow
    WebView.Navigate "https://monaco.example/index.html"
End Sub
```

(`CopyResourcesFolderContentsToLocalPath` is the helper from [Hosting local web assets](Hosting-Local-Web-Assets).)

## Pushing the initial content

Once Monaco has finished loading, the bootstrap script listens for a `message` event containing the HTML to seed the editor with. Fire that message after the editor's [**NavigationComplete**](../../tB/Packages/WebView2/WebView2/#navigationcomplete):

```tb
Private Sub WebView_NavigationComplete( _
        ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long) _
        Handles WebView.NavigationComplete

    Dim initialHTML As String = _
        StrConv(LoadResData("initial-editor-html.html", "MONACO_DEMO"), vbFromUTF8)

    WebView.PostWebMessage(initialHTML)
    WebViewPreview.NavigateToString(initialHTML)
End Sub
```

[**LoadResData**](../../tB/Packages/VB/Global/#loadresdata) returns the resource bytes; `StrConv(..., vbFromUTF8)` decodes them. [**PostWebMessage**](../../tB/Packages/WebView2/WebView2/#postwebmessage) hands the string to Monaco's `message` listener; [**NavigateToString**](../../tB/Packages/WebView2/WebView2/#navigatetostring) seeds the preview pane with the same text rendered as HTML.

## Live preview

Every keystroke in Monaco fires its `onDidChangeModelContent` callback, which `postMessage`s the new content back to BASIC. That arrives as the [**JsMessage**](../../tB/Packages/WebView2/WebView2/#jsmessage) event --- feed it straight into the preview:

```tb
Private Sub WebView_JsMessage(ByVal Message As Variant) Handles WebView.JsMessage
    WebViewPreview.NavigateToString(Message)
End Sub
```

That's it --- the preview pane re-renders on every edit.

## Detecting a missing Edge runtime

A reasonable fraction of users will run the application on a machine where the WebView2 Evergreen runtime isn't installed. The [**Error**](../../tB/Packages/WebView2/WebView2/#error) event reports this case as Win32 error code `&H80070002` (`ERROR_FILE_NOT_FOUND`):

```tb
Private Sub WebView_Error(ByVal code As Long, ByVal msg As String) _
        Handles WebView.Error
    Const ERROR_FILE_NOT_FOUND As Long = &H80070002
    If code = ERROR_FILE_NOT_FOUND Then
        MsgBox "Failed to initialize the WebView2 control." & vbCrLf & _
               "Please install the WebView2 (Evergreen) runtime.", _
               vbExclamation, "WebView2"
    Else
        MsgBox "WebView2 error " & Hex$(code) & ": " & msg, _
               vbExclamation, "WebView2"
    End If
End Sub
```

It is worth handling this even in single-WebView applications --- the message you show here is the difference between *"nothing happens"* and *"oh, I need to install something"*.

## Where next

- [Hosting local web assets](Hosting-Local-Web-Assets) -- the `CopyResourcesFolderContentsToLocalPath` helper and virtual-host pattern this tutorial builds on.
- [JavaScript interop](JavaScript-Interop) -- the three bridges between BASIC and JavaScript.
- [WebView2 reference](../../tB/Packages/WebView2/WebView2/) -- every property, method, and event.
