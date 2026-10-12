---
title: tsJson Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - JsonBuf
  - JsonEncoding
  - JsonErrorStore
  - JsonIRegexp
  - JsonIo
  - JsonIso8601
  - JsonLexer
  - JsonLimits
  - JsonParser
  - JsonPatch
  - JsonPath
  - JsonPathNode
  - JsonPointer
  - JsonReNode
  - JsonSchemaEngine
  - JsonSerializer
  - JsonText
  - JsonUnicodeCats
  - JsonValues
  - Tests
  - TestsCore
  - TestsDates
  - TestsExtNst
  - TestsExtNstData
  - TestsIo
  - TestsParse
  - TestsPatch
  - TestsPath
  - TestsPointer
  - TestsRegexp
  - TestsSchema
  - TestsSerialize
  - TestsSmoke
  - TestsTour
indexed_from: 1.0.15.0
permalink: /tB/Packages/Contributed/tsJson/
---

# tsJson Package
{: .no_toc }

**Author:** thosti.

The **tsJson** contributed package reads, builds and writes JSON, finds values in a document with JSON Pointer and JSONPath, changes documents with JSON Patch and JSON Merge Patch, validates them against a JSON Schema, and converts ISO 8601 dates. The package describes itself as "Parse, query, patch, validate - one JSON model." This section documents version 1.0.15.0, published under the MIT licence.

All of it works on one model: a JSON object is a [**JsonObject**](JsonObject), a JSON array is a [**JsonArray**](JsonArray), and the other JSON values are plain **Variant** values. The [**Json**](Json) module is the entry point, with a function for each task. [**JsonOptions**](JsonOptions) holds the options of a call, and [**JsonError**](JsonError) reports what went wrong.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""store"":{""book"":[{""title"":""A"",""price"":8.95},{""title"":""B"",""price"":12.99}]}}")
If JsonError.HasError Then
    Debug.Print JsonError.ToString()
Else
    Debug.Print Json.QueryOne(doc, "$.store.book[?@.price < 10].title")         ' A
    Debug.Print Json.PointerGet(doc, "/store/book/1/title")                      ' B

    Dim cheaper As Variant = Json.PointerSet(doc, "/store/book/1/price", 9.5)
    Debug.Print Json.Serialize(Json.Diff(doc, cheaper), JsonOptions.Minified)    ' [{"op":"replace","path":"/store/book/1/price","value":9.5}]

    Dim report As JsonValidationResult = Json.Validate(doc, Json.Parse("{""type"":""array""}"))
    Debug.Print report.ToString()                                                ' type / - Type is not 'array'.
