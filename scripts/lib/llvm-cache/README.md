# llvm-cache

A lease on twinBASIC's LLVM cache server. A tool that builds with LLVM acquires a lease and releases
it; the library starts the server when none answers, so that a server never belongs to, and dies with,
one run's job while another run's compiler uses it.

```js
import { acquireLlvmCache } from "./llvm-cache.mjs";
const lease = await acquireLlvmCache({ install: "<twinBASIC install folder>", threads: 4 });
try {
  // any number of LLVM builds, from any process
} finally {
  await lease.release();
}
// lease: { pipe, serverPid, holderPid, started, release(), releaseSync() }   (releaseSync for a process.on("exit") handler)
```

Options: `threads` (the server's `--threads` when this call starts it, default 4), `ownInstallOnly`
(refuse a server of another install, with an Error whose `.code` is `"FOREIGN_SERVER"`; default
false), `log`, `startTimeoutMs`, `lockTimeoutMs`. Also exported: `registerClient`,
`listCacheServers`, `pipeNameFromInstall`, `pipeExists`, `isOwnServer`, `serverPipe`, `startLockName`,
`takeLock`.

Node built-ins only; Windows only. The install is always passed in, never searched for.

## The contract

Everything that starts or uses the server on this machine follows it: this library, and tblaunch's
`CacheServer.twin`.

- **The server** is `<install>\bin\twinBASIC_win64.exe --threads=<n> --keepalive=0 --cache=1`. It
  registers on a machine-wide pipe, `\\.\pipe\twinBASIC.LLVMCache.Registration.v<n>`, whose name is
  read from the install's `bin\twinBASIC_win64.dll` (else `_win32.dll`) as UTF-16 text, never written
  down. Every compiler on the machine uses whichever server holds that pipe.
- **Registering a client**: write 36 bytes to the pipe (two GUIDs and a pid, little endian) and read a
  4-byte reply, the server's pid.
- **What the server counts**: the registered *processes*, not the connections. Closing the
  connection does not end a client; the registered process ending does. With `--keepalive=0` the
  server ends about 15 s after its last registered process has ended; a server that never had a
  client never ends.
- **So a lease is a process**: `acquire` registers a holder process of the lease's own (an idle child
  that exits when its stdin closes), and `release()` ends it. A tool that is killed releases too.
- **Starting the server**: under a start lock that the kernel frees when its holder dies, so that two
  acquirers start one server: re-check the pipe, start the server, wait for the pipe, register.
  **The lock is a named pipe, `\\.\pipe\tbtools.llvm-cache.start-lock.v<n>`**, n the digits of the
  registration pipe's version (`v6` for BETA 1005 to 1010; `startLockName(pipe)` makes it). Whoever
  starts a server holds it, as the *first instance* of that pipe name (`CreateNamedPipeW` with
  `FILE_FLAG_FIRST_PIPE_INSTANCE`; Node's `net.createServer().listen(name)` does the same), for the
  whole of check, start and wait-for-the-pipe; a second creator is refused (`ERROR_ACCESS_DENIED` /
  `EADDRINUSE`) and retries every 100 ms for up to 60 s, then looks at the registration pipe again
  and registers if a server answers. Nobody connects to it. tblaunch's `CacheServer.twin` takes the
  same name in place of its mutex.
- **The start route**: the server is started detached and hidden, with no inherited handles, from a
  process whose job allows breakaway, never through a launcher that puts it in a job without
  breakaway (it would die with that job). Where the caller is in such a job, a start through
  `Win32_Process.Create` (WMI) survives it (tblaunch has it, r21a; this library does not yet).
- **One server per pipe name, and the pipe name defines the protocol**: any server on the install's
  pipe is used, whatever install it runs from (BETA 1005, 1007 and 1010 all use v6; 997 has v5, 995
  v3). Servers of different pipe versions run side by side. `ownInstallOnly` refuses a server of
  another install, for a caller that needs it.

## Open

- **A start from a Node process inside a job without breakaway** is not covered by this library:
  its checks start the server from Node, which is in no such job, and its `spawn` does not ask for
  `CREATE_BREAKAWAY_FROM_JOB`. tblaunch's `CacheServer.twin` has the route (r21a): in such a job it
  starts the server through `Win32_Process.Create` (WMI, late bound) and reports
  `cacheServer.route` `wmi` (`breakaway`, `plain` and `wmi-failed` are the others). A tool of this
  library that can run in such a job would take the same route (a CIM start in `startServer`).
- **tblaunch shares the start lock** (r21a): `CacheServer.twin` holds the same pipe name as the first
  instance (`CreateNamedPipeW`, 255 instances, `FILE_FLAG_FIRST_PIPE_INSTANCE`) through check, start,
  wait and its own registration (the anchor). A second creator gets `ERROR_ACCESS_DENIED` (5), which
  Node reports as `EADDRINUSE`; tblaunch treats `ERROR_PIPE_BUSY` the same way. It retries every
  100 ms for up to 60 s and gives up early when a server answers.
- **The thread count is unmeasured**: `--threads` 1 against 4 made no difference to two parallel
  builds of a tiny project (about 2.4 s either way). It wants a large LLVM build, not a start-up
  measurement.
- `phase2/cmp-corpus.mjs` has server code of its own; replacing it takes an
  `acquireLlvmCache` before its first build and a `release()` after its last, and deleting its
  start, wait and kill code.

## What is checked, and where

- **BETA 997, pipe v5**: `probe.mjs q1` to `q4` (no real build; ending the server by pid).
- **BETA 1010, pipe v6, real LLVM builds** (`phase2/llvm-cache-v6.mjs a|b|d|e|f`, logs
  `phase2/llvm-cache-v6-*.log`, in the launcher repository): the server counts the registered
  process, not the connection, and ends 15.1 s after the last one has ended (a connection closed
  with the process alive: still there at 25 s; the registered process ended with the connection
  open: ended after 15.06 s; a release: 15.17 s; a raw server whose only client was the compiler of
  one tblaunch LLVM build: ended 15.11 s after the build); with a lease held, tblaunch reports
  `cacheServer.state` `found` and one server is listed throughout, and a build with
  `--no-cache-server` starts none of its own; the compiler's registration ending does not end the
  server (alive 22 s after a build, lease held); the lock is free at once when its holder is killed
  by pid, and an acquirer waiting behind it started the server 70 ms later; a 1007 compiler
  (`tbrun --llvm --exe`) and a 1010 compiler (`tblaunch run --exe --llvm`) at once on one v6 server
  both built and ran an exe that exited 50; a server started by the library in the Node parent
  outlived the `launchOnDesktop` job of the tblaunch runs. Without a lease tblaunch's `Ensure`
  reports `started` with `inJob` true and `breakaway` false, and that server ends with tblaunch's
  job.

## Copies

This folder is meant to be copied, as it is, into other repositories (the twinBASIC documentation's
first). **A change is made here and copied over, never made in a copy.** A copy says which commit of
this folder it is.
