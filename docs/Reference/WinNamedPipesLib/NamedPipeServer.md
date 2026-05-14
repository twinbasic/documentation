---
title: NamedPipeServer
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeServer
has_toc: false
---

# NamedPipeServer class
{: .no_toc }

Hosts one named pipe and accepts an unbounded number of concurrent client connections, each represented by a [**NamedPipeServerConnection**](NamedPipeServerConnection). The class owns a Windows I/O Completion Port and a configurable pool of worker threads that handle every connection's reads, writes, and connect notifications. Instantiate with **New**.

Configure the public fields ([**PipeName**](#pipename) is required, the others have reasonable defaults), call [**Start**](#start), and respond to the lifecycle events as clients arrive and exchange messages. The package opens the underlying pipe as **PIPE_TYPE_MESSAGE** / **PIPE_READMODE_MESSAGE** — messages preserve their boundaries between sender and receiver.

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

When **True** (the default), the server keeps a read pending against every connected client at all times — every [**ClientMessageReceived**](#clientmessagereceived) is followed by an automatic `AsyncRead` issued from inside the IOCP thread. Set to **False** to handle reads one-at-a-time; each [**ClientMessageReceived**](#clientmessagereceived) handler must then call [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread) to receive the next message. **Boolean**, default **True**.

### FreeThreadingEvents
{: .no_toc }

Controls where the lifecycle and message events are raised. When **False** (the default), the IOCP worker threads marshal each event to the main UI thread through a hidden message-only window, and the consuming process must be pumping a Win32 message loop. When **True**, events fire directly on whichever IOCP worker thread received the completion — no message-loop dependency, but the consumer's event handlers must be thread-safe. **Boolean**, default **False**.

Set this before calling [**Start**](#start); it is read once when the worker threads are created and propagated to every [**NamedPipeServerConnection**](NamedPipeServerConnection).

### MessageBufferSize
{: .no_toc }

The size, in bytes, of the per-completion `ReadFile` buffer initially allocated for each connection. **Long**, default **131072** (128 KiB). Does not cap the maximum message size — on `ERROR_MORE_DATA` the IOCP loop allocates a larger overflow buffer and re-issues the read — but the initial size affects how often that overflow path runs, and so affects throughput for sustained large-message traffic.

### NumThreadsIOCP
{: .no_toc }

The number of IOCP worker threads created by [**Start**](#start). **Long**, default **1**. One thread is enough for most scenarios because every blocking call inside the worker is an overlapped Win32 operation that releases the thread immediately. Raise this to allow multiple [**ClientMessageReceived**](#clientmessagereceived) handlers to run concurrently under [**FreeThreadingEvents**](#freethreadingevents) = **True**, or to keep up with heavy traffic on multi-core hardware. Set this before calling [**Start**](#start).

### PipeName
{: .no_toc }

The name the pipe is published under. **String**, no default. The Win32 pipe namespace path is `\\.\pipe\<PipeName>` — the package prepends `\\.\pipe\` itself; pass just the leaf name.

> [!IMPORTANT]
> [**PipeName**](#pipename) must be set to a non-empty value before [**Start**](#start), or [**Start**](#start) raises run-time error 5 (*"cannot start without specifying a pipe name"*).

## Events

### ClientConnected
{: .no_toc }

Fires after a client's `ConnectNamedPipe` has completed and the connection is ready for message exchange.

Syntax: *server*_**ClientConnected**(*Connection* **As NamedPipeServerConnection**)

*Connection*
: The newly-connected client's server-side connection object. Hold the reference to keep per-client state across messages — the same instance is passed to every event for this client. **Cookie** / `Tag`-style storage is available through [**NamedPipeServerConnection.CustomData**](NamedPipeServerConnection#customdata).

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
: The opaque correlation value originally passed to the [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread) that produced this read — or **Empty** if the read came from the auto-issued reads triggered by [**ContinuouslyReadFromPipe**](#continuouslyreadfrompipe).

*Data*
: The message payload. See [Working with `Data() As Byte` in events](.#working-with-data-as-byte-in-events) on the package overview for the transient-buffer lifetime caveat — copy the bytes out before the handler returns if they are needed later. The [recommended capture mechanism](.#propertybag-carrier) is to assign *Data* to a fresh [**PropertyBag**](../VBRUN/PropertyBag/)'s **Contents**, which deep-copies the bytes and provides typed multi-field access in one step.

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

Fires once, after [**Start**](#start), when every IOCP worker thread has joined the completion-port loop and the first connection listener is published. Use this as the "the server is now accepting connections" signal.

Syntax: *server*_**ServerReady**()

## Methods

### AsyncBroadcast
{: .no_toc }

Issues an [**AsyncWrite**](NamedPipeServerConnection#asyncwrite) against every currently-connected client.

Syntax: *server*.**AsyncBroadcast** *Data*() [, *Cookie* ]

*Data*
: *required* The message bytes to send. twinBASIC will coerce a **String** literal to **Byte()** implicitly, so `server.AsyncBroadcast "shutting down"` works without a separate `StrConv` step — useful for protocol-less server-pushed notifications.

*Cookie*
: *optional* A **Variant** correlation value, attached to *each* per-client [**ClientMessageSent**](#clientmessagesent) event. Default **Empty**.

The set of recipients is snapshotted under a lock at the start of the call. Clients connecting after the snapshot do not receive this broadcast; clients disconnecting after the snapshot but before their per-client write completes simply fail that individual write silently.

### ManualMessageLoopEnter
{: .no_toc }

Runs a Win32 message loop on the calling thread until [**ManualMessageLoopLeave**](#manualmessageloopleave) is called from another thread (or any handler raises a `WM_USER_QUITTING` posting).

Syntax: *server*.**ManualMessageLoopEnter**

Intended for console / service hosts that do not have a Forms-style message pump of their own but want the default ([**FreeThreadingEvents**](#freethreadingevents) = **False**) marshalled-event semantics. UI hosts already pump messages naturally and do not need this method.

The canonical caller is a Windows service that owns this server: the service-thread entry-point opens the server, transitions the service to `Running`, calls **ManualMessageLoopEnter** to block while events flow, and a control-code handler running on the dispatcher thread calls [**ManualMessageLoopLeave**](#manualmessageloopleave) when the SCM signals stop. See [Hosting inside a Windows service](.#service-host-idiom) on the package overview for the complete pattern, including the two-thread coordination and the *Pause* / *Continue* extension.

### ManualMessageLoopLeave
{: .no_toc }

Posts a `WM_USER_QUITTING` message to the hidden marshalling window, causing the [**ManualMessageLoopEnter**](#manualmessageloopenter) loop on the other thread to exit. Safe to call from any thread.

Syntax: *server*.**ManualMessageLoopLeave**

The intended caller is a thread *other* than the one inside [**ManualMessageLoopEnter**](#manualmessageloopenter) — typically the Windows service's dispatcher thread waking the service-entry-point thread out of its blocked loop. See [Hosting inside a Windows service](.#service-host-idiom).

### Start
{: .no_toc }

Creates the I/O Completion Port, starts [**NumThreadsIOCP**](#numthreadsiocp) worker threads, and publishes the first connection listener under `\\.\pipe\<PipeName>`. Fires [**ServerReady**](#serverready) when every worker has joined.

Syntax: *server*.**Start**

Raises run-time error 5 *"cannot start without specifying a pipe name"* if [**PipeName**](#pipename) is empty, or *"unable to create an IOCP port"* if `CreateIoCompletionPort` fails.

Idempotent: calling [**Start**](#start) while the server is already running is a no-op.

### Stop
{: .no_toc }

Cancels every outstanding I/O on every connection, posts the IOCP shutdown sentinel to each worker, waits for the threads to exit, closes every pipe handle, and frees the completion port. Idempotent: calling [**Stop**](#stop) on a server that has not been started — or has already been stopped — is a no-op. Automatically invoked from `Class_Terminate`, so a server going out of scope closes resources implicitly.

Syntax: *server*.**Stop**

### New
{: .no_toc }

Constructs a server in the not-yet-started state. Creates the hidden `STATIC`-class message window used to marshal IOCP-thread completions back to the UI thread.

Syntax: **New NamedPipeServer**

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat, known limitations
- [Hosting inside a Windows service](.#service-host-idiom) -- the **ManualMessageLoopEnter** / **ManualMessageLoopLeave** service-entry-point pattern
- [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) -- the deep-copy capture pattern for transient *Data* in events
- [NamedPipeServerConnection class](NamedPipeServerConnection) -- the per-client connection passed to every event
- [NamedPipeClientManager class](NamedPipeClientManager) -- the client-side counterpart
