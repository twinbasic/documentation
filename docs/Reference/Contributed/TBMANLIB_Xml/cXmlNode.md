---
title: cXmlNode
parent: TBMANLIB_Xml Package
permalink: /tB/Packages/Contributed/TBMANLIB_Xml/cXmlNode
has_toc: false
---

# cXmlNode class
{: .no_toc }

A **cXmlNode** is one node of an XML document held by a [**cXml**](cXml) object: the document itself, an element, a piece of text, a CDATA section or a comment. It has six public fields, a property that returns the node's text, and nine methods. The fields hold the node's name, kind and value, its attributes, its child nodes and its parent; the methods read and change the attributes, find child nodes by name, and find nodes by an XPath expression.

A **cXml** object creates the nodes when it parses text or when [**AddElement**](cXml#addelement) adds an element, and returns them from [**SelectElement**](cXml#selectelement), [**SelectElements**](cXml#selectelements), [**RootElement**](cXml#rootelement) and [**Document**](cXml#document). A program can also create a node with `New cXmlNode` and add it to a node's **ChildNodes**.

```tb check_build check_run
Dim x As New cXml
x.Parse "<library><book id=""1"" lang=""en"">Dune</book><!-- end --></library>"

Dim book As cXmlNode
Set book = x.RootElement.GetChildNode("book")
Debug.Print book.Name & " " & book.GetAttribute("lang")
Debug.Print book.Parent.Name
Debug.Print book.ChildNodes(1).Value

Dim n As cXmlNode
For Each n In x.RootElement.ChildNodes
    Debug.Print n.Name & " " & n.NodeType
Next
' Output:
' book en
' library
' Dune
' book 1
' #comment 8
```

* TOC
{:toc}

## Kinds of node

The parser creates five kinds of node. The text of an element is not in the element's **Value**: it is in the **Text** nodes among the element's **ChildNodes**.

| Kind | **NodeType** | **Name** | **Value** |
|:-----|:-------------|:---------|:----------|
| Document | **Document** (9) | `#document` | empty |
| Element | **Element** (1) | the name in the tag | empty |
| Text | **Text** (3) | `#text` | the text, with entities as written |
| CDATA section | **CData** (4) | `#cdata-section` | the characters between `<![CDATA[` and `]]>` |
| Comment | **Comment** (8) | `#comment` | the characters between `<!--` and `-->` |

```tb check_build check_run
Dim x As New cXml
x.Parse "<r>text<!--note--><![CDATA[data]]></r>"

Dim n As cXmlNode
For Each n In x.RootElement.ChildNodes
    Debug.Print n.Name & " " & n.NodeType & " " & n.Value
Next
' Output:
' #text 3 text
' #comment 8 note
' #cdata-section 4 data
```

The other members of [**XmlNodeType**](mXml#xmlnodetype), **Attribute**, **DocumentFragment**, **Notation** and **None**, are never given to a parsed node. A node made with `New` has the **NodeType** **None**. Attributes are not nodes: they are held in the **Attributes** field of their element.

> [!NOTE] 1.0.0.1
> Names are compared without regard to letter case, in the attribute methods here and in the path members of [**cXml**](cXml#paths). XML itself distinguishes `Item` from `item`, and this package does not.

## Fields

### Attributes
{: .no_toc }

The attributes of an element, as a flat list of names and values.

Syntax: *node*.**Attributes** **As Collection**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

A **Collection** of strings, numbered from 1. Item 1 is the name of the first attribute, item 2 its value, item 3 the name of the second attribute, and so on, in the order the attributes were set or read. A loop with `Step 2` visits the attributes. A new node holds an empty collection, and so does every node that is not an element.

[**GetAttribute**](#getattribute), [**SetAttribute**](#setattribute) and [**RemoveAttribute**](#removeattribute) keep the names and values in pairs. A program that adds to or removes from the collection itself must keep them in pairs too.

```tb check_build check_run
Dim x As New cXml
x.Parse "<item id=""7"" kind=""tool""></item>"

Dim n As cXmlNode
Set n = x.RootElement
Debug.Print n.Attributes.Count

Dim i As Long
For i = 1 To n.Attributes.Count Step 2
    Debug.Print n.Attributes(i) & " = " & n.Attributes(i + 1)
Next
' Output:
' 4
' id = 7
' kind = tool
```

### ChildNodes
{: .no_toc }

The nodes directly inside the node, in document order.

Syntax: *node*.**ChildNodes** **As Collection**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

A **Collection** of **cXmlNode** objects, numbered from 1. It holds elements, text, CDATA sections and comments. The parser adds no text node for text that is only spaces; see [White space](cXml#defect-whitespace). The collection is empty for a text node, a CDATA section and a comment. [**GetChildNode**](#getchildnode) and [**GetChildNodesByName**](#getchildnodesbyname) search the collection by name.

To add a node by hand, set its **NodeType**, **Name** and **Value**, set its [**Parent**](#parent), and add it to the collection. The writer chooses what to write by **NodeType**, not by **Name**.

```tb check_build check_run
Dim x As New cXml
x.CreateNew "r"

Dim t As New cXmlNode
t.NodeType = XmlNodeType.Text
t.Name = "#text"
t.Value = "hello"
Set t.Parent = x.RootElement
x.RootElement.ChildNodes.Add t

Debug.Print x.ToXmlString(False)
' Output:
' <r>hello</r>
```

### Name
{: .no_toc }

The name of the node.

Syntax: *node*.**Name** [ **=** *value* ] **As String**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

A **String**. For an element it is the name written in its tag, with any prefix, such as `ns:item`. For the other kinds it is the fixed name in the table [above](#kinds-of-node). A new node has an empty name. The package does not check a name when it is set.

The path members of [**cXml**](cXml#paths) and the name methods of this class select nodes by **Name**, so `#text` and `#comment` select text nodes and comments.

### NodeType
{: .no_toc }

The kind of the node.

Syntax: *node*.**NodeType** [ **=** *value* ] **As** [**XmlNodeType**](mXml#xmlnodetype)

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

An [**XmlNodeType**](mXml#xmlnodetype) value. A new node has **None** (0). [**ToXmlString**](cXml#toxmlstring) writes a node according to its **NodeType**: a node of any kind not in the [table](#kinds-of-node) is left out of the output.

### Parent
{: .no_toc }

The node that holds this node.

Syntax: *node*.**Parent** **As cXmlNode**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

A **cXmlNode**, or **Nothing**. The parser and [**AddElement**](cXml#addelement) set it. The root element's parent is the document node, and the document node's is **Nothing**. A node made with `New` has none until the program sets it with **Set**.

[**RemoveElement**](cXml#removeelement) takes an element out of its parent's **ChildNodes**, and returns **False** for a node whose **Parent** is **Nothing**. [**Clone**](cXml#clone) and [**Merge**](cXml#merge) leave the **Parent** of the nodes they copy empty; see [Clone, Merge and the root element](cXml#defect-clone).

### Value
{: .no_toc }

The text of a text node, a CDATA section or a comment.

Syntax: *node*.**Value** [ **=** *value* ] **As String**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

A **String**. It is empty for the document node and for elements. For a text node it is the text as it stood in the XML, with any entity left undecoded (see [Entities](cXml#defect-entities)); [**ToXmlString**](cXml#toxmlstring) escapes it again when it writes the node.

## Properties

### Text
{: .no_toc }

Returns the text directly inside the node.

Syntax: *node*.**Text** **As String**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

Read-only. Returns the values of the text nodes and CDATA sections among the node's [**ChildNodes**](#childnodes), one after the other, with nothing between them. Child elements and comments add nothing, and neither does the text inside a child element, which [**GetElementText**](cXml#getelementtext) of a **cXml** includes. A node that has no text node or CDATA section among its children, a text node itself among them, gives an empty string.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a>x<![CDATA[c]]><!--k--><b>y</b>z</a>"

Debug.Print x.RootElement.Text
Debug.Print x.GetElementText("a")
Debug.Print x.RootElement.GetChildNode("b").Text
Debug.Print "[" & x.RootElement.ChildNodes(1).Text & "]"
' Output:
' xcz
' xcyz
' y
' []
```

## Methods

### New
{: .no_toc }

Creates a node.

Syntax: **New cXmlNode**

The constructor takes no arguments. It gives the node an empty **Attributes** collection and an empty **ChildNodes** collection. **Name** and **Value** are empty, **NodeType** is **None** and **Parent** is **Nothing**.

```tb check_build check_run
Dim n As New cXmlNode
Debug.Print n.Name & "|" & n.NodeType & "|" & n.Attributes.Count & "|" & n.ChildNodes.Count & "|" & (n.Parent Is Nothing)
' Output:
' |0|0|0|True
```

### GetAttribute
{: .no_toc }

Returns the value of an attribute.

Syntax: *node*.**GetAttribute** ( *attrName* ) **As String**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*attrName*
: *required* A **String**, the name of the attribute. Letter case is ignored.

Returns the value of the first attribute whose name matches. Returns an empty string when there is no such attribute, which a program cannot tell from an attribute whose value is empty: it compares **Attributes** itself when it needs to.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a id=""7"" empty=""""></a>"

Dim n As cXmlNode
Set n = x.RootElement
Debug.Print "[" & n.GetAttribute("id") & "]"
Debug.Print "[" & n.GetAttribute("ID") & "]"
Debug.Print "[" & n.GetAttribute("empty") & "]"
Debug.Print "[" & n.GetAttribute("missing") & "]"
' Output:
' [7]
' [7]
' []
' []
```

### GetChildNode
{: .no_toc }

Returns the first child with a given name.

Syntax: *node*.**GetChildNode** ( *nodeName* ) **As cXmlNode**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*nodeName*
: *required* A **String**, the name to look for. Letter case is ignored.

Returns the first node in **ChildNodes** whose **Name** matches, or **Nothing**. It looks at the direct children only, not at deeper nodes. The names of the other kinds of node, such as `#text`, match too.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a>1</a><b>2</b><a>3</a></r>"

Dim n As cXmlNode
Set n = x.RootElement.GetChildNode("A")
Debug.Print n.ChildNodes(1).Value
Debug.Print (x.RootElement.GetChildNode("c") Is Nothing)
' Output:
' 1
' True
```

### GetChildNodesByName
{: .no_toc }

Returns all the children with a given name.

Syntax: *node*.**GetChildNodesByName** ( *nodeName* ) **As Collection**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*nodeName*
: *required* A **String**, the name to look for. Letter case is ignored.

Returns a new **Collection** of the nodes in **ChildNodes** whose **Name** matches, in order. The collection is empty when none matches. It looks at the direct children only; [**SelectElements**](cXml#selectelements) searches the whole document.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a>1</a><b>2</b><a>3</a></r>"

Dim found As Collection
Set found = x.RootElement.GetChildNodesByName("a")
Debug.Print found.Count
Debug.Print found(2).ChildNodes(1).Value
Debug.Print x.RootElement.GetChildNodesByName("c").Count
' Output:
' 2
' 3
' 0
```

### RemoveAttribute
{: .no_toc }

Removes an attribute.

Syntax: *node*.**RemoveAttribute** ( *attrName* )

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*attrName*
: *required* A **String**, the name of the attribute. Letter case is ignored.

Removes the first attribute whose name matches, with its value. Nothing happens, and no error is raised, when there is none.

```tb check_build check_run
Dim n As New cXmlNode
n.SetAttribute "a", "1"
n.SetAttribute "b", "2"

n.RemoveAttribute "A"
n.RemoveAttribute "missing"
Debug.Print n.Attributes.Count
Debug.Print n.Attributes(1) & " = " & n.Attributes(2)
' Output:
' 2
' b = 2
```

### SetAttribute
{: .no_toc }

Sets the value of an attribute.

Syntax: *node*.**SetAttribute** ( *attrName* , *attrValue* )

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*attrName*
: *required* A **String**, the name of the attribute. Letter case is ignored when the attribute is looked for.

*attrValue*
: *required* A **String**, the new value. [**ToXmlString**](cXml#toxmlstring) escapes it when it writes the attribute.

Adds the attribute, or replaces the value of the first attribute with that name. A replaced attribute does not stay where it was: the old name and value are removed and the new ones are added at the end of **Attributes**, and the name takes the spelling given to **SetAttribute**. The parser uses the same method, so an attribute that occurs twice in a tag keeps the last value.

Neither the name nor the value is checked. An empty name is accepted, and [**Validate**](cXml#validate) then returns **False**.

```tb check_build check_run
Dim n As New cXmlNode
n.SetAttribute "a", "1"
n.SetAttribute "b", "2"
n.SetAttribute "A", "3"

Dim i As Long
For i = 1 To n.Attributes.Count Step 2
    Debug.Print n.Attributes(i) & " = " & n.Attributes(i + 1)
Next
' Output:
' b = 2
' A = 3
```

### XPath
{: .no_toc }

Returns the nodes that an XPath expression selects, starting at this node.

Syntax: *node*.**XPath** ( *path* ) **As Collection**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*path*
: *required* A **String**, an XPath expression; see the [syntax](mXPath#syntax) that [**mXPath**](mXPath) reads.

Evaluates the expression with [**SelectNodes**](mXPath#selectnodes), with this node as the starting node: `title` selects the child elements named `title`, and `.//title` the descendants. A `/` at the start of the expression is ignored, so the expression does not start at the document, and `//title` searches below this node only. Returns a new **Collection** of **cXmlNode** objects, numbered from 1, with each node in it once, and an empty one when nothing is selected. When the evaluation raises an error, the method writes `Node.XPath query failed:` and the description to the Debug Console, leaves the error in **Err**, and returns an empty collection. The engine reads a part of XPath 1.0 and reads some expressions wrongly; see [Defects](mXPath#defects).

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'><title>Dune</title></book><book id='2'><title>Emma</title><title>Emma II</title></book></catalog>"

Dim b As cXmlNode
Set b = x.XPathSingle("/catalog/book[@id='2']")

Debug.Print b.XPath("title").Count
Debug.Print b.XPath("title[2]").Item(1).Text
Debug.Print b.XPath(".//title").Count
Debug.Print b.XPath("//title").Count
Debug.Print b.XPath("/catalog/book").Count
Debug.Print b.XPath("parent::*/book").Count
' Output:
' 2
' Emma II
' 2
' 2
' 0
' 2
```

### XPathAttribute
{: .no_toc }

Returns an attribute of the first node that an XPath expression selects, starting at this node.

Syntax: *node*.**XPathAttribute** ( *xpath* , *attrName* ) **As String**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*xpath*
: *required* A **String**, an XPath expression that selects the element.

*attrName*
: *required* A **String**, the name of the attribute. Letter case is ignored.

Returns the value of the attribute, as [**GetAttribute**](#getattribute) of the first node that [**XPath**](#xpath) selects does. Returns an empty string when the expression selects nothing or the node has no such attribute, which a program cannot tell from an attribute whose value is empty. The expression is evaluated by [**XPathSingle**](#xpathsingle).

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'><title lang='en'>Dune</title></book><book id='2'><title lang='fr'>Emma</title></book></catalog>"

Dim b As cXmlNode
Set b = x.XPathSingle("/catalog/book[@id='2']")
Debug.Print b.XPathAttribute("title", "lang")
Debug.Print "[" & b.XPathAttribute("author", "lang") & "]"
' Output:
' fr
' []
```

### XPathSingle
{: .no_toc }

Returns the first node that an XPath expression selects, starting at this node.

Syntax: *node*.**XPathSingle** ( *xpath* ) **As cXmlNode**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*xpath*
: *required* A **String**, an XPath expression.

Returns the first node of what [**XPath**](#xpath) returns, or **Nothing** when that is empty. When the evaluation raises an error, it writes `Node.XPathSingle query failed:` and the description to the Debug Console, leaves the error in **Err**, and returns **Nothing**.

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'><title>Dune</title></book></catalog>"

Dim t As cXmlNode
Set t = x.RootElement.XPathSingle("book/title")
Debug.Print t.Text
Debug.Print t.Parent.GetAttribute("id")
Debug.Print (x.RootElement.XPathSingle("magazine") Is Nothing)
' Output:
' Dune
' 1
' True
```

### XPathText
{: .no_toc }

Returns the text of the first node that an XPath expression selects, starting at this node.

Syntax: *node*.**XPathText** ( *xpath* ) **As String**

*node*
: *required* An object expression that evaluates to a **cXmlNode**.

*xpath*
: *required* A **String**, an XPath expression that selects the node.

Returns the [**Text**](#text) of the first node that [**XPath**](#xpath) selects: the text directly inside it, and not the text inside its child elements. A text node and a CDATA section have no children, so when the expression selects one, the result is an empty string; its **Value** holds the text. Returns an empty string too when the expression selects nothing. The expression is evaluated by [**XPathSingle**](#xpathsingle).

> [!NOTE] 1.0.0.1
> The [**XPathText**](cXml#xpathtext) of a **cXml** returns the text at any depth, and returns the value of a text node. For `<a>x<b>y</b>z</a>`, the **cXml** gives `xyz` for `/a`, and the root element gives `xz` for `.`.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a>x<b>y</b>z</a>"

Debug.Print x.XPathText("/a")
Debug.Print x.RootElement.XPathText(".")
Debug.Print x.RootElement.XPathText("b")
Debug.Print "[" & x.RootElement.XPathText("b/text()") & "]"
' Output:
' xyz
' xz
' y
' []
```

## See Also

- [cXml](cXml) class -- holds the document and finds nodes by path
- [mXml](mXml) module -- the node types and the error numbers
- [mXPath](mXPath) module -- the XPath engine behind the **XPath** methods
- [TBMANLIB_Xml](.) package -- overview
