Attribute VB_Name = "Module1"
Option Explicit

' VB6 refuses this project at compile time: "LSet allowed only on strings and user-defined types".

Sub Main()
    Dim n As Long
    LSet n = "ab"
End Sub
