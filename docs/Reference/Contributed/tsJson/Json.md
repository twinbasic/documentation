---
title: Json
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/Json
has_toc: false
---

# Json module
{: .no_toc }

The **Json** module is the entry point of the package. It builds JSON values, reads and writes them as text, bytes and files, finds and changes parts of them with JSON Pointer, JSONPath and JSON Patch, validates them against a JSON Schema, and converts ISO 8601 text. A JSON object is a [**JsonObject**](JsonObject) and a JSON array is a [**JsonArray**](JsonArray). The other JSON values are plain **Variant** values, as [The JSON model](.#the-json-model) describes.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""name"":""Ann"",""tags"":[""a"",""b""]}")
Debug.Print Json.QueryOne(doc, "$.tags[1]")                         ' b
Debug.Print Json.PointerGet(doc, "/name")                           ' Ann

Dim changed As Variant = Json.PointerSet(doc, "/name", "Bea")
Debug.Print Json.Serialize(changed, JsonOptions.Minified)           ' {"name":"Bea","tags":["a","b"]}
Debug.Print Json.Serialize(doc, JsonOptions.Minified)               ' {"name":"Ann","tags":["a","b"]}
```

The module has no state and no settings. Options for one call are a [**JsonOptions**](JsonOptions) object that is passed as the last argument. **Nothing**, the default, means the RFC 8259 defaults of [**JsonOptions.Rfc**](JsonOptions#rfc), except where a function below says otherwise.

**Errors.** The functions of the module do not raise run-time errors for bad data or bad arguments. A function that fails returns an empty result (**Empty**, **Nothing**, an empty string, **False** or an unbound array) and sets the last error, which the predeclared object [**JsonError**](JsonError) reports. A function that can fail clears the last error when it starts, so the last error always belongs to the latest such call. The members that cannot fail neither clear nor set it: [**TypeOfValue**](#typeofvalue), [**IsObject**](#isobject), [**IsArray**](#isarray), [**Equals**](#equals), [**PointerEscape**](#pointerescape), [**PointerUnescape**](#pointerunescape), [**IsValidPattern**](#isvalidpattern), [**IsMatchPattern**](#ismatchpattern), [**IsSearchPattern**](#issearchpattern) and [**FormatIso8601**](#formatiso8601). The origin of an error is the name of the function that was called, such as `Json.Parse`. The functions [**TryParse**](#tryparse), [**TryParseFile**](#tryparsefile), [**TryParseLines**](#tryparselines) and [**TryParseLinesFile**](#tryparselinesfile) report the origin of the function they call: an error of **TryParse** has the origin `Json.Parse`.

> [!NOTE] 1.0.15.0
> A function that finds nothing is not an error when its name says so (**PointerExists**, **PointerTryGet**, the `Try` functions and the JSONPath queries). The `Try` functions return **False**, and a JSONPath query that matches nothing returns an empty result with no error. Check [**JsonError.HasError**](JsonError#haserror), not **IsEmpty**, after a function that can return a JSON null: [**Parse**](#parse) returns **Null** for the text `null`, and **Empty** only for a failure.

* TOC
{:toc}

## Types

### eJsonType
{: .no_toc }

The JSON type of a value, as [**TypeOfValue**](#typeofvalue) and [**JsonObject.ValueType**](JsonObject#valuetype) report it.

| Member | Value | Meaning |
|:-------|------:|:--------|
| **jtUnknown** | 0 | Not a JSON value: **Empty**, **Nothing**, a **Date**, any object other than a **JsonObject** or a **JsonArray**, and a **Variant** array. |
| **jtNull** | 1 | **Null**. |
| **jtBoolean** | 2 | A **Boolean**. |
| **jtNumber** | 3 | A number of any numeric type: **Byte**, **Integer**, **Long**, **LongLong**, **Single**, **Double**, **Currency** or **Decimal**. |
| **jtString** | 4 | A **String**. |
| **jtArray** | 5 | A [**JsonArray**](JsonArray). |
| **jtObject** | 6 | A [**JsonObject**](JsonObject). |

## Building values

### Map
{: .no_toc }

Returns an empty object, or an object made from pairs of a key and a value.

Syntax: **Json.Map** ( [ *key1*, *value1* [ , *key2*, *value2* ... ] ] ) **As** [**JsonObject**](JsonObject)

*key1*, *key2* ...
: *optional* A **String** that names a member. Any other type is an error.

*value1*, *value2* ...
: *optional* The value of the member before it: a **String**, a number, a **Boolean**, **Null**, a [**JsonObject**](JsonObject) or a [**JsonArray**](JsonArray). The value is stored as it is; it is not checked and, for an object, not copied.

With no arguments the result is an empty object. The members are in the order of the arguments. If a key appears twice, the second value replaces the first, and the member keeps the place of the first. The function returns **Nothing** and sets the error `InvalidArgument` when the number of arguments is odd or a key is not a **String**.

```tb check_build check_run
Dim o As JsonObject = Json.Map("name", "Ann", "age", 31, "tags", Json.Arr("a", "b"), "note", Null)
Debug.Print o.Count                                       ' 4
Debug.Print Json.Serialize(o, JsonOptions.Minified)       ' {"name":"Ann","age":31,"tags":["a","b"],"note":null}

Dim bad As JsonObject = Json.Map("key")
Debug.Print bad Is Nothing                                ' True
Debug.Print JsonError.Code                                ' InvalidArgument
Debug.Print JsonError.Origin                              ' Json.Map
```

### Arr
{: .no_toc }

Returns an empty array, or an array of the arguments.

Syntax: **Json.Arr** ( [ *value1* [ , *value2* ... ] ] ) **As** [**JsonArray**](JsonArray)

*value1*, *value2* ...
: *optional* The elements, in order. Each is stored as it is, as [**JsonArray.Add**](JsonArray#add) stores it.

```tb check_build check_run
Dim a As JsonArray = Json.Arr(1, "two", True, Null, Json.Arr(), Json.Map())
Debug.Print a.Count                                       ' 6
Debug.Print Json.Serialize(a, JsonOptions.Minified)       ' [1,"two",true,null,[],{}]
```

### TypeOfValue
{: .no_toc }

Returns the JSON type of a value.

Syntax: **Json.TypeOfValue** ( *value* ) **As** [**eJsonType**](#ejsontype)

*value*
: *required* Any **Variant**.

A value that is not a JSON value, including a **Date**, is **jtUnknown**. The function does not change the last error.

```tb check_build check_run
Debug.Print Json.TypeOfValue(Null) = jtNull               ' True
Debug.Print Json.TypeOfValue(3.5) = jtNumber              ' True
Debug.Print Json.TypeOfValue("x") = jtString              ' True
Debug.Print Json.TypeOfValue(Json.Arr()) = jtArray        ' True
Debug.Print Json.TypeOfValue(Json.Map()) = jtObject       ' True
Debug.Print Json.TypeOfValue(Empty) = jtUnknown           ' True
Debug.Print Json.TypeOfValue(#18-Aug-2026#) = jtUnknown   ' True
```

### IsObject
{: .no_toc }

Returns whether a value is a [**JsonObject**](JsonObject).

Syntax: **Json.IsObject** ( *value* ) **As Boolean**

*value*
: *required* Any **Variant**.

The function does not change the last error. A **Variant** that holds an array of values is not a [**JsonArray**](JsonArray), so [**IsArray**](#isarray) is **False** for it.

### IsArray
{: .no_toc }

Returns whether a value is a [**JsonArray**](JsonArray).

Syntax: **Json.IsArray** ( *value* ) **As Boolean**

*value*
: *required* Any **Variant**.

The function does not change the last error. The result is **False** for a **Variant** that holds an array of values, such as the result of [**Query**](#query), although [**Serialize**](#serialize) writes such an array as a JSON array.

```tb check_build check_run
Dim v As Variant = Json.Parse("[1,2]")
Debug.Print Json.IsArray(v)                               ' True
Debug.Print Json.IsObject(v)                              ' False

Dim plain(0 To 1) As Variant
Debug.Print Json.IsArray(plain)                           ' False
```

### Clone
{: .no_toc }

Returns a deep copy of a value.

Syntax: **Json.Clone** ( *value* ) **As Variant**

*value*
: *required* The value to copy.

Every [**JsonObject**](JsonObject) and [**JsonArray**](JsonArray) inside the value is copied, so the copy shares no container with the original. Other values are copied by value, and an object that is not part of the model is copied by reference.

A read does not copy: [**JsonObject.Item**](JsonObject#item), [**PointerGet**](#pointerget) and [**Query**](#query) return the container that is inside the document, and a change made through it changes the document. The functions that return a new document, [**PointerSet**](#pointerset), [**PointerRemove**](#pointerremove), [**Patch**](#patch), [**MergePatch**](#mergepatch) and [**JsonObject.Merge**](JsonObject#merge), leave their argument unchanged.

```tb check_build check_run
Dim a As JsonObject = Json.Map("list", Json.Arr(1, 2))
Dim b As JsonObject = Json.Clone(a)
b.Arr("list").Add 3
Debug.Print a.Arr("list").Count                           ' 2
Debug.Print b.Arr("list").Count                           ' 3

Dim c As JsonObject = a
c.Arr("list").Add 9
Debug.Print a.Arr("list").Count                           ' 3
```

### Equals
{: .no_toc }

Returns whether two values are equal as JSON values.

Syntax: **Json.Equals** ( *a*, *b* ) **As Boolean**

*a*, *b*
: *required* The values to compare.

Two values are equal when they have the same JSON type and the same content. Numbers are compared by value, so `1` and `1.0` are equal whatever their types are. Strings are compared by character code, so `a` and `A` differ. Arrays are equal when they have the same length and equal elements in the same order. Objects are equal when they have the same keys and equal values; the order of the keys does not matter. Two values that are not JSON values are equal only when both are **Empty** or both are **Nothing**; in particular, two **Date** values are never equal, even when they hold the same date.

The function does not change the last error. The patch functions use it to compare values: [**Patch**](#patch) for the `test` operation, and [**Diff**](#diff).

```tb check_build check_run
Dim a As Variant = Json.Parse("{""x"":1.0,""y"":[true,null]}")
Dim b As Variant = Json.Parse("{""y"":[true,null],""x"":1}")
Debug.Print Json.Equals(a, b)                             ' True
Debug.Print Json.Equals(1, 1.0)                           ' True
Debug.Print Json.Equals("1", 1)                           ' False
Debug.Print Json.Equals(Json.Arr(1, 2), Json.Arr(2, 1))   ' False
Debug.Print Json.Equals(#18-Aug-2026#, #18-Aug-2026#)     ' False
```

## Parsing

### Parse
{: .no_toc }

Parses JSON text or JSON bytes into a value.

Syntax: **Json.Parse** ( *json* [ , *options* ] ) **As Variant**

*json*
: *required* The document: a **String**, or a **Byte** array that holds UTF-8 or UTF-16 text. Any other type is the error `WrongType`.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. **Nothing**, the default, means [**JsonOptions.Rfc**](JsonOptions#rfc). The syntax, the encoding of bytes, the policy for duplicate keys and the limits come from it.

Returns the root value of the document: a [**JsonObject**](JsonObject), a [**JsonArray**](JsonArray), a **String**, a **Decimal**, a **Boolean** or **Null**. Returns **Empty** and sets the last error when the text is not valid, the input exceeds a limit, or the bytes cannot be decoded.

The text must be one JSON value as RFC 8259 defines it, with only the white space characters space, tab, line feed and carriage return around it. With [**Syntax**](JsonOptions#syntax) set to **jsJsonc**, comments and a comma after the last element are also accepted. Details of the reading:

- **Numbers** become **Decimal** values, with no loss of digits and independent of the regional settings. A number that a **Decimal** cannot hold is an `InvalidNumber` error: one whose digits, read as a whole number, are above 79228162514264337593543950335, or whose scale is outside the range of **Decimal**. The scale is the exponent written, less the number of digits after the decimal point, and it must be from -28 to 28. The documents `1e29`, `1e-29`, `79228162514264337593543950336`, and `3.14159265358979323846264338327950288` (36 digits) are rejected, and so is `1.7976931348623157e308`, the largest **Double**. The documents `1e28`, `1e-28`, `79228162514264337593543950335`, `12345678901234567890123456789` and `0.0000000000000000000000000001` are read in full. The package's own tests treat this as a rule of the package, and RFC 8259 lets an implementation limit the range and precision of numbers; but a document that other JSON software writes can hold a number that this package rejects (see [Known problems](.#known-problems-in-version-10150)). A number is read with its exponent and fraction applied, so `1.5E3` is `1500`, `1.0` is `1`, `0.10` is `0.1` and `-0` is `0`.
- **Strings** are read with the escapes of RFC 8259, including `\u` escapes and surrogate pairs. An unescaped control character (below U+0020) is an `InvalidSyntax` error. A `\u` escape of a high surrogate that is not followed by a low surrogate escape, and a lone low surrogate, are an `InvalidEscape` error.
- **Dates** are never created. A JSON string that holds a date stays a **String**; [**ParseIso8601**](#parseiso8601) converts it.
- **Duplicate keys** in an object are the error `DuplicateKey` unless [**DuplicateKeys**](JsonOptions#duplicatekeys) is **jdkLastWins**. With **jdkLastWins** the last value is kept, in the position of the first.
- **Nesting** is limited by [**MaxDepth**](JsonOptions#maxdepth): the root is at depth 0, each value inside a container is one level deeper than the container, and a value deeper than **MaxDepth**, a scalar as well as a container, is a `DepthLimitExceeded` error. The other limits are [**MaxBytes**](JsonOptions#maxbytes), [**MaxStringLength**](JsonOptions#maxstringlength), [**MaxArrayItems**](JsonOptions#maxarrayitems) and [**MaxObjectMembers**](JsonOptions#maxobjectmembers); exceeding one is a `LimitExceeded` error.
- **A byte array** is decoded as [**Encoding**](JsonOptions#encoding) says: by default a byte order mark selects UTF-8, UTF-16 little endian or UTF-16 big endian, and UTF-8 is the choice without one. Bytes that are not valid in the encoding are an `InvalidEncoding` error. A **String** is not decoded, and a byte order mark at its start is not skipped: it is an `InvalidSyntax` error.

```tb check_build check_run
Dim t As Variant
Dim v As Variant
For Each t In Array("1.5E3", "1.0", "0.10", "-0", "-1.25e-2", "1e28", "79228162514264337593543950335", "1e29", "1e-29", "3.14159265358979323846264338327950288")
    v = Json.Parse(CStr(t))
    If JsonError.HasError Then
        Debug.Print t & " -> " & JsonError.Code
    Else
        Debug.Print t & " -> " & Json.Serialize(v, JsonOptions.Minified)
    End If
Next
' Output:
' 1.5E3 -> 1500
' 1.0 -> 1
' 0.10 -> 0.1
' -0 -> 0
' -1.25e-2 -> -0.0125
' 1e28 -> 10000000000000000000000000000
' 79228162514264337593543950335 -> 79228162514264337593543950335
' 1e29 -> InvalidNumber
' 1e-29 -> InvalidNumber
' 3.14159265358979323846264338327950288 -> InvalidNumber
```

The position of a syntax error is in `JsonError.Position`, `JsonError.Line` and `JsonError.Column`, counted from 1 in UTF-16 code units, with a line feed, a carriage return or a carriage return and a line feed each ending a line. `JsonError.Snippet` holds up to 24 characters on each side of the position.

```tb check_build check_run
Dim v As Variant = Json.Parse("{""a"":[1,2.5,""x"",true,null]}")
Dim o As JsonObject = v
Debug.Print TypeName(v)                                   ' JsonObject
Debug.Print TypeName(o.Arr("a").Item(0))                  ' Decimal
Debug.Print TypeName(o.Arr("a").Item(2))                  ' String
Debug.Print TypeName(o.Arr("a").Item(3))                  ' Boolean
Debug.Print TypeName(o.Arr("a").Item(4))                  ' Null

Dim bad As Variant = Json.Parse("{""a"":1,}")
Debug.Print IsEmpty(bad)                                  ' True
Debug.Print JsonError.Code                                ' InvalidSyntax
Debug.Print JsonError.ToString()  ' Json.Parse: InvalidSyntax - Expected object key. (line 1, column 8, position 8) | {"a":1,}
```

The result of **Parse** is a **Variant**, so a variable of a class type can take it directly when the parse succeeds: `Dim o As JsonObject = Json.Parse(text)`. After a failed parse the result is **Empty**, which such a variable does not accept: the assignment raises run-time error 424, *Object required*. Check the last error first, or use [**TryParse**](#tryparse).

```tb check_build check_run
On Error Resume Next
Dim o As JsonObject = Json.Parse("{")
Debug.Print Err.Number & " " & Err.Description            ' 424 Object required
```

### TryParse
{: .no_toc }

Parses JSON text or JSON bytes into a variable and returns whether it succeeded.

Syntax: **Json.TryParse** ( *json*, *value* [ , *options* ] ) **As Boolean**

*json*
: *required* The document, as for [**Parse**](#parse).

*value*
: *required* A **Variant** variable that receives the root value. It is passed **ByRef**. After a failed call it is **Empty**.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object, as for [**Parse**](#parse).

Returns **True** when the document was read and **False** when not. It calls [**Parse**](#parse) and tests the last error, so the last error is set as **Parse** sets it, with the origin `Json.Parse`.

```tb check_build check_run
Dim v As Variant
Debug.Print Json.TryParse("[1,2", v)                      ' False
Debug.Print IsEmpty(v)                                    ' True
Debug.Print JsonError.Code                                ' InvalidSyntax
Debug.Print Json.TryParse("[1,2]", v)                     ' True
Debug.Print Json.IsArray(v)                               ' True
```

## Serializing

### Serialize
{: .no_toc }

Writes a value as JSON text.

Syntax: **Json.Serialize** ( *value* [ , *options* ] ) **As String**

*value*
: *required* The value to write: any JSON value, as [The JSON model](.#the-json-model) describes.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. **Nothing**, the default, writes the text pretty-printed with 4 spaces of indentation and a line feed (`vbLf`) after each line, as [**JsonOptions.Pretty**](JsonOptions#pretty) does. The format properties and [**MaxDepth**](JsonOptions#maxdepth) are used.

Returns the text, or an empty string and the last error when the value cannot be written. The errors are `UnsupportedType` for a value that is not a JSON value (an **Empty**, a **Nothing**, or an object of another class), `InvalidNumber` for a number that a **Decimal** cannot hold, such as an infinity or a **Double** above about 7.9E+28, `CircularReference` for a container that contains itself, and `DepthLimitExceeded`.

- **Numbers** of every numeric type are converted to **Decimal** and written as the text of that value, with a decimal point whatever the regional settings are and without an exponent. A **Double** is converted to **Decimal** first, so it keeps 15 significant digits: `1 / 3` is written as `0.333333333333333`, and `0.1 + 0.2` as `0.3`. A **Double** of 1E+20 is written as `100000000000000000000`.
- **Strings** are written between double quotes. The characters `"` and `\` and the control characters are escaped: `\b`, `\t`, `\n`, `\f` and `\r` where JSON has a short form, and `\u00xx` with lowercase hexadecimal digits for the other control characters. The solidus `/` is written as it is unless [**EscapesSolidus**](JsonOptions#escapessolidus) is **True**. Other characters are written as they are unless [**EnsuresAscii**](JsonOptions#ensuresascii) is **True**, which writes each UTF-16 code unit above U+007F as `\uxxxx`. The character U+007F is not escaped.
- **A Date** is written as a string by [**FormatIso8601**](#formatiso8601), in local time without a zone.
- **A Variant array** is written as a JSON array. An empty or unbound array is `[]`. Only one-dimensional arrays are supported: a two-dimensional array raises run-time error -2147467259, *Unspecified error*, and leaves the last error of the package stuck (see [Known problems](.#known-problems-in-version-10150)).
- **Objects** keep their order, unless [**SortsKeys**](JsonOptions#sortskeys) is **True**, which orders the keys by UTF-16 code unit.
- **Layout.** With [**Indent**](JsonOptions#indent) of 0 or more, each member and element is on its own line, indented by that many spaces for each level, with a space after each colon; [**Newline**](JsonOptions#newline) ends the lines. With **Indent** below 0 the text has no white space. An empty object or array is `{}` or `[]` in both layouts.

```tb check_build check_run
Dim o As JsonObject = Json.Map("a", 1, "b", Json.Arr(1, 2), "c", Json.Map())
Debug.Print Json.Serialize(o, JsonOptions.Minified)

Dim line As Variant
For Each line In Split(Json.Serialize(o), vbLf)
    Debug.Print line
Next
' Output:
' {"a":1,"b":[1,2],"c":{}}
' {
'     "a": 1,
'     "b": [
'         1,
'         2
'     ],
'     "c": {}
' }
```

```tb check_build check_run
Debug.Print Json.Serialize(1 / 3, JsonOptions.Minified)         ' 0.333333333333333
Debug.Print Json.Serialize(0.1 + 0.2, JsonOptions.Minified)     ' 0.3
Debug.Print Json.Serialize(1E+20, JsonOptions.Minified)         ' 100000000000000000000
Debug.Print Json.Serialize(CSng(0.1), JsonOptions.Minified)     ' 0.1
Debug.Print Json.Serialize(CDec("1.50"), JsonOptions.Minified)  ' 1.5
```

A character that is not a valid UTF-16 sequence, a lone surrogate, is written unchanged by **Serialize**. [**SerializeToUtf8**](#serializetoutf8) and [**WriteFile**](#writefile) cannot encode it and report `InvalidEncoding`.

```tb check_build check_run
Debug.Print Len(Json.Serialize(ChrW(&HD83D), Nothing))    ' 3
Dim bytes() As Byte = Json.SerializeToUtf8(ChrW(&HD83D), Nothing)
Debug.Print JsonError.Code                                ' InvalidEncoding
Debug.Print JsonError.Message                             ' Text cannot be encoded as UTF-8.
```

### SerializeToUtf8
{: .no_toc }

Writes a value as JSON text encoded in UTF-8.

Syntax: **Json.SerializeToUtf8** ( *value* [ , *options* ] ) **As Byte()**

*value*
: *required* The value to write, as for [**Serialize**](#serialize).

*options*
: *optional* A [**JsonOptions**](JsonOptions) object, as for [**Serialize**](#serialize). When [**IncludesBom**](JsonOptions#includesbom) is **True**, the bytes start with the UTF-8 byte order mark `EF BB BF`.

Returns the bytes. Returns an unbound array and sets the last error when [**Serialize**](#serialize) fails or the text cannot be encoded (`InvalidEncoding`).

```tb check_build check_run
Dim o As JsonOptions = JsonOptions.Minified
o.IncludesBom = True
Dim bytes() As Byte = Json.SerializeToUtf8(ChrW$(233), o)
Debug.Print UBound(bytes) - LBound(bytes) + 1                  ' 7
Debug.Print Hex$(bytes(0)) & Hex$(bytes(1)) & Hex$(bytes(2))   ' EFBBBF
Debug.Print Hex$(bytes(4)) & Hex$(bytes(5))                    ' C3A9
```

## Files

### ParseFile
{: .no_toc }

Reads a file and parses it.

Syntax: **Json.ParseFile** ( *path* [ , *options* ] ) **As Variant**

*path*
: *required* The path of the file.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. [**Encoding**](JsonOptions#encoding) selects the encoding of the file, with a byte order mark deciding by default, and [**MaxBytes**](JsonOptions#maxbytes) limits the size of the file. The other properties apply as they do to [**Parse**](#parse).

Returns the root value, or **Empty** and the last error. A file that does not exist or cannot be opened or read is an `IoError`; a file larger than **MaxBytes** is a `LimitExceeded` error; the other errors are those of [**Parse**](#parse). An empty file is the error `UnexpectedEnd`.

### TryParseFile
{: .no_toc }

Reads a file and parses it into a variable, and returns whether it succeeded.

Syntax: **Json.TryParseFile** ( *path*, *value* [ , *options* ] ) **As Boolean**

*path*
: *required* The path of the file.

*value*
: *required* A **Variant** variable that receives the root value. It is passed **ByRef**. After a failed call it is **Empty**.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object, as for [**ParseFile**](#parsefile).

Returns **True** when the file was read and parsed. The last error is that of [**ParseFile**](#parsefile), with the origin `Json.ParseFile`.

### WriteFile
{: .no_toc }

Writes a value to a file as UTF-8 text.

Syntax: **Json.WriteFile** ( *path*, *value* [ , *options* ] )

*path*
: *required* The path of the file. An existing file is replaced.

*value*
: *required* The value to write, as for [**Serialize**](#serialize).

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. The format properties and [**IncludesBom**](JsonOptions#includesbom) are used. **Nothing** writes pretty-printed text without a byte order mark.

The file always has UTF-8 encoding. If the value cannot be serialized, the file is not touched and the last error is that of [**Serialize**](#serialize). If the file cannot be opened or written, the error is `IoError`. The file is opened for writing, and so emptied, before the bytes are written, so a write that fails part-way leaves a short file.

```tb check_build check_run
Dim path As String = Environ$("TEMP") & "\tsJson-sample-file.json"
Json.WriteFile path, Json.Map("n", 1, "s", "x"), JsonOptions.Minified
Debug.Print JsonError.HasError                                           ' False
Debug.Print Json.Serialize(Json.ParseFile(path), JsonOptions.Minified)   ' {"n":1,"s":"x"}
Kill path

Dim missing As Variant = Json.ParseFile(path)
Debug.Print IsEmpty(missing)                                             ' True
Debug.Print JsonError.Code                                               ' IoError
```

## Lines of JSON

NDJSON, also called JSON Lines, is a text with one JSON value on each line. The functions of this section read and write it. Lines end with a line feed, a carriage return, or both; a line that is empty or holds only spaces is ignored.

### ParseLines
{: .no_toc }

Parses NDJSON text into an array of values.

Syntax: **Json.ParseLines** ( *text* [ , *options* ] ) **As** [**JsonArray**](JsonArray)

*text*
: *required* A **String** with one JSON value on each line.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. It applies to each line as it applies to [**Parse**](#parse), except that [**MaxBytes**](JsonOptions#maxbytes) is not checked.

Returns an array that holds the value of each line, in order, or **Nothing** and the last error when a line is not valid. The error is that of [**Parse**](#parse). Its position, line and column are counted in the line that failed, not in the whole text, so `JsonError.Line` is always 1.

```tb check_build check_run
Dim lines As JsonArray = Json.ParseLines("{""id"":1}" & vbLf & vbLf & "{""id"":2}" & vbLf)
Debug.Print lines.Count                                   ' 2
Debug.Print lines.Map(1).Num("id")                        ' 2

Dim bad As JsonArray = Json.ParseLines("{""a"":1}" & vbLf & "{bad}")
Debug.Print bad Is Nothing                                ' True
Debug.Print JsonError.ToString()  ' Json.ParseLines: InvalidSyntax - Expected object key. (line 1, column 2, position 2) | {bad}
```

### TryParseLines
{: .no_toc }

Parses NDJSON text into a variable and returns whether it succeeded.

Syntax: **Json.TryParseLines** ( *text*, *value* [ , *options* ] ) **As Boolean**

*text*
: *required* A **String** with one JSON value on each line.

*value*
: *required* A [**JsonArray**](JsonArray) variable that receives the array. It is passed **ByRef**. After a failed call it is **Nothing**.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object, as for [**ParseLines**](#parselines).

Returns **True** when every line was read. The last error is that of [**ParseLines**](#parselines), with the origin `Json.ParseLines`.

### SerializeLines
{: .no_toc }

Writes a sequence of values as NDJSON text.

Syntax: **Json.SerializeLines** ( *values* [ , *options* ] ) **As String**

*values*
: *required* A [**JsonArray**](JsonArray) or a **Variant** array. Each element is written on its own line.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. [**Indent**](JsonOptions#indent) is ignored, because each value is written without white space. The other format properties apply as they do to [**Serialize**](#serialize). **Nothing** uses [**JsonOptions.Minified**](JsonOptions#minified).

Returns the text, with a line feed after every value including the last, or an empty string when there are no values or a value cannot be written. Any other type of *values* is the error `WrongType`; the other errors are those of [**Serialize**](#serialize).

```tb check_build check_run
Dim lines As JsonArray = Json.Arr(Json.Map("id", 1), Json.Map("id", 2))
Debug.Print Replace(Json.SerializeLines(lines), vbLf, "|")     ' {"id":1}|{"id":2}|

Dim plain(0 To 1) As Variant
plain(0) = 1
plain(1) = "x"
Debug.Print Replace(Json.SerializeLines(plain), vbLf, "|")     ' 1|"x"|
```

### ParseLinesFile
{: .no_toc }

Reads a file of NDJSON and parses it.

Syntax: **Json.ParseLinesFile** ( *path* [ , *options* ] ) **As** [**JsonArray**](JsonArray)

*path*
: *required* The path of the file.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. [**Encoding**](JsonOptions#encoding) and [**MaxBytes**](JsonOptions#maxbytes) apply to the file, as for [**ParseFile**](#parsefile), and the other properties to each line.

Returns the array, or **Nothing** and the last error. The errors are those of [**ParseFile**](#parsefile) and [**ParseLines**](#parselines).

### TryParseLinesFile
{: .no_toc }

Reads a file of NDJSON into a variable and returns whether it succeeded.

Syntax: **Json.TryParseLinesFile** ( *path*, *value* [ , *options* ] ) **As Boolean**

*path*
: *required* The path of the file.

*value*
: *required* A [**JsonArray**](JsonArray) variable that receives the array. It is passed **ByRef**. After a failed call it is **Nothing**.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object, as for [**ParseLinesFile**](#parselinesfile).

Returns **True** when the file was read and every line parsed. The last error is that of [**ParseLinesFile**](#parselinesfile), with the origin `Json.ParseLinesFile`.

### WriteLinesFile
{: .no_toc }

Writes a sequence of values to a file as NDJSON, in UTF-8.

Syntax: **Json.WriteLinesFile** ( *path*, *values* [ , *options* ] )

*path*
: *required* The path of the file. An existing file is replaced.

*values*
: *required* A [**JsonArray**](JsonArray) or a **Variant** array, as for [**SerializeLines**](#serializelines).

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. [**IncludesBom**](JsonOptions#includesbom) adds a byte order mark; the other properties apply as they do to [**SerializeLines**](#serializelines).

The errors are those of [**SerializeLines**](#serializelines) and [**WriteFile**](#writefile). When there are no values the file is created empty.

```tb check_build check_run
Dim path As String = Environ$("TEMP") & "\tsJson-sample-lines.ndjson"
Json.WriteLinesFile path, Json.Arr(Json.Map("id", 1), Json.Map("id", 2))
Dim back As JsonArray = Json.ParseLinesFile(path)
Debug.Print back.Count                                    ' 2
Debug.Print Json.Equals(back.Map(0), Json.Map("id", 1))   ' True
Kill path
```

## JSON Pointer

A JSON Pointer is a string that names one place in a document, as RFC 6901 defines it. The empty string names the document itself. Any other pointer is a series of tokens, each introduced by `/`. A token selects a member of an object by its key, or an element of an array by its index. The index is written in decimal digits, without a leading zero (`0` is the first element). In an array, the token `-` names the position after the last element. In a token, `~1` stands for `/` and `~0` for `~`. The pointer `/` names the member with the empty key.

The functions follow RFC 6901, except for these points:

- The pointer must be a plain string. The form of a pointer as a URI fragment, `#/a/b`, is not accepted: it is the error `InvalidPointer`.
- An array token that is not an index (letters, a leading zero, a sign, or a number above the largest **Long**) is the error `InvalidPointer`, not a missing place.
- The token `-` names no existing element. Reading it is the error `PointerNotFound`, or a plain miss for the functions that report misses without an error. [**PointerSet**](#pointerset) accepts it as the last token and appends.
- An object member is found by its exact key, and a token such as `0` selects the member `"0"` of an object.
- An empty token selects the member with the empty key, and the pointer `/` names the member `""` of the document. An empty token that comes after another token is a defect of version 1.0.15.0: it is read as a copy of the token before it, so `/a/` is read as `/a/a`. [Known problems](.#known-problems-in-version-10150) shows it.
- The value that [**PointerGet**](#pointerget) returns is the container inside the document, not a copy.

### PointerGet
{: .no_toc }

Returns the value at a pointer.

Syntax: **Json.PointerGet** ( *root*, *pointer* ) **As Variant**

*root*
: *required* The document.

*pointer*
: *required* A **String** that holds a JSON Pointer. The empty string returns *root*.

Returns the value, which can be **Null** for a JSON null. Returns **Empty** and sets the last error when the pointer is not valid (`InvalidPointer`) or names no place (`PointerNotFound`). The error's `JsonError.Path` is the pointer up to and including the token that failed.

```tb check_build check_run
Dim doc As JsonObject = Json.Map("foo", Json.Arr("bar", "baz"), "", 0, "a/b", 1, "m~n", 8, "k""l", 6, "i\j", 5)
Debug.Print Json.Serialize(Json.PointerGet(doc, "/foo"), JsonOptions.Minified)   ' ["bar","baz"]
Debug.Print Json.PointerGet(doc, "/foo/0")                ' bar
Debug.Print Json.PointerGet(doc, "/")                     ' 0
Debug.Print Json.PointerGet(doc, "/a~1b")                 ' 1
Debug.Print Json.PointerGet(doc, "/m~0n")                 ' 8
Debug.Print Json.PointerGet(doc, "/k""l")                 ' 6
Debug.Print Json.PointerGet(doc, "/i\j")                  ' 5

Dim miss As Variant = Json.PointerGet(doc, "/foo/2")
Debug.Print IsEmpty(miss)                                 ' True
Debug.Print JsonError.Code                                ' PointerNotFound
Debug.Print JsonError.Path                                ' /foo/2
```

### PointerExists
{: .no_toc }

Returns whether a pointer names a place in a document.

Syntax: **Json.PointerExists** ( *root*, *pointer* ) **As Boolean**

*root*
: *required* The document.

*pointer*
: *required* A **String** that holds a JSON Pointer.

Returns **True** when the place exists, including a place that holds a JSON null. A pointer that names no place is not an error. A pointer with invalid syntax, or one whose token is not an index where the document has an array, returns **False** and sets the error `InvalidPointer`.

### PointerTryGet
{: .no_toc }

Reads the value at a pointer and returns whether the place exists.

Syntax: **Json.PointerTryGet** ( *root*, *pointer*, *value* ) **As Boolean**

*root*
: *required* The document.

*pointer*
: *required* A **String** that holds a JSON Pointer.

*value*
: *required* A **Variant** variable that receives the value. It is passed **ByRef**. When the place does not exist it is **Empty**.

Returns **True** when the place exists. A pointer that names no place is not an error; a pointer with invalid syntax returns **False** and sets the error `InvalidPointer`.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""user"":{""name"":""Ada""},""tags"":[""a"",""b""],""none"":null}")
Dim v As Variant
Debug.Print Json.PointerExists(doc, "/tags/1")            ' True
Debug.Print Json.PointerExists(doc, "/tags/2")            ' False
Debug.Print JsonError.HasError                            ' False
Debug.Print Json.PointerTryGet(doc, "/user/name", v)      ' True
Debug.Print v                                             ' Ada
Debug.Print Json.PointerTryGet(doc, "/none", v)           ' True
Debug.Print IsNull(v)                                     ' True
Debug.Print Json.PointerExists(doc, "tags")               ' False
Debug.Print JsonError.Code                                ' InvalidPointer
```

### PointerSet
{: .no_toc }

Returns a copy of a document with a value stored at a pointer.

Syntax: **Json.PointerSet** ( *root*, *pointer*, *value* ) **As Variant**

*root*
: *required* The document. It is not changed.

*pointer*
: *required* A **String** that holds a JSON Pointer. The empty string replaces the whole document, so the result is a copy of *value*.

*value*
: *required* The value to store. A copy of it is stored.

Returns the new document. All the places on the way to the last token must exist, otherwise the error is `PointerNotFound`. In an object, the last token adds the member or replaces it. In an array, the last token replaces the element at that index; an index equal to the length, or `-`, appends the value. An index above the length is the error `PointerNotFound`. The function does not insert: [**Patch**](#patch) with an `add` operation inserts into an array.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""a"":{""b"":[1,2]}}")
Dim copy As Variant = Json.PointerSet(doc, "/a/b/-", 3)
Debug.Print Json.Serialize(copy, JsonOptions.Minified)    ' {"a":{"b":[1,2,3]}}
Debug.Print Json.Serialize(doc, JsonOptions.Minified)     ' {"a":{"b":[1,2]}}

copy = Json.PointerSet(doc, "/a/b/0", 9)
Debug.Print Json.Serialize(copy, JsonOptions.Minified)    ' {"a":{"b":[9,2]}}

copy = Json.PointerSet(doc, "/a/c/d", 1)
Debug.Print IsEmpty(copy)                                 ' True
Debug.Print JsonError.Code                                ' PointerNotFound
```

### PointerRemove
{: .no_toc }

Returns a copy of a document with the value at a pointer removed.

Syntax: **Json.PointerRemove** ( *root*, *pointer* ) **As Variant**

*root*
: *required* The document. It is not changed.

*pointer*
: *required* A **String** that holds a JSON Pointer. The empty string, which names the whole document, is the error `InvalidPointer`, and so is a pointer that ends in `-`.

Returns the new document. A member of an object is removed; an element of an array is removed and the later elements move down by one. A place that does not exist is the error `PointerNotFound`.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""a"":{""b"":[1,2,3],""c"":true}}")
Debug.Print Json.Serialize(Json.PointerRemove(doc, "/a/b/0"), JsonOptions.Minified)   ' {"a":{"b":[2,3],"c":true}}
Debug.Print Json.Serialize(Json.PointerRemove(doc, "/a/c"), JsonOptions.Minified)     ' {"a":{"b":[1,2,3]}}
Debug.Print IsEmpty(Json.PointerRemove(doc, ""))          ' True
Debug.Print JsonError.Code                                ' InvalidPointer
```

### PointerEscape
{: .no_toc }

Escapes a key for use as a token of a pointer.

Syntax: **Json.PointerEscape** ( *token* ) **As String**

*token*
: *required* The key of an object member.

Returns the key with `~` replaced by `~0` and then `/` replaced by `~1`. The function does not change the last error.

### PointerUnescape
{: .no_toc }

Converts a token of a pointer back to a key.

Syntax: **Json.PointerUnescape** ( *token* ) **As String**

*token*
: *required* A token of a pointer.

Returns the token with `~1` replaced by `/` and then `~0` replaced by `~`. The function does not check that the token is valid and does not change the last error.

```tb check_build check_run
Debug.Print Json.PointerEscape("a/b~c")                   ' a~1b~0c
Debug.Print Json.PointerUnescape("a~1b~0c")               ' a/b~c

Dim doc As JsonObject = Json.Map("a/b", 1)
Debug.Print Json.PointerGet(doc, "/" & Json.PointerEscape("a/b"))   ' 1
```

## JSONPath

A JSONPath is a query that selects any number of values from a document, as RFC 9535 defines it. `$.store.book[*].author` selects the `author` of every element of `book`. The syntax that is supported, and the points where it departs from RFC 9535, are on the page of [**JsonPathQuery**](JsonPathQuery#syntax). A path that matches nothing is not an error. A path with invalid syntax is the error `InvalidPath`. The functions below compile the path each time they are called, except that the last path compiled successfully is kept; to run one path many times, compile it once with [**CompilePath**](#compilepath).

### CompilePath
{: .no_toc }

Compiles a JSONPath.

Syntax: **Json.CompilePath** ( *path* ) **As** [**JsonPathQuery**](JsonPathQuery)

*path*
: *required* A **String** that holds a JSONPath. It must start with `$`.

Returns a [**JsonPathQuery**](JsonPathQuery), or **Nothing** and the error `InvalidPath` when the path is not valid. The error's position, line, column and snippet locate the fault in the path text. An expression in a filter that nests more than 1000 levels is the error `DepthLimitExceeded`.

```tb check_build check_run
Dim q As JsonPathQuery = Json.CompilePath("$.store.book[0]")
Debug.Print q.Source                                      ' $.store.book[0]

Dim bad As JsonPathQuery = Json.CompilePath("store.book")
Debug.Print bad Is Nothing                                ' True
Debug.Print JsonError.Code                                ' InvalidPath
Debug.Print JsonError.Message                             ' JSONPath must start with '$'.
```

### Query
{: .no_toc }

Returns the values that a JSONPath selects.

Syntax: **Json.Query** ( *root*, *path* ) **As Variant()**

*root*
: *required* The document.

*path*
: *required* A **String** that holds a JSONPath.

Returns an array of the selected values, in document order, with a lower bound of 0. The values are the containers inside the document, not copies. An array that results from a path that matches nothing is unbound, so `UBound` raises run-time error 9 for it. A path with invalid syntax also returns an unbound array and sets the error `InvalidPath`. [**Serialize**](#serialize) writes the array as a JSON array, `[]` when it is unbound.

```tb check_build check_run
Dim store As Variant = Json.Parse( _
    "{""store"":{""book"":[" & _
    "{""category"":""reference"",""author"":""Nigel Rees"",""title"":""Sayings of the Century"",""price"":8.95}," & _
    "{""category"":""fiction"",""author"":""Evelyn Waugh"",""title"":""Sword of Honour"",""price"":12.99}," & _
    "{""category"":""fiction"",""author"":""Herman Melville"",""title"":""Moby Dick"",""isbn"":""0-553-21311-3"",""price"":8.99}]," & _
    """bicycle"":{""color"":""red"",""price"":399}}}")

Debug.Print Json.Serialize(Json.Query(store, "$.store.book[*].author"), JsonOptions.Minified)
Debug.Print Json.Serialize(Json.Query(store, "$..price"), JsonOptions.Minified)
Debug.Print Json.Serialize(Json.Query(store, "$.store.book[?@.price < 10].title"), JsonOptions.Minified)
Debug.Print Json.Serialize(Json.Query(store, "$.nothing"), JsonOptions.Minified)
Debug.Print JsonError.HasError

Dim none() As Variant = Json.Query(store, "$.nothing")
On Error Resume Next
Debug.Print UBound(none)
Debug.Print Err.Number
' Output:
' ["Nigel Rees","Evelyn Waugh","Herman Melville"]
' [8.95,12.99,8.99,399]
' ["Sayings of the Century","Moby Dick"]
' []
' False
' 9
```

The `UBound` line prints nothing, because the error ends that statement.

### QueryOne
{: .no_toc }

Returns the first value that a JSONPath selects.

Syntax: **Json.QueryOne** ( *root*, *path* ) **As Variant**

*root*
: *required* The document.

*path*
: *required* A **String** that holds a JSONPath.

Returns the first selected value in document order, or **Empty** when nothing is selected, with no error. A selected JSON null is **Null**, so it can be told from a miss. A path with invalid syntax returns **Empty** and sets the error `InvalidPath`.

### TryQueryOne
{: .no_toc }

Reads the first value that a JSONPath selects and returns whether there is one.

Syntax: **Json.TryQueryOne** ( *root*, *path*, *value* ) **As Boolean**

*root*
: *required* The document.

*path*
: *required* A **String** that holds a JSONPath.

*value*
: *required* A **Variant** variable that receives the value. It is passed **ByRef**. When nothing is selected it is **Empty**.

Returns **True** when at least one value is selected. Nothing selected is not an error; a path with invalid syntax returns **False** and sets the error `InvalidPath`.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""a"":[10,20,30],""n"":null}")
Dim v As Variant
Debug.Print Json.QueryOne(doc, "$.a[-1]")                 ' 30
Debug.Print IsNull(Json.QueryOne(doc, "$.n"))             ' True
Debug.Print IsEmpty(Json.QueryOne(doc, "$.missing"))      ' True
Debug.Print Json.TryQueryOne(doc, "$.a[1:]", v)           ' True
Debug.Print v                                             ' 20
Debug.Print Json.TryQueryOne(doc, "$.missing", v)         ' False
Debug.Print JsonError.HasError                            ' False
```

### QueryHits
{: .no_toc }

Returns the values that a JSONPath selects, each with its JSON Pointer.

Syntax: **Json.QueryHits** ( *root*, *path* ) **As** [**JsonHit**](JsonHit)**()**

*root*
: *required* The document.

*path*
: *required* A **String** that holds a JSONPath.

Returns an array of [**JsonHit**](JsonHit) objects, in document order, with a lower bound of 0. Each hit has the value and the RFC 6901 pointer of the place where it was found, which [**PointerSet**](#pointerset) and the other pointer functions accept. A path that matches nothing, or is not valid, returns an unbound array, as [**Query**](#query) does.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""store"":{""book"":[{""title"":""A""},{""title"":""B"",""isbn"":""x""}]}}")
Dim hits() As JsonHit = Json.QueryHits(doc, "$..book[?@.isbn].title")
Debug.Print UBound(hits) - LBound(hits) + 1               ' 1
Debug.Print hits(LBound(hits)).Pointer                    ' /store/book/1/title
Debug.Print hits(LBound(hits)).Value                      ' B

Dim renamed As Variant = Json.PointerSet(doc, hits(LBound(hits)).Pointer, "B2")
Debug.Print Json.PointerGet(renamed, "/store/book/1/title")   ' B2
Debug.Print Json.PointerGet(doc, "/store/book/1/title")       ' B
```

## Patterns

The JSONPath functions `match` and `search`, and the keywords `pattern` and `patternProperties` of a JSON Schema, use regular expressions in the I-Regexp dialect of RFC 9485. The functions of this section use the same matcher directly. I-Regexp is a small interoperable subset of regular expressions: the characters are compared by code point, so a surrogate pair is one character; a group does not capture; and there are no anchors, so `^` and `$` are ordinary characters.

The supported syntax is:

| Syntax | Meaning |
|:-------|:--------|
| `a` | A character that is not special matches itself. The special characters are `. ? * + { } [ ] ( ) \|` and `\`. |
| `.` | Any character except a line feed or a carriage return. |
| `\` followed by a special character | That character. RFC 9485 also has `\n`, `\r`, `\t`, `\-` and `\^`, which this package does not accept outside a set. |
| `\p{Lu}`, `\P{Lu}` | A character in a Unicode general category, or one that is not. The names are the one-letter groups `L M N P S Z C` and the two-letter categories such as `Lu`, `Nd` and `Zs`. |
| `\d`, `\D`, `\s`, `\S`, `\w`, `\W` | The digits `0` to `9`; the white space characters tab, line feed, form feed, carriage return and space; and the word characters `0` to `9`, `A` to `Z`, `a` to `z` and `_`; each with its complement. These are not part of RFC 9485. |
| `[abc]`, `[a-z]`, `[^a-z]` | A character in a set of characters and ranges, or not in it. A set can contain the escapes above. |
| `x*`, `x+`, `x?`, `x{3}`, `x{2,}`, `x{2,5}` | Repetition of the character, set or group before it. |
| `(...)`, `x\|y` | A group, and a choice between alternatives. |

Anything else, such as a lookaround, a back reference or a lazy quantifier, makes the pattern invalid. A pattern that is not valid is never an error for these functions: they return **False**, and the last error is not set. The matcher departs from RFC 9485 in these ways: it accepts `\d`, `\D`, `\s`, `\S`, `\w` and `\W`, which the RFC leaves out; it does not accept the escapes `\n`, `\r`, `\t`, `\-` and `\^` that the RFC has, and reads `\n`, `\r` and `\t` inside a set as the letters `n`, `r` and `t`; it rejects a hyphen that comes after a single character at the end of a set, such as `[a-]`, which the RFC allows; and it does not try the other alternatives of a choice once one alternative has matched and the rest of the pattern then fails. The last difference, and the one before it, give wrong results with no error; [Known problems](.#known-problems-in-version-10150) shows them.

### IsValidPattern
{: .no_toc }

Returns whether a string is a valid I-Regexp.

Syntax: **Json.IsValidPattern** ( *pattern* ) **As Boolean**

*pattern*
: *required* The regular expression.

The function does not change the last error.

### IsMatchPattern
{: .no_toc }

Returns whether a whole string matches a pattern.

Syntax: **Json.IsMatchPattern** ( *text*, *pattern* ) **As Boolean**

*text*
: *required* The string to test.

*pattern*
: *required* An I-Regexp. The whole of *text* must match it.

Returns **False** when the pattern is not valid. The function does not change the last error.

### IsSearchPattern
{: .no_toc }

Returns whether a pattern matches anywhere in a string.

Syntax: **Json.IsSearchPattern** ( *text*, *pattern* ) **As Boolean**

*text*
: *required* The string to test.

*pattern*
: *required* An I-Regexp. It can match any part of *text*, including an empty part.

Returns **False** when the pattern is not valid. The function does not change the last error.

```tb check_build check_run
JsonError.Clear
Debug.Print Json.IsValidPattern("[a-z]{2,4}")             ' True
Debug.Print Json.IsValidPattern("(")                      ' False
Debug.Print Json.IsMatchPattern("abc", "[a-z]+")          ' True
Debug.Print Json.IsMatchPattern("abc1", "[a-z]+")         ' False
Debug.Print Json.IsSearchPattern("abc1", "[0-9]")         ' True
Debug.Print Json.IsMatchPattern("2026", "\d{4}")          ' True
Debug.Print Json.IsMatchPattern("Ada", "\p{Lu}\p{Ll}+")   ' True
Debug.Print JsonError.HasError                            ' False
```

## JSON Patch

JSON Patch (RFC 6902) describes changes to a document as a list of operations. Each operation is an object with an `op` member (`add`, `remove`, `replace`, `move`, `copy` or `test`), a `path` member that holds a JSON Pointer, and, depending on the operation, a `value` or a `from` member. JSON Merge Patch (RFC 7396) describes the changes as a document of the same shape as the target. The functions never change their arguments; each returns a new document.

### Patch
{: .no_toc }

Applies a JSON Patch to a copy of a document.

Syntax: **Json.Patch** ( *root*, *ops* ) **As Variant**

*root*
: *required* The document. It is not changed.

*ops*
: *required* A [**JsonArray**](JsonArray) of operation objects. A single operation object is also accepted, as a patch of one operation, which RFC 6902 does not allow. Any other value is the error `InvalidPatch`.

Returns the patched document. The operations are applied one after the other to a copy. If one fails, the function returns **Empty** and sets the last error, and nothing is applied. The operations follow RFC 6902:

- `add` stores a copy of `value` at `path`. In an object it adds the member or replaces it. In an array the index inserts the value before the element at that index; an index equal to the length, or `-`, appends. The parent of the place must exist. A path of `""` replaces the whole document.
- `remove` removes the value at `path`, which must exist.
- `replace` replaces the value at `path`, which must exist.
- `move` removes the value at `from` and adds it at `path`. A `from` that is a parent of `path` fails, because the parent is gone when the value is added.
- `copy` adds a copy of the value at `from` at `path`.
- `test` compares the value at `path` with `value`, as [**Equals**](#equals) compares: numbers by value, and objects without regard to the order of keys. A difference is the error `PatchTestFailed`.

The errors are `InvalidPatch` for a patch that is malformed (an operation that is not an object, a missing or non-string `path` or `from`, a missing `value`, an unknown `op`), `PatchFailed` for an operation that cannot be applied to the document (an `add` into a scalar, an array index that is out of range), `PatchTestFailed`, and `PointerNotFound` or `InvalidPointer` for a pointer. For `InvalidPatch`, `JsonError.Path` is the position of the operation in the patch, such as `/0`; for the others it is the pointer in the document.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""foo"":""bar""}")
Dim ops As Variant = Json.Parse("[{""op"":""add"",""path"":""/baz"",""value"":""qux""},{""op"":""replace"",""path"":""/foo"",""value"":""BAR""}]")
Debug.Print Json.Serialize(Json.Patch(doc, ops), JsonOptions.Minified)   ' {"foo":"BAR","baz":"qux"}
Debug.Print Json.Serialize(doc, JsonOptions.Minified)                    ' {"foo":"bar"}

Dim bad As Variant = Json.Parse("[{""op"":""test"",""path"":""/foo"",""value"":""x""},{""op"":""remove"",""path"":""/foo""}]")
Debug.Print IsEmpty(Json.Patch(doc, bad))                 ' True
Debug.Print JsonError.Code                                ' PatchTestFailed
Debug.Print JsonError.Path                                ' /foo
```

### MergePatch
{: .no_toc }

Applies a JSON Merge Patch to a copy of a document.

Syntax: **Json.MergePatch** ( *root*, *patch* ) **As Variant**

*root*
: *required* The document. It is not changed.

*patch*
: *required* The merge patch. A patch that is not an object replaces the whole document. In an object, a member with a value replaces or adds the member, a member that is an object is merged into the target member, and a member that is **Null** removes the target member.

Returns the new document. The rules are those of RFC 7396, and the function sets no error. A patch cannot set a member to null, because null means removal. An array in a patch replaces the target array whole.

```tb check_build check_run
Dim target As Variant = Json.Parse("{""a"":""b"",""c"":{""d"":""e"",""f"":""g""}}")
Dim patch As Variant = Json.Parse("{""a"":""z"",""c"":{""f"":null}}")
Debug.Print Json.Serialize(Json.MergePatch(target, patch), JsonOptions.Minified)   ' {"a":"z","c":{"d":"e"}}
```

### Diff
{: .no_toc }

Returns the operations that change one document into another.

Syntax: **Json.Diff** ( *fromValue*, *toValue* ) **As** [**JsonArray**](JsonArray)

*fromValue*
: *required* The document to start from.

*toValue*
: *required* The document to end with.

Returns a JSON Patch, an array of operations, such that `Json.Patch(fromValue, Json.Diff(fromValue, toValue))` equals *toValue*. The patch uses only `add`, `remove` and `replace`. Objects are compared member by member, with the removals first, then the changes in the order of the first document, then the additions. Arrays are compared element by element: the common length is compared position by position, the extra elements of the first array are removed from the end, and the extra elements of the second are added. A value that differs in type is replaced whole. Equal documents give an empty array.

```tb check_build check_run
Dim a As Variant = Json.Parse("{""x"":1,""list"":[1,2,3],""gone"":true}")
Dim b As Variant = Json.Parse("{""x"":2,""list"":[1,5],""new"":null}")
Dim ops As JsonArray = Json.Diff(a, b)
Debug.Print Json.Serialize(ops, JsonOptions.Minified)
Debug.Print Json.Equals(Json.Patch(a, ops), b)
Debug.Print Json.Diff(a, a).Count
' Output:
' [{"op":"replace","path":"/x","value":2},{"op":"replace","path":"/list/1","value":5},{"op":"remove","path":"/list/2"},{"op":"remove","path":"/gone"},{"op":"add","path":"/new","value":null}]
' True
' 0
```

## JSON Schema

A JSON Schema describes the valid form of a document. The package implements draft 2020-12 with a local catalogue of documents; which keywords it checks is on the page of [**JsonSchema**](JsonSchema#keywords). An instance that does not satisfy the schema is not an error: it is reported on the [**JsonValidationResult**](JsonValidationResult) that the functions return. The last error is set only when the schema itself cannot be used.

### Validate
{: .no_toc }

Validates a value against a schema.

Syntax: **Json.Validate** ( *instance*, *schema* [ , *options* ] ) **As** [**JsonValidationResult**](JsonValidationResult)

*instance*
: *required* The value to check.

*schema*
: *required* The schema: a [**JsonObject**](JsonObject), or a **Boolean** (**True** accepts everything and **False** accepts nothing).

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. [**IsFormatAssertion**](JsonOptions#isformatassertion) makes the `format` keyword a check, and [**MaxDepth**](JsonOptions#maxdepth) limits the depth of evaluation, including the depth of `$ref` references.

Returns the report. It lists every failure, not only the first. The function compiles the schema each time it is called and has no catalogue, so a `$ref` can refer only to the schema itself. To use a catalogue, or to check many values, call [**CompileSchema**](#compileschema) once.

A schema that cannot be used sets the last error, as well as being reported: `InvalidSchema` for a schema that is neither an object nor a Boolean, `RemoteRef` for a `$ref` that is not in the schema or the catalogue, and `DepthLimitExceeded`.

```tb check_build check_run
Dim schema As Variant = Json.Parse("{""type"":""object"",""required"":[""name""],""properties"":{""name"":{""type"":""string""},""age"":{""type"":""integer"",""minimum"":0}}}")
Dim report As JsonValidationResult = Json.Validate(Json.Parse("{""name"":""Ann"",""age"":-1}"), schema)
Debug.Print report.IsValid                                ' False
Debug.Print report.ErrorCount                             ' 1
Debug.Print report.ToString()                             ' minimum /age - Number is below minimum.

Debug.Print Json.Validate(Json.Parse("{""name"":""Ann"",""age"":7}"), schema).IsValid   ' True
Debug.Print JsonError.HasError                            ' False
```

### CompileSchema
{: .no_toc }

Prepares a schema for validation, with a catalogue for `$ref`.

Syntax: **Json.CompileSchema** ( *schema* [ , *options* ] ) **As** [**JsonSchema**](JsonSchema)

*schema*
: *required* The schema, as for [**Validate**](#validate). A copy is stored.

*options*
: *optional* A [**JsonOptions**](JsonOptions) object, as for [**Validate**](#validate). It is kept by reference, and used by each [**JsonSchema.Validate**](JsonSchema#validate) call.

Returns the [**JsonSchema**](JsonSchema). The call checks nothing about the schema; a fault in it is found when a value is validated. [**JsonSchema.AddDocument**](JsonSchema#adddocument) registers further documents that `$ref` can name.

## Dates

ISO 8601 text and **Date** values convert here. A **Date** has no time zone, so the conversion is to local time. The JSON functions never convert a date by themselves: [**Parse**](#parse) leaves date text as a **String**, and [**Serialize**](#serialize) writes a **Date** as a string.

### ParseIso8601
{: .no_toc }

Converts ISO 8601 text to a **Date**.

Syntax: **Json.ParseIso8601** ( *text* ) **As Date**

*text*
: *required* A date, or a date with a time, in one of these forms: `yyyy-mm-dd` or `yyyy-mm-ddThh:nn:ss`, then optionally a fraction `.f` of one or more digits, then optionally a zone `Z`, `+hh:mm` or `-hh:mm`. A space can stand for the `T`. The text is trimmed first. The year must have four digits and be from 0100 to 9999.

Returns the **Date**. Text with no zone is read as the local time. Text with `Z` or an offset names an instant, which Windows converts to the local time of the computer (the Windows function **SystemTimeToTzSpecificLocalTime**). The fraction is cut to milliseconds (it is not rounded). Seconds of 60, the form without seconds, `T` in lowercase, and an offset without a colon are not accepted. On failure the result is a **Date** of 0 and the last error is `InvalidDate`; because a **Date** of 0 is a valid date (30 December 1899), check the last error.

```tb check_build check_run
Dim d As Date = Json.ParseIso8601("2026-08-19T09:15:30.250")
Debug.Print Json.FormatIso8601(d)                         ' 2026-08-19T09:15:30.250
Debug.Print Hour(d) & ":" & Minute(d)                     ' 9:15
Debug.Print Json.FormatIso8601(Json.ParseIso8601("2026-08-19"))   ' 2026-08-19T00:00:00

Dim bad As Date = Json.ParseIso8601("19.08.2026")
Debug.Print bad = 0                                       ' True
Debug.Print JsonError.Code                                ' InvalidDate
Debug.Print JsonError.Message                             ' Expected yyyy-mm-dd.
```

```tb check_build check_run
Dim d As Date
Dim t As Variant
For Each t In Array("2026-08-19 09:15:30", "2026-08-19T09:15:30.123456", "  2026-08-19  ", "0100-01-01", "0099-01-01", "2026-08-19T09:15", "2026-08-19t09:15:30", "2026-08-19T09:15:30+0100", "2026-08-19T09:15:60", "2026-02-30", "2026-8-19")
    d = Json.ParseIso8601(CStr(t))
    If JsonError.HasError Then
        Debug.Print "[" & t & "] -> " & JsonError.Code & ": " & JsonError.Message
    Else
        Debug.Print "[" & t & "] -> " & Json.FormatIso8601(d)
    End If
Next
' Output:
' [2026-08-19 09:15:30] -> 2026-08-19T09:15:30
' [2026-08-19T09:15:30.123456] -> 2026-08-19T09:15:30.123
' [  2026-08-19  ] -> 2026-08-19T00:00:00
' [0100-01-01] -> 0100-01-01T00:00:00
' [0099-01-01] -> InvalidDate: Date is out of range.
' [2026-08-19T09:15] -> InvalidDate: Expected yyyy-mm-ddThh:nn:ss.
' [2026-08-19t09:15:30] -> InvalidDate: Expected 'T' between date and time.
' [2026-08-19T09:15:30+0100] -> InvalidDate: Invalid timezone.
' [2026-08-19T09:15:60] -> InvalidDate: Time is out of range.
' [2026-02-30] -> InvalidDate: Date is out of range.
' [2026-8-19] -> InvalidDate: ISO-8601 date is too short.
```

A zone is converted with the settings of the computer, so the **Date** that results depends on where the code runs. Two spellings of one instant give the same **Date** on every computer:

```tb check_build check_run
Dim utc As Date = Json.ParseIso8601("2026-08-19T12:00:00Z")
Dim berlin As Date = Json.ParseIso8601("2026-08-19T14:00:00+02:00")
Debug.Print utc = berlin    ' True
```

### FormatIso8601
{: .no_toc }

Converts a **Date** to ISO 8601 text, in local time.

Syntax: **Json.FormatIso8601** ( *value* ) **As String**

*value*
: *required* The **Date**.

Returns `yyyy-mm-ddThh:nn:ss`, with `.fff` added when the date has a non-zero number of milliseconds. The text has no zone, so it is not an instant until the reader knows the zone. The function does not change the last error.

## See Also

- [JsonObject](JsonObject) class -- the JSON object that [**Map**](#map) and [**Parse**](#parse) return
- [JsonArray](JsonArray) class -- the JSON array that [**Arr**](#arr) and [**Parse**](#parse) return
- [JsonOptions](JsonOptions) class -- the options that most functions take
- [JsonError](JsonError) class -- reports the last error and lists the error codes
- [JsonPathQuery](JsonPathQuery) class -- a compiled JSONPath, and the JSONPath syntax
- [JsonSchema](JsonSchema) class -- a compiled schema, and the schema keywords that are checked
- [tsJson Package](.) -- the package
