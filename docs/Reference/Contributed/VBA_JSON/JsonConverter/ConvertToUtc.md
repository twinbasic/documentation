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

On Windows, **ConvertToUtc** calls the Win32 `GetTimeZoneInformation` and `TzSpecificLocalTimeToSystemTime` APIs. The adjustment applies the machine's current time-zone rules, as `GetTimeZoneInformation` reports them, to the date and time given by *utc_LocalDate*, so whether daylight saving time is in effect at the time of the call does not matter. The conversion works in whole seconds: any fraction of a second in *utc_LocalDate* is dropped.

On macOS, **ConvertToUtc** invokes the system `date` command via a shell to perform the equivalent conversion.

If the conversion fails, run-time error 10012 ("UTC conversion error") is raised.

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
