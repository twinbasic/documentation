---
title: NamedPipeClientConnection
parent: WinNamedPipesLib Package
permalink: /tB/Packages/WinNamedPipesLib/NamedPipeClientConnection
has_toc: false
---

# NamedPipeClientConnection class
{: .no_toc }

One client-side connection to a named pipe. Produced by [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect). Carries the connection-lifecycle events ([**Connected**](#connected), [**Disconnected**](#disconnected)) and the message events ([**MessageReceived**](#messagereceived), [**MessageSent**](#messagesent)), plus the [**AsyncRead**](#asyncread) / [**AsyncWrite**](#asyncwrite) / [**AsyncClose**](#asyncclose) methods that trigger them.

The class is tagged `[COMCreatable(False)]` and its constructor takes a package-private interface --- reach instances only through [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect).

> [!IMPORTANT]
> The package `_README.txt` states: *"you MUST call **AsyncClose** on the client side, otherwise the connection is left alive when the object goes out of scope"*. Either call [**AsyncClose**](#asyncclose) explicitly before dropping the last reference, **or** let the object terminate cleanly through its `Class_Terminate` (which calls [**AsyncClose**](#asyncclose) automatically). Holding the reference forever --- in a module-level **Collection**, for example --- without calling [**AsyncClose**](#asyncclose) keeps the pipe handle open and the IOCP thread alive.

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
{: #customdata .no_toc }

A per-connection opaque slot the consumer can use to attach arbitrary state to this connection object.

Syntax: *connection*.**CustomData** [ **=** *value* ]

*value*
: Any **Variant**-compatible value to store with this connection. Default **Empty**.

The package never reads or writes **CustomData**. It exists solely as a convenience field so consumer code does not need a separate dictionary or parallel array to correlate a `NamedPipeClientConnection` reference with application-level state.

Typical uses include a session object, a pending-replies dictionary, a display name, or any other per-connection value the application needs to retrieve when a [**MessageReceived**](#messagereceived) or [**Disconnected**](#disconnected) event fires.

#### Example

This example attaches a user-defined session object to a connection when it connects, then retrieves it inside the message-received handler.

```tb
Private manager As NamedPipeClientManager
Private WithEvents connection As NamedPipeClientConnection

Private Sub OpenConnection(ByVal pipeName As String, ByVal session As ClientSession)
    Set manager = New NamedPipeClientManager
    Set connection = manager.Connect(pipeName)
    Set connection.CustomData = session     ' attach session state to this connection
End Sub

Private Sub connection_MessageReceived(ByRef Cookie As Variant, ByRef Data() As Byte)
    Dim session As ClientSession = connection.CustomData
    session.HandleReply Data
End Sub
```

### Handle
{: #handle .no_toc }

The underlying Win32 file handle returned by `CreateFileW("\\.\pipe\<PipeName>")`. **LongPtr**.

Syntax: *connection*.**Handle**

The value is **0** (`vbNullPtr`) before the asynchronous connection sequence completes and after [**AsyncClose**](#asyncclose) has been called. Once the [**Connected**](#connected) event has fired, **Handle** holds the file handle that the package uses for all subsequent `ReadFile` and `WriteFile` calls against this connection.

> [!WARNING]
> Do not call `CloseHandle` on this value directly. Use [**AsyncClose**](#asyncclose) instead, so the IOCP loop and the parent manager's bookkeeping stay consistent. Closing the handle outside the package leaves pending IOCP completions referencing freed memory.

Most consumers do not need this field. It is exposed for low-level diagnostics --- for example, passing the handle to `GetNamedPipeInfo` or other Win32 APIs to inspect pipe state.

### PipeName
{: #pipename .no_toc }

The leaf pipe name this connection was opened against. **String**.

Syntax: *connection*.**PipeName**

The value is set by the constructor from the *serverPipeName* argument supplied to [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect) and is not changed after that. The package uses it internally to compose the Win32 UNC path `\\.\pipe\<PipeName>` when calling `CreateFileW`.

Read the field to identify which server a given connection object is bound to --- useful when a single form or class manages several **NamedPipeClientConnection** instances against different pipe names.

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
: The opaque correlation value originally passed to the [**AsyncRead**](#asyncread) that produced this read --- or **Empty** if the read came from the auto-issued reads triggered by [**NamedPipeClientManager.ContinuouslyReadFromPipe**](NamedPipeClientManager#continuouslyreadfrompipe).

*Data*
: The message payload. See [Working with `Data() As Byte` in events](.#working-with-data-as-byte-in-events) on the package overview for the transient-buffer lifetime caveat --- copy the bytes out before the handler returns if they are needed later. The [recommended capture mechanism](.#propertybag-carrier) is to assign *Data* to a fresh [**PropertyBag**](../VBRUN/PropertyBag/)'s **Contents**, which deep-copies the bytes and provides typed multi-field access in one step.

### MessageSent
{: .no_toc }

Fires when a previously-issued [**AsyncWrite**](#asyncwrite) has completed.

Syntax: *connection*_**MessageSent**(**ByRef** *Cookie* **As Variant**)

*Cookie*
: The opaque correlation value that was passed to the originating [**AsyncWrite**](#asyncwrite) call.

## Methods

### AsyncClose
{: #asyncclose .no_toc }

Cancels every outstanding asynchronous I/O against this connection and closes the underlying pipe handle.

Syntax: *connection*.**AsyncClose**

Internally, **AsyncClose** calls `CancelIoEx` on the pipe handle to abort any pending reads or writes, then calls `CloseHandle` to release it. Once **AsyncClose** returns, no further I/O is possible on the connection. The [**Disconnected**](#disconnected) event fires asynchronously once every outstanding IOCP completion has been processed and the outstanding-request counter reaches zero.

**AsyncClose** is called automatically from `Class_Terminate` when the last reference to the connection object drops, so letting the variable go out of scope is sufficient when the connection is short-lived and no module-level reference is kept.

> [!IMPORTANT]
> If the connection object is stored in a long-lived container --- a module-level **Collection**, a class field, or a global variable --- `Class_Terminate` does not run until that container is also released. Call **AsyncClose** explicitly before dropping the last reference whenever the lifetime is not guaranteed to be short. Failure to do so keeps the underlying pipe handle open and the IOCP worker thread running.

### AsyncRead
{: .no_toc }

Manually issues an asynchronous read against this connection.

Syntax: *connection*.**AsyncRead** [ *Cookie* [, *OverlappedStruct* ] ]

*Cookie*
: *optional* A **Variant** correlation value, passed back as the *Cookie* parameter of the matching [**MessageReceived**](#messagereceived) event. Default **Empty**.

*OverlappedStruct*
: *optional* A **LongPtr** to a pre-allocated `OVERLAPPED_CUSTOM` structure. **Internal use only** --- the IOCP machinery passes this when re-issuing a read after `ERROR_MORE_DATA`. Consumer code should always omit this parameter.

Only needed when the parent manager's [**ContinuouslyReadFromPipe**](NamedPipeClientManager#continuouslyreadfrompipe) is **False**; otherwise the IOCP loop keeps a read pending automatically and explicit calls are redundant.

### AsyncWrite
{: .no_toc }

Sends a message to the server.

Syntax: *connection*.**AsyncWrite** *Data*() [**,** *Cookie* ]

*Data*
: *required* A **Byte()** array containing the bytes to send. An uninitialised or zero-length array is a no-op. For typed multi-field payloads the recommended encoding is [**PropertyBag**](../VBRUN/PropertyBag/) --- see [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) on the package overview.

*Cookie*
: *optional* A **Variant** correlation value, passed back as the *Cookie* parameter of the matching [**MessageSent**](#messagesent) event. Default **Empty**.

Returns immediately; the actual transmission runs through the IOCP loop. The completion fires [**MessageSent**](#messagesent) on this connection.

> [!WARNING]
> The bytes are copied into a per-completion buffer sized at [**NamedPipeClientManager.MessageBufferSize**](NamedPipeClientManager#messagebuffersize) (default **131072** bytes) without a bounds check. Passing an array longer than that value overruns the buffer. Raise **MessageBufferSize** above the largest expected message before the first [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect) call; the value is read once at that point and propagated to every per-connection buffer.

### Example

This example connects to a named pipe server, sends a request encoded as a [**PropertyBag**](../VBRUN/PropertyBag/), and prints the reply.

```tb
Private manager As NamedPipeClientManager
Private WithEvents connection As NamedPipeClientConnection

Private Sub Form_Load()
    Set manager = New NamedPipeClientManager
    Set connection = manager.Connect("MyService")
End Sub

Private Sub connection_Connected()
    Dim request As New PropertyBag
    request.WriteProperty "CommandID", "WHAT_TIME_IS_IT"
    connection.AsyncWrite request.Contents, cookie:=42
End Sub

Private Sub connection_MessageSent(ByRef Cookie As Variant)
    Debug.Print "request sent (cookie=" & Cookie & ")"
End Sub

Private Sub connection_MessageReceived(ByRef Cookie As Variant, ByRef Data() As Byte)
    Dim incoming As New PropertyBag
    incoming.Contents = Data        ' deep-copies bytes; safe past the handler
    Debug.Print "time: " & incoming.ReadProperty("ResponseData")
End Sub

Private Sub Form_Unload(Cancel As Integer)
    connection.AsyncClose
End Sub
```

### New
{: .no_toc }

Constructs a connection object in the not-yet-connected state and binds it to the parent manager's IOCP infrastructure.

Syntax: **New NamedPipeClientConnection**(*server*, *serverPipeName*, *serverCompletionPortHandle*, *serverMessageWindowHandle*)

> [!NOTE]
> The constructor signature is package-private. The first parameter type (`INamedPipeClientManagerInternal`) is an internal interface not accessible to consumer code. Do not construct `NamedPipeClientConnection` directly --- obtain instances from [**NamedPipeClientManager.Connect**](NamedPipeClientManager#connect).

*server*
: *required* An `INamedPipeClientManagerInternal` reference to the owning manager. The constructor reads [**MessageBufferSize**](NamedPipeClientManager#messagebuffersize), [**FreeThreadingEvents**](NamedPipeClientManager#freethreadingevents), and [**ContinuouslyReadFromPipe**](NamedPipeClientManager#continuouslyreadfrompipe) from this object, so the values are frozen at construction time.

*serverPipeName*
: *required* The leaf pipe name to open, stored as [**PipeName**](#pipename).

*serverCompletionPortHandle*
: *required* A **LongPtr** handle to the manager's I/O Completion Port, used when associating the pipe handle and posting I/O completions.

*serverMessageWindowHandle*
: *required* A **LongPtr** handle to the manager's hidden message-only window, used to marshal IOCP-thread events back to the UI thread when [**FreeThreadingEvents**](NamedPipeClientManager#freethreadingevents) is **False**.

## See Also

- [WinNamedPipesLib package](.) -- overview, IOCP / event-marshalling architecture, cookie pattern, `Data()` lifetime caveat, the **AsyncClose** rule
- [Recommended payload encoding: `PropertyBag`](.#propertybag-carrier) -- the deep-copy capture pattern for transient *Data* in events
- [NamedPipeClientManager class](NamedPipeClientManager) -- the manager that produced this connection
- [NamedPipeServerConnection class](NamedPipeServerConnection) -- the server-side counterpart
