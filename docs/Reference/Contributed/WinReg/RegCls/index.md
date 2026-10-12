---
title: RegCls
parent: WinReg Package
permalink: /tB/Packages/Contributed/WinReg/RegCls/
has_toc: false
---

# RegCls class
{: .no_toc }

A Windows Registry helper class that reads, writes, deletes, and enumerates registry keys and values through the Win32 `advapi32` API.

**RegCls** wraps the most common registry operations---reading and writing string and DWORD values, creating and deleting keys, checking whether a key or value exists, and enumerating all values under a key---into a single class. It declares the [**RegKeyspace**](../RegKeyspace) and [**enumRegSzType**](../enumRegSzType) enumerations and its own copies of the `advapi32` declarations it uses, and takes `RegOpenKeyEx`, `RegSetValueEx` and the types **BOOL** and **REGTYPES** from the **WinDevLib** package. A comment in the source recommends the declarations of **WinDevLib** over the class's own.

```tb check_build
Dim reg As New RegCls

' Write a value
reg.WriteString HKEY_CURRENT_USER, "Software\MyApp", "UserName", "Alice"

' Read it back
Dim name As String
name = reg.ReadString(HKEY_CURRENT_USER, "Software\MyApp", "UserName", "DefaultUser")
Debug.Print name   ' Alice

' Check for the key
If reg.KeyExists(HKEY_CURRENT_USER, "Software\MyApp") Then
    Debug.Print "Key exists."
End If
```

* TOC
{:toc}

## Methods

### ConvertValueToString (overload 1)
{: .no_toc }

Reads a registry value from an already-open key and converts it to a **String** representation. The caller is responsible for closing the key handle after the call.

Syntax: *object*.**ConvertValueToString** ( *hKey*, *subkey*, *lType* ) **As String**

*hKey*
: *required* A **Long** handle to an already-open registry key, as returned by `RegOpenKeyEx`.

*subkey*
: *required* A **String** naming the value to read within the open key.

*lType*
: *required* A **Long** identifying the registry value type (e.g. `REG_SZ`, `REG_DWORD`, `REG_BINARY`). Use the `REGTYPES` constants from **WinDevLib**.

Returns an empty string when the call fails. For `REG_SZ` / `REG_EXPAND_SZ` values, returns the raw string. For `REG_DWORD` / `REG_DWORD_LITTLE_ENDIAN` / `REG_DWORD_BIG_ENDIAN` values, returns an 8-character zero-padded hexadecimal string in the form `0x00000000`. For `REG_BINARY` values, returns a space-separated hex dump prefixed with `"Binary (N bytes): "`. Unsupported types return `"Unsupported type: "` followed by the numeric type code.

> [!NOTE]
> This overload queries the value through the provided key handle. The caller must keep the handle open for the duration of the call and close it with `RegCloseKey` afterwards. The source comments mark this overload as not yet tested.

