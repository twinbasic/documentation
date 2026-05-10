---
title: (Default) Module
parent: VBA Package
permalink: /tB/Modules/HiddenModule/
redirect_from:
  - /tB/Modules/_HiddenModule
has_toc: false
---

# (Default) module

The **(Default)** module — known internally as **\_HiddenModule** — gathers together the unqualified intrinsic procedures: pointer- and memory-level helpers, the file-input pseudo-functions, the bridges into the codegen and reflection machinery, and a long tail of runtime utilities that the compiler emits calls into but that are also callable directly. Members of this module are referenced without a qualifier, the same way **MsgBox** and **CStr** are.

Most of these procedures are deliberately hidden from IntelliSense and exist for advanced or low-level use; reach for them only when the higher-level alternatives in **[Math](../Math/)**, **[Strings](../Strings/)**, **[Information](../Information/)**, or **[Interaction](../Interaction/)** don't cover the case. Several have additional internal-only members that are not listed here at all.

## Pointers and memory

Three functions return raw addresses for use with API calls or unsafe interop: [**ObjPtr**](ObjPtr) for an object's COM identity, [**StrPtr**](StrPtr) for the underlying buffer of a **String**, and [**VarPtr**](VarPtr) for any variable.

Memory at a known address is read and written one machine word at a time with the **GetMem*** / **PutMem*** family — [**GetMem1**](GetMem1), [**GetMem2**](GetMem2), [**GetMem4**](GetMem4), [**GetMem8**](GetMem8), and [**GetMemPtr**](GetMemPtr) for reads, with matching [**PutMem1**](PutMem1), [**PutMem2**](PutMem2), [**PutMem4**](PutMem4), [**PutMem8**](PutMem8), and [**PutMemPtr**](PutMemPtr). [**vbaCopyBytes**](vbaCopyBytes) and [**vbaCopyBytesZero**](vbaCopyBytesZero) move blocks; [**AllocMem**](AllocMem) and [**FreeMem**](FreeMem) manage heap allocations.

```tb
Dim Buffer As LongPtr = AllocMem(16)
PutMem4 Buffer, &HDEADBEEF
Dim Magic As Long
GetMem4 Buffer, Magic
FreeMem Buffer
```

## Reading from open files

[**Input**](Input) and [**Input$**](Input) read a fixed number of characters from a file opened with **Open**, returning a **Variant** or a **String** respectively. [**InputB**](InputB) and [**InputB$**](InputB) are their byte-oriented counterparts. [**Width**](Width) sets the line width on a sequential output channel.

## Building variant arrays

[**Array**](Array) creates a **Variant** array from a comma-separated list of values; the lower bound follows the source file's **Option Base** setting. As a special form, the same name doubles as a destructuring `Property Let` for unpacking an array on the right-hand side into individual variables on the left.

```tb
Dim a As Variant = Array("one", "two", "three")
Dim x As Variant, y As Variant, z As Variant
Array(x, y, z) = a              ' destructuring assignment
```

[**vbaRefVarAry**](vbaRefVarAry) and [**vbaAryMove**](vbaAryMove) are lower-level helpers used when interfacing with C-side array layouts.

## Object references and casting

[**vbaObjAddref**](vbaObjAddref), [**vbaObjSet**](vbaObjSet), and [**vbaObjSetAddref**](vbaObjSetAddref) manipulate COM reference counts directly. [**vbaCastObj**](vbaCastObj) returns the object reinterpreted as another COM interface, given its IID. [**CreateGUID**](CreateGUID) generates a fresh GUID and returns it as a registry-formatted string.

## Atomic operations

The **Interlocked*** family wraps the corresponding Windows kernel atomics — building blocks for lock-free counters and pointer swaps: [**InterlockedExchangePointer**](InterlockedExchangePointer), [**InterlockedCompareExchangePointer**](InterlockedCompareExchangePointer), [**InterlockedCompareExchange32**](InterlockedCompareExchange32), [**InterlockedCompareExchange64**](InterlockedCompareExchange64), [**InterlockedIncrement32**](InterlockedIncrement32), and [**InterlockedDecrement32**](InterlockedDecrement32).

## Compile-time reflection

A handful of intrinsics ask questions about the surrounding type without running anything; they are resolved by the compiler and burn in as constants. [**GetDeclaredTypeProgId**](GetDeclaredTypeProgId), [**GetDeclaredTypeClsid**](GetDeclaredTypeClsid), [**GetDeclaredTypeIid**](GetDeclaredTypeIid), and [**GetDeclaredTypeEventIid**](GetDeclaredTypeEventIid) report a type's COM identifiers. [**GetDeclaredMinEnumValue**](GetDeclaredMinEnumValue) and [**GetDeclaredMaxEnumValue**](GetDeclaredMaxEnumValue) return the minimum and maximum value of a declared enumeration.

## Codegen injection and stack inspection

[**Emit**](Emit) and [**EmitAny**](EmitAny) splice raw bytes or typed literals into the codegen output of the enclosing procedure — the vehicle for inline assembly. [**StackOffset**](StackOffset) and [**StackArgsSize**](StackArgsSize) report layout information at the current call site; [**UnprotectedAccess**](UnprotectedAccess) returns an object reference that bypasses the usual access checks on private members.

