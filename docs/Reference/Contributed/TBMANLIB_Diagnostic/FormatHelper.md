---
title: FormatHelper
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/FormatHelper
has_toc: false
---

# FormatHelper module
{: .no_toc }

Functions that turn numbers, times and text into the strings of a report: sizes in bytes, durations, percentages, dates, padded and shortened text, and text that is escaped for JSON and for HTML. The collectors and the formatters of the package use them, and a program can call them for its own reports.

The functions are called with the name of the module, as in `FormatHelper.FormatBytes(1536)`. The module has a function named **FormatDateTime**, which the runtime library has too. A call without the module name reaches the function of the runtime library, with one argument as well as with two, and no error is reported for the two names. Write `FormatHelper.FormatDateTime` for the one of the package:

```tb check_build check_run
Dim d As Date = DateSerial(2026, 3, 15) + TimeSerial(14, 30, 0)
Debug.Print FormatDateTime(d, vbShortTime)
Debug.Print FormatHelper.FormatDateTime(d)
' Output:
' 14:30
' 2026-03-15 14:30:00
```

```tb check_build check_run
Debug.Print FormatHelper.FormatBytes(512)
Debug.Print FormatHelper.FormatBytes(1536)
Debug.Print FormatHelper.FormatBytes(1073741824, 2)
Debug.Print FormatHelper.FormatUptime(90061000)
Debug.Print FormatHelper.FormatPercent(1, 3, 1)
Debug.Print "[" & FormatHelper.PadLeft("42", 5) & "]"
Debug.Print FormatHelper.Truncate("A long sentence", 10)
' Output:
' 512 B
' 1.5 KB
' 1.00 GB
' 1d 1h 1m 1s
' 33.3%
' [   42]
' A long ...
```

Functions that format a number or a date use the **Format** function of the runtime library. The decimal separator of a number, and the colon of a time, are those of the regional settings of the user: a size is `1.5 KB` in one setting and `1,5 KB` in another.

* TOC
{:toc}

## Methods

### EscapeHtml
{: .no_toc }

Escapes text for HTML.

Syntax: **FormatHelper.EscapeHtml** ( *text* ) **As String**

*text*
: *required* A **String**.

<!-- test: FormatHelperTests.EscapeHtml_ReplacesTheFiveCharacters -->
Replaces `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`, `"` with `&quot;` and `'` with `&#39;`, and returns the result. The ampersand is replaced first, so the entities that the other replacements add stay as they are.
<!-- /test -->

```tb check_build check_run
Debug.Print FormatHelper.EscapeHtml("<a href='x'>&</a>")
' Output:
' &lt;a href=&#39;x&#39;&gt;&amp;&lt;/a&gt;
```

### EscapeJson
{: .no_toc }

Escapes text for a JSON string.

Syntax: **FormatHelper.EscapeJson** ( *text* ) **As String**

*text*
: *required* A **String**.

<!-- test: FormatHelperTests.EscapeJson_NamedCharacters_AreEscaped -->
Replaces the backslash with `\\`, the double quote with `\"`, a carriage return with `\r`, a line feed with `\n` and a tab with `\t`. The result is meant to go between double quotes. No other character is changed: the control characters with the codes 1 to 31 other than these three, which JSON requires to be escaped, are returned as they are.
<!-- /test -->

```tb check_build check_run
Debug.Print FormatHelper.EscapeJson("a\b" & vbTab & """q""")
Debug.Print Len(FormatHelper.EscapeJson(Chr$(1))) & " " & Asc(FormatHelper.EscapeJson(Chr$(1)))
' Output:
' a\\b\t\"q\"
' 1 1
```

### FormatBytes
{: .no_toc }

Formats a number of bytes with a unit.

Syntax: **FormatHelper.FormatBytes** ( *bytes* [ , *decimals* ] ) **As String**

*bytes*
: *required* A **LongLong**, the number of bytes.

*decimals*
: *optional* A **Long**, the number of digits after the decimal separator. Default: 1.

<!-- test: FormatHelperTests.FormatBytes_Decimals_WritesThatManyDigits, FormatHelperTests.FormatBytes_BelowOneKilobyte_IsWholeBytes -->
The units are 1024 times larger one after the other, and are written `KB`, `MB`, `GB` and `TB`. The function picks the largest unit that is at most the size, divides, and writes the number with *decimals* digits, a space and the unit: `1.5 KB`. A size below 1024 is written in whole bytes as `512 B`, whatever *decimals* is. A size of 1024 TB or more is shown in TB. The number is made with the **Format** function and a pattern of zeros, so the digits are rounded. A negative size is written in bytes.
<!-- /test -->

