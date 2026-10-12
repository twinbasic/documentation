---
title: JsonArray
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonArray
has_toc: false
---

# JsonArray class
{: .no_toc }

A **JsonArray** is a JSON array: an ordered list of values, numbered from 0. [**Json.Parse**](Json#parse) returns one for a JSON array, and [**Json.Arr**](Json#arr) builds one from its arguments. An empty array can also be created with `New JsonArray`.

```tb check_build check_run
Dim a As JsonArray = Json.Parse("[10,""x"",null,[1,2]]")
Debug.Print a.Count                                       ' 4
Debug.Print a.Num(0) + 1                                  ' 11
Debug.Print a.Str(1)                                      ' x
Debug.Print IsNull(a.Item(2))                             ' True
Debug.Print a.Arr(3).Count                                ' 2

a.Add True
Debug.Print a.Dump(JsonOptions.Minified)                  ' [10,"x",null,[1,2],true]
```

A value can be any **Variant**, and it is stored without a check; [The JSON model](.#the-json-model) lists the values that can be written as JSON. An object value is stored by reference.

An index outside the array sets the last error for the members that return the stored value or change the array: [**Item**](#item) (read and write), [**Insert**](#insert), [**RemoveAt**](#removeat), [**Map**](#map) and [**Arr**](#arr). The typed readers [**Str**](#str), [**Num**](#num) and [**Bool**](#bool) return a default for an index outside the array and for a JSON null, with no error. [**JsonError**](JsonError) reports the errors. A member that can fail clears the last error when it starts: [**Item**](#item), [**Insert**](#insert), [**RemoveAt**](#removeat), [**Str**](#str), [**Num**](#num), [**Bool**](#bool), [**Map**](#map), [**Arr**](#arr), [**TryGet**](#tryget) and [**Dump**](#dump). [**Count**](#count), [**Clear**](#clear), [**Add**](#add), [**ToVariantArray**](#tovariantarray), [**ValueType**](#valuetype) and [**Clone**](#clone) neither clear nor set it.

* TOC
{:toc}

## For Each

`For Each` over a **JsonArray** returns the elements, in order. A JSON null is **Null**. The loop runs over a copy of the elements taken when it starts.

```tb check_build check_run
Dim a As JsonArray = Json.Arr(1, Null, "x", Null)
Dim v As Variant
Dim nulls As Long
For Each v In a
    If IsNull(v) Then nulls += 1
Next
Debug.Print nulls                                         ' 2
```

## Properties

### Count
{: .no_toc }

The number of elements. A **Long**, read-only.

Syntax: *n* **=** *array***.Count**

### Item
{: .no_toc }

The element at an index. A **Variant**, the default member of the class.

Syntax: *value* **=** *array***.Item** ( *index* )

Syntax: *array***.Item** ( *index* ) **=** *value*

Syntax: **Set** *array***.Item** ( *index* ) **=** *value*

*index*
: *required* A **Long**, the position of the element. The first element has index 0.

*value*
: The value to store. Use **Set** for an object.

Reading returns the element. A JSON null is **Null**, and an element that is an object is returned itself, not a copy. An index below 0 or not below [**Count**](#count) returns **Empty** and sets the error `IndexOutOfRange`, with the message *Array index N is out of range.* and the pointer `/N` in `JsonError.Path`. Writing replaces an element; an index outside the array is the same error, so [**Add**](#add) is the way to append. Because **Item** is the default member, `array(index)` reads an element.

```tb check_build check_run
Dim a As JsonArray = Json.Arr("a")
a.Add "b"
a.Insert 1, "mid"
Debug.Print a.Dump(JsonOptions.Minified)                  ' ["a","mid","b"]
a.RemoveAt 0
Debug.Print a.Str(0)                                      ' mid
Debug.Print a.Str(9, "d")                                 ' d
Debug.Print JsonError.HasError                            ' False

Dim v As Variant = a.Item(9)
Debug.Print IsEmpty(v)                                    ' True
Debug.Print JsonError.Code                                ' IndexOutOfRange
Debug.Print JsonError.Message                             ' Array index 9 is out of range.
Debug.Print JsonError.Path                                ' /9
```

## Methods

### Add
{: .no_toc }

Appends an element.

Syntax: *array***.Add** ( *value* )

*value*
: *required* The value to append. An object is stored by reference.

### Arr
{: .no_toc }

Returns an element that is an array.

Syntax: *array***.Arr** ( *index* ) **As** [**JsonArray**](JsonArray)

*index*
: *required* A **Long**, the position of the element.

Returns the [**JsonArray**](JsonArray) itself, not a copy. Returns **Nothing** and sets the last error when the index is outside the array (`MissingKey`, *Missing array.*), or the element is not an array, a JSON null included (`WrongType`, *Expected array.*). An index outside an array is reported with the code `MissingKey` by this member, not with `IndexOutOfRange`, and `JsonError.Path` is the pointer `/9` for the index 9.

```tb check_build check_run
Dim a As JsonArray = Json.Arr(1)
Dim x As JsonArray = a.Arr(9)
Debug.Print JsonError.Code & ": " & JsonError.Message & " [" & JsonError.Path & "]"
Dim z As JsonArray = a.Arr(0)
Debug.Print JsonError.Code & ": " & JsonError.Message & " [" & JsonError.Path & "]"
' Output:
' MissingKey: Missing array. [/9]
' WrongType: Expected array. [/0]
```

### Bool
{: .no_toc }

Returns an element that is a Boolean.

Syntax: *array***.Bool** ( *index* [ , *default* ] ) **As Boolean**

*index*
: *required* A **Long**, the position of the element.

*default*
: *optional* A **Boolean**, the result when the index is outside the array or the element is a JSON null. **False**, the default.

Returns the element. An element that is not a **Boolean** returns *default* and sets the error `WrongType` (*Expected boolean.*).

### Clear
{: .no_toc }

Removes all elements.

Syntax: *array***.Clear**

### Clone
{: .no_toc }

Returns a deep copy of the array.

Syntax: *array***.Clone** ( ) **As** [**JsonArray**](JsonArray)

Every object and array inside the array is copied, so the copy shares no container with the original. See [**Json.Clone**](Json#clone) for a value of any type.

### Dump
{: .no_toc }

Returns the array as JSON text.

Syntax: *array***.Dump** ( [ *options* ] ) **As String**

*options*
: *optional* A [**JsonOptions**](JsonOptions) object. **Nothing**, the default, writes pretty-printed text, as [**JsonOptions.Pretty**](JsonOptions#pretty) does.

The result is that of [**Json.Serialize**](Json#serialize), and its errors are the same, with the origin `JsonArray.Dump`.

### Insert
{: .no_toc }

Inserts an element.

Syntax: *array***.Insert** ( *index*, *value* )

*index*
: *required* A **Long**, the position the new element takes. The elements from that position on move up by one. An index equal to [**Count**](#count) appends. An index below 0 or above **Count** is the error `IndexOutOfRange`.

*value*
: *required* The value to insert.

### Map
{: .no_toc }

Returns an element that is an object.

Syntax: *array***.Map** ( *index* ) **As** [**JsonObject**](JsonObject)

*index*
: *required* A **Long**, the position of the element.

Returns the [**JsonObject**](JsonObject) itself, not a copy. Returns **Nothing** and sets the last error when the index is outside the array (`MissingKey`, *Missing object.*), or the element is not an object, a JSON null included (`WrongType`, *Expected object.*).

```tb check_build check_run
Dim a As JsonArray = Json.Parse("[{""k"":1},[2,3]]")
Debug.Print a.Map(0).Num("k")                             ' 1
Debug.Print a.Arr(1).Count                                ' 2

Dim m As JsonObject = a.Map(1)
Debug.Print JsonError.Code                                ' WrongType
Set m = a.Map(5)
Debug.Print JsonError.Code                                ' MissingKey
Debug.Print JsonError.Message                             ' Missing object.
```

### Num
{: .no_toc }

Returns an element that is a number.

Syntax: *array***.Num** ( *index* [ , *default* ] ) **As Variant**

*index*
: *required* A **Long**, the position of the element.

*default*
: *optional* A **Variant**, the result when the index is outside the array or the element is a JSON null. When it is left out, the result is **Empty**.

Returns the number as a **Decimal**. An element that is not a number, a string of digits included, returns *default* and sets the error `WrongType` (*Expected number.*).

### RemoveAt
{: .no_toc }

Removes an element.

Syntax: *array***.RemoveAt** ( *index* )

*index*
: *required* A **Long**, the position of the element. The later elements move down by one. An index outside the array is the error `IndexOutOfRange`.

### Str
{: .no_toc }

Returns an element as a string.

Syntax: *array***.Str** ( *index* [ , *default* ] ) **As String**

*index*
: *required* A **Long**, the position of the element.

*default*
: *optional* A **String**, the result when the index is outside the array or the element is a JSON null. The empty string, the default.

Returns the string. An element that is a number or a **Boolean** is converted, as [**JsonObject.Str**](JsonObject#str) converts it. An element that is an object or an array returns *default* and sets the error `WrongType` (*Expected string.*).

### ToVariantArray
{: .no_toc }

Returns the elements as a **Variant** array.

Syntax: *array***.ToVariantArray** ( ) **As Variant()**

Returns a copy of the list of elements, with a lower bound of 0. Objects and arrays in it are the stored ones, not copies. The array is unbound when the array is empty.

```tb check_build check_run
Dim a As JsonArray = Json.Arr(1, 2)
Dim copy() As Variant = a.ToVariantArray()
Debug.Print UBound(copy) - LBound(copy) + 1               ' 2
a.Add 3
Debug.Print UBound(copy) - LBound(copy) + 1               ' 2
```

### TryGet
{: .no_toc }

Reads an element and returns whether the index is valid.

Syntax: *array***.TryGet** ( *index*, *value* ) **As Boolean**

*index*
: *required* A **Long**, the position of the element.

*value*
: *required* A **Variant** variable that receives the value. It is passed **ByRef**. When the index is outside the array it is **Empty**.

Returns **True** when the index is inside the array, even if the element is a JSON null. An index outside the array is not an error. The member clears the last error.

### ValueType
{: .no_toc }

Returns the JSON type of an element.

Syntax: *array***.ValueType** ( *index* ) **As** [**eJsonType**](Json#ejsontype)

*index*
: *required* A **Long**, the position of the element.

Returns **jtUnknown** for an index outside the array, and otherwise the type of the stored value, as [**Json.TypeOfValue**](Json#typeofvalue) reports it. The member does not change the last error.

## See Also

- [JsonObject](JsonObject) class -- the JSON object
- [Json](Json) module -- builds, parses and serializes values
- [JsonError](JsonError) class -- reports the last error
- [JsonOptions](JsonOptions) class -- the options of **Dump**
- [tsJson Package](.) -- the package
