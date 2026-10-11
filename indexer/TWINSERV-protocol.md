# TWINSERV Protocol Specification

Reverse-engineered from twinBASIC IDE Beta 983 (June 2026).

Source material: `ide/main.js`, `ide/toolWindow.js` (beautified copies in this
directory), plus direct API probing.

## Overview

TWINSERV is the online package repository operated by TWINBASIC LTD.  The IDE
communicates with it over HTTPS using a simple REST-style API.  All requests
go through `XMLHttpRequest` in the IDE's embedded WebView2 browser.

**Base URL:** `https://www.everythingaccess.com`

All endpoint paths are prefixed with `/twinbasic/packages/`.

**Content-Type quirk:** The server returns `text/html` for all responses,
regardless of whether the body is JSON, plain text, or binary.

## Authentication

Some endpoints accept an `auth` query parameter containing a session ID.  In
practice, all tested endpoints work with an empty `auth=` value for public data.
Private packages presumably require a valid session.

### Session lifecycle

1. Register via `/publisherCreate` or log in via `/publisherLogin`.
2. `/publisherLogin` returns a session ID as plain-text body.
3. Pass the session ID as `?auth={sessionID}` on subsequent requests.
4. The IDE stores the session in the JS variable `packagePublisherSessionID`.

### Credential storage

Publisher credentials are saved locally via `hostAppObject.SaveIDESetting("PUBLISHER", ...)`:

```json
{ "name": "username", "pass": "<obfuscated>" }
```

The password is "obfuscated" with a trivial XOR-like character rotation
(`ObfuscateString(password, 111)` / `UnobfuscateString(pass, 111)`).  This is
not encryption — it is a reversible transformation with a fixed key.

## Endpoints

### GET /twinbasic/packages/query

List all packages visible to the current session.

**Parameters:**

| Name   | In    | Required | Description |
|--------|-------|----------|-------------|
| `auth` | query | no       | Session ID.  Empty string returns public packages only. |

**Response (200):** JSON object.

```json
{
  "public": [
    {
      "publisher": "WaynePhillipsEA",
      "projectId": "{697A5CBF-2012-48BD-9D2F-3EA64CDE149A}",
      "versions": [
        {
          "symbol": "CustomControlsPackage",
          "description": "Custom controls for twinBASIC",
          "licence": "MIT",
          "hasLicenceFile": false,
          "hasChangelogFile": true,
          "hasReadmeFile": false,
          "versionMajor": 0,
          "versionMinor": 0,
          "versionRevision": 3,
          "versionBuild": 0,
          "publishedDate": "24-JAN-2022",
          "publishedTime": "09:30:44"
        }
      ]
    }
  ],
  "private": []
}
```

The `versions` array is ordered newest-first.  Each entry within a publisher
group shares the same `projectId` (a GUID) but may differ in `symbol` or
`description` across versions.

As of June 2026, 32 public packages are listed.

### GET /twinbasic/packages/download

Download a specific version of a package as a `.twinpack` binary.

**Parameters:**

| Name              | In    | Required | Description |
|-------------------|-------|----------|-------------|
| `auth`            | query | no       | Session ID. |
| `id`              | query | yes      | Package GUID, e.g. `{697A5CBF-...}`. |
| `versionMajor`    | query | yes      | Major version number. |
| `versionMinor`    | query | yes      | Minor version number. |
| `versionRevision` | query | yes      | Revision number. |
| `versionBuild`    | query | yes      | Build number. |

**Response (200):** Raw binary (a `.twinpack` file).  The IDE requests this
with `responseType = "arraybuffer"`.

The IDE then base64-encodes the binary and sends it to the compiler process
via the local WebSocket (`debugSocket.request("importPackage", { data64: ... })`).

### GET /twinbasic/packages/checkVersions

Check the latest available version for one or more packages.  The IDE calls
this at project load when `checkPackagesUpToDate` is enabled in IDE options.

**Parameters:**

| Name  | In    | Required | Description |
|-------|-------|----------|-------------|
| `ids` | query | yes      | Pipe-delimited list of package GUIDs, e.g. `{GUID1}\|{GUID2}`. |

**Response (200):** JSON array.

```json
[
  {
    "id": "{697A5CBF-2012-48BD-9D2F-3EA64CDE149A}",
    "versionMajor": "0",
    "versionMinor": "0",
    "versionRevision": "3",
    "versionBuild": "0",
    "publishedDate": "24-JAN-2022",
    "publishedTime": "09:30:44"
  }
]
```

Note: version fields are **strings** here (unlike `/query` where they are
numbers).  Only packages that exist in the database are returned — unknown IDs
are silently omitted.

### POST /twinbasic/packages/publish

Upload a `.twinpack` binary to the repository.

**Parameters:**

| Name   | In    | Required | Description |
|--------|-------|----------|-------------|
| `auth` | query | yes      | Session ID. |

**Request headers:**
- `Content-Type: application/octet-stream`
- `Content-Length: {byte length}`

**Request body:** Raw `.twinpack` binary.

The IDE generates this by asking the compiler: `debugSocket.request("generateTWINPACK")`,
which returns the binary as a base64-encoded string, then decodes it before POSTing.

**Response (200):** Success (body not used).

**Error codes:** See table below.

### GET /twinbasic/packages/publisherLogin

Authenticate as a package publisher.

**Parameters:**

| Name       | In    | Required | Description |
|------------|-------|----------|-------------|
| `id`       | query | yes      | Username. |
| `password` | query | yes      | Password (plaintext in URL). |

**Response (200):** Plain text session ID string.

### GET /twinbasic/packages/publisherCreate

Register a new publisher account.

**Parameters:**

| Name       | In    | Required | Description |
|------------|-------|----------|-------------|
| `id`       | query | yes      | Username (>= 4 characters). |
| `email`    | query | yes      | Email address (for recovery only). |
| `password` | query | yes      | Password (>= 8 characters, plaintext in URL). |

**Response (200):** Success (body not used).  The IDE then calls
`publisherLogin` to establish a session.

## Error Codes

The server uses custom HTTP status codes beyond the standard range:

| Code | Meaning |
|------|---------|
| 200  | Success |
| 551  | Package version already exists (duplicate publish) |
| 552  | Authentication required / session expired |
| 553  | Conflict: username already taken (registration), or package owned by another publisher (publish) |
| 555  | Incorrect password (login) |

## Other Endpoints

### POST https://twinbasic.com/notify

Crash/telemetry reporting, not part of the package protocol.  The IDE sends
JSON:

```json
{
  "product": "<version string>",
  "lstatus": "<licence status text>",
  "ts": "<timestamp>",
  "msg": "<message>",
  "cinfo": "<compiler info>"
}
```

## IDE ↔ Compiler Communication

The IDE communicates with the local compiler process over a WebSocket at
`ws://localhost:{port}/{id1}/{id2}`.  Package-related compiler commands
(sent via `debugSocket.request`):

| Command               | Payload                              | Purpose |
|-----------------------|--------------------------------------|---------|
| `generateTWINPACK`    | (none)                               | Generate `.twinpack` binary from current project. |
| `importPackage`       | `{ data64, overwrite? }`             | Import a base64-encoded `.twinpack` into the project. |
| `deletePackageById`   | `{ packageId }`                      | Remove an installed package by ID. |
| `deletePackage`       | `{ packagePath }`                    | Remove an installed package by path. |
| `exportPackage`       | `{ packageId, outPath }`             | Export a package to a file path. |
| `getTypeLibrariesInfo`| `{}`                                 | List installed type libraries and packages. |
