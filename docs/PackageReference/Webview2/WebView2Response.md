---
title: Response
parent: WebView2 Package
nav_order: 11
---

# WebView2Response Class

The `WebView2Response` class is used to provide custom responses in `WebResourceRequested` event, allowing you to intercept web requests and return custom content.

## Class Information

| Property  | Value                  |
| --------- | ---------------------- |
| Class Name | `WebView2Response`     |
| COM Creatable | No (internal use)     |
| Access Modifier | `Public`           |

## Properties

### StatusCode

```vb
Public Property Get StatusCode() As Long
Public Property Let StatusCode(Value As Long)
```

Gets or sets the HTTP response status code.

**Complete HTTP Status Code List:**

### 1xx Informational Responses

| Status Code | Description |
| ---------- | ----------- |
| 100 | Continue - Client should continue its request |
| 101 | Switching Protocols |
| 102 | Processing (WebDAV) |
| 103 | Early Hints |

### 2xx Success Responses

| Status Code | Description |
| ---------- | ----------- |
| 200 | OK - Request successful |
| 201 | Created - Request successful and new resource created |
| 202 | Accepted - Request accepted but not yet fully processed |
| 203 | Non-Authoritative Information |
| 204 | No Content - Server successfully processed but no return content |
| 205 | Reset Content |
| 206 | Partial Content |
| 207 | Multi-Status (WebDAV) |
| 208 | Already Reported (WebDAV) |
| 226 | IM Used |

### 3xx Redirection

| Status Code | Description |
| ---------- | ----------- |
| 300 | Multiple Choices |
| 301 | Moved Permanently |
| 302 | Found (temporary redirect, originally "Moved Temporarily") |
| 303 | See Other |
| 304 | Not Modified - Use cached version |
| 305 | Use Proxy (deprecated) |
| 306 | (Unused) |
| 307 | Temporary Redirect - Temporary redirect (preserve request method) |
| 308 | Permanent Redirect - Permanent redirect (preserve request method) |

### 4xx Client Error

| Status Code | Description |
| ---------- | ----------- |
| 400 | Bad Request - Server cannot understand request |
| 401 | Unauthorized - Authentication required |
| 402 | Payment Required |
| 403 | Forbidden - Server refuses request |
| 404 | Not Found - Resource not found |
| 405 | Method Not Allowed |
| 406 | Not Acceptable |
| 407 | Proxy Authentication Required |
| 408 | Request Timeout |
| 409 | Conflict |
| 410 | Gone |
| 411 | Length Required |
| 412 | Precondition Failed |
| 413 | Payload Too Large |
| 414 | URI Too Long |
| 415 | Unsupported Media Type |
| 416 | Range Not Satisfiable |
| 417 | Expectation Failed |
| 418 | I'm a teapot (April Fool's joke) |
| 421 | Misdirected Request |
| 422 | Unprocessable Entity (WebDAV) |
| 423 | Locked (WebDAV) |
| 424 | Failed Dependency (WebDAV) |
| 425 | Too Early |
| 426 | Upgrade Required |
| 428 | Precondition Required |
| 429 | Too Many Requests |
| 431 | Request Header Fields Too Large |
| 451 | Unavailable For Legal Reasons |

### 5xx Server Error

| Status Code | Description |
| ---------- | ----------- |
| 500 | Internal Server Error |
| 501 | Not Implemented |
| 502 | Bad Gateway |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |
| 505 | HTTP Version Not Supported |
| 506 | Variant Also Negotiates |
| 507 | Insufficient Storage (WebDAV) |
| 508 | Loop Detected (WebDAV) |
| 510 | Not Extended |
| 511 | Network Authentication Required |

**Most Common Status Codes in WebView2:**

| Status Code | Use Case |
| ---------- | --------- |
| **200** | Request successful, return normal content |
| **201** | Resource created successfully |
| **204** | Success but no return content (such as DELETE operation) |
| **301/302** | Redirect |
| **304** | Use cached resource |
| **400** | Request format error |
| **401** | Authentication required |
| **403** | Forbidden (can be used to block specific requests) |
| **404** | Resource doesn't exist (commonly used to intercept unwanted requests) |
| **429** | Too many requests |
| **500** | Server error |
| **502** | Gateway error |
| **503** | Service temporarily unavailable |

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Return 404 response
    If InStr(Request.Uri, "blocked.js") > 0 Then
        Response.StatusCode = 404
        Response.ReasonPhrase = "Not Found"
    End If
