---
title: DataObjectFiles
parent: DataObject
permalink: /tB/Packages/VBRUN/DataObject/DataObjectFiles
---
# DataObjectFiles
{: .no_toc }

A **DataObjectFiles** object is the collection of file paths held by a [**DataObject**](.) --- typically the payload of a Windows shell drag-and-drop, which arrives under the `vbCFFiles` clipboard format. Each element is a fully qualified path stored as a **String**. The collection is reachable through the [**Files**](Files) property of the parent **DataObject**.

The collection is mutable: the source side of a drag-and-drop or clipboard operation can build a list with [**Add**](#add), and the destination side reads it back with [**Item**](#item) or **For Each** iteration.

## Members

### Add

Appends a file path to the collection.

Syntax: *object*.**Add** *Filename* [ **,** *Index* ]

*object*
: *required* An object expression that evaluates to a **DataObjectFiles** object.

*Filename*
: *required* A **String** giving the fully qualified path of the file to add.

*Index*
: *optional* A **Variant** identifying an existing entry. When supplied, the new path is inserted before that entry; if numeric, *Index* is a one-based position between `1` and [**Count**](#count). When omitted, the path is appended to the end.

### Clear

Removes every entry from the collection.

Syntax: *object*.**Clear**

*object*
: *required* An object expression that evaluates to a **DataObjectFiles** object.

After **Clear**, [**Count**](#count) is `0`.

### Count

Returns the number of paths in the collection.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **DataObjectFiles** object.

The value is a **Long**. Valid indexes for [**Item**](#item) run from `1` to **Count**.

### Item

Returns one path from the collection by its one-based position, as a **String**.

Syntax: *object*.**Item(** *Index* **)**

*object*
: *required* An object expression that evaluates to a **DataObjectFiles** object.

*Index*
: *required* A **Long** giving the one-based position of the path to return. Must be between `1` and [**Count**](#count); otherwise an error occurs.

**Item** is the default member of **DataObjectFiles**, so the following lines are equivalent:

```tb
path = Data.Files.Item(1)
path = Data.Files(1)
```

### Remove

Removes a single entry from the collection.

Syntax: *object*.**Remove** *Index*

*object*
: *required* An object expression that evaluates to a **DataObjectFiles** object.

*Index*
: *required* A **Variant** identifying the entry to remove. Numeric values are treated as one-based positions between `1` and [**Count**](#count); string values are matched against the stored paths. If no entry matches, an error occurs.

### For Each iteration

A **DataObjectFiles** object can be iterated with the [**For Each...Next**](../../../Core/For-Each-Next) statement, which yields each path in turn, in insertion order. The hidden `_NewEnum` member supplies the enumerator and is not called directly from user code.

```tb
Dim Path As Variant
For Each Path In Data.Files
    Debug.Print Path
Next Path
```

## See Also

- [DataObject](.)
- [Files](Files) property
