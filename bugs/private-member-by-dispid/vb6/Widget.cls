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

Public Function PubFn() As Long
    PubFn = 1
End Function

Private Function PrivFn() As Long
    PrivFn = 2
End Function

Friend Function FrFn() As Long
    FrFn = 3
End Function

Public Function PubFn2() As Long
    PubFn2 = 4
End Function
