---
title: WebView2ResponseHeaders
parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2ResponseHeaders
has_toc: false
---

# WebView2ResponseHeaders class
{: .no_toc }

The HTTP-response-header collection for a web-resource response. Reached through [**WebView2Response.Headers**](WebView2Response#headers) inside a [**WebResourceRequested**](WebView2/#webresourcerequested) event handler.

The collection is enumerable — `For Each` yields one [**WebView2Header**](WebView2Header) per entry. Unlike the request side, **AppendHeader** appends additional values rather than overwriting the existing one, matching HTTP's allowance of repeated response headers (e.g. multiple `Set-Cookie`).

```tb
Private Sub WebView21_WebResourceRequested( _
        ByVal Request As WebView2Request, _
        ByVal Response As WebView2Response)

    Response.StatusCode = 200
    Response.ReasonPhrase = "OK"
    Response.Headers.AppendHeader "Content-Type", "text/plain; charset=utf-8"
    Response.ContentUTF8 = "Hello from twinBASIC."
End Sub
```

## Methods

### AppendHeader
{: .no_toc }

Appends a header — adds it to the collection even if an entry with the same name already exists. Repeated headers are legal in HTTP responses.

Syntax: *object*.**AppendHeader** *name*, *value*

*name*
: *required* A **String** header name.

*value*
: *required* A **String** header value.

### Contains
{: .no_toc }

Indicates whether a header with the given name is present in the collection.

Syntax: *object*.**Contains** ( *name* ) **As Boolean**

*name*
: *required* A **String** header name.

### GetHeader
{: .no_toc }

Returns the value of the named header — when there are several, the first.

Syntax: *object*.**GetHeader** ( *name* ) **As String**

*name*
: *required* A **String** header name.

### GetHeaders
{: .no_toc }

Returns a [**WebView2HeadersCollection**](WebView2HeadersCollection) iterator restricted to the headers that match *name*.

Syntax: *object*.**GetHeaders** ( *name* ) **As WebView2HeadersCollection**

*name*
: *required* A **String** header name.

## Iteration

A `For Each` loop produces every header in turn:

```tb
Dim h As WebView2Header
For Each h In Response.Headers
    Debug.Print h.Name & ": " & h.Value
Next
```

See [**WebView2HeadersCollection**](WebView2HeadersCollection) for the iteration object.
