Attribute VB_Name = "modMain"
Option Explicit

' The project's title and version, for a window's caption.
Public Function AppCaption() As String
    AppCaption = App.Title & " " & App.Major & "." & App.Minor
End Function
