---
title: Hosting local web assets
parent: WebView2
grand_parent: Tutorials
nav_order: 5
permalink: /Tutorials/WebView2/Hosting-Local-Web-Assets
---

# Hosting local web assets

A [**WebView2**](../../tB/Packages/WebView2/WebView2/) control can serve HTML, JavaScript, CSS, and any other assets straight from a folder on disk — no embedded HTTP server required. Edge's [**SetVirtualHostNameToFolderMapping**](../../tB/Packages/WebView2/WebView2/#setvirtualhostnametofoldermapping) routes a virtual `https://` hostname to a local folder so that resources behave as if they came from a real origin: same-origin `fetch`, Content Security Policy, service workers, and so on all work as expected.

This tutorial walks through the pattern used by *Sample 0 — WebView2 Examples* (forms *Example 2*, *Example 3*, *Example 4*).

## The three-step pattern

1. **Choose a folder.** It must exist on disk and contain `index.html` (plus whatever assets the page wants — scripts, styles, images).
2. **Register a virtual host** mapping to that folder.
3. **Navigate** to a URL under the virtual hostname.

Hook into the [**Ready**](../../tB/Packages/WebView2/WebView2/#ready) event so the control is fully initialised before the mapping is installed:

```tb
Private Sub WebView_Ready() Handles WebView.Ready
    Dim folderPath As String = _
        Environ$("USERPROFILE") & "\Documents\MyApp"
    WebView.SetVirtualHostNameToFolderMapping _
        "myapp.example", folderPath & "\", wv2ResourceAllow
    WebView.Navigate "https://myapp.example/index.html"
End Sub
```

Once mapped, every request to `https://myapp.example/<path>` is served from `folderPath\<path>`. A `<script src="/script.js">` on the page resolves to `folderPath\script.js` exactly as if a real web server were sitting on `myapp.example`.

## Picking a hostname

The Edge runtime resolves the virtual hostname through DNS *before* applying the local override. Hostnames that happen to be resolvable on the public Internet introduce a small (≈2 s) stall on every request — see [WebView2Feedback#2381](https://github.com/MicrosoftEdge/WebView2Feedback/issues/2381).

The safe convention is to pick a name under a TLD that will never resolve, like `.example`, `.invalid`, or `.test`:

| Recommended         | Avoid                       |
|---------------------|-----------------------------|
| `myapp.example`     | `myapp.com`, `app.local`    |
| `editor.invalid`    | `editor.dev`                |
| `assets.test`       | `assets.io`                 |

## Bundling assets in the project's Resources folder

Most applications want to ship their HTML / JS / CSS *inside* the executable and drop them onto disk on first run. twinBASIC's `Resources` folder is the right place to keep them.

1. In the IDE's Project explorer, expand **Resources** and add a sub-folder (right-click → *Add new subfolder*). Name it something memorable like `WEB_APP`.
2. Drop the assets in — `index.html`, `script.js`, `styles.css`, plus any sub-directories you need.

At runtime, the helper below copies the contents of a `Resources` sub-folder out to a local path. Drop it into a `.twin` module in your project:

```tb
Module Files

    Private Sub CreateFile(ByVal Path As String, ByRef Data() As Byte)
        On Error Resume Next : Kill Path : On Error GoTo 0
        Dim fileNum As Integer = FreeFile
        Open Path For Binary As fileNum
        Put fileNum, 1, Data
        Close fileNum
    End Sub

    Private Sub CreateLocalFileFromResource( _
            ByVal OutputLocalFolderPath As String, _
            ByVal InputResourceSubFolderName As String, _
            ByVal ResourceName As String)

        Dim splitPath As Variant = Split(ResourceName, "~")
        On Error Resume Next : MkDir OutputLocalFolderPath : On Error GoTo 0

        Dim i As Long
        For i = 0 To UBound(splitPath) - 1
            OutputLocalFolderPath &= "\" & splitPath(i)
            On Error Resume Next : MkDir OutputLocalFolderPath : On Error GoTo 0
        Next

        Dim Data() As Byte
        Data = LoadResData(ResourceName, InputResourceSubFolderName)
        CreateFile(OutputLocalFolderPath & "\" & splitPath(i), Data)
    End Sub

    [Description("Copy every file from a Resources subfolder onto disk. " & _
                 "'~' characters in resource names represent subfolders.")]
    Public Sub CopyResourcesFolderContentsToLocalPath( _
            ByVal InputResourceSubFolderName As String, _
            ByVal OutputLocalFolderPath As String)

        Dim resourceId As Variant
        For Each resourceId In LoadResIdList(InputResourceSubFolderName)
            CreateLocalFileFromResource _
                OutputLocalFolderPath, InputResourceSubFolderName, resourceId
        Next
    End Sub

End Module
```

[**LoadResIdList**](../../tB/Packages/VB/Global/#loadresidlist) returns every resource ID under the named sub-folder; [**LoadResData**](../../tB/Packages/VB/Global/#loadresdata) hands back the bytes. The helper splits each resource name on `~` to reconstruct the original sub-directory tree on disk — the twinBASIC IDE flattens nested folders by joining their names with `~` when the resources are compiled in.

## Putting it together

The complete deploy-on-`Ready` pattern looks like this:

```tb
Private Sub WebView_Ready() Handles WebView.Ready
    ' Resources/WEB_APP/* is copied here on every launch.
    Dim folderPath As String = _
        Environ$("USERPROFILE") & "\Documents\MyApp"

    CopyResourcesFolderContentsToLocalPath "WEB_APP", folderPath

    WebView.SetVirtualHostNameToFolderMapping _
        "myapp.example", folderPath & "\", wv2ResourceAllow
    WebView.Navigate "https://myapp.example/index.html"
End Sub
```

Once deployed, the application can launch DevTools ([**OpenDevToolsWindow**](../../tB/Packages/WebView2/WebView2/#opendevtoolswindow)) to inspect the loaded files, and users can edit `index.html` directly on disk and hit **Refresh** — useful for rapid iteration during development.

## Where next

- [JavaScript interop](JavaScript-Interop) — how a hosted page exchanges values and method calls with the BASIC application.
- [Driving Monaco from twinBASIC](Driving-Monaco) — a full case study built on top of this pattern.
- [SetVirtualHostNameToFolderMapping](../../tB/Packages/WebView2/WebView2/#setvirtualhostnametofoldermapping) — full reference.
