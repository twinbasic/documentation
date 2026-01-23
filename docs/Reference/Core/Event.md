---
title: Event
parent: Statements
permalink: /tB/Core/Event
---

Declares a user-defined event.

Syntax: [ **Public** ] **Event** *procedurename* [ (*arglist*) ]

**Public**
: *optional*. Specifies that the **Event** is visible throughout the project. **Events** types are **Public** by default. Note that events can only be raised in the module in which they are declared.

*procedurename*
: Name of the event; follows standard variable naming conventions.

*arglist*
:  [ **ByVal** \| **ByRef** ] *varname* \[ **()** ] [ **As** *type* ]
   
   **ByVal**
   : *optional* Indicates that the argument is passed by value.
   
   **ByRef**
   : *optional* Indicates that the argument is passed by reference. **ByRef** is the default in  unlike in Visual Basic .NET.
   
   *varname*
   : Name  of the variable representing the argument being passed to the procedure; follows standard variable naming conventions.
   
   *type*
   : *optional* Data type of the argument passed to the procedure; may be Byte, Boolean, Integer, Long, Currency, Single, Double, Decimal (not currently supported), Date, String (variable length only), Object, Variant, a user-defined type (UDT), or an object type.

After the event has been declared, use the [**RaiseEvent**](RaiseEvent) statement to fire the event. A syntax error occurs if an **Event** declaration appears in a standard module. An event can't be declared to return a value. A typical event might be declared and raised as shown in the following fragments.

```vb
' Declare an event at module level of a class module 
 
Event LogonCompleted (UserName as String) 
 
Sub 
 RaiseEvent LogonCompleted("AntoineJan") 
End Sub
```

> [!NOTE]
> 
> You can declare event arguments just as you do arguments of procedures, with the following exceptions: events cannot have named arguments, **Optional** arguments, or **ParamArray** arguments. Events don't have return values.

### Example

The following example uses events to count off seconds during a demonstration of the fastest 100-meter race. The code illustrates all of the event-related methods, properties, and statements, including the **Event** statement.

The class that raises an event is the event source, and the classes that implement the event are the sinks. An event source can have multiple sinks for the events it generates. When the class raises the event, that event is fired on every class that has elected to sink events for that instance of the object.

The example also uses a form (`Form1`) with a button (`Command1`), a label (`Label1`), and two text boxes (`Text1` and `Text2`). When you click the button, the first text box displays "From Now" and the second starts to count seconds. When the full time (9.84 seconds) has elapsed, the first text box displays "Until Now" and the second displays "9.84".

The code specifies the initial and terminal states of the form. It also contains the code executed when events are raised.

```vb
Class Form1
  Option Explicit 
 
  Private WithEvents mText As TimerState 
 
  Private Sub Command1_Click() 
    Text1.Text = "From Now" 
    Text1.Refresh 
    Text2.Text = "0" 
    Text2.Refresh 
    Call mText.TimerTask(9.84) 
  End Sub 
 
  Private Sub Form_Load() 
    Command1.Caption = "Click to Start Timer" 
    Text1.Text = "" 
    Text2.Text = "" 
    Label1.Caption = "The fastest 100 meter run took this long:" 
    Set mText = New TimerState 
  End Sub 
 
  Private Sub mText_ChangeText() 
    Text1.Text = "Until Now" 
    Text2.Text = "9.84" 
  End Sub 
 
  Private Sub mText_UpdateTime(ByVal dblJump As Double) 
    Text2.Text = Str(Format(dblJump, "0")) 
    DoEvents 
  End Sub
End Class
```

The remaining code is in a class module named TimerState. The **Event** statements declare the procedures initiated when events are raised.

VB

```vb
Class TimerState
    Option Explicit 
    Public Event UpdateTime(ByVal dblJump As Double)
    Public Event ChangeText() 
 
    Public Sub TimerTask(ByVal Duration As Double) 
        Dim dblStart As Double 
        Dim dblSecond As Double 
        Dim dblSoFar As Double 
        dblStart = Timer 
        dblSoFar = dblStart 
 
        Do While Timer < dblStart + Duration 
        If Timer - dblSoFar >= 1 Then 
            dblSoFar = dblSoFar + 1 
            RaiseEvent UpdateTime(Timer - dblStart) 
        End If 
        Loop 
 
        RaiseEvent ChangeText 
    End Sub
End Class
```
