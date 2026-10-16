---
title: JsonOptions
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonOptions
has_toc: false
---

# JsonOptions class
{: .no_toc }

A **JsonOptions** object holds the options of one call to the package: the syntax that [**Json.Parse**](Json#parse) accepts, the layout that [**Json.Serialize**](Json#serialize) writes, the limits on input, and how a schema is checked. It is passed as the last argument of the functions that take options, and **Nothing** there means the defaults of [**Rfc**](#rfc).

An options object is created from a preset. The predeclared object **JsonOptions**, written without a variable, is a factory: its four properties [**Rfc**](#rfc), [**Jsonc**](#jsonc), [**Minified**](#minified) and [**Pretty**](#pretty) each return a new object with every property set, and [**Clone**](#clone) copies one.

```tb check_build check_run
Dim o As JsonOptions = JsonOptions.Minified
o.SortsKeys = True
Debug.Print Json.Serialize(Json.Map("b", 1, "a", 2), o)   ' {"a":2,"b":1}
Debug.Print o.Indent                                      ' -1
Debug.Print JsonOptions.Rfc.Indent                        ' 4
```

<!-- test: OptionsTests.Options_AreNotChangedByACall -->
A property of an options object checks nothing when it is set. The value is used by the call that receives the object, and a call does not change the object.
<!-- /test -->

<!-- test: OptionsTests.PredeclaredObject_Assignment_RaisesError5, OptionsTests.PredeclaredObject_Read_ReturnsTheEmptyValueOfTheType -->
> [!IMPORTANT] timeless
> Assigning a property on the predeclared object itself raises run-time error 5, *Invalid procedure call or argument*, with the source `JsonOptions` and the message *JsonOptions (default instance) is a factory. Use Rfc, Jsonc, Minified, or Pretty.* Create an options object first and assign the properties of that.
>
> ```tb check_build check_run
> On Error Resume Next
> JsonOptions.Indent = 2
> Debug.Print Err.Number         ' 5
> Debug.Print Err.Source         ' JsonOptions
> Debug.Print Err.Description    ' JsonOptions (default instance) is a factory. Use Rfc, Jsonc, Minified, or Pretty.
> ```
>
> Reading a property of the predeclared object does not raise an error. It returns the empty value of the type, 0, **False** or an empty string, and not the default of the property.
>
> ```tb check_build check_run
> Debug.Print JsonOptions.Indent & "|" & JsonOptions.MaxDepth & "|" & JsonOptions.EscapesSolidus & "|" & JsonOptions.Newline & "|" & JsonOptions.Syntax & "|" & JsonOptions.MaxBytes
> ' Output:
> ' 0|0|False||0|0
> ```
<!-- /test -->

<!-- test: OptionsTests.New_Object_HasTheEmptyValueOfEachProperty, OptionsTests.New_Object_WritesNoLineBreaksButASpaceAfterEachColon, OptionsTests.New_Object_HasNoLimits -->
> [!NOTE] BETA 1007
> The class declares a **Private** constructor and the attribute `[COMCreatable(False)]`, so that only its presets create options objects. twinBASIC does not enforce a **Private** constructor, and a project that references the package can still create an object with **New**. Every property of such an object has the empty value of its type: **Indent** 0, an empty **Newline**, **Syntax** **jsRfc8259**, and a limit of 0, which means no limit. The text it writes has no line breaks and no indentation, but still a space after each colon. The presets are the way to get the defaults.
>
> ```tb check_build check_run
> Dim jo As JsonOptions = New JsonOptions
> Debug.Print Json.Serialize(Json.Map("a", 1, "b", Json.Arr(1, 2)), jo)    ' {"a": 1,"b": [1,2]}
> jo.Indent = 2
> jo.Newline = vbLf
> Debug.Print Replace(Json.Serialize(Json.Map("a", 1), jo), vbLf, "|")     ' {|  "a": 1|}
> ```

* TOC
{:toc}

## Where each property is used

| Properties | Used by |
|:-----------|:--------|
| [**Syntax**](#syntax), [**DuplicateKeys**](#duplicatekeys), [**MaxDepth**](#maxdepth), [**MaxStringLength**](#maxstringlength), [**MaxArrayItems**](#maxarrayitems), [**MaxObjectMembers**](#maxobjectmembers) | The parse functions: [**Parse**](Json#parse), [**ParseFile**](Json#parsefile), [**ParseLines**](Json#parselines), [**ParseLinesFile**](Json#parselinesfile) and the `Try` versions. For the lines functions, each line is a document. |
| [**Encoding**](#encoding), [**MaxBytes**](#maxbytes) | The parse functions for bytes and files. [**MaxBytes**](#maxbytes) also limits a **String** passed to **Parse**, counted in UTF-8 bytes, but not the text of **ParseLines**. |
| [**Indent**](#indent), [**Newline**](#newline), [**SortsKeys**](#sortskeys), [**EscapesSolidus**](#escapessolidus), [**EnsuresAscii**](#ensuresascii) | The serialize functions: [**Serialize**](Json#serialize), [**SerializeToUtf8**](Json#serializetoutf8), [**WriteFile**](Json#writefile), [**SerializeLines**](Json#serializelines), [**WriteLinesFile**](Json#writelinesfile), and **Dump** of [**JsonObject**](JsonObject#dump) and [**JsonArray**](JsonArray#dump). **SerializeLines** ignores **Indent**. |
| [**MaxDepth**](#maxdepth) | Also [**Serialize**](Json#serialize) and the functions that call it, and the evaluation of a schema. |
| [**IncludesBom**](#includesbom) | [**SerializeToUtf8**](Json#serializetoutf8), [**WriteFile**](Json#writefile) and [**WriteLinesFile**](Json#writelinesfile). |
| [**IsFormatAssertion**](#isformatassertion) | [**Json.Validate**](Json#validate) and [**JsonSchema.Validate**](JsonSchema#validate). |

The options do not reach JSONPath. A path expression nests at most 1000 levels whatever **MaxDepth** is.

## Presets

### Rfc
{: .no_toc }

Returns a new options object with the defaults of RFC 8259.

Syntax: *options* **=** **JsonOptions.Rfc**

<!-- test: OptionsTests.Rfc_HasTheDocumentedValues, OptionsTests.Presets_HaveTheDocumentedDefaults -->
The object is independent of every other one, so it can be changed. These are its values:

| Property | Value |
|:---------|:------|
| [**Indent**](#indent) | 4 |
| [**Newline**](#newline) | `vbLf` |
| [**Syntax**](#syntax) | **jsRfc8259** |
| [**Encoding**](#encoding) | **jekAuto** |
| [**IncludesBom**](#includesbom) | **False** |
| [**DuplicateKeys**](#duplicatekeys) | **jdkError** |
| [**SortsKeys**](#sortskeys), [**EscapesSolidus**](#escapessolidus), [**EnsuresAscii**](#ensuresascii), [**IsFormatAssertion**](#isformatassertion) | **False** |
| [**MaxDepth**](#maxdepth) | 1000 |
| [**MaxBytes**](#maxbytes) | 16777216 (16 MiB) |
| [**MaxStringLength**](#maxstringlength) | 1048576 (1 MiB) |
| [**MaxArrayItems**](#maxarrayitems) | 1000000 |
| [**MaxObjectMembers**](#maxobjectmembers) | 1000000 |

<!-- /test -->

```tb check_build check_run
Dim o As JsonOptions = JsonOptions.Rfc
Debug.Print o.Indent & " " & o.MaxDepth & " " & o.MaxBytes     ' 4 1000 16777216
Debug.Print o Is JsonOptions.Rfc                               ' False
```

### Jsonc
{: .no_toc }

Returns a new options object that accepts JSONC.

Syntax: *options* **=** **JsonOptions.Jsonc**

<!-- test: OptionsTests.JsoncMinifiedAndPretty_DifferFromRfcInOneProperty -->
The same as [**Rfc**](#rfc), with [**Syntax**](#syntax) set to **jsJsonc**.
<!-- /test -->

### Minified
{: .no_toc }

Returns a new options object for compact output.

Syntax: *options* **=** **JsonOptions.Minified**

The same as [**Rfc**](#rfc), with [**Indent**](#indent) set to -1.

### Pretty
{: .no_toc }

Returns a new options object for pretty-printed output.

Syntax: *options* **=** **JsonOptions.Pretty**

The same as [**Rfc**](#rfc), which indents by 4 spaces.

### Clone
{: .no_toc }

Returns a copy of an options object.

Syntax: *options***.Clone** ( ) **As** [**JsonOptions**](JsonOptions)

<!-- test: OptionsTests.Clone_IsIndependentOfTheOriginal -->
The copy has the same values and is independent: a change to it does not change the original.
<!-- /test -->

```tb check_build check_run
Dim a As JsonOptions = JsonOptions.Rfc
a.Indent = 2
Dim b As JsonOptions = a.Clone()
b.Indent = 8
Debug.Print a.Indent                                      ' 2
Debug.Print b.Indent                                      ' 8
Debug.Print JsonOptions.Rfc.Indent                        ' 4
```

## Format properties

### EnsuresAscii
{: .no_toc }

Whether non-ASCII characters are written as escapes. A **Boolean**, **False** by default.

Syntax: *options***.EnsuresAscii** [ **=** *flag* ]

When **True**, [**Serialize**](Json#serialize) writes each UTF-16 code unit above U+007F as `\uxxxx` with lowercase hexadecimal digits, so a character outside the Basic Multilingual Plane becomes two escapes, a surrogate pair. The result contains only ASCII characters.

```tb check_build check_run
Dim o As JsonOptions = JsonOptions.Minified
o.EnsuresAscii = True
o.EscapesSolidus = True
Debug.Print Json.Serialize(ChrW$(233) & "a/b", o)         ' "\u00e9a\/b"
```

### EscapesSolidus
{: .no_toc }

Whether the solidus is written as an escape. A **Boolean**, **False** by default.

Syntax: *options***.EscapesSolidus** [ **=** *flag* ]

When **True**, [**Serialize**](Json#serialize) writes `/` as `\/`. Both spellings are valid JSON for the same character.

### Indent
{: .no_toc }

The indentation of pretty-printed output. A **Long**, 4 by default.

Syntax: *options***.Indent** [ **=** *spaces* ]

A value of 0 or more starts every member and element on a new line, indented by that many spaces for each level of nesting, and writes a space after each colon. A value of 0 has line breaks and no indentation. A value below 0, and -1 in [**Minified**](#minified), writes the text without white space.

```tb check_build check_run
Dim o As JsonOptions = JsonOptions.Pretty
o.Indent = 2
o.SortsKeys = True
Dim line As Variant
For Each line In Split(Json.Serialize(Json.Map("b", 1, "a", Json.Arr(True)), o), vbLf)
    Debug.Print line
Next
' Output:
' {
'   "a": [
'     true
'   ],
'   "b": 1
' }
```

### Newline
{: .no_toc }

The text that ends a line of pretty-printed output. A **String**, `vbLf` by default.

Syntax: *options***.Newline** [ **=** *text* ]

Any string can be used, such as `vbCrLf`. It is not used when [**Indent**](#indent) is below 0.

### SortsKeys
{: .no_toc }

Whether the keys of an object are written in sorted order. A **Boolean**, **False** by default.

Syntax: *options***.SortsKeys** [ **=** *flag* ]

When **True**, [**Serialize**](Json#serialize) writes the members of every object in the order of their keys, compared by UTF-16 code unit. The objects themselves keep their order.

## Parse properties

### DuplicateKeys
{: .no_toc }

What a repeated key in an object means. An [**eJsonDuplicateKeys**](#ejsonduplicatekeys) member, **jdkError** by default.

Syntax: *options***.DuplicateKeys** [ **=** *policy* ]

With **jdkError**, a repeated key is the error `DuplicateKey`. With **jdkLastWins**, the last value is kept, in the position of the first member with that key.

```tb check_build check_run
Dim text As String = "{""a"":1,""b"":2,""a"":3}"
Debug.Print IsEmpty(Json.Parse(text))                     ' True
Debug.Print JsonError.Code                                ' DuplicateKey

Dim o As JsonOptions = JsonOptions.Rfc
o.DuplicateKeys = jdkLastWins
Debug.Print Json.Serialize(Json.Parse(text, o), JsonOptions.Minified)   ' {"a":3,"b":2}
```

<!-- test: compile QualifiedEnumMember -->
The members of the three enumerations are written without a qualifier, as `jdkLastWins` is above; so are their names as types. The qualified form `JsonOptions.eJsonSyntax.jsJsonc` does not compile (TB5027, *Unrecognized member*).

```tb check_build check_run
Dim s As eJsonSyntax = jsJsonc
Dim t As eJsonType = jtArray
Dim e As eJsonEncodingKind = jekUtf16Be
Debug.Print s & " " & t & " " & e                         ' 1 5 3
```

```tb check_build expect-error=TB5027
Dim o As JsonOptions = JsonOptions.Rfc
o.Syntax = JsonOptions.eJsonSyntax.jsJsonc
```
<!-- /test -->

### Encoding
{: .no_toc }

The encoding of bytes and files that are parsed. An [**eJsonEncodingKind**](#ejsonencodingkind) member, **jekAuto** by default.

Syntax: *options***.Encoding** [ **=** *kind* ]

With **jekAuto**, a byte order mark selects UTF-8, UTF-16 little endian or UTF-16 big endian, and the encoding is UTF-8 without one. With another member, the bytes are decoded in that encoding, and a byte order mark of the same encoding at the start is skipped. The property does not affect a **String**, and it is not used when text is written, which is always UTF-8.

### Syntax
{: .no_toc }

The JSON dialect that is accepted. An [**eJsonSyntax**](#ejsonsyntax) member, **jsRfc8259** by default.

Syntax: *options***.Syntax** [ **=** *dialect* ]

**jsRfc8259** accepts only the JSON of RFC 8259. **jsJsonc** also accepts comments, from `//` to the end of the line and between `/*` and `*/`, wherever white space is allowed, and one comma after the last member of an object or the last element of an array. A comment that is not closed is the error `InvalidComment`. Parsing never keeps a comment.

```tb check_build check_run
Dim text As String = "{""a"": 1, // first" & vbLf & """b"": [1, 2,], /* last */ }"
Debug.Print IsEmpty(Json.Parse(text))                     ' True
Debug.Print JsonError.Code                                ' InvalidSyntax

Dim v As Variant = Json.Parse(text, JsonOptions.Jsonc)
Debug.Print Json.Serialize(v, JsonOptions.Minified)       ' {"a":1,"b":[1,2]}
```

## Output properties

### IncludesBom
{: .no_toc }

Whether UTF-8 output starts with a byte order mark. A **Boolean**, **False** by default.

Syntax: *options***.IncludesBom** [ **=** *flag* ]

When **True**, [**SerializeToUtf8**](Json#serializetoutf8), [**WriteFile**](Json#writefile) and [**WriteLinesFile**](Json#writelinesfile) put the bytes `EF BB BF` first. [**Serialize**](Json#serialize) writes a string and is not affected.

## Limits

<!-- test: OptionsTests.Limits_ZeroOrBelowMeansNoLimit, ParseTests.Parse_LimitsOnStringsArraysAndObjects_AreLimitExceeded, ParseTests.Parse_DepthBeyondMaxDepth_IsDepthLimitExceeded -->
A limit of 0 means that there is no limit, and so does a value below 0. A limit that is exceeded is the error `LimitExceeded`, except [**MaxDepth**](#maxdepth), which is `DepthLimitExceeded`.
<!-- /test -->

### MaxArrayItems
{: .no_toc }

The largest number of elements in an array that is parsed. A **Long**, 1000000 by default.

Syntax: *options***.MaxArrayItems** [ **=** *n* ]

### MaxBytes
{: .no_toc }

The largest size of the input that is parsed. A **Long**, 16777216 (16 MiB) by default.

Syntax: *options***.MaxBytes** [ **=** *n* ]

For a byte array it is the number of bytes. For a file it is the size of the file. For a **String** passed to [**Parse**](Json#parse) it is the number of bytes of its UTF-8 encoding. [**ParseLines**](Json#parselines) does not check it for its text.

### MaxDepth
{: .no_toc }

The deepest level of nesting. A **Long**, 1000 by default.

Syntax: *options***.MaxDepth** [ **=** *n* ]

The root value is at depth 0. A value inside a container is one level deeper than the container. A value deeper than **MaxDepth** is the error `DepthLimitExceeded`, for a scalar as for a container. The limit applies to parsing, to serializing, and to the evaluation of a schema, where each nested subschema and each `$ref` that is followed counts as a level.

```tb check_build check_run
Dim o As JsonOptions = JsonOptions.Rfc
o.MaxDepth = 2
Debug.Print IsEmpty(Json.Parse("[[1]]", o))               ' False
Debug.Print IsEmpty(Json.Parse("[[[1]]]", o))             ' True
Debug.Print JsonError.Code                                ' DepthLimitExceeded
```

### MaxObjectMembers
{: .no_toc }

The largest number of members in an object that is parsed. A **Long**, 1000000 by default.

Syntax: *options***.MaxObjectMembers** [ **=** *n* ]

### MaxStringLength
{: .no_toc }

The longest string that is parsed, in UTF-16 code units. A **Long**, 1048576 (1 MiB) by default.

Syntax: *options***.MaxStringLength** [ **=** *n* ]

The limit applies to the keys of objects as to the other strings. It is not applied when a value is written.

## Schema properties

### IsFormatAssertion
{: .no_toc }

Whether the `format` keyword of a schema is checked. A **Boolean**, **False** by default.

Syntax: *options***.IsFormatAssertion** [ **=** *flag* ]

By default `format` only annotates, as the schema specification asks: no value is rejected for its format. When **True**, a string that does not have the format named in the schema is a validation error. [**JsonSchema**](JsonSchema#formats) lists the formats that are checked.

## Enumerations

### eJsonDuplicateKeys
{: .no_toc }

What a repeated key in an object means. [**DuplicateKeys**](#duplicatekeys) takes one of these members.

| Member | Value | Meaning |
|:-------|------:|:--------|
| **jdkError** | 0 | A repeated key is the error `DuplicateKey`. |
| **jdkLastWins** | 1 | The last value is kept. |

### eJsonEncodingKind
{: .no_toc }

The encoding of bytes that are parsed. [**Encoding**](#encoding) takes one of these members.

| Member | Value | Meaning |
|:-------|------:|:--------|
| **jekAuto** | 0 | A byte order mark selects the encoding; otherwise UTF-8. |
| **jekUtf8** | 1 | UTF-8. |
| **jekUtf16Le** | 2 | UTF-16, little endian. |
| **jekUtf16Be** | 3 | UTF-16, big endian. |

### eJsonSyntax
{: .no_toc }

The JSON dialect that is parsed. [**Syntax**](#syntax) takes one of these members.

| Member | Value | Meaning |
|:-------|------:|:--------|
| **jsRfc8259** | 0 | JSON as RFC 8259 defines it. |
| **jsJsonc** | 1 | JSON with comments and a trailing comma. |

## See Also

- [Json](Json) module -- the functions that take options
- [JsonObject](JsonObject) and [JsonArray](JsonArray) classes -- **Dump** takes options
- [JsonSchema](JsonSchema) class -- **IsFormatAssertion** applies to it
- [tsJson Package](.) -- the package
