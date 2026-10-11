---
title: ParseUtc
parent: JsonConverter
permalink: /tB/Packages/Contributed/VBA_JSON/JsonConverter/ParseUtc
has_toc: false
---
# ParseUtc
{: .no_toc }

Converts a UTC date to the equivalent local date using the system time zone.

Syntax: **ParseUtc** ( *utc_UtcDate* ) **As Date**

*utc_UtcDate*
: *required* A **Date** value representing a point in time expressed in Coordinated Universal Time (UTC).

Returns a **Date** representing the same instant adjusted to the local time zone configured on the machine.

### Remarks

On Windows, **ParseUtc** calls the Win32 `GetTimeZoneInformation` and `SystemTimeToTzSpecificLocalTime` APIs. The adjustment applies the machine's current time-zone rules, as `GetTimeZoneInformation` reports them, to the date and time given by *utc_UtcDate*, so whether daylight saving time is in effect at the time of the call does not matter. The conversion works in whole seconds: any fraction of a second in *utc_UtcDate* is dropped.

On macOS, **ParseUtc** invokes the system `date` command via a shell to perform the equivalent conversion.

If the conversion fails, run-time error 10011 ("UTC parsing error") is raised.

[**ParseIso**](ParseIso) calls **ParseUtc** internally after it parses the date and time components of an ISO 8601 string.

### Example

This example reads a UTC date, converts it to local time, and prints both values.

```tb
Dim utcDate As Date
Dim localDate As Date

utcDate = CDate("2024-06-15 12:00:00")
localDate = ParseUtc(utcDate)

Debug.Print "UTC:   " & utcDate
Debug.Print "Local: " & localDate
```

### See Also

- [ConvertToUtc](ConvertToUtc) function -- converts a local date to UTC
- [ParseIso](ParseIso) function -- parses an ISO 8601 string to a local date
- [ConvertToIso](ConvertToIso) function -- formats a local date as an ISO 8601 string
