VERSION 5.00
Begin VB.UserControl ProbeControl
   ClientHeight    =   900
   ClientLeft      =   0
   ClientTop       =   0
   ClientWidth     =   1500
   ScaleHeight     =   900
   ScaleWidth      =   1500
End
Attribute VB_Name = "ProbeControl"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private m_A As Long
Private m_B As Long

Public Property Get WithChanged() As Long
    WithChanged = m_A
End Property

Public Property Let WithChanged(ByVal Value As Long)
    m_A = Value
    PropertyChanged "WithChanged"
End Property

Public Property Get WithoutChanged() As Long
    WithoutChanged = m_B
End Property

Public Property Let WithoutChanged(ByVal Value As Long)
    m_B = Value
End Property

Public Sub CallsChangedNoName()
    PropertyChanged
End Sub
