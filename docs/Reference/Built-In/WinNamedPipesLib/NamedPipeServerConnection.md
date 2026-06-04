---
title: NamedPipeServerConnection
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeServerConnection
has_toc: false
---

# NamedPipeServerConnection class
{: .no_toc }

One server-side per-client connection. A [**NamedPipeServer**](NamedPipeServer) creates one of these for every client that connects, and passes it as the *Connection* parameter of every server event. Use it to send messages to that specific client, to manually issue reads when [**NamedPipeServer.ContinuouslyReadFromPipe**](NamedPipeServer#continuouslyreadfrompipe) is **False**, and to close the connection from the server side.

The class is tagged `[COMCreatable(False)]` and its constructor takes a package-private interface --- reach instances only through [**NamedPipeServer**](NamedPipeServer) events. Connection-lifecycle and message events come through the parent [**NamedPipeServer**](NamedPipeServer); this class holds the per-connection data and methods only.

```tb
Private Sub server_ClientConnected(Connection As NamedPipeServerConnection)
    ' attach per-client state through the CustomData slot
    Connection.CustomData = New ClientSession
End Sub

Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)

    Dim session As ClientSession = Connection.CustomData
    session.HandleMessage Data
End Sub
```

See the package [overview](.) for the IOCP / event-marshalling architecture, the cookie correlation pattern, and the transient lifetime of `Data() As Byte` inside events.

* TOC
{:toc}

## Properties

### CustomData
{: #customdata }

A per-connection opaque slot for attaching consumer-defined state to a connection. **Variant**, default **Empty**.

Syntax: *connection*.**CustomData** [ **=** *value* ]

*value*
: A **Variant** value to store against this connection. Any **Variant**-compatible value is accepted: an object reference, a scalar, an array, or **Empty** to clear the slot.

The package never reads or writes this field. Its purpose is to avoid the need for a parallel dictionary keyed by [**Handle**](#handle): attach state directly to the connection object as soon as it is created in [**ClientConnected**](NamedPipeServer#clientconnected) and read it back from any subsequent event that receives the same *Connection* parameter.

#### Example

This example attaches a session object to each new connection and uses it to route incoming messages and clean up on disconnect.

```tb
Private Sub server_ClientConnected(Connection As NamedPipeServerConnection)
    Dim session As New ClientSession
    session.RemoteId = Connection.Handle
    Connection.CustomData = session
End Sub

Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)

    Dim session As ClientSession = Connection.CustomData
    session.HandleMessage Data
End Sub

Private Sub server_ClientDisconnected(Connection As NamedPipeServerConnection)
    Dim session As ClientSession = Connection.CustomData
    session.Cleanup
    Connection.CustomData = Empty
End Sub
```

### Handle
{: #handle .no_toc }

The underlying Win32 named-pipe handle returned by `CreateNamedPipeW`. **LongPtr**.

Syntax: *connection*.**Handle**

The value is **0** (`vbNullPtr`) before `ConnectNamedPipe` completes and after [**AsyncClose**](#asyncclose) has been called. Once the [**ClientConnected**](NamedPipeServer#clientconnected) event has fired on the parent server, **Handle** holds the pipe handle that the package uses for all subsequent `ReadFile` and `WriteFile` calls against this connection.

> [!WARNING]
> Do not call `CloseHandle` on this value directly. Use [**AsyncClose**](#asyncclose) instead, so the IOCP loop and the parent server's bookkeeping stay consistent. Closing the handle outside the package leaves pending IOCP completions referencing freed memory.

Most consumers do not need this field. It is exposed for low-level diagnostics --- for example, passing the handle to `GetNamedPipeInfo` or other Win32 APIs to inspect pipe state, or using it as a unique key to distinguish connections when a parallel dictionary is preferred over [**CustomData**](#customdata).

### IsConnected
{: #isconnected .no_toc }

**True** while the client is connected; **False** once the underlying pipe has dropped. **Boolean**.

Syntax: *connection*.**IsConnected**

The package sets **IsConnected** to **False** as soon as it detects a connection failure --- before the [**ClientDisconnected**](NamedPipeServer#clientdisconnected) event fires on the parent [**NamedPipeServer**](NamedPipeServer). The disconnect event is deferred until every outstanding asynchronous I/O against the connection has returned and the internal outstanding-request counter reaches zero; **IsConnected** transitions to **False** immediately when the error is detected, providing an earlier signal that the pipe has dropped.

Consumer code reads **IsConnected** to guard against writing to a connection that has already dropped. The package itself checks this field inside the request-completion path: when the outstanding-request counter reaches zero *and* **IsConnected** is **False**, the package removes the connection from the server's client list and fires [**ClientDisconnected**](NamedPipeServer#clientdisconnected).

> [!NOTE]
> **IsConnected** is a public **Boolean** field, not a property, so consumer code can assign to it. In practice, setting it from outside the package is not useful --- the field is reset to **False** only by the package's internal error-handling path, and writing **True** to it from consumer code has no effect on the underlying pipe state.

#### Example

This example checks **IsConnected** before sending a reply, guarding against the case where the client has dropped between the time the message arrived and the time the handler runs.

```tb
Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)

    If Not Connection.IsConnected Then Exit Sub   ' client has already dropped

    Dim reply As New PropertyBag
    reply.WriteProperty "ResponseData", "OK"
    Connection.AsyncWrite reply.Contents
End Sub
```

### IsOpening
{: #isopening .no_toc }

**True** during the brief window between the package creating the connection object and `ConnectNamedPipe` completing. **Boolean**. Read-only in practice.

Syntax: *connection*.**IsOpening**

**IsOpening** is set to **True** the moment [**NamedPipeServer**](NamedPipeServer) allocates a new `NamedPipeServerConnection` and issues the asynchronous `ConnectNamedPipe` call. It remains **True** until that call completes through the IOCP loop and the [**ClientConnected**](NamedPipeServer#clientconnected) event fires, at which point the package clears it and sets [**IsConnected**](#isconnected) to **True** instead.

The field is used internally by [**NamedPipeServer.Stop**](NamedPipeServer#stop) to detect connections that are mid-open during shutdown: any connection still opening at that point has its I/O cancelled via `CancelIoEx` so that the IOCP loop can drain cleanly without waiting indefinitely for a `ConnectNamedPipe` that will never complete.

Consumer code does not normally need to read **IsOpening**. The [**ClientConnected**](NamedPipeServer#clientconnected) event is the canonical signal that a connection is ready for use; **IsOpening** being **True** means the connection is not yet in that state.

## Methods

### AsyncClose
{: #asyncclose .no_toc }

Cancels every outstanding asynchronous I/O against this connection and closes the underlying pipe handle.

Syntax: *connection*.**AsyncClose**

Internally, **AsyncClose** calls `CancelIoEx` on the pipe handle to abort any pending reads or writes, then calls `CloseHandle` to release it. Once **AsyncClose** returns, no further I/O is possible on the connection. The [**ClientDisconnected**](NamedPipeServer#clientdisconnected) event fires on the parent [**NamedPipeServer**](NamedPipeServer) asynchronously once every outstanding IOCP completion has been processed and the outstanding-request counter reaches zero.

**AsyncClose** is called automatically from `Class_Terminate` when the last reference to the connection object drops, so letting the variable go out of scope is sufficient when the connection is short-lived and no module-level reference is held.

> [!IMPORTANT]
> If the connection object is stored in a long-lived container --- a module-level **Collection**, a class field, or a global variable --- `Class_Terminate` does not run until that container is also released. Call **AsyncClose** explicitly before dropping the last reference whenever the lifetime is not guaranteed to be short. Failure to do so keeps the underlying pipe handle open and the IOCP worker thread running.

#### Example

This example closes a specific client connection from the server side when a shutdown command is received.

```tb
Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)

    Dim incoming As New PropertyBag
    incoming.Contents = Data    ' deep-copies bytes; safe past the handler

    If incoming.ReadProperty("CommandID") = "SHUTDOWN" Then
        Connection.AsyncClose   ' cancel I/O and close the pipe handle
    End If
End Sub
```

### AsyncRead
{: .no_toc }

Issues an asynchronous read against this connection.

Syntax: *connection*.**AsyncRead** [ *Cookie* [**,** *OverlappedStruct* ] ]

*Cookie*
: *optional* A **Variant** correlation value. The value is round-tripped through the IOCP completion and re-emitted as the *Cookie* parameter of the matching [**ClientMessageReceived**](NamedPipeServer#clientmessagereceived) event on the parent server. Default **Empty**.

*OverlappedStruct*
: *optional* A **LongPtr** to a pre-allocated `OVERLAPPED_CUSTOM` structure. **Internal use only** --- the IOCP machinery passes this when re-issuing a read after `ERROR_MORE_DATA`. Consumer code must always omit this parameter.

**AsyncRead** issues a `ReadFile` call against the underlying pipe handle and returns immediately. When the read completes, the IOCP worker thread packages the received bytes and delivers them as the [**ClientMessageReceived**](NamedPipeServer#clientmessagereceived) event on the parent [**NamedPipeServer**](NamedPipeServer).

When [**NamedPipeServer.ContinuouslyReadFromPipe**](NamedPipeServer#continuouslyreadfrompipe) is **True** (the default), the package keeps a read pending against every connection automatically --- each [**ClientMessageReceived**](NamedPipeServer#clientmessagereceived) event is followed by another **AsyncRead** issued internally from within the IOCP worker thread. Calling **AsyncRead** explicitly in that mode is redundant and queues an extra read.

When [**ContinuouslyReadFromPipe**](NamedPipeServer#continuouslyreadfrompipe) is **False**, no read is issued automatically after an event. The event handler must call **AsyncRead** to receive the next message. This back-pressure mode is useful when the consumer cannot process messages as fast as they arrive.

> [!NOTE]
> **AsyncRead** can be called from multiple threads concurrently. The internal implementation allocates a separate `OVERLAPPED_CUSTOM` structure for every outstanding request; each call is independent of other pending reads on the same connection.

#### Example

This example shows the back-pressure pattern: [**ContinuouslyReadFromPipe**](NamedPipeServer#continuouslyreadfrompipe) is set to **False** and the event handler calls **AsyncRead** explicitly to receive the next message after processing the current one.

```tb
Private WithEvents server As NamedPipeServer

Private Sub Form_Load()
    Set server = New NamedPipeServer
    server.PipeName = "MyService"
    server.ContinuouslyReadFromPipe = False   ' manual read mode
    server.Start
End Sub

Private Sub server_ClientConnected(Connection As NamedPipeServerConnection)
    ' issue the first read for each new client
    Connection.AsyncRead
End Sub

Private Sub server_ClientMessageReceived( _
        Connection As NamedPipeServerConnection, _
        ByRef Cookie As Variant, _
        ByRef Data() As Byte)

    Dim incoming As New PropertyBag
    incoming.Contents = Data    ' deep-copies the bytes; safe to use past the handler

    ' process the message, then issue the next read
    ProcessCommand incoming
    Connection.AsyncRead
End Sub
```

### AsyncWrite
{: .no_toc }

Sends a message back to this specific client.

Syntax: *connection*.**AsyncWrite** *Data*() [**,** *Cookie* ]

*Data*
: *required* A **Byte()** array containing the bytes to send. An uninitialised or zero-length array is a no-op. For typed multi-field payloads the recommended encoding is [**PropertyBag**](../VBRUN/PropertyBag/) --- see [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) on the package overview.

*Cookie*
: *optional* A **Variant** correlation value, passed back as the *Cookie* parameter of the matching [**ClientMessageSent**](NamedPipeServer#clientmessagesent) event. Default **Empty**.

Returns immediately; the actual transmission runs through the IOCP loop. The completion fires [**ClientMessageSent**](NamedPipeServer#clientmessagesent) on the parent server.

> [!WARNING]
> The send path copies *Data* into a fixed-size per-completion buffer. A payload larger than [**NamedPipeServer.MessageBufferSize**](NamedPipeServer#messagebuffersize) (default **131072** bytes) overruns that buffer without a bounds check --- likely a crash or heap corruption rather than a clean error. Raise **MessageBufferSize** above the largest expected message before calling [**NamedPipeServer.Start**](NamedPipeServer#start); the value is read once at that point and propagated to every per-connection buffer.

```tb
' Reply to a request using the PropertyBag convention:
Dim reply As New PropertyBag
reply.WriteProperty "ResponseCommandID", "WHAT_TIME_IS_IT"
reply.WriteProperty "ResponseData",      Time()
Connection.AsyncWrite reply.Contents
```

To send the same message to every connected client at once, use [**NamedPipeServer.AsyncBroadcast**](NamedPipeServer#asyncbroadcast).

### New
{: .no_toc }

Constructs a connection object in the not-yet-connected state and binds it to the parent server's IOCP infrastructure.

Syntax: **New NamedPipeServerConnection**(*server*, *serverPipeName*, *serverCompletionPortHandle*, *serverMessageWindowHandle*)

> [!NOTE]
> The constructor signature is package-private. The first parameter type (`INamedPipeServerInternal`) is an internal interface not accessible to consumer code. Do not construct `NamedPipeServerConnection` directly --- obtain instances from [**NamedPipeServer**](NamedPipeServer) events.

*server*
: *required* An `INamedPipeServerInternal` reference to the owning server. The constructor reads [**MessageBufferSize**](NamedPipeServer#messagebuffersize) from this object at construction time, freezing that value for the lifetime of the connection.

*serverPipeName*
: *required* The leaf pipe name this connection belongs to. Stored internally and used when creating the Win32 pipe handle during the `ConnectNamedPipe` call.

*serverCompletionPortHandle*
: *required* A **LongPtr** handle to the server's I/O Completion Port, used when associating the pipe handle and posting I/O completions.

*serverMessageWindowHandle*
: *required* A **LongPtr** handle to the server's hidden message-only window, used to marshal IOCP-thread events back to the UI thread when [**FreeThreadingEvents**](NamedPipeServer#freethreadingevents) is **False**.

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat
- [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) -- the deep-copy capture / typed-payload convention for messages
- [NamedPipeServer class](NamedPipeServer) -- the parent server that owns this connection
- [NamedPipeClientConnection class](NamedPipeClientConnection) -- the client-side counterpart
