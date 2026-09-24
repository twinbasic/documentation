---
title: Literals
parent: Language Syntax
nav_order: 8
permalink: /Features/Language/Literals
---

# New Literals Notation

twinBASIC provides new options for writing numeric literals.

## Binary Literals

In addition to `&H` for hexadecimal literals and `&O` for octal notation, twinBASIC also provides `&B` for binary notation. For example, `Dim b As Long = &B010110` is valid syntax, and b = 22.

## Digit Grouping

The `&H`, `&O`, and `&B` literals can all be grouped using an underscore, for example, grouping a `Long` by it's constituent binary byte groups: `&B10110101_10100011_10000011_01101110`, or grouping a `LongLong` as two `Long` groups: `&H01234567_89ABCDEF`.

## Date Literals

Dates and times are written between number signs: `#2026-03-17#`, `#1:45 PM#`, `#3/17/2026 13:45:30#`. The forms the compiler accepts, and how it reads the month, day and year, are described under [Data Types → Date literals](../../Reference/Data-Types#date-literals).

## Example

```tb check_build
Dim flags  As Long     = &B1010                       ' 10 in decimal
Dim perms  As Long     = &O17                         ' 15 in decimal
Dim colour As Long     = &HFF                         ' 255 in decimal
Dim mask   As Long     = &B10110101_10100011          ' grouped binary bytes
Dim wide   As LongLong = &H01234567_89ABCDEF          ' grouped hex halves
```
