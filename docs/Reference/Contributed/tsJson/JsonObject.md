---
title: JsonObject
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonObject
has_toc: false
---

# JsonObject class
{: .no_toc }

A **JsonObject** is a JSON object: an ordered set of members, each a key and a value. [**Json.Parse**](Json#parse) returns one for a JSON object, and [**Json.Map**](Json#map) builds one from pairs of arguments. An empty object can also be created with `New JsonObject`, and an empty array with `New JsonArray`.

```tb check_build check_run
Dim o As JsonObject = Json.Parse("{""name"":""Ann"",""age"":31,""tags"":[""x"",""y""]}")
Debug.Print o.Str("name")                                 ' Ann
Debug.Print o.Num("age") + 1                              ' 32
Debug.Print o.Arr("tags").Count                           ' 2

o.Item("age") = 32
Set o.Item("address") = Json.Map("city", "Rome")
Debug.Print o.Dump(JsonOptions.Minified)                  ' {"name":"Ann","age":32,"tags":["x","y"],"address":{"city":"Rome"}}

Dim empty1 As New JsonObject
Dim empty2 As New JsonArray
Debug.Print empty1.Count & " " & empty2.Count             ' 0 0
```

The members keep the order in which they were added. A key is compared by character code, so `Name` and `name` are different keys, and the empty string is a valid key. A key that exists is replaced in its place; a new key is added at the end. A value can be any **Variant**, and it is stored without a check; [The JSON model](.#the-json-model) lists the values that can be written as JSON. An object value is stored by reference, so the same object can be in two places, and an object that contains itself cannot be serialized (the error is `CircularReference`).

The members that read a member by key follow two rules. The typed readers [**Str**](#str), [**Num**](#num) and [**Bool**](#bool) return a default for a key that is missing and for a JSON null, with no error. The readers that return the stored value or a container, [**Item**](#item), [**Map**](#map) and [**Arr**](#arr), set the last error for a missing key. [**JsonError**](JsonError) reports it. A member that can fail clears the last error when it starts: reading an [**Item**](#item), [**Str**](#str), [**Num**](#num), [**Bool**](#bool), [**Map**](#map), [**Arr**](#arr), [**TryGet**](#tryget), [**Remove**](#remove), [**Merge**](#merge) and [**Dump**](#dump). [**Count**](#count), [**Exists**](#exists), [**Keys**](#keys), [**Items**](#items), [**Clear**](#clear), [**Clone**](#clone), [**ValueType**](#valuetype) and writing an **Item** neither clear nor set it.

* TOC
{:toc}

## For Each

`For Each` over a **JsonObject** returns the keys, as **String** values, in order. The loop runs over a copy of the keys taken when it starts, so the loop can add or remove members.

```tb check_build check_run
Dim o As JsonObject = Json.Map("a", 1, "b", 2)
o.Item("a") = 10
o.Item("c") = 3
Set o.Item("d") = Json.Arr(1)
o.Remove "b"
Debug.Print o.Dump(JsonOptions.Minified)
Debug.Print o("a")

Dim k As Variant
For Each k In o
    Debug.Print k & "=" & o.ValueType(k)
Next
' Output:
' {"a":10,"c":3,"d":[1]}
' 10
' a=3
' c=3
' d=5
```

## Properties

### Count
{: .no_toc }

The number of members. A **Long**, read-only.

Syntax: *n* **=** *object***.Count**

### Item
{: .no_toc }

The value of a member. A **Variant**, the default member of the class.

Syntax: *value* **=** *object***.Item** ( *key* )

Syntax: *object***.Item** ( *key* ) **=** *value*

Syntax: **Set** *object***.Item** ( *key* ) **=** *value*

*key*
: *required* A **String**, the key of the member.

*value*
: The value to store. Use **Set** for a [**JsonObject**](JsonObject) or a [**JsonArray**](JsonArray) or any other object.

Reading returns the value. A JSON null is **Null**. A value that is an object is returned itself, not a copy. For a key that does not exist, the read returns **Empty** and sets the error `MissingKey`, with the message *Object has no member 'key'.* and the pointer `/key` in `JsonError.Path`. Writing replaces the value of an existing key in its place, or adds the member at the end. Because **Item** is the default member, `object("key")` reads a member.

```tb check_build check_run
Dim o As JsonObject = Json.Map("a", 1)
Dim v As Variant = o.Item("nope")
Debug.Print IsEmpty(v)                                    ' True
Debug.Print JsonError.Code                                ' MissingKey
Debug.Print JsonError.Message                             ' Object has no member 'nope'.
Debug.Print JsonError.Path                                ' /nope
Debug.Print JsonError.Origin                              ' JsonObject.Item
Debug.Print o.Exists("nope")                              ' False
```

## Methods

### Arr
{: .no_toc }

Returns a member that is an array.

Syntax: *object***.Arr** ( *key* ) **As** [**JsonArray**](JsonArray)

*key*
: *required* A **String**, the key of the member.

Returns the [**JsonArray**](JsonArray) itself, not a copy. Returns **Nothing** and sets the last error when the key is missing (`MissingKey`, *Missing array.*), or the member is not an array, a JSON null included (`WrongType`, *Expected array.*). The pointer of the member is in `JsonError.Path`. A call made on the **Nothing** result raises run-time error 91.

### Bool
{: .no_toc }

Returns a member that is a Boolean.

Syntax: *object***.Bool** ( *key* [ , *default* ] ) **As Boolean**

*key*
: *required* A **String**, the key of the member.

*default*
: *optional* A **Boolean**, the result when the member is missing or a JSON null. **False**, the default.

Returns the member. A member that is not a **Boolean** returns *default* and sets the error `WrongType` (*Expected boolean.*). A missing key or a JSON null is not an error.

### Clear
{: .no_toc }

Removes all members.

Syntax: *object***.Clear**

### Clone
{: .no_toc }

Returns a deep copy of the object.

Syntax: *object***.Clone** ( ) **As** [**JsonObject**](JsonObject)

Every object and array inside the object is copied, so the copy shares no container with the original. See [**Json.Clone**](Json#clone) for a value of any type.

### Dump
{: .no_toc }

Returns the object as JSON text.

Syntax: *object***.Dump** ( [ *options* ] ) **As String**

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. **Nothing**, the default, writes pretty-printed text, as [**JsonOptions.Pretty**](JsonOptions#pretty) does.

The result is that of [**Json.Serialize**](Json#serialize), and its errors are the same, with the origin `JsonObject.Dump`.

### Exists
{: .no_toc }

Returns whether a key is present.

Syntax: *object***.Exists** ( *key* ) **As Boolean**

*key*
: *required* A **String**, the key to look for.

Returns **True** when the object has a member with exactly that key. A member whose value is a JSON null exists. The member does not change the last error.

### Items
{: .no_toc }

Returns the values of all members.

Syntax: *object***.Items** ( ) **As Variant()**

Returns an array of the values, in the order of the members, with a lower bound of 0. The array is unbound when the object is empty. Objects and arrays in the result are the stored ones, not copies.

### Keys
{: .no_toc }

Returns the keys of all members.

Syntax: *object***.Keys** ( ) **As String()**

Returns an array of the keys, in order, with a lower bound of 0. The array is unbound when the object is empty, and `UBound` raises run-time error 9 for it. Check [**Count**](#count) first.

```tb check_build check_run
Dim o As JsonObject = Json.Map("x", 1, "y", Json.Arr(2))
Dim keys() As String = o.Keys()
Debug.Print UBound(keys) - LBound(keys) + 1               ' 2
Debug.Print keys(0) & keys(1)                             ' xy
Debug.Print Json.Serialize(o.Items(), JsonOptions.Minified)   ' [1,[2]]

Debug.Print Json.Map().Count                              ' 0
```

### Map
{: .no_toc }

Returns a member that is an object.

Syntax: *object***.Map** ( *key* ) **As** [**JsonObject**](JsonObject)

*key*
: *required* A **String**, the key of the member.

Returns the [**JsonObject**](JsonObject) itself, not a copy. Returns **Nothing** and sets the last error when the key is missing (`MissingKey`, *Missing object.*), or the member is not an object, a JSON null included (`WrongType`, *Expected object.*).

```tb check_build check_run
Dim o As JsonObject = Json.Parse("{""user"":{""name"":""Ada""},""n"":null}")
Debug.Print o.Map("user").Str("name")                     ' Ada

Dim m As JsonObject = o.Map("n")
Debug.Print m Is Nothing                                  ' True
Debug.Print JsonError.Code                                ' WrongType
Set m = o.Map("other")
Debug.Print JsonError.Code                                ' MissingKey
Debug.Print JsonError.Message                             ' Missing object.
```

### Merge
{: .no_toc }

Returns a new object that is this object overlaid with another.

Syntax: *object***.Merge** ( *other* [ , *deep* ] ) **As** [**JsonObject**](JsonObject)

*other*
: *required* The [**JsonObject**](JsonObject) whose members are laid over this one. **Nothing** is the error `WrongType`, and the result is **Nothing**.

*deep*
: *optional* A **Boolean**. **True**, the default, merges a member that is an object in both objects member by member. **False** replaces the member whole.

Neither argument is changed. The result starts as a copy of this object. For each member of *other*: a key that is new is added at the end; a key that exists is replaced in its place by a copy of the value from *other*, except that with *deep* an object over an object is merged in the same way. Arrays, strings, numbers and **Null** replace the old value whole. A **Null** in *other* sets the member to **Null**; it does not remove the member. [**Json.MergePatch**](Json#mergepatch) removes it.

```tb check_build check_run
Dim a As JsonObject = Json.Map("a", 1, "b", Json.Map("c", 2, "d", 3))
Dim b As JsonObject = Json.Map("b", Json.Map("d", 9, "e", 4), "f", Null)
Debug.Print Json.Serialize(a.Merge(b), JsonOptions.Minified)          ' {"a":1,"b":{"c":2,"d":9,"e":4},"f":null}
Debug.Print Json.Serialize(a.Merge(b, False), JsonOptions.Minified)   ' {"a":1,"b":{"d":9,"e":4},"f":null}
Debug.Print Json.Serialize(a, JsonOptions.Minified)                   ' {"a":1,"b":{"c":2,"d":3}}
```

### Num
{: .no_toc }

Returns a member that is a number.

Syntax: *object***.Num** ( *key* [ , *default* ] ) **As Variant**

*key*
: *required* A **String**, the key of the member.

*default*
: *optional* A **Variant**, the result when the member is missing or a JSON null. When it is left out, the result is **Empty**.

Returns the number as a **Decimal**. A member that is not a number, a string of digits included, returns *default* and sets the error `WrongType` (*Expected number.*). A missing key or a JSON null is not an error.

```tb check_build check_run
Dim o As JsonObject = Json.Parse("{""name"":""Ann"",""age"":31,""admin"":false,""boss"":null}")
Debug.Print o.Str("name")                                 ' Ann
Debug.Print o.Str("title", "(none)")                      ' (none)
Debug.Print o.Str("age")                                  ' 31
Debug.Print o.Num("age") + 1                              ' 32
Debug.Print o.Bool("admin", True)                         ' False
Debug.Print o.Str("boss", "none")                         ' none
Debug.Print JsonError.HasError                            ' False

Debug.Print o.Num("name", -1)                             ' -1
Debug.Print JsonError.Code                                ' WrongType
Debug.Print JsonError.Path                                ' /name
```

### Remove
{: .no_toc }

Removes a member.

Syntax: *object***.Remove** ( *key* )

*key*
: *required* A **String**, the key of the member.

The later members move up, so the order of the others does not change. A key that is missing is the error `MissingKey`.

### Str
{: .no_toc }

Returns a member as a string.

Syntax: *object***.Str** ( *key* [ , *default* ] ) **As String**

*key*
: *required* A **String**, the key of the member.

*default*
: *optional* A **String**, the result when the member is missing or a JSON null. The empty string, the default.

Returns the string. A member that is a number or a **Boolean** is converted: a number to its text with a decimal point (`31`, `8.95`), and a **Boolean** to `True` or `False`. A member that is an object or an array returns *default* and sets the error `WrongType` (*Expected string.*). A missing key or a JSON null is not an error.

```tb check_build check_run
Dim o As JsonObject = Json.Parse("{""p"":8.95,""n"":31,""b"":true,""list"":[1]}")
Debug.Print o.Str("p")                                    ' 8.95
Debug.Print o.Str("n")                                    ' 31
Debug.Print o.Str("b")                                    ' True
Debug.Print o.Str("list", "none")                         ' none
Debug.Print JsonError.Code                                ' WrongType
```

### TryGet
{: .no_toc }

Reads a member and returns whether it exists.

Syntax: *object***.TryGet** ( *key*, *value* ) **As Boolean**

*key*
: *required* A **String**, the key of the member.

*value*
: *required* A **Variant** variable that receives the value. It is passed **ByRef**. When the key is missing it is **Empty**.

Returns **True** when the member exists, even if its value is a JSON null. A missing key is not an error. The member clears the last error.

### ValueType
{: .no_toc }

Returns the JSON type of a member.

Syntax: *object***.ValueType** ( *key* ) **As** [**eJsonType**](Json#ejsontype)

*key*
: *required* A **String**, the key of the member.

Returns **jtUnknown** for a key that is missing, and otherwise the type of the stored value, as [**Json.TypeOfValue**](Json#typeofvalue) reports it. The member does not change the last error.

## See Also

- [JsonArray](JsonArray) class -- the JSON array
- [Json](Json) module -- builds, parses and serializes values
- [JsonError](JsonError) class -- reports the last error
- [JsonOptions](JsonOptions) class -- the options of **Dump**
- [tsJson Package](.) -- the package
