---
title: ConvertToJson
parent: JsonConverter
permalink: /tB/Packages/Contributed/VBA_JSON/JsonConverter/ConvertToJson
has_toc: false
---
# ConvertToJson
{: .no_toc }

Converts a VBA value to its JSON string representation.

Syntax: **ConvertToJson** ( *JsonValue* [ **,** *Whitespace* ] )

*JsonValue*
: *required* The value to convert. Accepts a **Dictionary** (converted to a JSON object), a **Collection** or VBA array (converted to a JSON array), or any scalar value (**String**, **Boolean**, numeric types, **Date**, **Null**, **Empty**).

*Whitespace*
: *optional* Controls pretty-printing. Pass an **Integer** to indent each level by that many spaces, or a **String** whose first character is repeated once per level (the rest of the string is ignored). When omitted, the output is compact with no added whitespace.

The function returns a **String** containing the JSON representation of *JsonValue*.

### Remarks

The following table summarises how each VBA type maps to JSON:

<!-- test: ConvertToJsonTests.Scalars_NullAndBooleans, ConvertToJsonTests.Scalars_Numbers, ConvertToJsonTests.Scalars_DoubleOfLargeMagnitude_IsAJsonNumber, ConvertToJsonTests.Scalars_Double_IsWrittenWith15SignificantDigits, ConvertToJsonTests.Scalars_EmptyAndNothing_GiveAnEmptyString, ConvertToJsonTests.Scalars_String_IsQuoted, ConvertToJsonTests.String_QuoteBackslashAndControlCharacters_AreEscaped, ConvertToJsonTests.String_OtherControlCharacters_AreEscapedAsUnicode, ConvertToJsonTests.String_NonAsciiCharacters_AreEscapedAsUnicode, ConvertToJsonTests.String_OfDigitsOnly_16To100Characters_IsWrittenWithoutQuotes, ConvertToJsonTests.String_ThatIsShorterLongerOrHoldsOtherCharacters_IsQuoted, OptionsTests.UseDoubleForLargeNumbers_True_ConvertQuotesEveryString, ConvertToJsonTests.Dictionary_IsAnObject, ConvertToJsonTests.Dictionary_Key_IsWrittenExactlyAsStored, ConvertToJsonTests.Dictionary_ValueThatIsEmptyOrNothing_OmitsTheKey, ConvertToJsonTests.Dictionary_NestedObjectsAndCollections, ConvertToJsonTests.OtherObjects_GiveAnEmptyString, ConvertToJsonTests.ObjectNamedDictionary_IsAnObject, ConvertToJsonTests.Collection_IsAnArray, ConvertToJsonTests.Collection_ItemThatIsEmptyOrNothing_IsNull, ConvertToJsonTests.Array_OneDimension, ConvertToJsonTests.Array_ElementThatIsEmptyOrNothing_IsNull, ConvertToJsonTests.Array_TwoDimensions_IsAnArrayOfArrays, DatesTests.ConvertToJson_Date_IsAQuotedIsoString, DatesTests.ConvertToJson_Date_InsideADictionaryACollectionAndAnArray -->
| VBA type | JSON output |
|---|---|
| **Null** | `null` |
| **Boolean** **True** | `true` |
| **Boolean** **False** | `false` |
| Numeric (**Integer**, **Long**, **Single**, **Double**, **Currency**, **Decimal**) | Number literal. A locale decimal separator (comma) is replaced with a period. |
| **Date** | ISO 8601 string in double quotes (UTC, e.g. `"2024-06-03T12:00:00.000Z"`). |
| **String** | Double-quoted string with JSON escape sequences applied. Control characters and non-ASCII code points are escaped as `\uXXXX`. |
| Large-number **String** | Numeric literal without quotes (when `JsonOptions.UseDoubleForLargeNumbers` is **False** and the string is 16 to 100 characters long and contains only digits, periods, and the letters `E` and `e`). |
| VBA array (1D or 2D) | JSON array. **Empty** or **Nothing** elements are emitted as `null`. |
| **Collection** | JSON array. **Empty** or **Nothing** items are emitted as `null`. |
| **Dictionary** | JSON object. Keys are written in double quotes exactly as stored. Entries whose value is **Empty** or **Nothing** are omitted entirely. |
| **Empty** / **Nothing** (top-level) | A zero-length string (not valid standalone JSON; meaningful only inside arrays and dictionaries as described above). |
| Any other object | A zero-length string. |
<!-- /test -->

