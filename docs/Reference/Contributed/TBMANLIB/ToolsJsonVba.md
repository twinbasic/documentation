---
title: ToolsJsonVba
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsJsonVba
has_toc: false
---

# ToolsJsonVba module
{: .no_toc }

The JSON parser and writer of the package, and its functions for UTC and ISO 8601 dates. [**cJson**](cJson) calls it for its [**Decode**](cJson#decode) and [**Encode**](cJson#encode), and a program can call it directly.

The module is the code of **VBA-JSON** version 2.3.1, by Tim Hall (MIT licence, [github.com/VBA-tools/VBA-JSON](https://github.com/VBA-tools/VBA-JSON)), which the source says is based on **JSONLib** by Ryo Yokoyama (BSD licence, `code.google.com/p/vba-json`), together with the code of **VBA-UTC** version 1.0.6, also by Tim Hall (MIT licence, [github.com/VBA-tools/VBA-UTC](https://github.com/VBA-tools/VBA-UTC)), in one module. The licence notice of JSONLib is kept in the source.

The [VBA_JSON](../VBA_JSON/) package of this documentation has the same code in its [**JsonConverter**](../VBA_JSON/JsonConverter/) module, and its pages describe every function in full. The two modules have the same code, line by line, apart from white space, the name of the module, the spelling `ERR.Raise` in one error call, and one line of **ConvertToJson**, which reads a dictionary entry as `JsonValue(json_Key)` where **JsonConverter** reads `JsonValue.Item(CStr(json_Key))`. One difference in what a program sees comes from the name `Dictionary`: in **ToolsJsonVba** it is the `Scripting.Dictionary` of the Microsoft Scripting Runtime, and in **JsonConverter** it is the **Dictionary** class of the VBA_JSON package. So **ParseJson** returns a `Scripting.Dictionary` for a JSON object here. Both modules make a **Collection** for a JSON array, and both write an object whose `TypeName` is `Dictionary` or `Collection`.

Each entry below says what the function does in a sentence or two and refers to the page in the VBA_JSON section for the details.

```tb check_build check_run
Dim d As Object
Set d = ToolsJsonVba.ParseJson("{""a"":1,""b"":[true,null]}")

Debug.Print TypeName(d)
Debug.Print ToolsJsonVba.ConvertToJson(d)
' Output:
' Dictionary
' {"a":1,"b":[true,null]}
```

* TOC
{:toc}

## Options

### JsonOptions
{: .no_toc }

A public variable of a type that is private to the module, with three **Boolean** fields. They change how the functions read and write JSON, and they apply to all callers, so they also change what [**cJson**](cJson) reads and writes. All three are **False** by default. [JsonOptions](../VBA_JSON/JsonConverter/#jsonoptions) in the VBA_JSON section describes them.

| Field | Effect when **True** |
|:------|:---------------------|
| `UseDoubleForLargeNumbers` | **ParseJson** returns every number as a **Double**, also one of 16 or more characters, which it returns as a **String** when the field is **False**. **ConvertToJson** puts quotation marks around every **String**. |
| `AllowUnquotedKeys` | **ParseJson** accepts object keys without quotation marks. |
| `EscapeSolidus` | **ConvertToJson** writes `/` as `\/`. |

```tb check_build check_run
Dim d As Object
Set d = ToolsJsonVba.ParseJson("{""url"":""a/b""}")

Debug.Print ToolsJsonVba.ConvertToJson(d)
ToolsJsonVba.JsonOptions.EscapeSolidus = True
Debug.Print ToolsJsonVba.ConvertToJson(d)
ToolsJsonVba.JsonOptions.EscapeSolidus = False
' Output:
' {"url":"a/b"}
' {"url":"a\/b"}
```

## Functions

### ConvertToIso
{: .no_toc }

Converts a local date and time to an ISO 8601 text in UTC.

Syntax: **ToolsJsonVba.ConvertToIso** ( *utc_LocalDate* ) **As String**

Returns text such as `2024-06-03T07:00:00.000Z`: the date converted to UTC with the time zone of the system and written with a fixed `.000` for the milliseconds. See [ConvertToIso](../VBA_JSON/JsonConverter/ConvertToIso).

### ConvertToJson
{: .no_toc }

Converts a value to JSON text.

Syntax: **ToolsJsonVba.ConvertToJson** ( *JsonValue* [ **,** *Whitespace* ] ) **As String**

Accepts a **Scripting.Dictionary** (written as an object), a **Collection** or an array (written as an array), and a **String**, **Boolean**, number, **Date** or **Null**. Non-ASCII and control characters in strings are written as `\uXXXX`. The optional *Whitespace* turns on indentation. See [ConvertToJson](../VBA_JSON/JsonConverter/ConvertToJson).

### ConvertToUtc
{: .no_toc }

Converts a local date and time to UTC.

Syntax: **ToolsJsonVba.ConvertToUtc** ( *utc_LocalDate* ) **As Date**

Uses the time zone of the system, with its rules for daylight saving time. Raises error 10012 on failure. See [ConvertToUtc](../VBA_JSON/JsonConverter/ConvertToUtc).

### ParseIso
{: .no_toc }

Converts an ISO 8601 text to a local date and time.

Syntax: **ToolsJsonVba.ParseIso** ( *utc_IsoString* ) **As Date**

Reads a date, or a date and time, with or without a `Z` or an offset such as `+02:00`. Raises error 10013 on failure. See [ParseIso](../VBA_JSON/JsonConverter/ParseIso).

### ParseJson
{: .no_toc }

Converts JSON text to a **Scripting.Dictionary** or a **Collection**.

Syntax: **ToolsJsonVba.ParseJson** ( *JsonString* ) **As Object**

The text has to start with `{` or `[`. A JSON object becomes a **Scripting.Dictionary**, an array a **Collection** (numbered from 1), a string a **String**, a number a **Double** (a **String** when it has 16 or more characters), `true` and `false` **Boolean** values and `null` **Null**. Raises error 10001, with the source `JSONConverter`, for text that it cannot read. See [ParseJson](../VBA_JSON/JsonConverter/ParseJson).

### ParseUtc
{: .no_toc }

Converts a UTC date and time to local time.

Syntax: **ToolsJsonVba.ParseUtc** ( *utc_UtcDate* ) **As Date**

Uses the time zone of the system. Raises error 10011 on failure. See [ParseUtc](../VBA_JSON/JsonConverter/ParseUtc).

## See Also

- [JsonConverter](../VBA_JSON/JsonConverter/) module -- the same code in the VBA_JSON package, with a full page for each function
- [cJson](cJson) class -- a JSON document object built on this module
- [cToolsStr](cToolsStr) class -- **UnicodeEncode** and **UnicodeDecode** for the `\uXXXX` escapes
- [TBMANLIB](.) package -- overview
