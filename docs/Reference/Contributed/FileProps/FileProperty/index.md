---
title: FileProperty
parent: FileProps Package
permalink: /tB/Packages/Contributed/FileProps/FileProperty/
has_toc: false
---

# FileProperty class
{: .no_toc }

A **FileProperty** represents one Windows shell property attached to a file --- its system name, localized name, unique ID, and current value.

**FileProperty** objects are not created directly. They are returned as items from the [**FileProperties**](../FileProperties/) collection, which is obtained by calling [**FilePropertyExplorer.OpenFile**](../FilePropertyExplorer/OpenFile) or [**FilePropertyExplorer.BrowseAndOpenFile**](../FilePropertyExplorer/BrowseAndOpenFile).

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Photos\image.jpg")

Dim Prop As FileProperty
Set Prop = Props.Item(1)

Debug.Print Prop.Name       ' e.g. "System.ItemFolderNameDisplay"
Debug.Print Prop.ValueDesc  ' e.g. "Photos"
```

* TOC
{:toc}

## Properties

### ID
{: .no_toc }

A unique identifier string for the shell property.

Syntax: *object*.**ID** **As String** (read-only)

<!-- test: PropertyTests.ID_IsAGuidAndAnIndex -->
The identifier consists of a GUID identifying the property schema, a slash, and an integer identifying the property index within that schema. It identifies one property unambiguously: no two properties of a file have the same ID.
<!-- /test -->

Pass the ID to [**FileProperties.Item**](../FileProperties/Item) to get the property back. That call raises an error for some properties; see the note on **Item**.

### Name
{: .no_toc }

The system identity name of the property.

Syntax: *object*.**Name** **As String** (read-only)

<!-- test: PropertyTests.Name_IsTheSystemName -->
Returns a system name such as `"System.ItemFolderNameDisplay"`. This name is safe to use as an identity field even on non-English systems. For the localized name, use [**NameDesc**](#namedesc).
<!-- /test -->

<!-- test: PropertyTests.Name_PropertyWithoutSystemName_IsEmpty -->
A property that has no system name returns an empty string. Use [**ID**](#id) to identify such a property.
<!-- /test -->

### NameDesc
{: .no_toc }

The localized name of the property.

Syntax: *object*.**NameDesc** **As String** (read-only)

<!-- test: PropertyTests.NameDesc_IsAStringAndNotAlwaysAvailable -->
Returns a localized version of the name. It is not always available: for some properties it is an empty string. Use [**Name**](#name) for a locale-independent identifier.
<!-- /test -->

### Value
{: .no_toc }

The current value of the shell property as a **Variant**.

Syntax: *object*.**Value** [ **=** *value* ]

<!-- test: PropertyTests.Value_TypeDependsOnTheProperty, PropertyTests.Value_PropertyWithNoValue_IsEmpty -->
Reading this property returns the value of the property as exposed by the operating system. The type of the returned **Variant** depends on the property. A property that has no value for the file returns **Empty**. A multi-value property can return an array.
<!-- /test -->

<!-- test: WriteTests.Value_Let_Title_IsStored, WriteTests.Value_Let_Rating_IsStored, WriteTests.Value_Let_Array_IsStoredAsMultiValue -->
Assigning a value writes the property into the file. The file must have been opened with write support, which requires Windows Vista or newer.
<!-- /test -->

<!-- test: WriteTests.Value_Let_WithoutWriteSupport_Raises, WriteTests.Value_Let_NotWritableProperty_Raises, WriteTests.Value_Let_NotWritableProperty_RaisesPermissionDenied, WriteTests.Value_Let_NotWritableProperty_RaisesTheSameErrorEverywhere -->
> [!NOTE] 1.7.1.0
> Assigning a property that is not writable raises run-time error -2147352567 (*Exception occurred*), not *Permission denied* (error 70). An assignment to a property of a collection opened without write support raises the same error.

<!-- test: PropertyTests.Value_MultiValueProperty_IsAnArray -->
> [!NOTE] timeless
> Multi-value properties can return a **Variant** array. Check `IsArray(Prop.Value)` before using the result as a scalar.

For a string representation of the value in localized form, use [**ValueDesc**](#valuedesc).

### ValueDesc
{: .no_toc }

The current value of the property as a localized string.

Syntax: *object*.**ValueDesc** **As String** (read-only)

<!-- test: PropertyTests.ValueDesc_IsAString, PropertyTests.ValueDesc_MultiValueProperty_IsOneString, PropertyTests.Value_PropertyWithNoValue_IsEmpty -->
Returns the property value in localized form, combined into a single string. Multi-value properties that can return an array from [**Value**](#value) are already combined into one string here. A property that has no value returns an empty string.
<!-- /test -->

Use this property when displaying values to an end user. Use [**Value**](#value) when the typed value is needed for computation or comparison.

### VCOMObject
{: .no_toc }

Holds the native-code COM object created internally by the Virtual-COM library.

Syntax: *object*.**VCOMObject** **As Object**

<!-- test: none -- a rule of use for an internal member, with nothing a program can observe -->
> [!WARNING] timeless
> This member is for internal use only. Do not read or assign **VCOMObject** from application code. All public members of **FileProperty** forward their calls to it.

## Example

This example opens a file and prints the system name, localized description, and value for each shell property.

```tb check_build
Sub PrintFileProperties(ByVal FilePath As String)
    Dim Props As FileProperties
    Set Props = FilePropertyExplorer.OpenFile(FilePath)

    Dim i As Long
    For i = 0 To Props.Count - 1
        Dim Prop As FileProperty
        Set Prop = Props.Item(i)
        Debug.Print Prop.Name & " (" & Prop.NameDesc & "): " & Prop.ValueDesc
    Next i
End Sub
```

## See Also

- [FileProperties](../FileProperties/) class -- the collection that contains **FileProperty** objects
- [FilePropertyExplorer](../FilePropertyExplorer/) class -- the factory that opens a file and returns a **FileProperties** collection
- [FileProps Package](../) package -- overview and usage
