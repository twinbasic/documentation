---
title: Base64Prefix
parent: TBMANLIB_RES Package
permalink: /tB/Packages/Contributed/TBMANLIB_RES/Base64Prefix
has_toc: false
---
# Base64Prefix
{: .no_toc }

Specifies whether, and with what MIME type, a data URI prefix is prepended to the base64 string returned by [**ReturnBase64**](cRes/#returnbase64).

| Constant | Value | Description |
|----------|-------|-------------|
| **Base64Prefix_None**{: #Base64Prefix_None } | 0 | No prefix. The returned string is raw base64 with no leading data URI scheme. |
| **Base64Prefix_ImagePNG**{: #Base64Prefix_ImagePNG } | 1 | Prepends `data:image/png;base64,`. |
| **Base64Prefix_ImageJPEG**{: #Base64Prefix_ImageJPEG } | 2 | Prepends `data:image/jpeg;base64,`. |
| **Base64Prefix_ImageGIF**{: #Base64Prefix_ImageGIF } | 3 | Prepends `data:image/gif;base64,`. |
| **Base64Prefix_ImageBMP**{: #Base64Prefix_ImageBMP } | 4 | Prepends `data:image/bmp;base64,`. |
| **Base64Prefix_ImageICO**{: #Base64Prefix_ImageICO } | 5 | Prepends `data:image/x-icon;base64,`. |
| **Base64Prefix_ImageWebP**{: #Base64Prefix_ImageWebP } | 6 | Prepends `data:image/webp;base64,`. |
| **Base64Prefix_VideoMP4**{: #Base64Prefix_VideoMP4 } | 7 | Prepends `data:video/mp4;base64,`. |
| **Base64Prefix_VideoWebM**{: #Base64Prefix_VideoWebM } | 8 | Prepends `data:video/webm;base64,`. |
| **Base64Prefix_VideoOGG**{: #Base64Prefix_VideoOGG } | 9 | Prepends `data:video/ogg;base64,`. |
| **Base64Prefix_AudioMP3**{: #Base64Prefix_AudioMP3 } | 10 | Prepends `data:audio/mpeg;base64,`. |
| **Base64Prefix_AudioWAV**{: #Base64Prefix_AudioWAV } | 11 | Prepends `data:audio/wav;base64,`. |
| **Base64Prefix_AudioOGG**{: #Base64Prefix_AudioOGG } | 12 | Prepends `data:audio/ogg;base64,`. |

The default value used by **ReturnBase64** when *Prefix* is omitted is **Base64Prefix_None**.

### See Also

- [cRes](cRes/) class -- loads and converts embedded resources
