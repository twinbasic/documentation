VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "clsAttrs"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_Description = "A class with every member attribute VB6 writes."
Attribute VB_HelpID = 2000
Attribute VB_Ext_KEY = "SavedWithClassBuilder6" ,"Yes"
Option Explicit

Private m_Items As Collection
Private m_Value As Long

Public Caption As String
Attribute Caption.VB_VarDescription = "A public field with a description."
Attribute Caption.VB_VarUserMemId = 8
Attribute Caption.VB_VarHelpID = 2002

Public HiddenField As Long
Attribute HiddenField.VB_VarMemberFlags = "40"

Public UnbrowsedField As Long
Attribute UnbrowsedField.VB_VarMemberFlags = "400"

Public Event Changed()
Attribute Changed.VB_Description = "Raised when Value changes."

Public Property Get Value() As Long
Attribute Value.VB_Description = "The default property."
Attribute Value.VB_HelpID = 2001
Attribute Value.VB_UserMemId = 0
    Value = m_Value
End Property

Public Property Let Value(ByVal NewValue As Long)
    m_Value = NewValue
    RaiseEvent Changed
End Property

Public Function NewEnum() As IUnknown
Attribute NewEnum.VB_UserMemId = -4
Attribute NewEnum.VB_MemberFlags = "40"
    Set NewEnum = m_Items.[_NewEnum]
End Function

Public Function WithId() As Long
Attribute WithId.VB_UserMemId = 7
    WithId = 7
End Function

Public Function HiddenMethod() As Long
Attribute HiddenMethod.VB_MemberFlags = "40"
    HiddenMethod = 40
End Function

Public Property Get Unbrowsed() As Long
Attribute Unbrowsed.VB_MemberFlags = "400"
    Unbrowsed = 400
End Property

Public Property Get HiddenUnbrowsed() As Long
Attribute HiddenUnbrowsed.VB_MemberFlags = "440"
    HiddenUnbrowsed = 440
End Property

Public Property Get UiDefault() As Long
Attribute UiDefault.VB_MemberFlags = "200"
    UiDefault = 200
End Property

Public Property Get Bound() As Long
Attribute Bound.VB_MemberFlags = "14"
    Bound = 14
End Property

Private Sub Class_Initialize()
    Set m_Items = New Collection
End Sub
