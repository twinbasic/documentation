---
title: KeyValuePair
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/KeyValuePair
has_toc: false
---

# KeyValuePair class
{: .no_toc }

A **KeyValuePair** holds one key and one value. It is a generic class, **KeyValuePair(Of TKey, TValue)**. Every item of a diagnostic result is a `KeyValuePair(Of String, String)`: the key is the label of a line of the report, such as `Total Physical`, and the value is its text, such as `15.9 GB`.

```tb check_build check_run
Dim kv As New KeyValuePair(Of String, Long)
kv.Key = "answer"
kv.Value = 42
Debug.Print kv.ToString()

Dim item As KeyValuePair(Of String, String)
Set item = New KeyValuePair(Of String, String)("Host Name", "PC-01")
Debug.Print item.Key & " / " & item.Value
Debug.Print item.ToString()
' Output:
' [answer: 42]
' Host Name / PC-01
' [Host Name: PC-01]
```

* TOC
{:toc}

## Properties

### Key
{: .no_toc }

The key.

Syntax: *pair*.**Key** [ **=** *value* ]

A value of type *TKey*. For a pair made without arguments it is the default of the type: an empty string, 0 or **Nothing**.

### Value
{: .no_toc }

The value.

Syntax: *pair*.**Value** [ **=** *value* ]

A value of type *TValue*. For a pair made without arguments it is the default of the type: an empty string, 0 or **Nothing**.

## Methods

### New
{: .no_toc }

Creates a pair.

Syntax: **New** **KeyValuePair(Of TKey, TValue)** [ ( *key*, *value* ) ]

*key*
: *optional* The first value, for [**Key**](#key).

*value*
: *optional* The second value, for [**Value**](#value).

Both arguments are given together or not at all. Without them, the key and the value have the default of their types.

### ToString
{: .no_toc }

Returns the pair as text.

Syntax: *pair*.**ToString** **As String**

Returns `[`, the key, `: `, the value and `]`, each converted with **CStr**. The conversion raises an error for an object that cannot be converted to a string.

## See Also

- [DiagnosticResult](DiagnosticResult) class -- holds a list of pairs
- [Dictionary](Dictionary) class -- a collection of keys and values with look-up by key
