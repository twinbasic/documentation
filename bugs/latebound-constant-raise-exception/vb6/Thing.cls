VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "Thing"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private mValue As Long

Public Sub RaiseConstant()
    Err.Raise 380
End Sub

Public Sub RaiseVariable(ByVal Number As Long)
    Err.Raise Number
End Sub

Public Sub RaiseConstantWithSource()
    Err.Raise 380, "Thing"
End Sub

Public Sub RaiseConstantWithDescription()
    Err.Raise 380, "Thing", "the value is out of range"
End Sub

Public Sub ErrorStatement()
    Error 380
End Sub

Public Property Get Value() As Long
    Value = mValue
End Property

Public Property Let Value(ByVal NewValue As Long)
    If NewValue < 0 Then Err.Raise 380
    mValue = NewValue
End Property
