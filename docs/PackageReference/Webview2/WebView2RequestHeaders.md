---
title: RequestHeaders
parent: WebView2 Package
nav_order: 12
---

# WebView2RequestHeaders Class

The `WebView2RequestHeaders` class is used to manage HTTP request header information.

## Class Information

| Property  | Value                     |
| --------- | ------------------------ |
| Class Name | `WebView2RequestHeaders` |
| COM Creatable | No                       |

## Methods

### GetHeader

```vb
Public Function GetHeader(ByVal name As String) As String
```

Gets the value of the request header with the specified name.

**Parameters:**

- `name` - Request header name

**Return Value:** The value string of the request header

**Example:**

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    Dim userAgent As String
    userAgent = RequestHeaders.GetHeader("User-Agent")
    Debug.Print "User-Agent: " & userAgent
End Sub
```

### Contains

```vb
Public Function Contains(ByVal name As String) As Boolean
```

Checks if a request header with the specified name exists.

**Parameters:**

- `name` - Request header name

**Return Value:** Returns `True` if it contains, otherwise returns `False`

**Example:**

```vb
If RequestHeaders.Contains("Authorization") Then
    Debug.Print "Request contains Authorization header"
End If
```

### AppendHeader

```vb
Public Sub AppendHeader(ByVal name As String, ByVal value As String)
```

Sets the value of the request header (replaces if it already exists).

**Parameters:**

- `name` - Request header name
- `value` - Request header value

**Example:**

```vb
' Add custom User-Agent
RequestHeaders.AppendHeader "User-Agent", "MyApp/1.0"

' Add Authorization header
RequestHeaders.AppendHeader "Authorization", "Bearer token123"
```

### RemoveHeader

```vb
Public Sub RemoveHeader(ByVal name As String)
```

Removes the request header with the specified name.

**Parameters:**

- `name` - Request header name

**Example:**

```vb
RequestHeaders.RemoveHeader("Cookie")
```

### GetHeaders

```vb
Public Function GetHeaders(ByVal name As String) As WebView2HeadersCollection
```

Gets all values of the request header with the specified name (there may be multiple headers with the same name).

**Parameters:**

- `name` - Request header name

**Return Value:** `WebView2HeadersCollection` collection object

### Enumerator

```vb
Public Function _NewEnum() As WebView2HeadersCollection
```

Supports `For Each` to enumerate all request headers.

**Example:**

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    Dim header As WebView2Header
    For Each header In RequestHeaders
        Debug.Print header.Name & ": " & header.Value
    Next
End Sub
```

## Usage Scenarios

### 1. View Request Headers in Navigation Event

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    Debug.Print "Navigating to: " & Uri
    Debug.Print "Request headers:"

    Dim header As WebView2Header
    For Each header In RequestHeaders
        Debug.Print "  " & header.Name & ": " & header.Value
    Next
End Sub
```

### 2. Modify Request Headers

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    ' Add custom request header
    RequestHeaders.AppendHeader "X-Custom-Header", "CustomValue"

    ' Replace User-Agent
    RequestHeaders.AppendHeader "User-Agent", "MyApp/2.0"
End Sub
```

### 3. Intercept Based on Request Headers

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    ' Intercept requests missing specific authentication header
    If Not RequestHeaders.Contains("Authorization") Then
        Debug.Print "Missing Authorization header, cancel navigation"
        Cancel = True
    End If
End Sub
```

## Notes

1. **Modification Timing:** Request header modifications can only be done in the `NavigationStarting` event; modifications at other times are invalid.

2. **Case Sensitivity:** Request header names are case-insensitive, for example, "Content-Type" and "content-type" are considered the same.

3. **Special Request Headers:** Some request headers (such as `Host`, `Content-Length`) are automatically managed by WebView2, manual modification may be invalid.

4. **Security:** When handling sensitive information (such as `Authorization`, `Cookie`), pay attention to security to avoid leaks.

5. **Encoding Issues:** Request header values should comply with HTTP specifications, some special characters may need encoding.
