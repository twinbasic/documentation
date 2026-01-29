---
title: Literals
parent: Language Syntax
nav_order: 8
---

# New Literals Notation

twinBASIC provides new options for writing numeric literals.

## Binary Literals

In addition to `&H` for hexadecimal literals and `&O` for octal notation, twinBASIC also provides `&B` for binary notation. For example, `Dim b As Long = &B010110` is valid syntax, and b = 22.

## Digit Grouping

The `&H`, `&O`, and `&B` literals can all be grouped using an underscore, for example, grouping a `Long` by it's constituent binary byte groups: `&B10110101_10100011_10000011_01101110`, or grouping a `LongLong` as two `Long` groups: `&H01234567_89ABCDEF`.
