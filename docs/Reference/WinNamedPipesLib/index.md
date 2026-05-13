---
title: WinNamedPipesLib Package
parent: Packages
grand_parent: Reference Section
nav_order: 9
permalink: /tB/Packages/WinNamedPipesLib/
has_toc: false
---

# WinNamedPipesLib Package
{: .no_toc }

The **WinNamedPipesLib** built-in package exposes Windows named pipes as twinBASIC objects with an asynchronous, IOCP-driven I/O model. One process hosts a [**NamedPipeServer**](NamedPipeServer); other processes use a [**NamedPipeClientManager**](NamedPipeClientManager) to open one or more [**NamedPipeClientConnection**](NamedPipeClientConnection) instances to it. Writes complete in the background; messages and connection-lifecycle changes are delivered as events.

The package is a built-in package shipped with twinBASIC. Add it through Project → References (**Ctrl-T**) → Available Packages.

* TOC
{:toc}

## Architecture

Two halves, each one user-instantiated coordinator class plus one per-connection class:

| Side    | Coordinator                                            | Per-connection                                                 |
|---------|--------------------------------------------------------|----------------------------------------------------------------|
| Server  | [**NamedPipeServer**](NamedPipeServer)                 | [**NamedPipeServerConnection**](NamedPipeServerConnection)     |
| Client  | [**NamedPipeClientManager**](NamedPipeClientManager)   | [**NamedPipeClientConnection**](NamedPipeClientConnection)     |

