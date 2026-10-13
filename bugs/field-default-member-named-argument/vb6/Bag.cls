VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Bag"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private mValue As Long

Public Property Get Item(ByVal Key As String) As Long
Attribute Item.VB_UserMemId = 0
    Item = mValue
End Property

Public Property Let Item(ByVal Key As String, ByVal Value As Long)
    mValue = Value
End Property
