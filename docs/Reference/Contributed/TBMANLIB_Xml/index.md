---
title: TBMANLIB_Xml Package
parent: Experimental Packages
has_toc: false
indexed_from: 1.0.0.1
exclude_from_docs:
  - mXmlTests
  - XPathTokenType
  - XPathAxisType
  - XPathOperator
  - XPathStep
  - XPathPredicate
permalink: /tB/Packages/Contributed/TBMANLIB_Xml/
---

# TBMANLIB_Xml Package
{: .no_toc }

**Author:** woeoio. **Version:** 1.0.0.1

The **TBMANLIB_Xml** contributed package reads, changes and writes XML documents. It has the shape of a small DOM. A [**cXml**](cXml) object holds a document as a tree of [**cXmlNode**](cXmlNode) objects, finds elements by a path such as `library/book` or by an XPath expression, and reads and writes the document as a string or as a UTF-8 file. The [**mXml**](mXml) module holds the node types, the error numbers and two functions that convert between strings and UTF-8 bytes, and the [**mXPath**](mXPath) module evaluates the XPath expressions. The package is written in twinBASIC and calls two functions of the Windows API for the conversion. This section documents version 1.0.0.1, published under the MIT licence.

```tb check_build check_run
Dim x As New cXml
x.CreateNew "library"
x.SetAttribute "library", "city", "Oslo"

Dim book As cXmlNode
Set book = x.AddElement("library", "book")
book.SetAttribute "id", "1"
x.SetElementText "library/book", "Dune"

Dim y As New cXml
y.Parse x.ToXmlString()
Debug.Print y.GetAttribute("library", "city")
Debug.Print y.GetElementText("library/book")
Debug.Print y.ToXmlString(False)
' Output:
' Oslo
' Dune
' <library city="Oslo"><book id="1">Dune</book></library>
```