End If
```

## The JSON model

A value of JSON has these counterparts in twinBASIC. A function that reads JSON creates them, and a function that writes JSON accepts them.

| JSON | In twinBASIC | Notes |
|:-----|:-------------|:------|
| object | [**JsonObject**](JsonObject) | Members in the order they were added. Keys are compared by character code, so `a` and `A` are different keys. |
| array | [**JsonArray**](JsonArray) | Elements numbered from 0. |
| string | **String** | |
| number | **Decimal** when read; any numeric type when written | A **Decimal** keeps every digit. The package rejects a number outside the range of **Decimal** (see [Parse](Json#parse)). |
| `true`, `false` | **Boolean** | |
| `null` | **Null** | Not **Empty** and not **Nothing**. |

A **Date** is not a JSON value. [**Json.Serialize**](Json#serialize) writes one as an ISO 8601 string in local time, and [**Json.Parse**](Json#parse) never creates one: a string that holds a date stays a string until [**Json.ParseIso8601**](Json#parseiso8601) converts it. **Empty**, **Nothing**, and any object that is not a **JsonObject** or a **JsonArray**, are not JSON values either, and [**Json.Serialize**](Json#serialize) refuses them with the error `UnsupportedType`. [**Json.TypeOfValue**](Json#typeofvalue) classifies a value.

A value that is read from a document is the object or array inside it, not a copy. Changing it changes the document. [**Json.Clone**](Json#clone) makes a deep copy, and the functions that return a changed document ([**PointerSet**](Json#pointerset), [**PointerRemove**](Json#pointerremove), [**Patch**](Json#patch), [**MergePatch**](Json#mergepatch)) work on a copy and leave their argument as it was.

Where a function returns a list, the array is unbound when the list is empty, and `UBound` raises run-time error 9 for it. This applies to [**Json.Query**](Json#query), [**Json.QueryHits**](Json#queryhits), [**JsonObject.Keys**](JsonObject#keys), [**JsonObject.Items**](JsonObject#items), [**JsonArray.ToVariantArray**](JsonArray#tovariantarray) and [**JsonValidationResult.Errors**](JsonValidationResult#errors). [**Json.Serialize**](Json#serialize) writes such an array as `[]`.

## Errors

The package does not raise run-time errors for bad data or bad arguments. A function that fails returns an empty result (**Empty**, **Nothing**, an empty string or **False**) and sets the last error, which the predeclared object [**JsonError**](JsonError) reports: **HasError** is **True**, **Code** is a short name such as `InvalidSyntax`, and **Message**, **Origin**, the position in the text and the JSON Pointer of the place say more. A function that can fail clears the last error when it starts, so the last error belongs to the latest call. A search that finds nothing, and an invalid regular expression given to a pattern function, are not errors. [**JsonError**](JsonError#error-codes) lists the codes.

```tb check_build check_run
Dim v As Variant = Json.Parse("[1, 2,]")
Debug.Print IsEmpty(v)                                    ' True
Debug.Print JsonError.Code                                ' InvalidSyntax

