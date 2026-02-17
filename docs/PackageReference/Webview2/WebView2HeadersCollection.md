---
title: HeadersCollection
parent: WebView2 Package
nav_order: 14
---

# WebView2HeadersCollection Class

The `WebView2HeadersCollection` class is used to enumerate and manage HTTP header collections. This class implements the `IEnumVARIANT` interface and supports `For Each` enumeration.

## Class Information

| Property  | Value                          |
| --------- | ------------------------------ |
| Class Name | `WebView2HeadersCollection`     |
| COM Creatable | No                           |
| Implemented Interface | `IEnumVARIANT` |

## Interface Implementation

### IEnumVARIANT Interface Methods

This class implements the standard COM enumeration interface, primarily used via `For Each` syntax.

```vb
For Each header In HeadersCollection
    ' Process each header
Next
```

## Usage Scenarios

### 1. Enumerate All Request Headers

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    Debug.Print "=== Request Header List ==="

    Dim header As WebView2Header
    For Each header In RequestHeaders
        Debug.Print header.Name & ": " & header.Value
    Next
End Sub
```

**Sample Output:**

```
=== Request Header List ===
Host: www.example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...
Accept: text/html,application/xhtml+xml,application/xml;q=0.9
Accept-Language: en-US,en;q=0.9
Connection: keep-alive
```

### 2. Enumerate All Headers with a Specific Name

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    ' Get all Set-Cookie headers (if there are multiple)
    Dim cookieHeaders As WebView2HeadersCollection
    Set cookieHeaders = RequestHeaders.GetHeaders("Set-Cookie")

    If Not cookieHeaders Is Nothing Then
        Dim header As WebView2Header
        For Each header In cookieHeaders
            Debug.Print "Cookie: " & header.Value
        Next
    End If
End Sub
```

### 3. Enumerate Response Headers

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Set custom response
    Response.StatusCode = 200
    Response.ReasonPhrase = "OK"
    Response.ContentUTF8 = "<html><body>Test</body></html>"

    ' Add multiple response headers
    Response.Headers.AppendHeader "Content-Type", "text/html"
    Response.Headers.AppendHeader "Cache-Control", "no-cache"
    Response.Headers.AppendHeader "X-Custom-Header", "CustomValue"

    ' Enumerate all response headers (for debugging)
    Debug.Print "=== Response Header List ==="
    Dim header As WebView2Header
    For Each header In Response.Headers
        Debug.Print header.Name & ": " & header.Value
    Next
End Sub
```

### 4. Filter Specific Type of Headers

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    ' Only show security-related headers
    Debug.Print "=== Security-Related Headers ==="

    Dim header As WebView2Header
    For Each header In RequestHeaders
        If LCase(header.Name) = "authorization" Or _
           LCase(header.Name) = "cookie" Or _
           LCase(header.Name) = "x-api-key" Then
            Debug.Print header.Name & ": " & header.Value
        End If
    Next
End Sub
```

### 5. Header Statistics

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    Dim count As Long
    Dim totalLength As Long

    Dim header As WebView2Header
    For Each header In RequestHeaders
        count = count + 1
        totalLength = totalLength + Len(header.Name) + Len(header.Value)
    Next

    Debug.Print "Header count: " & count
    Debug.Print "Total length: " & totalLength & " bytes"
End Sub
```

### 6. Header Copying

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Copy request headers to response (example scenario: proxy server)
    Dim header As WebView2Header
    For Each header In Request.Headers
        ' Only copy specific headers
        If LCase(header.Name) <> "host" And LCase(header.Name) <> "connection" Then
            Response.Headers.AppendHeader header.Name, header.Value
        End If
    Next

    ' Add proxy identification
    Response.Headers.AppendHeader "X-Forwarded-For", "192.168.1.1"
    Response.Headers.AppendHeader "Via", "1.1 proxy-server"
End Sub
```

### 7. Header Validation

```vb
Private Function ValidateHeaders(ByVal RequestHeaders As WebView2RequestHeaders) As Boolean
    ' Check if required headers exist
    Dim requiredHeaders As Variant
    requiredHeaders = Array("Host", "User-Agent")

    Dim i As Long
    Dim header As WebView2Header
    Dim found As Boolean

    For i = LBound(requiredHeaders) To UBound(requiredHeaders)
        found = False
        For Each header In RequestHeaders
            If LCase(header.Name) = LCase(requiredHeaders(i)) Then
                found = True
                Exit For
            End If
        Next
        If Not found Then
            Debug.Print "Missing required header: " & requiredHeaders(i)
            ValidateHeaders = False
            Exit Function
        End If
    Next

    ValidateHeaders = True
End Function
```

## WebView2Header Object

The `WebView2Header` object represents a single HTTP header, containing the following properties:

| Property | Type    | Description   |
| -------- | ------- | ------------- |
| `Name`   | `String` | Header name   |
| `Value`  | `String` | Header value  |

**Example:**

```vb
Dim header As WebView2Header
For Each header In RequestHeaders
    Debug.Print "Name: " & header.Name
    Debug.Print "Value: " & header.Value
    Debug.Print "Length: " & Len(header.Name) & " + " & Len(header.Value)
Next
```

## Notes

1. **Enumeration Order:** The order of header enumeration may not exactly match the insertion order.

2. **Case Insensitivity:** HTTP header names are case-insensitive, but enumeration returns the original case.

3. **Read-only Enumeration:** `WebView2HeadersCollection` is primarily used for enumeration, headers cannot be modified through enumeration. To modify headers, use `RequestHeaders` or `ResponseHeaders` object methods.

4. **Empty Collections:** If there are no header information, enumeration will not throw exceptions, the `For Each` loop will not execute any iterations.

5. **Performance Considerations:** Enumeration of requests with many headers may take some time. If you only need to get specific headers, prioritize using `GetHeader` or `Contains` methods.

6. **Thread Safety:** Enumeration operations should be performed in the main thread or event handling context, avoid using in multi-threaded environments.

7. **Implementation Limitations:** The `Skip`, `Reset`, `Clone` methods are currently unimplemented (return `E_NOTIMPL`), only `For Each` syntax can be used for enumeration.
