---
title: Generics
parent: Language Syntax
nav_order: 5
---

# Generics

Generics have basic support in methods and classes.

## Generic Functions

```vb
Public Function TCast(Of T)(ByRef Expression As T) As T
    Return Expression
End Function
```

This could be used e.g. to return a `Date` typed variable with `TCast(Of Date)("2021-01-01")`

## Generic Classes

A Class generic allows the type in methods throughout the class. The following example shows this to make a generic List class:

```
[COMCreatable(False)]
Class List(Of T)
    Private src() As T
    Private c As Long
    Sub New(p() As T)
        src = p
    End Sub
    [DefaultMember]
    Function GetAt(ByVal idx As Long) As T
        Return src(idx)
    End Function
    Public Property Get Count() As Long
        Return c
    End Property
End Class
```

## Usage Example

```vb
Private Sub TestListGenericClass()
    Dim names As List(Of String) = New List(Of String)(Array("John", "Smith", "Kane", "Tessa", "Yoland", "Royce", "Samuel"))
    Dim s As String = names(0)
    Debug.Print s
End Sub
```
