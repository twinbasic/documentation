' The native harness, for twinBASIC only: the procedures of the (Default) module that take a
' GDI handle, a window or a callback get them from here. Every case that uses it is
' `only: tb`, since VB6 and VBA have none of those procedures, so this file may use
' twinBASIC's own syntax (GetMessageHookHelper).
' native_Begin creates a hidden STATIC window of the probe's own thread, native_Window, and
' native_End destroys it and every bitmap native_Bitmap made that a case did not give away.
' native_Icon is the shared IDI_APPLICATION icon, which is never destroyed.
' native_Handler is a GetMessageHookHelper.GetMessageHandler that does nothing.
' native_StdIid is the address of a standard COM interface ID.

Private Declare PtrSafe Function native_CreateWindowExA Lib "user32" Alias "CreateWindowExA" (ByVal Ex As Long, ByVal Cls As String, ByVal Title As String, ByVal Style As Long, ByVal X As Long, ByVal Y As Long, ByVal W As Long, ByVal H As Long, ByVal Parent As LongPtr, ByVal Menu As LongPtr, ByVal Inst As LongPtr, ByVal P As LongPtr) As LongPtr
Private Declare PtrSafe Function native_DestroyWindow Lib "user32" Alias "DestroyWindow" (ByVal H As LongPtr) As Long
Private Declare PtrSafe Function native_LoadIconW Lib "user32" Alias "LoadIconW" (ByVal Inst As LongPtr, ByVal Name As LongPtr) As LongPtr
Private Declare PtrSafe Function native_CreateBitmap Lib "gdi32" Alias "CreateBitmap" (ByVal W As Long, ByVal H As Long, ByVal Planes As Long, ByVal Bits As Long, ByVal Data As LongPtr) As LongPtr
Private Declare PtrSafe Function native_DeleteObject Lib "gdi32" Alias "DeleteObject" (ByVal H As LongPtr) As Long

' An enumeration for GetDeclaredMinEnumValue and GetDeclaredMaxEnumValue.
Private Enum native_Kind
    native_Low = -3
    native_Mid = 0
    native_High = 7
End Enum

Private Type native_GUID
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type

Private native_Hwnd As LongPtr
Private native_Bitmaps As New Collection
Private native_Iid As native_GUID

' The address of the interface ID {Data1-0000-0000-C000-000000000046}, for vbaCastObj:
' 0 is IUnknown's, &H20400 IDispatch's.
Private Function native_StdIid(ByVal Data1 As Long) As LongPtr
    native_Iid.Data1 = Data1
    native_Iid.Data4(0) = &HC0
    native_Iid.Data4(7) = &H46
    native_StdIid = VarPtr(native_Iid)
End Function

Private Function native_Window() As LongPtr
    native_Window = native_Hwnd
End Function

Private Function native_Icon() As LongPtr
    native_Icon = native_LoadIconW(0, 32512)
End Function

' A 2 x 2 bitmap, deleted by native_End unless native_Keep says a picture owns it.
Private Function native_Bitmap() As LongPtr
    native_Bitmap = native_CreateBitmap(2, 2, 1, 32, 0)
    native_Bitmaps.Add native_Bitmap
End Function

' The last bitmap made belongs to a picture now (TakeOwnership True): native_End leaves it.
Private Sub native_Keep()
    native_Bitmaps.Remove native_Bitmaps.Count
End Sub

Private Function native_Handler(ByRef Msg As GetMessageHookHelper.HookMSG) As LongPtr
    native_Handler = 0
End Function

Private Sub native_Begin()
    native_Hwnd = native_CreateWindowExA(0, "STATIC", "tbdocsErrorsProbe", 0, 0, 0, 100, 100, 0, 0, 0, 0)
End Sub

Private Sub native_End()
    Dim H As Variant
    For Each H In native_Bitmaps
        native_DeleteObject H
    Next
    Set native_Bitmaps = New Collection
    If native_Hwnd <> 0 Then native_DestroyWindow native_Hwnd
    native_Hwnd = 0
End Sub
