---
title: TBMANLIB_RES Package
parent: Contributed Packages
has_toc: false
permalink: /tB/Packages/Contributed/TBMANLIB_RES/
indexed_from: 1.0.0.0
---

# TBMANLIB_RES Package

**Author:** woeoio. **Version:** 1.0.0.0

A twinBASIC package for loading binary resources embedded in a compiled executable and converting them to bytes, strings, hex, Base64, or pictures.

## Classes

- [cRes](cRes/) -- loads a binary resource from the compiled executable and converts it to bytes, a string, hex, Base64, or a picture.

## Modules

- [TBMAN](TBMAN) -- exposes a pre-instantiated `cRes` object as a public variable, providing package-wide access to resource loading without requiring a separate instance.

## Enumerations

- [Base64Prefix](Base64Prefix) -- specifies whether, and with what MIME type, a data URI prefix is prepended to the Base64 string returned by `ReturnBase64`.

## Methods (cRes)

- [Read](cRes/Read) -- loads a resource from the compiled executable into the `cRes` instance.
- [ReturnBase64](cRes/ReturnBase64) -- returns the resource bytes as a Base64-encoded string, with an optional MIME-type data-URI prefix.
- [ReturnBytes](cRes/ReturnBytes) -- returns the raw byte array loaded from the resource file.
- [ReturnHex](cRes/ReturnHex) -- returns the loaded resource bytes as an uppercase hex string, with an optional separator between each byte and an optional line-break interval.
- [ReturnPicture](cRes/ReturnPicture) -- returns the loaded resource bytes as an `IPictureDisp` object.
- [ReturnString](cRes/ReturnString) -- returns the loaded resource bytes as a `String`, with an optional character-set conversion.
