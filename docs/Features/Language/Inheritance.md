---
title: Inheritance
parent: Language Syntax
nav_order: 3
---

# Inheritance: Implements Via and Inherits

twinBASIC provides two mechanisms for inheritance to support both simple and complete object-oriented programming patterns.

## `Implements Via` for Basic Inheritance

tB allows simple inheritance among classes. For example, if you have class cVehicle which implements IVehicle containing method Honk, you could create child classes like cCar or cTruck, which inherit the methods of the original, so you could call cCar.Honk without writing a separate implementation.

![image](../Images/b0724fe2-636d-47db-a8fc-531a585ddaf9.png)

You can see that the Honk method is only implemented by the parent class, then called from the child class when you click the CodeLens button to run the sub in place from the IDE.

## `Inherits` for Complete OOP

This is a more robust option for full inheritance and OOP. It supports `Protected` methods and variables that are accessible to derived classes but not outside callers, `Overridable` and `Overrides` syntax, multiple inheritance, and explicit base class constructors.

### Example: Animal Class Hierarchy

Starting with a base class:

```vb
Private Class Animal
    Protected _name As String
    Protected _dob As Date  ' date of birth

    Public Event Spoke(ByVal sound As String)

    Public Sub New(name As String, dob As Date)
        _name = name
        _dob = dob
    End Sub

    Public Property Get Name() As String
        Name = _name
    End Property

    Public Property Get DOB() As Date
        DOB = _dob
    End Property

    ' Age in whole years based on DOB and today's date
    Public Function AgeYears() As Long
        Dim y As Long
        y = DateDiff("yyyy", _dob, Date)
        If DateSerial(Year(Date), Month(_dob), Day(_dob)) > Date Then y = y - 1
        AgeYears = y
    End Function

    Public Sub Speak()
        Dim s As String
        s = GetSound()
        RaiseEvent Spoke(s)
        Debug.Print _name & " says: " & s
    End Sub

    ' --- Overridable hook for derived classes ---
    Protected Overridable Function GetSound() As String
        GetSound = ""
    End Function
End Class
```

Others can inherit:

```vb
' ===== Derived: Dog =====
Private Class Dog
    Inherits Animal

    Protected _breed As String

    Public Sub New(name As String, dob As Date, breed As String)
        Animal.New(name, dob)               ' we can explicitly call base constructors from within our constructor
        _breed = breed
    End Sub

    Public Property Get Breed() As String
        Breed = _breed
    End Property

    ' Override:
    Protected Overridable Function GetSound() As String Overrides Animal.GetSound
        GetSound = "woof"
    End Function
End Class

' ===== Further derived: GuardDog (Dog → GuardDog) =====
Private Class GuardDog
    Inherits Dog

    Protected _onDuty As Boolean

    Public Sub New(name As String, dob As Date, breed As String)
        Dog.New(name, dob, breed)           ' we can explicitly call base constructors from within our constructor
        _onDuty = True
    End Sub

    Public Property Get OnDuty() As Boolean
        OnDuty = _onDuty
    End Property
    Public Property Let OnDuty(ByVal v As Boolean)
        _onDuty = v
    End Property

    ' Multi-level override (overriding Dog's override):
    Protected Function GetSound() As String Overrides Dog.GetSound
        If _onDuty Then
            GetSound = "WOOF!"
        Else
            GetSound = "woof"
        End If
    End Function
End Class
```

This is just an excerpt, see the full Sample 23 for additional classes, usage, and information about inheritance in twinBASIC.
