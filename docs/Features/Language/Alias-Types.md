---
title: Alias Types
parent: Language Syntax
nav_order: 0
permalink: /Features/Language/Alias-Types
---

# Alias Types

An alias is an alternative name for a User-Defined Type, intrinsic type, or interface. This is similar to C/C++'s `typedef` statement. These can then be used in place of the original type and will be treated as if the original was used (would not be a type mismatch).

`[Public|Private] Alias AltName As OrigName`

### Example

With intrinsic types, or if you have a type such as:

```vb
Public Type POINT
    x As Long
    y As Long
End Type
```

You can create aliases:

```vb
Public Alias POINTAPI As POINT

Public Alias CBoolean As Byte

Public Alias KAFFINITY As LongPtr
```

Like interfaces and coclasses, these must be placed in a .twin file, outside of `Module` and `Class` blocks. You can create aliases of other aliases. The optional `Public` and `Private` modifiers determine whether the alias is exported to the Type Library of an ActiveX DLL or Control. A `Private` alias would result in usage of it being replaced with the original type.
