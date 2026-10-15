---
title: ParseIso
parent: JsonConverter
permalink: /tB/Packages/Contributed/VBA_JSON/JsonConverter/ParseIso
has_toc: false
---
# ParseIso
{: .no_toc }

Parses an ISO 8601 date/time string and returns the equivalent local **Date** value.

Syntax: **ParseIso** ( *utc_IsoString* ) **As Date**

*utc_IsoString*
: *required* A **String** containing an ISO 8601 date/time representation, such as `"2024-06-03T14:30:00Z"` or `"2024-06-03T14:30:00+05:30"`.

Returns a **Date** value in the local time zone corresponding to the instant described by *utc_IsoString*.

### Remarks

<!-- test: DatesTests.ParseIso_Z_IsUtc, DatesTests.ParseIso_PositiveOffset_IsSubtracted, DatesTests.ParseIso_NegativeOffset_IsAdded, DatesTests.ParseIso_OffsetWithoutMinutes, DatesTests.ParseIso_NoOffset_IsUtc, DatesTests.ParseIso_DateOnly_IsLocalMidnight, DatesTests.ParseIso_TimeMayOmitSecondsOrMinutes, DatesTests.ParseIso_FractionOfASecond_IsTruncated, DatesTests.ParseIso_IsTheInverseOfConvertToIso -->
**ParseIso** accepts the following ISO 8601 forms:

- Date only: `YYYY-MM-DD` (no time component; midnight is assumed and no time-zone conversion is applied).
- Date and time with UTC designator: `YYYY-MM-DDTHH:MM:SSZ`.
- Date and time with a numeric UTC offset: `YYYY-MM-DDTHH:MM:SS+HH:MM` or `YYYY-MM-DDTHH:MM:SS-HH:MM`. The offset may omit minutes (`+HH` or `-HH`).
- Date and time with no offset: `YYYY-MM-DDTHH:MM:SS` (treated as UTC, then converted to local time via [**ParseUtc**](ParseUtc)).

The time component may omit the seconds, or the minutes and seconds (`THH:MM` or `THH`). Seconds may have a fractional part separated by a period (`.`); the fractional part is truncated, so the result is always a whole number of seconds.

When the string has a time component, **ParseIso** reads the time as UTC and converts it to local time by calling [**ParseUtc**](ParseUtc) internally. On Windows, that conversion uses the `SystemTimeToTzSpecificLocalTime` Win32 API and honours daylight saving time rules for the local machine. When an explicit numeric offset is present, the offset is then subtracted from the converted local time so that the returned value reflects local wall-clock time.

**ParseIso** is the inverse of [**ConvertToIso**](ConvertToIso).
<!-- /test -->

<!-- test: DatesTests.ParseIso_TextThatIsNotIso8601_Raises10013, DatesTests.ParseIso_BasicFormat_Raises10013 -->
On parse failure the function raises run-time error 10013 with the source `"UtcConverter.ParseIso"` and a message that includes the original string. A form that is not listed above, such as the basic format `20240603T090000Z` with no hyphens or colons, is a parse failure.
<!-- /test -->

<!-- test: DatesTests.ParseIso_OffsetWithoutAColon_IsHoursAndMinutes -->
> [!WARNING] 2.3.1.1
> An offset written without a colon, such as `+0530`, is read as a number of hours: `+0530` is 530 hours, and `2024-06-03T14:30:00+0530` gives 12 May 2024, with no error. Write the offset as `+05:30`.

<!-- test: DatesTests.ParseIso_DateBefore30December1899_AppliesTheZoneRules, DatesTests.ParseIso_DateBefore1601_Raises10013 -->
> [!WARNING] 2.3.1.1
> A string with a time on a date before 30 December 1899 gives the wrong day and time, and one before 1 January 1601 gives a meaningless date, with no error: [**ParseUtc**](ParseUtc) cannot convert it.

### Example

This example parses a UTC timestamp returned in a JSON payload and formats the equivalent local time.

```tb check_build
Dim Json As Object
Dim CreatedAt As Date

Set Json = ParseJson("{""created_at"":""2024-06-03T09:00:00Z""}")
CreatedAt = ParseIso(Json("created_at"))
Debug.Print Format$(CreatedAt, "yyyy-mm-dd hh:nn:ss")   ' local equivalent of 09:00 UTC
```

This example handles a timestamp that has an explicit UTC offset.

```tb check_build
Dim LocalDate As Date
LocalDate = ParseIso("2024-06-03T14:30:00+05:30")
Debug.Print Format$(LocalDate, "yyyy-mm-dd hh:nn:ss")
```

### See Also

- [ConvertToIso](ConvertToIso) function -- converts a local **Date** to an ISO 8601 string
- [ParseUtc](ParseUtc) function -- converts a UTC **Date** to local time
- [ConvertToUtc](ConvertToUtc) function -- converts a local **Date** to UTC
- [ParseJson](ParseJson) function -- parses a JSON string into a **Dictionary** or **Collection**
