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

<!-- test: ParseJsonTests.Object_GivesADictionary, ConvertToJsonTests.Dictionary_IsAnObject, ConvertToJsonTests.RoundTrip_ParseThenConvert_GivesTheSameText -->
```tb check_build
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
<!-- /test -->

* TOC
{:toc}

## Options

### JsonOptions

A public variable of the module-private `json_Options` type that controls parsing and serialization behavior. Set its fields before calling **ParseJson** or **ConvertToJson**.

<!-- test: OptionsTests.Defaults_AreAllFalse, OptionsTests.UseDoubleForLargeNumbers_True_ParseGivesDoubles, OptionsTests.UseDoubleForLargeNumbers_True_ConvertQuotesEveryString, OptionsTests.AllowUnquotedKeys_True_ParseAcceptsThem, OptionsTests.AllowUnquotedKeys_False_ParseRefusesThem, OptionsTests.EscapeSolidus_True_ConvertEscapesTheSolidus, OptionsTests.EscapeSolidus_ParseReadsAnEscapedSolidusWhateverTheOption, OptionsTests.Options_AreIndependent, ParseJsonTests.LargeNumbers_16CharactersOrMore_AreStrings, ConvertToJsonTests.String_OfDigitsOnly_16To100Characters_IsWrittenWithoutQuotes -->
| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `UseDoubleForLargeNumbers` | **Boolean** | **False** | When **False**, **ParseJson** returns a number whose text is 16 or more characters long (17 or more when it contains a decimal point) as a **String**, to avoid the 15-significant-digit limit of **Double**; **ConvertToJson** writes a **String** that looks like such a number without quotes. When **True**, **ParseJson** converts every number to **Double** regardless of length, and **ConvertToJson** quotes every **String**. |
| `AllowUnquotedKeys` | **Boolean** | **False** | When **True**, **ParseJson** accepts JSON objects whose keys are not quoted. The JSON standard requires quoted keys; this option enables a non-standard extension. |
| `EscapeSolidus` | **Boolean** | **False** | When **True**, **ConvertToJson** escapes forward slashes (`/`) as `\/` in the output. The JSON standard does not require solidus escaping; this option enables it for environments that expect it. |
<!-- /test -->

<!-- test: ParseJsonTests.ObjectValues_LargeNumberIsAString -->
```tb check_build
' Preserve large integer IDs as strings.
JsonOptions.UseDoubleForLargeNumbers = False

Dim Result As Object
Set Result = ParseJson("{""id"":123456789012345678}")
Debug.Print VarType(Result("id"))   ' 8 (vbString): all 18 digits kept
```
<!-- /test -->

## Functions

### ParseJson

Parses a JSON string and returns the corresponding object graph.

Syntax: **ParseJson** ( *JsonString* ) **As Object**

*JsonString*
: *required* A **String** containing a valid JSON text. The top-level value must be a JSON object (`{...}`) or a JSON array (`[...]`).

<!-- test: ParseJsonTests.Object_GivesADictionary, ParseJsonTests.Array_GivesACollection, ParseJsonTests.Nested_ObjectsAndArrays_AreDictionariesAndCollections, ParseJsonTests.EmptyContainers, ParseJsonTests.Numbers_AreDoubles, ParseJsonTests.Literals_TrueFalseNull, ParseJsonTests.Strings_Escapes, ParseJsonTests.Strings_UnicodeEscapes, ParseJsonTests.LargeNumbers_16CharactersOrMore_AreStrings, ParseJsonTests.LargeNumbers_WithADecimalPoint_NeedSeventeenCharacters, ParseJsonTests.Strings_SpacesAreKept -->
Returns a **Dictionary** when *JsonString* describes a JSON object, or a **Collection** when it describes a JSON array. Nested objects and arrays are represented by nested **Dictionary** and **Collection** values. JSON strings become **String** values; JSON numbers become **Double** values (or **String** for a number whose text is 16 or more characters long, 17 or more with a decimal point, when `JsonOptions.UseDoubleForLargeNumbers` is **False**); JSON booleans become **Boolean** values; and JSON `null` becomes **Null**. The escapes `\"`, `\\`, `\/`, `\b`, `\f`, `\r` and `\t` are read, and so is `\u` followed by four hexadecimal digits.
<!-- /test -->

<!-- test: ParseJsonTests.RawCrLfAndTab_AreRemovedBeforeParsing, ParseJsonTests.FormattedJson_IsAccepted -->
All carriage returns, line feeds, and tab characters are removed from *JsonString* before parsing begins, including any inside string values. Between tokens, only space characters are skipped.
<!-- /test -->