With *decimals* set to 0 the pattern is `0.`, and the decimal separator stays in the text: `4. KB` and not `4 KB`. The **Page Size** item of [**CPUInfoCollector**](Collectors#cpuinfocollector) is written this way. See [Known problems](.#known-problems-in-version-1001).

```tb check_build check_run
Debug.Print FormatHelper.FormatBytes(4096, 0)
Debug.Print FormatHelper.FormatBytes(1048576, 0)
Debug.Print FormatHelper.FormatBytes(1536, 3)
Debug.Print FormatHelper.FormatBytes(-2048)
Debug.Print FormatHelper.FormatBytes(0)
' Output:
' 4. KB
' 1. MB
' 1.500 KB
' -2048 B
' 0 B
```

### FormatDateTime
{: .no_toc }

Formats a date and time as text.

Syntax: **FormatHelper.FormatDateTime** ( *dt* ) **As String**

*dt*
: *required* A **Date**.

Returns the form `yyyy-mm-dd hh:nn:ss` with a 24-hour clock, such as `2026-01-04 15:30:00`.

### FormatDateTimeISO
{: .no_toc }

Formats a date and time in the ISO 8601 form.

Syntax: **FormatHelper.FormatDateTimeISO** ( *dt* ) **As String**

*dt*
: *required* A **Date**.

Returns the form `yyyy-mm-ddThh:nn:ss`, such as `2026-01-04T15:30:00`. It has no time zone and no fraction of a second.

<!-- test: FormatHelperTests.DateFormats_WriteTheDocumentedForms -->
```tb check_build check_run
Dim d As Date = DateSerial(2026, 1, 4) + TimeSerial(15, 30, 45)
Debug.Print FormatHelper.FormatDateTime(d)
Debug.Print FormatHelper.FormatDateTimeISO(d)
Debug.Print FormatHelper.FormatTime(d)
' Output:
' 2026-01-04 15:30:45
' 2026-01-04T15:30:45
' 15:30:45
```
<!-- /test -->

### FormatPercent
{: .no_toc }

Formats a share as a percentage.

Syntax: **FormatHelper.FormatPercent** ( *value*, *total* [ , *decimals* ] ) **As String**

*value*
: *required* A **Double**, the part.

*total*
: *required* A **Double**, the whole.

*decimals*
: *optional* A **Long**, the number of digits after the decimal separator. Default: 0.

<!-- test: FormatHelperTests.FormatPercent_WritesTheShare -->
Returns *value* divided by *total*, times 100, and `%`. With *decimals* set to 0 the number is made with **CLng**, which rounds a .5 to the even number. When *total* is 0 the function returns `0%`, also when *decimals* is above 0.
<!-- /test -->

### FormatPercentValue
{: .no_toc }

Formats a number that is already a percentage.

Syntax: **FormatHelper.FormatPercentValue** ( *percent* [ , *decimals* ] ) **As String**

*percent*
: *required* A **Double**, a number from 0 to 100.

*decimals*
: *optional* A **Long**, the number of digits after the decimal separator. Default: 0.

<!-- test: FormatHelperTests.FormatPercentValue_RoundsLikeCLng -->
Returns *percent* and `%`, rounded in the same way as [**FormatPercent**](#formatpercent).
<!-- /test -->

```tb check_build check_run
Debug.Print FormatHelper.FormatPercent(1, 0, 1)
Debug.Print FormatHelper.FormatPercentValue(54.6)
Debug.Print FormatHelper.FormatPercentValue(2.5)
Debug.Print FormatHelper.FormatPercentValue(12.34, 1)
' Output:
' 0%
' 55%
' 2%
' 12.3%
```

### FormatTime
{: .no_toc }

Formats the time of a date.

Syntax: **FormatHelper.FormatTime** ( *dt* ) **As String**

*dt*
: *required* A **Date**.

Returns the form `hh:nn:ss` with a 24-hour clock, such as `15:30:45`.

### FormatUptime
{: .no_toc }

Formats a duration in milliseconds as days, hours, minutes and seconds.

Syntax: **FormatHelper.FormatUptime** ( *milliseconds* ) **As String**

*milliseconds*
: *required* A **LongLong**, the duration.

<!-- test: FormatHelperTests.FormatUptime_LeavesOutLeadingZeroParts -->
Returns the duration as `3d 12h 45m 32s`. The days are left out while they are 0, the hours while they and the days are 0, and the minutes while all three are 0. The seconds are always there. Parts of a second are dropped.
<!-- /test -->

```tb check_build check_run
Debug.Print FormatHelper.FormatUptime(0)
Debug.Print FormatHelper.FormatUptime(59999)
Debug.Print FormatHelper.FormatUptime(3600000)
Debug.Print FormatHelper.FormatUptime(302732000)
' Output:
' 0s
' 59s
' 1h 0m 0s
' 3d 12h 5m 32s
```

### PadLeft
{: .no_toc }

Pads text on the left, to a width.

Syntax: **FormatHelper.PadLeft** ( *text*, *width* [ , *padChar* ] ) **As String**

*text*
: *required* A **String**.

*width*
: *required* A **Long**, the length to reach.

*padChar*
: *optional* A **String**. Its first character repeats. Default: a space.

Returns *text* with characters added on the left until it is *width* characters long. Text that is already that long, or longer, is returned as it is.

### PadRight
{: .no_toc }

Pads text on the right, to a width.

Syntax: **FormatHelper.PadRight** ( *text*, *width* [ , *padChar* ] ) **As String**

The arguments are those of [**PadLeft**](#padleft). The characters are added on the right.

### Truncate
{: .no_toc }

Shortens text to a length.

Syntax: **FormatHelper.Truncate** ( *text*, *maxLength* [ , *ellipsis* ] ) **As String**

*text*
: *required* A **String**.

*maxLength*
: *required* A **Long**, the greatest length of the result.

*ellipsis*
: *optional* A **String** that marks the cut. Default: `...`.

<!-- test: FormatHelperTests.PadAndTruncate_FollowTheirDescriptions -->
Text of *maxLength* characters or fewer is returned as it is. A longer text is cut so that, with *ellipsis* at the end, it is *maxLength* characters long. When *maxLength* is not above the length of *ellipsis*, the result is the first *maxLength* characters of *ellipsis* alone.
<!-- /test -->

```tb check_build check_run
Debug.Print FormatHelper.PadRight("42", 5, ".")
Debug.Print FormatHelper.Truncate("abcdef", 3)
Debug.Print FormatHelper.Truncate("abcdef", 5, "~")
' Output:
' 42...
' ...
' abcd~
```

## See Also

- [Formatters](Formatters) -- use **EscapeJson**, **EscapeHtml** and the date formats
- [Collectors](Collectors) -- use **FormatBytes**, **FormatUptime** and the percentage formats
- [**Format**](../../../Modules/Strings/Format) function -- the function that makes the numbers and dates
