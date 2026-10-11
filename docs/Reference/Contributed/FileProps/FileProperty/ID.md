---
title: ID
parent: FileProperty
permalink: /tB/Packages/Contributed/FileProps/FileProperty/ID
has_toc: false
---
# ID
{: .no_toc }

Returns a unique identifier string for the shell property.

Syntax: *object*.**ID**

*object*
: *required* An object expression that evaluates to a **FileProperty** object.

The **ID** property returns a **String** that is a unique identity for the property and can always be used to refer to it. It consists of a GUID identifying the property schema, followed by an integer identifying the property's index within that schema.

Unlike [**Name**](Name), which is a dotted system name such as `System.ItemFolderNameDisplay`, the **ID** string is made of the schema GUID and the index.

### Example

This example opens a file and prints the ID and name of each shell property to the Debug console.

```tb check_build
Dim props As FileProperties
Set props = FilePropertyExplorer.OpenFile("C:\example\photo.jpg")

Dim i As Long
For i = 0 To props.Count - 1
    Dim prop As FileProperty
    Set prop = props.Item(i)
    Debug.Print prop.ID & "  ->  " & prop.Name
Next i
```

### See Also

- [Name](Name) property
- [NameDesc](NameDesc) property
- [Value](Value) property
- [ValueDesc](ValueDesc) property
- [FileProperty](.) class
