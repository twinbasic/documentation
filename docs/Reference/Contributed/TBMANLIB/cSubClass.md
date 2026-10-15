---
title: cSubClass
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cSubClass
has_toc: false
---

# cSubClass class
{: .no_toc }

A **cSubClass** subclasses a window: it replaces the window procedure of a window with one of the package's, so that a program sees every message sent to the window in the **WindowProc** event, and can stop a message from reaching the window. The window is given by its handle, so it can be a form, a control, or a window of another part of the same program. The window must belong to the program: Windows allows a window procedure to be replaced only from the process that owns the window.

The class works in 32-bit programs only. It declares the window procedure and its arguments as **Long**, and the compiler refuses the package's call to **SetWindowLong** in a build for 64-bit programs; see [32-bit and 64-bit programs](.#32-bit-and-64-bit-programs).

```tb check_build
Private WithEvents Watcher As cSubClass

Private Sub Attach(ByVal hWnd As Long)
    Set Watcher = New cSubClass
    Watcher.Hook hWnd
End Sub

Private Sub Watcher_WindowProc(Msg As Long, wParam As Long, lParam As Long, CancelNextCall As Boolean)
    Const WM_SETTEXT As Long = &HC

    If Msg = WM_SETTEXT Then CancelNextCall = True
End Sub
```

* TOC
{:toc}

## Fields

### mHWnd
{: .no_toc }

A **Long**, the handle of the hooked window, or 0 before [**Hook**](#hook) is called. A program reads it; it should not set it.

## Methods

### Callback
{: .no_toc }

The routine that the package's window procedure calls for each message. A program does not call it.

Syntax: *object*.**Callback** ( *Msg* **,** *wParam* **,** *lParam* ) **As Long**

Raises [**WindowProc**](#windowproc) and returns 0 when the handler set *CancelNextCall*, and otherwise the address of the window's original window procedure, which the package then calls. An error in a handler is ignored.

### Hook
{: .no_toc }

Starts to subclass a window.

Syntax: *object*.**Hook** ( *hWnd* )

*hWnd*
: *required* A **Long**, the handle of a window of the program.

<!-- test: SubClassTests.Hook_RaisesWindowProcForEachMessageOfTheWindow, SubClassTests.Hook_AnotherObjectOnTheSameWindow_Raises457 -->
Stores the handle, saves the address of the window's procedure, installs the package's procedure, and adds the object to a collection of the internal module **mCallBackSubClass** under the handle. A call on an object that already hooks a window does nothing. Hooking a window that another **cSubClass** object has hooked raises error 457, *this key is already associated with an element of this collection*. In the IDE, the call writes a line to the Debug Console.

The collection holds a reference to the object, so the object is not destroyed while the window is hooked, and the window keeps its replacement procedure until [**UnHook**](#unhook) is called. A program calls **UnHook** before the window is destroyed and before it ends.
<!-- /test -->

### UnHook
{: .no_toc }

Restores the window's own procedure.

Syntax: *object*.**UnHook**

<!-- test: SubClassTests.UnHook_RestoresTheWindowProcedureAndStopsTheEvents, SubClassTests.UnHook_WithNoHookInPlace_Raises5 -->
Puts back the procedure that **Hook** saved and removes the object from the collection. A second call, with no hook in place, raises error 5.
<!-- /test -->

## Events

### WindowProc
{: .no_toc }

Raised for each message that the hooked window receives.

Syntax: **Event** *object*_**WindowProc** ( *Msg* **,** *wParam* **,** *lParam* **,** *CancelNextCall* )

*Msg*, *wParam*, *lParam*
: **Long** values passed by reference: the message number and its two arguments.

<!-- test: SubClassTests.Hook_CancelNextCall_StopsTheMessageAndReturnsZero -->
*CancelNextCall*
: A **Boolean**, passed by reference, **False** on entry. When the handler sets it to **True**, the message does not reach the window's own procedure, and the window procedure returns 0. Otherwise the window handles the message after the event.
<!-- /test -->

A handler is written for a variable declared with **WithEvents**. The event is raised synchronously, in the thread that sends the message, before the window sees it. A handler cannot change the value that the window procedure returns, or the arguments that the window procedure receives (the arguments are passed by reference but the original procedure is called with the originals).

## See Also

- [cTimer](cTimer) class -- another class built on a Windows callback
- [TBMANLIB](.) package -- overview