The server publishes a name (`PipeName = "MyService"` → Win32 path `\\.\pipe\MyService`) and hands out a [**NamedPipeServerConnection**](NamedPipeServerConnection) for every client that connects. The client manager dials by the same name (with [**Connect**](NamedPipeClientManager#connect)) and gets back a [**NamedPipeClientConnection**](NamedPipeClientConnection). The two ends are symmetric thereafter — both expose `AsyncRead`, `AsyncWrite`, and `AsyncClose` with the same signatures.

Reads, writes, and connection completion all run through the same Windows I/O Completion Port (IOCP) infrastructure. Each coordinator class owns its own completion port, a configurable pool of worker threads ([**NumThreadsIOCP**](NamedPipeServer#numthreadsiocp)), and a hidden message-only window used to marshal events back to the UI thread.

## Event delivery — marshalled vs free-threaded

By default events fire on the main UI thread. The IOCP worker threads receive each completion, package the buffer, and `PostMessage` the result to a hidden `STATIC`-class window owned by the coordinator. The window's subclassed `WndProc` then raises the BASIC event from the message loop. This means the consuming process **must be pumping a Win32 message loop** for events to be delivered. Forms-based hosts already are; console hosts and Windows services are not, and need either [**NamedPipeServer.ManualMessageLoopEnter**](NamedPipeServer#manualmessageloopenter) (and the matching `ManualMessageLoopLeave`) or `FreeThreadingEvents = True`.

Setting [**FreeThreadingEvents**](NamedPipeServer#freethreadingevents) to **True** skips the marshalling round-trip and raises events directly from the IOCP worker thread. Performance is higher and there is no message-loop requirement, but the consumer's event handlers must be thread-safe — multiple `ClientMessageReceived` events from different clients can fire concurrently, and global / class state touched from the handler is **not** protected by the implicit UI-thread serialisation that the default mode gives.

The flag must be set before [**Start**](NamedPipeServer#start) (server side) or before the first [**Connect**](NamedPipeClientManager#connect) call (client side); it is read once and propagated to every per-connection object.

## Asynchronous reads

When [**ContinuouslyReadFromPipe**](NamedPipeServer#continuouslyreadfrompipe) is **True** (the default), the package keeps a read pending against every connection at all times — every [**ClientMessageReceived**](NamedPipeServer#clientmessagereceived) / [**MessageReceived**](NamedPipeClientConnection#messagereceived) event is followed by another `AsyncRead` issued from inside the IOCP thread. Set the flag to **False** to handle reads one-at-a-time: each event handler must then call [**NamedPipeServerConnection.AsyncRead**](NamedPipeServerConnection#asyncread) / [**NamedPipeClientConnection.AsyncRead**](NamedPipeClientConnection#asyncread) to receive the next message. This is useful for back-pressure when the consumer can't process messages as fast as they arrive.

## The cookie correlation pattern

Every [**AsyncRead**](NamedPipeServerConnection#asyncread) and [**AsyncWrite**](NamedPipeServerConnection#asyncwrite) accepts an optional *Cookie* of type **Variant**. Whatever value the caller passes in is round-tripped through the IOCP completion and re-emitted as the *Cookie* parameter of the matching [**ClientMessageReceived**](NamedPipeServer#clientmessagereceived) / [**ClientMessageSent**](NamedPipeServer#clientmessagesent) (or client-side [**MessageReceived**](NamedPipeClientConnection#messagereceived) / [**MessageSent**](NamedPipeClientConnection#messagesent)) event. Use this to correlate event callbacks with the calls that initiated them — a per-request sequence number, a callback object, a key into a pending-replies dictionary.

```tb
Private pending As New Collection

Private Sub SendRequest(text As String, replyHandler As IReplyHandler)
    Dim cookie As Long = NextCookie()
    pending.Add replyHandler, CStr(cookie)
    connection.AsyncWrite Encode(text), cookie
End Sub

Private Sub connection_MessageReceived(ByRef Cookie As Variant, ByRef Data() As Byte)
    Dim handler As IReplyHandler = pending(CStr(Cookie))
    pending.Remove CStr(Cookie)
    handler.HandleReply Decode(Data)
End Sub
```

## Working with `Data() As Byte` in events

The *Data* parameter on [**ClientMessageReceived**](NamedPipeServer#clientmessagereceived) and [**MessageReceived**](NamedPipeClientConnection#messagereceived) is **not** a normal heap-allocated **Byte** array. The package constructs a hand-rolled `SAFEARRAY` whose backing memory points at the IOCP read buffer, then clears the array pointer at the end of the event handler so the buffer can be recycled. The values are valid *only* while the handler is on the stack.

> [!IMPORTANT]
> Copy the bytes out before the event handler returns if you need them later. Storing the array reference in a module-level variable, a **Collection**, or a class field leaves a dangling pointer once the IOCP loop reuses the buffer for the next message.

For a fresh **Byte()** copy:

```tb
Dim Stored() As Byte
ReDim Stored(UBound(Data))
[_HiddenModule].vbaCopyBytes UBound(Data) + 1, VarPtr(Stored(0)), VarPtr(Data(0))
```

For a text payload, `StrConv(Data, vbUnicode)` (UTF-8) or `CStr` over a `vbUnicode`-converted copy reads the bytes immediately and produces an owned **String** in one step.

## Closing a client connection

> [!IMPORTANT]
> The **`_README.txt`** states: *"you MUST call **AsyncClose** on the client side, otherwise the connection is left alive when the object goes out of scope"*.

Either let the [**NamedPipeClientConnection**](NamedPipeClientConnection) object terminate cleanly through its `Class_Terminate` (which calls [**AsyncClose**](NamedPipeClientConnection#asyncclose) automatically) **or** call [**AsyncClose**](NamedPipeClientConnection#asyncclose) yourself before dropping the last reference. Holding a reference forever — for example in a long-lived module-level **Collection** — without calling [**AsyncClose**](NamedPipeClientConnection#asyncclose) keeps the underlying pipe handle open and the IOCP thread alive.

## Discovering pipes

[**NamedPipeClientManager.FindNamedPipes**](NamedPipeClientManager#findnamedpipes) enumerates the named pipes published on the local machine, returning a **Collection** of **String** names that match an optional `*`/`?` wildcard pattern. The implementation is `FindFirstFileW("\\.\pipe\<Pattern>")` — the package strips the leading namespace itself, so pass just the pipe name (`"MyService*"`, not `"\\.\pipe\MyService*"`).

## Known limitations

These are open TODOs documented in the package's `_README.txt`. They are user-visible — surface them when designing a protocol on top of the package:

- **No server-side disconnect of a single client.** [**NamedPipeServer.Stop**](NamedPipeServer#stop) tears down the whole pipe. There is no per-[**NamedPipeServerConnection**](NamedPipeServerConnection) `Close` method on the public surface yet, so a server cannot drop one misbehaving client while keeping the others connected.
- **No `Error` event on the IOCP worker thread.** Errors inside the IOCP loop currently surface as VBA run-time errors on whichever worker thread is running, not as a marshalled `Error` event on any of the four classes. Wrap I/O calls in **On Error Resume Next** where you need to keep the worker thread running on failure.
- **Message-size cap.** The author's TODO list flags *"remove max size 131072 of messages"*. [**MessageBufferSize**](NamedPipeServer#messagebuffersize) is the initial buffer size and the IOCP loop *does* grow it on `ERROR_MORE_DATA`, so messages larger than 128 KiB will work — but the TODO suggests there is a hard cap somewhere the author wants to remove. Treat very large messages as a roadmap item, not a guarantee.

## Classes

- [NamedPipeServer](NamedPipeServer) -- the server: publishes a pipe name, hosts an IOCP loop, raises events for the lifecycle of every accepted client
- [NamedPipeServerConnection](NamedPipeServerConnection) -- one server-side per-client connection; the **Connection** parameter of every `NamedPipeServer` event, with its own `AsyncRead` / `AsyncWrite` / `AsyncClose`
- [NamedPipeClientManager](NamedPipeClientManager) -- the client-side coordinator; owns the IOCP loop and the [**Connect**](NamedPipeClientManager#connect) / [**Stop**](NamedPipeClientManager#stop) / [**FindNamedPipes**](NamedPipeClientManager#findnamedpipes) methods
- [NamedPipeClientConnection](NamedPipeClientConnection) -- one client-side connection; carries the `Connected` / `Disconnected` / `MessageReceived` / `MessageSent` events and the matching `AsyncRead` / `AsyncWrite` / `AsyncClose` methods
