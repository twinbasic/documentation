---
title: ThreadID
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/ThreadID
has_toc: false
---
# ThreadID
{: .no_toc }

Returns the Win32 thread ID of the main application thread. Read-only.

Syntax: **App**.**ThreadID** **As Long**

Returns a **Long** containing the identifier assigned by the operating system to the main thread of the running process. This is the same value that the Win32 API `GetCurrentThreadId` returns when called from the main thread.

The thread ID is useful when calling Win32 APIs that require a thread identifier, such as `PostThreadMessage`, or when attaching to thread input with `AttachThreadInput`.

### Example

This example prints the main thread ID to the debug console.

```tb
Debug.Print "Main thread ID: " & App.ThreadID
```

### See Also

- [hInstance](hInstance) property
- [IsInIDE](IsInIDE) property
