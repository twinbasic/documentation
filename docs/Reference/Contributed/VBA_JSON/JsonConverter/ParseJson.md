---
title: ParseJson
parent: JsonConverter
permalink: /tB/Packages/Contributed/VBA_JSON/JsonConverter/ParseJson
has_toc: false
---
# ParseJson
{: .no_toc }

Parses a JSON string and returns the result as a **Dictionary** or **Collection** object.

Syntax: **ParseJson** ( *JsonString* )

*JsonString*
: *required* A **String** containing a valid JSON text. The root value must be a JSON object (`{...}`) or a JSON array (`[...]`).

Returns an **Object** --- a **Dictionary** when the root JSON value is an object, or a **Collection** when it is an array. Nested objects and arrays are likewise returned as **Dictionary** and **Collection** values respectively. JSON strings become **String**, JSON numbers become **Double** (or **String** for a number whose text is 16 or more characters long, 17 or more with a decimal point, when `JsonOptions.UseDoubleForLargeNumbers` is **False**), JSON booleans become **Boolean**, and JSON `null` becomes **Null**.

All carriage returns, line feeds, and tab characters are removed from *JsonString* before parsing, including any inside string values, so formatted (pretty-printed) JSON is accepted without pre-processing.

### Remarks

If *JsonString* does not begin with `{` or `[` after leading spaces are skipped, **ParseJson** raises run-time error **10001** with source `JSONConverter` and a message that shows a short excerpt of the surrounding text with a caret under the position of the unexpected character. The same error is raised when the parser meets other text it cannot read inside the document, such as an unquoted key or a missing colon. The parser does not check for commas between items, and it ignores any text after the top-level value.

Large numbers in JSON (a number whose text is 16 or more characters long; 17 or more when it contains a decimal point) are returned as **String** by default to avoid the 15-significant-digit limit of **Double**. Set `JsonConverter.JsonOptions.UseDoubleForLargeNumbers = True` to force all numbers to **Double** regardless of length.

Object keys must be quoted (single or double quotes) unless `JsonConverter.JsonOptions.AllowUnquotedKeys` is set to **True**.

### Example

This example parses a JSON object and a JSON array, then reads values from each result.

```tb check_build
Dim Json As Object

' Parse a JSON object -- result is a Dictionary.
Set Json = ParseJson("{""name"":""Alice"",""age"":30}")
Debug.Print Json("name")   ' Alice
Debug.Print Json("age")    ' 30

' Parse a JSON array -- result is a Collection.
Set Json = ParseJson("[1, 2, 3]")
Dim Item As Variant
For Each Item In Json
    Debug.Print Item
Next Item

' Parse formatted (multi-line) JSON -- tabs and newlines are stripped automatically.
Dim Pretty As String
Pretty = "{" & vbCrLf & "  ""status"": ""ok""" & vbCrLf & "}"
Set Json = ParseJson(Pretty)
Debug.Print Json("status")   ' ok
```

### See Also

- [ConvertToJson](ConvertToJson) function
- [JsonConverter Module](.) module
