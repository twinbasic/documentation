---
title: File I/O
parent: Standard Library
nav_order: 2
---

# Encoding Options for File I/O

The `Open` statement supports Unicode through the use of a new `Encoding` keyword and variable, and allows you to specify a wide range of encoding options in addition to standard Unicode options.

## Usage Example

```tb
Open "C:\MyFile.txt" For Input Encoding utf_8 As #1
```

## Supported Encodings

See the [Text Encodings table](../../tB/Core/Open#text-encodings) on the **Open** statement reference page.
