---
title: ConvertToUtc
parent: JsonConverter
permalink: /tB/Packages/Contributed/VBA_JSON/JsonConverter/ConvertToUtc
has_toc: false
---
# ConvertToUtc
{: .no_toc }

Converts a local date to the equivalent UTC date using the system time zone.

Syntax: **ConvertToUtc** ( *utc_LocalDate* ) **As Date**

*utc_LocalDate*
: *required* A **Date** value representing a local date and time.

Returns a **Date** representing the same instant expressed in Coordinated Universal Time (UTC).

### Remarks

<!-- test: DatesTests.ConvertToUtc_AppliesTheZoneRulesInForceOnThatDate, DatesTests.ConvertToUtc_AndParseUtc_AreInverses, DatesTests.ConvertToUtc_FractionOfASecond_IsRoundedToTheNearestSecond -->
On Windows, **ConvertToUtc** calls the Win32 `GetTimeZoneInformation` and `TzSpecificLocalTimeToSystemTime` APIs. The adjustment applies the machine's current time-zone rules, as `GetTimeZoneInformation` reports them, to the date and time given by *utc_LocalDate*, so whether daylight saving time is in effect at the time of the call does not matter. The conversion works in whole seconds: a fraction of a second in *utc_LocalDate* is rounded to the nearest second.
<!-- /test -->

<!-- test: DatesTests.ConvertToUtc_DateBefore30December1899_AppliesTheZoneRules, DatesTests.ConvertToUtc_DateBefore1601_Raises10012 -->
> [!WARNING] 2.3.1.1
> A **Date** before 30 December 1899 gets the wrong day and time, and one before 1 January 1601 gives a meaningless date, with no error: Windows cannot convert it, and the function returns a date that bears no relation to the argument. Run-time error 10012 is not raised for it.


On macOS, **ConvertToUtc** invokes the system `date` command via a shell to perform the equivalent conversion.

An error during the conversion raises run-time error 10012 ("UTC conversion error") with the source `UtcConverter.ConvertToUtc`.

**ConvertToUtc** is called internally by [**ConvertToIso**](ConvertToIso), which uses it to obtain the UTC instant before formatting the result as an ISO 8601 string.

### Example

This example converts the current local time to UTC and prints both values.

```tb check_build
Dim localDate As Date
Dim utcDate As Date

localDate = Now
utcDate = JsonConverter.ConvertToUtc(localDate)

Debug.Print "Local: " & localDate
Debug.Print "UTC:   " & utcDate
```

### See Also

- [ParseUtc](ParseUtc) function -- converts a UTC date to a local date
- [ConvertToIso](ConvertToIso) function -- formats a local date as an ISO 8601 string
- [ParseIso](ParseIso) function -- parses an ISO 8601 string to a local date
