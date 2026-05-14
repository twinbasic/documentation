---
title: NamedPipeClientManager
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeClientManager
has_toc: false
---

# NamedPipeClientManager class
{: .no_toc }

The client-side coordinator. Owns a Windows I/O Completion Port and a pool of worker threads shared by every [**NamedPipeClientConnection**](NamedPipeClientConnection) it produces, and returns them through [**Connect**](#connect). One [**NamedPipeClientManager**](.) typically lives for the lifetime of the consuming process and manages many connections — to one or several servers — through that shared IOCP infrastructure. Instantiate with **New**.

Configure the public fields (all four have reasonable defaults), call [**Connect**](#connect) for each pipe the application wants to dial, and respond to the [**NamedPipeClientConnection**](NamedPipeClientConnection) events. The first [**Connect**](#connect) lazily creates the completion port and starts the worker threads; subsequent calls reuse them.

```tb
Private manager As NamedPipeClientManager
Private WithEvents connection As NamedPipeClientConnection

Private Sub Form_Load()
    Set manager = New NamedPipeClientManager
    Set connection = manager.Connect("MyService")
End Sub

Private Sub connection_Connected()
    Dim payload() As Byte = StrConv("hello", vbFromUnicode)
    connection.AsyncWrite payload
End Sub

Private Sub Form_Unload(Cancel As Integer)
    connection.AsyncClose                ' required — see README
    manager.Stop                         ' or just let the manager go out of scope
End Sub
```

See the package [overview](.) for the IOCP / event-marshalling architecture, the cookie correlation pattern, the transient lifetime of `Data() As Byte` inside events, and the mandatory `AsyncClose` rule for client connections.

* TOC
{:toc}

## Properties

The four configuration fields are read once on the first [**Connect**](#connect) call and propagated to every [**NamedPipeClientConnection**](NamedPipeClientConnection) created through this manager. Subsequent changes affect connections opened thereafter but **not** connections that already exist — set the fields before the first [**Connect**](#connect).

### ContinuouslyReadFromPipe
{: .no_toc }

When **True** (the default), each [**NamedPipeClientConnection**](NamedPipeClientConnection) keeps a read pending against its pipe at all times — every [**MessageReceived**](NamedPipeClientConnection#messagereceived) is followed by an automatic `AsyncRead` issued from inside the IOCP thread. Set to **False** to handle reads one-at-a-time; each [**MessageReceived**](NamedPipeClientConnection#messagereceived) handler must then call [**NamedPipeClientConnection.AsyncRead**](NamedPipeClientConnection#asyncread) to receive the next message. **Boolean**, default **True**.

### FreeThreadingEvents
{: .no_toc }

Controls where the [**NamedPipeClientConnection**](NamedPipeClientConnection) events are raised. When **False** (the default), the IOCP worker threads marshal each event to the main UI thread through the manager's hidden message-only window, and the consuming process must be pumping a Win32 message loop. When **True**, events fire directly on whichever IOCP worker thread received the completion — no message-loop dependency, but the consumer's event handlers must be thread-safe. **Boolean**, default **False**.

### MessageBufferSize
{: .no_toc }

The size, in bytes, of the per-completion `ReadFile` buffer initially allocated for each client connection. **Long**, default **131072** (128 KiB). Does not cap the maximum message size — on `ERROR_MORE_DATA` the IOCP loop allocates a larger overflow buffer and re-issues the read — but the initial size affects throughput for sustained large-message traffic.

### NumThreadsIOCP
{: .no_toc }

The number of IOCP worker threads created when [**Connect**](#connect) is first called. **Long**, default **1**. One thread is enough for most scenarios; raise this to allow concurrent event handlers under [**FreeThreadingEvents**](#freethreadingevents) = **True**, or to keep up with heavy traffic on multi-core hardware.

## Methods

### Connect
{: .no_toc }

Opens an asynchronous connection to a named pipe on the local machine.

Syntax: *manager*.**Connect**( *PipeName* ) **As NamedPipeClientConnection**

*PipeName*
: *required* The leaf name of the pipe to dial — the package prepends `\\.\pipe\` itself. Raises run-time error 5 *"cannot start without specifying a pipe name"* if empty.

Lazy on first call: creates the completion port and starts [**NumThreadsIOCP**](#numthreadsiocp) worker threads. Returns immediately with a [**NamedPipeClientConnection**](NamedPipeClientConnection) in the not-yet-connected state. The actual `CreateFileW` runs asynchronously on an IOCP worker and fires [**Connected**](NamedPipeClientConnection#connected) on the returned object once the pipe is open.

Raises run-time error 5 *"unable to create an IOCP port"* if `CreateIoCompletionPort` fails on the first call.

### FindNamedPipes
{: .no_toc }

Enumerates the named pipes currently published on the local machine.

Syntax: *manager*.**FindNamedPipes** ( [ *Pattern* ] ) **As Collection**

*Pattern*
: *optional* A wildcard pattern matched against the leaf pipe name (no `\\.\pipe\` prefix; the package adds it). `*` matches any sequence, `?` matches any single character. Default `"*"` — return every pipe.

Returns a **Collection** of **String** values, each a leaf pipe name suitable to pass to [**Connect**](#connect). Useful as a discovery step when the consumer doesn't know the exact server name in advance:

```tb
Dim names As Collection = manager.FindNamedPipes("MyService_*")
Dim name As Variant
For Each name In names
    Debug.Print "found: " & name
Next
```

The package does not publish an event when pipes appear or disappear, so dynamic UIs that list available servers typically refresh the list from a low-frequency [**Timer**](../VB/Timer/) — see [Discovering pipes](.#discovering-pipes) on the package overview for the polling-loop pattern that preserves the user's current selection across refreshes.

### Stop
{: .no_toc }

Cancels every outstanding I/O on every connection produced by this manager, posts the IOCP shutdown sentinel to each worker, waits for the threads to exit, closes every pipe handle, and frees the completion port. Idempotent: calling [**Stop**](#stop) on a manager that has not connected anything — or has already been stopped — is a no-op. Automatically invoked from `Class_Terminate`, so a manager going out of scope closes resources implicitly.

Syntax: *manager*.**Stop**

[**NamedPipeClientConnection**](NamedPipeClientConnection) objects produced by this manager remain valid as references after [**Stop**](#stop), but their underlying pipe handles are closed and they cannot perform I/O.

### New
{: .no_toc }

Constructs a manager in the not-yet-connected state. Creates the hidden `STATIC`-class message window used to marshal IOCP-thread completions back to the UI thread.

Syntax: **New NamedPipeClientManager**

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat, **AsyncClose** rule
- [Discovering pipes](.#discovering-pipes) -- the **Timer**-driven polling loop that powers dynamic pipe-listing UIs
- [NamedPipeClientConnection class](NamedPipeClientConnection) -- the per-connection object returned by [**Connect**](#connect)
- [NamedPipeServer class](NamedPipeServer) -- the server-side counterpart
