---
title: Header
parent: WebView2 Package
nav_order: 15
---

# WebView2Header Class

The `WebView2Header` class represents a single HTTP header information, containing header name and header value.

## Class Information

| Property  | Value                |
| --------- | -------------------- |
| Class Name | `WebView2Header`     |
| COM Creatable | No                 |

## Properties

### Name

```vb
Public Name As String
```

The name of the HTTP header.

**Type:** `String`

**Example:**

```vb
Dim header As WebView2Header
header.Name = "Content-Type"
```

### Value

```vb
Public Value As String
```

The value of the HTTP header.

**Type:** `String`

**Example:**

```vb
Dim header As WebView2Header
header.Value = "application/json"
```

## Constructor

```vb
Public Sub New(ByVal Name As String, ByVal Value As String)
```

Creates a new `WebView2Header` object.

**Parameters:**

- `Name` - Header name
- `Value` - Header value

**Example:**

```vb
Dim header As New WebView2Header("Content-Type", "text/html")
Debug.Print header.Name & ": " & header.Value
' Output: Content-Type: text/html
```

## Usage Scenarios

### 1. Create Custom Header Object

```vb
' Create single header object
Dim authHeader As New WebView2Header("Authorization", "Bearer token123")
Debug.Print authHeader.Name & ": " & authHeader.Value

' Create multiple headers
Dim headers() As WebView2Header
ReDim headers(2)
Set headers(0) = New WebView2Header("Content-Type", "application/json")
Set headers(1) = New WebView2Header("Accept", "application/json")
Set headers(2) = New WebView2Header("User-Agent", "MyApp/1.0")

Dim i As Long
For i = LBound(headers) To UBound(headers)
    Debug.Print headers(i).Name & ": " & headers(i).Value
Next
```

### 2. Access in Enumeration

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, _
    ByVal IsUserInitiated As Boolean, ByVal IsRedirected As Boolean, _
    ByVal RequestHeaders As WebView2RequestHeaders, ByRef Cancel As Boolean)

    Dim header As WebView2Header
    For Each header In RequestHeaders
        Debug.Print "Name: " & header.Name
        Debug.Print "Value: " & header.Value
        Debug.Print "---"
    Next
End Sub
```

### 3. Header Validation

```vb
Private Function ValidateHeader(ByVal header As WebView2Header) As Boolean
    ' Check if header name is valid
    If Len(header.Name) = 0 Then
        Debug.Print "Error: Header name is empty"
        ValidateHeader = False
        Exit Function
    End If

    ' Check if header name contains illegal characters
    Dim invalidChars As String
    invalidChars = "()<>@,;:\""/[]?={} \t"

    Dim i As Long
    For i = 1 To Len(invalidChars)
        If InStr(header.Name, Mid(invalidChars, i, 1)) > 0 Then
            Debug.Print "Error: Header name contains illegal characters"
            ValidateHeader = False
            Exit Function
        End If
    Next

    ValidateHeader = True
End Function

' Usage example
Dim testHeader As New WebView2Header("Invalid-Name()", "value")
If Not ValidateHeader(testHeader) Then
    Debug.Print "Header validation failed"
End If
```

### 4. Header Conversion

```vb
' Convert header object to string
Function HeaderToString(ByVal header As WebView2Header) As String
    HeaderToString = header.Name & ": " & header.Value
End Function

' Usage example
Dim header As New WebView2Header("Content-Type", "application/json")
Debug.Print HeaderToString(header)
' Output: Content-Type: application/json

' Convert header object array to string
Function HeadersToString(headers() As WebView2Header) As String
    Dim result As String
    Dim i As Long

    For i = LBound(headers) To UBound(headers)
        result = result & headers(i).Name & ": " & headers(i).Value & vbCrLf
    Next

    HeadersToString = result
End Function
```

### 5. Header Filtering

```vb
' Filter specific headers
Private Sub FilterHeaders(ByVal RequestHeaders As WebView2RequestHeaders)
    Dim header As WebView2Header

    For Each header In RequestHeaders
        Select Case LCase(header.Name)
            Case "authorization"
                Debug.Print "Found authorization header: " & Left(header.Value, 10) & "..."
            Case "cookie"
                Debug.Print "Found Cookie header"
            Case "user-agent"
                Debug.Print "User Agent: " & header.Value
        End Select
    Next
End Sub
```

### 6. Header Cloning

```vb
' Clone header object
Function CloneHeader(ByVal header As WebView2Header) As WebView2Header
    Set CloneHeader = New WebView2Header(header.Name, header.Value)
End Function

' Clone header object array
Function CloneHeaders(headers() As WebView2Header) As WebView2Header()
    Dim result() As WebView2Header
    ReDim result(UBound(headers))

    Dim i As Long
    For i = LBound(headers) To UBound(headers)
        Set result(i) = CloneHeader(headers(i))
    Next

    CloneHeaders = result
