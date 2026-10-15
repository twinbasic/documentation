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

<!-- test: ParseJsonTests.Object_GivesADictionary, ParseJsonTests.Array_GivesACollection, ParseJsonTests.Nested_ObjectsAndArrays_AreDictionariesAndCollections, ParseJsonTests.EmptyContainers, ParseJsonTests.Numbers_AreDoubles, ParseJsonTests.Literals_TrueFalseNull, ParseJsonTests.Strings_Escapes, ParseJsonTests.Strings_UnicodeEscapes, ParseJsonTests.LargeNumbers_16CharactersOrMore_AreStrings, ParseJsonTests.LargeNumbers_WithADecimalPoint_NeedSeventeenCharacters, ParseJsonTests.ObjectValues_LargeNumberIsAString, ParseJsonTests.Strings_SpacesAreKept, DatesTests.ParseJson_DateInTheText_StaysAString -->
Returns an **Object** --- a **Dictionary** when the root JSON value is an object, or a **Collection** when it is an array. Nested objects and arrays are likewise returned as **Dictionary** and **Collection** values respectively. JSON strings become **String**, JSON numbers become **Double** (or **String** for a number whose text is 16 or more characters long, 17 or more with a decimal point, when `JsonOptions.UseDoubleForLargeNumbers` is **False**), JSON booleans become **Boolean**, and JSON `null` becomes **Null**. The escapes `\"`, `\\`, `\/`, `\b`, `\f`, `\r` and `\t` are read, and so is `\u` followed by four hexadecimal digits. A JSON string that holds a date stays a **String**: pass it to [**ParseIso**](ParseIso) to get a **Date**.
<!-- /test -->

<!-- test: ParseJsonTests.RawCrLfAndTab_AreRemovedBeforeParsing, ParseJsonTests.FormattedJson_IsAccepted -->
All carriage returns, line feeds, and tab characters are removed from *JsonString* before parsing, including any inside string values, so formatted (pretty-printed) JSON is accepted without pre-processing.
<!-- /test -->

### Remarks

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
If *JsonString* does not begin with `{` or `[` after leading spaces are skipped, **ParseJson** raises run-time error **10001** with source `JSONConverter` and a message that shows a short excerpt of the surrounding text with a caret under the position of the unexpected character. The excerpt holds up to ten characters on each side of the position. The same error is raised when the parser meets other text it cannot read inside the document, such as an unquoted key, a missing colon, a trailing comma or a value it does not know.
<!-- /test -->

<!-- test: ParseJsonTests.Lenient_MissingCommas_AreAccepted, ParseJsonTests.Lenient_TextAfterTheTopLevelValue_IsIgnored, ParseJsonTests.Lenient_SingleQuotedStringsAndKeys_AreAccepted, ParseJsonTests.Lenient_NumbersJsonDoesNotAllow_AreAccepted, ParseJsonTests.Lenient_UnknownEscape_DropsTheBackslash, ParseJsonTests.DuplicateKeys_LastValueWins, ParseJsonTests.EmptyKey_IsAKey -->
The parser does not check for commas between items, and it ignores any text after the top-level value. It also accepts text that JSON does not allow: strings and keys in single quotes, a number with a leading zero or a leading plus sign or ending in a period, and an escape it does not know, which it reads as the character after the backslash. A `\u` followed by four characters that are not hexadecimal digits is read as the character U+0000. A key that appears twice keeps its last value, at the end of the order of the keys. The empty string is a key like any other.
<!-- /test -->

<!-- test: ParseJsonTests.LargeNumbers_16CharactersOrMore_AreStrings, ParseJsonTests.LargeNumbers_WithADecimalPoint_NeedSeventeenCharacters, OptionsTests.UseDoubleForLargeNumbers_True_ParseGivesDoubles -->
Large numbers in JSON (a number whose text is 16 or more characters long; 17 or more when it contains a decimal point) are returned as **String** by default to avoid the 15-significant-digit limit of **Double**. Set `JsonConverter.JsonOptions.UseDoubleForLargeNumbers = True` to force all numbers to **Double** regardless of length.
<!-- /test -->

<!-- test: ParseJsonTests.Error_UnquotedKey_Raises10001, OptionsTests.AllowUnquotedKeys_True_ParseAcceptsThem, OptionsTests.AllowUnquotedKeys_False_ParseRefusesThem, OptionsTests.EscapeSolidus_ParseReadsAnEscapedSolidusWhateverTheOption -->
Object keys must be quoted (single or double quotes) unless `JsonConverter.JsonOptions.AllowUnquotedKeys` is set to **True**.
<!-- /test -->

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
