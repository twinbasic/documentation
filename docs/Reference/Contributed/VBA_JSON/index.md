---
title: VBA_JSON Package
parent: Contributed Packages
has_toc: false
indexed_from: 2.3.1.1
permalink: /tB/Packages/Contributed/VBA_JSON/
---

# VBA_JSON Package
{: .no_toc }

**Author:** Tim Hall, published on TWINSERV by WaynePhillipsEA. **On GitHub:** [VBA-tools/VBA-JSON](https://github.com/VBA-tools/VBA-JSON) and [VBA-tools/VBA-UTC](https://github.com/VBA-tools/VBA-UTC), the VBA libraries the package is made from.

The **VBA_JSON** contributed package provides JSON parsing and serialization for VBA and twinBASIC projects, along with UTC and ISO 8601 date-conversion utilities. The package exposes a **JsonConverter** standard module containing the primary **ParseJson** and **ConvertToJson** functions, and a **Dictionary** class used to represent JSON objects in memory.

## Classes

- [Dictionary](Dictionary/) -- a string-keyed collection that maps String keys to Variant values, returned by ParseJson for JSON objects
  - [Item](Dictionary/Item) -- returns or sets the value stored under a given key (default member)
  - [Keys](Dictionary/Keys) -- returns all keys stored in the dictionary as a Variant array

## Modules

- [JsonConverter](JsonConverter/) -- provides JSON parsing, JSON serialization, and UTC/ISO 8601 date conversion
  - [ConvertToIso](JsonConverter/ConvertToIso) -- converts a local date to an ISO 8601 date-time string in UTC
  - [ConvertToJson](JsonConverter/ConvertToJson) -- converts a VBA value to its JSON string representation
  - [ConvertToUtc](JsonConverter/ConvertToUtc) -- converts a local date to the equivalent UTC date using the system time zone
  - [ParseIso](JsonConverter/ParseIso) -- parses an ISO 8601 date/time string and returns the equivalent local Date value
  - [ParseJson](JsonConverter/ParseJson) -- parses a JSON string and returns a Dictionary or Collection object
  - [ParseUtc](JsonConverter/ParseUtc) -- converts a UTC date to the equivalent local date using the system time zone
