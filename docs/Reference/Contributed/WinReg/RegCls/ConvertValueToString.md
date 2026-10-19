---
title: ConvertValueToString
parent: RegCls
permalink: /tB/Packages/Contributed/WinReg/RegCls/ConvertValueToString
has_toc: false
---
# ConvertValueToString
{: .no_toc }

Converts a registry value to its **String** representation.

**ConvertValueToString** is overloaded. One form accepts an already-open key handle and queries the value itself; the other form converts a byte array that the caller has already read.

## Overload 1 -- query from key handle

Reads the named value from an open key and returns a string representation of its data.

Syntax: *object*.**ConvertValueToString**( *hKey*, *subkey*, *lType* )

*hKey*
: *required* A **Long** holding the handle of an already-open registry key. The caller is responsible for opening and closing this handle; **ConvertValueToString** does not close it.

*subkey*
: *required* A **String** naming the value to read within *hKey*.

*lType*
: *required* A **Long** indicating the expected registry data type. Supported values are the `REG_SZ`, `REG_EXPAND_SZ`, `REG_DWORD`, `REG_DWORD_LITTLE_ENDIAN`, `REG_DWORD_BIG_ENDIAN`, and `REG_BINARY` constants.

Returns a **String**. For string types the null terminator is stripped. For DWORD types the value is returned as an eight-digit hexadecimal string prefixed with `0x`. For binary data the return value is formatted as `Binary (N bytes): XX XX ...` where each byte is a two-digit uppercase hex pair separated by spaces. For any other type code the return value is `Unsupported type: N`.

> [!WARNING] 1.0.1.1
> This overload does not find the value. It passes `StrPtr(subkey)` to a parameter that `RegQueryValueEx` declares `ByVal` **String**, so the name that reaches the function is not *subkey*, the query fails with error 2 (file not found), and the overload returns an empty string for `REG_SZ`, `REG_EXPAND_SZ`, the DWORD types and `REG_BINARY`. Only the `Unsupported type: N` result for any other type code is as described. Overload 2 and [**EnumValues**](EnumValues) are not affected.

## Overload 2 -- convert from byte array

Converts a byte array already read by `RegQueryValueEx` into a string representation.

Syntax: *object*.**ConvertValueToString**( *buf*, *lType* )

*buf*
: *required* A **Byte** array containing the raw data returned by a prior `RegQueryValueEx` call.

*lType*
: *required* A **Long** indicating the registry data type of the bytes in *buf*. Supported values are the same as for Overload 1.

Returns a **String**. For string types the result is the text up to the first null character. For DWORD types the bytes are written last byte first as two-digit uppercase hex pairs, with no `0x` prefix: eight hex digits for a 4-byte buffer, which for `REG_DWORD` is the number itself. For binary data the bytes are written in order as two-digit hex pairs with no separators and no `Binary (N bytes):` prefix. For any other type code the return value is `Unsupported type: N`.

### Remarks

The two overloads cover different calling patterns. Overload 1 is meant for the case where the value name and type are known up front and the caller wants a one-step result. Overload 2 is intended for batch or enumeration scenarios such as [**EnumValues**](EnumValues), where the raw bytes and the type code have already been read, and the caller passes both directly to avoid a second API call.

Overload 1 neither closes nor otherwise modifies *hKey*. When using Overload 1, open the key with at least `KEY_QUERY_VALUE` access and close it after all reads are complete.

> [!NOTE] 1.0.1.1
> Both overloads include `On Error Resume Next`, so a run-time error inside them is not raised to the caller. Overload 1 returns an empty string when the query fails. The source comments mark Overload 1 as not yet tested.

### Example

This example opens a registry key, calls Overload 1 on a value, then closes the key. The key handle is a **LongPtr**, which the method takes as a **Long**.

```tb
Dim reg As New RegCls
Dim hKey As LongPtr
Dim ret As Long
Dim sData As String

ret = RegOpenKeyEx(HKEY_CURRENT_USER, "Software\MyApp", 0, KEY_READ, hKey)
If ret = ERROR_SUCCESS Then
    sData = reg.ConvertValueToString(CLng(hKey), "MyValue", REG_SZ)
    Debug.Print sData
    RegCloseKey hKey
End If
```

This example uses Overload 2 inside a value-enumeration loop.

```tb
Dim reg As New RegCls
Dim dict As Dictionary
Set dict = reg.EnumValues(HKEY_CURRENT_USER, "Software\MyApp")
' EnumValues calls ConvertValueToString(buf, dataType) internally for each value.
If Not dict Is Nothing Then
    Dim key As Variant
    For Each key In dict.Keys
        Debug.Print key & " = " & dict(key)
    Next
End If
```

### See Also

- [EnumValues](EnumValues) method
- [ReadString](ReadString) method
- [ReadDWORD](ReadDWORD) method
- [GetRegistryValueType](GetRegistryValueType) function