> [!WARNING]
> This overload does not find the value. It passes `StrPtr(subkey)` to a parameter that `RegQueryValueEx` declares `ByVal` **String**, so the name that reaches the function is not *subkey*, the query fails with error 2 (file not found), and the overload returns an empty string for `REG_SZ`, `REG_EXPAND_SZ`, the DWORD types and `REG_BINARY`. Any other type code returns `"Unsupported type: "` followed by the code. Overload 2 and [**EnumValues**](#enumvalues) are not affected.

### ConvertValueToString (overload 2)
{: .no_toc }

Converts an already-read byte buffer and its type code to a **String** representation.

Syntax: *object*.**ConvertValueToString** ( *buf*(), *lType* ) **As String**

*buf*
: *required* A **Byte** array containing the raw data read by a prior `RegQueryValueEx` call.

*lType*
: *required* A **Long** identifying the registry value type. Use the `REGTYPES` constants from **WinDevLib**.

For `REG_SZ` / `REG_EXPAND_SZ` values, returns the buffer content as a **String** up to the first null character. For the three DWORD types, returns the bytes last byte first as upper-case hex pairs, with no `0x` prefix: eight hex digits for a 4-byte buffer, which for `REG_DWORD` is the number itself. For `REG_BINARY` values, returns the bytes in order as a concatenated hex string without separators or a prefix. Unsupported types return `"Unsupported type: "` followed by the numeric type code.

### CreateKey
{: .no_toc }

Creates a registry key, including any intermediate sub-keys that do not yet exist.

Syntax: *object*.**CreateKey** ( *RootKey*, *KeyPath* ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive, such as `HKEY_CURRENT_USER` or `HKEY_LOCAL_MACHINE`.

*KeyPath*
: *required* A **String** with the backslash-delimited sub-key path beneath *RootKey*, e.g. `"Software\MyApp\Settings\Advanced"`. Multi-level paths are created in one call.

Returns **True** on success, **False** if the key could not be created (typically due to insufficient privileges).

> [!IMPORTANT]
> Creating keys under `HKEY_LOCAL_MACHINE` typically requires the application to run with administrator rights.

### DeleteKey
{: .no_toc }

Deletes a registry key. The key must have no sub-keys for this call to succeed; its values are deleted with it. Use [**DeleteKeyEx**](#deletekeyex) to delete a key together with all its sub-keys.

Syntax: *object*.**DeleteKey** ( *RootKey*, *KeyPath* ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path to delete beneath *RootKey*.

Returns **True** on success, **False** if the key could not be deleted (for example, because it still has sub-keys, does not exist, or because of insufficient privileges).

### DeleteKeyEx
{: .no_toc }

Recursively deletes a registry key together with all its sub-keys and values.

Syntax: *object*.**DeleteKeyEx** ( *RootKey*, *KeyPath* ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path to delete beneath *RootKey*.

Returns **True** on success, **False** if the key could not be deleted. The method first enumerates and recursively deletes all sub-keys (calling itself for each one), then deletes all values in the key, closes the handle, and finally removes the key itself with `RegDeleteKey`. Both enumeration loops always request index 0, so each deletion must succeed for the loop to advance; a sub-key or value that cannot be deleted (for example, for lack of permission) leaves the loop repeating on the same entry.

> [!WARNING]
> This operation cannot be undone. The entire key tree is permanently removed from the registry. Double-check the *KeyPath* argument before calling.

### DeleteValue
{: .no_toc }

Deletes a single named value from a registry key.

Syntax: *object*.**DeleteValue** ( *RootKey*, *KeyPath*, *ValueName* ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path containing the value.

*ValueName*
: *required* A **String** naming the value to delete.

Returns **True** on success, **False** if the value does not exist or could not be deleted.

### EnumValues
{: .no_toc }

Returns all named values under a registry key as a **Dictionary** mapping each value name to its data converted to a **String**.

Syntax: *object*.**EnumValues** ( *RootKey*, *KeyPath* ) **As Dictionary**

*RootKey*
: *required* A **Long** identifying the root hive. Pass a member of [**RegKeyspace**](../RegKeyspace).

*KeyPath*
: *required* A **String** with the sub-key path to enumerate.

Returns a **Dictionary** (the `Scripting.Dictionary` class of the Microsoft Scripting Runtime, which the package references) where each key is a value name and each associated value is the data formatted as a **String** via [**ConvertValueToString (overload 2)**](#convertvaluetostring-overload-2). Returns **Nothing** if the key cannot be opened. If a value cannot be enumerated or read, the loop stops and the entries collected up to that point are returned.

The method opens the key with `KEY_READ Or KEY_WOW64_64KEY` so that 64-bit registry values are visible from a 32-bit process. The other methods open keys without that flag.

### GetRegistryValueType
{: .no_toc }

Returns the type code of a named value without reading its data.

Syntax: *object*.**GetRegistryValueType** ( *hKey*, *subKey*, *valueName* ) **As REGTYPES**

*hKey*
: *required* A **Long** key handle, usually a predefined root such as `HKEY_CURRENT_USER`.

*subKey*
: *required* A **String** with the sub-key path to open beneath *hKey*.

*valueName*
: *required* A **String** naming the value whose type is queried.

Returns a member of the `REGTYPES` enumeration (from **WinDevLib**), such as `REG_SZ`, `REG_DWORD`, or `REG_BINARY`. Returns `REG_NONE` if the sub-key cannot be opened or the value does not exist.

> [!WARNING]
> The method returns `REG_NONE` for every value that holds data. It asks `RegQueryValueEx` for the type with a data pointer and a size of zero, and the call fails with error 234 (*more data*) when the value has any data. Only a value of zero length, such as an empty `REG_BINARY`, gets its type.

### KeyExists
{: .no_toc }

Returns whether a registry key exists.

Syntax: *object*.**KeyExists** ( *RootKey*, *KeyPath* ) **As Boolean**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path to test.

Returns **True** if the key can be opened for query; **False** otherwise.

### ReadDWORD
{: .no_toc }

Reads a `REG_DWORD` value from the registry and returns it as a **Long**.

Syntax: *object*.**ReadDWORD** ( *RootKey*, *KeyPath*, *ValueName* [, *DefaultValue* ] ) **As Long**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path containing the value.

*ValueName*
: *required* A **String** naming the `REG_DWORD` value to read.

*DefaultValue*
: *optional* A **Long** returned when the key or value does not exist, or when the stored type is not `REG_DWORD`. Default: `-1`.

### ReadString
{: .no_toc }

Reads a `REG_SZ` value from the registry and returns it as a **String**.

Syntax: *object*.**ReadString** ( *RootKey*, *KeyPath*, *ValueName* [, *DefaultValue* ] ) **As String**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path containing the value.

*ValueName*
: *required* A **String** naming the `REG_SZ` value to read.

*DefaultValue*
: *optional* A **String** returned when the key or value does not exist, or when the stored type is not `REG_SZ`. Default: `""` (empty string).

> [!WARNING]
> The string that **ReadString** returns is longer than the stored text. For a text of *n* characters the result has 2*n* + 1: the text, then *n* + 1 NUL characters (`Chr(0)`). The method cuts its buffer to the size that `RegQueryValueEx` reports, less one, and that size counts bytes while a character of the buffer is two bytes. `ReadString(...) = "Alice"` is therefore **False** for a stored `Alice`. A *DefaultValue* is returned as it is, with no NUL characters. To get the text, cut the result at the first NUL: `Split(ReadString(...), vbNullChar)(0)`.

### ValueExists
{: .no_toc }

Returns whether a named value exists within a registry key.

Syntax: *object*.**ValueExists** ( *RootKey*, *KeyPath*, *ValueName* ) **As Boolean**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path containing the value.

*ValueName*
: *required* A **String** naming the value to test.

Returns **True** if the key can be opened and the named value is found; **False** otherwise.

### WriteDWORD
{: .no_toc }

Creates or updates a `REG_DWORD` value in the registry.

Syntax: *object*.**WriteDWORD** ( *RootKey*, *KeyPath*, *ValueName*, *ValueData* ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path. The key is created if it does not exist.

*ValueName*
: *required* A **String** naming the value to write.

*ValueData*
: *required* A **Long** containing the DWORD to store.

Returns **True** on success, **False** if the key could not be created or the value could not be written.

### WriteString
{: .no_toc }

Creates or updates a `REG_SZ` value in the registry.

Syntax: *object*.**WriteString** ( *RootKey*, *KeyPath*, *ValueName*, *ValueData* ) **As BOOL**

*RootKey*
: *required* A [**RegKeyspace**](../RegKeyspace) constant identifying the root hive.

*KeyPath*
: *required* A **String** with the sub-key path. The key is created if it does not exist.

*ValueName*
: *required* A **String** naming the value to write.

*ValueData*
: *required* A **String** containing the text to store.

Returns **True** on success, **False** if the key could not be created or the value could not be written.

> [!NOTE]
> The byte count passed to `RegSetValueEx` is `LenB(ValueData) + 2`: the byte length of the string plus the two-byte null terminator.

## Remarks

**RegCls** requires the **WinDevLib** package. The class declares the enumerations [**RegKeyspace**](../RegKeyspace) and [**enumRegSzType**](../enumRegSzType), its own copies of `RegCreateKeyEx`, `RegQueryValueEx`, `RegDeleteValue`, `RegDeleteKey`, `RegCloseKey`, `RegEnumKeyEx` and `RegEnumValue`, and the constants `ERROR_SUCCESS` and `KEY_*` that it uses. The code relies on **WinDevLib** for `RegOpenKeyEx`, `RegSetValueEx`, the types `REGTYPES` and `BOOL`, and the types that its own declarations use (`RegOptions`, `REGSAM`, `SECURITY_ATTRIBUTES`, `FILETIME` and `RegistryCreateDispositions`). The package embeds **WinDevLib**; a project that names those types or calls those functions itself references **WinDevLib** as well.

The `BOOL` return type used by the create, write and delete methods is declared by WinDevLib. The methods assign it a **Boolean** result, so it can be tested directly in an `If` statement.

All methods use `On Error Resume Next` internally. A failure in a Win32 API call causes the method to return its failure indicator (**False**, the default value, `REG_NONE` or **Nothing**, depending on the method) rather than raising an error to the caller.

Registry handles are closed with `RegCloseKey` in every code path where `RegOpenKeyEx` or `RegCreateKeyEx` succeeded. Most methods skip the call when the open fails, because no valid handle exists then; **KeyExists**, **CreateKey** and **DeleteKeyEx** call `RegCloseKey` unconditionally.

## Example

This example stores and retrieves application settings.

```tb check_build
Dim reg As New RegCls
Const AppKey As String = "Software\MyApp"

' First run: write defaults
If Not reg.KeyExists(HKEY_CURRENT_USER, AppKey) Then
    reg.WriteString  HKEY_CURRENT_USER, AppKey, "UserName", "DefaultUser"
    reg.WriteDWORD   HKEY_CURRENT_USER, AppKey, "RunCount",  0
End If

' Read settings
Dim userName As String
Dim runCount As Long
userName = reg.ReadString(HKEY_CURRENT_USER, AppKey, "UserName", "DefaultUser")
runCount  = reg.ReadDWORD( HKEY_CURRENT_USER, AppKey, "RunCount",  0)

' Increment the run counter
reg.WriteDWORD HKEY_CURRENT_USER, AppKey, "RunCount", runCount + 1

' Enumerate all values in the key
Dim d As Dictionary
Set d = reg.EnumValues(HKEY_CURRENT_USER, AppKey)
If Not d Is Nothing Then
    Dim k As Variant
    For Each k In d.Keys
        Debug.Print k & " = " & d(k)
    Next
End If

' Clean up on uninstall
reg.DeleteKeyEx HKEY_CURRENT_USER, AppKey
```

## See Also

- [WinReg](../) package -- overview and installation
