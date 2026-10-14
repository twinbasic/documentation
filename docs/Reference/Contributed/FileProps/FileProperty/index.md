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

The identifier consists of a GUID identifying the property schema, followed by an integer identifying the property index within that schema. It can always be used to refer to a specific property unambiguously.

### Name
{: .no_toc }

The system identity name of the property.

Syntax: *object*.**Name** **As String** (read-only)

Returns a system name such as `"System.ItemFolderNameDisplay"`. This name is safe to use as an identity field even on non-English systems. For the localized name, use [**NameDesc**](#namedesc).

### NameDesc
{: .no_toc }

The localized name of the property.

Syntax: *object*.**NameDesc** **As String** (read-only)

Returns a localized version of the name. It is not always available. Use [**Name**](#name) for a locale-independent identifier.

### Value
{: .no_toc }

The current value of the shell property as a **Variant**.

Syntax: *object*.**Value** [ **=** *value* ]

Reading this property returns the value of the property as exposed by the operating system. The type of the returned **Variant** depends on the property. A multi-value property can return an array.

Assigning a value writes the property. Write support requires Windows Vista or newer. Assigning a property that is not writable raises a *Permission denied* error.

> [!NOTE] 1.7.1.0
> Multi-value properties can return a **Variant** array. Check `IsArray(Prop.Value)` before using the result as a scalar.

For a string representation of the value in localized form, use [**ValueDesc**](#valuedesc).

### ValueDesc
{: .no_toc }

The current value of the property as a localized string.

Syntax: *object*.**ValueDesc** **As String** (read-only)

Returns the property value in localized form, combined into a single string. Multi-value properties that can return an array from [**Value**](#value) are already combined into one string here.

Use this property when displaying values to an end user. Use [**Value**](#value) when the typed value is needed for computation or comparison.

### VCOMObject
{: .no_toc }

Holds the native-code COM object created internally by the Virtual-COM library.

Syntax: *object*.**VCOMObject** **As Object**

> [!WARNING] 1.7.1.0
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
