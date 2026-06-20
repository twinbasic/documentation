# WinNamedPipesLib Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide. Sister packages: [WinServicesLib](WIP.WinServicesLib.md), [WinEventLogLib](WIP.WinEventLogLib.md).

An IOCP-based async pipe framework. Four user-facing classes — `NamedPipeServer` and `NamedPipeServerConnection` on the server side, `NamedPipeClientManager` and `NamedPipeClientConnection` on the client side. The Win32 API wrappers, the package-internal `OverlappedTypeConstants` enum, the IOCP helper module, and the four `INamedPipe*Internal` interfaces (each declared alongside its matching public class as a refcount / dispatch helper for the IOCP worker threads) are all plumbing and get no doc page.

The four classes are each tagged `[COMCreatable(False)]` — only the manager / server classes can be instantiated by user code (with `New`); the two `Connection` classes are constructed internally and handed back through events / return values.

Public user-facing surface (four classes — two on each side):

| Class                       | Role                                                                                                          |
|-----------------------------|---------------------------------------------------------------------------------------------------------------|
| `NamedPipeServer`           | The server. User-instantiated. Sets `PipeName`, calls `Start`, listens for events; one server hosts many clients. |
| `NamedPipeServerConnection` | One server-side per-client connection. Surfaced through `NamedPipeServer` events; carries `AsyncRead` / `AsyncWrite` / `AsyncClose`. |
| `NamedPipeClientManager`    | The client-side coordinator. User-instantiated. Owns the IOCP worker threads; the `Connect` method returns a `NamedPipeClientConnection`. |
| `NamedPipeClientConnection` | One client-side connection. Returned by `NamedPipeClientManager.Connect`; carries `Connected` / `Disconnected` / `MessageReceived` / `MessageSent` events and `AsyncRead` / `AsyncWrite` / `AsyncClose`. |

## `NamedPipeServer` public members

Tagged `[COMCreatable(False)]`, `[InterfaceId(...)]`, `[EventInterfaceId(...)]`, `[ClassId(...)]`. No `[Description("...")]` on the class itself.

**Public fields** (each carries a `[Description("...")]`):

