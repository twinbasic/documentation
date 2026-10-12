---
title: JsonPathQuery
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonPathQuery
has_toc: false
---

# JsonPathQuery class
{: .no_toc }

A **JsonPathQuery** is a compiled JSONPath, as RFC 9535 defines the language. [**Json.CompilePath**](Json#compilepath) creates one. A query that is compiled once can be run on any number of documents, with the same four verbs as the [**Json**](Json) module: [**Query**](#query), [**QueryOne**](#queryone), [**TryQueryOne**](#tryqueryone) and [**QueryHits**](#queryhits).

```tb check_build check_run
Dim q As JsonPathQuery = Json.CompilePath("$.items[*].id")
Dim a As Variant = Json.Parse("{""items"":[{""id"":1},{""id"":2}]}")
Dim b As Variant = Json.Parse("{""items"":[{""id"":7}]}")
Debug.Print q.Source                                      ' $.items[*].id
Debug.Print Json.Serialize(q.Query(a), JsonOptions.Minified)   ' [1,2]
Debug.Print Json.Serialize(q.Query(b), JsonOptions.Minified)   ' [7]
Debug.Print q.QueryOne(b)                                 ' 7

Dim v As Variant
Debug.Print q.TryQueryOne(Json.Parse("{}"), v)            ' False
Debug.Print JsonError.HasError                            ' False
```

A query that matches nothing is not an error. Each verb clears the last error when it starts and does not set one, because the path was checked when it was compiled; the origin of any error is therefore `Json.CompilePath` or the facade function that compiled the path.

* TOC
{:toc}

## Syntax

A JSONPath starts with `$`, the root of the document, followed by any number of segments. A path of `$` alone selects the document itself.

| Syntax | Selects |
|:-------|:--------|
| `.name` | The member `name` of an object. A name starts with a letter, an underscore or a non-ASCII character, and goes on with those and digits. |
| `.*` or `[*]` | Every member of an object, and every element of an array. |
| `['name']` or `["name"]` | The member of an object with that key. The string can hold the escapes `\b \f \n \r \t \/ \\ \' \"` and `\uXXXX`, with surrogate pairs. |
| `[3]`, `[-1]` | The element of an array at that index. A negative index counts from the end. |
| `[start:end:step]` | The elements of an array from *start* up to, not including, *end*, in steps of *step*. Each part is optional, and a negative *step* goes backwards. The rules are those of RFC 9535. A step of 0 selects nothing. |
| `[?filter]` | The members and elements for which the filter is true. |
| `[a, b, ...]` | The union of selectors, each of the kinds above, in the order written. |
| `..name`, `..*`, `..[...]` | The same selection made on the value and on every value inside it, at any depth. |

The selection works on values in document order: a value comes before the values inside it, and the members and elements in the order they have in the document. A value that several selectors select appears more than once. Space, tab, line feed and carriage return are allowed between tokens.

A **filter** is an expression made of these parts:

| Part | Meaning |
|:-----|:--------|
| `@` and `$` followed by segments | A query on the current element (`@`) or on the document (`$`). On its own it is true when it selects at least one value. |
| `==`, `!=`, `<`, `<=`, `>`, `>=` | A comparison of two single values: a query that selects exactly one value, a literal, or a function. |
| `&&`, `\|\|`, `!`, `( )` | And, or, not, and grouping. |
| Literals | A string in single or double quotes, an integer, `true`, `false` and `null`. |
| `length(x)` | The number of characters in a string, of elements in an array, or of members in an object. |
| `count(query)` | The number of values a query selects. |
| `value(query)` | The value that a query selects, when it selects exactly one. |
| `match(text, pattern)`, `search(text, pattern)` | Whether the whole text, or a part of it, matches an I-Regexp. The text and the pattern are strings. The patterns of [**Json.IsMatchPattern**](Json#ismatchpattern) apply. |

Values are compared as [**Json.Equals**](Json#equals) compares them for `==` and `!=`. The ordering comparisons apply to two numbers and to two strings; strings are ordered by UTF-16 code unit. `length` counts a string in UTF-16 code units.

```tb check_build check_run
Dim doc As Variant = Json.Parse("{""a"":[""a"",""b"",""c"",""d""],""o"":{""j"":1,""k"":{""j"":2}}}")
Debug.Print Json.Serialize(Json.Query(doc, "$.a[1:3]"), JsonOptions.Minified)     ' ["b","c"]
Debug.Print Json.Serialize(Json.Query(doc, "$.a[::-1]"), JsonOptions.Minified)    ' ["d","c","b","a"]
Debug.Print Json.Serialize(Json.Query(doc, "$.a[0, -1]"), JsonOptions.Minified)   ' ["a","d"]
Debug.Print Json.Serialize(Json.Query(doc, "$..j"), JsonOptions.Minified)         ' [1,2]
Debug.Print Json.Serialize(Json.Query(doc, "$.o.*"), JsonOptions.Minified)        ' [1,{"j":2}]

Dim words As Variant = Json.Parse("{""a"":[{""b"":""j""},{""b"":""kilo""}]}")
Debug.Print Json.Serialize(Json.Query(words, "$.a[?match(@.b, ""[jk]"")]"), JsonOptions.Minified)    ' [{"b":"j"}]
Debug.Print Json.Serialize(Json.Query(words, "$.a[?search(@.b, ""[jk]"")]"), JsonOptions.Minified)   ' [{"b":"j"},{"b":"kilo"}]
Debug.Print Json.Serialize(Json.Query(words, "$.a[?length(@.b) > 1]"), JsonOptions.Minified)         ' [{"b":"kilo"}]
```

### Where the syntax departs from RFC 9535

The language of the package is a part of RFC 9535, with these differences. The first four are defects of version 1.0.15.0, because the RFC states the behavior they depart from; the first three give wrong results with no error, and [Known problems](.#known-problems-in-version-10150) shows them.

- **A comparison with a missing value is false.** In RFC 9535 a query that selects nothing is a value that is equal to another such query and to nothing else, so `@.a != 1` is true for an element without `a`, and `@.a == @.b` is true for an element that has neither. In this package a comparison is false whenever either side selects no value or more than one, whatever the operator is. The elements without `a` are not selected by `[?@.a != 1]`, although `[?!(@.a == 1)]` selects them.
- **`<=` and `>=` hold only for numbers and strings.** In RFC 9535 `a <= b` is true when `a < b` or `a == b`, whatever the type of the values. Here two equal booleans, two nulls or two equal arrays do not satisfy `<=`.
- **A function call is not checked when the path is compiled.** RFC 9535 makes a call to an unknown function, a call with the wrong number or kind of arguments, and a query that does not select a single value inside a comparison into errors. Here the path compiles, and the expression is false for every element. The exception is a function name that starts with `t`, `f` or `n`: it is read as the word of a literal, and the path is the error `InvalidPath` with the message *Unknown literal 'name'.*
- **A number literal in a filter is an integer.** RFC 9535 also allows a fraction and an exponent. A fraction or an exponent, as in `@.price < 10.5` or `@.n == 1e3`, ends the expression early and the path is the error `InvalidPath`, with the message *Expected ']' in JSONPath.* The integer must fit a **Long**. Compare with a whole number, or compare a string.
- **`length` counts UTF-16 code units.** RFC 9535 counts the Unicode characters of a string, so the length of a character outside the Basic Multilingual Plane is 1 there and 2 here.
- **A hit is a value and a pointer.** The package returns the value, or the value with an RFC 6901 pointer ([**QueryHits**](#queryhits)), and not the normalized path of RFC 9535.
- **An integer is read leniently.** `007` and `-0` are accepted in an index or a slice, which RFC 9535 does not allow.

The other selectors, the slices, the descendant segment and the order of the results follow the RFC.

```tb check_build check_run
Dim doc As Variant = Json.Parse("[{""a"":1},{""a"":2},{""b"":3}]")
Debug.Print Json.Serialize(Json.Query(doc, "$[?@.a != 1]"), JsonOptions.Minified)
Debug.Print Json.Serialize(Json.Query(doc, "$[?!(@.a == 1)]"), JsonOptions.Minified)

Dim same As Variant = Json.Parse("[{""a"":true,""b"":true},{""a"":null,""b"":null},{""a"":1,""b"":1},{""a"":""x"",""b"":""x""}]")
Debug.Print Json.Serialize(Json.Query(same, "$[?@.a == @.b]"), JsonOptions.Minified)
Debug.Print Json.Serialize(Json.Query(same, "$[?@.a <= @.b]"), JsonOptions.Minified)

Dim p As Variant
Dim q As JsonPathQuery
For Each p In Array("$[?unknown(@.a)]", "$[?foo(@.a)]", "$[?@.price < 10.5]", "$[007]", "$.0")
    Set q = Json.CompilePath(CStr(p))
    If q Is Nothing Then
        Debug.Print p & " -> " & JsonError.Code & ": " & JsonError.Message
    Else
        Debug.Print p & " -> compiled"
    End If
Next

Dim text As Variant = Json.Arr(Json.Map("s", "bc", "n", 1), Json.Map("s", ChrW(&HD83D) & ChrW(&HDE00), "n", 2), Json.Map("s", "d", "n", 3))
Debug.Print Json.Serialize(Json.Query(text, "$[?length(@.s) == 2].n"), JsonOptions.Minified)
' Output:
' [{"a":2}]
' [{"a":2},{"b":3}]
' [{"a":true,"b":true},{"a":null,"b":null},{"a":1,"b":1},{"a":"x","b":"x"}]
' [{"a":1,"b":1},{"a":"x","b":"x"}]
' $[?unknown(@.a)] -> compiled
' $[?foo(@.a)] -> InvalidPath: Unknown literal 'foo'.
' $[?@.price < 10.5] -> InvalidPath: Expected ']' in JSONPath.
' $[007] -> compiled
' $.0 -> InvalidPath: Expected member name.
' [1,2]
```


## Properties

### Source
{: .no_toc }

The text of the path that was compiled. A **String**, read-only.

Syntax: *text* **=** *query***.Source**

## Methods

### Query
{: .no_toc }

Returns the values that the path selects.

Syntax: *query***.Query** ( *root* ) **As Variant()**

*root*
: *required* The document.

Returns an array of the values, in document order, with a lower bound of 0. The values are the objects and arrays inside the document, not copies. The array is unbound when nothing is selected. [**Json.Query**](Json#query) is the same call on a path in text.

### QueryHits
{: .no_toc }

Returns the values that the path selects, each with its JSON Pointer.

Syntax: *query***.QueryHits** ( *root* ) **As** [**JsonHit**](JsonHit)**()**

*root*
: *required* The document.

Returns an array of [**JsonHit**](JsonHit) objects, in document order, with a lower bound of 0, or an unbound array when nothing is selected. [**Json.QueryHits**](Json#queryhits) is the same call on a path in text.

### QueryOne
{: .no_toc }

Returns the first value that the path selects.

Syntax: *query***.QueryOne** ( *root* ) **As Variant**

*root*
: *required* The document.

Returns the first value in document order, or **Empty** when nothing is selected. A selected JSON null is **Null**. [**Json.QueryOne**](Json#queryone) is the same call on a path in text.

### TryQueryOne
{: .no_toc }

Reads the first value that the path selects and returns whether there is one.

Syntax: *query***.TryQueryOne** ( *root*, *value* ) **As Boolean**

*root*
: *required* The document.

*value*
: *required* A **Variant** variable that receives the value. It is passed **ByRef**. When nothing is selected it is **Empty**.

Returns **True** when the path selects at least one value. [**Json.TryQueryOne**](Json#tryqueryone) is the same call on a path in text.

## See Also

- [Json](Json#jsonpath) module -- compiles a path and runs the same queries on a path in text
- [JsonHit](JsonHit) class -- a value with its pointer
- [Json.IsMatchPattern](Json#ismatchpattern) function -- the regular expressions of **match** and **search**
- [tsJson Package](.) -- the package
