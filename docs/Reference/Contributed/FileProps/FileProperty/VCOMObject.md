---
title: VCOMObject
parent: FileProperty
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FileProperty/VCOMObject
---
# VCOMObject
{: .no_toc }

Holds the native-code COM object created internally by the Virtual-COM library. For internal use only.

> [!WARNING]
>
> **VCOMObject** is an internal implementation detail of the FileProps Virtual-COM loader, and the package marks it as for internal use only. Do not use it in application code.

Syntax: *object*.**VCOMObject**

*object*
: *required* An object expression that evaluates to a **FileProperty** object.

The **FileProps** package is a Virtual-COM library. It creates native-code COM objects in memory without a separate DLL. **VCOMObject** is the raw **Object** reference to that in-memory COM object; the **FileProperty** class delegates all its property implementations (**Value**, **ValueDesc**, **NameDesc**, **Name**, **ID**) to it.

This field has no documented interface and no stable contract outside the library. Use **Value**, **ValueDesc**, **NameDesc**, **Name**, and **ID** to access shell property data.

### See Also

- [FileProperty](.) class
- [Value](Value) property
- [ValueDesc](ValueDesc) property
- [Name](Name) property
- [NameDesc](NameDesc) property
- [ID](ID) property
