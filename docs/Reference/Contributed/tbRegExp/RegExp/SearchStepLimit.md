---
title: SearchStepLimit
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/SearchStepLimit
has_toc: false
---

# SearchStepLimit
{: .no_toc }

Returns or sets the number of steps a search of this object may take before it gives up.

Syntax: *object*.**SearchStepLimit** [= *steps*]

*object*
: *required* An object expression that evaluates to a **RegExp**.

*steps*
: *optional* A **Long**, the budget for one search, or 0 for the budget the package works out on its own. A negative value raises error 5.

Returns a **Long**: the value that was set, or 0 when the budget is left to the package. The default is 0.

## Remarks

A search is given a budget of steps, where a step is one operation of the compiled pattern. A pattern that backtracks without end, such as `(a+)+b` on a string of thirty `a`, needs twice as many steps for each `a` it is given, and the budget is what stops it. VBScript's **RegExp** has no such limit and for that string does not return in any reasonable time.

When the budget runs out, [**Test**](Test), [**Execute**](Execute), [**Replace**](Replace) and [**Split**](Split) raise `vbObjectError + 3016` and return nothing at all -- not even the matches found before the search stopped. A search that ran out of steps never established what the rest of the string holds, so a short result is a wrong answer rather than an incomplete one, and the error is the only honest report. The description names the budget that was spent, the length of the string, and what to do about it.

<!-- test: SearchFinishesTests.Search_DigitsWithoutXFinishAt2000, SearchFinishesTests.Search_DigitsWithoutXFinishAt5000 -->
With the property left at 0, the budget is ten steps for each character of the string squared, at least 1,000,000 and at most 100,000,000. It is worked out for the search of one match, so with [**Global**](Global) set to **True** each match is given a budget of its own and the first search that runs out ends the call. The square matters: an ordinary pattern that backtracks, such as `\d+x` on a string of digits with no `x`, costs about two and a quarter steps for each character squared, so it finishes at any length a search is likely to be given. A simple pattern needs about three steps for each character it matches, so a long match is never affected: `a*` on a string of 1,000,000 `a` returns all of it in about half a second.
<!-- /test -->

Set the property when a pattern of that kind is given a string long enough to reach the cap. The message of the error suggests a value. Nothing covers a pattern whose cost grows faster than the square of the string, and when the budget already exceeded what a pattern of that kind would need, the message says to simplify the pattern instead of naming this property.

The value that **SearchStepLimit** returns is the one that was set, not the budget a search would be given: with the property at 0 there is no single number to return, because the budget depends on the string. Setting it does not compile the pattern again.

## Example

This example searches a string of thirty `a` for `(a+)+b`, which cannot match and takes a very long time to prove it. The search gives up after about a third of a second and raises. The same pattern against a string it can match finishes.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(a+)+b"

On Error Resume Next
re.Test String(30, "a")
Debug.Print Err.Number - vbObjectError     ' 3016
On Error GoTo 0
Err.Clear

Debug.Print re.Test("aaab")                ' True
```

<!-- test: SearchGivesUpTests.SearchStepLimit_RaisesTheCeiling -->
This example gives a search too few steps on purpose, then raises the limit so that the same search finishes. `\d+x` on a string of 1,000 digits with no `x` costs about 2,250,000 steps.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "\d+x"
Debug.Print re.SearchStepLimit     ' 0

re.SearchStepLimit = 100000
On Error Resume Next
re.Test String(1000, "1")
Debug.Print Err.Number - vbObjectError  ' 3016
On Error GoTo 0
Err.Clear

re.SearchStepLimit = 3000000
Debug.Print re.Test(String(1000, "1"))  ' False
Debug.Print re.SearchStepLimit          ' 3000000
```
<!-- /test -->

## See Also

- [Test](Test) method -- returns whether a string contains a match
- [Execute](Execute) method -- returns the matches
- [Replace](Replace) method -- replaces the matches
- [Split](Split) method -- splits a string at the matches
- [RegExp](./) class -- overview
