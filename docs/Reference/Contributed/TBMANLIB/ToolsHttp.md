---
title: ToolsHttp
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsHttp
has_toc: false
---

# ToolsHttp module
{: .no_toc }

The helpers of HTTP requests: two enumerations that name the request methods and the content types, URL encoding and decoding, and functions that write and read the `name=value` text of forms and headers. [**cHttpClient**](cHttpClient) uses the enumerations and four of the functions; a program can call all of them. The module has 8 constants, 2 enumerations and 13 procedures.

```tb check_build check_run
Dim Form As New Scripting.Dictionary

Form.Add "user", "ann"
Form.Add "city", "New York"
Debug.Print ToolsHttp.MakeContent(Form)
Debug.Print ToolsHttp.UrlEncode("New York/a&b")
Debug.Print ToolsHttp.MapMethodName(ReqPut)
' Output:
' user=ann&city=New York
' New%20York/a%26b
' PUT
```

* TOC
{:toc}

## Constants

<!-- test: SharedInstanceTests.Consts_HoldsTheMediaTypesAndHeaderNames -->
The eight constants repeat the ones in [**Consts**](Consts) under shorter names. All are **String**.
<!-- /test -->

### C_CONTENT_TYPE_FORM_MULTIPART
{: .no_toc }

`multipart/form-data`.

### C_CONTENT_TYPE_FORM_URLENCODED
{: .no_toc }

`application/x-www-form-urlencoded`.

### C_CONTENT_TYPE_JSON
{: .no_toc }

`application/json`.

### C_CONTENT_TYPE_STREAM
{: .no_toc }

`application/octet-stream`.

### C_CONTENT_TYPE_TEXT_HTML
{: .no_toc }

`text/html`.

### C_CONTENT_TYPE_TEXT_PLAIN
{: .no_toc }

`text/plain`.

### C_HEADER_FIELD_CONTENT_LENGHT
{: .no_toc }

