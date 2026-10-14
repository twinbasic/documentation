VERSION 5.00
Begin VB.UserControl ctlAttrs
   ClientHeight    =   1500
   ClientLeft      =   0
   ClientTop       =   0
   ClientWidth     =   2400
   PropertyPages   =   "ctlAttrs.ctx":0000
   ScaleHeight     =   1500
   ScaleWidth      =   2400
End
Attribute VB_Name = "ctlAttrs"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private m_Caption As String
Private m_Amount As Long
Private m_Picture As StdPicture

Public Note As String
Attribute Note.VB_VarProcData = ";Text"

Public Property Get BackColor() As OLE_COLOR
Attribute BackColor.VB_Description = "The background colour."
Attribute BackColor.VB_ProcData.VB_Invoke_Property = "StandardColor;Appearance"
Attribute BackColor.VB_UserMemId = -501
    BackColor = UserControl.BackColor
End Property

Public Property Let BackColor(ByVal NewColor As OLE_COLOR)
    UserControl.BackColor = NewColor
    PropertyChanged "BackColor"
End Property

Public Property Get Caption() As String
Attribute Caption.VB_ProcData.VB_Invoke_Property = "pagAttrs"
Attribute Caption.VB_UserMemId = -518
    Caption = m_Caption
End Property

Public Property Let Caption(ByVal NewCaption As String)
    m_Caption = NewCaption
    PropertyChanged "Caption"
End Property

Public Property Let Amount(ByVal NewAmount As Long)
Attribute Amount.VB_ProcData.VB_Invoke_PropertyPut = "pagAttrs;Behavior"
    m_Amount = NewAmount
    PropertyChanged "Amount"
End Property

Public Property Get Amount() As Long
    Amount = m_Amount
End Property

Public Property Set Font(ByVal NewFont As StdFont)
Attribute Font.VB_ProcData.VB_Invoke_PropertyPutRef = "StandardFont;Font"
Attribute Font.VB_UserMemId = -512
    Set UserControl.Font = NewFont
    PropertyChanged "Font"
End Property

Public Property Get Font() As StdFont
    Set Font = UserControl.Font
End Property

Public Property Get Picture() As StdPicture
Attribute Picture.VB_ProcData.VB_Invoke_Property = "StandardPicture"
    Set Picture = m_Picture
End Property

Public Property Set Picture(ByVal NewPicture As StdPicture)
    Set m_Picture = NewPicture
    PropertyChanged "Picture"
End Property

Public Property Get Tally() As Long
Attribute Tally.VB_ProcData.VB_Invoke_Property = ";Misc"
    Tally = m_Amount * 2
End Property

Public Sub AboutBox()
Attribute AboutBox.VB_UserMemId = -552
Attribute AboutBox.VB_MemberFlags = "40"
End Sub
