---
title: ConvertToIso
parent: JsonConverter
permalink: /tB/Packages/Contributed/VBA_JSON/JsonConverter/ConvertToIso
has_toc: false
---
# ConvertToIso
{: .no_toc }

Converts a local date to an ISO 8601 date-time string in UTC.

Syntax: **ConvertToIso** ( *utc_LocalDate* ) **As String**

*utc_LocalDate*
: *required* A **Date** value representing a local date and time.

<!-- test: DatesTests.ConvertToIso_WritesTheUtcTimeAsIso8601, DatesTests.ConvertToIso_Milliseconds_AreAlwaysZero -->
Returns a **String** in the form `yyyy-mm-ddTHH:mm:ss.000Z` representing the equivalent UTC instant. The milliseconds field is always `000`: the format fixes it, and [**ConvertToUtc**](ConvertToUtc) works in whole seconds.
<!-- /test -->

### Remarks

<!-- test: DatesTests.ConvertToIso_WritesTheUtcTimeAsIso8601 -->
**ConvertToIso** first converts *utc_LocalDate* from local time to UTC using [**ConvertToUtc**](ConvertToUtc), then formats the result according to ISO 8601. The trailing `Z` suffix indicates the UTC time zone.
<!-- /test -->

<!-- test: DatesTests.ConvertToIso_DateBefore30December1899_AppliesTheZoneRules, DatesTests.ConvertToIso_DateBefore1601_Raises10014, DatesTests.ConvertToJson_DateBefore1601_Raises10014 -->
> [!WARNING] 2.3.1.1
> A **Date** before 30 December 1899 gets the wrong day and time, and one before 1 January 1601 gives a meaningless date, with no error: [**ConvertToUtc**](ConvertToUtc) cannot convert it. Run-time error 10014 is not raised for it, and neither is it by [**ConvertToJson**](ConvertToJson) for such a **Date**.

<!-- test: DatesTests.ConvertToJson_Date_IsAQuotedIsoString, DatesTests.ConvertToJson_Date_InsideADictionaryACollectionAndAnArray -->
This function is used internally by [**ConvertToJson**](ConvertToJson) when it encounters a value of type **vbDate**: every **Date** value in a Dictionary, Collection, or array is serialized as a quoted ISO 8601 string.
<!-- /test -->

On Windows, the UTC offset is read from the system time-zone information via the Win32 `GetTimeZoneInformation` and `TzSpecificLocalTimeToSystemTime` APIs, so the result reflects the current daylight saving time rules of the local machine. On Mac, an equivalent shell command is used.

Raises run-time error 10014 (`"ISO 8601 conversion error"`) if an internal error occurs during conversion.

### Example

This example converts the current local time to an ISO 8601 UTC string.

```tb check_build
Dim IsoString As String
IsoString = JsonConverter.ConvertToIso(Now)
Debug.Print IsoString   ' e.g. "2024-03-15T14:30:00.000Z"
```

This example shows how **ConvertToJson** automatically applies **ConvertToIso** when a **Date** value is in the data being serialized.

```tb check_build
Dim Data As New Dictionary
Data("timestamp") = CDate("2024-03-15 14:30:00")

Dim Json As String
Json = JsonConverter.ConvertToJson(Data)
Debug.Print Json   ' {"timestamp":"2024-03-15T14:30:00.000Z"} on a machine set to UTC
                   ' (a machine in UTC+01:00 on that date prints 13:30:00)
```

### See Also

- [ConvertToUtc](ConvertToUtc) function
- [ParseIso](ParseIso) function
- [ConvertToJson](ConvertToJson) function
