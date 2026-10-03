VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "Thrower"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = True
Option Explicit

Public Sub RaiseFull()
    Err.Raise vbObjectError + 1234, "Probe.Subject", "Something failed on purpose"
End Sub

Public Sub Handled()
    On Error Resume Next
    Err.Raise vbObjectError + 99, "Probe.Inner", "handled inside"
End Sub
