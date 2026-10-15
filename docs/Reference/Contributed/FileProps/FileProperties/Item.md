---
title: Item
parent: FileProperties
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FileProperties/Item
---
# Item
{: .no_toc }

Returns the **FileProperty** object at the given index, name, or ID in the collection.

Syntax: *object*.**Item**(*IndexOrNameOrID*)

*object*
: *required* An object expression that evaluates to a **FileProperties** object.

*IndexOrNameOrID*
: *required* A **Variant** identifying the property to retrieve. Pass an integer index (zero-based, from `0` to `Count - 1`), a **String** matching **FileProperty.Name**, or a **String** matching **FileProperty.ID**.

<!-- test: CollectionTests.Item_ByIndex_ReturnsThePropertyAtThatPosition, CollectionTests.Item_ByName_ReturnsThePropertyOfThatName, CollectionTests.Item_ByID_ReturnsThePropertyWithThatID, CollectionTests.Item_NameAndID_IgnoreCase, CollectionTests.Count_IsOneMoreThanTheLastIndex, CollectionTests.Item_UnknownName_RaisesElementNotFound, CollectionTests.Item_NegativeIndex_RaisesFail, CollectionTests.ForEach_VisitsEveryProperty -->
**Item** forwards the call to the underlying Virtual-COM object. Passing an integer retrieves the property at that position in the collection. Passing a string retrieves the property whose **FileProperty.Name** (the system identity name, such as `"System.Audio.EncodingBitrate"`) or **FileProperty.ID** (the unique identifier of the shell property) equals that string. A name or an ID matches without regard to case. A **String** of digits is a name, not an index.

**Item** raises run-time error -2147211517 (*Requested index is out of bounds*) for an index of **Count** or more, -2147467259 (*Generic failure code*) for a negative index, and -2147211518 (*The requested element was not found in the collection*) for a name that is not the name of a shell property.

A **For Each** loop over a **FileProperties** object visits the properties in the order of their indexes.
<!-- /test -->

<!-- test: CollectionTests.Item_ByID_ComputedProperty_ReturnsThePropertyWithThatID -->
> [!NOTE] 1.7.1.0
> **Item** raises run-time error 13 (*Generic failure code*) when it is given the ID of some properties, among them `System.ItemTypeText`, `System.ItemFolderNameDisplay`, `System.ItemPathDisplay` and `System.Kind`. Look such a property up by its name or its index.

<!-- test: CollectionTests.Item_ByID_UnknownID_RaisesElementNotFound, CollectionTests.Item_ByID_UnknownID_ReturnsAPropertyWithNoValue -->
> [!NOTE] 1.7.1.0
> An ID that no property of the file has raises no error. **Item** returns a property that has that ID, an empty **Name** and an empty **Value**.

### Example

This example opens a file, iterates the properties by index, and also retrieves one property by name.

```tb check_build
Dim fp As FileProperties
Set fp = FilePropertyExplorer.OpenFile("C:\Music\track.mp3")

' Iterate all properties by index.
Dim i As Long
For i = 0 To fp.Count - 1
    Dim prop As FileProperty
    Set prop = fp.Item(i)
    Debug.Print prop.NameDesc & ": " & prop.ValueDesc
Next i

' Retrieve a specific property by system name.
Dim bitrate As FileProperty
Set bitrate = fp.Item("System.Audio.EncodingBitrate")
Debug.Print "Bitrate: " & bitrate.ValueDesc
```

### See Also

- [FileProperties](.) class
- [Count](Count) property
- [FilePath](FilePath) property
- [FileProperty](../FileProperty/) class
