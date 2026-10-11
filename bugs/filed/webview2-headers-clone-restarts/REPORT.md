Filed as [twinbasic/twinbasic#2496](https://github.com/twinbasic/twinbasic/issues/2496).

## The WebView2 headers enumerator's Clone starts at the first header, not at the enumerator's position

**Describe the bug**
`IEnumVARIANT::Clone` on the enumerator of a `WebView2ResponseHeaders` object (`_NewEnum`, a `WebView2HeadersCollection`) returns an enumerator at the wrong position once the enumerator has been `Reset`: after two `Next` calls and a `Reset`, the enumerator's `Next` returns the first header, and the clone's `Next` returns the third. Before a `Reset` the clone starts where the enumerator is, and the request headers' enumerator (`WebView2RequestHeaders`) is right after a `Reset` as well. Observed in a run of the reproducer project.

On BETA 997 the clone of either enumerator started at the first header whatever the enumerator's position, which is what this issue first reported; BETA 1005 fixed that, and left the case after a `Reset` wrong for the response headers.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `webview2-headers-clone-restarts.twinproj` (attached as `webview2-headers-clone-restarts.zip`). Its form holds one WebView2 control, which navigates to `https://example.com/page` and answers that request itself in `WebResourceRequested`. The handler appends four headers, `Ha` to `Hd`, to the response, and passes three fresh enumerators of `Request.Headers`, then three of `Response.Headers`, to `EnumProbe.Run`, which declares `IEnumVARIANT` (the package's own declaration is private) and calls it:
   ```
   Set e = u1
   NextName e
   NextName e
   e.Reset
   Set c = e.Clone()
   Debug.Print what & ": after two Next and Reset, enumerator Next: " & NextName(e) & ", clone Next: " & NextName(c)
   ```
2. Run it (F5); the form closes by itself. The DEBUG CONSOLE shows:
   ```
   request: after one Next (Accept), enumerator Next: Upgrade-Insecure-Requests, clone Next: Upgrade-Insecure-Requests
   request: after two Next and Reset, enumerator Next: Accept, clone Next: Accept
   request: after Skip 2, enumerator Next: User-Agent, clone Next: User-Agent
   response: after one Next (Ha), enumerator Next: Hb, clone Next: Hb
   response: after two Next and Reset, enumerator Next: Ha, clone Next: Hc
   response: after Skip 2, enumerator Next: Hc, clone Next: Hc
   ```

**Expected behavior**
`response: after two Next and Reset, enumerator Next: Ha, clone Next: Ha`: `IEnumVARIANT::Clone` creates an enumerator with the same state as the current one, so the clone continues from the same position, as the request headers' clone does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
In BETA 1005's package source, `WebView2HeadersCollection.twin`, `Next` and `Skip` now advance `IterationIdx`, which `Clone` passes to the new enumerator. The two request headers classes set `IterationIdx = 0` in their `Reset`, and the two response headers classes, `WebView2HeadersCollection_ResponseGetHeaders` and `WebView2HeadersCollection_ResponseEnumerator` in `WebView2ResponseHeaders.twin`, do not, so after a `Reset` their clone skips as many headers as were read before it. Setting `IterationIdx = 0` in those two `Reset`s, as the request side does, would fix it. Only `_NewEnum` (the `ResponseEnumerator` class) was run; `GetHeaders` (the other class) has the same `Reset`.

Severity: low. `For Each` does not call `Clone`, so only a COM client that clones the enumerator after resetting it gets the wrong headers.

<!-- Reproducer: bugs/webview2-headers-clone-restarts/ (mode run, expects the request's Reset line and the response's one-Next and Reset lines above); verified on BETA 1005 with bug_repro run and verify; on BETA 997 every clone line prints the first header (Accept, Ha). Found by reading 997's package source while updating the WebView2 headers pages; the response side and the Reset case were added on BETA 1005, from its exported package source. The request goes to example.com but is answered in the handler. Stated in a `> [!WARNING]` naming BETA 1005 on docs/Reference/Built-In/WebView2/WebView2HeadersCollection.md, after the paragraph on the enumerator operations; remove it once a fixed build is released. -->