The text `Content-Lenght`, a misspelling of `Content-Length`; see [Consts](Consts#tools_http_header_field_content_lenght).

### C_HEADER_FIELD_CONTENT_TYPE
{: .no_toc }

The text `Content-Type`.

## Enumerations

### EnumRequestContentType
{: .no_toc }

The content types that [**cHttpClient.SetRequestContentType**](cHttpClient#setrequestcontenttype) chooses between.

| Member | Value | Content type |
|:-------|:------|:-------------|
| `JsonString` | 1 | `application/json` |
| `FormEncode` | 2 | `application/x-www-form-urlencoded` |
| `FormMultiPart` | 3 | `multipart/form-data` |
| `TextPlain` | 4 | `text/plain` |
| `TextHtml` | 5 | `text/html` |

### EnumRequestMethod
{: .no_toc }

<!-- test: HttpToolsTests.MapMethod_MapMethodName_UseTheListOfMethodNames -->
The methods of a request, for [**cHttpClient.Fetch**](cHttpClient#fetch) and [**cHttpClient.Send**](cHttpClient#send). The value is the position of the name in the list `ANY`, `POST`, `GET`, `PUT`, `DELETE`, `OPTIONS` that [**MapMethod**](#mapmethod) and [**MapMethodName**](#mapmethodname) use.
<!-- /test -->

| Member | Value | Method |
|:-------|:------|:-------|
| `ReqPost` | 1 | `POST` |
| `ReqGet` | 2 | `GET` |
| `ReqPut` | 3 | `PUT` |
| `ReqDelete` | 4 | `DELETE` |
| `ReqOptions` | 5 | `OPTIONS` |

## Functions

### AddToQueryString
{: .no_toc }

Adds text to the query of a URL.

Syntax: **ToolsHttp.AddToQueryString** ( *Url* **,** *QS* ) **As String**

*Url*
: *required* A **String**, the address.

*QS*
: *required* A **String**, the text to add.

<!-- test: HttpToolsTests.AddToQueryString_PutsTheTextAfterTheNameVer -->
Returns *Url* followed by `?ver=` and *QS*, or by `&ver=` and *QS* when *Url* already has a `?`. The text `ver=` is always inserted, so *QS* is the value of a parameter named `ver`; see the warning at [**cHttpClient.RequestDataQuery**](cHttpClient#requestdataquery), which calls the function.
<!-- /test -->

```tb check_build check_run
Debug.Print ToolsHttp.AddToQueryString("http://host/p", "a=1")
Debug.Print ToolsHttp.AddToQueryString("http://host/p?x=1", "a=1")
' Output:
' http://host/p?ver=a=1
' http://host/p?x=1&ver=a=1
```

### MakeContent
{: .no_toc }

Writes a dictionary as form text.

Syntax: **ToolsHttp.MakeContent** ( *Dic* ) **As String**

*Dic*
: *required* A **Scripting.Dictionary**.

<!-- test: HttpToolsTests.MakeContent_JoinsPairsWithoutEncodingThem -->
Returns the keys and items as `key=value` pairs joined by `&`, in the order of the dictionary, or an empty string for an empty dictionary. Nothing is encoded. Compare [**ToolsDic.FromWwwFormUrlencoded**](ToolsDic#fromwwwformurlencoded), which does the reverse.
<!-- /test -->

### MapMethod
{: .no_toc }

Returns the number of a method name.

Syntax: **ToolsHttp.MapMethod** ( *Name* ) **As Long**

*Name* is a **String**. The result is its position in `ANY`, `POST`, `GET`, `PUT`, `DELETE`, `OPTIONS`, counted from 0, which is the value of the matching **EnumRequestMethod** member (and 0 for `ANY`). The comparison respects letter case: `GET` is 2, and `get` and a name that is not in the list, such as `PATCH`, are -1.

### MapMethodName
{: .no_toc }

Returns the name of a method number.

Syntax: **ToolsHttp.MapMethodName** ( *Index* ) **As String**

*Index* is a **Long**, a value of **EnumRequestMethod**, or 0 for `ANY`. A number above 5, or below 0, raises error 9.

### ParseContent
{: .no_toc }

Reads form text into a dictionary.

Syntax: **ToolsHttp.ParseContent** ( *Content* **,** *Obj* ) **As Boolean**

*Content*
: *required* A **String** of `name=value` pairs joined by `&`.

*Obj*
: *required* A **Scripting.Dictionary**. It receives the pairs; an earlier item of the same key is replaced and the other items stay.

<!-- test: HttpToolsTests.ParseContent_ReadsPairsIntoTheDictionary -->
Each pair is cut at its first `=` and both parts are trimmed. A pair without `=` gets an empty value, and a pair whose name is empty is skipped. The text is not decoded: `%20` stays as it is.
<!-- /test -->

<!-- test: HttpToolsTests.ParseContent_ReturnsTrueWhenThePairsAreRead -->
> [!WARNING] 1.0.0.29
> The function returns **False** always, whatever it did, because it never assigns its result. Read the dictionary instead.

```tb check_build check_run
Dim Form As New Scripting.Dictionary

ToolsHttp.ParseContent "a=1&b= two &c&=x&d=1=2", Form
Debug.Print Form.Count
Debug.Print Form.Item("b") & "|" & Form.Item("c") & "|" & Form.Item("d")
' Output:
' 4
' two||1
```

### ParseKeyValue
{: .no_toc }

Reads the headers of an answer into a dictionary.

Syntax: **ToolsHttp.ParseKeyValue** ( *Content* **,** *Obj* ) **As Boolean**

*Content*
: *required* A **String** of lines separated by `vbCrLf`, as WinHTTP returns the headers.

*Obj*
: *required* A **Scripting.Dictionary**. It receives one item per line.

<!-- test: HttpToolsTests.ParseKeyValue_ReadsHeaderLines -->
Each line is cut at its first colon and both parts are trimmed. A line without a colon becomes an item with the empty text, and an empty line (the last line of a header block is empty) becomes the item with the empty key. [**cHttpClient**](cHttpClient) calls the function to fill [**ResponseHeaders**](cHttpClient#responseheaders).
<!-- /test -->

<!-- test: HttpToolsTests.ParseKeyValue_ValueWithColons_IsKeptWhole, HttpToolsTests.ParseKeyValue_ReturnsTrueWhenTheLinesAreRead -->
> [!WARNING] 1.0.0.29
> The value of a line that has more colons is cut at its second one: `Date: Tue, 13 Oct 2026 18:00:00 GMT` is stored as `Tue, 13 Oct 2026 18`, and `Location: http://host/path` as `http`. Like [**ParseContent**](#parsecontent), the function returns **False** always.

```tb check_build check_run
Dim Head As New Scripting.Dictionary

ToolsHttp.ParseKeyValue "Host: example.com" & vbCrLf & "Date: Tue, 13 Oct 2026 18:00:00 GMT" & vbCrLf, Head
Debug.Print Head.Item("Host")
Debug.Print Head.Item("Date")
Debug.Print Head.Count
' Output:
' example.com
' Tue, 13 Oct 2026 18
' 3
```

### UrlDecode
{: .no_toc }

Decodes `%XX` escapes, assuming the Chinese code page GB2312.

Syntax: **ToolsHttp.UrlDecode** ( *Url* ) **As String**

<!-- test: HttpToolsTests.UrlDecode_LowEscapes_AreDecoded -->
*Url* is a **String**. A `%XX` below hex 80 becomes the character with that code. A `%XX` of hex 80 or above is combined with the `%XX` after it into one double-byte character, and the pair is converted with **Chr$**. The function does not turn `+` into a space.
<!-- /test -->

That conversion works only where the ANSI code page is a double-byte one, such as GBK. On a computer with a single-byte code page, such as 1252, any escape of hex 80 or above raises error 5, *Invalid procedure call or argument*, even a single one such as `%E9`.

### UrlDecodeUtf8
{: .no_toc }

Meant to decode a URL written in UTF-8.

Syntax: **ToolsHttp.UrlDecodeUtf8** ( *Url* ) **As String**

<!-- test: HttpToolsTests.UrlDecodeUtf8_PercentEscapes_AreDecoded, HttpToolsTests.UrlDecodeUtf8_TextWithoutPercent_IsReturnedWithPlusAsSpace -->
> [!NOTE] 1.0.0.29
> The function raises error 13, *Type mismatch*, for every text that contains a `%`, and returns the text correctly only when it has none (a `+` becomes a space). The code compares a **Long** with an empty string at its first `%`.

### UrlEncodUtf8
{: .no_toc }

Meant to encode a text as UTF-8 escapes. The name is spelled with one *e* less than the function name `UrlEncode`.

Syntax: **ToolsHttp.UrlEncodUtf8** ( *szInput* ) **As String**

*szInput* is a **String** (a **Variant**). A character below hex 80 is copied as it is, so a space, `&` and `=` stay: only the other characters are escaped. A character from hex 1000 up becomes three escapes, `%E4%B8%AD` for the character U+4E2D. The function returns an empty string for an empty text.

<!-- test: HttpToolsTests.UrlEncodUtf8_CharactersAbove7F_AreWrittenAsPercentEscapes -->
> [!WARNING] 1.0.0.29
> A character from hex 80 to hex FFF, such as `é`, is written with only one `%`: `é` becomes `%C3A9` and U+0080 becomes `%C280`. The second byte has no `%` of its own, so the result is not a valid escape, and no decoder gets the character back. Characters from hex 1000 up, such as the Chinese ones, are right.

```tb check_build check_run
Debug.Print ToolsHttp.UrlEncodUtf8("a b")
Debug.Print ToolsHttp.UrlEncodUtf8(ChrW(&H4E2D))
Debug.Print ToolsHttp.UrlEncodUtf8("caf" & ChrW(233))
' Output:
' a b
' %E4%B8%AD
' caf%C3A9
```

### UrlEncode
{: .no_toc }

Encodes a text with `%XX` escapes in the ANSI code page.

Syntax: **ToolsHttp.UrlEncode** ( *strURL* ) **As String**

<!-- test: HttpToolsTests.UrlEncode_EscapesWhatIsNotALetterADigitOrOneOfTheKeptMarks -->
*strURL* is a **String**, passed by reference. A letter of the English alphabet and the characters `-`, `,`, `.`, `/` and `0` to `9` are copied. Every other character becomes `%` and the hex code of its byte: `%20` for a space, `%5F` for `_`. A character with two bytes in the code page (a Chinese character in GBK) becomes two escapes. On a computer with a single-byte code page, a character such as `é` becomes one escape, `%E9`.
<!-- /test -->

### Test
{: .no_toc }

A procedure of the author's tests: it applies **UrlDecodeUtf8** to an escaped path and writes the result to the Debug Console. It raises error 13 for the reason given at **UrlDecodeUtf8**. A program has no use for it.

## See Also

- [cHttpClient](cHttpClient) class -- sends requests with these helpers
- [Consts](Consts) module -- the content type and header names
- [ToolsDic](ToolsDic) module -- reads form text into a dictionary
- [TBMANLIB](.) package -- overview
