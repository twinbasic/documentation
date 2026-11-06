VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "Sink"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Public WithEvents Src As Source
Attribute Src.VB_VarHelpID = -1
Public Got As String

Private Sub Src_One(ByVal n As Long)
    Got = Got & "One:" & n & " "
End Sub

Private Sub Src_Two(ByVal n As Long)
    Got = Got & "Two:" & n & " "
End Sub
