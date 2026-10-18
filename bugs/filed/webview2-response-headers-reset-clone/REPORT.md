Filed as [twinbasic/twinbasic#2531](https://github.com/twinbasic/twinbasic/issues/2531).

## After `Reset`, `Clone` of the WebView2 response headers enumerator skips the headers read before the `Reset`

**Describe the bug**
Follow-up to #2496, which is fixed in BETA 1005 for `Clone` after `Next` and after `Skip`, on the enumerators of the request headers and the response headers alike, and after `Reset` on the request headers'. This is the response headers' enumerator after a `Reset`: after two `Next` calls and a `Reset`, the enumerator's `Next` returns the first header, `Ha`, and its clone's `Next` returns the third, `Hc`. Observed by running the reproducer's test cases.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `webview2-response-headers-reset-clone.twinproj` (attached as `webview2-response-headers-reset-clone.zip`). Its `Form1` holds one WebView2 control, which navigates to `https://example.com/page` and answers that request itself in `WebResourceRequested`, so nothing goes to the network. The handler appends four headers, `Ha` to `Hd`, to the response, and records what three fresh enumerators of `Request.Headers`, then three of `Response.Headers`, return (module `HeaderEnumeration`, below).
2. Call `HeaderEnumerationTests.Response_CloneAfterReset` from `Sub Main` and press F5. The form shows until its request is answered, and closes.
3. See the assertion fail with `Expected: "Ha|Ha" Actual: "Ha|Hc"`: the enumerator's `Next`, then the clone's.

The module below is the reproducer's, and is meant to be adapted as a regression test. It shows `Form1` while the control answers its request, and unloads it. On BETA 1005 the five cases from #2496 pass, and `Response_CloneAfterReset` fails.
```vb
' Regression tests for #2496 and its follow-up. IEnumVARIANT::Clone returns an
' enumerator with the same state as the one it is called on (the COM
' documentation of IEnumVARIANT::Clone), so the clone's Next returns what the
' enumerator's own Next returns next. Each case compares the two after one Next,
' after Skip 2, and after two Next and a Reset, for the request headers and for
' the response headers, which hold Ha, Hb, Hc and Hd.

' IEnumVARIANT, declared here because the package's own declaration is private.
[InterfaceId("00020404-0000-0000-C000-000000000046")]
Interface IEnumVARIANTOwn Extends stdole.IUnknown
    Type CArrayOfVariants
        Elements(1) As Variant
    End Type

    Sub Next(ByVal celt As Long, ByRef rgVar As CArrayOfVariants, ByRef pCeltFetched As Long)
    Sub Skip(ByVal celt As Long)
    Sub Reset()
    Function Clone() As stdole.IUnknown
End Interface

' What the enumerators returned, recorded by Form1 while it answers its request.
Module HeaderEnumeration

    Public Recorded As Boolean
    Public Results As New Collection      ' "<side> <case>" -> "<enumerator's Next>|<clone's Next>"

    Private Function NextName(ByVal e As IEnumVARIANTOwn) As String
        Dim arr As IEnumVARIANTOwn.CArrayOfVariants
        Dim fetched As Long
        e.Next 1, arr, fetched
        If fetched = 0 Then Return "(end)"
        Dim hd As WebView2Header = arr.Elements(0)
        Return hd.Name
    End Function

    ' Three fresh enumerators of one collection.
    Public Sub Record(ByVal Side As String, ByVal u0 As stdole.IUnknown, ByVal u1 As stdole.IUnknown, ByVal u2 As stdole.IUnknown)
        Dim e As IEnumVARIANTOwn, c As IEnumVARIANTOwn, first As String

        Set e = u0
        first = NextName(e)
        Set c = e.Clone()
        Results.Add NextName(e) & "|" & NextName(c), Side & " after one Next"

        Set e = u1
        NextName e
        NextName e
        e.Reset
        Set c = e.Clone()
        Results.Add NextName(e) & "|" & NextName(c), Side & " after Reset"

        Set e = u2
        e.Skip 2
        Set c = e.Clone()
        Results.Add NextName(e) & "|" & NextName(c), Side & " after Skip 2"
    End Sub

End Module

[TestFixture]
Module HeaderEnumerationTests

    Private Declare PtrSafe Function SetEnvironmentVariableW Lib "kernel32" (ByVal lpName As LongPtr, ByVal lpValue As LongPtr) As Long

    ' Shows Form1 until its request has been answered, once.
    Private Sub Collect()
        If HeaderEnumeration.Recorded Then Exit Sub
        ' Only for an IDE that was started with these variables, as this repository's
        ' test harness starts it: WebView2 would read them, and the control would fail.
        Dim folder As String = Environ$("WEBVIEW2_USER_DATA_FOLDER")
        Dim args As String = Environ$("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS")
        SetEnvironmentVariableW StrPtr("WEBVIEW2_USER_DATA_FOLDER"), 0
        SetEnvironmentVariableW StrPtr("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"), 0
        Form1.Show
        Dim started As Double = Timer
        Do Until HeaderEnumeration.Recorded Or Timer - started > 30
            DoEvents
        Loop
        Unload Form1
        If Len(folder) Then SetEnvironmentVariableW StrPtr("WEBVIEW2_USER_DATA_FOLDER"), StrPtr(folder)
        If Len(args) Then SetEnvironmentVariableW StrPtr("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"), StrPtr(args)
    End Sub

    ' "<enumerator's Next>|<clone's Next>"
    Private Function Pair(ByVal Key As String) As String
        Collect
        Assert.Strict.IsTrue HeaderEnumeration.Recorded, "the request was answered"
        Return HeaderEnumeration.Results(Key)
    End Function

    ' Fixed in #2496 (BETA 1005): the clone continues from the enumerator's position.

    [TestCase]
    Public Sub Request_CloneAfterNext()
        Assert.Strict.AreEqual "Upgrade-Insecure-Requests|Upgrade-Insecure-Requests", Pair("request after one Next")
    End Sub

    [TestCase]
    Public Sub Request_CloneAfterSkip()
        Assert.Strict.AreEqual "User-Agent|User-Agent", Pair("request after Skip 2")
    End Sub

    [TestCase]
    Public Sub Request_CloneAfterReset()
        Assert.Strict.AreEqual "Accept|Accept", Pair("request after Reset")
    End Sub

    [TestCase]
    Public Sub Response_CloneAfterNext()
        Assert.Strict.AreEqual "Hb|Hb", Pair("response after one Next")
    End Sub

    [TestCase]
    Public Sub Response_CloneAfterSkip()
        Assert.Strict.AreEqual "Hc|Hc", Pair("response after Skip 2")
    End Sub

    ' Left in BETA 1005: Reset does not rewind the position Clone copies.

    [TestCase]
    Public Sub Response_CloneAfterReset()
        Assert.Strict.AreEqual "Ha|Ha", Pair("response after Reset")
    End Sub

End Module
```
`Form1`'s handlers, which call `Record`:
```vb
    Private Sub WebView21_Ready() Handles WebView21.Ready
        WebView21.AddWebResourceRequestedFilter "*", wv2All
        WebView21.Navigate "https://example.com/page"
    End Sub

    Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, ByVal Response As WebView2Response) _
            Handles WebView21.WebResourceRequested
        Response.Headers.AppendHeader "Ha", "1"
        Response.Headers.AppendHeader "Hb", "2"
        Response.Headers.AppendHeader "Hc", "3"
        Response.Headers.AppendHeader "Hd", "4"
        If Not HeaderEnumeration.Recorded Then
            Dim rq As WebView2RequestHeaders = Request.Headers
            HeaderEnumeration.Record "request", rq._NewEnum(), rq._NewEnum(), rq._NewEnum()
            Dim rs As WebView2ResponseHeaders = Response.Headers
            HeaderEnumeration.Record "response", rs._NewEnum(), rs._NewEnum(), rs._NewEnum()
            HeaderEnumeration.Recorded = True
        End If
        Response.StatusCode = 200
        Response.ReasonPhrase = "OK"
        Response.ContentUTF8 = "<html><body>probe</body></html>"
    End Sub
```

**Expected behavior**
`Ha|Ha`: `IEnumVARIANT::Clone` creates an enumerator with the same state as the current one, so after a `Reset` the clone starts at the first header, as the request headers' clone does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
In BETA 1005's package source, `WebView2HeadersCollection.twin`, `Next` and `Skip` advance `IterationIdx`, which `Clone` passes to the new enumerator. The two request headers classes set `IterationIdx = 0` in their `Reset`; the two response headers classes in `WebView2ResponseHeaders.twin`, `WebView2HeadersCollection_ResponseGetHeaders` and `WebView2HeadersCollection_ResponseEnumerator`, do not, so after a `Reset` their clone skips as many headers as were read before it. Setting `IterationIdx = 0` in those two `Reset`s, as the request side does, would fix it. Only `_NewEnum` (the `ResponseEnumerator` class) was run; `GetHeaders` (the other class) has the same `Reset`.

Severity: low. `For Each` does not call `Clone`, so only a COM client that clones the enumerator after resetting it gets the wrong headers.

<!-- Reproducer: bugs/webview2-response-headers-reset-clone/ (mode test: `tbrun --tests`, which runs the cases in the IDE, so the form shows on the harness's private desktop; expect lists the five PASS lines and the FAIL line with "Ha|Hc"); verified on BETA 1005 by `bug_repro.mjs verify`. No VB6 side: VB6 has no WebView2 control. Follow-up to #2496 ("The WebView2 headers enumerator's Clone starts at the first header, not at the enumerator's position"), closed as fixed in BETA 1000; its reproducer, bugs/filed/webview2-headers-clone-restarts/, still reproduces the Reset line and stays until a fix is released. Stated in a `> [!WARNING]` naming BETA 1005 on docs/Reference/Built-In/WebView2/WebView2HeadersCollection.md, after the paragraph on the enumerator operations; remove it once a fixed build is released. -->
