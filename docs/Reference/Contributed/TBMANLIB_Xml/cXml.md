---
title: cXml
parent: TBMANLIB_Xml Package
permalink: /tB/Packages/Contributed/TBMANLIB_Xml/cXml
has_toc: false
---

# cXml class
{: .no_toc }

A **cXml** holds one XML document. It reads the document from a string or a file, or starts a new one with a root element. It finds, reads and changes elements and attributes by a path such as `library/book`, and writes the document back as a string or a file. The [**XPath**](#xpath) methods find nodes by an XPath expression, in the subset that the [**mXPath**](mXPath) module reads. The elements, text and comments of the document are [**cXmlNode**](cXmlNode) objects, which the [**Document**](#document) and [**RootElement**](#rootelement) properties and the search methods return.

An object is created with `Dim x As New cXml`. A new object holds no document. [**Parse**](#parse), [**LoadFromFile**](#loadfromfile), [**CreateNew**](#createnew) or the [**XmlString**](#xmlstring) property gives it one, and until then the members that take a path find nothing.

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id=""1"">Dune</book><book id=""2"">Emma</book></library>"

Debug.Print x.GetElementText("library/book")
Debug.Print x.GetAttribute("library/book", "id")
Debug.Print x.SelectElements("book").Count

x.AddElement "library", "note"
x.SetElementText "library/note", "checked"
Debug.Print x.ToXmlString(False)
' Output:
' Dune
' 1
' 2
' <library><book id="1">Dune</book><book id="2">Emma</book><note>checked</note></library>
```

> [!WARNING] 1.0.0.1
> The parser reads some valid XML wrongly and raises no error: a self-closing element, `&amp;` and other entities in text, a tag that uses both kinds of quote or has a line break between its attributes, and a processing instruction. A comment, a CDATA section or a DOCTYPE declaration in the wrong place makes **Parse** loop forever. [Defects in version 1.0.0.1](#defects) lists each case.

* TOC
{:toc}

## Paths
{: #paths }

The members that take an *xpath* parameter find an element by a path: [**SelectElement**](#selectelement), [**GetElementText**](#getelementtext), [**SetElementText**](#setelementtext), [**GetAttribute**](#getattribute), [**SetAttribute**](#setattribute), [**RemoveAttribute**](#removeattribute) and [**RemoveElement**](#removeelement), and [**AddElement**](#addelement) for its *parentXPath*. The name of the parameter is misleading: the syntax is a small one of the package's own and is not XPath. The [**XPath**](#xpath) methods read XPath expressions.

- A path is a list of names separated by `/`, such as `library/book`. The search starts at the document node, so the first name is the name of the root element: `library/book` finds a book, and `book` finds nothing.
- Each name selects the first child, of the node found so far, whose name equals it. Letter case is ignored. Only direct children count, and when several children have the name, the first one is taken.
- White space around a name is removed, and an empty name is ignored. `/library//book` and ` library / book ` both mean `library/book`.
- A name is compared as a whole, so a namespace prefix is part of it: `ns:item` is the name of an element written `<ns:item>`. The package does no namespace processing.
- Nothing else has a meaning. A position (`book[2]`), an attribute (`@id`), `*`, `.` and `..` are names that no element has, so the path selects nothing. `//book` does not search at any depth: the empty name is ignored, and the path means `book`. [**SelectElements**](#selectelements) searches at any depth, and the **ChildNodes** of a node reach the other children. The [**XPath**](#xpath) methods read positions, attribute tests, `*`, `.` and `//`.
- The nodes that are not elements have names too, `#text`, `#comment` and `#cdata-section`, and a path can select them: `library/#comment` is the first comment directly inside the root element.
- A path with no name, an empty string or `/`, selects nothing, and the Debug Console shows `SelectElement failed: Subscript out of range`.

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id=""1"">Dune</book><book id=""2"">Emma</book></library>"

Debug.Print "[" & x.GetElementText("book") & "]"
Debug.Print "[" & x.GetElementText("library/book") & "]"
Debug.Print "[" & x.GetElementText("/LIBRARY/Book") & "]"
Debug.Print "[" & x.GetElementText(" library // book ") & "]"
Debug.Print "[" & x.GetElementText("library/book[2]") & "]"
' Output:
' []
' [Dune]
' [Dune]
' [Dune]
' []
```

To reach the second book, [**SelectElements**](#selectelements) returns every book, or the **ChildNodes** of the parent can be searched:

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id=""1"">Dune</book><book id=""2"">Emma</book></library>"

Dim books As Collection
Set books = x.SelectElements("book")
Debug.Print books(2).GetAttribute("id") & " " & books(2).ChildNodes(1).Value

Dim children As Collection
Set children = x.RootElement.GetChildNodesByName("book")
Debug.Print children(2).GetAttribute("id")
' Output:
' 2 Emma
' 2
```

## Reporting failures
{: #reporting-failures }

A member that cannot do its work returns a value that says so, and does not stop the program. [**Parse**](#parse), [**LoadFromFile**](#loadfromfile), [**SaveToFile**](#savetofile), [**Validate**](#validate) and [**RemoveElement**](#removeelement) return **False**. [**SelectElement**](#selectelement), [**AddElement**](#addelement) and [**XPathSingle**](#xpathsingle) return **Nothing**. [**GetElementText**](#getelementtext), [**GetAttribute**](#getattribute), [**XPathText**](#xpathtext) and [**XPathAttribute**](#xpathattribute) return an empty string, and [**SelectElements**](#selectelements), [**XPath**](#xpath) and [**XPathFromRoot**](#xpathfromroot) an empty collection. A method that returns nothing, such as [**SetAttribute**](#setattribute), does nothing.

When an error causes the failure, the member also:

- writes a line to the Debug Console that names the member and gives the error's description, such as `Parse failed: XML string cannot be empty` or `SelectElement failed: Document not initialized`. In a built executable, **Debug.Print** writes nothing (see [**Debug**](../../../Modules/Debug)), so the line appears in the IDE only;
- leaves the error in the **Err** object. After the call returns, **Err.Number**, **Err.Source** and **Err.Description** describe it. A program reads them straight after the call, because the next call of most members clears them, and calls `Err.Clear` before the call so that an earlier error does not remain in them.

The errors that occur are [**ERR_EMPTY_DOCUMENT**](mXml#err_empty_document), which [**Parse**](#parse) raises for an empty string and [**SelectElement**](#selectelement) for a document that has not been read or created, and the errors of the Visual Basic runtime that the code meets while it works: 5 (*Invalid procedure call or argument*) for a tag cut off by the end of the text, 9 (*Subscript out of range*) for a path with no name, and 91 (*Object variable or With block variable not set*) in [**RemoveElement**](#removeelement) for a path that selects nothing. The XPath members meet error 6 (*Overflow*) for a position too large for a **Long**, and write `XPath query failed:`, `XPathSingle query failed:` or `XPathFromRoot query failed:` and the description. The other error constants of [**mXml**](mXml#constants) are not used.

The members that let an error reach the program are [**XmlString**](#xmlstring), [**ToXmlString**](#toxmlstring) and [**Merge**](#merge).

```tb check_build check_run
Dim x As New cXml

Err.Clear
Debug.Print x.Parse("")
Debug.Print Err.Number = ERR_EMPTY_DOCUMENT
Debug.Print Err.Source & ": " & Err.Description

Err.Clear
Debug.Print (x.SelectElement("library") Is Nothing)
Debug.Print Err.Number = ERR_EMPTY_DOCUMENT
' Output:
' Parse failed: XML string cannot be empty
' False
' True
' cXml.Parse: XML string cannot be empty
' SelectElement failed: Document not initialized
' True
' True
```

## Properties

### Document
{: .no_toc }

Returns the document node.

Syntax: *object*.**Document** **As cXmlNode**

*object*
: *required* An object expression that evaluates to a **cXml**.

Read-only. The node has the **NodeType** **Document** and the **Name** `#document`. Its **ChildNodes** hold the root element and any comments and text outside it, in document order. Text that is only spaces is not kept, and text that has a line break or a tab in it is. A new object holds an empty document node. [**Parse**](#parse), [**LoadFromFile**](#loadfromfile), [**CreateNew**](#createnew) and [**XmlString**](#xmlstring) replace it.

```tb check_build check_run
Dim x As New cXml
x.Parse "<!-- top --><r></r>"

Debug.Print x.Document.Name & " " & x.Document.NodeType
Dim n As cXmlNode
For Each n In x.Document.ChildNodes
    Debug.Print n.Name
Next
' Output:
' #document 9
' #comment
' r
```

### Encoding
{: .no_toc }

Returns or sets the encoding name that the XML declaration states.

Syntax: *object*.**Encoding** [ **=** *value* ]

*object*
: *required* An object expression that evaluates to a **cXml**.

A **String**. The default is `UTF-8`, the value of [**DEFAULT_ENCODING**](mXml#default_encoding). [**ToXmlString**](#toxmlstring) and [**SaveToFile**](#savetofile) write it into the declaration. [**Parse**](#parse) and [**LoadFromFile**](#loadfromfile) set it from the `encoding` of the declaration of the text they read, when the declaration has one written with double quotes. Without one, the property keeps the value it had, which is the value of an earlier document if the object read one. [**CreateNew**](#createnew) leaves it as it is.

The property is a label. [**SaveToFile**](#savetofile) always writes UTF-8 and [**LoadFromFile**](#loadfromfile) always reads UTF-8, whatever the label says.

```tb check_build check_run
Dim x As New cXml
Debug.Print x.Encoding

x.Parse "<?xml version=""1.0"" encoding=""ISO-8859-1""?><r></r>"
Debug.Print x.Encoding

x.Encoding = "UTF-16"
Debug.Print x.ToXmlString()
' Output:
' UTF-8
' ISO-8859-1
' <?xml version="1.0" encoding="UTF-16"?><r/>
```

### Initialized
{: .no_toc }

Returns whether the object holds a document.

Syntax: *object*.**Initialized** **As Boolean**

*object*
: *required* An object expression that evaluates to a **cXml**.

Read-only. It is **False** for a new object. It becomes **True** when [**Parse**](#parse), [**LoadFromFile**](#loadfromfile) or [**XmlString**](#xmlstring) reads text, even text with no element in it, and when [**CreateNew**](#createnew) creates a document, and [**Clone**](#clone) and [**Merge**](#merge) can set it. A **Parse** that fails leaves it as it was.

While it is **False**, [**SelectElement**](#selectelement) returns **Nothing**, and the members built on it find nothing. [**SelectElements**](#selectelements) returns an empty collection, and [**Validate**](#validate) returns **False**.

```tb check_build check_run
Dim x As New cXml
Debug.Print x.Initialized
x.CreateNew "r"
Debug.Print x.Initialized
' Output:
' False
' True
```

### RootElement
{: .no_toc }

Returns the root element.

Syntax: *object*.**RootElement** **As cXmlNode**

*object*
: *required* An object expression that evaluates to a **cXml**.

Read-only. It returns the first element directly inside the document node, or **Nothing** for a new object and for text that holds no element. [**Parse**](#parse), [**LoadFromFile**](#loadfromfile), [**XmlString**](#xmlstring), [**CreateNew**](#createnew) and [**Clone**](#clone) set it. Nothing else changes it, so it can name an element that is no longer in the document; see [Clone, Merge and the root element](#defect-clone).

```tb check_build check_run
Dim x As New cXml
Debug.Print (x.RootElement Is Nothing)

x.Parse "<a><b>1</b></a>"
Debug.Print x.RootElement.Name
Debug.Print x.RootElement.ChildNodes.Count
' Output:
' True
' a
' 1
```

### Version
{: .no_toc }

Returns or sets the XML version that the XML declaration states.

Syntax: *object*.**Version** [ **=** *value* ]

*object*
: *required* An object expression that evaluates to a **cXml**.

A **String**. The default is `1.0`, the value of [**DEFAULT_XML_VERSION**](mXml#default_xml_version). [**ToXmlString**](#toxmlstring) and [**SaveToFile**](#savetofile) write it into the declaration. [**Parse**](#parse) and [**LoadFromFile**](#loadfromfile) set it from the `version` of the declaration of the text they read, when the declaration has one written with double quotes; otherwise the property keeps the value it had. The package does not check the value.

```tb check_build check_run
Dim x As New cXml
x.Parse "<?xml version=""1.1""?><r></r>"
Debug.Print x.Version
Debug.Print x.ToXmlString()
' Output:
' 1.1
' <?xml version="1.1" encoding="UTF-8"?><r/>
```

### XmlString
{: .no_toc }

Returns or sets the text of the document that was last read.

Syntax: *object*.**XmlString** [ **=** *value* ]

*object*
: *required* An object expression that evaluates to a **cXml**.

A **String**. Assigning to it reads the text as [**Parse**](#parse) does and replaces the document. Reading it returns the text that [**Parse**](#parse), [**LoadFromFile**](#loadfromfile) or an assignment last read. It is not made again from the document, so it does not show later changes: [**ToXmlString**](#toxmlstring) does. [**Clone**](#clone) does not copy it.

Assigning an empty string is not an error, unlike **Parse** with an empty string: it gives an initialised document with no nodes.

> [!NOTE] 1.0.0.1
> Assigning text that the parser cannot read raises an error, where **Parse** returns **False** for the same text. Assigning `<` raises error 5, *Invalid procedure call or argument*. The text is kept, so reading the property returns it.

```tb check_build check_run
Dim x As New cXml
x.XmlString = "<r><a>1</a></r>"
Debug.Print x.GetElementText("r/a")

x.SetElementText "r/a", "2"
Debug.Print x.XmlString
Debug.Print x.ToXmlString(False)
' Output:
' 1
' <r><a>1</a></r>
' <r><a>2</a></r>
```

## Methods

### New
{: .no_toc }

Creates a **cXml** object.

Syntax: **New cXml**

The constructor takes no arguments. The new object has an empty document node, the [**Version**](#version) `1.0` and the [**Encoding**](#encoding) `UTF-8`, and [**Initialized**](#initialized) is **False**.

```tb check_build check_run
Dim x As New cXml
Debug.Print x.Initialized & " " & x.Version & " " & x.Encoding
' Output:
' False 1.0 UTF-8
```

### AddElement
{: .no_toc }

Adds an empty element as the last child of an element.

Syntax: *object*.**AddElement** ( *parentXPath* , *elementName* ) **As cXmlNode**

*object*
: *required* An object expression that evaluates to a **cXml**.

*parentXPath*
: *required* A **String**, the [path](#paths) of the element that receives the new one.

*elementName*
: *required* A **String**, the name of the new element.

Returns the new [**cXmlNode**](cXmlNode), whose **Parent** is the element found. Returns **Nothing**, and adds nothing, when the path selects nothing. A document has one root element, which [**CreateNew**](#createnew) or the text read gives it, so there is no way to add a second.

The name is not checked. An empty name or a name with a space is accepted, and [**Validate**](#validate) rejects an empty one. The new element has no text. [**SetElementText**](#setelementtext) gives it some, by the path of the new element, which is the path of the parent and the name; when several siblings have the name, the path reaches the first. A program that holds the returned node can instead add a text node to its **ChildNodes** (see [**ChildNodes**](cXmlNode#childnodes)).

```tb check_build check_run
Dim x As New cXml
x.CreateNew "library"

Dim book As cXmlNode
Set book = x.AddElement("library", "book")
book.SetAttribute "id", "1"
x.SetElementText "library/book", "Dune"

Debug.Print (x.AddElement("library/shelf", "book") Is Nothing)
Debug.Print x.ToXmlString(False)
' Output:
' True
' <library><book id="1">Dune</book></library>
```

### Clone
{: .no_toc }

Returns a copy of the document.

Syntax: *object*.**Clone** ( ) **As cXml**

*object*
: *required* An object expression that evaluates to a **cXml**.

Returns a new **cXml** with its own copy of every node, so that a change to one document does not reach the other. The copy has the same [**Version**](#version) and [**Encoding**](#encoding), and is initialised when the original is. For an object that holds no document, the result holds none either. The [**XmlString**](#xmlstring) of the copy is empty.

The copied nodes have no **Parent**, which stops [**RemoveElement**](#removeelement) from removing them; see [Clone, Merge and the root element](#defect-clone).

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a>1</a></r>"

Dim y As cXml
Set y = x.Clone()
y.SetElementText "r/a", "2"

Debug.Print x.GetElementText("r/a") & " " & y.GetElementText("r/a")
' Output:
' 1 2
```

### CreateNew
{: .no_toc }

Replaces the document with a new one that holds only a root element.

Syntax: *object*.**CreateNew** ( *rootElementName* )

*object*
: *required* An object expression that evaluates to a **cXml**.

*rootElementName*
: *required* A **String**, the name of the root element. It is not checked.

Discards the document and creates an empty root element with that name. [**Initialized**](#initialized) becomes **True**. [**Version**](#version), [**Encoding**](#encoding) and [**XmlString**](#xmlstring) keep the values they had.

```tb check_build check_run
Dim x As New cXml
x.CreateNew "config"
Debug.Print x.ToXmlString()
' Output:
' <?xml version="1.0" encoding="UTF-8"?><config/>
```

### GetAttribute
{: .no_toc }

Returns an attribute of an element.

Syntax: *object*.**GetAttribute** ( *xpath* , *attrName* ) **As String**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, the [path](#paths) of the element.

*attrName*
: *required* A **String**, the name of the attribute. Letter case is ignored.

Returns the value of the attribute, as [**GetAttribute**](cXmlNode#getattribute) of the element's node does. Returns an empty string when the path selects nothing or the element has no such attribute, which a program cannot tell from an attribute whose value is empty.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a id=""7"" empty=""""></a></r>"

Debug.Print "[" & x.GetAttribute("r/a", "id") & "]"
Debug.Print "[" & x.GetAttribute("r/a", "ID") & "]"
Debug.Print "[" & x.GetAttribute("r/a", "empty") & "]"
Debug.Print "[" & x.GetAttribute("r/a", "missing") & "]"
Debug.Print "[" & x.GetAttribute("r/nothing", "id") & "]"
' Output:
' [7]
' [7]
' []
' []
' []
```

### GetElementText
{: .no_toc }

Returns the text inside an element.

Syntax: *object*.**GetElementText** ( *xpath* ) **As String**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, the [path](#paths) of the element.

Returns the text of the element: the values of all the text nodes and CDATA sections inside it, at any depth, one after the other in document order with nothing between them. Comments add nothing. White space that has a line break or a tab in it is included, so the text of an element in an indented document holds the line breaks and the indentation; text that is only spaces is not in the document ([White space](#defect-whitespace)). Entities in the text are returned as written; see [Entities](#defect-entities).

Returns an empty string when the path selects nothing, which a program cannot tell from an element with no text.

```tb check_build check_run
Dim x As New cXml
x.Parse "<p>Hello <b>big</b> world<!-- c --><![CDATA[ & more]]></p>"

Debug.Print "[" & x.GetElementText("p") & "]"
Debug.Print "[" & x.GetElementText("p/b") & "]"
Debug.Print "[" & x.GetElementText("p/i") & "]"

x.Parse "<r>" & vbCrLf & "  <a>1</a>" & vbCrLf & "</r>"
Debug.Print Replace(Replace(x.GetElementText("r"), " ", "."), vbCrLf, "|")
' Output:
' [Hello big world & more]
' [big]
' []
' |..1|
```

### LoadFromFile
{: .no_toc }

Reads a document from a file.

Syntax: *object*.**LoadFromFile** ( *filePath* ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **cXml**.

*filePath*
: *required* A **String**, the path of the file.

Reads the whole file, removes a UTF-8 byte order mark if the file starts with one, converts the bytes as UTF-8 with [**UTF8BytesToString**](mXml#utf8bytestostring) and reads the text as [**Parse**](#parse) does. Returns **True** when the file was read.

Returns **False**, and writes `LoadFromFile failed:` and the description to the Debug Console, when the file cannot be opened, is empty, or has fewer than three bytes. It returns **True** when the file was read but the text then fails to parse, because it ignores the result of **Parse**; see [Files](#defect-files). The file is read as UTF-8 whatever its declaration says, and the declaration's encoding only sets [**Encoding**](#encoding).

```tb check_build check_run
Dim path As String
path = Environ$("TEMP") & "\tbxml_loadfromfile.xml"

Dim f As Long
f = FreeFile
Open path For Output As #f
Print #f, "<?xml version=""1.0"" encoding=""UTF-8""?>"
Print #f, "<config><name>demo</name></config>"
Close #f

Dim x As New cXml
Debug.Print x.LoadFromFile(path)
Debug.Print x.GetElementText("config/name")
Kill path
' Output:
' True
' demo
```

### Merge
{: .no_toc }

Appends the content of another document to this one.

Syntax: *object*.**Merge** ( *otherXml* )

*object*
: *required* An object expression that evaluates to a **cXml**.

*otherXml*
: *required* A **cXml**, the document to copy from. It is not changed.

Appends a copy of every child of the root element of *otherXml*, text and comments included, to the end of the root element of this document. The names and attributes of the two root elements are not compared or merged, and this document keeps its own. Nothing happens when *otherXml* holds no document.

When this object holds no document, it becomes a copy of the whole of *otherXml*, and [**Initialized**](#initialized) becomes **True**. Its [**RootElement**](#rootelement) stays **Nothing**, so a second **Merge** into it does nothing.

The copies have no **Parent**; see [Clone, Merge and the root element](#defect-clone).

> [!NOTE] 1.0.0.1
> **Merge** with **Nothing** as *otherXml* raises error 91, *Object variable or With block variable not set*, because the code tests the object and its property in one expression.

```tb check_build check_run
Dim a As New cXml
Dim b As New cXml
a.Parse "<list a=""1""><x>1</x></list>"
b.Parse "<other b=""2""><y>2</y></other>"

a.Merge b
Debug.Print a.ToXmlString(False)
Debug.Print b.ToXmlString(False)
' Output:
' <list a="1"><x>1</x><y>2</y></list>
' <other b="2"><y>2</y></other>
```

### Parse
{: .no_toc }

Reads a document from a string.

Syntax: *object*.**Parse** ( *xml* ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xml*
: *required* A **String**, the text to read.

Replaces the document with the one in the text, sets [**RootElement**](#rootelement) and [**XmlString**](#xmlstring), and returns **True**. The `version` and `encoding` of an XML declaration, written with double quotes, set [**Version**](#version) and [**Encoding**](#encoding).

The parser builds these nodes: elements with their attributes, text, comments and CDATA sections. Text that is only spaces is left out, in the document and inside elements; text that has a line break or a tab in it is kept ([White space](#defect-whitespace)). An end tag closes the innermost open element whatever its name is, and an element still open at the end of the text is closed by it. Processing instructions and the declaration are not kept.

Returns **False**, and writes `Parse failed:` and the description to the Debug Console, for an empty string and for a tag that the end of the text cuts off, such as `<` or `<a`. Any other text gives **True**: the parser does not check that the text is well formed XML, so text that is not XML, an unclosed element and an end tag that names another element all succeed. [**Validate**](#validate) detects almost none of them. A **Parse** that fails part-way has already replaced the document with what it had read; see [Malformed text and failed parses](#defect-malformed).

For text that holds a comment or a CDATA section with no end, or a DOCTYPE declaration, **Parse** may never return; see [Comments, CDATA sections and declarations](#defect-declarations).

```tb check_build check_run
Dim x As New cXml
Debug.Print x.Parse("<?xml version=""1.1"" encoding=""ISO-8859-1""?><r a=""1""><b>text</b></r>")
Debug.Print x.Version & " " & x.Encoding & " " & x.RootElement.Name

Debug.Print x.Parse("")
Debug.Print x.Parse("not xml")
Debug.Print x.Parse("<a><b></a>")
Debug.Print x.Parse("<r")
' Output:
' True
' 1.1 ISO-8859-1 r
' Parse failed: XML string cannot be empty
' False
' True
' True
' Parse failed: Invalid procedure call or argument
' False
```

### RemoveAttribute
{: .no_toc }

Removes an attribute from an element.

Syntax: *object*.**RemoveAttribute** ( *xpath* , *attrName* )

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, the [path](#paths) of the element.

*attrName*
: *required* A **String**, the name of the attribute. Letter case is ignored.

Removes the first attribute whose name matches, with its value. Nothing happens, and no error is raised, when the path selects nothing or the element has no such attribute.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r a=""1"" b=""2""></r>"

x.RemoveAttribute "r", "A"
x.RemoveAttribute "r", "missing"
x.RemoveAttribute "nothing", "b"
Debug.Print x.ToXmlString(False)
' Output:
' <r b="2"/>
```

### RemoveElement
{: .no_toc }

Removes an element, with everything inside it.

Syntax: *object*.**RemoveElement** ( *xpath* ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, the [path](#paths) of the element.

Takes the first element that the path selects out of the **ChildNodes** of its parent, and returns **True**. Returns **False** when the path selects nothing, and for a node that has no **Parent**, which includes the nodes that [**Clone**](#clone) and [**Merge**](#merge) copy. In the first case the Debug Console shows `RemoveElement failed: Object variable or With block variable not set`.

Removing the root element leaves [**RootElement**](#rootelement) as it was; see [Clone, Merge and the root element](#defect-clone).

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a>1</a><a>2</a><b></b></r>"

Debug.Print x.RemoveElement("r/a")
Debug.Print x.GetElementText("r/a")
Debug.Print x.RemoveElement("r/missing")
' Output:
' True
' 2
' RemoveElement failed: Object variable or With block variable not set
' False
```

### SaveToFile
{: .no_toc }

Writes the document to a file.

Syntax: *object*.**SaveToFile** ( *filePath* [ , *withDeclaration* [ , *prettyPrint* [ , *indent* ] ] ] ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **cXml**.

*filePath*
: *required* A **String**, the path of the file. An existing file is deleted first.

*withDeclaration*
: *optional* A **Boolean**. **True** (the default) writes the XML declaration before the document.

*prettyPrint*
: *optional* A **Boolean**. **False** (the default) writes the document compactly. **True** puts each element, comment, CDATA section and text on a line of its own, as [**ToXmlString**](#toxmlstring) does.

*indent*
: *optional* A **String**, the indentation for each level of nesting when *prettyPrint* is **True**. The default is two spaces.

Writes the three bytes of a UTF-8 byte order mark, then the document as [**ToXmlString**](#toxmlstring) returns it for the same three options, converted with [**StringToUTF8Bytes**](mXml#stringtoutf8bytes). Returns **True** when the file was written, and **False**, with `SaveToFile failed:` and the description in the Debug Console, when it could not be, for example because the folder does not exist.

The file is UTF-8 whatever [**Encoding**](#encoding) says, and the declaration states that value. A document with no content written without a declaration is the byte order mark followed by one zero byte.

```tb check_build check_run
Dim path As String
path = Environ$("TEMP") & "\tbxml_savetofile.xml"

Dim x As New cXml
x.CreateNew "note"
x.AddElement "note", "to"
x.SetElementText "note/to", "Ada"
Debug.Print x.SaveToFile(path)

Dim f As Long
f = FreeFile
Open path For Binary Access Read As #f
Dim head(0 To 2) As Byte
Get #f, , head
Close #f
Debug.Print Hex$(head(0)) & " " & Hex$(head(1)) & " " & Hex$(head(2))

Dim y As New cXml
Debug.Print y.LoadFromFile(path)
Debug.Print y.GetElementText("note/to")
Kill path
' Output:
' True
' EF BB BF
' True
' Ada
```

The *prettyPrint* and *indent* parameters change the size of the file. The text for each level of nesting is *indent*, and every line ends with a carriage return and a line feed:

```tb check_build check_run
Dim path As String
path = Environ$("TEMP") & "\tbxml_savetofile_pretty.xml"

Dim x As New cXml
x.CreateNew "r"
x.AddElement "r", "a"
x.SetElementText "r/a", "t"

x.SaveToFile path, False
Debug.Print FileLen(path)
x.SaveToFile path, False, True
Debug.Print FileLen(path)
x.SaveToFile path, False, True, vbTab
Debug.Print FileLen(path)
Kill path
' Output:
' 18
' 36
' 32
```

### SelectElement
{: .no_toc }

Returns the element that a path selects.

Syntax: *object*.**SelectElement** ( *xpath* ) **As cXmlNode**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, the [path](#paths) of the element.

Returns the [**cXmlNode**](cXmlNode) that the path selects, or **Nothing** when it selects nothing. It also returns **Nothing** when [**Initialized**](#initialized) is **False** and when the path holds no name, and in both cases the Debug Console shows a line that begins `SelectElement failed:`.

The other members that take a path call this one.

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id=""1"">Dune</book><book id=""2"">Emma</book></library>"

Dim n As cXmlNode
Set n = x.SelectElement("library/book")
Debug.Print n.GetAttribute("id") & " " & n.ChildNodes(1).Value
Debug.Print (x.SelectElement("library/magazine") Is Nothing)
' Output:
' 1 Dune
' True
```

### SelectElements
{: .no_toc }

Returns every node with a given name.

Syntax: *object*.**SelectElements** ( *tagName* ) **As Collection**

*object*
: *required* An object expression that evaluates to a **cXml**.

*tagName*
: *required* A **String**, one name and not a path. Letter case is ignored.

Returns a new **Collection** of the [**cXmlNode**](cXmlNode) objects, at any depth in the document, whose **Name** matches, in document order. An element inside another element of the same name is returned too. The collection is empty when nothing matches and when [**Initialized**](#initialized) is **False**; the method never returns **Nothing**.

The names of the nodes that are not elements match, so `#text` returns every text node. The method does not read paths: `r/a` matches nothing.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a>1</a><b><a>2</a></b><A>3</A></r>"

Dim found As Collection
Set found = x.SelectElements("a")
Debug.Print found.Count

Dim n As cXmlNode
For Each n In found
    Debug.Print n.Name & " " & n.ChildNodes(1).Value
Next
Debug.Print x.SelectElements("r/a").Count
' Output:
' 3
' a 1
' a 2
' A 3
' 0
```

### SetAttribute
{: .no_toc }

Sets an attribute of an element.

Syntax: *object*.**SetAttribute** ( *xpath* , *attrName* , *attrValue* )

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, the [path](#paths) of the element.

*attrName*
: *required* A **String**, the name of the attribute.

*attrValue*
: *required* A **String**, the value.

Adds the attribute, or replaces the one with the same name, as [**SetAttribute**](cXmlNode#setattribute) of the element's node does: a replaced attribute moves to the end of the element's attributes. Nothing happens, and no error is raised, when the path selects nothing.

```tb check_build check_run
Dim x As New cXml
x.CreateNew "r"

x.SetAttribute "r", "a", "1"
x.SetAttribute "r", "b", "2"
x.SetAttribute "r", "a", "3"
x.SetAttribute "r/missing", "z", "1"
Debug.Print x.ToXmlString(False)
' Output:
' <r b="2" a="3"/>
```

### SetElementText
{: .no_toc }

Replaces the text of an element.

Syntax: *object*.**SetElementText** ( *xpath* , *text* )

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, the [path](#paths) of the element.

*text*
: *required* A **String**, the new text, as plain text: [**ToXmlString**](#toxmlstring) escapes it when it writes it.

Removes the text nodes directly inside the element and adds one text node that holds *text*, after the element's other children. The child elements, comments and CDATA sections stay, so the text moves to the end of an element with mixed content. Setting an empty string leaves an empty text node, which makes [**ToXmlString**](#toxmlstring) write `<c></c>` and not `<c/>`. Nothing happens, and no error is raised, when the path selects nothing.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a>one<b>bee</b>two</a></r>"

x.SetElementText "r/a", "NEW"
x.SetElementText "r/missing", "lost"
Debug.Print x.ToXmlString(False)
' Output:
' <r><a><b>bee</b>NEW</a></r>
```

### ToXmlString
{: .no_toc }

Returns the document as text.

Syntax: *object*.**ToXmlString** ( [ *withDeclaration* [ , *prettyPrint* [ , *indent* ] ] ] ) **As String**

*object*
: *required* An object expression that evaluates to a **cXml**.

*withDeclaration*
: *optional* A **Boolean**. **True** (the default) starts the text with a declaration such as `<?xml version="1.0" encoding="UTF-8"?>`, written from [**Version**](#version) and [**Encoding**](#encoding). A line break follows the declaration when *prettyPrint* is **True**, and nothing follows it otherwise.

*prettyPrint*
: *optional* A **Boolean**. **False** (the default) writes the document compactly: nothing is added between the nodes. **True** puts each element, comment, CDATA section and text on a line of its own, indents each line by one *indent* for each level of nesting, and ends every line with a carriage return and a line feed, the last one included. A text node that is only spaces is left out. See [Pretty printing](#defect-pretty) for reading the text back.

*indent*
: *optional* A **String**, the indentation for each level of nesting, written once for each level. The default is two spaces. An empty string writes no indentation.

The text holds elements, text, comments and CDATA sections. An element with no child is written as `<name/>`, and an element with children as `<name>...</name>`. The characters `&`, `<`, `>`, `"` and `'` are replaced by `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&apos;` in text and in the values of attributes. Comments and CDATA sections are written as they are. The attributes of an element are written in the order of its attribute list.

A document that holds nothing gives the declaration alone, or an empty string without one.

```tb check_build check_run
Dim x As New cXml
x.CreateNew "r"
x.SetAttribute "r", "id", "1"
x.AddElement "r", "a"
x.SetElementText "r/a", "x < y"
x.AddElement "r", "empty"

Debug.Print x.ToXmlString()
Debug.Print x.ToXmlString(False)
' Output:
' <?xml version="1.0" encoding="UTF-8"?><r id="1"><a>x &lt; y</a><empty/></r>
' <r id="1"><a>x &lt; y</a><empty/></r>
```

With *prettyPrint*, the nodes are on lines of their own. The sample shows the spaces as dots and the line breaks as bars:

```tb check_build check_run
Dim x As New cXml
x.CreateNew "r"
x.AddElement "r", "a"
x.SetElementText "r/a", "t"
x.AddElement "r", "b"
x.AddElement "r/b", "c"

Dim s As String
s = x.ToXmlString(True, True)
Debug.Print Replace(Replace(s, " ", "."), vbCrLf, "|")
s = x.ToXmlString(False, True, "--")
Debug.Print Replace(Replace(s, " ", "."), vbCrLf, "|")
s = x.ToXmlString(False, True, "")
Debug.Print Replace(Replace(s, " ", "."), vbCrLf, "|")
' Output:
' <?xml.version="1.0".encoding="UTF-8"?>|<r>|..<a>|....t|..</a>|..<b>|....<c/>|..</b>|</r>|
' <r>|--<a>|----t|--</a>|--<b>|----<c/>|--</b>|</r>|
' <r>|<a>|t|</a>|<b>|<c/>|</b>|</r>|
```

### Validate
{: .no_toc }

Checks that every element and attribute has a name.

Syntax: *object*.**Validate** ( ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **cXml**.

Returns **True** when the object holds a document and every element in it has a name that is not empty and does not begin with `/`, and every attribute has a name that is not empty. Returns **False** otherwise, and for an object that holds no document.

That is all it checks. It does not test that the text was well formed, that the names are legal XML names, or anything about a schema or a DTD. In practice it detects an element added with an empty name, an attribute set with an empty name, and the element named `/a` that the parser makes from the self-closing tag `<a/>` (see [Self-closing elements](#defect-self-closing)).

```tb check_build check_run
Dim x As New cXml
Debug.Print x.Validate()

x.Parse "<r><a></a></r>"
Debug.Print x.Validate()

x.Parse "<r><a/></r>"
Debug.Print x.Validate()

x.Parse "<a><b></a>"
Debug.Print x.Validate()
' Output:
' False
' True
' False
' True
```

### XPath
{: .no_toc }

Returns the nodes that an XPath expression selects.

Syntax: *object*.**XPath** ( *path* ) **As Collection**

*object*
: *required* An object expression that evaluates to a **cXml**.

*path*
: *required* A **String**, an XPath expression; see the [syntax](mXPath#syntax) that [**mXPath**](mXPath) reads.

Evaluates the expression with [**SelectNodes**](mXPath#selectnodes), starting at the document node, so `/library/book` and `library/book` both select the books of a root element named `library`. Returns a new **Collection** of [**cXmlNode**](cXmlNode) objects, numbered from 1, with each node in it once. The collection is empty, and is never **Nothing**, when nothing is selected, when *path* is empty, and when [**Initialized**](#initialized) is **False**. When the evaluation raises an error, the method writes `XPath query failed:` and the description to the Debug Console, leaves the error in **Err**, and returns an empty collection.

The engine reads a part of XPath 1.0 and reads some expressions wrongly; see [Defects](mXPath#defects).

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id='1' lang='en'>Dune</book><book id='2' lang='fr'>Emma</book><book id='3' lang='en'>Ulysses</book></library>"

Dim n As cXmlNode
For Each n In x.XPath("/library/book[@lang='en']")
    Debug.Print n.GetAttribute("id") & " " & n.Text
Next
Debug.Print x.XPath("//book").Count
Debug.Print x.XPath("/library/magazine").Count
' Output:
' 1 Dune
' 3 Ulysses
' 3
' 0
```

### XPathAttribute
{: .no_toc }

Returns an attribute of the first node that an XPath expression selects.

Syntax: *object*.**XPathAttribute** ( *xpath* , *attrName* ) **As String**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, an XPath expression that selects the element.

*attrName*
: *required* A **String**, the name of the attribute. Letter case is ignored.

Returns the value of the attribute, as [**GetAttribute**](cXmlNode#getattribute) of the first node that [**XPath**](#xpath) selects does. Returns an empty string when the expression selects nothing or the node has no such attribute, which a program cannot tell from an attribute whose value is empty. The expression is evaluated by [**XPathSingle**](#xpathsingle), which writes the line for an error.

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id='1' lang='en'>Dune</book><book id='2' lang='fr'>Emma</book></library>"

Debug.Print x.XPathAttribute("//book[@id='2']", "lang")
Debug.Print x.XPathAttribute("//book[1]", "LANG")
Debug.Print "[" & x.XPathAttribute("//book", "missing") & "]"
Debug.Print "[" & x.XPathAttribute("//magazine", "lang") & "]"
' Output:
' fr
' en
' []
' []
```

### XPathFromRoot
{: .no_toc }

Returns the nodes that an XPath expression selects, starting at the root element.

Syntax: *object*.**XPathFromRoot** ( *xpath* ) **As Collection**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, an XPath expression.

Works as [**XPath**](#xpath) does, with the [**RootElement**](#rootelement) as the starting node and not the document node. The first step selects among the children of the root element, so `book` selects the books, `/library/book` selects nothing when the root element is `library`, and `.` selects the root element. Returns an empty collection when the object holds no root element, and writes `XPathFromRoot query failed:` and the description for an error.

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id='1'></book><book id='2'></book></library>"

Debug.Print x.XPathFromRoot("book").Count
Debug.Print x.XPathFromRoot("/library/book").Count
Debug.Print x.XPathFromRoot(".").Item(1).Name
Debug.Print x.XPathFromRoot("//book").Count
Debug.Print x.XPath("/library/book").Count
' Output:
' 2
' 0
' library
' 2
' 2
```

### XPathSingle
{: .no_toc }

Returns the first node that an XPath expression selects.

Syntax: *object*.**XPathSingle** ( *xpath* ) **As** [**cXmlNode**](cXmlNode)

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, an XPath expression.

Returns the first node of what [**XPath**](#xpath) returns, or **Nothing** when that is empty or [**Initialized**](#initialized) is **False**. When the evaluation raises an error, it writes `XPathSingle query failed:` and the description to the Debug Console, leaves the error in **Err**, and returns **Nothing**.

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id='1'>Dune</book><book id='2'>Emma</book></library>"

Dim n As cXmlNode
Set n = x.XPathSingle("//book[@id='2']")
Debug.Print n.Text
Debug.Print (x.XPathSingle("//magazine") Is Nothing)
Debug.Print x.XPathSingle("//book").GetAttribute("id")
' Output:
' Emma
' True
' 1
```

### XPathText
{: .no_toc }

Returns the text of the first node that an XPath expression selects.

Syntax: *object*.**XPathText** ( *xpath* ) **As String**

*object*
: *required* An object expression that evaluates to a **cXml**.

*xpath*
: *required* A **String**, an XPath expression that selects the node.

Returns the text of the node as [**GetElementText**](#getelementtext) does: the values of all the text nodes and CDATA sections inside it, at any depth, one after the other in document order. When the expression selects a text node or a CDATA section, the result is its value. Returns an empty string when the expression selects nothing, which a program cannot tell from a node with no text. The expression is evaluated by [**XPathSingle**](#xpathsingle), which writes the line for an error.

The [**XPathText**](cXmlNode#xpathtext) of a node is different: it returns only the text directly inside the node it selects.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a>x<b>y</b>z</a>"

Debug.Print x.XPathText("/a")
Debug.Print x.XPathText("/a/b")
Debug.Print x.XPathText("//b/text()")
Debug.Print "[" & x.XPathText("/zzz") & "]"
' Output:
' xyz
' y
' y
' []
```

## Defects in version 1.0.0.1
{: #defects }

Each of these sections describes a case in which the package gives a wrong result or never returns. The samples show the result of the version named here. The defects of the XPath engine are on the page of the [**mXPath**](mXPath#defects) module.

### Self-closing elements
{: #defect-self-closing .no_toc }

> [!WARNING] 1.0.0.1
> A self-closing tag is read wrongly. `<a/>`, a name and nothing else, makes an element named `/a`. A tag with attributes, or with a space before the slash, such as `<a x="1"/>` or `<a />`, is read as a start tag, so the elements that follow it become its children, and the end tag of the parent closes it. [**ToXmlString**](#toxmlstring) writes an empty element as `<a/>`, so text that a **cXml** wrote is read wrongly by a **cXml**.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a/><b x=""1""/><c>t</c></r>"

Debug.Print x.ToXmlString(False)
Debug.Print "[" & x.GetElementText("r/c") & "]"
Debug.Print x.GetElementText("r/b/c")
Debug.Print x.Validate()

x.CreateNew "r"
x.AddElement "r", "empty"
Dim y As New cXml
y.Parse x.ToXmlString(False)
Debug.Print y.RootElement.ChildNodes(1).Name
' Output:
' <r></a/><b x="1"><c>t</c></b></r>
' []
' t
' False
' /empty
```

### Entities and character references
{: #defect-entities .no_toc }

> [!WARNING] 1.0.0.1
> Entities in text are not decoded. [**GetElementText**](#getelementtext) and the **Value** of a text node return `&amp;`, `&lt;` and `&#65;` as they stand in the XML, and [**ToXmlString**](#toxmlstring) escapes the `&` again, so each read and write adds `amp;`. In the value of an attribute the five predefined entities `&lt;`, `&gt;`, `&amp;`, `&quot;` and `&apos;` are decoded, in that order, so `&amp;quot;` becomes a quotation mark. Numeric character references such as `&#65;` and `&#x41;` are not decoded anywhere.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a title=""Tom &amp; Jerry &#65;"">Tom &amp; Jerry</a>"

Debug.Print x.GetAttribute("a", "title")
Debug.Print x.GetElementText("a")
Debug.Print x.ToXmlString(False)
' Output:
' Tom & Jerry &#65;
' Tom &amp; Jerry
' <a title="Tom &amp; Jerry &amp;#65;">Tom &amp;amp; Jerry</a>
```

Text set with [**SetElementText**](#setelementtext) or [**SetAttribute**](#setattribute) is plain text and is written correctly, once. A program that reads text with entities in it has to decode them itself.

### Tags
{: #defect-tags .no_toc }

> [!WARNING] 1.0.0.1
> A tag is cut apart with plain searches, so these valid forms give wrong attributes and no error. A tag that uses both kinds of quote loses an attribute: the first double quote is taken as the start of the first value, even when a single-quoted value comes before it. A `>` inside an attribute value ends the tag at that point, and the rest of the value becomes text. A line break between two attributes becomes the name of an attribute, and the real name is lost. A line break between the element name and the first attribute becomes part of the element's name. An attribute with no value takes the value of the next one.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a b='1' c=""2""></a>"
Debug.Print x.GetAttribute("a", "b") & "|" & x.GetAttribute("a", "c")

x.Parse "<a b=""x>y""></a>"
Debug.Print x.GetAttribute("a", "b") & "|" & x.GetElementText("a")

x.Parse "<a b=""1""" & vbCrLf & "   c=""2""></a>"
Debug.Print x.GetAttribute("a", "b") & "|" & x.GetAttribute("a", "c") & "|" & x.RootElement.Attributes.Count

x.Parse "<a" & vbLf & "b=""1""></a>"
Debug.Print Replace(x.RootElement.Name, vbLf, "\n")

x.Parse "<a disabled c=""2""></a>"
Debug.Print x.GetAttribute("a", "disabled") & "|" & x.GetAttribute("a", "c")
' Output:
' 2|
' |y">
' 1||4
' a\nb="1"
' 2|
```

A tab between the attributes is read correctly, and so is a space around the `=`.

### Comments, CDATA sections and declarations
{: #defect-declarations .no_toc }

> [!WARNING] 1.0.0.1
> **Parse** never returns for text that holds a comment with no `-->`, a CDATA section with no `]]>`, or a `<!` declaration such as `<!DOCTYPE`, unless the declaration comes first in the text. A `<!` item that is not a comment or a CDATA section is skipped up to the next `?>` anywhere later in the text, which discards everything between, or, when there is none, up to the first `>` of the whole text, which is the end of the item itself only when the item is the first thing in the text. In every other position the search goes back to an earlier `>`, and the parser reads the item again, without end. A processing instruction `<?target data?>` is skipped, but the `>` that ends it stays behind as a text node.

These calls return, and show how a processing instruction and a DOCTYPE declaration are read:

```tb check_build check_run
Dim x As New cXml
x.Parse "<root><?pi data?><a>x</a></root>"
Debug.Print "[" & x.GetElementText("root") & "]"

x.Parse "<!DOCTYPE note SYSTEM ""Note.dtd""><note>text</note>"
Debug.Print "[" & x.GetElementText("note") & "]"

Dim y As New cXml
y.Parse "<?xml version=""1.0""?><!DOCTYPE note><note>text</note><?pi?>"
Debug.Print (y.RootElement Is Nothing)
' Output:
' [>x]
' [text]
' True
```

Each of these calls never returns. The sample is compiled and not run:

```tb check_build
Dim x As New cXml
x.Parse "<root><!-- never closed </root>"
x.Parse "<root><![CDATA[ never closed </root>"
x.Parse "<?xml version=""1.0""?><!DOCTYPE root><root></root>"
x.Parse "<root><!DOCTYPE x><a>1</a></root>"
```

### Malformed text and failed parses
{: #defect-malformed .no_toc }

> [!WARNING] 1.0.0.1
> A **Parse** that returns **False** has already thrown away the previous document. The document is replaced before the text is read, so it holds what was read before the failure, which is nothing when the failure is at the start. [**Initialized**](#initialized) is not changed, so after a failed **Parse** into an object that held a document, the path members work on the part that was read.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a>x</a>"

Debug.Print x.Parse("<")
Debug.Print x.Initialized & " " & x.Document.ChildNodes.Count
Debug.Print "[" & x.GetElementText("a") & "]"
' Output:
' Parse failed: Invalid procedure call or argument
' False
' True 0
' []
```

### White space
{: #defect-whitespace .no_toc }

> [!WARNING] 1.0.0.1
> **Parse** leaves out a text node that holds only spaces, and keeps one that has a line break or a tab in it. A space between two elements is lost: `<p><b>a</b> <i>b</i></p>` is read as `<p><b>a</b><i>b</i></p>`, and its text is `ab`. An element that holds only spaces is read as an empty element. The white space of an indented document is kept, because it holds line breaks.

```tb check_build check_run
Dim x As New cXml
x.Parse "<p><b>a</b> <i>b</i></p>"
Debug.Print x.ToXmlString(False)
Debug.Print x.GetElementText("p")

x.Parse "<b> </b>"
Debug.Print x.ToXmlString(False)

x.Parse "<r> <a>1</a> </r>"
Debug.Print x.RootElement.ChildNodes.Count

x.Parse "<r>" & vbCrLf & "<a>1</a>" & vbCrLf & "</r>"
Debug.Print x.RootElement.ChildNodes.Count
' Output:
' <p><b>a</b><i>b</i></p>
' ab
' <b/>
' 1
' 3
```

Text set with [**SetElementText**](#setelementtext) is kept whatever it holds, spaces only included.

### Pretty printing
{: #defect-pretty .no_toc }

> [!WARNING] 1.0.0.1
> A document written with *prettyPrint* **True** does not read back as the document that was written. The line breaks and the indentation around the text of an element are text to the parser, which keeps white space that has a line break in it. [**GetElementText**](#getelementtext) of the element returns them, and writing the document again with *prettyPrint* puts them on lines of their own, so the text changes each time the document is written and read.

```tb check_build check_run
Dim x As New cXml
x.CreateNew "r"
x.AddElement "r", "a"
x.SetElementText "r/a", "t"

Dim s As String
s = x.ToXmlString(False, True)
Debug.Print Replace(Replace(s, " ", "."), vbCrLf, "|")

Dim y As New cXml
y.Parse s
Debug.Print Replace(Replace(y.GetElementText("r/a"), " ", "."), vbCrLf, "|")

s = y.ToXmlString(False, True)
Debug.Print Replace(Replace(s, " ", "."), vbCrLf, "|")
' Output:
' <r>|..<a>|....t|..</a>|</r>|
' |....t|..
' <r>|..|..|..<a>|....|....t|..|..</a>|..||</r>|||
```

### Clone, Merge and the root element
{: #defect-clone .no_toc }

> [!WARNING] 1.0.0.1
> The nodes that **Clone** copies and **Merge** adds have no **Parent**, so [**RemoveElement**](#removeelement) returns **False** for them and removes nothing. [**RootElement**](#rootelement) is set only when a document is read, created or cloned, so it keeps naming the old root after **RemoveElement** removes the root element and after **Parse** reads text that has no element. A **Merge** into an object that holds no document sets [**Initialized**](#initialized) and leaves **RootElement** **Nothing**, so later merges into it do nothing.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a>1</a></r>"

Dim y As cXml
Set y = x.Clone()
Debug.Print y.RemoveElement("r/a")

Debug.Print x.RemoveElement("r")
Debug.Print x.RootElement.Name
Debug.Print "[" & x.ToXmlString(False) & "]"

x.Parse "just text"
Debug.Print x.RootElement.Name

Dim c As New cXml
c.Merge y
Debug.Print c.Initialized & " " & (c.RootElement Is Nothing)
' Output:
' False
' True
' r
' []
' r
' True True
```

### A byte order mark in a string
{: #defect-bom .no_toc }

> [!WARNING] 1.0.0.1
> [**Parse**](#parse) and the [**XmlString**](#xmlstring) property cut three characters from the start of a string that begins with the character U+FEFF, the character that a byte order mark decodes to. Only the first of the three is the mark: the next two are the start of the document. [**LoadFromFile**](#loadfromfile) removes the mark from the bytes of the file first, so a file is not affected.

```tb check_build check_run
Dim x As New cXml
x.Parse ChrW(&HFEFF) & "<root><a>t</a></root>"
Debug.Print x.RootElement.Name
' Output:
' a
```

### Files
{: #defect-files .no_toc }

> [!WARNING] 1.0.0.1
> **LoadFromFile** creates an empty file when the path names a file that does not exist, before it returns **False**. It returns **True** after the text of an existing file fails to parse, since the result of **Parse** is not tested. **SaveToFile** writes UTF-8 whatever [**Encoding**](#encoding) says, so a document labelled with another encoding is mislabelled in the file.

```tb check_build check_run
Dim path As String
path = Environ$("TEMP") & "\tbxml_files.xml"
If Dir(path) <> "" Then Kill path

Dim x As New cXml
Debug.Print x.LoadFromFile(path)
Debug.Print (Dir(path) <> "") & " " & FileLen(path)
Kill path

x.CreateNew "r"
x.Encoding = "ISO-8859-1"
x.AddElement "r", "t"
x.SetElementText "r/t", ChrW(233)
x.SaveToFile path

Dim y As New cXml
y.LoadFromFile path
Debug.Print y.Encoding & " " & AscW(y.GetElementText("r/t"))
Kill path

Dim f As Long
f = FreeFile
Open path For Output As #f
Print #f, "<r"
Close #f
Debug.Print y.LoadFromFile(path)
Kill path
' Output:
' LoadFromFile failed: Unspecified error
' False
' True 0
' ISO-8859-1 233
' Parse failed: Invalid procedure call or argument
' True
```

A file with fewer than three bytes cannot be loaded, and an empty file gives **False**: the code reads three bytes before it tests the length.

## See Also

- [cXmlNode](cXmlNode) class -- the nodes of the document
- [mXml](mXml) module -- the node types, the error numbers and the UTF-8 functions
- [mXPath](mXPath) module -- the XPath engine behind the **XPath** methods
- [TBMANLIB_Xml](.) package -- overview
