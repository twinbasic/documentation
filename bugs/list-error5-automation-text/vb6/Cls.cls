VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Cls"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private m_Items As New Collection

Public Sub Add(ByVal item As String)
    m_Items.Add item
End Sub

' Removes the only item and adds the new one before position 1.
Public Sub Replace(ByVal item As String)
    Dim itemVar As Variant
    On Error Resume Next
    itemVar = item
    Err.Clear
    itemVar = item
    On Error GoTo 0
    m_Items.Remove 1
    m_Items.Add itemVar, , , 1
End Sub
