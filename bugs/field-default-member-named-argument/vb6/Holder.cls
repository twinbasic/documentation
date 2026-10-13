VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Holder"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Public Field As New Bag
Public Dict As New Scripting.Dictionary
Public Plain As Bag
Private mBag As New Bag

Public Property Get Prop() As Bag
    Set Prop = mBag
End Property
