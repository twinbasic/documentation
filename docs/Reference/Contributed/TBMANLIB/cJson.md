---
title: cJson
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cJson
has_toc: false
---

# cJson class
{: .no_toc }

A **cJson** holds one JSON document. [**Decode**](#decode) reads a document from text and [**LoadFrom**](#loadfrom) reads one from a file. [**Item**](#item), [**Items**](#items), [**NewItem**](#newitem) and [**NewItems**](#newitems) read and build it, and [**Encode**](#encode) and [**SaveTo**](#saveto) write it as text or to a file.

An object is created with `Dim J As New cJson`. The package also keeps one ready-made instance, [**TBMAN.Json**](TBMAN#json), which every part of a program shares.

```tb check_build check_run
Dim J As New cJson
J.Decode "{""name"":""Ann"",""age"":31,""tags"":[""a"",""b""]}"

Debug.Print J.Item("name")
Debug.Print J.Item("age") + 1
Debug.Print J.Item("tags")(2)

J.Item("age") = 32
Debug.Print J.Encode()
' Output:
' Ann
' 32
' b
' {"name":"Ann","age":32,"tags":["a","b"]}
```

* TOC
{:toc}

## How the document is held

<!-- test: JsonTests.Decode_ObjectAndArray_AreHeldInTheirOwnFields, JsonTests.Decode_NumberOf16Characters_IsReturnedAsText -->
The top level of a JSON text is an object or an array, and a **cJson** keeps each in a field of its own:

- [**RootItem**](#rootitem) is a **Scripting.Dictionary**, which holds a JSON object. Its keys are the names of the object, in the order they were added, and letter case matters.
- [**RootItems**](#rootitems) is a **Collection**, which holds a JSON array. Its items are numbered from 1.

Inside the document, a nested object is another **Scripting.Dictionary** and a nested array is another **Collection**. A JSON string is a **String**, a number is a **Double**, `true` and `false` are **Boolean** values and `null` is **Null**. A number whose text is 16 or more characters long (17 or more with a decimal point) is returned as a **String** instead, so that no digits are lost; [`ToolsJsonVba.JsonOptions`](ToolsJsonVba#jsonoptions) changes that. The parsing and writing are done by [**ToolsJsonVba**](ToolsJsonVba), the VBA-JSON code.

A new **cJson** holds an empty object. Only one of the two fields is meant to hold data at a time. [**Root**](#root) returns **RootItems** when it has items and **RootItem** when it has none, and [**Encode**](#encode) with no argument writes **RootItem** when it has entries and **RootItems** only when it has none.
<!-- /test -->

## Properties

### Item
{: .no_toc }

Reads or writes the value stored under a name in [**RootItem**](#rootitem).

Syntax: *object*.**Item** ( *Key* ) [ **=** *value* ]

*Key*
: *required* A **String**, the name in the JSON object.

Reading returns a **Variant**. For a name that is not in the object, the result is **Empty**; no error is raised and no entry is added. A nested object or array is returned as an object.

Assigning a value stores it under the name, and replaces the value the name had. An object value, such as another **Scripting.Dictionary**, is stored with **Set**. Names are compared with letter case.

```tb check_build check_run
Dim J As New cJson
Dim Home As New cJson
Home.Item("city") = "Oslo"

J.Item("name") = "Ann"
Set J.Item("home") = Home.Root
Debug.Print J.Encode()
Debug.Print "[" & J.Item("missing") & "]"
' Output:
' {"name":"Ann","home":{"city":"Oslo"}}
' []
```

### Items
{: .no_toc }

Reads an item of [**RootItems**](#rootitems), or adds one to it.

Syntax: *object*.**Items** ( *Index* ) [ **=** *value* ]

*Index*
: *required* A **Long**, the position of the item, counted from 1.

Reading returns a **Variant**, an object for a nested object or array. If *Index* is greater than the number of items, the result is **Empty**. A position of 0 or less is not checked, and the **Collection** raises its own error.

Assigning a value, with or without **Set**, adds it as a new item at the end of **RootItems**; see the warning below.

<!-- test: JsonTests.Items_Assignment_ReplacesTheItemAtTheIndex -->
> [!WARNING] 1.0.0.29
> An assignment to **Items** does not replace the item at *Index*. It adds the value as a new last item, whatever *Index* is, and an *Index* beyond the end does not leave a gap: `J.Items(1) = 5` on `[1,2]` gives `[1,2,5]`. A value that is an object, such as a **Scripting.Dictionary** or another **Collection**, is added as a nested object or array.

```tb check_build check_run
Dim J As New cJson
J.Decode "[1,2]"
J.Items(1) = 5
Debug.Print J.Encode()
J.Items(9) = "x"
Set J.Items(1) = New Collection
Debug.Print J.Encode()
Debug.Print J.Items(2)
' Output:
' [1,2,5]
' [1,2,5,"x",[]]
' 2
```

### LastError
{: .no_toc }

<!-- test: JsonTests.LastError_IsNeverSet -->
A **String** that is meant to hold the text of the last error. [**Clear**](#clear), [**Decode**](#decode) and [**Encode**](#encode) set it to an empty string, and no member of the class stores a message in it: [**Decode**](#decode) raises its errors instead. The field stays empty unless a program assigns to it.

### LastSuccess
{: .no_toc }

Returns **True** when [**LastError**](#lasterror) is empty. Because nothing stores a message in **LastError**, it is always **True**.
<!-- /test -->

### Root
{: .no_toc }

Returns the document as an object: [**RootItems**](#rootitems) if it has at least one item, otherwise [**RootItem**](#rootitem).

Syntax: *object*.**Root**

**Root** is the default member of the class, so `J("name")` is `J.Root("name")`.
### RootIsArray
{: .no_toc }

Returns **True** when [**RootItems**](#rootitems) has at least one item.

### RootIsEmpty
{: .no_toc }

Returns **True** when both [**RootItems**](#rootitems) and [**RootItem**](#rootitem) are empty.

### RootItem
{: .no_toc }

The **Scripting.Dictionary** that holds a JSON object. A field, declared `Public RootItem As New Scripting.Dictionary`, so the dictionary is created the first time it is used. [**Decode**](#decode) replaces it when the text begins with `{`, and [**Clear**](#clear) releases it. After **Clear** the dictionary is created again the next time it is used, so `J.Item("a") = 1` works on a cleared object.

### RootItems
{: .no_toc }

The **Collection** that holds a JSON array. A field, declared `Public RootItems As New Collection`. [**Decode**](#decode) replaces it when the text begins with `[`, and [**NewItem**](#newitem) and [**NewItems**](#newitems) add to it.

### RootText
{: .no_toc }

A **String** field. It holds the text that [**Decode**](#decode) was given (with the spaces at both ends removed) or the text that [**Encode**](#encode) last produced. [**Clear**](#clear) empties it.

### WhiteSpaceSet
{: .no_toc }

A **Variant** field, empty by default. When it is set, [**Encode**](#encode) and [**SaveTo**](#saveto) use it as their *Whitespace* argument whenever the argument is left out. Set it to an **Integer** to indent by that many spaces for each level, or to a **String** to indent with the first character of the string. See [ConvertToJson](../VBA_JSON/JsonConverter/ConvertToJson) for the layout.

## Methods

### Clear
{: .no_toc }

Empties the document.

Syntax: *object*.**Clear**

<!-- test: JsonTests.Clear_EmptiesTheDocumentAndTheFieldsWorkAgain -->
Sets [**RootText**](#roottext) and [**LastError**](#lasterror) to empty strings, and releases [**RootItem**](#rootitem) and [**RootItems**](#rootitems).
<!-- /test -->

Call **Clear** before [**Decode**](#decode) when the object held another document; see the note at **Decode**.

### Decode
{: .no_toc }

Reads a JSON text into the document.

Syntax: *object*.**Decode** ( *Text* ) **As cJson**

*Text*
: *required* A **String** that holds JSON. It is passed by reference. The spaces at both ends are removed first, and the result is stored in [**RootText**](#roottext). The text must then begin with `{` or `[`.

Returns the object itself, so a call can be followed by a member: `J.Decode(Text).Item("name")`.

A text that begins with `{` replaces [**RootItem**](#rootitem), and a text that begins with `[` replaces [**RootItems**](#rootitems).

<!-- test: JsonTests.Decode_EmptyText_ChangesNothing -->
An empty text changes nothing in the document.
<!-- /test -->

<!-- test: JsonTests.Decode_ObjectAfterArray_ReplacesTheDocument, JsonTests.Decode_ArrayAfterObject_EncodeWritesTheArray -->
> [!NOTE] 1.0.0.29
> Only the field that matches the text is replaced, and the other one keeps what it held. After an array and then an object, [**Root**](#root) still returns the array, and after an object and then an array, [**Encode**](#encode) with no argument still writes the object. Call [**Clear**](#clear) before decoding a document into an object that held another.

<!-- test: JsonTests.Decode_WhiteSpaceBeforeArray_ReadsTheArray -->
> [!NOTE] 1.0.0.29
> Only spaces are removed from the start of the text before it is checked for `[`. A text that has a line break or a tab in front of its `[` is taken for an object, and the array that it holds cannot be stored in **RootItem**: the call raises the error *No such interface supported* (-2147467262), with the source `DECODE`.

```tb check_build check_run
Dim J As New cJson
On Error Resume Next
J.Decode vbCrLf & "[1,2]"
Debug.Print Err.Number & " " & Err.Source
Err.Clear
J.Decode "[1,2]"
Debug.Print Err.Number & " " & J.Items(2)
' Output:
' -2147467262 DECODE
' 0 2
```

<!-- test: JsonTests.Decode_SyntaxError_RaisesWithTheSourceDecode -->
If the text cannot be read, **Decode** raises the error again with the same number (10001 for a syntax error), the source `DECODE`, and the description of the parser followed by `#` and the whole text. The parser is that of [ParseJson](../VBA_JSON/JsonConverter/ParseJson).

```tb check_build check_run
Dim J As New cJson
On Error Resume Next
J.Decode "{""a"" 1}"
Debug.Print Err.Number & " " & Err.Source
' Output:
' 10001 DECODE
```
<!-- /test -->

<!-- test: JsonTests.Decode_MissingComma_Raises, JsonTests.Decode_TextAfterTheDocument_Raises -->
> [!NOTE] 1.0.0.29
> The parser accepts text that is not JSON. It does not check for a comma between the items of an object or an array, and it ignores text after the closing bracket of the value: `{"a":1 "b":2}`, `[1 2]` and `{"a":1} garbage` are all read without an error.

### Encode
{: .no_toc }

Writes a document as JSON text.

Syntax: *object*.**Encode** ( [ *Obj* ] [ **,** *Whitespace* ] [ **,** *FromUnicode* ] ) **As String**

*Obj*
: *optional* The value to write: a **Scripting.Dictionary**, a **Collection** or another **cJson** (its **Root** is written). If it is left out, the object's own document is written. A value that is not an object is not converted: it is stored in [**RootText**](#roottext) as its text, with no quotation marks, and returned. An array is not an object either, and raises error 13, *Type mismatch*.

*Whitespace*
: *optional* A **Variant**. An **Integer** indents each level by that many spaces, and a **String** indents with its first character, repeated once for each level. If it is left out, [**WhiteSpaceSet**](#whitespaceset) is used when it is set, and otherwise the text has no extra white space.

*FromUnicode*
: *optional* A **Boolean**, **False** by default. See below.

The text is built by [ConvertToJson](../VBA_JSON/JsonConverter/ConvertToJson) and also stored in [**RootText**](#roottext). Non-ASCII characters and control characters are written as `\uXXXX` escapes, so the text is ASCII. With *FromUnicode* set to **True**, every `\uXXXX` in the text is turned back into the character it names, and the result holds the characters themselves.

<!-- test: JsonTests.Encode_EmptyDocument_IsWrittenAsEmptyBraces, JsonTests.Encode_DocumentEmptiedAfterAnEncode_IsNotTheOldText -->
> [!WARNING] 1.0.0.29
> A value that has no items is not written as `{}` or `[]`. Nothing is converted, and the function returns [**RootText**](#roottext) as it was: an empty string for a new or cleared object, and, for a document whose items were removed after an earlier call, the text of that call, which no longer matches the document.

<!-- test: JsonTests.Encode_FromUnicode_BackslashThenU_IsNotAnEscape, JsonTests.Encode_FromUnicode_ControlCharacter_StaysEscaped, HttpRequestTests.RequestDataJson_ValueWithBackslashU_IsSent -->
> [!WARNING] 1.0.0.29
> With *FromUnicode* set to **True**, the conversion looks for the two characters `\u` anywhere in the text, without regard for the escape that comes before them. A value that holds a backslash followed by the letter `u`, such as `C:\users`, is written by the converter as `C:\\users`, and the conversion meets `\u` in it and tries to read `sers` as four hexadecimal digits. That raises error 13.
>
> Control characters other than tab, line feed, carriage return, backspace and form feed also come back as the raw characters, which are not valid in JSON text.

```tb check_build check_run
Dim J As New cJson
J.Item("p") = "C:\users"
Debug.Print J.Encode()
On Error Resume Next
Debug.Print J.Encode(, , True)
Debug.Print Err.Number
On Error GoTo 0

J.Clear
J.Item("c") = Chr$(1)
Debug.Print AscW(Mid$(J.Encode(, , True), 7, 1))
' Output:
' {"p":"C:\\users"}
' 13
' 1
```

<!-- test: JsonTests.Encode_Whitespace_IndentsByLevel, JsonTests.Encode_NonAscii_IsWrittenAsEscapeAndFromUnicodeReadsItBack, JsonTests.Encode_NonObjectValue_IsStoredAsText -->
```tb check_build check_run
Dim J As New cJson
J.Decode "{""a"":[1,2]}"
Debug.Print Replace(J.Encode(, 2), vbCrLf, "|")

J.Clear
J.Item("word") = "caf" & ChrW(233)
Debug.Print J.Encode()
Debug.Print J.Encode(, , True) = "{""word"":""caf" & ChrW(233) & """}"
' Output:
' {|  "a": [|    1,|    2|  ]|}
' {"word":"caf\u00E9"}
' True
```
<!-- /test -->

### LoadFrom
{: .no_toc }

Reads a JSON file into the document.

Syntax: *object*.**LoadFrom** ( *Path* [ **,** *CharSet* ] ) **As cJson**

*Path*
: *required* A **String**, the file to read. It is used as written: a name without a folder is looked for in the current folder of the program. (This differs from [**SaveTo**](#saveto), which puts a name without a drive in the program's own folder.)

*CharSet*
: *optional* A **String**, the name of the character set of the file, `UTF-8` by default. It is passed to an ADODB.Stream, so it can be any name that the stream accepts. A byte order mark at the start of a UTF-8 file is not part of the text.

The file is read by [**ToolsStream.LoadFileAsText**](cToolsStream#loadfileastext) and the text goes to [**Decode**](#decode), so its rules and errors apply. Returns the object itself.

<!-- test: JsonTests.LoadFrom_AfterLoadFrom_ReadsTheFile, JsonTests.LoadFrom_AfterSaveTo_ReadsTheFile, JsonTests.LoadFrom_AfterFailedLoadFrom_ReadsTheFile -->
> [!WARNING] 1.0.0.29
> **ToolsStream.LoadFileAsText** leaves the shared stream open, and raises error 3705, *Operation is not allowed when the object is open*, when it finds it open. A **LoadFrom** therefore fails after any earlier **LoadFrom** or [**SaveTo**](#saveto) of the program, and after a file that could not be opened. See [**cToolsStream**](cToolsStream). `ToolsStream.Inst.Close` after each call makes the next one work.

### NewItem
{: .no_toc }

Adds a new JSON object to the document and returns it for filling.

Syntax: *object*.**NewItem** ( [ *ParentKey* ] ) **As cJson**

*ParentKey*
: *optional* A **String**. If it is left out, the new object becomes the next item of [**RootItems**](#rootitems), an element of the array. If it is given, the new object is stored in [**RootItem**](#rootitem) under that name.

<!-- test: JsonTests.NewItem_NewItems_BuildNestedObjectsAndArrays -->
Returns a new **cJson**. The object that it holds in its **RootItem** is the one that was added, so setting values on the returned object changes the document it was made for.

```tb check_build check_run
Dim J As New cJson
Dim Home As cJson
J.Item("name") = "Ann"
Set Home = J.NewItem("home")
Home.Item("city") = "Oslo"
Debug.Print J.Encode()

Dim List As New cJson
Dim Row As cJson
Set Row = List.NewItem()
Row.Item("id") = 1
Set Row = List.NewItem()
Row.Item("id") = 2
Debug.Print List.Encode()
' Output:
' {"name":"Ann","home":{"city":"Oslo"}}
' [{"id":1},{"id":2}]
```
<!-- /test -->

### NewItems
{: .no_toc }

Adds a new JSON array to the document and returns it for filling.

Syntax: *object*.**NewItems** ( [ *ParentKey* ] ) **As cJson**

*ParentKey*
: *optional* A **String**. If it is left out, the new array becomes the next item of [**RootItems**](#rootitems), an array inside an array. If it is given, the new array is stored in [**RootItem**](#rootitem) under that name.

Returns a new **cJson** whose [**RootItems**](#rootitems) is the array that was added. Add items to it with `Add`, or with **NewItem** on the returned object.

```tb check_build check_run
Dim J As New cJson
Dim Tags As cJson
Set Tags = J.NewItems("tags")
Tags.RootItems.Add "a"
Tags.RootItems.Add "b"
Debug.Print J.Encode()
' Output:
' {"tags":["a","b"]}
```

### SaveTo
{: .no_toc }

Writes the document to a file and returns the text written.

Syntax: *object*.**SaveTo** ( *FileName* [ **,** *CharSet* ] [ **,** *Whitespace* ] [ **,** *FromUnicode* ] ) **As String**

*FileName*
: *required* A **String**, the file to write. A name that does not contain `:\` is taken to be relative and gets the folder of the program (`App.Path`) and a backslash in front. Forward slashes become backslashes, and the folders of the path are created if they are missing. See [**AutoCompleteFullPath**](ToolsFso#autocompletefullpath). A path with a drive that is written with forward slashes, such as `C:/data/a.json`, has no `:\` and is treated as relative.

*CharSet*
: *optional* A **String**, the name of the character set, `UTF-8` by default. The file is written by [**ToolsStream.SaveFileAsText**](cToolsStream#savefileastext), which replaces a file that exists.

*Whitespace*
: *optional* A **Variant**; as for [**Encode**](#encode).

*FromUnicode*
: *optional* A **Boolean**; as for [**Encode**](#encode). With the default of **False** the file holds only ASCII characters, because non-ASCII characters are written as `\uXXXX`.

The text is made by [**Encode**](#encode) of the object's [**Root**](#root), so the rules of that method apply, among them that an empty document writes the text of an earlier call. The function returns the text that it wrote to the file. A file written with the character set `UTF-8` begins with the byte order mark EF BB BF.

<!-- test: JsonTests.SaveTo_SecondShorterDocument_WritesValidJson -->
> [!WARNING] 1.0.0.29
> **ToolsStream.SaveFileAsText** leaves the shared stream open and, when it finds it open, writes over the text that is still in it. After a first **SaveTo**, a second one with a shorter document, in the same or another file, writes the new text with the end of the old text after it, which is not valid JSON: saving `{"a":"long long"}` and then `{"b":1}` leaves `{"b":1}ong long"}` in the second file. No error is raised. See [**cToolsStream**](cToolsStream). `ToolsStream.Inst.Close` after each call avoids it.

<!-- test: JsonTests.SaveTo_ThenLoadFrom_RoundTripsNonAscii -->
```tb check_build check_run
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs\sample.json"

Dim J As New cJson
Dim K As New cJson
J.Item("word") = "caf" & ChrW(233)
Debug.Print J.SaveTo(Path)
ToolsStream.Inst.Close

K.LoadFrom Path
ToolsStream.Inst.Close
Debug.Print AscW(Right$(K.Item("word"), 1))

Kill Path
RmDir Environ$("TEMP") & "\tbmanlib-docs"
' Output:
' {"word":"caf\u00E9"}
' 233
```
<!-- /test -->

### ToArray
{: .no_toc }

Returns the object of the document in an array.

Syntax: *object*.**ToArray** ( ) **As Variant**

<!-- test: JsonTests.ToArray_ObjectDocument_ReturnsOneElementArray -->
If [**RootItem**](#rootitem) has entries, the result is an array of one element that holds that **Scripting.Dictionary**. In every other case, including a document held in [**RootItems**](#rootitems), the result is **Empty**.
<!-- /test -->

## See Also

- [TBMAN](TBMAN) module -- the shared instance **TBMAN.Json**
- [ToolsJsonVba](ToolsJsonVba) module -- the parser and writer behind **Decode** and **Encode**
- [cToolsStream](cToolsStream) class -- reads and writes the files for **LoadFrom** and **SaveTo**
- [cToolsStr](cToolsStr) class -- the `\uXXXX` conversion of **Encode**
- [JsonConverter](../VBA_JSON/JsonConverter/) module -- the same parser and writer, in the VBA_JSON package
- [TBMANLIB](.) package -- overview
