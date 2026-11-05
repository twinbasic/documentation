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
Attribute VB_Exposed = True
Option Explicit

Private mValue As Long

Friend Function GetValue() As Long
    GetValue = 7
End Function

Friend Property Get Prop() As Long
    Prop = mValue
End Property

Friend Property Let Prop(ByVal V As Long)
    mValue = V
End Property

Public Function PubValue() As Long
    PubValue = 8
End Function
