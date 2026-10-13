---
title: mXml
parent: TBMANLIB_Xml Package
permalink: /tB/Packages/Contributed/TBMANLIB_Xml/mXml
has_toc: false
---

# mXml module
{: .no_toc }

The **mXml** module holds the enumerations, the constants and the two UTF-8 conversion functions of the package. The [**cXml**](cXml) and [**cXmlNode**](cXmlNode) classes use them, and so can a program: the members are public, and a program reaches one by its own name (`XmlNodeType.Element`, `ERR_BASE`, `StringToUTF8Bytes`) or with the module's name in front (`mXml.XmlNodeType.Element`).

```tb check_build check_run
Dim x As New cXml
x.Parse "<r>text</r>"

Debug.Print x.RootElement.ChildNodes(1).NodeType = XmlNodeType.Text
Debug.Print mXml.DEFAULT_ENCODING
' Output:
' True
' UTF-8
```

* TOC
{:toc}

## Enumerations

### XmlNodeType
{: .no_toc }

The kind of a [**cXmlNode**](cXmlNode). The numbers are those of the node types of the W3C Document Object Model.

| Member | Value | Used for |
|:-------|------:|:---------|
| **None** | 0 | a node made with `New cXmlNode`, before its kind is set |
| **Element** | 1 | an element |
| **Attribute** | 2 | nothing: attributes are held in the **Attributes** field of their element |
| **Text** | 3 | text |
| **CData** | 4 | a CDATA section |
| **Comment** | 8 | a comment |
| **Document** | 9 | the document node |
| **DocumentFragment** | 11 | nothing |
| **Notation** | 12 | nothing |