## Runtime expression evaluation

[**Eval**](Eval) compiles and evaluates a twinBASIC expression supplied as a string, using a freshly built [**TbExpressionService**](../ExpressionService/) configured with the standard library binder.

## Pictures, bitmaps, and icons

[**PictureToByteArray**](PictureToByteArray) serialises an **IPicture** to a byte array; [**CreateStdPictureFromHandle**](CreateStdPictureFromHandle) wraps a GDI handle in an **stdole.StdPicture**; [**ConvertIconToBitmap**](ConvertIconToBitmap) does the obvious.

## Other helpers

[**GetInheritedOwner**](GetInheritedOwner) returns the inherited owner object of a control. [**GetShortcutTextByEnum**](GetShortcutTextByEnum) returns the localised display text for a built-in keyboard shortcut. [**SetThreadGlobalErrorTrap**](SetThreadGlobalErrorTrap) registers a callback that fires when an unhandled run-time error escapes the active error handler chain on the calling thread.

## Members

- [AllocMem](AllocMem) -- allocates a block of native memory and returns its address
- [Array](Array) -- creates a **Variant** array from a comma-separated list of values, or destructures one when used on the left of an assignment
- [ConvertIconToBitmap](ConvertIconToBitmap) -- converts an icon picture to a bitmap picture
- [CreateGUID](CreateGUID) -- generates a fresh GUID and returns it as a registry-formatted string
- [CreateStdPictureFromHandle](CreateStdPictureFromHandle) -- wraps a GDI bitmap or icon handle in an **stdole.StdPicture**
- [Emit](Emit) -- injects custom **Byte** values into the codegen stream of the enclosing procedure
- [EmitAny](EmitAny) -- injects custom typed values into the codegen stream of the enclosing procedure
- [Eval](Eval) -- compiles and evaluates a twinBASIC expression supplied as a string
- [FreeMem](FreeMem) -- frees memory allocated with [**AllocMem**](AllocMem)
- [GetDeclaredMaxEnumValue](GetDeclaredMaxEnumValue) -- returns the maximum value of a declared enumeration type, resolved at compile time
- [GetDeclaredMinEnumValue](GetDeclaredMinEnumValue) -- returns the minimum value of a declared enumeration type, resolved at compile time
- [GetDeclaredTypeClsid](GetDeclaredTypeClsid) -- returns the COM CLSID associated with the declared type, resolved at compile time
- [GetDeclaredTypeEventIid](GetDeclaredTypeEventIid) -- returns the COM event-interface IID associated with the declared type, resolved at compile time
- [GetDeclaredTypeIid](GetDeclaredTypeIid) -- returns the COM interface IID associated with the declared type, resolved at compile time
- [GetDeclaredTypeProgId](GetDeclaredTypeProgId) -- returns the COM ProgID associated with the declared type, resolved at compile time
- [GetInheritedOwner](GetInheritedOwner) -- returns the inherited owner object of a control
- [GetMem1](GetMem1) -- reads one byte from a memory address into a **Byte** variable
- [GetMem2](GetMem2) -- reads two bytes from a memory address into an **Integer** variable
- [GetMem4](GetMem4) -- reads four bytes from a memory address into a **Long** variable
- [GetMem8](GetMem8) -- reads eight bytes from a memory address into a **Currency** variable
- [GetMemPtr](GetMemPtr) -- reads a pointer-sized value from a memory address into a **LongPtr** variable
- [GetShortcutTextByEnum](GetShortcutTextByEnum) -- returns the localized text for a built-in keyboard shortcut by its enumeration ID
- [Input, Input$](Input) -- reads a fixed number of characters from an open sequential file
- [InputB, InputB$](InputB) -- reads a fixed number of bytes from an open sequential file
- [InterlockedCompareExchange32](InterlockedCompareExchange32) -- atomically compares and exchanges a 32-bit value
- [InterlockedCompareExchange64](InterlockedCompareExchange64) -- atomically compares and exchanges a 64-bit value
- [InterlockedCompareExchangePointer](InterlockedCompareExchangePointer) -- atomically compares and exchanges a pointer-sized value
- [InterlockedDecrement32](InterlockedDecrement32) -- atomically decrements a 32-bit value and returns the new value
- [InterlockedExchangePointer](InterlockedExchangePointer) -- atomically exchanges a pointer-sized value and returns the previous value
- [InterlockedIncrement32](InterlockedIncrement32) -- atomically increments a 32-bit value and returns the new value
- [ObjPtr](ObjPtr) -- returns the COM-identity address of an object
- [PictureToByteArray](PictureToByteArray) -- serialises an **IPicture** into a **Byte** array
- [PutMem1](PutMem1) -- writes one byte to a memory address
- [PutMem2](PutMem2) -- writes two bytes to a memory address
- [PutMem4](PutMem4) -- writes four bytes to a memory address
- [PutMem8](PutMem8) -- writes eight bytes to a memory address
- [PutMemPtr](PutMemPtr) -- writes a pointer-sized value to a memory address
- [RuntimeCreateGetMessageHook](RuntimeCreateGetMessageHook) -- creates an [**IGetMessageHook**](./#igetmessagehook-interface) for filtering window messages
- [SetThreadGlobalErrorTrap](SetThreadGlobalErrorTrap) -- registers a global callback invoked when an unhandled error is raised on the calling thread
- [StackArgsSize](StackArgsSize) -- returns the total size, in bytes, of the arguments on the current procedure's stack frame
- [StackOffset](StackOffset) -- returns the stack-frame offset of a variable
- [StrPtr](StrPtr) -- returns the address of the underlying buffer of a **String**
- [UnprotectedAccess](UnprotectedAccess) -- returns an object reference that bypasses access checks on private members
- [VarPtr](VarPtr) -- returns the address of a variable
- [Width](Width) -- sets the line width for a sequential output file
- [vbaAryMove](vbaAryMove) -- moves the contents of one array variable into another
- [vbaCastObj](vbaCastObj) -- returns an object reinterpreted as another COM interface
- [vbaCopyBytes](vbaCopyBytes) -- copies a block of bytes from one address to another
- [vbaCopyBytesZero](vbaCopyBytesZero) -- copies a block of bytes from one address to another, then zeros the source
- [vbaObjAddref](vbaObjAddref) -- increments the COM reference count of an object at a given address
- [vbaObjSet](vbaObjSet) -- assigns an object pointer to an object variable, releasing any prior reference
- [vbaObjSetAddref](vbaObjSetAddref) -- assigns an object pointer to an object variable, adding a reference and releasing any prior reference
- [vbaRefVarAry](vbaRefVarAry) -- returns a pointer to the **SAFEARRAY** descriptor inside a **Variant** array

## IGetMessageHook interface

The **IGetMessageHook** interface taps into the Windows message stream for a chosen window — and optionally its descendants — and forwards messages of a chosen type to a user-supplied callback. Obtain an instance with [**RuntimeCreateGetMessageHook**](RuntimeCreateGetMessageHook); wire up callbacks with [**RegisterMessage**](RegisterMessage); then call [**Start**](Start) to activate every registered subscription, and [**Stop**](Stop) to remove them.

The interface inherits directly from **stdole.IUnknown** (it is not dispatch-based), and the callbacks supplied to **RegisterMessage** are typed as [**GetMessageHookHelper.GetMessageHandler**](#getmessagehandler).

```tb
Const WM_LBUTTONDOWN = &H201

Sub Demo()
    Dim Hook As IGetMessageHook = RuntimeCreateGetMessageHook
    Hook.RegisterMessage Me.hWnd, AllDescendants, _
                         WM_LBUTTONDOWN, AddressOf OnLButtonDown
    Hook.Start
End Sub

Function OnLButtonDown(ByRef msg As GetMessageHookHelper.HookMSG) As LongPtr
    Debug.Print "Click at"; msg.pt.x, msg.pt.y
    ' Return zero to let the message continue normal processing.
End Function
```

### Members

- [RegisterMessage](RegisterMessage) -- subscribes a callback to a single message type for a window and a chosen descendant scope
- [Start](Start) -- activates every registered subscription
- [Stop](Stop) -- deactivates every registered subscription

### EnumDescendantsModeFlags

Selects the window scope passed to [**RegisterMessage**](RegisterMessage):

| Constant                                 | Value | Description |
|------------------------------------------|-------|-------------|
| **ExactWindow**{: #ExactWindow }         | 1     | Hook only the specified window. |
| **AllDescendants**{: #AllDescendants }   | 2     | Hook the specified window and every descendant — children, grandchildren, and so on. |
| **DirectChildren**{: #DirectChildren }   | 4     | Hook the specified window and its immediate children only. |

## GetMessageHookHelper module

The **GetMessageHookHelper** module is a small companion to [**IGetMessageHook**](#igetmessagehook-interface) that holds the structures and the delegate type used by its callback. There is nothing to construct; the names exist only for use in declarations.

### HookMSG

A copy of the Windows `MSG` structure, passed by reference into a [**GetMessageHandler**](#getmessagehandler) callback.

```tb
Type HookMSG
    hwnd As LongPtr             ' Window the message is destined for.
    message As Long             ' The WM_* identifier.
    wParam As LongPtr           ' Message-specific parameter.
    lParam As LongPtr           ' Message-specific parameter.
    time As Long                ' Time the message was posted, in milliseconds since system start.
    pt As HookPOINT             ' Cursor position when the message was posted.
End Type
```

### HookPOINT

A 2D point with **Long** coordinates, used by [**HookMSG**](#hookmsg) to carry the cursor position.

```tb
Type HookPOINT
    x As Long
    y As Long
End Type
```

### GetMessageHandler

The callback signature accepted by [**IGetMessageHook.RegisterMessage**](RegisterMessage). Returning zero generally lets the message continue normal processing.

```tb
Public Delegate Function GetMessageHandler (ByRef msg As HookMSG) As LongPtr
```
