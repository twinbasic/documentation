---
title: GdiplusStartupOutput
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GdiplusStartupOutput
has_toc: false
---

# GdiplusStartupOutput type
{: .no_toc }

The two functions that GDI+ returns when it is started without its background thread.

When [**SuppressBackgroundThread**](GdiplusStartupInput#suppressbackgroundthread) is **True**, GDI+ runs no thread of its own for its background work, and the program must call a hook function before it enters its message loop and an unhook function after it leaves it. GDI+ returns the two functions in a **GdiplusStartupOutput**, which the [**GdiPlusUser**](../GdiPlusUser) constructor fills in. It mirrors the `GdiplusStartupOutput` structure of GDI+ and has two fields and no methods.

A program that leaves the background thread on never needs this type.

## Fields

<!-- test: Ty_StartupTests.Output_HooksAreSetAfterStartingWithTheOutput -->
### NotificationHook

A [**NotificationHookProc**](#notificationhookproc). **0** until GDI+ has been started with the output.

### NotificationUnhook

A [**NotificationUnhookProc**](#notificationunhookproc). **0** until GDI+ has been started with the output.
<!-- /test -->

## Delegates

### NotificationHookProc

**Function**( *token* As **ULONG** ) As [**GpStatus**](../Enumerations/GpStatus). Starts the background work and returns a token.

### NotificationUnhookProc

**Sub**( *token* As **ULONG** ). Stops it. Pass the token that the hook returned.

<!-- test: Ty_StartupTests.NotificationHookProc_DoesNotWriteBeyondTheToken, Ty_StartupTests.NotificationHookProc_HooksAndUnhooksWithTheFirstElementOfAnArray -->
> [!WARNING] 0.9.45.0
> The token is declared as a 32-bit **Long**, and in a 64-bit program GDI+ writes a 64-bit value into it. **NotificationHookProc** overwrites the four bytes after the variable. Pass the first element of an array of two **Long** values, as in the sample below, so that the four bytes it overwrites belong to nothing else.

## Module functions

Syntax: **NotificationHook**( *token* As **LongPtr** ) As **GpStatus** \
Syntax: **NotificationUnhook**( *token* As **LongPtr** )

<!-- test: Ty_StartupTests.ModuleFunctions_HookAndUnhookWithALongPtrToken -->
> [!WARNING] 0.9.45.0
> **NotificationHook** returns status 1, *GenericError*, and leaves the token 0, also after GDI+ was started with a [**GdiplusStartupInput**](GdiplusStartupInput) whose **SuppressBackgroundThread** is **True** through the constructor that takes an output. The function it declares is not the one in the output. Call the **NotificationHook** and **NotificationUnhook** fields of the output, as in the sample below.

```tb check_build check_run
Dim settings As GdiplusStartupInput
settings.GdiplusVersion = 1
settings.SuppressBackgroundThread = True
Dim output As GdiplusStartupOutput
Dim user As GdiPlusUser = GdiPlusUser(settings, output)
Debug.Print user.LastResult                                      ' 0
Debug.Print output.NotificationHook <> 0                         ' True
Debug.Print output.NotificationUnhook <> 0                       ' True
Dim slot(0 To 1) As Long
Dim status As GpStatus = output.NotificationHook(slot(0))
Debug.Print status                                               ' 0
' ... the program's message loop runs here ...
output.NotificationUnhook slot(0)
```

## See Also

- [GdiplusStartupInput](GdiplusStartupInput) type -- the settings, including **SuppressBackgroundThread**
- [GdiPlusUser](../GdiPlusUser) class -- starts GDI+
- [Types](.) -- the types of the package
- [GdiplusStartupOutput](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusinit/ns-gdiplusinit-gdiplusstartupoutput) -- the GDI+ structure on Microsoft Learn
