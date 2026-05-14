---
title: NamedPipeServerConnection
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeServerConnection
has_toc: false
---

# NamedPipeServerConnection class
{: .no_toc }

One server-side per-client connection. A [**NamedPipeServer**](NamedPipeServer) creates one of these for every client that connects, and passes it as the *Connection* parameter of every server event. Use it to send messages to that specific client, to manually issue reads when [**NamedPipeServer.ContinuouslyReadFromPipe**](NamedPipeServer#continuouslyreadfrompipe) is **False**, and to close the connection from the server side.

The class is tagged `[COMCreatable(False)]` and its constructor takes a package-private interface — reach instances only through [**NamedPipeServer**](NamedPipeServer) events. Connection-lifecycle and message events come through the parent [**NamedPipeServer**](NamedPipeServer); this class holds the per-connection data and methods only.

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
{: .no_toc }

A per-connection opaque slot the consumer can attach state to — typically a session object scoped to that one client. **Variant**, default **Empty**. The package never reads or writes this field; it is provided for convenience so that consumers do not have to maintain a parallel `Dictionary` keyed by [**Handle**](#handle).

### Handle
{: .no_toc }

The underlying Win32 named-pipe handle. **LongPtr**. Exposed for low-level / debugging use — most consumers can ignore it. Do not call `CloseHandle` on this value yourself; use [**AsyncClose**](#asyncclose) so the IOCP loop and the parent server's bookkeeping stay consistent.

### IsConnected
{: .no_toc }

**True** between the client connecting and the connection dropping. **Boolean**. Set internally; consumer code typically reads this rather than writes it. Becomes **False** as soon as the underlying pipe drops, even before the [**ClientDisconnected**](NamedPipeServer#clientdisconnected) event fires (the event waits until every outstanding I/O has returned).

### IsOpening
{: .no_toc }

**True** during the brief window between the package creating the connection object and `ConnectNamedPipe` completing. **Boolean**. Used internally by [**NamedPipeServer.Stop**](NamedPipeServer#stop) to avoid a race condition during shutdown; consumer code does not normally need to read it.

## Methods

### AsyncClose
{: .no_toc }

Cancels every outstanding I/O against this connection and closes the underlying pipe handle. Eventually triggers a [**ClientDisconnected**](NamedPipeServer#clientdisconnected) event on the parent server once the cancellation completes. Automatically invoked from `Class_Terminate` when the last reference to the connection drops.

Syntax: *connection*.**AsyncClose**

### AsyncRead
{: .no_toc }

Manually issues an asynchronous read against this connection.

Syntax: *connection*.**AsyncRead** [ *Cookie* [, *OverlappedStruct* ] ]

*Cookie*
: *optional* A **Variant** correlation value, passed back as the *Cookie* parameter of the matching [**ClientMessageReceived**](NamedPipeServer#clientmessagereceived) event. Default **Empty**.

*OverlappedStruct*
: *optional* A **LongPtr** to a pre-allocated `OVERLAPPED_CUSTOM` structure. **Internal use only** — the IOCP machinery passes this when re-issuing a read after `ERROR_MORE_DATA`. Consumer code should always omit this parameter.

Only needed when the parent server's [**ContinuouslyReadFromPipe**](NamedPipeServer#continuouslyreadfrompipe) is **False**; otherwise the IOCP loop keeps a read pending automatically and explicit calls are redundant.

### AsyncWrite
{: .no_toc }

Sends a message back to this specific client.

Syntax: *connection*.**AsyncWrite** *Data*() [, *Cookie* ]

*Data*
: *required* A **Byte()** array containing the bytes to send. An uninitialised or zero-length array is a no-op. For typed multi-field payloads the recommended encoding is [**PropertyBag**](../VBRUN/PropertyBag/) — see [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) on the package overview.

*Cookie*
: *optional* A **Variant** correlation value, passed back as the *Cookie* parameter of the matching [**ClientMessageSent**](NamedPipeServer#clientmessagesent) event. Default **Empty**.

Returns immediately; the actual transmission runs through the IOCP loop. The completion fires [**ClientMessageSent**](NamedPipeServer#clientmessagesent) on the parent server.

```tb
' Reply to a request using the PropertyBag convention:
Dim reply As New PropertyBag
reply.WriteProperty "ResponseCommandID", "WHAT_TIME_IS_IT"
reply.WriteProperty "ResponseData",      Time()
Connection.AsyncWrite reply.Contents
```

To send the same message to every connected client at once, use [**NamedPipeServer.AsyncBroadcast**](NamedPipeServer#asyncbroadcast).

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat
- [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) -- the deep-copy capture / typed-payload convention for messages
- [NamedPipeServer class](NamedPipeServer) -- the parent server that owns this connection
- [NamedPipeClientConnection class](NamedPipeClientConnection) -- the client-side counterpart
