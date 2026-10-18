VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "Attrs"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = True
Attribute VB_HelpID = 2000
Option Explicit

' Each line below has no effect in the built type library (BETA 1005).

Public HiddenField As Long
Attribute HiddenField.VB_VarMemberFlags = "40"

Public UnbrowsedField As Long
Attribute UnbrowsedField.VB_VarMemberFlags = "400"

Public HelpField As Long
Attribute HelpField.VB_VarHelpID = 2002

Public Function WithHelp() As Long
Attribute WithHelp.VB_HelpID = 2001
End Function

Public Property Get UiDefault() As Long
Attribute UiDefault.VB_MemberFlags = "200"
End Property

Public Property Get Bound() As Long
Attribute Bound.VB_MemberFlags = "14"
End Property

' The control: this line does take effect, FUNCFLAG_FHIDDEN.

Public Function HiddenMethod() As Long
Attribute HiddenMethod.VB_MemberFlags = "40"
End Function
