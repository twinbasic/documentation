---
title: ToolsHttpMimeType
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsHttpMimeType
has_toc: false
---

# ToolsHttpMimeType module
{: .no_toc }

Returns the media type (MIME type) for a file name. The module has one function, **MapMimeType**, with a built-in table of 99 file extensions. The code is taken from the *VbWebserver* project of Jason Peter Brown, which is published under the MIT licence (Copyright (c) 2017 Jason Peter Brown), and was changed by the author of TBMANLIB.

```tb check_build check_run
Debug.Print ToolsHttpMimeType.MapMimeType("report.pdf")
Debug.Print ToolsHttpMimeType.MapMimeType("C:\site\index.html")
Debug.Print ToolsHttpMimeType.MapMimeType("archive.tar.zip")
Debug.Print ToolsHttpMimeType.MapMimeType("notes.unknown")
' Output:
' application/pdf
' text/html
' application/zip
' application/octet-stream
```

* TOC
{:toc}

## Functions

### MapMimeType
{: .no_toc }

Returns the media type of a file name.

Syntax: **ToolsHttpMimeType.MapMimeType** ( *FilePath* ) **As String**

*FilePath*
: *required* A **String**, a file name or a path. The extension is the text after the last dot, so a name or a path with no dot is its own extension. The comparison respects letter case, and the table holds lower-case extensions: `report.PDF` is not found. A leading dot is fine, so `.html` and `html` give the same result.

Returns the media type of the extension in the table below. For an extension that is not in the table it returns `application/octet-stream`. An empty string raises error 9, *Subscript out of range*.

> [!NOTE]
> The extension `woff` is in the table with no media type, so it returns an empty string, not `application/x-font-woff`; `woff2` returns `application/x-font-woff`. The table also lacks `htm`, `mp3`, `ogg` and `wasm`, which return `application/octet-stream`, and `java` returns the text `text/x-java-source,java`.

| Extension | Media type |
|:----------|:-----------|
| `7z` | `application/x-7z-compressed` |
| `aac` | `audio/x-aac` |
| `avi` | `video/x-msvideo` |
| `bmp` | `image/bmp` |
| `css` | `text/css` |
| `csv` | `text/csv` |
| `doc` | `application/msword` |
| `docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `dwf` | `model/vnd.dwf` |
| `dwg` | `image/vnd.dwg` |
| `dxf` | `image/vnd.dxf` |
| `eml` | `message/rfc822` |
| `exe` | `application/x-msdownload` |
| `f4v` | `video/x-f4v` |
| `flv` | `video/x-flv` |
| `gif` | `image/gif` |
| `html` | `text/html` |
| `ico` | `image/x-icon` |
| `ics` | `text/calendar` |
| `jar` | `application/java-archive` |
| `java` | `text/x-java-source,java` |
| `jpeg` | `image/jpeg` |
| `jpg` | `image/jpeg` |
| `jpgv` | `video/jpeg` |
| `jpm` | `video/jpm` |
| `js` | `application/javascript` |
| `json` | `application/json` |
| `kml` | `application/vnd.google-earth.kml+xml` |
| `kmz` | `application/vnd.google-earth.kmz` |
| `m3u` | `audio/x-mpegurl` |
| `m3u8` | `application/vnd.apple.mpegurl` |
| `mdb` | `application/x-msaccess` |
| `mid` | `audio/midi` |
| `mov` | `video/quicktime` |
| `mp4` | `video/mp4` |
| `mp4a` | `audio/mp4` |
| `mpeg` | `video/mpeg` |
| `mpg` | `video/mpeg` |
| `mpga` | `audio/mpeg` |
| `mpp` | `application/vnd.ms-project` |
| `odb` | `application/vnd.oasis.opendocument.database` |
| `odc` | `application/vnd.oasis.opendocument.chart` |
| `odf` | `application/vnd.oasis.opendocument.formula` |
| `odft` | `application/vnd.oasis.opendocument.formula-template` |
| `odg` | `application/vnd.oasis.opendocument.graphics` |
| `odi` | `application/vnd.oasis.opendocument.image` |
| `odm` | `application/vnd.oasis.opendocument.text-master` |
| `odp` | `application/vnd.oasis.opendocument.presentation` |
| `ods` | `application/vnd.oasis.opendocument.spreadsheet` |
| `odt` | `application/vnd.oasis.opendocument.text` |
| `oga` | `audio/ogg` |
| `ogv` | `video/ogg` |
| `ogx` | `application/ogg` |
| `onetoc` | `application/onenote` |
| `otf` | `application/x-font-otf` |
| `pdf` | `application/pdf` |
| `png` | `image/png` |
| `ppsx` | `application/vnd.openxmlformats-officedocument.presentationml.slideshow` |
| `ppt` | `application/vnd.ms-powerpoint` |
| `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| `psd` | `image/vnd.adobe.photoshop` |
| `pub` | `application/x-mspublisher` |
| `qt` | `video/quicktime` |
| `ram` | `audio/x-pn-realaudio` |
| `rar` | `application/x-rar-compressed` |
| `rm` | `application/vnd.rn-realmedia` |
| `rss` | `application/rss+xml` |
| `svg` | `image/svg+xml` |
| `swf` | `application/x-shockwave-flash` |
| `tar` | `application/x-tar` |
| `tif` | `image/tiff` |
| `tiff` | `image/tiff` |
| `torrent` | `application/x-bittorrent` |
| `tsv` | `text/tab-separated-values` |
| `ttf` | `application/x-font-ttf` |
| `txt` | `text/plain` |
| `vbml` | `text/html` |
| `vcf` | `text/x-vcard` |
| `vcs` | `text/x-vcalendar` |
| `vsd` | `application/vnd.visio` |
| `vsdx` | `application/vnd.visio2013` |
| `wav` | `audio/x-wav` |
| `weba` | `audio/webm` |
| `webm` | `video/webm` |
| `webp` | `image/webp` |
| `wm` | `video/x-ms-wm` |
| `wma` | `audio/x-ms-wma` |
| `wmf` | `application/x-msmetafile` |
| `wmv` | `video/x-ms-wmv` |
| `woff` | (empty) |
| `woff2` | `application/x-font-woff` |
| `xhtml` | `application/xhtml+xml` |
| `xls` | `application/vnd.ms-excel` |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `xml` | `application/xml` |
| `xps` | `application/vnd.ms-xpsdocument` |
| `xslt` | `application/xslt+xml` |
| `xul` | `application/vnd.mozilla.xul+xml` |
| `zip` | `application/zip` |

## See Also

- [Consts](Consts) module -- the common media types as constants
- [ToolsHttp](ToolsHttp) module -- the content type enumeration
- [cHttpClient](cHttpClient) class -- sends the requests
- [TBMANLIB](.) package -- overview
