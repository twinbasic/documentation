---
title: Like
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Like
vba_attribution: true
---
# Like operator
{: .no_toc }

Used to compare a string against a wildcard pattern.

Syntax:
> *result* **=** *string* **Like** *pattern*

*result*
: Any numeric variable.

*string*
: Any string expression.

*pattern*
: Any string expression conforming to the pattern-matching conventions described below.

If *string* matches *pattern*, *result* is **True**; if there is no match, *result* is **False**. If either *string* or *pattern* is **Null**, *result* is **Null**.

The behavior of the **Like** operator depends on the [**Option Compare**](Option) statement. The default for each module is **Option Compare Binary**, which compares characters by their internal binary representation (case-sensitive, ordinal). **Option Compare Text** performs a case-insensitive, locale-sensitive comparison.

For example, under **Option Compare Binary** a typical sort order is:

`A < B < E < Z < a < b < e < z < À < Ê < Ø < à < ê < ø`

Under **Option Compare Text** the same characters compare equal up to case and accent:

`(A=a) < (À=à) < (B=b) < (E=e) < (Ê=ê) < (Z=z) < (Ø=ø)`

The pattern-matching syntax supports wildcards, character lists, and character ranges. The following characters in *pattern* have special meaning:

| In *pattern*       | Matches in *string*                                  |
|:-------------------|:-----------------------------------------------------|
| `?`                | Any single character.                                |
| `*`                | Zero or more characters.                             |
| `#`                | Any single digit (`0`–`9`).                          |
| `[`*charlist*`]`   | Any single character in *charlist*.                  |
| `[!`*charlist*`]`  | Any single character *not* in *charlist*.            |

A group of one or more characters (*charlist*) enclosed in brackets can match any single character in *string* and may include almost any character code, including digits.

> [!NOTE]
> To match the special characters left bracket (`[`), question mark (`?`), number sign (`#`), or asterisk (`*`), enclose them in brackets. The right bracket (`]`) cannot be used inside a group to match itself, but it can be used outside a group as a literal character.

A hyphen (`-`) inside *charlist* separates the upper and lower bounds of a character range — for example, `[A-Z]` matches any uppercase letter. Multiple ranges are placed adjacently inside the same brackets, with no delimiter.

The meaning of a range depends on the active **Option Compare** mode and the system locale. Under **Option Compare Binary** the range `[A-E]` matches `A`, `B`, `E`; under **Option Compare Text** it matches `A`, `a`, `À`, `à`, `B`, `b`, `E`, `e` (but not `Ê`/`ê`, which sort after the basic letters).

Other rules:

- An exclamation point (`!`) at the beginning of *charlist* negates the class. Outside brackets, `!` matches itself.
- A hyphen (`-`) at the start (after `!`, if present) or end of *charlist* matches itself; elsewhere it identifies a range.
- Ranges must be specified low-to-high: `[A-Z]` is valid; `[Z-A]` is not.
- The character sequence `[]` is treated as a zero-length string.

In some languages a single character represents two graphemes (e.g. `æ` for `a`+`e`). When the system locale specifies such a language, **Like** treats the single character and the equivalent 2-character sequence as interchangeable, both as `*string*` and inside a *charlist*.

### Example

```tb
Dim MyCheck
MyCheck = "aBBBa" Like "a*a"              ' Returns True.
MyCheck = "F" Like "[A-Z]"                ' Returns True.
MyCheck = "F" Like "[!A-Z]"               ' Returns False.
MyCheck = "a2a" Like "a#a"                ' Returns True.
MyCheck = "aM5b" Like "a[L-P]#[!c-e]"     ' Returns True.
MyCheck = "BAT123khg" Like "B?T*"         ' Returns True.
MyCheck = "CAT123khg" Like "B?T*"         ' Returns False.
MyCheck = "ab" Like "a*b"                 ' Returns True.
MyCheck = "a*b" Like "a[*]b"              ' Returns True (literal asterisk).
MyCheck = "axxxxxb" Like "a[*]b"          ' Returns False.
MyCheck = "a[xyz" Like "a[[]*"            ' Returns True.
```

### See Also

- [Comparison operators](Comparison-Operators)
- [**Option** statement](Option)
- [**InStr** function](../Modules/Strings/InStr)
- [Operators](../../Reference/Operators)