End Sub
```

---

### ReasonPhrase

```vb
Public Property Get ReasonPhrase() As String
Public Property Let ReasonPhrase(Value As String)
```

Gets or sets the HTTP response reason phrase.

**Example:**

```vb
Response.StatusCode = 200
Response.ReasonPhrase = "OK"
```

---

### Headers

```vb
Public Property Get Headers() As WebView2ResponseHeaders
```

Gets the HTTP headers collection of the response.

Returns [WebView2ResponseHeaders](./WebView2ResponseHeaders.md) object, used to set response headers.

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Set JSON response headers
    Response.Headers.AppendHeader "Content-Type", "application/json"
    Response.Headers.AppendHeader "Cache-Control", "no-cache"
End Sub
```

---

### ContentBytes

```vb
Public Property Get ContentBytes() As Variant
Public Property Let ContentBytes(Value As Variant)
```

Gets or sets the response content (byte array).

**Description:**

- Setting this property automatically marks response as set (`HasBeenSet = True`)
- Suitable for setting binary content (images, files, etc.)

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Return image data
    If InStr(Request.Uri, "/api/image") > 0 Then
        Dim imageData() As Byte
        imageData = LoadImageBytes("C:\\image.png")

        Response.StatusCode = 200
        Response.Headers.AppendHeader "Content-Type", "image/png"
        Response.ContentBytes = imageData
    End If
End Sub
```

---

### ContentUTF8

```vb
Public Property Get ContentUTF8() As String
Public Property Let ContentUTF8(ByVal Value As String)
```

Gets or sets the response content (UTF-8 encoded string).

**Description:**

- Automatically handles UTF-8 encoding
- Suitable for returning text content (HTML, JSON, XML, etc.)
- Setting this property automatically marks response as set (`HasBeenSet = True`)

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Return JSON data
    Response.StatusCode = 200
    Response.ReasonPhrase = "OK"
    Response.Headers.AppendHeader "Content-Type", "application/json"
    Response.ContentUTF8 = "{\"message\":\"Hello from VB!\",\"timestamp\":" & CLng(Now) & "}"
End Sub
```

---

### HasBeenSet

```vb
Public HasBeenSet As Boolean
```

Indicates whether the response has been set.

- Automatically set to `True` when setting `ContentBytes`, `ContentUTF8`, `StatusCode`, or `ReasonPhrase`
- WebView2 internally uses this property to determine whether to use custom response

## Usage Scenarios

### 1. Intercept and Block Specific Resources

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Block ad scripts
    If InStr(Request.Uri, "ads.js") > 0 Or _
       InStr(Request.Uri, "tracker.js") > 0 Then

        Response.StatusCode = 404
        Response.ReasonPhrase = "Not Found"
        Response.ContentUTF8 = ""
    End If
End Sub
```

### 2. Provide Local Cached Content

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Intercept API requests, return local cache
    If InStr(Request.Uri, "/api/data") > 0 Then
        Dim cachedData As String
        cachedData = GetCachedData(Request.Uri)

        If cachedData <> "" Then
            Response.StatusCode = 200
            Response.Headers.AppendHeader "Content-Type", "application/json"
            Response.Headers.AppendHeader "X-Cache", "HIT"
            Response.ContentUTF8 = cachedData
        End If
    End If
End Sub
```

### 3. Simulate API Responses

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Simulate user API
    If InStr(Request.Uri, "/api/user") > 0 Then
        Dim jsonResponse As String
        jsonResponse = "{" & _
            """id"":" & 123 & "," & _
            """name"":""张三""," & _
            """email"":""zhangsan@example.com""" & _
        "}"

        Response.StatusCode = 200
        Response.Headers.AppendHeader "Content-Type", "application/json"
        Response.ContentUTF8 = jsonResponse
    End If
End Sub
```

### 4. Modify Original Response

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Add custom response headers to all responses
    Response.Headers.AppendHeader "X-Custom-App", "MyApp v1.0"
    Response.Headers.AppendHeader "X-Processed-By", "twinBASIC WebView2"
End Sub
```

