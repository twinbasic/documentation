---
title: WebView2Response
parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2Response
has_toc: false
---

# WebView2Response class
{: .no_toc }

The response side of a [**WebResourceRequested**](WebView2/#webresourcerequested) event. Fill in any of [**StatusCode**](#statuscode), [**ReasonPhrase**](#reasonphrase), [**Headers**](#headers), or one of the content properties, and the runtime returns that synthesised response to the page instead of going to the network.

If the event handler does not touch the response (no property is written), the runtime falls through to its normal fetch --- the pending request continues unchanged.

```tb
Private Sub Form_Load()
    WebView21.AddWebResourceRequestedFilter "https://api.example.com/*", wv2All
End Sub

Private Sub WebView21_WebResourceRequested( _
        ByVal Request As WebView2Request, _
        ByVal Response As WebView2Response)

    Response.StatusCode = 200
    Response.ReasonPhrase = "OK"
    Response.Headers.AppendHeader "Content-Type", "application/json"
    Response.ContentUTF8 = "{""greeting"":""hello from twinBASIC""}"
End Sub
```

## Properties

### ContentBytes
{: .no_toc }

The response body as a byte array. Reading returns **Empty** when no body has been set; assigning installs an in-memory stream containing the bytes. Read / write.

Syntax: *object*.**ContentBytes** [ = *bytes* ]

*bytes*
: A **Byte()** array.

### ContentUTF8
{: .no_toc }

The response body as a UTF-8 **String** --- a convenience over [**ContentBytes**](#contentbytes) that performs the `StrConv` round-trip automatically. Read / write.

Syntax: *object*.**ContentUTF8** [ = *text* ]

*text*
: A **String** that is converted to UTF-8 bytes before being installed as the response body.

### Headers
{: .no_toc }

The response's HTTP headers as a [**WebView2ResponseHeaders**](WebView2ResponseHeaders) collection --- add or inspect headers here. Read-only at the property level (the collection itself is mutable).

### ReasonPhrase
{: .no_toc }

The HTTP reason phrase, e.g. `"OK"`, `"Not Found"`. **String**. Read / write.

### StatusCode
{: .no_toc }

The HTTP status code, e.g. `200`, `404`. **Long**. Read / write.
