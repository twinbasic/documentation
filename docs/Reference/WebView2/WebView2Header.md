---
title: WebView2Header
parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2Header
has_toc: false
---

# WebView2Header class
{: .no_toc }

A single HTTP header — a name / value pair. **WebView2Header** is the element type produced by iterating a [**WebView2HeadersCollection**](WebView2HeadersCollection), which in turn comes from a [**WebView2RequestHeaders**](WebView2RequestHeaders) or [**WebView2ResponseHeaders**](WebView2ResponseHeaders) collection.

```tb
Dim h As WebView2Header
For Each h In Request.Headers
    Debug.Print h.Name & ": " & h.Value
Next
```

## Properties

### Name
{: .no_toc }

The header name.

Syntax: *object*.**Name** [ = *string* ]

**String**.

### Value
{: .no_toc }

The header value.

Syntax: *object*.**Value** [ = *string* ]

**String**.

## Methods

### New
{: .no_toc }

Constructs a header. Application code does not normally create headers manually — instances are produced by the package while iterating a request- or response-header collection — but the constructor is **Public**.

Syntax: **New WebView2Header** ( *Name*, *Value* )

*Name*
: *required* A **String** header name.

*Value*
: *required* A **String** header value.
