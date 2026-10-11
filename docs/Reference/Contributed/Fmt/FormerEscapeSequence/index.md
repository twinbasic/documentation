---
title: FormerEscapeSequence
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/FormerEscapeSequence/
has_toc: false
---

# FormerEscapeSequence class
{: .no_toc }

Holds a piece of text and its replacement, in the form of the earlier escape sequence class of the package.

**FormerEscapeSequence** has two properties, [**EscapeString**](EscapeString) and [**ReplacementString**](ReplacementString), and a [**Create**](Create) method that returns a new instance. It has no method that applies the sequence to a string and cannot describe an ASCII escape. Nothing in the package uses it: [**FormerStringFormat**](../FormerEntryPoint/FormerStringFormat) creates [**EscapeSequence**](../EscapeSequence/) objects.

Unlike **EscapeSequence**, the class is not predeclared, so an instance is created with `New`, and **Create** is called on that instance. The two property setters are declared **Friend**, and a project that references the package can call them as well (checked on BETA 1005).

```tb check_build check_run
Dim blank As New FormerEscapeSequence

Dim esc As FormerEscapeSequence
Set esc = blank.Create("\z", "ZZ")
Debug.Print esc.EscapeString & " " & esc.ReplacementString  ' \z ZZ
```

## Properties

- [EscapeString](EscapeString) -- returns or sets the text to look for
- [ReplacementString](ReplacementString) -- returns or sets the replacement text

## Methods

- [Create](Create) -- creates an escape sequence

## See Also

- [EscapeSequence](../EscapeSequence/) class -- the escape sequence class that the package uses
- [FormerStringFormat](../FormerEntryPoint/FormerStringFormat) function -- the older formatter
- [Fmt package](../) -- overview
