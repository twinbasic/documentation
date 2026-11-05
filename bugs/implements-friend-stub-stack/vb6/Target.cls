VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "Target"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = True
Option Explicit

Public Function Pub() As Long
End Function

Friend Sub SubNoArguments()
End Sub
Friend Sub SubOneLong(ByVal X As Long)
End Sub
Friend Sub SubTwoLongs(ByVal X As Long, ByVal Y As Long)
End Sub
Friend Sub SubOneCurrency(ByVal X As Currency)
End Sub
Friend Function FunctionNoArguments() As Long
End Function
Friend Function FunctionOneArgument(ByVal X As Long) As Long
End Function