> [!WARNING] 1.0.0.1
> The parser reads some valid XML wrongly and raises no error, and for some text it never returns. [Defects in version 1.0.0.1](cXml#defects) lists the cases: self-closing elements, entities in text, tags with both kinds of quote or with line breaks, processing instructions, and comments, CDATA sections and DOCTYPE declarations in some positions.

> [!WARNING] 1.0.0.1
> The XPath engine reads some valid expressions wrongly and raises no error: the step `..`, axes such as `ancestor::`, positions after `//`, and the operators `and` and `or`. [Defects in version 1.0.0.1](mXPath#defects) lists the cases.

## What the package reads and writes

A document is read from a string by [**Parse**](cXml#parse), from a file by [**LoadFromFile**](cXml#loadfromfile), or started with [**CreateNew**](cXml#createnew). The package supports:

- elements and their attributes, with attribute values in double or single quotes;
- text, comments and CDATA sections, each held as a node. Text that is only spaces is left out, and text that has a line break or a tab in it is kept;
- the `version` and `encoding` of the XML declaration, which are read, kept and written;
- reading and setting an element's text and attributes, adding and removing elements, copying a document ([**Clone**](cXml#clone)) and appending one to another ([**Merge**](cXml#merge));
- finding nodes by a path of names ([**SelectElement**](cXml#selectelement)) or by an XPath expression ([**XPath**](cXml#xpath)), in the part of XPath 1.0 that [**mXPath**](mXPath) reads;
- writing the document compactly or with line breaks and indentation, with `&`, `<`, `>`, `"` and `'` escaped;
- files in UTF-8. A byte order mark is accepted when a file is read and always written.

The package does not support, in version 1.0.0.1:

- DTDs and schemas. A DOCTYPE declaration is not read, and nothing is validated against a DTD or a schema. [**Validate**](cXml#validate) only checks that elements and attributes have names;
- most of XPath. The [**XPath**](cXml#xpath) methods read a part of XPath 1.0, described on the page of the [**mXPath**](mXPath) module: there is no union, no attribute step, no ancestor or sibling axis, and few functions. The other members that take a path read a list of element names separated by `/`, with no positions, attributes or wildcards; see [Paths](cXml#paths);
- namespaces. A prefix is part of an element's or attribute's name, and no namespace is resolved;
- entities defined in a DTD, and character references such as `&#65;`. The five predefined entities are decoded in attribute values and not in text;
- processing instructions, which are skipped, and the `standalone` pseudo-attribute of the declaration;
- encodings other than UTF-8 in files, whatever the declaration says;
- checking that text is well formed. [**Parse**](cXml#parse) accepts text that is not XML, elements that are not closed and end tags that name another element.

The [**ParseOption**](mXml#parseoption) enumeration, with members such as **PreserveWhitespace** and **ValidateOnParse**, is declared by the module, but no member of the package reads it.

## Failures

No member of the package ends a program with an error of its own. A member that cannot do its work returns **False**, **Nothing**, an empty string or an empty collection, and in the IDE writes a line that names the member to the Debug Console, for example `Parse failed: XML string cannot be empty`. The error stays in the **Err** object after the call. The error numbers are constants of [**mXml**](mXml#constants), and only [**ERR_EMPTY_DOCUMENT**](mXml#err_empty_document) is used. [Reporting failures](cXml#reporting-failures) has the details. The two functions of [**mXPath**](mXPath#selectnodes) are the exception: they handle no error, and the error of an evaluation reaches the program that called them.

## Classes and modules

- [cXml](cXml) -- holds an XML document, reads it from a string or a file, finds, changes and adds elements by path, finds nodes by an XPath expression, and writes it as a string or a file
  - [Document](cXml#document) -- returns the document node
  - [Encoding](cXml#encoding) -- returns or sets the encoding name of the declaration
  - [Initialized](cXml#initialized) -- returns whether the object holds a document
  - [RootElement](cXml#rootelement) -- returns the root element
  - [Version](cXml#version) -- returns or sets the XML version of the declaration
  - [XmlString](cXml#xmlstring) -- returns or sets the text of the document that was last read
  - [New](cXml#new) -- creates an object
  - [AddElement](cXml#addelement) -- adds an empty element as the last child of an element
  - [Clone](cXml#clone) -- returns a copy of the document
  - [CreateNew](cXml#createnew) -- replaces the document with a new one that has a root element
  - [GetAttribute](cXml#getattribute) -- returns an attribute of an element
  - [GetElementText](cXml#getelementtext) -- returns the text inside an element
  - [LoadFromFile](cXml#loadfromfile) -- reads a document from a file
  - [Merge](cXml#merge) -- appends the content of another document
  - [Parse](cXml#parse) -- reads a document from a string
  - [RemoveAttribute](cXml#removeattribute) -- removes an attribute
  - [RemoveElement](cXml#removeelement) -- removes an element
  - [SaveToFile](cXml#savetofile) -- writes the document to a file
  - [SelectElement](cXml#selectelement) -- returns the element that a path selects
  - [SelectElements](cXml#selectelements) -- returns every node with a given name
  - [SetAttribute](cXml#setattribute) -- sets an attribute
  - [SetElementText](cXml#setelementtext) -- replaces the text of an element
  - [ToXmlString](cXml#toxmlstring) -- returns the document as text
  - [Validate](cXml#validate) -- checks that every element and attribute has a name
  - [XPath](cXml#xpath) -- returns the nodes that an XPath expression selects
  - [XPathAttribute](cXml#xpathattribute) -- returns an attribute of the first node that an XPath expression selects
  - [XPathFromRoot](cXml#xpathfromroot) -- returns the nodes that an XPath expression selects, starting at the root element
  - [XPathSingle](cXml#xpathsingle) -- returns the first node that an XPath expression selects
  - [XPathText](cXml#xpathtext) -- returns the text of the first node that an XPath expression selects
- [cXmlNode](cXmlNode) -- one node of a document: an element, text, a CDATA section, a comment or the document itself
  - [Attributes](cXmlNode#attributes) -- holds the attributes as a list of names and values
  - [ChildNodes](cXmlNode#childnodes) -- holds the nodes directly inside the node
  - [Name](cXmlNode#name) -- returns or sets the name
  - [NodeType](cXmlNode#nodetype) -- returns or sets the kind of node
  - [Parent](cXmlNode#parent) -- returns the node that holds this one
  - [Text](cXmlNode#text) -- returns the text directly inside the node
  - [Value](cXmlNode#value) -- returns or sets the text of a text node, a CDATA section or a comment
  - [New](cXmlNode#new) -- creates a node
  - [GetAttribute](cXmlNode#getattribute) -- returns the value of an attribute
  - [GetChildNode](cXmlNode#getchildnode) -- returns the first child with a given name
  - [GetChildNodesByName](cXmlNode#getchildnodesbyname) -- returns all the children with a given name
  - [RemoveAttribute](cXmlNode#removeattribute) -- removes an attribute
  - [SetAttribute](cXmlNode#setattribute) -- sets the value of an attribute
  - [XPath](cXmlNode#xpath) -- returns the nodes that an XPath expression selects, starting at the node
  - [XPathAttribute](cXmlNode#xpathattribute) -- returns an attribute of the first node that an XPath expression selects
  - [XPathSingle](cXmlNode#xpathsingle) -- returns the first node that an XPath expression selects
  - [XPathText](cXmlNode#xpathtext) -- returns the text directly inside the first node that an XPath expression selects
- [mXml](mXml) -- the node types, the parse options, the error numbers, the defaults and the UTF-8 conversion functions
  - [XmlNodeType](mXml#xmlnodetype) -- the kinds of node
  - [ParseOption](mXml#parseoption) -- four flags that no member reads
  - [ERR_BASE](mXml#err_base) and the other [error numbers](mXml#constants) -- the base of the package's error numbers, and the numbers
  - [DEFAULT_XML_VERSION](mXml#default_xml_version), [DEFAULT_ENCODING](mXml#default_encoding) and [DEFAULT_INDENT](mXml#default_indent) -- the defaults
  - [StringToUTF8Bytes](mXml#stringtoutf8bytes) -- converts a string to UTF-8 bytes
  - [UTF8BytesToString](mXml#utf8bytestostring) -- converts UTF-8 bytes to a string
- [mXPath](mXPath) -- the XPath engine behind the **XPath** methods
  - [SelectNodes](mXPath#selectnodes) -- returns the nodes that an XPath expression selects
  - [SelectSingleNode](mXPath#selectsinglenode) -- returns the first node that an XPath expression selects

## The test module

The package also contains **mXmlTests**, a module of unit tests for **cXml**, which has no page of its own here. **mXmlTests.RunAllTests** runs 119 checks and writes a line for each to the Debug Console: `[PASS]` or `[FAIL]` and the check's message, grouped under the name of the test. It ends with a summary of the totals, the pass rate and a closing line; in version 1.0.0.1 all 119 pass. Each test is also a public **Sub** of the module that can be run alone.

The checks compare one value at a time and do not exercise the cases listed under [Defects in version 1.0.0.1](cXml#defects): the test of self-closing tags tests that the output contains `/>`, and the namespace test tests that **Parse** returns **True**. The eight XPath tests test the forms that [**mXPath**](mXPath) reads, and none of the cases listed under its [defects](mXPath#defects). The file tests write `test_output.xml` and `test_output_pretty.xml` in the current folder, and leave them there.

## See Also

- [cXml](cXml) class -- the document
- [cXmlNode](cXmlNode) class -- the nodes
- [mXml](mXml) module -- constants, enumerations and UTF-8 conversion
- [Experimental Packages](../../Experimental/) -- the packages from TWINSERV that are not yet ready for use in a program
