---
title: JsonValidationError
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonValidationError
has_toc: false
---

# JsonValidationError class
{: .no_toc }

A **JsonValidationError** describes one failure of a value against a schema: the place in the value, the place in the schema, the keyword that failed, and a message. [**JsonValidationResult.Errors**](JsonValidationResult#errors) returns them. The class is not related to [**JsonError**](JsonError), which reports the last error of a function.

```tb check_build check_run
Dim schema As Variant = Json.Parse("{""properties"":{""age"":{""type"":""integer"",""minimum"":0}}}")
Dim report As JsonValidationResult = Json.Validate(Json.Parse("{""age"":-5}"), schema)
Dim errs() As JsonValidationError = report.Errors()
Dim e As JsonValidationError = errs(0)
Debug.Print e.Keyword                                     ' minimum
Debug.Print e.InstancePointer                             ' /age
Debug.Print e.SchemaPointer                               ' /properties/age/minimum
Debug.Print e.Message                                     ' Number is below minimum.
Debug.Print e.ToString()                                  ' minimum /age - Number is below minimum.
```

* TOC
{:toc}

## Properties

### InstancePointer
{: .no_toc }

The place in the checked value. A **String**, read-only.

Syntax: *text* **=** *error***.InstancePointer**

Returns the RFC 6901 JSON Pointer of the value that failed. The empty string is the value itself. [**Json.PointerGet**](Json#pointerget) finds the value with it.

### Keyword
{: .no_toc }

The keyword that failed. A **String**, read-only.

Syntax: *text* **=** *error***.Keyword**

Returns the name of the keyword, such as `type`, `required` or `minimum`. Two failures have other names: `false`, for a schema that is **False**, and `$schema`, for a schema that is neither an object nor a Boolean. `depth` stands for evaluation that went deeper than [**MaxDepth**](JsonOptions#maxdepth).

### Message
{: .no_toc }

A description of the failure. A **String**, read-only.

Syntax: *text* **=** *error***.Message**

Returns the message in English. [Messages](#messages) lists them.

### SchemaPointer
{: .no_toc }

The place in the schema. A **String**, read-only.

Syntax: *text* **=** *error***.SchemaPointer**

Returns the path that the evaluation took to the keyword, written as a JSON Pointer, such as `/properties/age/minimum`. Where a `$ref` was followed, the path continues after `/$ref`, so it is a path of the evaluation, and not always a pointer into one document.

```tb check_build check_run
Dim sc As JsonSchema = Json.CompileSchema(Json.Parse("{""$ref"":""https://example.invalid/name#/$defs/short""}"))
sc.AddDocument "https://example.invalid/name", Json.Parse("{""$defs"":{""short"":{""type"":""string"",""maxLength"":3}}}")
Dim errs() As JsonValidationError = sc.Validate("abcd").Errors()
Debug.Print errs(0).SchemaPointer                         ' /$ref/maxLength
```

## Methods

### ToString
{: .no_toc }

Returns the failure as one line of text.

Syntax: *text* **=** *error***.ToString** ( ) **As String**

Returns the keyword, a space, the instance pointer (`/` for the value itself), a space, a hyphen, a space and the message, as in `minimum /age - Number is below minimum.`.

## Messages

These are the messages, by keyword. A message in quotes holds the name or the number that the failure concerns.

| Keyword | Message |
|:--------|:--------|
| `type` | *Type is not 'name'.* for one type name, *Type is not in the type list.* for a list |
| `const` | *Value does not equal const.* |
| `enum` | *Value is not in enum.* |
| `minLength` | *String is shorter than minLength.* |
| `maxLength` | *String is longer than maxLength.* |
| `pattern` | *String does not match pattern.* |
| `format` | *String does not match format 'name'.* |
| `minimum` | *Number is below minimum.* |
| `maximum` | *Number is above maximum.* |
| `exclusiveMinimum` | *Number is not above exclusiveMinimum.* |
| `exclusiveMaximum` | *Number is not below exclusiveMaximum.* |
| `multipleOf` | *Number is not a multiple of multipleOf.* |
| `minItems` | *Array is shorter than minItems.* |
| `maxItems` | *Array is longer than maxItems.* |
| `uniqueItems` | *Array items are not unique.* |
| `contains` | *Array does not contain enough matching items.* |
| `maxContains` | *Array contains too many matching items.* |
| `minProperties` | *Object has too few properties.* |
| `maxProperties` | *Object has too many properties.* |
| `required` | *Missing required property 'name'.* |
| `dependentRequired` | *Missing dependent property 'name'.* |
| `anyOf` | *Instance matches no anyOf schema.* |
| `oneOf` | *Instance matches N oneOf schemas.*, where N is the number of schemas that matched: 0, or more than 1 |
| `not` | *Instance matches the negated schema.* |
| `false` | *Schema is false.* |
| `$ref` | *Schema $ref is not in the local catalogue.* |
| `$schema` | *Schema is not an object.* |
| `depth` | *Maximum nesting depth exceeded.* |

A keyword that fails for a part of the value, such as `items` or `properties`, reports the failures of its subschema under their own keywords, with the pointer of the part.

## See Also

- [JsonValidationResult](JsonValidationResult) class -- holds the failures of one validation
- [JsonSchema](JsonSchema) class -- the keywords that are checked
- [JsonError](JsonError) class -- reports the last error of a function
- [tsJson Package](.) -- the package
