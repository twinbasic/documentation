Filed as [twinbasic/twinbasic#2496](https://github.com/twinbasic/twinbasic/issues/2496).

## The WebView2 headers enumerator's Clone starts at the first header, not at the enumerator's position

**Describe the bug**
`IEnumVARIANT::Clone` on the enumerator of a `WebView2RequestHeaders` object (`_NewEnum`, a `WebView2HeadersCollection`) returns an enumerator that starts at the first header, whatever the position of the enumerator it was cloned from. After `Next` has returned the first header, the clone's `Next` returns the first header again; after `Skip 2`, the clone still starts at the first. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `webview2-headers-clone-restarts.twinproj` (attached as `webview2-headers-clone-restarts.zip`). Its form holds one WebView2 control, which navigates to `https://example.com/page` and answers that request itself in `WebResourceRequested`. Before answering, the handler passes `Request.Headers` to `EnumProbe.Run`, which declares `IEnumVARIANT` (the package's own declaration is private) and calls it on `Headers._NewEnum()`:
   ```
   Dim u As stdole.IUnknown = Headers._NewEnum()
   Dim e As IEnumVARIANTProbe = u
   Debug.Print "enumerator Next: " & NextName(e)
   Dim c As IEnumVARIANTProbe = e.Clone()
   Debug.Print "clone Next:      " & NextName(c)
   Debug.Print "enumerator Next: " & NextName(e)
   ```
2. Run it (F5); the form closes by itself. The DEBUG CONSOLE shows:
   ```
   For Each: Accept Upgrade-Insecure-Requests User-Agent sec-ch-ua sec-ch-ua-mobile sec-ch-ua-platform
   enumerator Next: Accept
   clone Next:      Accept
   enumerator Next: Upgrade-Insecure-Requests
   after Skip 2, enumerator Next: User-Agent
   after Skip 2, clone Next:      Accept
   ```

**Expected behavior**
`clone Next: Upgrade-Insecure-Requests` and `after Skip 2, clone Next: User-Agent`: `IEnumVARIANT::Clone` creates an enumerator with the same state as the current one, so the clone continues from the same position.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
In the package's `WebView2HeadersCollection.twin`, the four derived classes' `Clone` pass `IterationIdx` to a new enumerator, whose constructor `Skip`s that many headers, but nothing ever assigns `IterationIdx`: `Next` and `Skip` call `Iterator.MoveNext` without advancing it, so it stays 0. Incrementing it in `Next` (once per header fetched) and in `Skip`, and setting it to 0 in each `Reset`, would fix it. The response headers classes (`WebView2ResponseHeaders`) have the same `Clone`; only the request headers were run.

Severity: low. `For Each` does not call `Clone`, so only a COM client that clones the enumerator gets the wrong headers.

<!-- Reproducer: bugs/webview2-headers-clone-restarts/ (mode run, expects the five Next lines above); verified on BETA 997 with bug_repro run and verify. Found by reading 997's package source (export cache %TEMP%/tb-census/beta-997) while updating the WebView2 headers pages; first confirmed by a Sonnet agent's probe, built as an exe through tbrun --exe (kit beta997-probes/wv2clone-brief.md; the tree was in the session scratchpad, not kept). The request goes to example.com but is answered in the handler. Stated in a `> [!WARNING]` naming BETA 997 on docs/Reference/Built-In/WebView2/WebView2HeadersCollection.md, after the paragraph on the enumerator operations; remove it once a fixed build is released. -->
