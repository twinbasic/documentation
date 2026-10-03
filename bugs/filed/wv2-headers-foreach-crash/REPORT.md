Filed as [twinbasic/twinbasic#2460](https://github.com/twinbasic/twinbasic/issues/2460).

## For Each over WebView2 request or response headers crashes in WebView2HeadersCollection.Next

**Describe the bug**
`For Each` over the `WebView2RequestHeaders` that `NavigationStarting` receives crashes with an access violation in `WebView2HeadersCollection.Next`. `WebView2ResponseHeaders` returns the same enumerator from its `_NewEnum`, so `For Each` over response headers reaches the same code (not run). `For Each` calls `IEnumVARIANT::Next` with `pCeltFetched` set to a null pointer, which the interface allows, and the package's `Next` assigns to `pCeltFetched` without testing it. The DEBUG CONSOLE shows `NATIVE EXCEPTION: ACCESS_VIOLATION /WebView2HeadersCollection.twin; WebView2HeadersCollection.Next`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `wv2-headers-foreach-crash.twinproj` (attached as `wv2-headers-foreach-crash.zip`). It references the WebView2 package and has one form, `Form1`, with one WebView2 control, `WebView21`. `Sub Main` shows the form modally. When the control is ready it navigates to `about:blank`, and its `NavigationStarting` handler goes through the request headers:
   ```
   Private Sub WebView21_NavigationStarting(ByVal Uri As String, ByVal IsUserInitiated As Boolean, _
           ByVal IsRedirected As Boolean, ByVal RequestHeaders As WebView2RequestHeaders, _
           Cancel As Boolean) Handles WebView21.NavigationStarting
       Debug.Print "NavigationStarting " & Uri
       Dim h As WebView2Header
       For Each h In RequestHeaders
           Debug.Print h.Name & ": " & h.Value
       Next
       Debug.Print "after For Each"
   End Sub
   ```
2. Run the project (F5).
3. See `NavigationStarting about:blank` in the DEBUG CONSOLE, and then `NATIVE EXCEPTION: ACCESS_VIOLATION /WebView2HeadersCollection.twin; WebView2HeadersCollection.Next`. `after For Each` is never printed.

**Expected behavior**
`For Each` yields each header, and the loop ends. The package's documentation shows this loop in a `NavigationStarting` handler. `Next` should assign to `pCeltFetched` only when its address is not zero, for example `If VarPtr(pCeltFetched) <> 0 Then pCeltFetched = 1`, in both places it assigns it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: medium; `For Each` is the documented way to read the headers, and it ends the program. Without the `For Each`, the same project navigates, closes the form and returns. The same project crashes the same way on BETA 983. Calling `Next` directly, through a copy of `IEnumVARIANT` with a variable for `pCeltFetched`, returns the headers and then the end; the crash needs the null pointer that `For Each` passes. The same null `pCeltFetched` from `For Each` was measured with an enumerator written in a project: an unguarded assignment fails with an access violation there too. `Reset`, which `For Each` calls first, returns `E_NOTIMPL` here, and `For Each` goes on to call `Next` regardless.

<!-- Reproducer: bugs/wv2-headers-foreach-crash/, made with `bug_repro new --template webview2-form` (run mode: exit 5, the ACCESS_VIOLATION line, no "after For Each"); verified on 995 and 983 with bug_repro verify, 2026-10-03. Run in the harness, the control would not start (8007139F) until bug_repro's probe cleared the WEBVIEW2_* variables tb-ide.mjs gives the IDE; an IDE started by hand needs nothing. The direct-Next control was a fake iterator fed to New WebView2HeadersCollection, kept in the kit (s69/wv2-fake-repro/). The package source is WebView2Package's Sources/Classes/WebView2HeadersCollection.twin (export of the 995 install). docs/Features/Language/Custom-Enumerators.md and docs/Reference/COM-Interfaces/IEnumVARIANT.md state the null pCeltFetched rule. When fixed, remove the BETA 995 WARNING from docs/Reference/Built-In/WebView2/WebView2HeadersCollection.md (the full one) and the short ones on WebView2Header.md, WebView2RequestHeaders.md and WebView2ResponseHeaders.md. -->
