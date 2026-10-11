---
title: JsonConverter
parent: VBA_JSON Package
permalink: /tB/Packages/Contributed/VBA_JSON/JsonConverter/
has_toc: false
---

# JsonConverter module
{: .no_toc }

Provides JSON parsing, JSON serialization, and UTC/ISO 8601 date conversion for VBA and twinBASIC projects.

**JsonConverter** is a standard module. It exposes two primary functions---[**ParseJson**](ParseJson) and [**ConvertToJson**](ConvertToJson)---plus four date-utility functions ([**ParseUtc**](ParseUtc), [**ConvertToUtc**](ConvertToUtc), [**ParseIso**](ParseIso), [**ConvertToIso**](ConvertToIso)) and one public variable ([**JsonOptions**](#jsonoptions)) that controls parsing and serialization behavior.

```tb
' Parse a JSON string into an object graph.
Dim Result As Object
Set Result = ParseJson("{""name"":""Alice"",""score"":42}")
Debug.Print Result("name")    ' Alice

' Serialize an object graph to a JSON string.
Dim Data As New Dictionary
Data("name") = "Alice"
Data("score") = 42
Debug.Print ConvertToJson(Data)   ' {"name":"Alice","score":42}
```

* TOC
{:toc}

## Options

### JsonOptions

A public variable of the module-private `json_Options` type that controls parsing and serialization behavior. Set its fields before calling **ParseJson** or **ConvertToJson**.

| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `UseDoubleForLargeNumbers` | **Boolean** | **False** | When **False**, **ParseJson** returns a number whose text is 16 or more characters long (17 or more when it contains a decimal point) as a **String**, to avoid the 15-significant-digit limit of **Double**; **ConvertToJson** writes a **String** that looks like such a number without quotes. When **True**, **ParseJson** converts every number to **Double** regardless of length, and **ConvertToJson** quotes every **String**. |
| `AllowUnquotedKeys` | **Boolean** | **False** | When **True**, **ParseJson** accepts JSON objects whose keys are not quoted. The JSON standard requires quoted keys; this option enables a non-standard extension. |
| `EscapeSolidus` | **Boolean** | **False** | When **True**, **ConvertToJson** escapes forward slashes (`/`) as `\/` in the output. The JSON standard does not require solidus escaping; this option enables it for environments that expect it. |

```tb
' Preserve large integer IDs as strings.
JsonOptions.UseDoubleForLargeNumbers = False

Dim Result As Object
Set Result = ParseJson("{""id"":123456789012345678}")
Debug.Print VarType(Result("id"))   ' 8 (vbString): all 18 digits kept
```

## Functions

### ParseJson

Parses a JSON string and returns the corresponding object graph.

Syntax: **ParseJson** ( *JsonString* ) **As Object**

*JsonString*
: *required* A **String** containing a valid JSON text. The top-level value must be a JSON object (`{...}`) or a JSON array (`[...]`).

Returns a **Dictionary** when *JsonString* describes a JSON object, or a **Collection** when it describes a JSON array. Nested objects and arrays are represented by nested **Dictionary** and **Collection** values. JSON strings become **String** values; JSON numbers become **Double** values (or **String** for a number whose text is 16 or more characters long, 17 or more with a decimal point, when `JsonOptions.UseDoubleForLargeNumbers` is **False**); JSON booleans become **Boolean** values; and JSON `null` becomes **Null**.

All carriage returns, line feeds, and tab characters are removed from *JsonString* before parsing begins, including any inside string values. Between tokens, only space characters are skipped.

Raises run-time error 10001 with the source `"JSONConverter"` and a diagnostic message that shows the text around the error, with a caret marking the position, if the parser meets text it cannot read, such as a top-level value that is not an object or array, an unquoted key, a missing colon, or an unrecognised value. The parser is lenient: it does not check for commas between items, and it ignores any text after the top-level value.

### ConvertToJson

Serializes a value to a JSON string.

Syntax: **ConvertToJson** ( *JsonValue* [, *Whitespace* ] ) **As String**

*JsonValue*
: *required* A **Variant** holding the value to serialize. Accepted types: **Dictionary** (serialized as a JSON object), **Collection** or array (serialized as a JSON array), **String**, **Boolean**, numeric types (**Integer**, **Long**, **Single**, **Double**, **Currency**, **Decimal**), **Date**, and **Null**. **Empty** and **Nothing** within a **Collection** or array are serialized as JSON `null`; **Empty** and **Nothing** as a **Dictionary** value cause the key to be omitted from the output.

*Whitespace*
: *optional* Controls indented ("pretty-print") output. Pass an **Integer** to indent each level by that many spaces, or a **String** whose first character is repeated once per level (the rest of the string is ignored). Omit to produce compact output with no extra whitespace.

Returns a **String** containing the JSON representation of *JsonValue*.

**Date** values are serialized as quoted ISO 8601 strings in UTC by calling [**ConvertToIso**](ConvertToIso) internally. Numbers are written with a period (`.`) as the decimal separator: **ConvertToJson** replaces every comma in a number's text with a period, so a locale that uses a comma does not change the output.

### ParseUtc

Converts a UTC date to the equivalent local date using the system time zone.

Syntax: **ParseUtc** ( *utc_UtcDate* ) **As Date**

See [ParseUtc](ParseUtc) for full documentation.

### ConvertToUtc

Converts a local date to the equivalent UTC date using the system time zone.

Syntax: **ConvertToUtc** ( *utc_LocalDate* ) **As Date**

See [ConvertToUtc](ConvertToUtc) for full documentation.

### ParseIso

Parses an ISO 8601 date/time string and returns the equivalent local **Date** value.

Syntax: **ParseIso** ( *utc_IsoString* ) **As Date**

See [ParseIso](ParseIso) for full documentation.

### ConvertToIso

Converts a local date to an ISO 8601 date-time string in UTC.

Syntax: **ConvertToIso** ( *utc_LocalDate* ) **As String**

See [ConvertToIso](ConvertToIso) for full documentation.

## Remarks

**ParseJson** creates the package's own [**Dictionary**](../Dictionary/) class for each JSON object. **ConvertToJson** identifies an object by its **TypeName**: an object named `Dictionary` is written as a JSON object, an object named `Collection` as a JSON array, and any other object as an empty string.

VBA stores floating-point numbers with at most 15 significant digits. JSON payloads that contain large integers---such as 64-bit database IDs or payment-card numbers---may lose precision if parsed as **Double**. By default (`JsonOptions.UseDoubleForLargeNumbers = False`) **JsonConverter** returns a number whose text is 16 or more characters long (17 or more with a decimal point) as a **String**. When serializing, **ConvertToJson** writes without quotes a **String** of 16 to 100 characters that contains only digits, periods, and the letters `E` and `e`, so that downstream consumers receive a number token.

Error numbers used by this module:

| Number | Source | Description |
|--------|--------|-------------|
| 10001 | `JSONConverter` | JSON parse error |
| 10011 | `UtcConverter.ParseUtc` | UTC parsing error |
| 10012 | `UtcConverter.ConvertToUtc` | UTC conversion error |
| 10013 | `UtcConverter.ParseIso` | ISO 8601 parsing error |
| 10014 | `UtcConverter.ConvertToIso` | ISO 8601 conversion error |

## Example

This example reads a JSON payload, extracts fields, modifies the data, and writes the result back to JSON with two-space indentation.

```tb
Dim Json As String
Json = "{""product"":""Widget"",""price"":9.99,""tags"":[""new"",""sale""]}"

Dim Data As Object
Set Data = ParseJson(Json)

Debug.Print Data("product")         ' Widget
Debug.Print Data("price")           ' 9.99
Debug.Print Data("tags")(1)         ' new   (Collections are 1-based)

Data("price") = 12.5

Debug.Print ConvertToJson(Data, 2)
' {
'   "product": "Widget",
'   "tags": [
'     "new",
'     "sale"
'   ],
'   "price": 12.5
' }
' (assigning to "price" removed the entry and added it again, so it is now last)
```

This example serializes an object containing a **Date** field to show automatic ISO 8601 conversion.

```tb
Dim Order As New Dictionary
Order("id") = 1001
Order("placed") = CDate("2024-06-03 09:00:00")

Debug.Print ConvertToJson(Order)
' {"id":1001,"placed":"2024-06-03T07:00:00.000Z"}
' (shown for a machine whose time zone is UTC+02:00 on that date; a machine set to UTC prints 09:00:00)
```

## See Also

- [ParseJson](ParseJson) function -- parses a JSON string into a **Dictionary** or **Collection**
- [ConvertToJson](ConvertToJson) function -- serializes a value to a JSON string
- [ParseIso](ParseIso) function -- parses an ISO 8601 string to a local **Date**
- [ConvertToIso](ConvertToIso) function -- converts a local **Date** to an ISO 8601 UTC string
- [ParseUtc](ParseUtc) function -- converts a UTC **Date** to local time
- [ConvertToUtc](ConvertToUtc) function -- converts a local **Date** to UTC
- [VBA_JSON package](../) -- overview