### 5. Return HTML Error Pages

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Return custom error page for certain resources
    If InStr(Request.Uri, "blocked-site.com") > 0 Then
        Response.StatusCode = 403
        Response.ReasonPhrase = "Forbidden"
        Response.Headers.AppendHeader "Content-Type", "text/html"
        Response.ContentUTF8 = _
            "<html><body style='font-family:sans-serif;text-align:center;padding:50px;'>" & _
            "<h1>Access Blocked</h1>" & _
            "<p>This site has been blocked by administrator.</p>" & _
            "</body></html>"
    End If
End Sub
```

## Complete Example

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    Debug.Print "Intercepting: " & Request.Method & " " & Request.Uri

    ' Scenario 1: Intercept ads and trackers
    If IsAdOrTracker(Request.Uri) Then
        Response.StatusCode = 404
        Response.ReasonPhrase = "Not Found"
        Exit Sub
    End If

    ' Scenario 2: Provide local resources
    If InStr(Request.Uri, "/local/") > 0 Then
        Dim localPath As String
        localPath = Replace(Request.Uri, "http://app.local/", "C:\\AppResources\\")

        If Dir(localPath) <> "" Then
            ' Set Content-Type based on extension
            Dim contentType As String
            If Right(localPath, 4) = ".css" Then
                contentType = "text/css"
            ElseIf Right(localPath, 3) = ".js" Then
                contentType = "application/javascript"
            ElseIf Right(localPath, 4) = ".png" Then
                contentType = "image/png"
            Else
                contentType = "application/octet-stream"
            End If

            Response.StatusCode = 200
            Response.Headers.AppendHeader "Content-Type", contentType
            Response.ContentBytes = ReadFileBytes(localPath)
        Else
            Response.StatusCode = 404
            Response.ReasonPhrase = "Not Found"
        End If
        Exit Sub
    End If

    ' Scenario 3: API simulation
    If InStr(Request.Uri, "/api/mock/") > 0 Then
        HandleMockApi Request, Response
        Exit Sub
    End If

    ' Scenario 4: Add global response headers
    Response.Headers.AppendHeader "X-App-Version", "1.0.0"
End Sub

Private Function IsAdOrTracker(uri As String) As Boolean
    ' Simple ad domain check
    Dim blockedDomains As Variant
    blockedDomains = Array("google-analytics.com", "doubleclick.net", "facebook.com/tr")

    Dim domain As Variant
    For Each domain In blockedDomains
        If InStr(uri, domain) > 0 Then
            IsAdOrTracker = True
            Exit Function
        End If
    Next

    IsAdOrTracker = False
End Function

Private Sub HandleMockApi(Request As WebView2Request, Response As WebView2Response)
    Response.StatusCode = 200
    Response.Headers.AppendHeader "Content-Type", "application/json"

    ' Return different data based on request path
    If InStr(Request.Uri, "/api/mock/users") > 0 Then
        Response.ContentUTF8 = "{\"users\":[{\"id\":1,\"name\":\"User1\"},{\"id\":2,\"name\":\"User2\"}]}"
    ElseIf InStr(Request.Uri, "/api/mock/status") > 0 Then
        Response.ContentUTF8 = "{\"status\":\"ok\",\"serverTime\":" & CLng(Now) & "}"
    Else
        Response.StatusCode = 404
        Response.ContentUTF8 = "{\"error\":\"API not found\"}"
    End If
End Sub

Private Function ReadFileBytes(filePath As String) As Byte()
    Dim fileNum As Integer
    fileNum = FreeFile

    Open filePath For Binary As #fileNum
    Dim bytes() As Byte
    ReDim bytes(LOF(fileNum) - 1)
    Get #fileNum, , bytes
    Close #fileNum

    ReadFileBytes = bytes
End Function
```

## Notes

1. **Response Setting:** WebView2 will only use custom response when `HasBeenSet` is `True`
2. **Default Response:** If response is not set, WebView2 will continue sending normal network requests
3. **Content-Type:** Remember to set appropriate `Content-Type` header to ensure browser correctly parses response content
4. **Performance Impact:** Intercepting many requests may affect performance, try to set filters precisely
5. **Filter Registration:** Must use `AddWebResourceRequestedFilter` to register filters after the `Ready` event
