---
title: WebView2HeadersCollection
parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2HeadersCollection
has_toc: false
---

# WebView2HeadersCollection class
{: .no_toc }

An enumerator that yields [**WebView2Header**](WebView2Header) values one by one. Returned by **WebView2RequestHeaders.GetHeaders**, **WebView2ResponseHeaders.GetHeaders**, and by `For Each` over a [**WebView2RequestHeaders**](WebView2RequestHeaders) or [**WebView2ResponseHeaders**](WebView2ResponseHeaders) instance.

The collection implements the COM enumerator operations **Next**, **Skip**, **Reset** and **Clone**, which `For Each` and other COM enumerator clients call. They are not members that BASIC code can call. A loop reads the headers once, front to back; **Reset** starts the enumeration again from the first header. Every call to **GetHeaders** and every `For Each` loop produces a new enumerator, so a new loop always starts at the first header.

> [!WARNING]
> In BETA 997, **Clone** returns an enumerator that starts at the first header, not at the position of the enumerator it copies: after **Next** has returned the first header, the clone's **Next** returns the first header again, and after **Skip** `2` the clone still starts at the first. `For Each` never calls **Clone**, so only a COM client that does is affected.

A **WebView2HeadersCollection** is never created by application code. The package returns one of the four derived classes listed under [Derived classes](#derived-classes), typed as **WebView2HeadersCollection**.

```tb check_build
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

## Derived classes

Four public classes inherit from **WebView2HeadersCollection**. Each is `[COMCreatable(False)]`, and application code does not create them: the package creates them and returns them as **WebView2HeadersCollection**. Each overrides **Reset** and **Clone** to work on its own source of headers.

| Class | Returned by | Yields |
|-------|-------------|--------|
| **WebView2HeadersCollection_RequestGetHeaders** | [**WebView2RequestHeaders.GetHeaders**](WebView2RequestHeaders#getheaders) | the request headers whose name matches the *name* argument |
| **WebView2HeadersCollection_RequestEnumerator** | `For Each` over a [**WebView2RequestHeaders**](WebView2RequestHeaders) | every request header |
| **WebView2HeadersCollection_ResponseGetHeaders** | [**WebView2ResponseHeaders.GetHeaders**](WebView2ResponseHeaders#getheaders) | the response headers whose name matches the *name* argument |
| **WebView2HeadersCollection_ResponseEnumerator** | `For Each` over a [**WebView2ResponseHeaders**](WebView2ResponseHeaders) | every response header |

## Methods

### New
{: .no_toc }

Constructs the collection from the runtime's header iterator. The constructor is **Protected**: only the four derived classes call it, and application code cannot create a **WebView2HeadersCollection**.
