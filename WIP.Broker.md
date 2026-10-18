# tbbroker --- private desktops, slots and ports for every tool

`tbbroker` is a small twinBASIC program that hands out what the tools need to start an IDE or a
program out of the user's sight --- a private desktop, a slot number to name things by, and a
port when one must be chosen in advance --- and takes each back when the processes using it end.
Every tool on the machine asks the same broker: the Node tools of every worktree, `tb-launch.ps1`
through them, and launcher-re's `tblaunch`. This file is the contract a client is written from,
then the reasons.

## Why there is one

**Desktops leak in DWM.** On Windows 10 22H2 (19045) every `CreateDesktop` leaves composition
objects in `dwm.exe` that are never freed after the desktop is gone (about two handles per
desktop), and DWM walks that state on every window change. The tools made one desktop per launch
(`tbbuild-<port>`, `rfo-<pid>`, `vb6run-<pid>`...), so two days of tests left DWM at 23,000
handles and 1 GB (a fresh DWM: about 2,000), and dragging a window took seconds; restarting DWM
cured it at once. Measured on BETA 1007, 2026-10-16:

| | DWM handles |
|---|---|
| 8 IDEs one after another, each from a new `tb-launch.ps1`, on **one desktop another process held** | 2082 → 2082 |
| releasing that desktop afterwards | +2, once |
| 8 IDEs, each on a **desktop of its own** (the old way) | +2 per launch, for good |

So a desktop is made once and held for as long as the broker runs, and handed from one launch to
the next.

**Ports collided.** Each tool picked fixed ports (9333, 9346, 9440, 9480, 9560, 9620, 9660,
9700, 9720, 9800, 9910...) and only some claimed them (`tb-ports.mjs`'s lock files, which nothing
outside those tools, launcher-re included, knows about). Worse, on the dev box the TCP dynamic
port range is 1024--65535 (the Windows default is 49152--65535; `netsh int ipv4 show dynamicport
tcp`), so every port Windows picks for anyone --- each compiler's six listening sockets, the page
server's, every loopback WebSocket the IDE page opens, any program's outgoing connection --- can
land on a tool's fixed port. No lock among the tools could prevent that.

