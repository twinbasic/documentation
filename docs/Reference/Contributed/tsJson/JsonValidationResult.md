---
title: JsonValidationResult
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonValidationResult
has_toc: false
---

# JsonValidationResult class
{: .no_toc }

A **JsonValidationResult** is the report of a schema validation: whether the value satisfied the schema, and if it did not, the list of failures. [**Json.Validate**](Json#validate) and [**JsonSchema.Validate**](JsonSchema#validate) return one, never **Nothing**. A failure of the value is only on the result; it does not set the last error of [**JsonError**](JsonError).

```tb check_build check_run
Dim schema As Variant = Json.Parse("{""type"":""object"",""required"":[""id"",""tags""],""properties"":{""id"":{""type"":""integer"",""minimum"":1},""tags"":{""type"":""array"",""items"":{""type"":""string""},""uniqueItems"":true}},""additionalProperties"":false}")
Dim inst As Variant = Json.Parse("{""id"":0,""tags"":[""a"",1,""a""],""extra"":true}")
Dim report As JsonValidationResult = Json.Validate(inst, schema)
Debug.Print report.IsValid
Debug.Print report.ErrorCount

Dim line As Variant
For Each line In Split(report.ToString(), vbLf)
    Debug.Print line
Next
' Output:
' False
' 4
' minimum /id - Number is below minimum.
' uniqueItems /tags - Array items are not unique.
' type /tags/1 - Type is not 'string'.
' false /extra - Schema is false.
```

* TOC
{:toc}

## Properties

### ErrorCount
{: .no_toc }

The number of failures. A **Long**, read-only.

Syntax: *n* **=** *result***.ErrorCount**

### IsValid
{: .no_toc }

Whether the value satisfied the schema. A **Boolean**, read-only.

Syntax: *flag* **=** *result***.IsValid**

Returns **True** when [**ErrorCount**](#errorcount) is 0.

## Methods

### Errors
{: .no_toc }

Returns the failures.

Syntax: *result***.Errors** ( ) **As** [**JsonValidationError**](JsonValidationError)**()**

Returns an array of [**JsonValidationError**](JsonValidationError) objects, in the order the failures were found, with a lower bound of 0. The array is unbound when the value is valid, so check [**IsValid**](#isvalid) or [**ErrorCount**](#errorcount) first.

```tb check_build check_run
Dim report As JsonValidationResult = Json.Validate(Json.Parse("[1,""x""]"), Json.Parse("{""items"":{""type"":""number""}}"))
Dim errs() As JsonValidationError = report.Errors()
Debug.Print UBound(errs) - LBound(errs) + 1               ' 1
Debug.Print errs(0).Keyword                               ' type
Debug.Print errs(0).InstancePointer                       ' /1
Debug.Print errs(0).SchemaPointer                         ' /items/type
Debug.Print errs(0).Message                               ' Type is not 'number'.
```

### ToString
{: .no_toc }

Returns the report as text.

Syntax: *text* **=** *result***.ToString** ( ) **As String**

Returns `valid` when there is no failure. Otherwise returns one line for each failure, separated by a line feed (`vbLf`), each line as [**JsonValidationError.ToString**](JsonValidationError#tostring) writes it.

## See Also

- [JsonValidationError](JsonValidationError) class -- one failure
- [JsonSchema](JsonSchema) class -- validates a value against a compiled schema
- [Json](Json#validate) module -- **Validate** for a single check
- [tsJson Package](.) -- the package
