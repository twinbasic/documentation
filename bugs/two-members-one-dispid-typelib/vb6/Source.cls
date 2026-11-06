VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "Source"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

' Both events have the procedure ID of a default member, as [DefaultMember] gives each in twinBASIC.
Public Event One(ByVal n As Long)
Attribute One.VB_UserMemId = 0
Public Event Two(ByVal n As Long)
Attribute Two.VB_UserMemId = 0

Public Sub Go()
    RaiseEvent One(1)
    RaiseEvent Two(2)
End Sub
