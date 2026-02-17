---
title: ResponseHeaders
parent: WebView2 Package
nav_order: 13
---

# WebView2ResponseHeaders Class

The `WebView2ResponseHeaders` class is used to manage HTTP response header information, primarily used to build custom responses in the `WebResourceRequested` event.

## Class Information

| Property  | Value                      |
| --------- | -------------------------- |
| Class Name | `WebView2ResponseHeaders`  |
| COM Creatable | No                         |

## Methods

### AppendHeader

```vb
Public Sub AppendHeader(ByVal name As String, ByVal value As String)
```

Adds a response header (allows multiple values with the same name).

**Parameters:**

- `name` - Response header name
- `value` - Response header value

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Set basic response headers
    Response.Headers.AppendHeader "Content-Type", "application/json"
    Response.Headers.AppendHeader "Cache-Control", "no-cache"
    Response.Headers.AppendHeader "Access-Control-Allow-Origin", "*"
End Sub
```

### Contains

```vb
Public Function Contains(ByVal name As String) As Boolean
```

Checks if a response header with the specified name exists.

**Parameters:**

- `name` - Response header name

**Return Value:** Returns `True` if it contains, otherwise returns `False`

**Example:**

```vb
If Response.Headers.Contains("Content-Type") Then
    Debug.Print "Response contains Content-Type header"
End If
```

### GetHeader

```vb
Public Function GetHeader(ByVal name As String) As String
```

Gets the first value of the response header with the specified name.

**Parameters:**

- `name` - Response header name

**Return Value:** The value string of the response header

**Example:**

```vb
Dim contentType As String
contentType = Response.Headers.GetHeader("Content-Type")
```

### GetHeaders

```vb
Public Function GetHeaders(ByVal name As String) As WebView2HeadersCollection
```

Gets all values of the response header with the specified name.

**Parameters:**

- `name` - Response header name

**Return Value:** `WebView2HeadersCollection` collection object

### Enumerator

```vb
Public Function _NewEnum() As WebView2HeadersCollection
```

Supports `For Each` to enumerate all response headers.

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    Debug.Print "Setting response headers:"
    Response.Headers.AppendHeader "Content-Type", "text/html"
    Response.Headers.AppendHeader "Cache-Control", "max-age=3600"
    Response.Headers.AppendHeader "Server", "MyServer/1.0"

    Dim header As WebView2Header
    For Each header In Response.Headers
        Debug.Print "  " & header.Name & ": " & header.Value
    Next
End Sub
```

## Usage Scenarios

### 1. Build Custom Response

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Set HTML response
    Response.StatusCode = 200
    Response.ReasonPhrase = "OK"
    Response.ContentUTF8 = "<html><body><h1>Interception Successful</h1></body></html>"
    Response.Headers.AppendHeader "Content-Type", "text/html; charset=utf-8"
    Response.Headers.AppendHeader "Content-Length", Len(Response.ContentUTF8)
End Sub
```

### 2. Return JSON Data

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Build response headers
    Response.StatusCode = 200
    Response.ReasonPhrase = "OK"
    Response.ContentUTF8 = "{""status"":""success"",""data"":""hello""}"

    ' Set JSON response headers
    Response.Headers.AppendHeader "Content-Type", "application/json"
    Response.Headers.AppendHeader "Access-Control-Allow-Origin", "*"
    Response.Headers.AppendHeader "Cache-Control", "no-store"
End Sub
```

### 3. Intercept Image Requests

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Check if it's an image request
    If InStr(Request.Uri, ".png") > 0 Or InStr(Request.Uri, ".jpg") > 0 Then
        ' Return placeholder image
        Response.StatusCode = 200
        Response.ReasonPhrase = "OK"
        Response.ContentUTF8 = "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='gray'/></svg>"
        Response.Headers.AppendHeader "Content-Type", "image/svg+xml"
    End If
