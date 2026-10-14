---
title: Value
parent: FileProperty
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FileProperty/Value
---
# Value
{: .no_toc }

Returns or sets the current value of the Windows shell property as a **Variant**.

## Get

Returns a **Variant** containing the current value of the shell property.

Syntax: *object*.**Value**

*object*
: *required* An object expression that evaluates to a **FileProperty** object.

The type of the returned value depends on the property. A multi-value property can return an array.

To obtain a localized string representation of the same data, use [**ValueDesc**](ValueDesc) instead.

## Let

Sets the current value of the shell property.

Syntax: *object*.**Value** **=** *value*

*value*
: A **Variant** containing the new value for the property.

> [!IMPORTANT] 1.7.1.0
>
> Write support requires Windows Vista or newer. Assigning a property that is not writable raises a *Permission denied* error.

### Remarks

Not all shell properties are writable. To assign **Value**, open the file with write support enabled by passing **True** as the *WriteSupport* argument of [**FilePropertyExplorer.OpenFile**](../FilePropertyExplorer/OpenFile) or [**FilePropertyExplorer.BrowseAndOpenFile**](../FilePropertyExplorer/BrowseAndOpenFile).

### Example

This example opens a file, reads the **System.Title** property, then updates it.

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Documents\Report.docx", True)

Dim Prop As FileProperty
Set Prop = Props.Item("System.Title")

Debug.Print "Current title: " & Prop.Value

Prop.Value = "Annual Report 2025"
Debug.Print "Updated title: " & Prop.Value
```

### See Also

- [ValueDesc](ValueDesc) property
- [Name](Name) property
- [ID](ID) property
- [FileProperty](.) class