End Function

' Usage example
Dim originalHeader As New WebView2Header("X-Custom", "value1")
Dim clonedHeader As WebView2Header
Set clonedHeader = CloneHeader(originalHeader)

' Modifying clone doesn't affect original object
clonedHeader.Value = "value2"
Debug.Print originalHeader.Value  ' Output: value1
Debug.Print clonedHeader.Value   ' Output: value2
```

### 7. Header Comparison

```vb
' Compare two header objects
Function HeadersEqual(ByVal header1 As WebView2Header, _
                      ByVal header2 As WebView2Header) As Boolean
    HeadersEqual = (LCase(header1.Name) = LCase(header2.Name) And _
                    header1.Value = header2.Value)
End Function

' Usage example
Dim header1 As New WebView2Header("Content-Type", "application/json")
Dim header2 As New WebView2Header("Content-Type", "application/json")
Dim header3 As New WebView2Header("content-type", "application/json")  ' Different case

Debug.Print HeadersEqual(header1, header2)  ' Output: True
Debug.Print HeadersEqual(header1, header3)  ' Output: True (case-insensitive name)
```

### 8. Header Collection Operations

```vb
' Find header
Function FindHeader(headers() As WebView2Header, ByVal name As String) As WebView2Header
    Dim i As Long
    For i = LBound(headers) To UBound(headers)
        If LCase(headers(i).Name) = LCase(name) Then
            Set FindHeader = headers(i)
            Exit Function
        End If
    Next
    Set FindHeader = Nothing
End Function

' Add header (if doesn't exist)
Sub AddHeaderIfNotExists(headers() As WebView2Header, _
                          ByVal name As String, ByVal value As String)
    If FindHeader(headers, name) Is Nothing Then
        Dim newSize As Long
        newSize = UBound(headers) + 1
        ReDim Preserve headers(newSize)
        Set headers(newSize) = New WebView2Header(name, value)
    End If
End Sub

' Usage example
Dim headers() As WebView2Header
ReDim headers(0)
Set headers(0) = New WebView2Header("Content-Type", "text/html")

AddHeaderIfNotExists headers, "Content-Type", "application/json"
AddHeaderIfNotExists headers, "Authorization", "Bearer token"

Debug.Print "Header count: " & UBound(headers) + 1  ' Output: 2
```

## Common HTTP Header Types

### Request Headers

```vb
Dim userAgent As New WebView2Header("User-Agent", "MyApp/1.0")
Dim accept As New WebView2Header("Accept", "application/json")
Dim contentType As New WebView2Header("Content-Type", "application/json")
Dim authorization As New WebView2Header("Authorization", "Bearer token123")
Dim cookie As New WebView2Header("Cookie", "session_id=abc123")
```

### Response Headers

```vb
Dim contentType As New WebView2Header("Content-Type", "text/html; charset=utf-8")
Dim contentLength As New WebView2Header("Content-Length", "1024")
Dim cacheControl As New WebView2Header("Cache-Control", "no-cache")
Dim setCookie As New WebView2Header("Set-Cookie", "session_id=xyz789; Path=/; HttpOnly")
Dim server As New WebView2Header("Server", "MyServer/1.0")
```

### Security Headers

```vb
Dim xContentTypeOptions As New WebView2Header("X-Content-Type-Options", "nosniff")
Dim xFrameOptions As New WebView2Header("X-Frame-Options", "DENY")
Dim xXssProtection As New WebView2Header("X-XSS-Protection", "1; mode=block")
Dim strictTransportSecurity As New WebView2Header("Strict-Transport-Security", "max-age=31536000")
```

### CORS Headers

```vb
Dim accessControlAllowOrigin As New WebView2Header("Access-Control-Allow-Origin", "*")
Dim accessControlAllowMethods As New WebView2Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
Dim accessControlAllowHeaders As New WebView2Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

## Notes

1. **Case Sensitivity:** HTTP header names are case-insensitive, use `LCase` or `UCase` functions when comparing.

2. **Space Handling:** Spaces in header names and values are significant, don't trim them arbitrarily.

3. **Multi-value Headers:** Some headers may have multiple values (such as `Set-Cookie`), `WebView2Header` only stores a single value, multiple values need multiple `WebView2Header` objects.

4. **Special Characters:** Header names should avoid containing special characters, some characters are illegal.

5. **Length Limits:** HTTP headers have length limits (usually 8KB or more), overly long headers may cause issues.

6. **Encoding Issues:** Header values are typically ASCII characters, non-ASCII characters may need encoding.

7. **Read-only Properties:** `WebView2Header` objects obtained in `WebResourceRequested` event are read-only, modifications won't affect the actual request. To modify headers, use `RequestHeaders` or `ResponseHeaders` object methods.

8. **Object Lifecycle:** `WebView2Header` objects are typically created and managed by `WebView2HeadersCollection`, no need for manual creation and destruction.