- `PipeName As String` — *"the discoverable pipe name"*. Set this before `Start()` or `Start()` raises run-time error 5 (*"cannot start without specifying a pipe name"*). The Win32 pipe namespace path is `\\.\pipe\<PipeName>` (the package prepends `\\.\pipe\` itself).
- `NumThreadsIOCP As Long = 1` — *"the number of IOCP worker threads that will be created"*. Read once when `Start()` is called; the in-source `FIXME` notes that this should become read-only once started.
- `FreeThreadingEvents As Boolean = False` — *"set to TRUE to allow the server events ClientConnected / ClientReceivedDataAsync etc to be fired directly from the IOCP worker threads. set to FALSE to ensure the events get fired on the main UI thread."* The free-threaded path skips a Win32 message-loop round-trip; the marshalled path is safer because the events fire on the UI thread.
- `ContinuouslyReadFromPipe As Boolean = True` — *"set to TRUE to ensure ClientReceivedDataAsync events always fire without having to call AsyncRead manually."* When `False`, the consumer must call `AsyncRead` after each `ClientMessageReceived` to keep receiving.
- `MessageBufferSize As Long = 131072` — *"sets the initial size for ReadFile() buffers. does not affect the maximum message receive size, but can affect performance."* On `ERROR_MORE_DATA` the IOCP loop allocates a larger overflow buffer and re-issues the read, so messages larger than this size do work — but with one extra allocation per overflowed message.

**Public events**:

- `ServerReady()` — fires once after `Start()` when every IOCP worker has joined.
- `ClientConnected(Connection As NamedPipeServerConnection)` — a new client connection has completed.
- `ClientDisconnected(Connection As NamedPipeServerConnection)` — the connection has dropped and every outstanding async operation has returned.
- `ClientMessageReceived(Connection As NamedPipeServerConnection, ByRef Cookie As Variant, ByRef Data() As Byte)` — a message arrived. *Data* is a transient view over the IOCP read buffer (a hand-rolled `SAFEARRAY` whose backing memory is reused after the event); copy it if you need to keep it past the event handler.
- `ClientMessageSent(Connection As NamedPipeServerConnection, ByRef Cookie As Variant)` — a previously-issued `AsyncWrite` has completed.

**Public methods**:

- `Sub New()` — constructor; creates the hidden marshalling-window used for UI-thread event delivery.
- `Public Sub Start()` — creates the IOCP completion port and `NumThreadsIOCP` worker threads, then issues the first connection listener. Idempotent: calling `Start()` while already started is a no-op.
- `Public Sub Stop()` — cancels every outstanding I/O, joins the IOCP threads, closes pipe handles. Idempotent. Called automatically from `Class_Terminate`.
- `Sub AsyncBroadcast(ByRef Data() As Byte, Optional ByRef Cookie As Variant = Empty)` — issues `AsyncWrite` against every currently-connected `NamedPipeServerConnection`.
- `Public Sub ManualMessageLoopEnter()` / `Public Sub ManualMessageLoopLeave()` — drive a Win32 message loop manually (rare; only needed when the host process does not naturally pump messages — e.g. an unattended Windows service that wants the marshalled-event semantics rather than the free-threaded ones). `Leave` posts `WM_USER_QUITTING`, which `Enter` reads to break the loop.

## `NamedPipeServerConnection` public members

Tagged `[COMCreatable(False)]`. Not directly user-instantiable.

**Public fields**:

- `Handle As LongPtr` — the underlying Win32 pipe handle. Exposed but not normally needed; useful for low-level operations or debugging.
- `IsOpening As Boolean` — true while `Open()` is in progress (race-condition window between adding to the linked list and finishing `ConnectNamedPipe`).
- `IsConnected As Boolean` — true between the client connecting and the connection dropping.
- `CustomData As Variant` — *"free for use"*: opaque per-connection slot the consumer can attach state to.

**Public methods**:

- `Sub New(...)` — internal constructor; takes the parent server + pipe info. Never called by user code.
- `Public Sub AsyncClose()` — cancels outstanding I/O and closes the pipe handle. Called automatically from `Class_Terminate`.
- `Public Sub AsyncWrite(ByRef Data() As Byte, Optional ByRef Cookie As Variant = Empty)` — writes a message back to this specific client. Returns immediately; `NamedPipeServer.ClientMessageSent` fires when the write completes.
- `Public Sub AsyncRead(Optional ByRef Cookie As Variant = Empty, Optional OverlappedStruct As LongPtr)` — manually issues a read. Only needed when `NamedPipeServer.ContinuouslyReadFromPipe = False`; otherwise the server keeps the read pump fed automatically.

No public events — message-received and connection-dropped notifications come through the parent `NamedPipeServer`. The class declares an internal `INamedPipeServerConnectionInternal` interface that the IOCP loop uses for refcounting; that interface is `Private` and gets no doc page.

## `NamedPipeClientManager` public members

Tagged `[COMCreatable(False)]`, `[InterfaceId(...)]`, `[EventInterfaceId(...)]`, `[ClassId(...)]`.

**Public fields** (each carries `[Description("...")]`, mirror the server's):

- `NumThreadsIOCP As Long = 1`
- `MessageBufferSize As Long = 131072`
- `FreeThreadingEvents As Boolean = False`
- `ContinuouslyReadFromPipe As Boolean = True`

These four are read once on the first `Connect()` call and propagated to every `NamedPipeClientConnection` created through that manager; subsequent changes do not affect connections that already exist. Source comment in `NamedPipeClientConnection` confirms: *"tip: set it in NamedPipeClientConnections before Connect()"*.

**Public methods**:

- `Sub New()` — constructor; creates the hidden marshalling window.
- `Public Function Connect(ByVal PipeName As String) As NamedPipeClientConnection` — opens a connection to a server (`\\.\pipe\<PipeName>`). Lazy on first call: creates the IOCP port and the worker threads. Returns a connection object that fires `Connected` once the async `CreateFileW` completes.
- `Public Sub Stop()` — cancels every outstanding I/O on every managed connection, joins the IOCP threads, frees the resources. Idempotent. Called automatically from `Class_Terminate`.
- `Public Function FindNamedPipes(Optional Pattern As String = "*") As Collection` — enumerates the named pipes currently published on the local machine (via `FindFirstFileW("\\.\pipe\<Pattern>")`). Returns a `Collection` of `String`. Useful as a discovery helper before calling `Connect`.

No events on the manager itself — per-connection events live on the returned `NamedPipeClientConnection` objects.

## `NamedPipeClientConnection` public members

Tagged `[COMCreatable(False)]`, `[InterfaceId(...)]`, `[ClassId(...)]`, `[EventInterfaceId(...)]`. Not directly user-instantiable — `NamedPipeClientManager.Connect` returns it.

**Public fields**:

- `PipeName As String` — the pipe name the connection targets.
- `Handle As LongPtr` — the underlying Win32 file handle. Same caveats as on the server-side connection.
- `CustomData As Variant` — *"free for use"*.

**Public events**:

- `Connected()` — the async `CreateFileW` has succeeded.
- `Disconnected()` — the connection has dropped and every outstanding async operation has returned.
- `MessageReceived(ByRef Cookie As Variant, ByRef Data() As Byte)` — a message arrived. *Data* has the same transient-view semantics as on the server.
- `MessageSent(ByRef Cookie As Variant)` — a previously-issued `AsyncWrite` has completed.

**Public methods**:

- `Sub New(...)` — internal constructor; never called by user code directly.
- `Public Sub AsyncClose()` — **critical:** the README says *"you MUST call AsyncClose on the client side, otherwise the connection is left alive when the object goes out of scope"*. Surface this on every relevant page.
- `Public Sub AsyncWrite(ByRef Data() As Byte, Optional ByRef Cookie As Variant = Empty)` — sends a message to the server.
- `Public Sub AsyncRead(Optional ByRef Cookie As Variant = Empty, Optional OverlappedStruct As LongPtr)` — manually issues a read. Same gating as on the server-side: only call this when `ContinuouslyReadFromPipe = False`.

**Documented gaps / TODOs from `_README.txt`** (surface on the landing page):

- *"we need a method to allow closing a client connection from the server side"* — there is no `NamedPipeServerConnection.Disconnect` or `.Close` user-method today. The server can stop the whole pipe (`NamedPipeServer.Stop`) but cannot selectively drop one client.
- *"named pipe error should be raised via Error events (rather than throwing an error on the worker threads)"* — internal IOCP errors currently bubble up as VBA run-time errors on worker threads rather than as `Error` events. No `Error` event exists on any of the four classes yet.
- *"remove max size 131072 of messages"* — the `MessageBufferSize` initial-buffer default is 131072 bytes. The IOCP overflow path (`ERROR_MORE_DATA` → larger buffer → re-issue read) does handle larger messages, but there may be a hard cap somewhere the author wants to remove; surface this as *"see TODO list in `_README.txt`"* rather than making a stronger claim.
- *"currently a lot of duplicate code in server + client"* — internal-refactor note. **Not** surfaced on the docs.

**Cookie pattern.** Every `AsyncRead` and `AsyncWrite` accepts an optional *Cookie* (`Variant`). Whatever the consumer passes in flows through the IOCP completion buffer and is handed back out on the matching `MessageReceived` / `MessageSent` event. This is the package's mechanism for correlating individual writes with their completion notifications when many are in flight.

**`Data() As Byte` transience.** Inside `MessageReceived` / `ClientMessageReceived`, *Data* is **not** a real `Byte` array — it is a hand-rolled `SAFEARRAY` whose `pvData` field points at the IOCP overlapped buffer. The buffer is recycled back into a free-list at the end of the event handler. Copy the bytes out (`ReDim`-and-copy, or `CStrConv` for text payloads) if you need them after returning from the handler. The source uses `PutMemPtr(VarPtr(safeArrayPtr), VarPtr(safeArrayPsuedo))` and clears it afterwards — surface this lifetime caveat on every event-page entry that carries *Data*.

**Hidden message window.** Each `NamedPipeServer` and `NamedPipeClientManager` instance creates an invisible `STATIC`-class window with a subclassed `WndProc`, used to marshal IOCP-thread completions back to the UI thread when `FreeThreadingEvents = False`. Mention this on each class's intro paragraph — it explains why the consumer's process must be pumping a message loop for the default event-delivery semantics to work, and why `ManualMessageLoopEnter` / `ManualMessageLoopLeave` exist on `NamedPipeServer` for service / console hosts.

## Canonical service-host idiom — `ManualMessageLoopEnter` paired with `ChangeState`

`tbServiceTest2`'s `Sources\SERVICES\TBSERVICE001.twin` shows the standard pattern for a Windows service that hosts a `NamedPipeServer`. Surface this on the `NamedPipeServer.md` page (under a "Hosting inside a Windows service" sub-heading) and on the index landing:

```tb
' On the service thread (ITbService.EntryPoint):
Set NamedPipeServer = New NamedPipeServer
NamedPipeServer.PipeName = "WaynesPipe_" & CurrentComponentName
ServiceManager.ReportStatus(vbServiceStatusRunning)

NamedPipeServer.Start()
NamedPipeServer.ManualMessageLoopEnter()    ' blocks until ManualMessageLoopLeave
NamedPipeServer.Stop()

ServiceManager.ReportStatus(vbServiceStatusStopped)

' On the dispatcher thread (ITbService.ChangeState):
Select Case dwControl
    Case vbServiceControlStop, vbServiceControlShutdown
        ServiceManager.ReportStatus(vbServiceStatusStopPending)
        NamedPipeServer.ManualMessageLoopLeave()    ' wakes the service thread
End Select
```

Key facts that aren't obvious from the per-method `[Description]`s:

- The service-thread `EntryPoint` and the dispatcher-thread `ChangeState` are **different threads**. The `NamedPipeServer` member field is shared between them; the dispatcher-thread `ChangeState` calls `ManualMessageLoopLeave` on it to wake the service thread out of `ManualMessageLoopEnter`.
- `ManualMessageLoopLeave` is the **only** way to wake `ManualMessageLoopEnter` cleanly. There is no timeout, no second blocking primitive. If the service needs to react to other wake-up sources (paused state, custom control codes), it sets a shared flag *then* calls `ManualMessageLoopLeave` to break out, inspects the flag, and decides whether to re-enter the loop or proceed to shutdown. The `TBSERVICE002` variant in the same example demonstrates this with `IsPaused` / `IsStopping` shared `Public` fields and a `While IsStopping = False` outer loop.
- Pause / continue support uses the same pattern: `ChangeState` flips `IsPaused = True` and calls `ManualMessageLoopLeave`; the service thread sees the flag, reports `vbServiceStatusPaused`, enters a `Do While IsPaused : Sleep(500) : Loop`, then re-enters `ManualMessageLoopEnter` once `Continue` flips the flag back.
- `FreeThreadingEvents = False` (the default) is **required** for this pattern — events are marshalled to whichever thread is currently inside `ManualMessageLoopEnter`. Setting `FreeThreadingEvents = True` would deliver events on the IOCP worker thread instead and bypass the manual loop entirely (advanced; not the documented service idiom).

The non-service equivalent — hosting the same `NamedPipeServer` inside a Form — is in `Sources\FORMS\InProcessNamedPipeServerForm.twin`: the Form's regular message loop pumps the marshalling window automatically, so the Form just calls `Server.Start()` in `Form_Load` and `Server.Stop` in `Form_Unload` without ever touching `ManualMessageLoopEnter` / `Leave`. Cross-reference both patterns on the `NamedPipeServer.md` page so the reader sees the choice point.

## PropertyBag as the canonical message carrier

Every example serialises structured payloads through the pipe as a `PropertyBag.Contents` `Byte()`:

```tb
' Sender:
Dim propertyBag As New PropertyBag
propertyBag.WriteProperty("CommandID", "WHAT_TIME_IS_IT")
propertyBag.WriteProperty("Data", payload)
SelectedNamedPipe.AsyncWrite propertyBag.Contents

' Receiver (inside MessageReceived event):
Dim propertyBag As New PropertyBag
propertyBag.Contents = Data          ' deep-copies the bytes; safe past the event handler
Dim commandID As String = propertyBag.ReadProperty("CommandID")
…
```

Two reasons this pattern matters and should be surfaced on the docs:

1. **The transient-`Data()` problem is solved by `PropertyBag`.** Assigning to `PropertyBag.Contents` deep-copies the byte buffer; once the assignment returns, the original IOCP buffer can be recycled without invalidating the data. This is the cleanest answer to *"how do I keep the data past the event handler?"* — call out on every `MessageReceived` / `ClientMessageReceived` page entry as the recommended capture mechanism.
2. **`PropertyBag` provides typed multi-field payloads** without the consumer having to design a wire protocol. Both sides agree on the property names (`"CommandID"`, `"ResponseCommandID"`, `"ResponseData"`, `"Data"`) and `PropertyBag` handles the encoding / decoding. Cross-link [`PropertyBag` reference](docs/Reference/VBRUN/PropertyBag/index.md) from the index landing.

Surface as the **recommended** carrier; nothing in the package mandates it, raw `Byte()` works too, but every worked example uses `PropertyBag` and the integration story reads much more cleanly with it.

## Discovery loop — `FindNamedPipes`

`tbServiceTest2`'s `MainForm` shows the canonical client-side discovery pattern: a low-frequency `Timer` (the form uses `timerRefreshNamedPipes` with a multi-second interval) that calls `NamedPipeClients.FindNamedPipes("WaynesPipe_*")`, repopulates a `ListBox`, and preserves the user's current selection:

```tb
For Each namePipeName In NamePipeClients.FindNamedPipes("WaynesPipe_*")
    If namePipeName = NamedPipeSelected Then namedPipeSelectedIndex = Index
    lstNamedPipes.AddItem(namePipeName)
    Index += 1
Next
```

Surface on the `NamedPipeClientManager.md` page (under the `FindNamedPipes` entry) as the recommended polling loop — the underlying `FindFirstFileW("\\.\pipe\…")` call is cheap enough to invoke every few seconds without measurable cost, and pipes appear / disappear too quickly for any event-driven discovery to be reliable. Don't claim there's no faster API; just say *"polling is the documented approach"*.

## Service-side broadcast

`AsyncBroadcast` (on `NamedPipeServer`) accepts a `Byte()` payload and issues `AsyncWrite` against every currently-connected `NamedPipeServerConnection`. Useful when the server has multiple concurrent connections and wants to push an update to all of them; the alternative is iterating the connections manually.
