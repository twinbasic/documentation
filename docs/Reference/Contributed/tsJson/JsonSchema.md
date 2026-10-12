---
title: JsonSchema
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonSchema
has_toc: false
---

# JsonSchema class
{: .no_toc }

A **JsonSchema** is a compiled JSON Schema in the draft 2020-12 dialect, with a local catalogue of further schema documents that its `$ref` keywords can name. [**Json.CompileSchema**](Json#compileschema) creates one. [**Validate**](#validate) checks a value against it and returns a [**JsonValidationResult**](JsonValidationResult) that lists every failure. For a single check of one value, [**Json.Validate**](Json#validate) does the same without a catalogue.

```tb check_build check_run
Dim schema As JsonSchema = Json.CompileSchema(Json.Parse("{""$ref"":""https://example.invalid/name#/$defs/short""}"))
schema.AddDocument "https://example.invalid/name", Json.Parse("{""$defs"":{""short"":{""type"":""string"",""maxLength"":3}}}")
Debug.Print schema.Validate("abc").IsValid                ' True
Debug.Print schema.Validate("abcd").IsValid               ' False
Debug.Print schema.Validate("abcd").ToString()            ' maxLength / - String is longer than maxLength.
```

A failure of the value is not an error: it is on the result, and the last error is not set. The last error is set only when the schema cannot be used: a subschema that is neither an object nor a Boolean (`InvalidSchema`), a `$ref` that cannot be resolved (`RemoteRef`), or evaluation that goes deeper than [**MaxDepth**](JsonOptions#maxdepth) (`DepthLimitExceeded`). When that happens, the evaluation stops, so the result holds the failures found up to that point and the failure of the schema itself.

The package does not check the schema against the meta-schema, and the keyword `$schema` is ignored: every schema is evaluated as draft 2020-12. A keyword with a value of the wrong type, such as a `minimum` that is a string, is read as 0 or ignored, depending on the keyword, and for the keywords that read a number, a list or an object it sets the last error `WrongType` while the evaluation goes on: `Json.Validate(1, {"minimum": "x"})` is valid and leaves the last error `WrongType`. A subschema that is an array, such as the array form of `items` from older drafts, is the error `InvalidSchema`.

* TOC
{:toc}

## Keywords

These keywords are evaluated. Any other keyword, such as `title`, `description`, `default`, `examples`, `$schema`, `$comment`, `$defs`, `contentEncoding`, `$dynamicRef` or `$vocabulary`, is ignored. `$defs` is only a place for `$ref` to point to.

| Group | Keywords |
|:------|:---------|
| Reference | `$id`, `$ref`, `$anchor` |
| Any value | `type`, `enum`, `const` |
| Strings | `minLength`, `maxLength`, `pattern`, `format` |
| Numbers | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf` |
| Arrays | `minItems`, `maxItems`, `uniqueItems`, `prefixItems`, `items`, `contains`, `minContains`, `maxContains`, `unevaluatedItems` |
| Objects | `minProperties`, `maxProperties`, `required`, `dependentRequired`, `properties`, `patternProperties`, `additionalProperties`, `propertyNames`, `dependentSchemas`, `unevaluatedProperties` |
| Combination | `allOf`, `anyOf`, `oneOf`, `not`, `if`, `then`, `else` |

A schema is an object or a Boolean. **True** accepts every value. **False** rejects every value with a failure whose keyword is `false`. The keywords of a schema object are all applied, `$ref` included: a `$ref` is evaluated as an applicator next to its siblings, as draft 2020-12 says.

Points that decide what is accepted:

- **Types.** The `type` keyword takes one name or an array of names: `null`, `boolean`, `object`, `array`, `string`, `number` and `integer`. A number is an `integer` when it has no fractional part, whatever its written form is, so `1.0` is an integer.
- **Numbers** are compared exactly as **Decimal** values. `multipleOf` divides as a **Decimal**, so `0.3` is a multiple of `0.1`.
- **Lengths.** `minLength` and `maxLength` count UTF-16 code units, so a character outside the Basic Multilingual Plane counts as two, where the JSON Schema draft counts characters. A string of the one character U+1F600 fails `"maxLength": 1`.
- **Patterns.** `pattern` and `patternProperties` use the I-Regexp matcher of [**Json.IsSearchPattern**](Json#issearchpattern), and a pattern matches when it is found anywhere in the string. I-Regexp has no anchors: `^` and `$` are ordinary characters, so a pattern such as `^[a-z]+$` requires the characters `^` and `$` to be in the string, and there is no way to require that the whole string matches. The string `abc` fails the pattern `^[a-z]+$`, and the string `^abc$` passes it. The JSON Schema draft names ECMA-262 regular expressions for `pattern`, in which `^` and `$` are anchors, so a schema written for the usual regular expressions rejects valid strings here, with no error. A pattern that is not a valid I-Regexp never matches. The matcher has the defects that [Known problems](.#known-problems-in-version-10150) describes.
- **Uniqueness.** `uniqueItems` compares elements as [**Json.Equals**](Json#equals) does.
- **Unevaluated keywords.** `unevaluatedProperties` and `unevaluatedItems` apply to the members and elements that no other keyword has evaluated, including those evaluated through `$ref`, `allOf`, `anyOf` (the valid branches), `oneOf`, and `if` with `then` or `else`.
- **`contains`** needs at least one element that satisfies the subschema, unless `minContains` says otherwise, and `maxContains` limits the number of such elements. A `minContains` of 0 accepts an array without a match.
- **Reporting.** `anyOf` and `oneOf` report one failure each, and not the failures of their branches. `not` reports one failure when the subschema accepts the value.

```tb check_build check_run
Dim sch As Variant = Json.Parse("{""if"":{""properties"":{""kind"":{""const"":""car""}},""required"":[""kind""]},""then"":{""required"":[""wheels""]},""else"":{""required"":[""legs""]}}")
Debug.Print Json.Validate(Json.Parse("{""kind"":""car"",""wheels"":4}"), sch).IsValid        ' True
Debug.Print Json.Validate(Json.Parse("{""kind"":""car""}"), sch).ToString()                   ' required / - Missing required property 'wheels'.
Debug.Print Json.Validate(Json.Parse("{""kind"":""dog"",""legs"":4}"), sch).IsValid         ' True
```

```tb check_build check_run
Debug.Print Json.Validate(Json.Parse("0.3"), Json.Parse("{""multipleOf"":0.1}")).IsValid     ' True
Debug.Print Json.Validate(Json.Parse("1.0"), Json.Parse("{""type"":""integer""}")).IsValid  ' True
Debug.Print Json.Validate(Json.Parse("1.5"), Json.Parse("{""type"":""integer""}")).IsValid  ' False
```

The failures that a value can have, with the keyword and the message of each, are on the page of [**JsonValidationError**](JsonValidationError#messages).

## References and the catalogue

A `$ref` names another schema. The forms that are understood are:

| `$ref` | Refers to |
|:-------|:----------|
| `#` | The root of the current resource: the schema, or the subschema with the closest enclosing `$id`. |
| `#/$defs/name` | The place that a JSON Pointer names inside the current resource. |
| `#name` | The subschema with `"$anchor": "name"` inside the current resource. |
| `https://example.com/other` | The catalogue document registered under exactly that URI. |
| `https://example.com/other#/$defs/name`, `...#name` | A place or an anchor inside a catalogue document. |

A relative reference is resolved against the base URI, which is the `$id` of the closest enclosing resource: a reference that contains `://` is absolute, one that starts with `/` is taken as it is, and any other is added to the base URI after its last `/`. The reference is then looked up in the catalogue by its text, compared by character code.

There is no network access. A reference to a document that is neither the current resource nor in the catalogue is the error `RemoteRef`, as is a pointer or an anchor that cannot be found. The documents are added with [**AddDocument**](#adddocument), under the URI that `$ref` uses; the `$id` inside a document is not used as its catalogue key.

## Formats

The `format` keyword is an annotation that rejects nothing, unless [**IsFormatAssertion**](JsonOptions#isformatassertion) is **True** in the options passed to [**Json.CompileSchema**](Json#compileschema) or [**Json.Validate**](Json#validate). Then it applies to strings, with these checks:

| Format | A string is accepted when |
|:-------|:--------------------------|
| `date-time` | [**Json.ParseIso8601**](Json#parseiso8601) accepts it and it contains a `T`. A zone is optional. |
| `date` | It has exactly 10 characters and [**Json.ParseIso8601**](Json#parseiso8601) accepts it. |
| `email` | It contains `@`, and not as the first character. |
| `hostname` | It is not empty and has no space. |
| `ipv4` | The check is meant to accept four decimal numbers from 0 to 255, without leading zeros, separated by `.`. In version 1.0.15.0 it rejects almost every valid address (see below). |
| `uuid` | It has 36 characters, and the ninth is `-`. |
| `json-pointer` | It is empty or starts with `/`. |
| `regex`, `iregexp` | It is a valid I-Regexp. |
| `uri`, `uri-reference`, `iri`, `iri-reference`, `uri-template`, `time`, `duration`, `idn-email`, `idn-hostname`, `relative-json-pointer`, `ipv6` | It is not empty. |
| any other name | It is always accepted. |

Most of these checks are approximations of the formats they are named for. In particular, a `date-time` need not have a zone, which RFC 3339 requires: `2026-08-19T09:15:00` is accepted as a `date-time`, and `2026-08-19` is not. An `email` such as `a@` is accepted, and so is a `hostname` such as `-bad-`; a `json-pointer` such as `/a~2`, whose escape is invalid, is accepted too; and a `uri`, `time` or `ipv6` is accepted when it is not empty.

The `ipv4` check has a defect in version 1.0.15.0. It builds the number of each part in one variable that is not set back to 0 for the next part, because the code declares the variable inside a loop and twinBASIC, like VBA, keeps its value from one pass to the next. The parts run together as one number, so `1.2.3.4` is read as 1234, which is above 255. Only addresses whose digits make a number not above 255 when joined, such as `0.0.0.0`, `0.1.0.0` and `0.0.0.1`, are accepted; `1.2.3.4`, `10.0.0.1`, `192.168.1.1` and `255.255.255.255` are rejected, although they are valid. The check is silent: the validation fails with the keyword `format`, as for a wrong address.

```tb check_build check_run
Dim sch As Variant = Json.Parse("{""type"":""string"",""format"":""date""}")
Dim o As JsonOptions = JsonOptions.Rfc
o.IsFormatAssertion = True
Debug.Print Json.Validate("2026-08-19", sch, o).IsValid   ' True
Debug.Print Json.Validate("19.08.2026", sch, o).IsValid   ' False
Debug.Print Json.Validate("19.08.2026", sch).IsValid      ' True

Dim dt As Variant = Json.Parse("{""format"":""date-time""}")
Debug.Print Json.Validate("2026-08-19T09:15:00", dt, o).IsValid        ' True
Debug.Print Json.Validate("2026-08-19T09:15:00+01:00", dt, o).IsValid  ' True
Debug.Print Json.Validate("2026-08-19", dt, o).IsValid                 ' False

Dim ip As Variant = Json.Parse("{""format"":""ipv4""}")
Debug.Print Json.Validate("0.0.0.0", ip, o).IsValid                    ' True
Debug.Print Json.Validate("1.2.3.4", ip, o).IsValid                    ' False
Debug.Print Json.Validate("192.168.1.1", ip, o).IsValid                ' False
Debug.Print Json.Validate("256.1.1.1", ip, o).IsValid                  ' False
```

## Where the package departs from JSON Schema 2020-12

- **`pattern` and `patternProperties` use I-Regexp**, not the ECMA-262 regular expressions that the draft names. There are no anchors, and the matcher has the defects of [Known problems](.#known-problems-in-version-10150).
- **`minLength` and `maxLength` count UTF-16 code units**, not characters.
- **`format` is checked loosely**, as the table above shows, and `ipv4` is wrong for nearly every address.
- **Some keywords are not evaluated**: `$dynamicRef`, `$dynamicAnchor`, `$vocabulary`, and the `content` keywords. The schema is not checked against the meta-schema, and `$schema` does not select a dialect.
- **A `$ref` is resolved against the schema and the catalogue only.** A relative reference is resolved by a simple rule, and the `$id` of a catalogue document is not its key.
- **An unusable schema stops the evaluation**, and the result holds the failures found up to that point.

The keywords for types, numbers, arrays, objects, combination and the unevaluated keywords follow the draft.

```tb check_build check_run
Dim anchored As Variant = Json.Parse("{""pattern"":""^[a-z]+$""}")
Debug.Print Json.Validate("abc", anchored).IsValid        ' False
Debug.Print Json.Validate("^abc$", anchored).IsValid      ' True
Dim oneChar As Variant = Json.Parse("{""maxLength"":1}")
Debug.Print Json.Validate(ChrW(&HD83D) & ChrW(&HDE00), oneChar).IsValid   ' False
JsonError.Clear
Debug.Print Json.Validate(1, Json.Parse("{""minimum"":""x""}")).IsValid   ' True
Debug.Print JsonError.Code                                ' WrongType
```

## Methods

### AddDocument
{: .no_toc }

Registers a schema document in the catalogue.

Syntax: *schema***.AddDocument** ( *uri*, *document* )

*uri*
: *required* A **String**, the key of the document. It is compared by character code. An empty string is the error `InvalidSchema`, and nothing is added.

*document*
: *required* The schema document: a [**JsonObject**](JsonObject) or a **Boolean**. A copy is stored, so a later change to the original does not change the catalogue.

A document that is registered under a URI that is already in the catalogue replaces it. The documents can be added at any time before [**Validate**](#validate) reaches the `$ref` that needs them.

### Validate
{: .no_toc }

Checks a value against the schema.

Syntax: *schema***.Validate** ( *instance* ) **As** [**JsonValidationResult**](JsonValidationResult)

*instance*
: *required* The value to check.

Returns the result, which is never **Nothing**. It lists every failure of the value, in the order the keywords are evaluated. The options that [**Json.CompileSchema**](Json#compileschema) was given apply to every call. The call clears the last error when it starts, and sets it only for a schema that cannot be used, as described above.

## See Also

- [Json](Json#json-schema) module -- **Validate** and **CompileSchema**
- [JsonValidationResult](JsonValidationResult) class -- the result of **Validate**
- [JsonValidationError](JsonValidationError) class -- one failure
- [JsonOptions](JsonOptions) class -- **IsFormatAssertion** and **MaxDepth**
- [tsJson Package](.) -- the package
