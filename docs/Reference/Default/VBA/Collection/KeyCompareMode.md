---
title: KeyCompareMode
parent: Collection
permalink: /tB/Modules/Collection/KeyCompareMode
vba_attribution: true
---
# KeyCompareMode
{: .no_toc }

Returns or sets the comparison mode used when matching string keys in a **Collection** object. Read/write.

Syntax:
- *object*.**KeyCompareMode**
- *object*.**KeyCompareMode** **=** *compare*

*object*
: *required* An object expression that evaluates to a **Collection** object.

*compare*
: A **VbCompareMethod** value specifying the comparison mode used by [**Add**](Add), [**Item**](Item), [**Remove**](Remove) and [**Exists**](Exists) when looking up keys.

The *compare* argument settings are:

| Constant            | Value | Description                          |
|---------------------|-------|--------------------------------------|
| **vbBinaryCompare** | 0     | Performs a case-sensitive binary comparison.   |
| **vbTextCompare**   | 1     | Performs a case-insensitive textual comparison. |

> [!NOTE]
>
> **KeyCompareMode** is a twinBASIC extension; the classic VBA **Collection** object always uses case-insensitive comparison and does not expose this property.

The default comparison mode is **vbTextCompare**, whatever the module's **Option Compare** setting, so a new **Collection** matches keys as VBA's does.

The mode can be changed only while the collection holds no item added with a key. Once one has been added, setting a different mode raises run-time error 5, *Can't change KeyCompareMode once keyed items have been added to the collection*, and the mode stays as it was. Items added without a key do not prevent the change, and neither do keyed items that have since been removed. Setting the mode the collection already has raises no error. A *compare* value other than **vbBinaryCompare** or **vbTextCompare** raises run-time error 5, *Invalid procedure call or argument*.

### Example

```tb check_build
Dim col As New Collection

' The default mode is text: "A" and "a" are the same key.
col.Add "first", Key:="A"
' col.Add "second", Key:="a"   ' Would raise error 457: the key is already in use.

Dim col2 As New Collection
col2.KeyCompareMode = vbBinaryCompare   ' Before any item is added with a key.
col2.Add "first", Key:="A"
col2.Add "second", Key:="a"   ' A different key from "A", so it succeeds.
```

### See Also

- [Add](Add) method
- [Exists](Exists) method
- [KeyCountHint](KeyCountHint) property
- [StrComp](../Strings/StrComp) function
- [Option Compare](../../Core/Option) statement