<!-- test: ParseJsonTests.Strings_NewlineEscape_IsALineFeed -->
> [!WARNING] 2.3.1.1
> The escape `\n` is read as a carriage return followed by a line feed, two characters, and not as the one line feed that JSON defines. The text `"a\nb"` gives `"a" & vbCr & vbLf & "b"`, and a text read and written again with **ConvertToJson** changes from `\n` to `\r\n`.

<!-- test: ParseJsonTests.Error_ArrayThatIsNotClosed_Raises10001, ParseJsonTests.Error_StringInAnArrayThatIsNotClosed_Raises10001, ParseJsonTests.Error_ObjectThatIsNotClosed_Raises10001 -->
> [!WARNING] 2.3.1.1
> Text that ends before an array is closed, such as `[1,2` or `["abc`, does not return: the parser keeps adding empty items to the array. An object that is not closed raises error 10001, but an unclosed array inside an object hangs the same way.

<!-- test: DictionaryTests.Item_KeysThatDifferInCase_AreSeparateKeys, ParseJsonTests.KeysThatDifferInCase_AreSeparateEntries -->
> [!WARNING] 2.3.1.1
> Keys that differ only in case, such as `id` and `ID` in one JSON object, become one entry of the **Dictionary**, which holds the last value; the other value is lost without an error.

<!-- test: ParseJsonTests.Error_NumberBeyondTheRangeOfADouble_RaisesOverflow -->
> [!NOTE] 2.3.1.1
> A number outside the range of a **Double**, such as `1e999`, raises run-time error 6 (Overflow) and not error 10001.

<!-- test: ParseJsonTests.Error_EmptyText_Raises10001, ParseJsonTests.Error_TopLevelValueThatIsNotAnObjectOrArray_Raises10001, ParseJsonTests.Error_UnquotedKey_Raises10001, ParseJsonTests.Error_MissingColon_Raises10001, ParseJsonTests.Error_UnrecognisedValue_Raises10001, ParseJsonTests.Error_Message_ShowsTheTextAndACaret, ParseJsonTests.Error_Message_ShowsTenCharactersEachSideOfTheError -->
Raises run-time error 10001 with the source `"JSONConverter"` and a diagnostic message that shows the text around the error, with a caret marking the position, if the parser meets text it cannot read, such as a top-level value that is not an object or array, an unquoted key, a missing colon, a trailing comma or an unrecognised value.
<!-- /test -->

<!-- test: ParseJsonTests.Lenient_MissingCommas_AreAccepted, ParseJsonTests.Lenient_TextAfterTheTopLevelValue_IsIgnored, ParseJsonTests.Lenient_SingleQuotedStringsAndKeys_AreAccepted, ParseJsonTests.Lenient_NumbersJsonDoesNotAllow_AreAccepted, ParseJsonTests.Lenient_UnknownEscape_DropsTheBackslash, ParseJsonTests.DuplicateKeys_LastValueWins, ParseJsonTests.EmptyKey_IsAKey -->
The parser is lenient: it does not check for commas between items, and it ignores any text after the top-level value. It also accepts strings and keys in single quotes, a number with a leading zero or a leading plus sign or ending in a period, and an escape it does not know, which it reads as the character after the backslash. A key that appears twice keeps its last value.
<!-- /test -->

### ConvertToJson

Serializes a value to a JSON string.

Syntax: **ConvertToJson** ( *JsonValue* [, *Whitespace* ] ) **As String**

*JsonValue*
: *required* A **Variant** holding the value to serialize. Accepted types: **Dictionary** (serialized as a JSON object), **Collection** or array (serialized as a JSON array), **String**, **Boolean**, numeric types (**Integer**, **Long**, **Single**, **Double**, **Currency**, **Decimal**), **Date**, and **Null**. **Empty** and **Nothing** within a **Collection** or array are serialized as JSON `null`; **Empty** and **Nothing** as a **Dictionary** value cause the key to be omitted from the output.

*Whitespace*
: *optional* Controls indented ("pretty-print") output. Pass an **Integer** to indent each level by that many spaces, or a **String** whose first character is repeated once per level (the rest of the string is ignored). Omit to produce compact output with no extra whitespace.

Returns a **String** containing the JSON representation of *JsonValue*.

