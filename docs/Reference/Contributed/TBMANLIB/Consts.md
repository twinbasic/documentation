---
title: Consts
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/Consts
has_toc: false
---

# Consts module
{: .no_toc }

<!-- test: SharedInstanceTests.Consts_HoldsTheMediaTypesAndHeaderNames -->
Constants for HTTP requests: media types for the `Content-Type` header and the names of two header fields. [**cHttpClient**](cHttpClient) uses them; a program can use them to set the headers of a request. Eight constants, all **String**.
<!-- /test -->

```tb check_build check_run
Debug.Print Consts.TOOLS_HTTP_CONTENT_TYPE_JSON
Debug.Print Consts.TOOLS_HTTP_HEADER_FIELD_CONTENT_TYPE
' Output:
' application/json
' Content-Type
```

The same media types are also declared in [**ToolsHttp**](ToolsHttp) with other names (`C_CONTENT_TYPE_JSON` and so on), and [**cHttpClient.SetRequestContentType**](cHttpClient#setrequestcontenttype) chooses one by number.

* TOC
{:toc}

## Constants

### TOOLS_HTTP_CONTENT_TYPE_FORM_MULTIPART
{: .no_toc }

`multipart/form-data`, the media type of a form that uploads files.

### TOOLS_HTTP_CONTENT_TYPE_FORM_URLENCODED
{: .no_toc }

`application/x-www-form-urlencoded`, the media type of a form of `name=value` pairs. [**cHttpClient**](cHttpClient) uses it when a request has no `Content-Type` header and [**RequestContentType**](cHttpClient#requestcontenttype) is empty.

### TOOLS_HTTP_CONTENT_TYPE_JSON
{: .no_toc }

`application/json`.

### TOOLS_HTTP_CONTENT_TYPE_STREAM
{: .no_toc }

`application/octet-stream`, the media type of bytes of no known kind.

### TOOLS_HTTP_CONTENT_TYPE_TEXT_HTML
{: .no_toc }

`text/html`.

### TOOLS_HTTP_CONTENT_TYPE_TEXT_PLAIN
{: .no_toc }

`text/plain`.

### TOOLS_HTTP_HEADER_FIELD_CONTENT_LENGHT
{: .no_toc }

<!-- test: HttpRequestTests.Fetch_Body_IsSentAsItIsWithTheTwoLengthHeaders -->
The text `Content-Lenght`. The name of the constant and its text both misspell `Content-Length`. [**cHttpClient**](cHttpClient) sends a header with this name, with the size of the body, on every request that has a body. Servers do not read it: WinHTTP adds the correct `Content-Length` header by itself, so a request carries both.
<!-- /test -->

### TOOLS_HTTP_HEADER_FIELD_CONTENT_TYPE
{: .no_toc }

The text `Content-Type`.

## See Also

- [cHttpClient](cHttpClient) class -- sends the requests
- [ToolsHttp](ToolsHttp) module -- the same media types under other names
- [TBMANLIB](.) package -- overview
