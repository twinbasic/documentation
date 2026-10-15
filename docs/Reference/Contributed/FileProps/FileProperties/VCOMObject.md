---
title: VCOMObject
parent: FileProperties
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FileProperties/VCOMObject
---
# VCOMObject
{: .no_toc }

Holds the native-code COM object created internally by the Virtual-COM library. For internal use only.

<!-- test: none -- a rule of use for an internal member, with nothing a program can observe -->
> [!WARNING] timeless
>
> **VCOMObject** is an internal implementation detail of the FileProps Virtual-COM loader, and the package marks it as for internal use only. Do not use it in application code.

Syntax: *object*.**VCOMObject**

*object*
: *required* An object expression that evaluates to a **FileProperties** object.

The **FileProps** package is a Virtual-COM library. It creates native-code COM objects in memory without a separate DLL. **VCOMObject** is the raw **Object** reference to that in-memory COM object; the **FileProperties** class delegates all its property implementations (**Count**, **FilePath**, **Item**) to it. The field has the member ID -4 (`VB_VarUserMemId = -4`), the ID COM reserves for the enumerator of a collection, so it is the member that `For Each` uses to enumerate a **FileProperties** collection.

This field has no documented interface and no stable contract outside the library. Use **Count**, **FilePath**, and **Item** to access file properties.

### See Also

- [FileProperties](.) class
- [Count](Count) property
- [FilePath](FilePath) property
- [Item](Item) property
