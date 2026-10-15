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

<!-- test: PropertyTests.Value_TypeDependsOnTheProperty, PropertyTests.Value_PropertyWithNoValue_IsEmpty, PropertyTests.Value_MultiValueProperty_IsAnArray -->
The type of the returned value depends on the property. A property that has no value for the file returns **Empty**. A multi-value property can return an array.
<!-- /test -->

To obtain a localized string representation of the same data, use [**ValueDesc**](ValueDesc) instead.

## Let

Sets the current value of the shell property.

Syntax: *object*.**Value** **=** *value*

*value*
: A **Variant** containing the new value for the property.

> [!IMPORTANT] timeless
>
> Write support requires Windows Vista or newer.

<!-- test: WriteTests.Value_Let_WithoutWriteSupport_Raises, WriteTests.Value_Let_NotWritableProperty_Raises, WriteTests.Value_Let_NotWritableProperty_RaisesPermissionDenied, WriteTests.Value_Let_NotWritableProperty_RaisesTheSameErrorEverywhere -->
> [!NOTE] 1.7.1.0
>
> Assigning a property that is not writable raises run-time error -2147352567 (*Exception occurred*), not *Permission denied* (error 70). An assignment to a property of a collection opened without write support raises the same error.

### Remarks

<!-- test: WriteTests.Value_Let_Title_IsStored, WriteTests.Value_Let_Rating_IsStored, WriteTests.Value_Let_Array_IsStoredAsMultiValue, WriteTests.Value_Let_WithoutWriteSupport_Raises -->
Not all shell properties are writable. To assign **Value**, open the file with write support enabled by passing **True** as the *WriteSupport* argument of [**FilePropertyExplorer.OpenFile**](../FilePropertyExplorer/OpenFile) or [**FilePropertyExplorer.BrowseAndOpenFile**](../FilePropertyExplorer/BrowseAndOpenFile). The value is stored in the file, and a collection opened again reads it. An array assigned to a multi-value property is stored as its values.
<!-- /test -->

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