<!-- test: DatesTests.ConvertToJson_Date_IsAQuotedIsoString, DatesTests.ConvertToJson_Date_InsideADictionaryACollectionAndAnArray, ConvertToJsonTests.Scalars_Numbers, ConvertToJsonTests.Scalars_DoubleOfLargeMagnitude_IsAJsonNumber, ConvertToJsonTests.Collection_ItemThatIsEmptyOrNothing_IsNull, ConvertToJsonTests.Array_ElementThatIsEmptyOrNothing_IsNull, ConvertToJsonTests.Dictionary_ValueThatIsEmptyOrNothing_OmitsTheKey -->
**Date** values are serialized as quoted ISO 8601 strings in UTC by calling [**ConvertToIso**](ConvertToIso) internally. Numbers are written with a period (`.`) as the decimal separator: **ConvertToJson** replaces every comma in a number's text with a period, so a locale that uses a comma does not change the output.
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

<!-- test: ConvertToJsonTests.OtherObjects_GiveAnEmptyString, ConvertToJsonTests.ObjectNamedDictionary_IsAnObject, ConvertToJsonTests.Dictionary_IsAnObject, ConvertToJsonTests.Collection_IsAnArray, ParseJsonTests.Object_GivesADictionary -->
**ParseJson** creates the package's own [**Dictionary**](../Dictionary/) class for each JSON object. **ConvertToJson** identifies an object by its **TypeName**: an object named `Dictionary` is written as a JSON object, an object named `Collection` as a JSON array, and any other object as an empty string.
<!-- /test -->

<!-- test: ParseJsonTests.LargeNumbers_16CharactersOrMore_AreStrings, ConvertToJsonTests.String_OfDigitsOnly_16To100Characters_IsWrittenWithoutQuotes, ConvertToJsonTests.String_ThatIsShorterLongerOrHoldsOtherCharacters_IsQuoted -->
VBA stores floating-point numbers with at most 15 significant digits. JSON payloads that contain large integers---such as 64-bit database IDs or payment-card numbers---may lose precision if parsed as **Double**. By default (`JsonOptions.UseDoubleForLargeNumbers = False`) **JsonConverter** returns a number whose text is 16 or more characters long (17 or more with a decimal point) as a **String**. When serializing, **ConvertToJson** writes without quotes a **String** of 16 to 100 characters that contains only digits, periods, and the letters `E` and `e`, so that downstream consumers receive a number token.
<!-- /test -->

<!-- test: ParseJsonTests.Error_EmptyText_Raises10001, ParseJsonTests.Error_UnquotedKey_Raises10001, DatesTests.ParseIso_TextThatIsNotIso8601_Raises10013, DatesTests.ParseUtc_DateBefore1601_Raises10011, DatesTests.ConvertToUtc_DateBefore1601_Raises10012, DatesTests.ConvertToIso_DateBefore1601_Raises10014 -->
Error numbers used by this module:

| Number | Source | Description |
|--------|--------|-------------|
| 10001 | `JSONConverter` | JSON parse error |
| 10011 | `UtcConverter.ParseUtc` | UTC parsing error |
| 10012 | `UtcConverter.ConvertToUtc` | UTC conversion error |
| 10013 | `UtcConverter.ParseIso` | ISO 8601 parsing error |
| 10014 | `UtcConverter.ConvertToIso` | ISO 8601 conversion error |
<!-- /test -->

## Example

This example reads a JSON payload, extracts fields, modifies the data, and writes the result back to JSON with two-space indentation.

<!-- test: ConvertToJsonTests.Whitespace_AfterUpdatingAKey_ShowsTheKeyLast -->
```tb check_build
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
<!-- /test -->

This example serializes an object containing a **Date** field to show automatic ISO 8601 conversion.

<!-- test: DatesTests.ConvertToJson_Date_InsideADictionaryACollectionAndAnArray -->
```tb check_build
Dim Order As New Dictionary
Order("id") = 1001
Order("placed") = CDate("2024-06-03 09:00:00")

Debug.Print ConvertToJson(Order)
' {"id":1001,"placed":"2024-06-03T07:00:00.000Z"}
' (shown for a machine whose time zone is UTC+02:00 on that date; a machine set to UTC prints 09:00:00)
```
<!-- /test -->

## See Also

- [ParseJson](ParseJson) function -- parses a JSON string into a **Dictionary** or **Collection**
- [ConvertToJson](ConvertToJson) function -- serializes a value to a JSON string
- [ParseIso](ParseIso) function -- parses an ISO 8601 string to a local **Date**
- [ConvertToIso](ConvertToIso) function -- converts a local **Date** to an ISO 8601 UTC string
- [ParseUtc](ParseUtc) function -- converts a UTC **Date** to local time
- [ConvertToUtc](ConvertToUtc) function -- converts a local **Date** to UTC
- [VBA_JSON package](../) -- overview
