---
title: Request
parent: WebView2 Package
nav_order: 10
---

# WebView2Request Class

The `WebView2Request` class encapsulates web resource request information, used in `WebResourceRequested` event and `NavigationStarting` event to access request details.

## Class Information

| Property  | Value                 |
| --------- | --------------------- |
| Class Name | `WebView2Request`     |
| COM Creatable | No (internal use)    |
| Access Modifier | `Public`          |

## Properties

### Method

```vb
Public Property Get Method() As String
```

Gets the HTTP request method.

**Return Values:**

- `"GET"` - Get resource
- `"POST"` - Submit data
- `"PUT"` - Update resource
- `"DELETE"` - Delete resource
- `"HEAD"`, `"OPTIONS"`, `"PATCH"`, etc.

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    If Request.Method = "POST" Then
        Debug.Print "POST request to: " & Request.Uri
    End If
End Sub
```

---

### Uri

```vb
Public Property Get Uri() As String
```

Gets the complete URI of the request.

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    Debug.Print "Request URI: " & Request.Uri
    ' Output: https://api.example.com/data?id=123
End Sub
```

---

### Headers

```vb
Public Property Get Headers() As WebView2RequestHeaders
```

Gets the HTTP headers collection of the request.

Returns [WebView2RequestHeaders](./WebView2RequestHeaders.md) object, used to access and modify request headers.

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Get User-Agent
    Dim userAgent As String
    userAgent = Request.Headers.GetHeader("User-Agent")
    Debug.Print "User-Agent: " & userAgent

    ' Check if Authorization header exists
    If Request.Headers.Contains("Authorization") Then
        Debug.Print "Request has authorization"
    End If
End Sub
```

---

### ContentBytes

```vb
Public Property Get ContentBytes() As Variant
Public Property Let ContentBytes(Value As Variant)
```

Gets or sets the request content (byte array).

**Description:**

- Return type is `Byte()` array or `Empty` (no content)
- Typically used for request body of POST/PUT requests

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    Dim content As Variant
    content = Request.ContentBytes

    If Not IsEmpty(content) Then
        ' Convert to string for display
        Dim contentStr As String
        contentStr = StrConv(content, vbUnicode)
        Debug.Print "Request body: " & contentStr
    End If
End Sub
```

---

### ContentUTF8

```vb
Public Property Get ContentUTF8() As String
Public Property Let ContentUTF8(ByVal Value As String)
```

Gets or sets the request content (UTF-8 encoded string).

**Description:**

- Automatically handles UTF-8 encoding and decoding
- Suitable for text-type request bodies (JSON, form data, etc.)

**Example:**

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    Dim jsonContent As String
    jsonContent = Request.ContentUTF8

    ' Parse JSON content
    If InStr(jsonContent, "username") > 0 Then
        Debug.Print "Contains username field"
    End If
End Sub
```

## Usage Scenarios

### 1. Intercept and Modify Requests

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Check if it's a specific API request
    If InStr(Request.Uri, "api.example.com/track") > 0 Then
        ' Add custom header
        Request.Headers.AppendHeader "X-Custom-Header", "MyValue"
    End If
End Sub
```

### 2. Request Logging

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Log all requests
    Debug.Print "[" & Now & "] " & Request.Method & " " & Request.Uri

    ' Log specific header information
    Dim referer As String
    referer = Request.Headers.GetHeader("Referer")
    If referer <> "" Then
        Debug.Print "  Referer: " & referer
    End If
End Sub
```

### 3. Check Request in NavigationStarting

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, _
    ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, _
    ByRef Cancel As Boolean)

    ' Check request headers
    If RequestHeaders.Contains("X-Block-Navigation") Then
        Cancel = True
        MsgBox "Navigation blocked"
    End If
End Sub
```

## Complete Example

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' 1. Analyze request
    Debug.Print "=== WebResourceRequested ==="
    Debug.Print "Method: " & Request.Method
    Debug.Print "URI: " & Request.Uri

    ' 2. Iterate all request headers
    Debug.Print "Headers:"
    Dim header As WebView2Header
    For Each header In Request.Headers
        Debug.Print "  " & header.Name & ": " & header.Value
    Next

    ' 3. Handle specific types of requests
    Select Case Request.Method
        Case "POST", "PUT", "PATCH"
            ' Check request body
            Dim body As String
            body = Request.ContentUTF8
            Debug.Print "Body: " & Left(body, 200) ' Only show first 200 characters
    End Select

    ' 4. Return custom response (simulate API response)
    If InStr(Request.Uri, "/api/mock-data") > 0 Then
        Response.StatusCode = 200
        Response.ReasonPhrase = "OK"
        Response.Headers.AppendHeader "Content-Type", "application/json"
        Response.ContentUTF8 = "{\"status\":\"ok\",\"data\":[1,2,3]}"
    End If
End Sub
```

## Notes

1. **Thread Safety:** The `WebView2Request` object is only valid during event handling
2. **Content Modification:** Some request modifications may not affect the actual request sent, depending on WebView2 version
3. **Performance Considerations:** Frequently accessing request content may impact performance, avoid unnecessary processing
4. **Null Value Handling:** `ContentBytes` may return `Empty`, check before using