Debug.Print Json.TryParse("[1, 2,]", v, JsonOptions.Jsonc)   ' True
Debug.Print Json.Serialize(v, JsonOptions.Minified)          ' [1,2]
```

The package itself raises a run-time error on purpose in one case: an assignment to a property of the predeclared [**JsonOptions**](JsonOptions) object, which is a factory (error 5). The other run-time errors that a program meets are those of the language, such as error 91 for a call on the **Nothing** that a failed function returned, error 424 for the assignment of the **Empty** that a failed [**Parse**](Json#parse) returned to a variable of a class type, and error 9 for `UBound` of an unbound array. One more comes from [**Serialize**](Json#serialize), which raises error -2147467259 for a two-dimensional array, and leaves the last error stuck (see [Known problems](#known-problems-in-version-10150)).

## The standards

| Standard | What the package provides |
|:---------|:--------------------------|
| RFC 8259, JSON | [**Parse**](Json#parse) and [**Serialize**](Json#serialize), with limits on size and depth, and the JSONC dialect (comments and a trailing comma) as an option. |
| NDJSON, JSON Lines | One value on each line: [**ParseLines**](Json#parselines) and [**SerializeLines**](Json#serializelines), and the same for files. |
| RFC 6901, JSON Pointer | [**PointerGet**](Json#pointerget), [**PointerSet**](Json#pointerset) and the other pointer functions. |
| RFC 9535, JSONPath | [**Query**](Json#query) and the other query functions, and [**CompilePath**](Json#compilepath) for a path that is used again. The syntax and its [departures from the RFC](JsonPathQuery#where-the-syntax-departs-from-rfc-9535) are on the page of [**JsonPathQuery**](JsonPathQuery). |
| RFC 9485, I-Regexp | The regular expressions of JSONPath and of schema patterns, and [**IsMatchPattern**](Json#ismatchpattern) and its two partners. |
| RFC 6902, JSON Patch | [**Patch**](Json#patch), and [**Diff**](Json#diff) to make a patch. |
| RFC 7396, JSON Merge Patch | [**MergePatch**](Json#mergepatch). |
| JSON Schema, draft 2020-12 | [**Validate**](Json#validate) and [**CompileSchema**](Json#compileschema), with a local catalogue of documents. [**JsonSchema**](JsonSchema#keywords) lists the keywords that are checked. |
| ISO 8601 | [**ParseIso8601**](Json#parseiso8601) and [**FormatIso8601**](Json#formatiso8601). |

The package reads and writes text, byte arrays (UTF-8, UTF-16 little endian and big endian, with a byte order mark detected) and files, and always writes UTF-8. It has no streaming interface and no mapping of JSON onto user-defined types.

### Where the package departs from the standards

Each departure is described where it applies; this is the list.

- **RFC 8259.** The reading is strict. A number that a **Decimal** cannot hold is an error, which the RFC allows an implementation to do ([Parse](Json#parse)). The package accepts a byte order mark in bytes but not at the start of a **String**.
- **RFC 6901.** The form of a pointer as a URI fragment, `#/a/b`, is not accepted. An empty token after another token names the wrong place (a defect, in [Known problems](#known-problems-in-version-10150)).
- **RFC 6902.** A patch can be a single operation object, which the RFC does not allow. The operations behave as the RFC says in every case that was tested: the add, remove, replace, move, copy and test operations, the index rules for arrays and the handling of the root.
- **RFC 7396.** None found.
- **RFC 9535.** A comparison with a missing value is false, `<=` and `>=` are false for equal values that are not numbers or strings, a call of an unknown function is not an error, a number literal in a filter must be an integer, `length` counts UTF-16 code units, and the results are values and pointers, not normalized paths. The first three are defects ([JsonPathQuery](JsonPathQuery#where-the-syntax-departs-from-rfc-9535)).
- **RFC 9485.** The matcher accepts `\d`, `\s` and `\w`, which the RFC leaves out, and does not accept `\n`, `\r`, `\t`, `\-`, `\^` or a hyphen after a single character at the end of a set, which the RFC has. It does not try the other alternatives of a choice once one has matched ([Patterns](Json#patterns)).
- **JSON Schema, draft 2020-12.** `pattern` uses I-Regexp, not ECMA-262 regular expressions; lengths are counted in UTF-16 code units; `format` is checked loosely, and `ipv4` wrongly; some keywords are not evaluated ([JsonSchema](JsonSchema#where-the-package-departs-from-json-schema-2020-12)).
- **ISO 8601.** Only the extended forms with a date, or with a date and a time with seconds, are read ([ParseIso8601](Json#parseiso8601)).

Compared with the other JSON sections of this reference: [**VBA_JSON**](../VBA_JSON/) and the [**cJson**](../TBMANLIB/cJson) class of TBMANLIB (which uses the VBA-JSON code) return **Dictionary** and **Collection** objects, read numbers as **Double** or, when long, as **String**, and raise run-time error 10001 for text they cannot read, while VBA-JSON does not check for commas between items and ignores text after the value. tsJson has its own classes, reads numbers as **Decimal**, accepts only valid JSON unless JSONC is asked for, and reports errors through **JsonError**.

## Classes and modules

- [Json](Json) -- the module that builds, parses and serializes values and applies pointers, queries, patches, schemas and dates
  - [Map](Json#map), [Arr](Json#arr), [TypeOfValue](Json#typeofvalue), [IsObject](Json#isobject), [IsArray](Json#isarray), [Clone](Json#clone), [Equals](Json#equals) -- build, classify, copy and compare values
  - [Parse](Json#parse), [TryParse](Json#tryparse), [Serialize](Json#serialize), [SerializeToUtf8](Json#serializetoutf8) -- text and bytes
  - [ParseFile](Json#parsefile), [TryParseFile](Json#tryparsefile), [WriteFile](Json#writefile) -- files
  - [ParseLines](Json#parselines), [TryParseLines](Json#tryparselines), [SerializeLines](Json#serializelines), [ParseLinesFile](Json#parselinesfile), [TryParseLinesFile](Json#tryparselinesfile), [WriteLinesFile](Json#writelinesfile) -- NDJSON
  - [PointerGet](Json#pointerget), [PointerExists](Json#pointerexists), [PointerTryGet](Json#pointertryget), [PointerSet](Json#pointerset), [PointerRemove](Json#pointerremove), [PointerEscape](Json#pointerescape), [PointerUnescape](Json#pointerunescape) -- JSON Pointer
  - [CompilePath](Json#compilepath), [Query](Json#query), [QueryOne](Json#queryone), [TryQueryOne](Json#tryqueryone), [QueryHits](Json#queryhits) -- JSONPath
  - [IsValidPattern](Json#isvalidpattern), [IsMatchPattern](Json#ismatchpattern), [IsSearchPattern](Json#issearchpattern) -- I-Regexp
  - [Patch](Json#patch), [MergePatch](Json#mergepatch), [Diff](Json#diff) -- JSON Patch and Merge Patch
  - [Validate](Json#validate), [CompileSchema](Json#compileschema) -- JSON Schema
  - [ParseIso8601](Json#parseiso8601), [FormatIso8601](Json#formatiso8601) -- dates
  - [eJsonType](Json#ejsontype) -- the JSON types
- [JsonObject](JsonObject) -- a JSON object
  - [Count](JsonObject#count), [Item](JsonObject#item) -- the size and the members
  - [Arr](JsonObject#arr), [Bool](JsonObject#bool), [Map](JsonObject#map), [Num](JsonObject#num), [Str](JsonObject#str), [TryGet](JsonObject#tryget), [ValueType](JsonObject#valuetype) -- typed readers
  - [Clear](JsonObject#clear), [Clone](JsonObject#clone), [Dump](JsonObject#dump), [Exists](JsonObject#exists), [Items](JsonObject#items), [Keys](JsonObject#keys), [Merge](JsonObject#merge), [Remove](JsonObject#remove) -- the other members
- [JsonArray](JsonArray) -- a JSON array
  - [Count](JsonArray#count), [Item](JsonArray#item) -- the size and the elements
  - [Arr](JsonArray#arr), [Bool](JsonArray#bool), [Map](JsonArray#map), [Num](JsonArray#num), [Str](JsonArray#str), [TryGet](JsonArray#tryget), [ValueType](JsonArray#valuetype) -- typed readers
  - [Add](JsonArray#add), [Clear](JsonArray#clear), [Clone](JsonArray#clone), [Dump](JsonArray#dump), [Insert](JsonArray#insert), [RemoveAt](JsonArray#removeat), [ToVariantArray](JsonArray#tovariantarray) -- the other members
- [JsonOptions](JsonOptions) -- the options of a call; its predeclared object creates the presets
  - [Rfc](JsonOptions#rfc), [Jsonc](JsonOptions#jsonc), [Minified](JsonOptions#minified), [Pretty](JsonOptions#pretty), [Clone](JsonOptions#clone) -- the presets and the copy
  - the 15 properties: [DuplicateKeys](JsonOptions#duplicatekeys), [Encoding](JsonOptions#encoding), [EnsuresAscii](JsonOptions#ensuresascii), [EscapesSolidus](JsonOptions#escapessolidus), [IncludesBom](JsonOptions#includesbom), [Indent](JsonOptions#indent), [IsFormatAssertion](JsonOptions#isformatassertion), [MaxArrayItems](JsonOptions#maxarrayitems), [MaxBytes](JsonOptions#maxbytes), [MaxDepth](JsonOptions#maxdepth), [MaxObjectMembers](JsonOptions#maxobjectmembers), [MaxStringLength](JsonOptions#maxstringlength), [Newline](JsonOptions#newline), [SortsKeys](JsonOptions#sortskeys), [Syntax](JsonOptions#syntax)
  - [eJsonDuplicateKeys](JsonOptions#ejsonduplicatekeys), [eJsonEncodingKind](JsonOptions#ejsonencodingkind), [eJsonSyntax](JsonOptions#ejsonsyntax) -- the enumerations
- [JsonError](JsonError) -- the predeclared object that reports the last error; it also lists the error codes
  - [Clear](JsonError#clear), [Code](JsonError#code), [Column](JsonError#column), [Format](JsonError#format), [HasError](JsonError#haserror), [Line](JsonError#line), [Message](JsonError#message), [Origin](JsonError#origin), [Path](JsonError#path), [Position](JsonError#position), [Snapshot](JsonError#snapshot), [Snippet](JsonError#snippet), [ToString](JsonError#tostring) -- its members
  - [tJsonErrInfo](JsonError#tjsonerrinfo) -- the type that **Snapshot** returns
- [JsonPathQuery](JsonPathQuery) -- a compiled JSONPath, and the JSONPath syntax
  - [Source](JsonPathQuery#source), [Query](JsonPathQuery#query), [QueryHits](JsonPathQuery#queryhits), [QueryOne](JsonPathQuery#queryone), [TryQueryOne](JsonPathQuery#tryqueryone) -- its members
- [JsonHit](JsonHit) -- one result of a JSONPath query, with its pointer
  - [Pointer](JsonHit#pointer), [Value](JsonHit#value) -- its members
- [JsonSchema](JsonSchema) -- a compiled schema with a local catalogue, and the keywords that are checked
  - [AddDocument](JsonSchema#adddocument), [Validate](JsonSchema#validate) -- its members
- [JsonValidationResult](JsonValidationResult) -- the report of a validation
  - [ErrorCount](JsonValidationResult#errorcount), [Errors](JsonValidationResult#errors), [IsValid](JsonValidationResult#isvalid), [ToString](JsonValidationResult#tostring) -- its members
- [JsonValidationError](JsonValidationError) -- one failure of a validation, and the table of messages
  - [InstancePointer](JsonValidationError#instancepointer), [Keyword](JsonValidationError#keyword), [Message](JsonValidationError#message), [SchemaPointer](JsonValidationError#schemapointer), [ToString](JsonValidationError#tostring) -- its members

## Test code

The package also contains its own test code, which has no pages: the modules **Tests**, **TestsCore**, **TestsParse**, **TestsSerialize**, **TestsIo**, **TestsDates**, **TestsPointer**, **TestsPath**, **TestsPatch**, **TestsSchema**, **TestsRegexp**, **TestsExtNst**, **TestsExtNstData**, **TestsSmoke** and **TestsTour**. **Tests.RunAll** runs twelve areas, **Core**, **Parse**, **Serialize**, **Io**, **Dates**, **Pointer**, **Path**, **Patch**, **Schema**, **Regexp**, **ExtNst** and **Smoke**, and prints the result of each check with **Debug.Print**, so the lines appear in the DEBUG CONSOLE of the IDE and nowhere else. Each check prints `OK`, `FAIL` or `SKIP`, a failed check does not stop the run, and the last lines give the counts of each area and in total and say that the tests passed or failed. The **Io** area and the demonstration write small files to the folder named by `%TEMP%` and delete them. The **ExtNst** area (**TestsExtNst**, with its data in **TestsExtNstData**) runs the accept and reject cases of the public JSONTestSuite against **Parse**, and skips the cases that the package decides differently: documents with a repeated key, which are an error by default, and numbers outside the range of **Decimal**. **Tests.RunDemo** runs **TestsTour**, which demonstrates the package on one order document and prints each result as pretty-printed JSON, with the calls that made it as comment lines in front. In version 1.0.15.0 a run has 714 checks that pass, none that fail and 6 that are skipped, and it ends with the line `=== tsJson tests passed` followed by `=` characters. The areas have 96 (**Core**), 66 (**Parse**), 22 (**Serialize**), 23 (**Io**), 21 (**Dates**), 29 (**Pointer**), 38 (**Path**), 34 (**Patch**), 62 (**Schema**), 38 (**Regexp**), 278 (**ExtNst**) and 7 (**Smoke**) checks that pass; the six skipped checks are in **ExtNst**. The tests pass although the problems below exist, because no check covers them.

## Internal modules

Nineteen more modules and classes are part of the package's implementation and have no pages. The package describes all of them except **JsonLimits** as not part of its public API: **JsonBuf** (the string builder), **JsonEncoding** (the UTF-8 and UTF-16 codecs), **JsonErrorStore** (the storage behind [**JsonError**](JsonError)), **JsonIo** (the file access), **JsonIso8601** (the date conversion behind [**ParseIso8601**](Json#parseiso8601)), **JsonLexer**, **JsonParser** and **JsonText** (the JSON reader), **JsonSerializer** (the writer), **JsonValues** (helpers shared by [**JsonObject**](JsonObject) and [**JsonArray**](JsonArray)), **JsonPointer**, **JsonPatch**, **JsonPath** with its node class **JsonPathNode**, and **JsonSchemaEngine**, which implement the functions of [**Json**](Json) that are named after them, **JsonReNode** (a node of a compiled regular expression), **JsonUnicodeCats** (the table of Unicode categories for `\p{...}`) and **JsonIRegexp**, the I-Regexp matcher that [**IsMatchPattern**](Json#ismatchpattern) and its partners call. **JsonLimits** holds the constants of the default limits, which [**JsonOptions**](JsonOptions#rfc) lists with their values. None of them is declared **Private**, so a project that references the package can name them.

```tb check_build check_run
Debug.Print JsonLimits.DEFAULT_MAX_DEPTH       ' 1000
Debug.Print JsonLimits.DEFAULT_MAX_BYTES       ' 16777216
```

The test modules are public in the same way, so their names, such as **Tests**, are visible to the whole project. A module of the project with the same name takes precedence, with no error: in a project with its own module **Tests**, a call of `Tests.Run` reaches the project's module, and the package's **Tests** can no longer be named.

```tb check_build slot=file projname=tsjson-tests
Module Tests
    Public Function Run() As String
        Return "mine"
    End Function
End Module
```

```tb check_build check_run projname=tsjson-tests
Debug.Print Tests.Run()    ' mine
```

## Known problems in version 1.0.15.0

> [!WARNING]
> In version 1.0.15.0 these problems give a wrong result with no error.
>
> - **A choice in a regular expression is not tried again.** When one alternative matches and the rest of the pattern then fails, the matcher does not try the other alternatives, so `a|ab` does not match `ab`, and `(Mr|Mrs) Smith` does not match `Mrs Smith`, although `(Mrs|Mr) Smith` matches both. RFC 9485 defines the match of the whole pattern. A choice whose alternatives start the same way works when the longer alternative comes first. The matcher serves [**IsMatchPattern**](Json#ismatchpattern), [**IsSearchPattern**](Json#issearchpattern), the JSONPath functions `match` and `search`, and the schema keywords `pattern` and `patternProperties`.
> - **`\n`, `\r` and `\t` are not understood.** RFC 9485 has these escapes. Outside a character set the pattern is invalid, and inside a set `[\n]` means the letter `n`. Write the control character itself in the pattern string, for example `ChrW(9)`, which is an ordinary character in the dialect. The escapes `\-` and `\^`, which the RFC also has, are invalid outside a set, and `[a-]` is invalid, although the RFC allows a last hyphen; put the hyphen first, as in `[-a]`.
> - **A schema `pattern` cannot be anchored.** The dialect has no `^` and `$`: they are ordinary characters, so `^[a-z]+$` needs a `^` and a `$` in the string. The JSON Schema draft names regular expressions in which they are anchors, so a string such as `abc` fails a `pattern` that was written for them.
> - **A JSONPath filter compares a missing value differently from RFC 9535.** A comparison is false whenever one side selects no value, whatever the operator is, so `[?@.a != 1]` leaves out the elements that have no `a`, and `[?@.a == @.b]` leaves out an element that has neither, where the RFC selects both. `<=` and `>=` are false for two equal booleans, nulls or arrays. A call of a function that does not exist is not an error: the filter is false for every element. [**JsonPathQuery**](JsonPathQuery#where-the-syntax-departs-from-rfc-9535) lists these and the other departures.
> - **A JSON Pointer with an empty token after another token names the wrong place.** The token is read as a copy of the token before it, so `/a/` is read as `/a/a`: [**PointerGet**](Json#pointerget) returns the wrong value, and [**PointerSet**](Json#pointerset), [**PointerRemove**](Json#pointerremove) and [**Patch**](Json#patch) change the wrong member. The pointers that [**QueryHits**](Json#queryhits) returns for a member with an empty key are affected. The code declares a variable inside a loop and relies on it being empty in each pass; twinBASIC, like VBA, keeps its value from the pass before.
> - **The `ipv4` format rejects almost every valid address** when [**IsFormatAssertion**](JsonOptions#isformatassertion) is **True**, for the same reason: the number of the previous part is not set back to 0.
> - **A run-time error that escapes from a function stops the last error from being cleared.** [**Json.Serialize**](Json#serialize) raises error -2147467259 for a two-dimensional array. The function has by then marked the call as nested, and the mark stays: from then on a function neither clears the last error when it starts nor sets its origin, so [**JsonError.HasError**](JsonError#haserror) stays **True** after a call that worked, and the origin of an error is `Json.Serialize`. The call `JsonErrorStore.LeaveNested`, of an internal module, ends the mark.
>
> ```tb check_build check_run
> Debug.Print Json.IsMatchPattern("ab", "a|ab")                    ' False
> Debug.Print Json.IsMatchPattern("Mrs Smith", "(Mr|Mrs) Smith")   ' False
> Debug.Print Json.IsMatchPattern("Mrs Smith", "(Mrs|Mr) Smith")   ' True
> Debug.Print Json.IsValidPattern("a\tb")                          ' False
> Debug.Print Json.IsMatchPattern("n", "[\n]")                     ' True
> Debug.Print Json.IsMatchPattern(vbLf, "[\n]")                    ' False
> Debug.Print Json.IsValidPattern("a\-b")                          ' False
> Debug.Print Json.IsValidPattern("[a-]")                          ' False
> Debug.Print Json.Validate("abc", Json.Parse("{""pattern"":""^[a-z]+$""}")).IsValid   ' False
> ```
>
> ```tb check_build check_run
> Dim doc As Variant = Json.Parse("[{""a"":1},{""a"":2},{""b"":3}]")
> Debug.Print Json.Serialize(Json.Query(doc, "$[?@.a != 1]"), JsonOptions.Minified)                       ' [{"a":2}]
> Debug.Print Json.Serialize(Json.Query(Json.Parse("[{""c"":1}]"), "$[?@.a == @.b]"), JsonOptions.Minified)   ' []
> Debug.Print Json.Serialize(Json.Query(doc, "$[?unknown(@.a)]"), JsonOptions.Minified)                   ' []
> Debug.Print JsonError.HasError                                                                          ' False
> ```
>
> ```tb check_build check_run
> Dim doc As Variant = Json.Parse("{""a"":{""a"":1,"""":2}}")
> Debug.Print Json.PointerGet(doc, "/a/")
> Debug.Print Json.Serialize(Json.PointerSet(doc, "/a/", 9), JsonOptions.Minified)
> Debug.Print Json.Serialize(Json.PointerRemove(doc, "/a/"), JsonOptions.Minified)
>
> Dim hit As JsonHit = Json.QueryHits(doc, "$.a['']")(0)
> Debug.Print hit.Pointer & " " & hit.Value & " " & Json.PointerGet(doc, hit.Pointer)
>
> Dim i As Long
> For i = 1 To 3
>     Dim n As Long
>     n += 1
>     Debug.Print n
> Next
> ' Output:
> ' 1
> ' {"a":{"a":9,"":2}}
> ' {"a":{"":2}}
> ' /a/ 2 1
> ' 1
> ' 2
> ' 3
> ```
>
> ```tb check_build check_run
> Dim o As JsonOptions = JsonOptions.Rfc
> o.IsFormatAssertion = True
> Dim ip As Variant = Json.Parse("{""format"":""ipv4""}")
> Debug.Print Json.Validate("0.0.0.0", ip, o).IsValid         ' True
> Debug.Print Json.Validate("1.2.3.4", ip, o).IsValid         ' False
> Debug.Print Json.Validate("192.168.1.1", ip, o).IsValid     ' False
> ```
>
> ```tb check_build check_run
> Dim grid(0 To 1, 0 To 1) As Variant
> JsonError.Clear
> Dim text As String
> On Error Resume Next
> text = Json.Serialize(grid, JsonOptions.Minified)
> Debug.Print Err.Number & " " & Err.Description            ' -2147467259 Unspecified error
> Err.Clear
> On Error GoTo 0
>
> Dim v As Variant = Json.Parse("{")
> v = Json.Parse("[1]")
> Debug.Print JsonError.HasError & " " & JsonError.Code & " " & JsonError.Origin   ' True UnexpectedEnd Json.Serialize
>
> JsonErrorStore.LeaveNested
> v = Json.Parse("[1]")
> Debug.Print JsonError.HasError                            ' False
> ```

> [!NOTE]
> The package has three more problems, each of which is an error that the reader cannot miss.
>
> - **Numbers must fit a Decimal.** [**Parse**](Json#parse) rejects a valid JSON number with the error `InvalidNumber` when its digits make a whole number above 79228162514264337593543950335, or its scale is outside -28 to 28, so `1e29`, `1e-29`, a number of 36 digits such as pi, and the largest **Double**, `1.7976931348623157e308`, are errors. [**Serialize**](Json#serialize) fails the same way for a **Double** above that range. RFC 8259 allows an implementation to limit the range of numbers.
> - **A JSONPath filter takes integer literals only.** RFC 9535 allows a fraction and an exponent. `[?@.price < 10.5]` is the error `InvalidPath`. Compare with a whole number, or compare strings.
> - **`Tests.SetContinueOnFail` has no effect.** A failed check never stops **Tests.RunAll**, whatever the setting.
>
> ```tb check_build check_run
> Debug.Print IsEmpty(Json.Parse("1e29"))                    ' True
> Debug.Print JsonError.Code                                 ' InvalidNumber
> Debug.Print IsEmpty(Json.Parse("1.7976931348623157e308"))  ' True
> Debug.Print IsEmpty(Json.Parse("1e28"))                    ' False
> Debug.Print Json.CompilePath("$[?@.price < 10.5]") Is Nothing   ' True
> Debug.Print JsonError.Code                                 ' InvalidPath
> ```

The first check of this sample fails on purpose. The second check still runs after `SetContinueOnFail False`:

```tb check_build check_run
Tests.BeginRun
Tests.SetContinueOnFail False
Tests.CheckTrue "first", False
Tests.CheckTrue "second", True
Debug.Print Tests.FailCount()
' Output:
' === tsJson tests ===========================================
' FAIL  first
' expected: True
' actual:   False
' OK    second
' 1
```

## See Also

- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project
- [VBA_JSON](../VBA_JSON/) package -- JSON parsing and writing with **Dictionary** and **Collection** objects
- [cJson](../TBMANLIB/cJson) class -- the JSON class of TBMANLIB
