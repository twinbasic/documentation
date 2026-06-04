---
title: LogPath
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/LogPath
has_toc: false
---
# LogPath
{: .no_toc }

Returns the path to the log file or NT event-log source established by [**StartLogging**](StartLogging). Read-only.

Syntax: *object*.**LogPath**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**LogPath** reflects the *LogTarget* argument passed to the most recent call to **StartLogging**. Before **StartLogging** has been called, **LogPath** returns an empty string.

> [!NOTE]
>
> **LogPath** is not yet implemented in twinBASIC. Reading the property always returns an empty string regardless of whether **StartLogging** has been called.

### See Also

- [StartLogging](StartLogging) method
- [LogEvent](LogEvent) method
- [LogMode](LogMode) property
