---
title: ValueDesc
parent: FileProperty
permalink: /tB/Packages/Contributed/FileProps/FileProperty/ValueDesc
has_toc: false
---
# ValueDesc
{: .no_toc }

Returns the current value of the shell property as a localized string. Read-only.

Syntax: *object*.**ValueDesc**

*object*
: *required* An object expression that evaluates to a **FileProperty** object.

<!-- test: PropertyTests.ValueDesc_IsAString, PropertyTests.ValueDesc_MultiValueProperty_IsOneString, PropertyTests.Value_PropertyWithNoValue_IsEmpty -->
**ValueDesc** returns a **String** containing the property value in localized form, suitable for display. For multi-value properties, all values are combined into a single string; no array handling is required. A property that has no value returns an empty string.
<!-- /test -->

To retrieve the value as a **Variant** (which can be an array for multi-value properties), use the [**Value**](Value) property instead.

### Example

This example opens a file and prints the localized value of each shell property to the Debug console.

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Music\track.mp3")

Dim Prop As FileProperty
For Each Prop In Props
    Debug.Print Prop.Name & " = " & Prop.ValueDesc
Next Prop
```

### See Also

- [Value](Value) property
- [Name](Name) property
- [NameDesc](NameDesc) property
- [ID](ID) property
- [FileProperty](.) class
