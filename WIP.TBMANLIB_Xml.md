# TBMANLIB_Xml --- working notes

The contributed TBMANLIB_Xml package, documented at `docs/Reference/Contributed/TBMANLIB_Xml/`. This
file holds what its section decided and what is known about the package beyond its pages; the
rules for every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

TBMANLIB_Xml's `exclude_from_docs` names its test module, `mXmlTests`, which its landing page describes in a paragraph, and the types of its XPath engine (`XPathTokenType`, `XPathAxisType`, `XPathOperator`, `XPathStep`, `XPathPredicate`), which no public member takes or returns and which the mXPath page mentions in a paragraph.

**Listed under Experimental Packages** (owner): TBMANLIB_Xml's parser misreads self-closing elements and entities and does not return for some malformed text (and its XPath engine reads the step `..` and `and` with `or` wrongly).
