VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "Widget"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

' A method with a ParamArray, called early- and late-bound by Module1's class cases.
Public Function Second(ParamArray p() As Variant) As String
    On Error GoTo Failed
    Second = CStr(p(0)(1))
    Exit Function
Failed:
    Second = "error " & Err.Number
End Function