The parser creates nodes of the kinds **Document**, **Element**, **Text**, **CData** and **Comment**. [**ToXmlString**](cXml#toxmlstring) writes those five kinds and leaves out a node of any other kind.

### ParseOption
{: .no_toc }

Four flags whose names describe options of a parser.

| Member | Value |
|:-------|------:|
| **None** | 0 |
| **PreserveWhitespace** | 1 |
| **IgnoreComments** | 2 |
| **IgnoreProcessingInstructions** | 4 |
| **ValidateOnParse** | 8 |

Nothing in version 1.0.0.1 of the package reads a **ParseOption**: [**Parse**](cXml#parse) and the other members that read XML take no such parameter. They always leave out text that is only spaces, always keep text that has a line break in it, always create nodes for comments and always skip processing instructions, and no member checks the text while it reads it.

## Constants

### ERR_BASE
{: .no_toc }

The base of the package's error numbers.

Syntax: **ERR_BASE** **As Long**

`vbObjectError + 5000`, which is -2147216504. The other error numbers are **ERR_BASE** plus 1 to 6. See [Reporting failures](cXml#reporting-failures) for how the numbers reach a program.

### ERR_INVALID_XML
{: .no_toc }

Syntax: **ERR_INVALID_XML** **As Long**

`ERR_BASE + 1`, which is -2147216503. No member of the package raises it.

### ERR_INVALID_NODE
{: .no_toc }

Syntax: **ERR_INVALID_NODE** **As Long**

`ERR_BASE + 2`, which is -2147216502. No member of the package raises it.

### ERR_NODE_NOT_FOUND
{: .no_toc }

Syntax: **ERR_NODE_NOT_FOUND** **As Long**

`ERR_BASE + 3`, which is -2147216501. No member of the package raises it: a path that selects nothing gives **Nothing**, an empty string or **False**.

### ERR_ATTRIBUTE_NOT_FOUND
{: .no_toc }

Syntax: **ERR_ATTRIBUTE_NOT_FOUND** **As Long**

`ERR_BASE + 4`, which is -2147216500. No member of the package raises it: a missing attribute gives an empty string.

### ERR_EMPTY_DOCUMENT
{: .no_toc }

Syntax: **ERR_EMPTY_DOCUMENT** **As Long**

`ERR_BASE + 5`, which is -2147216499. [**Parse**](cXml#parse) raises it, with the description `XML string cannot be empty`, when it is given an empty string, and [**SelectElement**](cXml#selectelement) raises it, with the description `Document not initialized`, when the document has not been read or created. Both members handle the error themselves, so a program sees a **False** or a **Nothing**, and finds the number in the **Err** object after the call.

```tb check_build check_run
Dim x As New cXml

Err.Clear
Debug.Print x.Parse("")
Debug.Print Err.Number = ERR_EMPTY_DOCUMENT
Debug.Print Err.Description
' Output:
' Parse failed: XML string cannot be empty
' False
' True
' XML string cannot be empty
```

The first line of the output is the one that a failing member writes to the Debug Console; [Reporting failures](cXml#reporting-failures) describes it.

### ERR_INVALID_OPERATION
{: .no_toc }

Syntax: **ERR_INVALID_OPERATION** **As Long**

`ERR_BASE + 6`, which is -2147216498. No member of the package raises it.

### DEFAULT_XML_VERSION
{: .no_toc }

Syntax: **DEFAULT_XML_VERSION** **As String**

The string `1.0`. A new [**cXml**](cXml) object has it as its [**Version**](cXml#version).

### DEFAULT_ENCODING
{: .no_toc }

Syntax: **DEFAULT_ENCODING** **As String**

The string `UTF-8`. A new [**cXml**](cXml) object has it as its [**Encoding**](cXml#encoding).

### DEFAULT_INDENT
{: .no_toc }

Syntax: **DEFAULT_INDENT** **As String**

Two space characters. No member reads it: the default of the *indent* parameter of [**ToXmlString**](cXml#toxmlstring) is the same two spaces, written there as a literal.

## Functions

### StringToUTF8Bytes
{: .no_toc }

Converts a string to the bytes of its UTF-8 form.

Syntax: **StringToUTF8Bytes** ( *str* ) **As Byte()**

*str*
: *required* A **String**.

Returns a **Byte** array that starts at index 0 and holds the UTF-8 encoding of *str*, with no byte order mark and no terminating zero byte. A character outside the Basic Multilingual Plane, held in *str* as a surrogate pair, becomes one four-byte sequence.

For an empty string the array has one element, which holds 0, so a program cannot tell the result from the encoding of a single `ChrW(0)`.

[**SaveToFile**](cXml#savetofile) uses the function to write a file.

```tb check_build check_run
Dim b() As Byte
b = StringToUTF8Bytes("A" & ChrW(233) & ChrW(&H20AC))

Dim i As Long
Dim s As String
For i = 0 To UBound(b)
    s = s & Right$("0" & Hex$(b(i)), 2) & " "
Next
Debug.Print Trim$(s)

Dim e() As Byte
e = StringToUTF8Bytes("")
Debug.Print UBound(e) & " " & e(0)
' Output:
' 41 C3 A9 E2 82 AC
' 0 0
```

### UTF8BytesToString
{: .no_toc }

Converts UTF-8 bytes to a string.

Syntax: **UTF8BytesToString** ( *utf8Bytes* ) **As String**

*utf8Bytes*
: *required* A **Byte** array, passed by reference, so the argument is an array variable and not an expression. The array may start at any index.

Returns the characters that the bytes encode. An array that has never been given elements gives an empty string. A byte sequence that is not valid UTF-8 becomes the character U+FFFD, and a zero byte becomes `ChrW(0)`, so the one-element array that [**StringToUTF8Bytes**](#stringtoutf8bytes) returns for an empty string gives a string of length 1. A byte order mark, the bytes `EF BB BF`, becomes the character U+FEFF and is kept.

[**LoadFromFile**](cXml#loadfromfile) uses the function to read a file.

```tb check_build check_run
Dim b() As Byte
b = StringToUTF8Bytes("caf" & ChrW(233))
Debug.Print UTF8BytesToString(b) = "caf" & ChrW(233)

ReDim b(0 To 1)
b(0) = &HC3
b(1) = &H28
Dim s As String
s = UTF8BytesToString(b)
Debug.Print Hex$(AscW(s) And &HFFFF&) & " " & Mid$(s, 2)

Dim unsized() As Byte
Debug.Print Len(UTF8BytesToString(unsized))
' Output:
' True
' FFFD (
' 0
```

## See Also

- [cXml](cXml) class -- uses the enumerations, the constants and the functions
- [cXmlNode](cXmlNode) class -- has the **NodeType** field of type **XmlNodeType**
- [TBMANLIB_Xml](.) package -- overview
