---
title: WebView2HeadersCollection
parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2HeadersCollection
has_toc: false
---

# WebView2HeadersCollection class
{: .no_toc }

An enumerator that yields [**WebView2Header**](WebView2Header) values one by one. Returned by **WebView2RequestHeaders.GetHeaders**, **WebView2ResponseHeaders.GetHeaders**, and by `For Each` over a [**WebView2RequestHeaders**](WebView2RequestHeaders) or [**WebView2ResponseHeaders**](WebView2ResponseHeaders) instance.

The collection is forward-only: once iterated it is exhausted. It does not implement **Reset**, **Skip**, or **Clone**, and calling those raises run-time error 80004001 (*Not implemented*).

```tb
Private Sub WebView21_NavigationStarting( _
        ByVal Uri As String, _
        ByVal IsUserInitiated As Boolean, _
        ByVal IsRedirected As Boolean, _
        ByVal RequestHeaders As WebView2RequestHeaders, _
        Cancel As Boolean)

    Dim h As WebView2Header
    For Each h In RequestHeaders
        Debug.Print h.Name & ": " & h.Value
    Next
End Sub
```

## Methods

### New
{: .no_toc }

Constructs the collection. Created internally by the package; application code does not normally invoke this.

Syntax: **New WebView2HeadersCollection** ( *Iterator* )

*Iterator*
: *required* An internal iterator handed in by the runtime.
