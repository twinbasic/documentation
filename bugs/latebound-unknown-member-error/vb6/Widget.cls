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

Public Hits As Long
Public Gets As Long

Public Sub Hello()
    Hits = Hits + 1
End Sub

Public Property Get Prop() As Long
    Gets = Gets + 1
    Prop = 1
End Property

Public Property Let Prop(ByVal Value As Long)
    Hits = Hits + 1
    Err.Raise 5
End Property
