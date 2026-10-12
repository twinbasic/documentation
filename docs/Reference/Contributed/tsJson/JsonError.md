---
title: JsonError
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonError
has_toc: false
---

# JsonError class
{: .no_toc }

The **JsonError** object reports the last error of the package: whether there is one, its code, its message, the function that found it, and where in the input or the document it was found.

**JsonError** is a predeclared object. It is used by its name, without a variable. The error itself is stored in the package, not in the object, and the package keeps a single last error. There is no member that sets it.

The functions of the package do not raise run-time errors for bad data or bad arguments. A function that fails returns an empty result and sets the last error. A function that can fail clears the last error when it starts, so the last error belongs to the latest such call; the page of [Json](Json) lists the members that do not clear it. To keep an error across the next call, copy it with [**Snapshot**](#snapshot). A run-time error that escapes from a function of the package, such as the one that [**Json.Serialize**](Json#serialize) raises for a two-dimensional array, stops the clearing for the rest of the run; [Known problems](.#known-problems-in-version-10150) shows it.

```tb check_build check_run
Dim v As Variant = Json.Parse("[1, 2")
Debug.Print JsonError.HasError                            ' True
Debug.Print JsonError.Code                                ' InvalidSyntax
Debug.Print JsonError.Message                             ' Expected ',' or ']' in array.
Debug.Print JsonError.Origin                              ' Json.Parse
Debug.Print JsonError.Line & ":" & JsonError.Column       ' 1:6
Debug.Print JsonError.Snippet                             ' [1, 2
Debug.Print JsonError.ToString()                          ' Json.Parse: InvalidSyntax - Expected ',' or ']' in array. (line 1, column 6, position 6) | [1, 2

Dim o As JsonObject = Json.Map("a", 1)
Dim m As JsonObject = o.Map("a")
Debug.Print JsonError.ToString()                          ' JsonObject.Map: WrongType - Expected object. [path: /a]
```

A failed call returns an empty value, and some successful calls return the same value: an empty string, **False** or 0. Test [**HasError**](#haserror) to tell the two apart.

* TOC
{:toc}

## Error codes

The code is a **String** that names the error. It is case-sensitive. These are the codes that the package sets.

| Code | Set when |
|:-----|:---------|
| `InvalidArgument` | [**Json.Map**](Json#map) gets an odd number of arguments, or a key that is not a **String**. |
| `WrongType` | A value has the wrong type for the call: the text passed to [**Json.Parse**](Json#parse) is neither a **String** nor a **Byte** array; [**SerializeLines**](Json#serializelines) gets a value that is not an array; [**JsonObject.Merge**](JsonObject#merge) gets **Nothing**; or a typed reader (**Str**, **Num**, **Bool**, **Map**, **Arr**) finds a member of another type. |
| `MissingKey` | [**JsonObject.Item**](JsonObject#item) or [**Remove**](JsonObject#remove) gets a key that does not exist; [**JsonObject.Map**](JsonObject#map) or [**Arr**](JsonObject#arr) gets a missing key; [**JsonArray.Map**](JsonArray#map) or [**Arr**](JsonArray#arr) gets an index outside the array. |
| `IndexOutOfRange` | The index passed to [**JsonArray.Item**](JsonArray#item), [**Insert**](JsonArray#insert) or [**RemoveAt**](JsonArray#removeat) is outside the array. |
| `InvalidSyntax` | The text is not valid JSON, or a JSONC extension is used in strict JSON. |
| `UnexpectedEnd` | The text ends where a value, a key or the rest of a string is needed, or the document is empty. |
| `InvalidEscape` | A string holds an invalid escape sequence, or a `\u` escape of a surrogate that has no partner. |
| `InvalidNumber` | A number in the text is not valid or is outside the range of a **Decimal**; or [**Serialize**](Json#serialize) is given a number that a **Decimal** cannot hold. |
| `TrailingData` | There is text after the end of the JSON value. |
| `InvalidComment` | A `/*` comment in JSONC is not closed. |
| `DuplicateKey` | An object has the same key twice and [**DuplicateKeys**](JsonOptions#duplicatekeys) is **jdkError**. |
| `DepthLimitExceeded` | Nesting is deeper than [**MaxDepth**](JsonOptions#maxdepth) in parsing, serializing or schema evaluation; or a JSONPath filter nests more than 1000 levels. |
| `LimitExceeded` | The input is longer than [**MaxBytes**](JsonOptions#maxbytes), a string longer than [**MaxStringLength**](JsonOptions#maxstringlength), an array longer than [**MaxArrayItems**](JsonOptions#maxarrayitems), or an object larger than [**MaxObjectMembers**](JsonOptions#maxobjectmembers). |
| `InvalidEncoding` | Bytes are not valid in the encoding, a UTF-16 input has an odd number of bytes, or text cannot be encoded as UTF-8. |
| `IoError` | A file cannot be found, opened, read or written. The message includes the reason from the system. |
| `UnsupportedType` | [**Serialize**](Json#serialize) is given a value that is not a JSON value. |
| `CircularReference` | An object or an array contains itself. |
| `InvalidPointer` | A JSON Pointer has invalid syntax, an array token is not an index, or the pointer names the whole document where a place is needed. |
| `PointerNotFound` | A JSON Pointer names a place that does not exist. |
| `InvalidPath` | A JSONPath has invalid syntax. |
| `InvalidPatch` | A JSON Patch is malformed. |
| `PatchFailed` | An operation of a JSON Patch cannot be applied. |
| `PatchTestFailed` | A `test` operation of a JSON Patch found a different value. |
| `InvalidSchema` | A schema is neither an object nor a Boolean, or [**JsonSchema.AddDocument**](JsonSchema#adddocument) gets an empty URI. |
| `RemoteRef` | A `$ref` of a schema names a document, a pointer or an anchor that is not available. |
| `InvalidDate` | [**Json.ParseIso8601**](Json#parseiso8601) gets text that is not a valid date. |

An invalid pattern given to a pattern function, and a miss that an `Exists` or `Try` function reports, are not errors, and no code stands for them.

## Properties

### Code
{: .no_toc }

The code of the last error. A **String**, read-only.

Syntax: *text* **=** **JsonError.Code**

Returns the code, such as `InvalidSyntax`, or an empty string when there is no error. The codes are listed under [Error codes](#error-codes).

### Column
{: .no_toc }

The column of the error in the input. A **Long**, read-only.

Syntax: *n* **=** **JsonError.Column**

Returns the column, counted from 1 in UTF-16 code units from the start of the line, or 0 when the error has no location. The location is set for errors in JSON text and in a JSONPath, where it is in the path text.

### HasError
{: .no_toc }

Whether there is a last error. A **Boolean**, read-only.

Syntax: *flag* **=** **JsonError.HasError**

Returns **True** after a function has failed, and **False** after one has succeeded, because a function clears the last error when it starts. It is also **False** after [**Clear**](#clear).

### Line
{: .no_toc }

The line of the error in the input. A **Long**, read-only.

Syntax: *n* **=** **JsonError.Line**

Returns the line, counted from 1, or 0 when the error has no location. A line feed, a carriage return, or a carriage return and a line feed together end a line.

### Message
{: .no_toc }

The message of the last error. A **String**, read-only.

Syntax: *text* **=** **JsonError.Message**

Returns the message in English, such as `Expected object key.`, or an empty string when there is no error. The messages are for a person; the code is the value to test in a program.

### Origin
{: .no_toc }

The function that found the last error. A **String**, read-only.

Syntax: *text* **=** **JsonError.Origin**

Returns the name of the module or class and of the public member that was called, such as `Json.Parse` or `JsonObject.Item`, or an empty string when there is no error. When a member calls another member of the package, the origin is the member that was called from outside.

### Path
{: .no_toc }

The JSON Pointer of the place the error concerns. A **String**, read-only.

Syntax: *text* **=** **JsonError.Path**

Returns a pointer, or an empty string when none was recorded. For a member of an object or an array it is the pointer from that object or array, such as `/name` or `/9`. For [**Json.PointerGet**](Json#pointerget) it is the pointer to the token that failed. For a duplicate key it is the pointer of the key. For a failed [**Json.Patch**](Json#patch) it is the position of the operation in the patch, or the pointer in the document. For a schema error it is the pointer in the schema.

### Position
{: .no_toc }

The position of the error in the input. A **Long**, read-only.

Syntax: *n* **=** **JsonError.Position**

Returns the position, counted from 1 in UTF-16 code units from the start of the text, or 0 when the error has no location. For [**Json.ParseLines**](Json#parselines) it is counted in the line that failed.

### Snippet
{: .no_toc }

A short part of the input around the error. A **String**, read-only.

Syntax: *text* **=** **JsonError.Snippet**

Returns up to 24 characters before the position and up to 24 after it, or an empty string when none was recorded.

## Methods

### Clear
{: .no_toc }

Clears the last error.

Syntax: **JsonError.Clear**

After the call, [**HasError**](#haserror) is **False** and the other properties are empty or 0. The functions of the package clear the last error themselves when they start, so a program needs **Clear** only to discard an error that it has read.

### Format
{: .no_toc }

Formats a copy of an error as one line of text.

Syntax: *text* **=** **JsonError.Format** ( *info* ) **As String**

*info*
: *required* A [**tJsonErrInfo**](#tjsonerrinfo) returned by [**Snapshot**](#snapshot). It is passed **ByRef**, so it must be a variable.

Returns what [**ToString**](#tostring) returns for the error that the copy holds, and an empty string when the copy holds no error.

### Snapshot
{: .no_toc }

Returns a copy of the last error.

Syntax: *snap* **=** **JsonError.Snapshot** ( ) **As** [**tJsonErrInfo**](#tjsonerrinfo)

Returns a [**tJsonErrInfo**](#tjsonerrinfo) with the values of all the properties at the time of the call. The copy belongs to the caller: the next call of a function of the package, which clears the last error, does not change it.

```tb check_build check_run
Dim bad As Variant = Json.Parse("{")
Dim snap As JsonError.tJsonErrInfo = JsonError.Snapshot()

Dim ok As Variant = Json.Parse("[]")
Debug.Print JsonError.HasError                            ' False
Debug.Print snap.HasError                                 ' True
Debug.Print snap.Code                                     ' UnexpectedEnd
Debug.Print JsonError.Format(snap)                        ' Json.Parse: UnexpectedEnd - Unexpected end of JSON. (line 1, column 2, position 2) | {
```

The type is declared inside the class. A variable of that type is declared `As JsonError.tJsonErrInfo`, as the sample above does.

### ToString
{: .no_toc }

Returns the last error as one line of text.

Syntax: *text* **=** **JsonError.ToString** ( ) **As String**

Returns an empty string when there is no error. Otherwise returns the origin, a colon and a space, the code, a space, a hyphen, a space and the message. Then, when the position is above 0, it adds a space and `(line L, column C, position P)`; when there is a path, a space and `[path: pointer]`; and when there is a snippet, a space, `|`, a space and the snippet. The text is meant for logs and for **Debug.Print**.

## Types

### tJsonErrInfo
{: .no_toc }

A copy of the last error, returned by [**Snapshot**](#snapshot). A user-defined type, declared inside the class.

| Field | Type | Content |
|:------|:-----|:--------|
| **HasError** | **Boolean** | Whether there was an error. |
| **Code** | **String** | The code, or an empty string. |
| **Message** | **String** | The message, or an empty string. |
| **Origin** | **String** | The origin, or an empty string. |
| **Position** | **Long** | The position, or 0. |
| **Line** | **Long** | The line, or 0. |
| **Column** | **Long** | The column, or 0. |
| **Snippet** | **String** | The snippet, or an empty string. |
| **Path** | **String** | The pointer, or an empty string. |

The fields are separate values. Unlike the properties of **JsonError**, they do not change when the last error changes.

## See Also

- [Json](Json) module -- the functions whose errors it reports
- [JsonObject](JsonObject) and [JsonArray](JsonArray) classes -- their members report errors too
- [JsonOptions](JsonOptions) class -- the limits that several codes refer to
- [tsJson Package](.) -- the package
