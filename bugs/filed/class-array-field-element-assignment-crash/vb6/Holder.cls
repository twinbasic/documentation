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

' VB6 refuses this declaration when it builds the project:
' "Constants, fixed-length strings, arrays, user-defined types and Declare statements not
' allowed as Public members of object modules". The line is commented out so that the
' project builds; the message is the one VB6 prints for the line left in.
'Public Values(1 To 3) As Long
Private mValues(1 To 3) As Long

Public Property Get Values(ByVal Index As Long) As Long
    Values = mValues(Index)
End Property

Public Property Let Values(ByVal Index As Long, ByVal Value As Long)
    mValues(Index) = Value
End Property
