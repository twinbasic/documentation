---
title: SearchAborted
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/SearchAborted
has_toc: false
---

# SearchAborted
{: .no_toc }

Returns whether the last search of this object gave up before it finished.

Syntax: *object*.**SearchAborted**

*object*
: *required* An object expression that evaluates to a **RegExp**.

Returns a **Boolean**: **True** when the most recent call of [**Test**](Test), [**Execute**](Execute), [**Replace**](Replace) or [**Split**](Split) on *object* stopped because its search ran out of steps, **False** otherwise. The property is read-only. It is **False** for an object that has not searched yet.

## Remarks

A search is given a budget of steps, where a step is one operation of the compiled pattern. A pattern that backtracks without end, such as `(a+)+b` on a string of thirty `a`, needs twice as many steps for each `a` it is given, and the budget is what stops it. VBScript's **RegExp** has no such limit and for that string does not return in any reasonable time.

When the budget runs out, the search stops and nothing is raised. Whatever was found before is returned, and the result can be short or empty: [**Test**](Test) returns **False**, [**Execute**](Execute) returns the matches found before the search stopped, [**Replace**](Replace) returns *sourceString* with only those matches replaced, and [**Split**](Split) splits only at them. A program that cannot tell this from a string without a match reads **SearchAborted** after the call.

The budget is 5,000 steps for each character of the string, at least 1,000,000 and at most 50,000,000. It is not a property of the object, and a program cannot change it. It applies to the search for one match, so with [**Global**](Global) set to **True** each match has a budget of its own, and the first search that runs out ends the call. A simple pattern needs about three steps for each character it matches, so a long match is not affected: `a*` on a string of 1,000,000 `a` returns all of it in about half a second.

Each call of **Test**, **Execute**, **Replace** or **Split** sets the value again: a call that finishes its search sets it to **False**, and so does a call that raises an error because the pattern is not valid, because no search was made. The value belongs to the object. A search on another **RegExp** does not change it, and a new object returns **False**.

> [!NOTE]
> A pattern that is not catastrophic can also run out of steps, if it tries again from each start position and the string is long. `\d+x` on a string of 5,000 digits and no `x` takes about 5 seconds and then gives up, with the same result as for a string that has no match, and **SearchAborted** returns **True**. A string of 2,000 digits finishes in about 2 seconds and returns **False**.

## Example

This example searches a string of thirty `a` for `(a+)+b`, which cannot match and takes a very long time to prove it. The search gives up after about a fifth of a second, and **SearchAborted** says that the **False** from **Test** is not an answer. A search of a string that has no `b`, where the pattern is not catastrophic, finishes.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(a+)+b"
Debug.Print re.SearchAborted               ' False

Debug.Print re.Test(String(30, "a"))       ' False
Debug.Print re.SearchAborted               ' True

Debug.Print re.Test("aaab")                ' True
Debug.Print re.SearchAborted               ' False

re.Pattern = "a+b"
Debug.Print re.Test(String(30, "a"))       ' False
Debug.Print re.SearchAborted               ' False
```

This example shows that the value is per object, and that a search which gave up still returns the matches found before it.

```tb check_build check_run
Dim re As New RegExp
Dim other As New RegExp
re.Pattern = "x|(a+)+b"
re.Global = True
other.Pattern = "a"

Dim matches As MatchCollection
Set matches = re.Execute("xx" & String(30, "a"))
Debug.Print matches.Count            ' 2
Debug.Print re.SearchAborted         ' True

Debug.Print other.Test("a")          ' True
Debug.Print other.SearchAborted      ' False
Debug.Print re.SearchAborted         ' True
```

## See Also

- [Test](Test) method -- returns whether a string contains a match
- [Execute](Execute) method -- returns the matches
- [Replace](Replace) method -- replaces the matches
- [Split](Split) method -- splits a string at the matches
- [RegExp](./) class -- overview
