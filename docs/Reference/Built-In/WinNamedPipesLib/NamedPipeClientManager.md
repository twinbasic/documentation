---
title: NamedPipeClientManager
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeClientManager
has_toc: false
---

# NamedPipeClientManager class
{: .no_toc }

The client-side coordinator. Owns a Windows I/O Completion Port and a pool of worker threads shared by every [**NamedPipeClientConnection**](NamedPipeClientConnection) it produces, and returns them through [**Connect**](#connect). One [**NamedPipeClientManager**](.) typically lives for the lifetime of the consuming process and manages many connections --- to one or several servers --- through that shared IOCP infrastructure. Instantiate with **New**.

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

The four configuration fields are read once on the first [**Connect**](#connect) call and propagated to every [**NamedPipeClientConnection**](NamedPipeClientConnection) created through this manager. Subsequent changes affect connections opened thereafter but **not** connections that already exist --- set the fields before the first [**Connect**](#connect).

### ContinuouslyReadFromPipe
{: #continuouslyreadfrompipe }
{: .no_toc }

Controls whether each connection keeps a read pending automatically after every received message. **Boolean**, default **True**.

Syntax: *manager*.**ContinuouslyReadFromPipe** [ **=** *value* ]

*value*
: A **Boolean**. **True** (the default) to keep a read pending at all times; **False** to require an explicit [**NamedPipeClientConnection.AsyncRead**](NamedPipeClientConnection#asyncread) call after each message.

When **True**, the IOCP worker thread issues a new `AsyncRead` immediately after delivering each [**MessageReceived**](NamedPipeClientConnection#messagereceived) event. The next message is received without consumer code having to do anything. This is the right choice for most scenarios.

When **False**, no automatic re-read is issued. The consumer's [**MessageReceived**](NamedPipeClientConnection#messagereceived) handler must call [**NamedPipeClientConnection.AsyncRead**](NamedPipeClientConnection#asyncread) before the next message can be received. This allows back-pressure: the consumer can delay calling [**AsyncRead**](NamedPipeClientConnection#asyncread) until it is ready to process another message, preventing the IOCP loop from delivering messages faster than the handler can cope.

> [!NOTE]
> The value is read once when each [**NamedPipeClientConnection**](NamedPipeClientConnection) is constructed by [**Connect**](#connect) and stored on the connection object. Changing **ContinuouslyReadFromPipe** after the first [**Connect**](#connect) has no effect on connections that already exist.

### FreeThreadingEvents
{: .no_toc }

Controls where [**NamedPipeClientConnection**](NamedPipeClientConnection) events are raised. **Boolean**, default **False**.

Syntax: *manager*.**FreeThreadingEvents** [ **=** *value* ]

*value*
: A **Boolean**. **False** (the default) marshals each event to the main UI thread through the manager's hidden message-only window; **True** fires events directly on whichever IOCP worker thread received the completion.

When **False**, the IOCP worker threads post each completion to a hidden `STATIC`-class window owned by the manager. That window's subclassed `WndProc` then raises the event on the main UI thread. The consuming process must be pumping a Win32 message loop for delivery to occur. Forms-based hosts already pump one; console hosts and Windows services do not, and need either [**NamedPipeServer.ManualMessageLoopEnter**](NamedPipeServer#manualmessageloopenter) / `ManualMessageLoopLeave` or **FreeThreadingEvents** = **True**.

When **True**, the IOCP thread raises each event directly --- no message-loop dependency --- but the consumer's event handlers must be thread-safe. Multiple [**MessageReceived**](NamedPipeClientConnection#messagereceived) events from different connections can fire concurrently, and any global or class state the handler reads or writes is **not** protected by the implicit single-threaded serialisation that the default mode provides.

> [!IMPORTANT]
> Set **FreeThreadingEvents** before the first [**Connect**](#connect) call. The value is read once at that point and propagated to every [**NamedPipeClientConnection**](NamedPipeClientConnection) created through this manager.

### MessageBufferSize
{: .no_toc }

The size, in bytes, of the per-completion `ReadFile` buffer initially allocated for each client connection. **Long**, default **131072** (128 KiB).

Syntax: *manager*.**MessageBufferSize** [ **=** *value* ]

*value*
: A **Long** giving the buffer size in bytes. Default **131072** (128 KiB).

The receive path does not treat this as a cap: when a message is larger than the buffer, the IOCP loop receives `ERROR_MORE_DATA`, allocates a larger overflow buffer, and re-issues the read until all bytes arrive. The initial size therefore affects throughput for sustained large-message traffic rather than limiting the maximum readable message size.

The send path is different: [**NamedPipeClientConnection.AsyncWrite**](NamedPipeClientConnection#asyncwrite) copies the caller's `Byte()` into a per-completion buffer sized at **MessageBufferSize** without a bounds check. A message larger than the buffer overruns it --- likely a crash or heap corruption rather than a clean error.

> [!IMPORTANT]
> Set **MessageBufferSize** to at least the size of the largest message the application expects to send, *before* the first [**Connect**](#connect) call. The value is read once when the completion port is created and propagated to every per-connection buffer; changes after the first [**Connect**](#connect) do not affect existing connections.

### NumThreadsIOCP
{: .no_toc }

The number of IOCP worker threads created when [**Connect**](#connect) is first called. **Long**, default **1**. One thread is enough for most scenarios; raise this to allow concurrent event handlers under [**FreeThreadingEvents**](#freethreadingevents) = **True**, or to keep up with heavy traffic on multi-core hardware.

## Methods

### Connect
{: .no_toc }

Opens an asynchronous connection to a named pipe on the local machine.

Syntax: *manager*.**Connect**( *PipeName* ) **As NamedPipeClientConnection**

*PipeName*
: *required* The leaf name of the pipe to dial --- the package prepends `\\.\pipe\` itself. Raises run-time error 5 *"cannot start without specifying a pipe name"* if empty.

Lazy on first call: creates the completion port and starts [**NumThreadsIOCP**](#numthreadsiocp) worker threads. Returns immediately with a [**NamedPipeClientConnection**](NamedPipeClientConnection) in the not-yet-connected state. The actual `CreateFileW` runs asynchronously on an IOCP worker and fires [**Connected**](NamedPipeClientConnection#connected) on the returned object once the pipe is open.

Raises run-time error 5 *"unable to create an IOCP port"* if `CreateIoCompletionPort` fails on the first call.

### FindNamedPipes
{: .no_toc }

Enumerates the named pipes currently published on the local machine.

Syntax: *manager*.**FindNamedPipes** ( [ *Pattern* ] ) **As Collection**

*Pattern*
: *optional* A wildcard pattern matched against the leaf pipe name (no `\\.\pipe\` prefix; the package adds it). `*` matches any sequence of characters, `?` matches any single character. Default `"*"` --- return every pipe.

Returns a **Collection** of **String** values, each a leaf pipe name suitable to pass directly to [**Connect**](#connect). The underlying implementation calls `FindFirstFileW("\\.\pipe\<Pattern>")` --- the Win32 pipe namespace --- so only pipes hosted on the local machine are enumerated.

Named pipes can appear and disappear at any time as their server processes start and stop. The function returns a snapshot; it does not watch for subsequent changes. Dynamic UIs that list available servers typically refresh the list from a low-frequency [**Timer**](../VB/Timer/) --- see [Discovering pipes](.#discovering-pipes) on the package overview for the polling-loop pattern that preserves the user's current selection across refreshes.

### Example

```tb
Dim names As Collection = manager.FindNamedPipes("MyService_*")
Dim name As Variant
For Each name In names
    Debug.Print "found: " & name
Next
```

### Stop
{: .no_toc }

Cancels every outstanding I/O on every connection produced by this manager, posts the IOCP shutdown sentinel to each worker, waits for the threads to exit, closes every pipe handle, and frees the completion port. Idempotent: calling [**Stop**](#stop) on a manager that has not connected anything --- or has already been stopped --- is a no-op. Automatically invoked from `Class_Terminate`, so a manager going out of scope closes resources implicitly.

Syntax: *manager*.**Stop**

[**NamedPipeClientConnection**](NamedPipeClientConnection) objects produced by this manager remain valid as references after [**Stop**](#stop), but their underlying pipe handles are closed and they cannot perform I/O.

### New
{: .no_toc }

Constructs a **NamedPipeClientManager** in the not-yet-connected state.

Syntax: **New NamedPipeClientManager**

**New** creates a hidden `STATIC`-class message window and subclasses its `WndProc` with the manager's internal `MessageWindowProc`. This window is the marshalling endpoint used by the IOCP worker threads when [**FreeThreadingEvents**](#freethreadingevents) is **False** (the default): each IOCP completion calls `PostMessage` to the window, and the subclassed procedure raises the corresponding [**NamedPipeClientConnection**](NamedPipeClientConnection) event on the UI thread.

The window is created in the constructor because the marshalling infrastructure must be in place before any connection is opened. No IOCP threads are started at this point --- those are deferred to the first [**Connect**](#connect) call.

`Class_Terminate` reverses the construction: it calls [**Stop**](#stop) (which cancels all I/O and joins the worker threads), then restores the original `WndProc` and destroys the message window. Letting the manager go out of scope is therefore equivalent to calling [**Stop**](#stop) explicitly before releasing the reference.

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat, **AsyncClose** rule
- [Discovering pipes](.#discovering-pipes) -- the **Timer**-driven polling loop that powers dynamic pipe-listing UIs
- [NamedPipeClientConnection class](NamedPipeClientConnection) -- the per-connection object returned by [**Connect**](#connect)
- [NamedPipeServer class](NamedPipeServer) -- the server-side counterpart