End Sub
```

### 4. Simulate API Response

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Intercept specific API requests
    If InStr(Request.Uri, "/api/user") > 0 Then
        Dim jsonData As String
        jsonData = "{""id"":1,""name"":""张三"",""email"":""zhangsan@example.com""}"

        Response.StatusCode = 200
        Response.ReasonPhrase = "OK"
        Response.ContentUTF8 = jsonData

        ' Set complete API response headers
        Response.Headers.AppendHeader "Content-Type", "application/json"
        Response.Headers.AppendHeader "Access-Control-Allow-Origin", "*"
        Response.Headers.AppendHeader "Access-Control-Allow-Methods", "GET, POST, OPTIONS"
        Response.Headers.AppendHeader "Access-Control-Allow-Headers", "Content-Type"
        Response.Headers.AppendHeader "X-Request-ID", CStr(Timer))
    End If
End Sub
```

### 5. Return Error Response

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Intercept unauthorized access
    If InStr(Request.Uri, "/admin/") > 0 Then
        Dim errorHtml As String
        errorHtml = "<html><body><h1>403 Forbidden</h1><p>No permission to access this resource</p></body></html>"

        Response.StatusCode = 403
        Response.ReasonPhrase = "Forbidden"
        Response.ContentUTF8 = errorHtml
        Response.Headers.AppendHeader "Content-Type", "text/html; charset=utf-8"
        Response.Headers.AppendHeader "X-Error-Reason", "Unauthorized"
    End If
End Sub
```

### 6. Set Cache Policy

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Set different cache policies based on resource type
    If InStr(Request.Uri, ".css") > 0 Or InStr(Request.Uri, ".js") > 0 Then
        ' Long-term caching for static resources
        Response.Headers.AppendHeader "Cache-Control", "public, max-age=31536000"
        Response.Headers.AppendHeader "Expires", "Sat, 31 Dec 2030 23:59:59 GMT"
    Else
        ' No caching for dynamic content
        Response.Headers.AppendHeader "Cache-Control", "no-cache, no-store, must-revalidate"
        Response.Headers.AppendHeader "Pragma", "no-cache"
        Response.Headers.AppendHeader "Expires", "0"
    End If
End Sub
```

## Common Response Headers

### Content Types

```vb
Response.Headers.AppendHeader "Content-Type", "text/html; charset=utf-8"
Response.Headers.AppendHeader "Content-Type", "application/json"
Response.Headers.AppendHeader "Content-Type", "image/jpeg"
Response.Headers.AppendHeader "Content-Type", "application/pdf"
Response.Headers.AppendHeader "Content-Type", "application/octet-stream"
```

### CORS Control

```vb
Response.Headers.AppendHeader "Access-Control-Allow-Origin", "*"
Response.Headers.AppendHeader "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"
Response.Headers.AppendHeader "Access-Control-Allow-Headers", "Content-Type, Authorization"
```

### Cache Control

```vb
Response.Headers.AppendHeader "Cache-Control", "no-cache"
Response.Headers.AppendHeader "Cache-Control", "public, max-age=3600"
Response.Headers.AppendHeader "Cache-Control", "no-store"
```

### Security Headers

```vb
Response.Headers.AppendHeader "X-Content-Type-Options", "nosniff"
Response.Headers.AppendHeader "X-Frame-Options", "DENY"
Response.Headers.AppendHeader "X-XSS-Protection", "1; mode=block"
Response.Headers.AppendHeader "Strict-Transport-Security", "max-age=31536000"
```

## Notes

1. **Character Encoding:** The `Content-Type` header should specify the correct character set, such as `text/html; charset=utf-8`.

2. **CORS Issues:** For cross-origin requests, need to set the correct `Access-Control-Allow-Origin` header.

3. **Content Length:** If setting `Content-Length` header, ensure the value matches the actual content length.

4. **Security:** When setting custom responses, pay attention to avoid security vulnerabilities, such as XSS attacks.

5. **Performance Considerations:** For frequently intercepted resources, ensure the response building logic is efficient to avoid blocking the main thread.

6. **Response Integrity:** Ensure to set `StatusCode`, `ReasonPhrase`, and `Content` simultaneously, otherwise the response may be incomplete.

7. **Special Header Handling:** Some response headers (such as `Content-Length`) may be automatically handled by WebView2, manual setting may be ignored.
