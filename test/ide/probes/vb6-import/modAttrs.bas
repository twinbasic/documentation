Attribute VB_Name = "modAttrs"
Option Explicit

Public Function Helper() As Long
Attribute Helper.VB_Description = "A module function with a description."
    Helper = 1
End Function

Public Function HelperWithHelpId() As Long
Attribute HelperWithHelpId.VB_HelpID = 3001
    HelperWithHelpId = 2
End Function
