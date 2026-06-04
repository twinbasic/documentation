---
title: NamedPipeServer
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeServer
has_toc: false
---

# NamedPipeServer class
{: .no_toc }

Hosts one named pipe and accepts an unbounded number of concurrent client connections, each represented by a [**NamedPipeServerConnection**](NamedPipeServerConnection). The class owns a Windows I/O Completion Port and a configurable pool of worker threads that handle every connection's reads, writes, and connect notifications. Instantiate with **New**.

Configure the public fields ([**PipeName**](#pipename) is required, the others have reasonable defaults), call [**Start**](#start), and respond to the lifecycle events as clients arrive and exchange messages. The package opens the underlying pipe as **PIPE_TYPE_MESSAGE** / **PIPE_READMODE_MESSAGE** --- messages preserve their boundaries between sender and receiver.

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.Start
End Sub

Private Sub server_ClientConnected(Connection As NamedPipeServerConnection)
    Debug.Print "client " & Connection.Handle & " arrived"
End Sub

Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)
    Connection.AsyncWrite Data        ' echo it back
End Sub
```

See the package [overview](.) for the IOCP / event-marshalling architecture, the cookie correlation pattern, and the transient lifetime of `Data() As Byte` inside events.

* TOC
{:toc}

## Properties

### ContinuouslyReadFromPipe
{: .no_toc }

Controls whether the server automatically re-issues a read after every received message. **Boolean**, default **True**.

Syntax: *server*.**ContinuouslyReadFromPipe** [ **=** *value* ]

*value*
: A **Boolean**. **True** keeps a read pending against every connected client at all times: when [**ClientMessageReceived**](#clientmessagereceived) fires, the IOCP worker thread has already issued the next `AsyncRead` before the event is delivered. **False** disables the automatic re-issue; the consumer must call [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread) from inside [**ClientMessageReceived**](#clientmessagereceived) (or from [**ClientConnected**](#clientconnected) to prime the first read) to receive each message.

When **True**, the *Cookie* parameter of [**ClientMessageReceived**](#clientmessagereceived) is always **Empty** for auto-issued reads --- only explicit [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread) calls can attach a correlation value.

Set this before calling [**Start**](#start). The value is read during connection setup and propagated to every [**NamedPipeServerConnection**](NamedPipeServerConnection); changing it after [**Start**](#start) has no effect on already-connected clients.

**False** is useful for back-pressure when the consumer cannot process messages as fast as they arrive: no new read is queued until the handler explicitly calls [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread), which prevents the IOCP loop from queuing further messages ahead of the consumer.

#### Example

This example sets **ContinuouslyReadFromPipe** to **False** to process one message at a time, priming the first read from [**ClientConnected**](#clientconnected) and re-arming from [**ClientMessageReceived**](#clientmessagereceived).

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.ContinuouslyReadFromPipe = False   ' manual re-arm
    server.Start
End Sub

Private Sub server_ClientConnected(Connection As NamedPipeServerConnection)
    Connection.AsyncRead   ' prime the first read for this client
End Sub

Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)
    ProcessMessage Connection, Data
    Connection.AsyncRead   ' re-arm to receive the next message
End Sub
```

### FreeThreadingEvents
{: #freethreadingevents .no_toc }

Controls where the lifecycle and message events are raised. **Boolean**, default **False**.

Syntax: *server*.**FreeThreadingEvents** [ **=** *value* ]

*value*
: A **Boolean**. **False** (default) marshals events to the main UI thread through a hidden message-only window. **True** raises events directly on the IOCP worker thread that received the completion.

When **False**, the IOCP thread posts each completion result to a hidden `STATIC`-class window that the server creates in its constructor. The window's subclassed `WndProc` raises the corresponding BASIC event from the caller's message loop. The consuming process must be running a Win32 message loop --- a Forms host already does; a console host or Windows service does not, and must either call [**ManualMessageLoopEnter**](#manualmessageloopenter) (and the matching [**ManualMessageLoopLeave**](#manualmessageloopleave)) or set **FreeThreadingEvents** to **True**.

When **True**, each event fires directly on the IOCP worker thread that received the completion. There is no message-loop dependency, but multiple events can arrive concurrently --- for example, two [**ClientMessageReceived**](#clientmessagereceived) handlers from different clients can run simultaneously if [**NumThreadsIOCP**](#numthreadsiocp) is greater than one. Any shared state accessed from these handlers must be protected by the caller.

> [!IMPORTANT]
> **FreeThreadingEvents** must be set before [**Start**](#start). It is read once when the worker threads are created and propagated to every [**NamedPipeServerConnection**](NamedPipeServerConnection) at that point; changing the value after [**Start**](#start) has no effect on the running server.

> [!WARNING]
> Setting **FreeThreadingEvents** to **True** and calling [**ManualMessageLoopEnter**](#manualmessageloopenter) is not useful: in free-threaded mode events bypass the marshalling window entirely, so the manual message loop has nothing to dispatch. Pick one mode and stay with it for the lifetime of the server.

#### Example

This example sets **FreeThreadingEvents** to **True** to host the server in a console application without requiring a message loop.

```tb
Private WithEvents server As NamedPipeServer

Sub Main()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.FreeThreadingEvents = True   ' events fire on the IOCP worker thread
    server.Start

    ' No ManualMessageLoopEnter needed; block here however is appropriate.
    Sleep 10000
    server.Stop
End Sub

Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)
    ' This handler executes on the IOCP worker thread.
    ' Shared state accessed here requires external synchronisation.
    Connection.AsyncWrite Data
End Sub
```

### MessageBufferSize
{: #messagebuffersize }
{: .no_toc }

The size, in bytes, of the `ReadFile` buffer initially allocated for each I/O completion. **Long**, default **131072** (128 KiB).

Syntax: *server*.**MessageBufferSize** [ **=** *value* ]

*value*
: A **Long** specifying the buffer size in bytes. Must be set before [**Start**](#start); the value is read once at that point and propagated to every [**NamedPipeServerConnection**](NamedPipeServerConnection) buffer allocated by the IOCP loop.

This value does not cap the maximum receivable message size. When `ReadFile` returns `ERROR_MORE_DATA`, the IOCP loop allocates a larger overflow buffer and re-issues the read, so arbitrarily large incoming messages are handled correctly. The initial buffer size does affect how often that overflow path runs: a value smaller than the typical incoming message size incurs an extra allocation and read round-trip per message, reducing throughput under sustained large-message traffic.

> [!IMPORTANT]
> The send path does **not** grow dynamically. [**AsyncWrite**](NamedPipeServerConnection#asyncwrite) (and [**AsyncBroadcast**](#asyncbroadcast)) copies the caller's `Byte()` into a per-completion buffer of this size *without a bounds-check*. Sending a message larger than **MessageBufferSize** overwrites memory past the buffer --- a crash or heap corruption rather than a clean error. Set **MessageBufferSize** above the largest message the application will ever send before calling [**Start**](#start).

### NumThreadsIOCP
{: .no_toc }

The number of IOCP worker threads created by [**Start**](#start). **Long**, default **1**.

Syntax: *server*.**NumThreadsIOCP** [ **=** *value* ]

*value*
: A **Long** specifying the number of worker threads to create. Must be set before [**Start**](#start); the value is read once when [**Start**](#start) is called and cannot be changed while the server is running.

One thread is sufficient for most scenarios because every blocking operation inside the worker is an overlapped Win32 call (`GetQueuedCompletionStatus`) that yields the thread while it waits --- the thread is not consumed by I/O wait, only by the time spent inside event handler callbacks. Raise the count to allow multiple [**ClientMessageReceived**](#clientmessagereceived) handlers to run concurrently when [**FreeThreadingEvents**](#freethreadingevents) is **True**, or to increase throughput when many clients generate simultaneous completions on multi-core hardware.

> [!IMPORTANT]
> When [**FreeThreadingEvents**](#freethreadingevents) is **False** (the default), raising **NumThreadsIOCP** above **1** produces no throughput gain for event delivery, because all events are serialised through a single hidden window on the UI thread regardless of how many workers produce completions. Multiple threads are useful in that mode only if the IOCP workers themselves perform significant work before posting to the window.

#### Example

This example configures two worker threads for a server where [**FreeThreadingEvents**](#freethreadingevents) is **True**, allowing two [**ClientMessageReceived**](#clientmessagereceived) events from different clients to run concurrently.

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.NumThreadsIOCP = 2
    server.FreeThreadingEvents = True
    server.Start
End Sub
```

### PipeName
{: .no_toc }

The name the pipe is published under. **String**, no default.

Syntax: *server*.**PipeName** [ **=** *name* ]

*name*
: A **String** giving the leaf name for the pipe. The Win32 pipe namespace path is `\\.\pipe\<PipeName>` --- the package prepends `\\.\pipe\` itself; pass just the leaf name (for example, `"MyService"`).

> [!IMPORTANT]
> **PipeName** must be set to a non-empty value before [**Start**](#start), or [**Start**](#start) raises run-time error 5 (*"cannot start without specifying a pipe name"*).

The value is read at [**Start**](#start) time and passed to every `CreateNamedPipeW` call issued by the IOCP worker threads. Changing **PipeName** after [**Start**](#start) has no effect on the running server.

#### Example

This example creates a server that publishes under the name `"Greeter"`. The Win32 path a client connects to is `\\.\pipe\Greeter`.

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "Greeter"
    server.Start
End Sub

Private Sub server_ServerReady()
    Debug.Print "listening on \\.\pipe\" & server.PipeName
End Sub
```

## Events

### ClientConnected
{: .no_toc }

Fires after a client's `ConnectNamedPipe` has completed and the connection is ready for message exchange.

Syntax: *server*_**ClientConnected**(*Connection* **As NamedPipeServerConnection**)

*Connection*
: The newly-connected client's server-side connection object. Hold the reference to keep per-client state across messages --- the same instance is passed to every event for this client. Tag-style storage is available through [**NamedPipeServerConnection.CustomData**](NamedPipeServerConnection#customdata).

When [**ContinuouslyReadFromPipe**](#continuouslyreadfrompipe) is **False**, the first [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread) for this client must be issued from this handler to prime the read pump; if it is not called, no [**ClientMessageReceived**](#clientmessagereceived) event will fire for this client.

#### Example

This example records each newly-connected client in a module-level **Collection** keyed by its Win32 handle and reports the connection count. When [**ContinuouslyReadFromPipe**](#continuouslyreadfrompipe) is **False**, the first read is primed here.

```tb
Private WithEvents server As NamedPipeServer
Private clients As New Collection

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.Start
End Sub

Private Sub server_ClientConnected(Connection As NamedPipeServerConnection)
    clients.Add Connection, CStr(Connection.Handle)
    Debug.Print "connected: " & Connection.Handle & " (" & clients.Count & " total)"
End Sub

Private Sub server_ClientDisconnected(Connection As NamedPipeServerConnection)
    clients.Remove CStr(Connection.Handle)
    Debug.Print "disconnected: " & Connection.Handle & " (" & clients.Count & " remaining)"
End Sub
```

### ClientDisconnected
{: .no_toc }

Fires once the client has dropped *and* every outstanding asynchronous I/O against the connection has returned. The connection object is no longer usable for I/O after this event.

Syntax: *server*_**ClientDisconnected**(*Connection* **As NamedPipeServerConnection**)

*Connection*
: The connection that has just shut down. Its [**IsConnected**](NamedPipeServerConnection#isconnected) is **False**.

### ClientMessageReceived
{: .no_toc }

Fires when a complete message has been read from the pipe.

Syntax: *server*_**ClientMessageReceived**(*Connection* **As NamedPipeServerConnection**, **ByRef** *Cookie* **As Variant**, **ByRef** *Data*() **As Byte**)

*Connection*
: The connection the message came from.

*Cookie*
: The opaque correlation value originally passed to the [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread) that produced this read --- or **Empty** if the read came from the auto-issued reads triggered by [**ContinuouslyReadFromPipe**](#continuouslyreadfrompipe).

*Data*
: The message payload. See [Working with `Data() As Byte` in events](.#working-with-data-as-byte-in-events) on the package overview for the transient-buffer lifetime caveat --- copy the bytes out before the handler returns if they are needed later. The [recommended capture mechanism](.#propertybag-carrier) is to assign *Data* to a fresh [**PropertyBag**](../VBRUN/PropertyBag/)'s **Contents**, which deep-copies the bytes and provides typed multi-field access in one step.

### ClientMessageSent
{: .no_toc }

Fires when a previously-issued [**NamedPipeServerConnection.AsyncWrite**](NamedPipeServerConnection#asyncwrite) has completed (or when an [**AsyncBroadcast**](#asyncbroadcast) message reaches each individual client).

Syntax: *server*_**ClientMessageSent**(*Connection* **As NamedPipeServerConnection**, **ByRef** *Cookie* **As Variant**)

*Connection*
: The connection the write went out on.

*Cookie*
: The opaque correlation value that was passed to the originating [**AsyncWrite**](NamedPipeServerConnection#asyncwrite) call.

### ServerReady
{: .no_toc }

Fires once, after [**Start**](#start) returns, when every IOCP worker thread has joined the completion-port loop and the first connection listener has been published to `\\.\pipe\<PipeName>`. Use this as the signal that the server is now accepting connections.

Syntax: *server*_**ServerReady**()

The event fires on whichever thread delivers completions: on the main UI thread (marshalled through the hidden message-only window) when [**FreeThreadingEvents**](#freethreadingevents) is **False** (the default), or directly on the last IOCP worker thread to join when [**FreeThreadingEvents**](#freethreadingevents) is **True**. In both cases the event fires exactly once per [**Start**](#start) call.

The internal mechanism counts the number of outstanding worker-thread joins in a shared `OutstandingWorkerThreadJoins` counter. Each worker thread decrements the counter with an atomic operation when it enters the IOCP loop; whichever thread brings the count to zero raises **ServerReady**.

#### Example

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.Start
    ' ServerReady fires asynchronously -- do not assume the server
    ' is accepting connections before the event fires.
End Sub

Private Sub server_ServerReady()
    Debug.Print "server is ready on \\.\pipe\" & server.PipeName
End Sub
```

## Methods

### AsyncBroadcast
{: .no_toc }

Issues an [**AsyncWrite**](NamedPipeServerConnection#asyncwrite) against every currently-connected client.

Syntax: *server*.**AsyncBroadcast** *Data*() [, *Cookie* ]

*Data*
: *required* The message bytes to send. twinBASIC will coerce a **String** literal to **Byte()** implicitly, so `server.AsyncBroadcast "shutting down"` works without a separate `StrConv` step --- useful for protocol-less server-pushed notifications.

*Cookie*
: *optional* A **Variant** correlation value, attached to *each* per-client [**ClientMessageSent**](#clientmessagesent) event. Default **Empty**.

The set of recipients is snapshotted under a lock at the start of the call. Clients connecting after the snapshot do not receive this broadcast; clients disconnecting after the snapshot but before their per-client write completes simply fail that individual write silently.

### ManualMessageLoopEnter
{: .no_toc }

Runs a Win32 message loop on the calling thread until [**ManualMessageLoopLeave**](#manualmessageloopleave) is called from another thread.

Syntax: *server*.**ManualMessageLoopEnter**

Intended for console and service hosts that do not have a Forms-style message pump of their own but want the default ([**FreeThreadingEvents**](#freethreadingevents) = **False**) marshalled-event semantics. UI hosts already pump messages naturally and do not need this method.

The canonical caller is a Windows service that owns this server: the service-thread entry-point opens the server, transitions the service to `Running`, calls **ManualMessageLoopEnter** to block while events flow, and a control-code handler running on the dispatcher thread calls [**ManualMessageLoopLeave**](#manualmessageloopleave) when the SCM signals stop. See [Hosting inside a Windows service](.#service-host-idiom) on the package overview for the complete pattern, including the two-thread coordination and the *Pause* / *Continue* extension.

### ManualMessageLoopLeave
{: .no_toc }

Posts a `WM_USER_QUITTING` message to the hidden marshalling window, causing the [**ManualMessageLoopEnter**](#manualmessageloopenter) loop on the other thread to exit. Safe to call from any thread.

Syntax: *server*.**ManualMessageLoopLeave**

The intended caller is a thread *other* than the one inside [**ManualMessageLoopEnter**](#manualmessageloopenter) --- typically the Windows service's dispatcher thread waking the service-entry-point thread out of its blocked loop. See [Hosting inside a Windows service](.#service-host-idiom).

### Start
{: .no_toc }

Creates the I/O Completion Port, starts [**NumThreadsIOCP**](#numthreadsiocp) worker threads, and publishes the first connection listener under `\\.\pipe\<PipeName>`. Fires [**ServerReady**](#serverready) when every worker has joined the completion-port loop.

Syntax: *server*.**Start**

Raises run-time error 5 *"cannot start without specifying a pipe name"* if [**PipeName**](#pipename) is empty, or *"unable to create an IOCP port"* if `CreateIoCompletionPort` fails.

Idempotent: calling [**Start**](#start) while the server is already running is a no-op.

> [!IMPORTANT]
> Set all configuration properties ([**PipeName**](#pipename), [**NumThreadsIOCP**](#numthreadsiocp), [**FreeThreadingEvents**](#freethreadingevents), [**MessageBufferSize**](#messagebuffersize), [**ContinuouslyReadFromPipe**](#continuouslyreadfrompipe)) before calling [**Start**](#start). The worker threads read these values once at start-up and propagate them to every [**NamedPipeServerConnection**](NamedPipeServerConnection); changes after [**Start**](#start) has been called do not take effect.

#### Example

This example configures a server for free-threaded event delivery with a larger message buffer, then starts it and waits for the ready signal before advertising the service.

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.FreeThreadingEvents = True   ' events fire on IOCP worker threads
    server.MessageBufferSize = 524288   ' 512 KiB initial read buffer
    server.Start                        ' creates the IOCP port and worker threads
    ' server_ServerReady fires asynchronously once all workers have joined
End Sub

Private Sub server_ServerReady()
    Debug.Print "server is accepting connections on \\.\pipe\" & server.PipeName
End Sub
```

### Stop
{: .no_toc }

Shuts down the server: cancels every outstanding I/O on every connection, posts a shutdown sentinel to each IOCP worker thread, waits for all worker threads to exit, drains the hidden marshalling window's message queue, closes every pipe handle, and releases the completion port.

Syntax: *server*.**Stop**

The shutdown sequence proceeds in order to avoid lost events. First the connection list is locked in a "destroying" state so no new connections can be added. Connections still in `IsOpening` state (the brief window between object creation and `ConnectNamedPipe` returning) are waited on so that the cancel arrives after the pipe handle is fully open. Outstanding I/O on each connection is then cancelled. Once every IOCP worker thread has exited, the hidden marshalling window's message queue is drained so that any in-flight [**ClientDisconnected**](#clientdisconnected) events are delivered before the connection objects are freed. Finally the completion port handle is closed and the internal `HasStarted` flag is reset.

Idempotent: calling [**Stop**](#stop) on a server that has not been started, or one that has already been stopped, is a no-op. Automatically invoked from `Class_Terminate`, so a server going out of scope closes all resources implicitly.

> [!NOTE]
> The message-queue drain step runs only when [**FreeThreadingEvents**](#freethreadingevents) is **False** (the default). In that mode, the hidden window may hold queued `WM_USER_IOCP_EVENT_*` messages that have not yet been dispatched; **Stop** processes them synchronously to ensure [**ClientDisconnected**](#clientdisconnected) events are not lost. When [**FreeThreadingEvents**](#freethreadingevents) is **True**, events are raised directly on the IOCP thread as completions arrive, so no queued messages remain by the time the threads have exited.

### New
{: .no_toc }

Constructs a **NamedPipeServer** in the not-yet-started state.

Syntax: **New NamedPipeServer**

The constructor creates a hidden `STATIC`-class window and subclasses its window procedure. This window is the message target used to marshal IOCP-thread completions back to the UI thread when [**FreeThreadingEvents**](#freethreadingevents) is **False** (the default). No pipe, completion port, or worker thread is created at this point --- those are created by [**Start**](#start).

The public fields ([**PipeName**](#pipename), [**NumThreadsIOCP**](#numthreadsiocp), [**FreeThreadingEvents**](#freethreadingevents), [**ContinuouslyReadFromPipe**](#continuouslyreadfrompipe), [**MessageBufferSize**](#messagebuffersize)) carry their default values after construction and may be set freely before [**Start**](#start) is called.

`Class_Terminate` destroys the hidden window and calls [**Stop**](#stop) implicitly, so a server going out of scope without an explicit [**Stop**](#stop) call cleans up the underlying resources.

#### Example

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer   ' constructor runs here
    server.PipeName = "MyService"
    server.Start
End Sub
```

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat, known limitations
- [Hosting inside a Windows service](.#service-host-idiom) -- the **ManualMessageLoopEnter** / **ManualMessageLoopLeave** service-entry-point pattern
- [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) -- the deep-copy capture pattern for transient *Data* in events
- [NamedPipeServerConnection class](NamedPipeServerConnection) -- the per-client connection passed to every event
- [NamedPipeClientManager class](NamedPipeClientManager) -- the client-side counterpart
