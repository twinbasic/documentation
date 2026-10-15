---
title: mXPath
parent: TBMANLIB_Xml Package
permalink: /tB/Packages/Contributed/TBMANLIB_Xml/mXPath
has_toc: false
---

# mXPath module
{: .no_toc }

The **mXPath** module is the XPath engine of the package. It finds the nodes of a document that an XPath expression selects. The **XPath** methods of [**cXml**](cXml#xpath) and [**cXmlNode**](cXmlNode#xpath) call it, and a program can call its two functions, [**SelectNodes**](#selectnodes) and [**SelectSingleNode**](#selectsinglenode), with any node of a document as the starting point. A program reaches them with the module's name in front (`mXPath.SelectNodes`) or by their own names.

The engine reads a part of XPath 1.0: steps that go to children, descendants, the parent and the node itself, a few node tests, and predicates that test a position, an attribute, the text of a node or a child. It does not refuse an expression it cannot read. Some expressions select nothing, and some are read as other expressions and select the wrong nodes; [Defects in version 1.0.0.1](#defects) lists them.

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog>" & _
        "<book id='1' cat='fiction' price='12.5'><title>Dune</title></book>" & _
        "<book id='2' cat='fiction' price='8'><title>Emma</title></book>" & _
        "<book id='3' cat='science' price='30'><title>Cosmos</title></book>" & _
        "</catalog>"

Dim n As cXmlNode
For Each n In mXPath.SelectNodes(x.Document, "//book[@cat='fiction'][@price>10]")
    Debug.Print n.GetAttribute("id") & " " & n.XPathText("title")
Next
Debug.Print x.XPathText("/catalog/book[last()]/title")
Debug.Print x.XPathAttribute("//book[@id='2']", "cat")
' Output:
' 1 Dune
' Cosmos
' fiction
```

<!-- test: XPathStepTests.ParentStep_AfterChildSteps_SelectsTheParent, XPathStepTests.Axes_Ancestor_SelectsTheAncestors, XPathPredicateTests.Positions_AfterDoubleSlash_CountPerParent, XPathPredicateTests.Logic_AndBeforeOr_BindsAndTighter, XPathPredicateTests.Logic_OrBeforeAnd_BindsAndTighter, XPathPredicateTests.Logic_AndInsideAQuotedString_IsNotAnOperator, XPathPredicateTests.Compare_QuotedStringWithGreaterThan_IsOneValue, XPathPredicateTests.Contains_LetterCase_IsSignificant -->
> [!WARNING] 1.0.0.1
> Several expressions that are valid XPath are read wrongly and raise no error: the parent step `..` selects nothing, `ancestor::a` is read as `child::a`, `//book[1]` selects one node where XPath selects one for each parent, and `and`, `or` and the comparison operators are found by plain searches of the text, and comparisons ignore letter case. [Defects in version 1.0.0.1](#defects) has each case.

* TOC
{:toc}

## Syntax
{: #syntax }

An expression is a list of steps separated by `/`, and each step can have predicates in square brackets. White space around a step is ignored, and so is a `/` at the end.

### Where a path starts
{: .no_toc }

The functions take the node to start from. [**XPath**](cXml#xpath) of a [**cXml**](cXml) starts at the document node, [**XPathFromRoot**](cXml#xpathfromroot) at the root element, and the **XPath** of a [**cXmlNode**](cXmlNode#xpath) at that node. The first step selects from the starting node, and each later step from every node the step before selected.

<!-- test: XPathEngineTests.Context_FromTheDocumentNode_ALeadingSlashChangesNothing, XPathEngineTests.Context_FromAnElement_ASlashAtTheStartIsIgnoredAndTheSearchStaysBelow, XPathEngineTests.Context_XPathFromRoot_StartsAtTheRootElement -->
A `/` at the start of an expression does not make it start at the document: it is ignored. Starting at the document node, `/catalog` and `catalog` are the same expression and select the root element. Starting at any other node, `/catalog` selects a child of that node named `catalog`, and `//title` searches below that node only. No expression reaches a node outside the subtree of the starting node, except through the **parent** axis.
<!-- /test -->

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'><title>Dune</title></book><book id='2'><title>Emma</title></book></catalog>"

Dim book As cXmlNode
Set book = x.XPathSingle("/catalog/book[@id='2']")

Debug.Print x.XPath("catalog/book").Count
Debug.Print x.XPath("/catalog/book").Count
Debug.Print x.XPath("//title").Count
Debug.Print book.XPath("//title").Count
Debug.Print book.XPath("/title").Count
Debug.Print book.XPath("/catalog/book").Count
Debug.Print x.XPathFromRoot("book").Count
Debug.Print x.XPathFromRoot("/catalog/book").Count
' Output:
' 2
' 2
' 2
' 1
' 1
' 0
' 2
' 0
```

### Steps
{: .no_toc }

A step selects nodes by their **Name** and kind. Letter case is ignored in names, so `/CATALOG/Book` selects the same nodes as `/catalog/book`.

<!-- test: XPathEngineTests.Steps_NamesAndNodeTests_SelectAsMsxml, XPathEngineTests.Steps_NodesThatAreNotElements_ArePickedByTheirNames, XPathStepTests.ParentAxis_ParentColonColon_SelectsTheParent, XPathStepTests.Axes_Child_Descendant_Self_AreRead -->
| Step | Selects |
|:-----|:--------|
| `name` | the children whose **Name** is *name*. The names of the nodes that are not elements, `#text`, `#comment` and `#cdata-section`, work too |
| `prefix:name` | the children whose whole name is `prefix:name`. The engine does no namespace processing |
| `*` | all the child elements |
| `node()` | all the children, of every kind |
| `text()` | the children that are text nodes. CDATA sections are not text nodes here |
| `comment()` | the children that are comments |
| `.` | the node itself |
| `//` between two steps | the next step looks at descendants at any depth, and not only children |
| `//` at the start | the same, from the starting node, which it does not include |
| `child::`, `descendant::`, `parent::`, `self::` before a step | the step goes to the children, the descendants, the parent or the node itself. These are the axes the engine knows, and the name of an axis is not case sensitive. `parent::*` selects the parent when it is an element, and `parent::node()` selects it whatever it is |

<!-- /test -->

Each node is in the result once, however many routes reach it, and a path that selects nothing gives an empty collection.

```tb check_build check_run
Dim x As New cXml
x.Parse "<lib><shelf id='s1'><book id='a'></book><!--c--><book id='b'>text</book></shelf><shelf id='s2'><book id='c'></book></shelf></lib>"

Dim q As Variant
Dim n As cXmlNode
Dim names As String
For Each q In Array("/lib/shelf", "/LIB/Shelf", "//book", "/lib//book", "/lib/shelf/*", "/lib/shelf/node()", "/lib/shelf/comment()", "//book/text()", "/lib/shelf/#comment", "/lib/shelf/book/parent::shelf", "//book/parent::*", "/lib/./shelf/self::shelf", "//shelf/child::book", "/lib/descendant::book", "/lib/self::shelf")
    names = ""
    For Each n In x.XPath(q)
        names = names & " " & n.Name & ":" & n.GetAttribute("id") & n.Value
    Next
    Debug.Print q & " ->" & names
Next
' Output:
' /lib/shelf -> shelf:s1 shelf:s2
' /LIB/Shelf -> shelf:s1 shelf:s2
' //book -> book:a book:b book:c
' /lib//book -> book:a book:b book:c
' /lib/shelf/* -> book:a book:b book:c
' /lib/shelf/node() -> book:a #comment:c book:b book:c
' /lib/shelf/comment() -> #comment:c
' //book/text() -> #text:text
' /lib/shelf/#comment -> #comment:c
' /lib/shelf/book/parent::shelf -> shelf:s1 shelf:s2
' //book/parent::* -> shelf:s1 shelf:s2
' /lib/./shelf/self::shelf -> shelf:s1 shelf:s2
' //shelf/child::book -> book:a book:b book:c
' /lib/descendant::book -> book:a book:b book:c
' /lib/self::shelf ->
```

### Predicates
{: .no_toc }

A predicate in square brackets keeps some of the nodes that its step selected. A step can have several, and each one works on the nodes the one before kept: `book[@cat='fiction'][2]` is the second of the fiction books. White space around a predicate and around an operator is ignored.

<!-- test: XPathEngineTests.Predicates_StandardForms_SelectAsMsxml, XPathPredicateTests.Positions_ChildStep_CountsTheChildrenOfEachParent, XPathPredicateTests.Positions_ShortForms_WorkAsTheLongForms, XPathPredicateTests.Logic_AndOfTwoComparisons_KeepsTheNodesThatSatisfyBoth, XPathPredicateTests.Logic_OrOfTwoComparisons_KeepsTheNodesThatSatisfyOne, XPathPredicateTests.Compare_AttributeExists_KeepsTheNodesThatHaveIt, XPathPredicateTests.Compare_QuotedStringWithEqualsSign_IsOneValue, XPathPredicateTests.TextCompare_Equals_KeepsTheNodesWithThatText -->
| Predicate | Keeps |
|:----------|:------|
| `[3]` | the third node. A position counts, from 1, the nodes that the step selected from one node of the step before; a number out of range keeps nothing |
| `[last()]` | the last node |
| `[position()=3]` | the third node. No space is allowed between `position()` and `=` |
| `[@id]` | the nodes that have the attribute, even when its value is empty |
| `[@id='1']`, `[@id="1"]`, `[@id=1]` | the nodes whose attribute equals the text. The quotes can be left out |
| `[@id!='1']` | the nodes whose attribute differs from the text |
| `[@price>10]`, `[@price<10]`, `[@price>=10]`, `[@price<=10]` | the nodes whose attribute is greater than, less than, at least or at most the value |
| `[text()]` | the nodes that have text of their own |
| `[text()='Dune']` | the nodes whose own text equals the text |
| `[name]` | the nodes that have a child named *name*, of any kind |
| `[contains(@id, 'a')]` | the nodes where the first argument contains the second |
| `[starts-with(@id, 'a')]` | the nodes where the first argument begins with the second |
| `[not(@id)]` | the nodes that the predicate inside does not keep |
| `[@a='1' and @b='2']`, `[@a='1' or @b='2']` | the nodes that satisfy both parts, or at least one. The words need a space on each side and can be written in any letter case |

<!-- /test -->

The names of the functions are not case sensitive, and the opening parenthesis must follow the name directly. The first argument of **contains** and **starts-with** is `@name` for an attribute, `text()` or `.` for the text of the node, or a quoted string. Any other first argument is taken as the text itself, not evaluated. The second argument is a quoted string, or text that is used as it is. The two arguments are separated at the first comma that is not inside quotes, so a second argument can hold commas.

**Text** here means the text nodes and CDATA sections directly inside the node, one after the other. Child elements do not count and nothing is trimmed, so the text of an element in an indented document includes the line breaks and the indentation around it.

**Comparing** attributes follows these rules:

- `=` and `!=` compare text, and letter case does not matter. `@price=8` selects an attribute whose value is `8`, and `@price=8.0` does not.
- `<`, `>`, `<=` and `>=` compare numbers when both sides read as numbers, and text otherwise, again without regard to letter case.
- A name is looked up without regard to letter case, as everywhere in the package.
- An attribute that is not there compares as an empty string; see [Comparing attributes](#defect-attributes).

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog>" & _
        "<book id='1' cat='fiction' price='12.5'><title>Dune</title><author>Herbert</author></book>" & _
        "<book id='2' cat='fiction' price='8'><title>Emma</title><author>Austen</author></book>" & _
        "<book id='3' cat='science' price='30'><title>Cosmos</title><author>Sagan</author></book>" & _
        "</catalog>"

Dim q As Variant
Dim n As cXmlNode
Dim ids As String
For Each q In Array("//book[2]", "//book[last()]", "//book[position()=1]", "//book[@id]", "//book[@cat='FICTION']", "//book[@id=3]", "//book[@cat!='fiction']", "//book[@price>10]", "//book[@price<=8]", "//book[@price>'10']", "//book[@price=8.0]", "//book[@cat='fiction'][2]", "//book[title]", "//title[text()='Dune']", "//author[contains(text(), 'a')]", "//book[starts-with(@cat, 'sci')]", "//book[not(@cat='fiction')]", "//book[@cat='fiction' and @price>10]", "//book[@id='1' or @id='3']", "//book[ @id = '2' ]")
    ids = ""
    For Each n In x.XPath(q)
        ids = ids & " " & n.GetAttribute("id") & n.Text
    Next
    Debug.Print q & " ->" & ids
Next
' Output:
' //book[2] -> 2
' //book[last()] -> 3
' //book[position()=1] -> 1
' //book[@id] -> 1 2 3
' //book[@cat='FICTION'] -> 1 2
' //book[@id=3] -> 3
' //book[@cat!='fiction'] -> 3
' //book[@price>10] -> 1 3
' //book[@price<=8] -> 2
' //book[@price>'10'] -> 1 3
' //book[@price=8.0] ->
' //book[@cat='fiction'][2] -> 2
' //book[title] -> 1 2 3
' //title[text()='Dune'] -> Dune
' //author[contains(text(), 'a')] -> Austen Sagan
' //book[starts-with(@cat, 'sci')] -> 3
' //book[not(@cat='fiction')] -> 3
' //book[@cat='fiction' and @price>10] -> 1
' //book[@id='1' or @id='3'] -> 1 3
' //book[ @id = '2' ] -> 2
```

### What the engine does not read
{: .no_toc }

These parts of XPath select nothing, and raise no error.

<!-- test: XPathEngineTests.Limits_AttributeSteps_SelectNothing, XPathEngineTests.Limits_UnionGroupingAndTwoAttributes_SelectNothing, XPathEngineTests.Limits_OtherFunctions_SelectNothing, XPathPredicateTests.ChildCompare_ChildEqualsText_KeepsTheNodesWhoseChildHasThatText, XPathPredicateTests.SelfCompare_DotEqualsText_KeepsTheNodesWithThatText, XPathPredicateTests.Positions_LastMinusOne_SelectsTheNextToLast, XPathPredicateTests.Positions_PositionGreaterThan_SelectsTheLaterOnes -->
- A step for an attribute, `@id`, as in `/catalog/book/@id` and `//@id`, and the **attribute** axis. [**XPathAttribute**](cXml#xpathattribute) and the **GetAttribute** methods read attributes.
- The union operator `|`, parentheses used for grouping, arithmetic, and comparisons between two paths or two attributes.
- Functions other than `contains`, `starts-with`, `not`, `text`, `last` and `position`, such as `count`, `name`, `local-name`, `string-length` and `normalize-space`, and `position()` or `last()` in any form other than those in the table. Such a predicate is read as the name of a child, which no element has.
- A comparison with a child or with `.`, as in `book[title='Dune']` and `title[.='Dune']`; see [Text and child comparisons](#defect-text).
<!-- /test -->

Other expressions are not refused either, and are read as something different from what XPath 1.0 says. They are listed under [Defects in version 1.0.0.1](#defects).

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'><title>Dune</title></book><book id='2'><title>Emma</title></book></catalog>"

Dim q As Variant
For Each q In Array("/catalog/book/@id", "//@id", "/catalog/book/attribute::id", "//title | //book", "//book[(@id='1')]", "//book[@id=@id]", "//book[count(title)=1]", "//book[last()-1]", "//book[position()>1]", "//book[title='Dune']", "//title[.='Dune']")
    Debug.Print q & " -> " & x.XPath(q).Count
Next
' Output:
' /catalog/book/@id -> 0
' //@id -> 0
' /catalog/book/attribute::id -> 0
' //title | //book -> 0
' //book[(@id='1')] -> 0
' //book[@id=@id] -> 0
' //book[count(title)=1] -> 0
' //book[last()-1] -> 0
' //book[position()>1] -> 0
' //book[title='Dune'] -> 0
' //title[.='Dune'] -> 0
```

## Functions

### SelectNodes
{: .no_toc }

Returns the nodes that an XPath expression selects.

Syntax: **SelectNodes** ( *contextNode* , *xpath* ) **As Collection**

*contextNode*
: *required* A [**cXmlNode**](cXmlNode), the node the expression starts from. It can be a node of any kind, and the document node of a [**cXml**](cXml) is [**Document**](cXml#document).

*xpath*
: *required* A **String**, the expression; see [Syntax](#syntax).

<!-- test: XPathEngineTests.SelectNodes_ContextNodeAndExpression_ReturnTheNodes, XPathEngineTests.SelectNodes_PositionTooLargeForALong_RaisesOverflow, XPathEngineTests.XPath_PositionTooLargeForALong_ReturnsAnEmptyCollectionAndLeavesTheError -->
Returns a new **Collection** of **cXmlNode** objects, numbered from 1, in the order the steps found them. Each node is in it once. The collection is empty, and is not **Nothing**, when the expression selects nothing, when *xpath* is an empty string, when *contextNode* is **Nothing**, and when the expression has no step, such as `/` or `//`.

The function handles no error. A program that calls it directly meets the errors that the evaluation raises: error 6 (*Overflow*) for a position too large for a **Long**, such as `[99999999999]`. The **XPath** methods of [**cXml**](cXml#xpath) and [**cXmlNode**](cXmlNode#xpath) catch it, write a line that begins `XPath query failed:` to the Debug Console, and return an empty collection.
<!-- /test -->

<!-- test: XPathEngineTests.SelectNodes_ManyNodes_TimeGrowsInStepWithTheirNumber -->
> [!NOTE] 1.0.0.1
> The time grows with the square of the number of nodes the query visits, because each node found is compared with all the ones found before. Finding 2,000 elements with `//item` takes about a second, and each doubling of the count multiplies the time by about four. [**SelectElements**](cXml#selectelements) has no such cost.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a><b id='1'></b><b id='2'></b></a>"

Dim found As Collection
Set found = mXPath.SelectNodes(x.RootElement, "b")
Debug.Print found.Count & " " & found(2).GetAttribute("id")
Debug.Print mXPath.SelectNodes(Nothing, "b").Count
Debug.Print mXPath.SelectNodes(x.Document, "").Count

On Error Resume Next
Set found = mXPath.SelectNodes(x.Document, "//b[99999999999]")
Debug.Print Err.Number & " " & Err.Description
On Error GoTo 0
Debug.Print x.XPath("//b[99999999999]").Count
' Output:
' 2 2
' 0
' 0
' 6 Overflow
' XPath query failed: Overflow
' 0
```

### SelectSingleNode
{: .no_toc }

Returns the first node that an XPath expression selects.

Syntax: **SelectSingleNode** ( *contextNode* , *xpath* ) **As** [**cXmlNode**](cXmlNode)

*contextNode*
: *required* A **cXmlNode**, the node the expression starts from.

*xpath*
: *required* A **String**, the expression.

<!-- test: XPathEngineTests.SelectSingleNode_ReturnsTheFirstNodeOrNothing -->
Returns the first node of what [**SelectNodes**](#selectnodes) returns, or **Nothing** when that is empty. It raises the errors of **SelectNodes** too.
<!-- /test -->

```tb check_build check_run
Dim x As New cXml
x.Parse "<a><b id='1'></b><b id='2'></b></a>"

Dim n As cXmlNode
Set n = mXPath.SelectSingleNode(x.Document, "//b[@id='2']")
Debug.Print n.GetAttribute("id")
Debug.Print (mXPath.SelectSingleNode(x.Document, "/zzz") Is Nothing)
Debug.Print (mXPath.SelectSingleNode(Nothing, "/a") Is Nothing)
' Output:
' 2
' True
' True
```

## Defects in version 1.0.0.1
{: #defects }

Each of these sections describes an expression that the engine reads differently from XPath 1.0 and that raises no error. The samples show the result of the version named here.

### The parent step
{: #defect-parent .no_toc }

<!-- test: XPathStepTests.ParentStep_AfterChildSteps_SelectsTheParent, XPathStepTests.ParentStep_AfterDescendantStep_SelectsTheParents, XPathStepTests.ParentStep_Twice_SelectsTheGrandparent, XPathStepTests.ParentAxis_ParentColonColon_SelectsTheParent -->
> [!WARNING] 1.0.0.1
> The step `..` selects nothing. The `parent::` axis works, so `parent::*` or `parent::book` takes its place.

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'><title>Dune</title></book></catalog>"

Debug.Print x.XPath("/catalog/book/title/..").Count
Debug.Print x.XPath("/catalog/book/title/parent::*").Count
Debug.Print x.XPath("/catalog/book/title/parent::book").Count
' Output:
' 0
' 1
' 1
```

### Axes
{: #defect-axes .no_toc }

<!-- test: XPathStepTests.Axes_Ancestor_SelectsTheAncestors, XPathStepTests.Axes_AncestorOrSelf_SelectsTheNodeAndItsAncestors, XPathStepTests.Axes_FollowingSibling_SelectsTheLaterSiblings, XPathStepTests.Axes_PrecedingSibling_SelectsTheEarlierSiblings, XPathStepTests.Axes_DescendantOrSelf_SelectsTheNodeAndItsDescendants, XPathStepTests.Axes_Following_SelectsTheNodesAfterTheSubtree -->
> [!WARNING] 1.0.0.1
> An axis other than **child**, **descendant**, **parent**, **self** and **attribute** is not refused. The engine drops the axis and reads the rest of the step as a child step, so `ancestor::a` selects a child named `a`, where XPath selects an ancestor, and `following-sibling::b` selects a child named `b`. `descendant-or-self::` is read as `child::`.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a id='outer'><b><a id='inner'></a></b></a>"
Debug.Print x.XPathAttribute("/a/b/ancestor::a", "id")
Debug.Print x.XPathAttribute("/a/b/parent::a", "id")

x.Parse "<r><a><b id='child'></b></a><b id='sibling'></b></r>"
Debug.Print x.XPathAttribute("/r/a/following-sibling::b", "id")
' Output:
' inner
' outer
' child
```

### Positions
{: #defect-positions .no_toc }

<!-- test: XPathPredicateTests.Positions_ChildStep_CountsTheChildrenOfEachParent, XPathPredicateTests.Positions_AfterDoubleSlash_CountPerParent, XPathPredicateTests.Positions_AfterDoubleSlash_LastIsThatOfEachParent, XPathPredicateTests.Positions_AfterDescendantStepInThePath_CountPerParent, XPathPredicateTests.Positions_LastMinusOne_SelectsTheNextToLast, XPathPredicateTests.Positions_PositionWithSpacesAroundTheEqualsSign_SelectsThePosition, XPathPredicateTests.Positions_PositionEqualsLast_SelectsTheLast, XPathPredicateTests.Positions_PositionGreaterThan_SelectsTheLaterOnes, XPathPredicateTests.Positions_FractionalNumber_SelectsNothing -->
> [!WARNING] 1.0.0.1
> A position counts the nodes that the step selected from one node of the step before. After `//`, those are all the descendants at any depth, so `//book[1]` is the first book in the whole document, where XPath gives the first book of each parent. A step written with `/` counts the children of each parent, as XPath does. Positions in any form other than `[n]`, `[last()]` and `[position()=n]` select nothing: `[last()-1]`, `[position()>1]`, `[position() = 2]` with spaces, and `[position()=last()]`. A position that is not a whole number is rounded to one, so `[1.5]` is the second node.

```tb check_build check_run
Dim x As New cXml
x.Parse "<lib><shelf><book id='a'></book><book id='b'></book></shelf><shelf><book id='c'></book><book id='d'></book></shelf></lib>"

Dim q As Variant
Dim n As cXmlNode
Dim ids As String
For Each q In Array("/lib/shelf/book[1]", "//book[1]", "/lib//book[1]", "//shelf/book[last()]", "//book[last()]", "//shelf/book[last()-1]", "//shelf/book[position() = 1]")
    ids = ""
    For Each n In x.XPath(q)
        ids = ids & " " & n.GetAttribute("id")
    Next
    Debug.Print q & " ->" & ids
Next
' Output:
' /lib/shelf/book[1] -> a c
' //book[1] -> a
' /lib//book[1] -> a
' //shelf/book[last()] -> b d
' //book[last()] -> d
' //shelf/book[last()-1] ->
' //shelf/book[position() = 1] ->
```

### Logical operators
{: #defect-logic .no_toc }

<!-- test: XPathPredicateTests.Logic_AndBeforeOr_BindsAndTighter, XPathPredicateTests.Logic_OrBeforeAnd_BindsAndTighter, XPathPredicateTests.Logic_AndInsideAQuotedString_IsNotAnOperator, XPathPredicateTests.Logic_OrInsideAQuotedString_IsNotAnOperator, XPathPredicateTests.Logic_NotOfAnd_KeepsTheNodesThatLackOne, XPathPredicateTests.Logic_ParenthesesAroundComparisons_GroupThem -->
> [!WARNING] 1.0.0.1
> `and` and `or` are found by a search for the first ` and ` and the first ` or ` in the text of the predicate, and the search does not skip quoted strings or parentheses. The predicate is cut at the first ` and ` if there is one, and the two halves are read separately, so `or` binds tighter than `and`: `a and b or c` is read as `a and (b or c)`, and `a or b and c` as `(a or b) and c`. XPath binds `and` tighter. A string that holds ` and ` or ` or `, such as `@t='salt and pepper'`, cuts the string in two, and the predicate selects nothing. Parentheses are not read as grouping: `not(@x and @y)` and `(@x='1') and (@y='2')` select nothing.

```tb check_build check_run
Dim x As New cXml
x.Parse "<s><i id='1' x='1' y='2'></i><i id='2' z='3'></i><i id='3' x='1'></i></s>"

Dim q As Variant
Dim n As cXmlNode
Dim ids As String
For Each q In Array("//i[@x='1' and @y='2']", "//i[@x='1' or @z='3']", "//i[@x='1' and @y='2' or @z='3']", "//i[@z='3' or @x='1' and @y='2']", "//i[not(@x and @y)]", "//i[(@x='1') and (@y='2')]")
    ids = ""
    For Each n In x.XPath(q)
        ids = ids & " " & n.GetAttribute("id")
    Next
    Debug.Print q & " ->" & ids
Next

x.Parse "<s><i id='1' t='salt and pepper'></i></s>"
Debug.Print x.XPath("//i[@t='salt and pepper']").Count
Debug.Print x.XPath("//i[contains(@t, 'and')]").Count
' Output:
' //i[@x='1' and @y='2'] -> 1
' //i[@x='1' or @z='3'] -> 1 2 3
' //i[@x='1' and @y='2' or @z='3'] -> 1
' //i[@z='3' or @x='1' and @y='2'] -> 1
' //i[not(@x and @y)] ->
' //i[(@x='1') and (@y='2')] ->
' 0
' 1
```

XPath 1.0 selects `1 2` for the third and fourth queries, `2 3` for the fifth and `1` for the sixth.

### Comparing attributes
{: #defect-attributes .no_toc }

<!-- test: XPathPredicateTests.Compare_LessThanOnAMissingAttribute_IsFalse, XPathPredicateTests.Compare_NotEqualOnAMissingAttribute_IsFalse, XPathPredicateTests.Compare_EqualToEmptyStringOnAMissingAttribute_IsFalse, XPathPredicateTests.Compare_QuotedStringWithGreaterThan_IsOneValue, XPathPredicateTests.Compare_QuotedStringWithLessThan_IsOneValue, XPathPredicateTests.Compare_QuotedStringWithNotEquals_IsOneValue -->
> [!WARNING] 1.0.0.1
> An attribute that a node does not have compares as an empty string, so `@p<10`, `@p!='x'` and `@p=''` keep the nodes that lack `p`; in XPath 1.0 a comparison with a missing attribute is false. A comparison operator is found by a search of the whole predicate, quoted strings included. A quoted string that holds `>`, `<` or `!=` therefore moves the split, and the attribute is looked up under a name such as `t='a`, which no node has, so it compares as an empty string: `@t='a<b'` and `@t='a!=b'` keep every node, and `@t='a>b'` keeps none, even a node whose `t` is `a>b`.

```tb check_build check_run
Dim x As New cXml
x.Parse "<s><i id='1' p='5'></i><i id='2'></i><i id='3' p='abc'></i><i id='4' p=''></i></s>"

Dim q As Variant
Dim n As cXmlNode
Dim ids As String
For Each q In Array("//i[@p]", "//i[@p<10]", "//i[@p>10]", "//i[@p!='x']", "//i[@p='']")
    ids = ""
    For Each n In x.XPath(q)
        ids = ids & " " & n.GetAttribute("id")
    Next
    Debug.Print q & " ->" & ids
Next

x.Parse "<r><i id='1' t='a&gt;b'></i><i id='2' t='a=b'></i></r>"
Debug.Print x.XPath("//i[@t='a=b']").Count
Debug.Print x.XPath("//i[@t='a>b']").Count
Debug.Print x.XPath("//i[@t='a<b']").Count
' Output:
' //i[@p] -> 1 3 4
' //i[@p<10] -> 1 2 4
' //i[@p>10] -> 3
' //i[@p!='x'] -> 1 2 3 4
' //i[@p=''] -> 2 4
' 1
' 0
' 2
```

### Text and child comparisons
{: #defect-text .no_toc }

<!-- test: XPathPredicateTests.TextCompare_NotEquals_KeepsTheNodesWithOtherText, XPathPredicateTests.TextCompare_GreaterThanText_IsAComparisonOfNumbers, XPathPredicateTests.ChildCompare_ChildEqualsText_KeepsTheNodesWhoseChildHasThatText, XPathPredicateTests.SelfCompare_DotEqualsText_KeepsTheNodesWithThatText, XPathPredicateTests.Contains_FirstArgumentIsAChildName_TestsTheChildsText -->
> [!WARNING] 1.0.0.1
> A predicate that starts with `text()` is read as a test of the node's own text. Its operator is taken to be the first `=` in it, whatever comes before, so `text()!='Dune'` selects the nodes whose text equals `Dune`, and an operator without `=` (`text()>'Z'`) is ignored, so the predicate keeps every node that has text. A comparison with a child (`book[title='Dune']`) or with the node (`title[.='Dune']`) selects nothing. In `contains` and `starts-with`, a first argument that is the name of a child is taken as the text of the name: `contains(title, 'i')` asks whether the word `title` has an `i` in it, and is true for every node.

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'><title>Dune</title></book><book id='2'><title>Emma</title></book></catalog>"

Dim q As Variant
Dim n As cXmlNode
Dim ids As String
For Each q In Array("//title[text()='Dune']", "//title[text()!='Dune']", "//title[text()>'Z']", "//book[title='Dune']", "//title[.='Dune']", "//book[contains(title, 'i')]")
    ids = ""
    For Each n In x.XPath(q)
        ids = ids & " " & n.Name & ":" & n.GetAttribute("id") & n.Text
    Next
    Debug.Print q & " ->" & ids
Next
' Output:
' //title[text()='Dune'] -> title:Dune
' //title[text()!='Dune'] -> title:Dune
' //title[text()>'Z'] -> title:Dune title:Emma
' //book[title='Dune'] ->
' //title[.='Dune'] ->
' //book[contains(title, 'i')] -> book:1 book:2
```

### Letter case in comparisons
{: #defect-case .no_toc }

<!-- test: XPathPredicateTests.Compare_AttributeValueLetterCase_IsSignificant, XPathPredicateTests.Contains_LetterCase_IsSignificant, XPathPredicateTests.StartsWith_LetterCase_IsSignificant -->
> [!WARNING] 1.0.0.1
> Comparisons of text ignore letter case, where XPath 1.0 compares exactly. `=`, `!=`, `contains()` and `starts-with()` treat `A` and `a` as the same character, so `@cat='FICTION'` keeps a node whose `cat` is `fiction`, and `contains(text(), 'a')` also finds `Austen`.

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1' cat='fiction'><author>Herbert</author></book><book id='2' cat='fiction'><author>Austen</author></book><book id='3' cat='science'><author>Sagan</author></book></catalog>"

Dim q As Variant
For Each q In Array("//book[@cat='FICTION']", "//author[contains(text(), 'a')]", "//author[starts-with(text(), 'h')]")
    Debug.Print q & " -> " & x.XPath(q).Count
Next
' Output:
' //book[@cat='FICTION'] -> 2
' //author[contains(text(), 'a')] -> 2
' //author[starts-with(text(), 'h')] -> 1
```

XPath 1.0 selects no node for the first and third queries, and only `Sagan` for the second.

### A bracket that is not closed
{: #defect-brackets .no_toc }

<!-- test: XPathPredicateTests.Brackets_PredicateWithoutClosingBracket_SelectsNothing, XPathPredicateTests.Brackets_OpeningBracketAlone_SelectsNothing -->
> [!WARNING] 1.0.0.1
> A `[` with no `]` after it is dropped together with what follows it, and the step is read without the predicate. `//b[@id='1'` selects every `b`.

```tb check_build check_run
Dim x As New cXml
x.Parse "<a><b id='1'></b><b id='2'></b></a>"
Debug.Print x.XPath("//b[@id='1']").Count
Debug.Print x.XPath("//b[@id='1'").Count
Debug.Print x.XPath("//b[").Count
' Output:
' 1
' 2
' 2
```

### Slashes
{: #defect-slashes .no_toc }

<!-- test: XPathStepTests.Slashes_TripleSlash_SelectsNothing -->
> [!WARNING] 1.0.0.1
> An empty step, as in `///`, ends the path, and the steps after it are not read. `/catalog///book` is read as `/catalog` and selects the root element.

```tb check_build check_run
Dim x As New cXml
x.Parse "<catalog><book id='1'></book></catalog>"
Debug.Print x.XPath("/catalog///book").Count & " " & x.XPath("/catalog///book").Item(1).Name
Debug.Print x.XPath("/catalog/book/").Count
' Output:
' 1 catalog
' 1
```

### Defects of the parser
{: #defect-parser .no_toc }

The expressions read the nodes that the parser made, so the [defects of the parser](cXml#defects) reach them. A self-closing element `<a/>` is a node named `/a` that no step can name, and the elements after `<b id='1'/>` are its children. Entities in text are not decoded, so a comparison with `text()` has to use the text as it stands in the XML, `Tom &amp; Jerry`. The value of an attribute is decoded, and a comparison with it uses `Tom & Jerry`.

```tb check_build check_run
Dim x As New cXml
x.Parse "<r><a/><b id='1'/><c id='2'>t</c></r>"
Debug.Print x.XPath("/r/*").Count
Debug.Print x.XPath("/r/c").Count
Debug.Print x.XPath("/r/b/c").Count

x.Parse "<r><t>Tom &amp; Jerry</t><u v='Tom &amp; Jerry'></u></r>"
Debug.Print x.XPath("//t[text()='Tom & Jerry']").Count
Debug.Print x.XPath("//t[text()='Tom &amp; Jerry']").Count
Debug.Print x.XPath("//u[@v='Tom & Jerry']").Count
' Output:
' 2
' 0
' 1
' 0
' 1
' 1
```

## The types of the engine

The module also declares five types that only the engine uses: the enumerations **XPathTokenType**, **XPathAxisType** and **XPathOperator**, and the types **XPathStep** and **XPathPredicate**. No public member of the package takes or returns one of them, and this reference does not describe them.

## See Also

- [cXml](cXml) class -- the **XPath** methods of a document
- [cXmlNode](cXmlNode) class -- the **XPath** methods of a node, and **Text**
- [mXml](mXml) module -- the node types and the error numbers
- [TBMANLIB_Xml](.) package -- overview
