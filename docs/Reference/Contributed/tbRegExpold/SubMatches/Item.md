---
title: Item
parent: SubMatches
grand_parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/SubMatches/Item
has_toc: false
---

# Item
{: .no_toc }

Returns the string captured by one capture group, by its position or by its name.

Syntax: *object*.**Item** ( *pItemIndex* )

*object*
: *required* An object expression that evaluates to a **SubMatches**.

*pItemIndex*
: *required* A **Variant**. A number is the zero-based position of the group: the first group is 0 and the last is [**Count**](Count) - 1. A value that is not numeric is the name of a group.

Returns a **String**. The property is read-only.

## Remarks

**Item** is the default member of the class, so `sm(0)` is the same as `sm.Item(0)`.

*pItemIndex* is taken as a position when **IsNumeric** returns **True** for it, and as a name otherwise.

A position below 0, or not below [**Count**](Count), raises run-time error `vbObjectError + 9` with the message *Requested item not found in SubMatches collection*.

A name is the one given to a group in the pattern, written `(?<name>...)`. **Item** returns the string of the group that has that name. Letter case counts: `sm("YEAR")` does not find a group named `year`. A name that no group has returns an empty string and raises no error. A name starts with a letter or an underscore and goes on with letters, digits and underscores.

When several groups have the same name, **Item** returns the string of the last of them that took part in the match, as the last example shows.

An empty result has three possible causes: a group that took no part in the match, a group that captured no characters, and a name that no group has.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(?<year>\d{4})-(?<month>\d{2})"

Dim matches As MatchCollection
Set matches = re.Execute("2026-10")

Dim sm As SubMatches
Set sm = matches(0).SubMatches
Debug.Print sm(0)             ' 2026
Debug.Print sm.Item("month")  ' 10
Debug.Print Len(sm("day"))    ' 0
```

This example asks for a position that the collection does not have.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(\d+)"

Dim matches As MatchCollection
Set matches = re.Execute("a1")

Dim sm As SubMatches
Set sm = matches(0).SubMatches

On Error Resume Next
Debug.Print sm(1)
Debug.Print Err.Number & ": " & Err.Description  ' -2147221495: Requested item not found in SubMatches collection
```

This example gives two groups the same name. In `ab` both groups took part, so the second one is returned. In `a` only the first group did.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(?<n>a)(?<n>b)?"

Debug.Print re.Execute("ab")(0).SubMatches("n")  ' b
Debug.Print re.Execute("a")(0).SubMatches("n")   ' a
```

## See Also

- [Count](Count) property -- the number of strings
- [NewEnum](NewEnum) method -- the enumerator for **For Each**
- [SubMatches](./) class -- overview
