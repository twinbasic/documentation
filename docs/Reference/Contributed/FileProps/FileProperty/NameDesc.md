---
title: NameDesc
parent: FileProperty
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FileProperty/NameDesc
---
# NameDesc
{: .no_toc }

Returns the localized name of the shell property, when one is available.

Syntax: *object*.**NameDesc**

*object*
: *required* An object expression that evaluates to a **FileProperty** object.

Returns a **String** containing a localized version of the property's name. This name is suitable for display to the user.

The localized name is not always available. Use [**Name**](Name) instead when a locale-independent identifier is needed --- for example, when storing or comparing property names across systems.

### See Also

- [Name](Name) property
- [ID](ID) property
- [Value](Value) property
- [ValueDesc](ValueDesc) property
- [FileProperty](.) class