<!-- test: ConvertToJsonTests.Dictionary_KeyWithAQuote_IsEscaped, ConvertToJsonTests.Dictionary_KeyWithABackslash_IsEscaped, ConvertToJsonTests.Dictionary_KeyWithALineFeed_IsEscaped -->
> [!WARNING] 2.3.1.1
> The keys of a **Dictionary** are written without escapes. A key that holds a quote, a backslash or a control character gives text that is not valid JSON (the key `a"b` is written as `"a"b"`), and a program that reads it fails or reads a different key.

<!-- test: ConvertToJsonTests.String_ThatIsNotANumber_IsQuoted -->
> [!WARNING] 2.3.1.1
> The rule for a large-number **String** looks only at the characters, so a string of 16 to 100 digits, periods, `E` and `e` is written without quotes even when it is not a JSON number. `"0000123456789012"` (leading zeros), 16 letters `E` and 16 periods all give text that is not valid JSON.

<!-- test: ConvertToJsonTests.Array_LowerBoundBelowZero_IsWritten, ConvertToJsonTests.Array_TwoDimensions_SecondLowerBoundBelowZero_IsWritten -->
> [!WARNING] 2.3.1.1
> An array whose lower bound is below zero is not written correctly, and no error is raised. An array from -1 to 1 gives `[]`, and an array of two dimensions whose second dimension starts below zero gives `[null,null]`.

<!-- test: DatesTests.ConvertToJson_DateBefore1601_Raises10014, DatesTests.ConvertToIso_DateBefore30December1899_AppliesTheZoneRules, DatesTests.ConvertToIso_DateBefore1601_Raises10014 -->
> [!WARNING] 2.3.1.1
> A **Date** before 30 December 1899 is written as a wrong time, and one before 1 January 1601 as a meaningless date, with no error. See [**ConvertToIso**](ConvertToIso).

<!-- test: ConvertToJsonTests.Scalars_Double_IsWrittenWith15SignificantDigits -->
> [!NOTE] 2.3.1.1
> A **Double** is written with at most 15 significant digits, as **CStr** gives it: 1 / 3 gives `0.333333333333333` and 0.1 + 0.2 gives `0.3`. Reading the text back gives a **Double** that can differ from the original in the last digits.

<!-- test: ConvertToJsonTests.Whitespace_Omitted_IsCompact, ConvertToJsonTests.Whitespace_Integer_IndentsEachLevelByThatManySpaces, ConvertToJsonTests.Whitespace_Integer_NestedCollectionAndNull, ConvertToJsonTests.Whitespace_String_RepeatsItsFirstCharacterOncePerLevel, ConvertToJsonTests.Whitespace_Arrays_AreIndentedLikeCollections -->
When *Whitespace* is provided, each nesting level is indented relative to its parent, and the lines are separated by `vbNewLine`. An **Integer** *Whitespace* of `4` produces four spaces per level; a **String** *Whitespace* of `vbTab` produces one tab per level. Only the first character of a **String** *Whitespace* is used, so `"  "` (two spaces) produces one space per level.
<!-- /test -->

<!-- test: ConvertToJsonTests.String_Solidus_IsNotEscapedByDefault, OptionsTests.EscapeSolidus_True_ConvertEscapesTheSolidus -->
The solidus (`/`) is not escaped by default. Set `JsonConverter.JsonOptions.EscapeSolidus = True` before calling **ConvertToJson** to escape forward slashes as `\/`.
<!-- /test -->

The `json_CurrentIndentation` parameter in the full signature is for internal recursive use. Do not pass it directly.

### Example

This example converts a **Dictionary** to a compact JSON string and then to a pretty-printed one.

```tb check_build
Dim Person As New Dictionary
Person("name") = "Alice"
Person("age") = 30
Person("active") = True

' Compact output
Dim Compact As String
Compact = ConvertToJson(Person)
' Result: {"name":"Alice","age":30,"active":true}

' Pretty-printed with 2 spaces per level
Dim Pretty As String
Pretty = ConvertToJson(Person, 2)
' Result:
' {
'   "name": "Alice",
'   "age": 30,
'   "active": true
' }
```

This example converts a **Dictionary** that contains a nested **Collection** and a **Null** value.

```tb check_build
Dim Tags As New Collection
Tags.Add "twinBASIC"
Tags.Add "JSON"

Dim Doc As New Dictionary
Doc("title") = "Getting Started"
Set Doc("tags") = Tags
Doc("revision") = Null

Dim JsonStr As String
JsonStr = ConvertToJson(Doc, 4)
' Result:
' {
'     "title": "Getting Started",
'     "tags": [
'         "twinBASIC",
'         "JSON"
'     ],
'     "revision": null
' }
```

### See Also

- [ParseJson](ParseJson) function -- parses a JSON string into a **Dictionary** or **Collection**
- [JsonConverter](.) module -- package module overview