The fix for ports is mostly not to choose them: **WebView2 given `--remote-debugging-port=0`**
(after the IDE's own `=<port>` argument; the last one wins) binds a port Windows picks and writes
it to `<user data folder>\EBWebView\DevToolsActivePort`, as `"48752\n/devtools/browser/<id>"`,
and attaching on that port works (BETA 1007, 2026-10-16). A broker port is for what must be
chosen before it is bound.

## Where it lives

| | |
|---|---|
| `scripts/broker/src/` | the program, an exported tree, laid out as `scripts/imagestrip/` is |
| `scripts/broker/tbbroker.twinproj` | packed from `src/`; pack it again after a change: `node scripts/impexp.mjs import scripts/broker/tbbroker.twinproj scripts/broker/src --overwrite` |
| `%LOCALAPPDATA%\tbbroker\tbbroker.exe` | the installed broker, where every client looks for it; `node scripts/tbbroker.mjs install` builds and puts it there |
| `%LOCALAPPDATA%\tbbroker\tbbroker.log` | its log: each connection, lease, hold, end and desktop state, cut over to `.log.1` at 1 MB |
| `scripts/lib/tb-broker.mjs` | the Node client |
| `test/broker.test.mjs` | its tests, skipped unless `TBBROKER_EXE` names a built broker |

It is a twinBASIC program because the owner chose so (2026-10-16): its most important clients
include `tblaunch`, a twinBASIC program, and it needs the Win32 calls (desktops, process handles,
overlapped pipes) that Node cannot make without a native addon. Its source carries nothing of
launcher-re's and nothing of the compiler's protocol, so it may live in this repository.

No gate builds it, as none builds `scripts/imagestrip/`: after a change to `src/`, pack it, run
`node scripts/tbbroker.mjs install` (which builds through `tbbuild`), and run the tests with
`TBBROKER_EXE` set to `%LOCALAPPDATA%\tbbroker\tbbroker.exe`. The build is the one IDE launch that
does not go through the broker, so building it never needs it.

## Running it

```
tbbroker [start] [options]   start the broker unless it runs already, and wait until it answers
tbbroker status [--pipe N]   print the broker's state as one line of JSON
tbbroker stop [--pipe N]     end the broker; its desktops go with it
tbbroker --serve [options]   be the broker (what start runs)

  --pipe <name>     the pipe (default \\.\pipe\tbbroker-<USERNAME>)
  --prefix <text>   the desktops' names, <text>1 to <text><max> (default tbpool-)
  --max <n>         the most slots, and so desktops (default 32, at most 256)
  --ports <a-b>     the ports a lease may ask for, or none (default 48000-48199)
  --log <file>      the log, or none (default %LOCALAPPDATA%\tbbroker\tbbroker.log)
```

Exit codes: 0 done (start: it runs; status: it answered; stop: it has stopped), 1 failed (could
not be started, or did not answer), 2 a mistake in the command line, 3 `--serve` only: another
broker already serves the pipe, 4 status and stop: no broker runs.

**It runs until logoff, or until it is stopped** (owner). There is no idle exit: each desktop of
the pool is made once per logon. `tbbroker stop` ends it, and every lease with it; a running
broker goes on running the exe it was started from after an install, until it is stopped.

`start` starts `tbbroker --serve` as a process of its own and exits once the pipe answers, so the
broker is out of the starter's process tree (`taskkill /T` on a client never reaches it). It is
created with `CREATE_BREAKAWAY_FROM_JOB`, so it leaves a job that allows that (Node's does:
libuv's job has `BREAKAWAY_OK`; checked: a broker started by a Node client outlives it); in a job
that does not, it lives as long as the job. Its working folder is its own, never a worktree.
The pipe is made with `FILE_FLAG_FIRST_PIPE_INSTANCE`, so of two brokers started at once one
serves and the other exits 3; `start` then reports the one that serves.

The broker is a Windows-subsystem program with no window, so nothing flashes when a GUI client
starts it; `status` and `stop` write to the caller's standard output, or attach to its console.
Do not start it elevated: its desktops and pipe would carry an elevated DACL.

## Concepts

- **Slot** --- a number from 1 to `--max`, unique among live leases. It is what a client names its
  own things by, in place of the port it used to: the IDE's temp folder and WebView2 profile, the
  ids of the projects it stages (`laneProjectId`). A slot is free again once its lease ends, and
  is then reused, so a client empties what it names by the slot before using it, as `launchIde`
  empties its folders now.
- **Desktop** --- slot *n* is always the desktop `<prefix>n` (`tbpool-3`), in the window station
  `WinSta0`. The broker makes it the first time a lease needs it and holds it open until it ends.
  A client starts its processes on it by name (`STARTUPINFO.lpDesktop`); `CreateDesktop` with an
  existing name opens that desktop, so `tb-launch.ps1` works unchanged when given the name.
- **Lease** --- a slot (with its desktop), and a port if one was asked for. It belongs to the
  connection that took it. **It ends when that connection has closed or released it, and every
  process held for it has ended.** The broker watches held processes by handle, so a reused pid
  cannot keep a lease alive.
- **Dirty** --- a desktop whose lease has ended while windows are still on it. It is not handed
  out until the windows have gone (checked four times a second). A broker that starts while a
  desktop of its pool still exists --- one that ended while something ran on it --- holds that
  desktop and treats it as dirty until it is empty, so it never hands out a desktop in use.
- **Port** --- the lowest port of `--ports` that no live lease has and that a bind on 127.0.0.1
  with `SO_EXCLUSIVEADDRUSE` accepts. It is checked when the lease is taken; nothing reserves it
  after that, so bind it soon. The default range, 48000--48199, is below Windows' default dynamic
  range, so on a machine left at the default Windows never picks those ports by itself. (The dev
  box's 50000--50059 is an *administered exclusion* --- a range reserved with `netsh int ipv4 add
  excludedportrange`, which Windows never picks but a program may bind --- set up by some
  installed program; the broker leaves it alone.)

## The protocol

**Transport.** The named pipe `\\.\pipe\tbbroker-<USERNAME>` (the user name from the
environment), in byte mode, local clients only. **Every message is one JSON object on one line**,
UTF-8, ended by a line feed (a CR before it is allowed). Each request gets exactly one reply, in
order, except a waiting lease (below), whose reply comes when a slot comes free; match replies by
`id`. A request longer than 64 KB closes the connection. A client that has not read a reply within
5 s is cut off.

**Requests** have `op`, and may have `id`, any JSON value, which the reply gives back exactly as
it was written. Other members are as each op says; unknown members are ignored.

**Replies** are `{"id":...,"ok":true,...}` or `{"id":...,"ok":false,"error":"<code>","message":"<text>"}`.
A request that is not a JSON object is answered `bad-request` without an id.

| op | members | reply members |
|---|---|---|
| `hello` | `client` (optional): a name for this connection in `status` | `protocol` (1), `version`, `pid` (the broker's), `client` (the caller's pid as the broker sees it) |
| `lease` | `port` (bool): a port as well; `tag` (string): what it is for, shown in `status` and the log; `wait` (bool): wait for a slot instead of failing `full` | `lease` (its id), `slot`, `desktop` (its name), `port` (0 when not asked for) |
| `hold` | `lease`, `pid` | none: the lease is now kept for as long as that process runs |
| `release` | `lease` | none: this connection no longer keeps it; it ends once its held processes have |
| `status` | | `broker` {pid, protocol, version, pipe, prefix, max, ports, started, log}, `connections` [{connection, pid, client}], `slots` [{slot, desktop, state: free, leased or dirty, lease, windows}] (only slots whose desktop exists), `leases` [{lease, slot, desktop, port, tag, client, connected, holds: [pid...], taken}], `waiting` (how many leases wait) |
| `stop` | | none; then the broker ends, and its desktops and leases with it |

Error codes:

| code | when |
|---|---|
| `bad-request` | not a JSON object, no `op`, or an op without the members it needs |
| `unknown-op` | an op the broker does not know |
| `full` | `lease` without `wait`, and every slot is leased or dirty |
| `no-port` | `lease` with `port`, and no port of the range is free, or the broker has none (`--ports none`) |
| `desktop` | `CreateDesktop` failed; the message has the error |
| `no-lease` | `hold` or `release` of a lease there is not (or no longer) |
| `not-yours` | `hold` or `release` of a lease another connection took, or one this connection has released |
| `no-process` | `hold` of a pid that cannot be opened or has ended |
| `too-long` | a request over 64 KB; the connection is closed after it |

**Waiting.** `lease` with `wait: true` and no free slot is queued behind earlier waiters and
answered when a slot comes free, first come, first served; a waiter whose connection closes is
dropped. A lease with `port` that finds no port fails `no-port` at once rather than waiting.

## Writing a client

1. **Connect once per process and keep the connection** for as long as the process may hold a
   lease: closing it ends every lease it has not handed to a held process. (`tb-broker.mjs` unrefs
   the socket while no request is in flight, so it never keeps Node alive by itself.)
2. **If the pipe cannot be opened** (it does not exist, or is busy), run `tbbroker.exe start`
   --- `TBBROKER_EXE`, else `%LOCALAPPDATA%\tbbroker\tbbroker.exe` --- wait for it to exit (0 means
   the broker answers), and connect again. Send `hello` and check `protocol` is 1.
3. **Before starting a program**: `lease` with a `tag` that says what it is (`"tbbuild 9333"`,
   `"lane help-2"`). Start the program on `desktop`, and name its folders and ids by `slot`.
4. **Hand the lease to the process that lives as long as the program**: `hold` the launcher's pid
   for a launch through `tb-launch.ps1` in a job (the launcher lives exactly as long as the job,
   and so the IDE); `hold` the program's own pid for one with no job (a `--keep` IDE), so that the
   lease outlives the tool that started it and ends when the IDE is closed.
5. **When done**, `release` the lease, or simply close the connection or end the process. The
   desktop is handed out again once the job has ended and its windows have gone.
6. **If the connection is lost** (the broker was stopped or failed), the leases it held are void.
   What runs on their desktops keeps them alive, and a new broker finds them dirty and waits for
   them to empty, so nothing it hands out is in use; but a slot may be reused while the old
   program still names folders by it. A client should treat a lost connection as the end of its
   run's leases (`Broker.onLost` in the Node client) and not start new programs under them.
7. **For the IDE's DevTools port**, do not lease one: start WebView2 with
   `--remote-debugging-port=0` after the port argument and read the port from
   `<WEBVIEW2_USER_DATA_FOLDER>\EBWebView\DevToolsActivePort` (first line) once it appears. Lease a
   port only for a server that must be told its port before it binds it.
8. **Never make a desktop outside the pool**, and never close one of its desktops with
   `CloseDesktop` on a handle the broker gave out --- it gives out names, not handles; a client's
   own handle from `OpenDesktop`/`CreateDesktop` is the client's to close.

The Node client, `scripts/lib/tb-broker.mjs`:

```js
import { connectBroker } from "./lib/tb-broker.mjs";
const broker = await connectBroker({ client: "tbbuild" });   // starts the broker if need be
const { lease, slot, desktop } = await broker.lease({ tag: `tbbuild ${project}` });
const run = await launchOnDesktop({ exe, desktop, ... });    // tb-launch.ps1 opens the desktop
await broker.hold(lease, run.launcher.pid);                  // the launcher lives as long as the job
// ... and at the end, broker.release(lease), or nothing: the lease ends with the launcher and
// this process's connection.
```

`connectBroker({pipe, client, start, exe, args})` resolves to a `Broker` with `lease({port, tag,
wait})`, `hold(lease, pid)`, `release(lease)`, `status()`, `stop()`, `close()`, `request(obj)`
and `onLost`; a refused request rejects with a `BrokerError` whose `code` is the error code.

## How it is built inside

- **One thread.** Every pipe instance is tied to one I/O completion port; the loop waits on it for
  a quarter of a second at a time and between packets looks at the held processes
  (`WaitForSingleObject(h, 0)`), the dirty desktops (`EnumDesktopWindows`) and the waiters. No
  thread of the twinBASIC runtime is involved (launcher-re found its thread safety undocumented),
  and there is no limit of 64 handles to wait on.
- **Reads** go to the completion port; **writes** go to an event (its handle with the low bit set
  keeps them off the port) and are waited for, 5 s at most.
- The OVERLAPPED structures and read buffers are `HeapAlloc`'d, so they never move while the
  system may write to them; a connection closed with a read outstanding is freed only when the
  cancelled read's packet arrives.
- The broker never attaches a thread to a desktop of its pool, so it never stops one from being
  freed, and never closes one while it runs.

## Tests

`test/broker.test.mjs` (14 tests, about 7 s, in `test.bat`) starts brokers on pipes and desktop
names of its own and checks: one broker per pipe, `start`/`status`/`stop` and their exit codes,
the client starting the broker; slots made once and handed out again, a lease ending with its
connection, a held process keeping it until it ends, release with a held process, the refusals,
`full` and waiting, ports skipping leased and listened-on ones; a desktop left with a window
(Notepad, through `launchOnDesktop`) staying dirty until the window goes; and a restarted broker
finding a desktop still in use and waiting for it. Run it with
`TBBROKER_EXE=%LOCALAPPDATA%\tbbroker\tbbroker.exe node --test test/broker.test.mjs`.

## How this repository's tools use it

Every tool here takes its desktops and slots through `scripts/lib/tb-ide.mjs`, which holds one
broker connection per process:

- **`leaseSlot({tag, port})`** returns `{slot, desktop, port, handTo(pid), release()}`; it waits
  while every slot is taken. `handTo` holds the lease for a process and lets go of the
  connection's claim, so the lease ends with that process.
- **`launchOnDesktop`** without a `desktop` leases a slot of its own and hands it to the launcher
  (or, with no job, to the program); its result's `desktop` is what `desktopWindows` and
  `captureWindow` take while the program runs. With a `desktop`, the caller's slot is used.
- **`launchIde`** with a caller's `slot` (a lane, a tool's run) uses its desktop and names the
  IDE's temp folder and WebView2 profile by its number (`tbbuild-tmp-<slot>`,
  `tbbuild-wv2-<slot>`); without one it leases its own and hands it on as `launchOnDesktop`
  does (to the IDE itself under `keep`). The DevTools port is 0 unless the caller gives one,
  and the result's `port` is read from `EBWebView\DevToolsActivePort`, accepted only when written
  since the launch.
- **Tools that name work folders** lease first and key them by the slot (`tbbuild`, `tbrun`,
  `probe_build_twice`, `try_help_addin`, `svgshot/probe`), or by their own pid when lanes come
  and go (`lane-runner`, `check_examples`, `shoot_docs`, `sweep_attributes`, `package_tests`,
  the package-test probes), removing the folders of runs whose process has ended.
- **The lane runners** lease a lane's slot as the lane starts and hand it to the lane's process
  (`TB_ADDIN_LANE` carries `slot` and `desktop`); a `Lane` made outside a runner leases its own on
  first use and releases it in `close()`.
- **A port chosen in advance** is a slot's `port`: the help add-in's detached window
  (`TB_DOCS_HELP_WINDOW_PORT`, in `help.test.mjs` and `shoot_docs`'s help setup). shoot_docs' web
  setup starts Chrome with port 0 too, and reads `DevToolsActivePort` from its profile.
- **`TB_BROKER=off`** does without the broker (a desktop of its own for each launch, named
  `tbnobroker-<pid>-<n>`), for `node scripts/tbbroker.mjs install`'s own build only.

`tblaunch`'s client is launcher-re's work (owner, 2026-10-16), from this file.
