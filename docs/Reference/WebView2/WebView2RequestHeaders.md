---
title: WebView2RequestHeaders
parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2RequestHeaders
has_toc: false
---

# WebView2RequestHeaders class
{: .no_toc }

The mutable HTTP-request-header collection for a navigation or a web-resource request. Reached two ways:

- As the **RequestHeaders** argument of the [**NavigationStarting**](WebView2/#navigationstarting) event --- the headers about to be sent for the page navigation. Mutations made before the event handler returns are transmitted.
- Through [**WebView2Request.Headers**](WebView2Request#headers) when handling a [**WebResourceRequested**](WebView2/#webresourcerequested) event.

The collection is enumerable: a `For Each` loop yields one [**WebView2Header**](WebView2Header) per entry.

```tb
Private Sub WebView21_NavigationStarting( _
        ByVal Uri As String, _
        ByVal IsUserInitiated As Boolean, _
        ByVal IsRedirected As Boolean, _
        ByVal RequestHeaders As WebView2RequestHeaders, _
        Cancel As Boolean)

    If Not RequestHeaders.Contains("X-Forwarded-For") Then
        RequestHeaders.AppendHeader "X-Forwarded-For", "192.0.2.1"
    End If
End Sub
```

## Methods

### AppendHeader
{: .no_toc }

Sets the value of a header --- replacing the existing value if present, otherwise adding it. The underlying runtime call is `SetHeader`, so existing values for the named header are overwritten rather than appended; the method's name preserves twinBASIC's wrapping convention.

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

Returns the value of the named header.

Syntax: *object*.**GetHeader** ( *name* ) **As String**

*name*
: *required* A **String** header name.

### GetHeaders
{: .no_toc }

Returns a [**WebView2HeadersCollection**](WebView2HeadersCollection) iterator restricted to the headers that match *name* --- useful for headers that may have multiple values.

Syntax: *object*.**GetHeaders** ( *name* ) **As WebView2HeadersCollection**

*name*
: *required* A **String** header name.

### RemoveHeader
{: .no_toc }

Removes the named header from the collection.

Syntax: *object*.**RemoveHeader** *name*

*name*
: *required* A **String** header name.

## Iteration

A `For Each` loop over the collection produces every header in turn:

```tb
Dim h As WebView2Header
For Each h In RequestHeaders
    Debug.Print h.Name & ": " & h.Value
Next
```

The enumerator is forward-only and cannot be reset. See [**WebView2HeadersCollection**](WebView2HeadersCollection) for the iteration object.
