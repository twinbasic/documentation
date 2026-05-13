---
title: NamedPipeClientConnection
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeClientConnection
has_toc: false
---

# NamedPipeClientConnection class
{: .no_toc }

One client-side connection to a named pipe. Produced by [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect). Carries the connection-lifecycle events ([**Connected**](#connected), [**Disconnected**](#disconnected)) and the message events ([**MessageReceived**](#messagereceived), [**MessageSent**](#messagesent)), plus the [**AsyncRead**](#asyncread) / [**AsyncWrite**](#asyncwrite) / [**AsyncClose**](#asyncclose) methods that drive them.

The class is tagged `[COMCreatable(False)]` and its constructor takes a package-private interface — reach instances only through [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect).

> [!IMPORTANT]
> The package `_README.txt` states: *"you MUST call **AsyncClose** on the client side, otherwise the connection is left alive when the object goes out of scope"*. Either call [**AsyncClose**](#asyncclose) explicitly before dropping the last reference, **or** let the object terminate cleanly through its `Class_Terminate` (which calls [**AsyncClose**](#asyncclose) automatically). Holding the reference forever — in a module-level **Collection**, for example — without calling [**AsyncClose**](#asyncclose) keeps the pipe handle open and the IOCP thread alive.

```tb
Private manager As NamedPipeClientManager
Private WithEvents connection As NamedPipeClientConnection

Private Sub Form_Load()
    Set manager = New NamedPipeClientManager
    Set connection = manager.Connect("MyService")
End Sub

Private Sub connection_Connected()
    connection.AsyncWrite StrConv("hello", vbFromUnicode)
End Sub

Private Sub connection_MessageReceived(ByRef Cookie As Variant, ByRef Data() As Byte)
    Debug.Print "reply: " & StrConv(Data, vbUnicode)
End Sub

Private Sub Form_Unload(Cancel As Integer)
    connection.AsyncClose
End Sub
```

See the package [overview](.) for the IOCP / event-marshalling architecture, the cookie correlation pattern, and the transient lifetime of `Data() As Byte` inside events.

* TOC
{:toc}

## Properties

### CustomData
{: .no_toc }

A per-connection opaque slot the consumer can attach state to — typically a session object or a pending-replies dictionary tied to this one connection. **Variant**, default **Empty**. The package never reads or writes this field.

### Handle
{: .no_toc }

The underlying Win32 file handle returned by `CreateFileW("\\.\pipe\<PipeName>")`. **LongPtr**. Exposed for low-level / debugging use — most consumers can ignore it. Do not call `CloseHandle` on this value yourself; use [**AsyncClose**](#asyncclose) so the IOCP loop and the parent manager's bookkeeping stay consistent.

### PipeName
{: .no_toc }

The leaf pipe name this connection was opened against — the same value that was passed to [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect). **String**. Read-only in practice; the package sets it from the constructor argument and never changes it.

## Events

### Connected
{: .no_toc }

Fires once the asynchronous `CreateFileW` started by [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect) has succeeded and the pipe is ready for message exchange.

Syntax: *connection*_**Connected**()

### Disconnected
{: .no_toc }

Fires once the pipe has dropped *and* every outstanding asynchronous I/O against the connection has returned. The connection object is no longer usable for I/O after this event.

Syntax: *connection*_**Disconnected**()

### MessageReceived
{: .no_toc }

Fires when a complete message has been read from the pipe.

Syntax: *connection*_**MessageReceived**(**ByRef** *Cookie* **As Variant**, **ByRef** *Data*() **As Byte**)

*Cookie*
: The opaque correlation value originally passed to the [**AsyncRead**](#asyncread) that produced this read — or **Empty** if the read came from the auto-issued reads driven by [**NamedPipeClientManager.ContinuouslyReadFromPipe**](NamedPipeClientManager#continuouslyreadfrompipe).

*Data*
: The message payload. See [Working with `Data() As Byte` in events](.#working-with-data-as-byte-in-events) on the package overview for the transient-buffer lifetime caveat — copy the bytes out before the handler returns if you need them.

### MessageSent
{: .no_toc }

Fires when a previously-issued [**AsyncWrite**](#asyncwrite) has completed.

Syntax: *connection*_**MessageSent**(**ByRef** *Cookie* **As Variant**)

*Cookie*
: The opaque correlation value that was passed to the originating [**AsyncWrite**](#asyncwrite) call.

## Methods

### AsyncClose
{: .no_toc }

Cancels every outstanding I/O against this connection and closes the underlying pipe handle. Eventually triggers the [**Disconnected**](#disconnected) event once the cancellation completes. Automatically invoked from `Class_Terminate` when the last reference to the connection drops.

Syntax: *connection*.**AsyncClose**

> [!IMPORTANT]
> See the class intro: the README requires that either this method runs (explicitly, or through `Class_Terminate`) before the connection is considered finished.

### AsyncRead
{: .no_toc }

Manually issues an asynchronous read against this connection.

Syntax: *connection*.**AsyncRead** [ *Cookie* [, *OverlappedStruct* ] ]

*Cookie*
: *optional* A **Variant** correlation value, surfaced as the *Cookie* parameter of the matching [**MessageReceived**](#messagereceived) event. Default **Empty**.

*OverlappedStruct*
: *optional* A **LongPtr** to a pre-allocated `OVERLAPPED_CUSTOM` structure. **Internal use only** — the IOCP machinery passes this when re-issuing a read after `ERROR_MORE_DATA`. Consumer code should always omit this parameter.

Only needed when the parent manager's [**ContinuouslyReadFromPipe**](NamedPipeClientManager#continuouslyreadfrompipe) is **False**; otherwise the IOCP loop keeps a read pending automatically and explicit calls are redundant.

### AsyncWrite
{: .no_toc }

Sends a message to the server.

Syntax: *connection*.**AsyncWrite** *Data*() [, *Cookie* ]

*Data*
: *required* A **Byte()** array carrying the bytes to send. An uninitialised or zero-length array is a no-op.

*Cookie*
: *optional* A **Variant** correlation value, surfaced as the *Cookie* parameter of the matching [**MessageSent**](#messagesent) event. Default **Empty**.

Returns immediately; the actual transmission runs through the IOCP loop. The completion fires [**MessageSent**](#messagesent) on this connection.

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat, the **AsyncClose** rule
- [NamedPipeClientManager class](NamedPipeClientManager) -- the manager that produced this connection
- [NamedPipeServerConnection class](NamedPipeServerConnection) -- the server-side counterpart
