Attribute VB_Name = "modShared"
Option Explicit

' A module that several projects share, kept in a folder beside theirs.
Public Function Greeting(ByVal Name As String) As String
    Greeting = "Hello from " & Name
End Function
