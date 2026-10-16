---
title: cHttpClient
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cHttpClient
has_toc: false
---

# cHttpClient class
{: .no_toc }

A **cHttpClient** sends HTTP and HTTPS requests with the Windows component *WinHTTP* (`WinHttp.WinHttpRequest.5.1`) and reads the answer as text, as JSON, as bytes or as a file. A program fills in the settings (headers, form values, a JSON document, query values), calls one of the **Send** methods, and reads the result with one of the **Return** methods. The package keeps one ready-made instance, [**TBMAN.HttpClient**](TBMAN#httpclient).

The settings are fields of the object, and most of them stay after a request: the headers and the content type are kept, and the form values, the JSON document and the query values are emptied. The **Send** methods return the object itself, so calls can be chained.

```tb check_build
Dim Http As New cHttpClient
Dim Reply As cJson

Http.RequestHeaders.Item("X-Api-Key") = "secret"
Http.SetRequestContentType JsonString
Http.RequestDataJson.Item("name") = "Ann"

Http.SendPost "https://example.com/api/users"
Set Reply = Http.ReturnJson()
Debug.Print Reply.Item("id")
```

* TOC
{:toc}

## How a request runs

<!-- test: HttpRequestTests.Fetch_EmptyUrl_Raises500, HttpRequestTests.RequestDataForm_Values_AreSentAsNamePairsAndThenEmptied, HttpRequestTests.RequestDataJson_Document_IsSentAsTheBody, HttpRequestTests.Fetch_Body_IsSentAsItIsWithTheTwoLengthHeaders, HttpRequestTests.RequestTimeOut_UnderFive_IsRaisedToFive, HttpRequestTests.RequestHeaders_AreSentOnEveryRequestAndEmptyOnesAreNot, HttpRequestTests.DebugInfo_DescribesTheRequestAndTheAnswer -->
[**Fetch**](#fetch) does the work for every **Send** method. It opens the request, sets the headers, builds the body, sends it and, unless the request is asynchronous, waits for the answer. In order:

1. It empties [**LastError**](#lasterror) and raises error 500 if the URL is empty.
2. If [**RequestDataQuery**](#requestdataquery) has items, it adds them to the URL.
3. If [**RequestHeaders**](#requestheaders) has no `Content-Type` item, it adds one with [**RequestContentType**](#requestcontenttype), which is set to `application/x-www-form-urlencoded` when it is empty. Every item of **RequestHeaders** whose text is not empty is then sent.
4. It sets the options of the request: all certificate errors are ignored, and redirects are followed or not as [**EnableRedirects**](#enableredirects) says.
5. If the call gave no body, it builds one: from [**RequestDataJson**](#requestdatajson) when the content type is exactly `application/json`, or from [**RequestDataForm**](#requestdataform) when it is exactly `application/x-www-form-urlencoded`. For any other content type, a body is sent only when the call gives one.
6. It encodes the body as UTF-8 when [**RequestChartSet**](#requestchartset) contains `utf`, and in the ANSI code page otherwise, sets the extra header `Content-Lenght` (see [Consts](Consts#tools_http_header_field_content_lenght)), and sends it.
7. Unless the request is asynchronous, it waits [**RequestTimeOut**](#requesttimeout) seconds (at least 5) for the answer, raises the status as an error when it is 400 to 599, and reads the response headers into [**ResponseHeaders**](#responseheaders).
8. It empties the form values, the JSON document and the query values, clears [**DebugStart**](#debugstart) and makes the next request synchronous. The headers are kept.
<!-- /test -->

<!-- test: HttpResponseTests.Fetch_ErrorStatus_IsRaisedWithItsNumberAndText, HttpRequestTests.Fetch_NoAnswerWithinTheTimeOut_Raises900 -->
A failed request does the last step too, sets **LastError** and raises the error again. The error is raised with the number of the cause: the HTTP status for a 4xx or 5xx answer, 900 for a timeout, or the number that WinHTTP reports (such as -2147012867, *a connection with the server could not be established*).

Several error texts of the class are written in Chinese. The ones that are not a status or a WinHTTP text are these:

| Number | Text means | Raised by |
|:-------|:-----------|:----------|
| 500 | the URL of the request is empty | **Fetch** |
| 900 | the request timed out, with the time in seconds | **Fetch**, **UploadFile** |
| 310 | more redirects than the maximum | **FollowRedirect** |
| 58 | the file exists | **DownloadFile**, **FinishDownloadFile** |
| 53 | the file does not exist | **UploadFile** |
| 1 | no download path was found, or the file could not be read | **FinishDownloadFile**, **UploadFile** |
<!-- /test -->

<!-- test: none -- the claim is about the certificate of a remote HTTPS server, which a case on the loopback address cannot offer -->
> [!WARNING] 1.0.0.29
> The class ignores every certificate error: an expired certificate, one from an unknown authority and one issued for another name are all accepted. An HTTPS request therefore encrypts the traffic, but does not prove who the server is, and a program that sends a password or a key with it can send it to an impostor.

<!-- test: compile RequestHeadersDefaultMemberAssignment, compile RequestHeadersItemAssignment, compile RequestHeadersDefaultMemberRead -->
> [!NOTE] BETA 1007
> The compiler refuses an assignment written through a public dictionary field of an object, such as `Http.RequestHeaders("X-Key") = "1"`, with TB5090. Write the default member out: `Http.RequestHeaders.Item("X-Key") = "1"`. Reading `Http.RequestHeaders("X-Key")` is accepted.

## Request settings

### RequestContentType
{: .no_toc }

A **String**, the media type of the body. It is empty in a new object. [**SetRequestContentType**](#setrequestcontenttype) sets it from a number, and the constants of [**Consts**](Consts) and [**ToolsHttp**](ToolsHttp) are the usual values. [**Fetch**](#fetch) reads it to choose the body and, when the headers have no `Content-Type`, to set that header.

<!-- test: HttpRequestTests.RequestContentType_ChangedAfterAFirstRequest_ChangesTheHeader -->
> [!WARNING] 1.0.0.29
> The `Content-Type` header is put into [**RequestHeaders**](#requestheaders) by the first request of an object and stays there. A later change of **RequestContentType** changes the body that is built, but not the header: after a form request, `SetRequestContentType JsonString` sends the JSON text with the header `application/x-www-form-urlencoded`. Set the item as well, `Http.RequestHeaders.Item("Content-Type") = "application/json"`, or use a new object.

[**UploadFile**](#uploadfile) sets this field to its `multipart/form-data` value, with the boundary, and leaves it, so a request after an upload is sent with that content type unless the program sets it again.

### RequestChartSet
{: .no_toc }

<!-- test: HttpRequestTests.RequestChartSet_Utf8Name_EncodesTheBodyAsUtf8AndAnyOtherAsAnsi, HttpRequestTests.Settings_HaveTheirDefaults -->
A **String**, the character set of the request body. It is `utf-8` in a new object. If the name contains `utf`, in any letter case, the body is encoded as UTF-8; any other name encodes it in the ANSI code page of the computer, whatever the name is: `gbk` does not select GBK, and a character that the code page lacks becomes `?`. The field does not set a header.
<!-- /test -->

### RequestTimeOut
{: .no_toc }

A **Long**, the seconds that a synchronous request waits for the answer. It is 5 in a new object. A value under 5 is raised to 5 by **Fetch**, and the field shows 5 afterwards. When the wait ends without an answer, the call raises error 900. **UploadFile** waits the same time, but a value under 5 becomes 60 there, so a new object, whose value is 5, waits 5 seconds for the answer to an upload.

### RequestHeaders
{: .no_toc }

A **Scripting.Dictionary** of the request headers: the keys are the header names, compared without regard to letter case, and the items are their text. It is created with the object, and it is the only setting that is not emptied after a request, so a header, a cookie or an API key stays on every request of the object. Write `Http.RequestHeaders.Item("X-Key") = "1"`; an item whose text is the empty string is not sent. To stop sending a header, remove the key or empty the dictionary with `RemoveAll`.

### RequestDataForm
{: .no_toc }

A **Scripting.Dictionary** of the values of a form: the keys are the field names. When the content type is `application/x-www-form-urlencoded` and the call gives no body, [**Fetch**](#fetch) sends `name=value` pairs joined by `&`, in the order they were added. It is emptied after each request.

<!-- test: HttpRequestTests.RequestDataForm_Values_AreUrlEncoded -->
> [!WARNING] 1.0.0.29
> The names and values are written as they are, without URL encoding. A value with a space, `&`, `=` or `%` produces a body that a server reads as other fields: `Form.Item("city") = "A B&C"` is sent as `city=A B&C`. Such a value has to be escaped by the program before it is added; [**ToolsHttp.UrlEncode**](ToolsHttp#urlencode) does that for text in the ANSI code page.

### RequestDataJson
{: .no_toc }

<!-- test: HttpRequestTests.RequestDataJson_NonAsciiText_IsSentAsUtf8Characters, HttpRequestTests.RequestDataJson_ValueWithBackslashU_IsSent, HttpRequestTests.RequestDataJson_EmptyDocument_SendsNoBody -->
A [**cJson**](cJson), the document that is sent when the content type is exactly `application/json` and the call gives no body. It is encoded with the characters themselves and not as `\uXXXX` escapes (the *FromUnicode* argument of [**cJson.Encode**](cJson#encode) is **True**), so the warning on that argument applies: a text value with a backslash followed by `u` raises error 13. The document is emptied after each request.

If the document is empty, the request has no body and goes with `Content-Length: 0`.
<!-- /test -->

### RequestDataQuery
{: .no_toc }

<!-- test: HttpRequestTests.RequestDataQuery_IsEmptiedAfterTheRequest -->
A **Scripting.Dictionary** of query values. When it has items, [**Fetch**](#fetch) adds them to the URL, after a `?` or, if the URL has one, a `&`. It is emptied after each request.
<!-- /test -->

<!-- test: HttpRequestTests.RequestDataQuery_Pairs_AreSentAsParametersOfTheirOwnNames, HttpRequestTests.RequestDataQuery_UrlWithAQuery_GetsTheValuesAfterAnAmpersand -->
> [!WARNING] 1.0.0.29
> The pairs are written after the fixed name `ver`: the URL gets `?ver=` followed by the pairs joined by `&`. With the items `a` = 1 and `b` = 2, the request goes to `?ver=a=1&b=2`: a server reads a parameter `ver` whose value is `a=1`, and a parameter `b`. The name of the first item is lost, and no item is sent as a parameter of that name. The values are not URL encoded either. Put the query values in the URL text instead, which the call sends as given.

### RequestDataBody
{: .no_toc }

A **Scripting.Dictionary**. No member reads it.

### RequestData
{: .no_toc }

An array of **Byte**. No member reads it.

### EnableRedirects
{: .no_toc }

<!-- test: HttpResponseTests.EnableRedirects_True_FollowsTheRedirectToTheFinalAnswer -->
A **Boolean**, **True** in a new object. When it is **True**, WinHTTP follows the redirects of the server (status 301, 302, 307 and so on) and the object holds the final answer. [**AllowRedirects**](#allowredirects) sets it. The value stays for every later request.
<!-- /test -->

### MaxRedirects
{: .no_toc }

A **Long**, 10 in a new object. Only [**FollowRedirect**](#followredirect) reads it. WinHTTP follows redirects by itself, with a limit of its own, whatever this field says.

## Response

### ResponseHeaders
{: .no_toc }

<!-- test: HttpResponseTests.ResponseHeaders_AreFilledAndKeptFromOneAnswerToTheNext -->
A **Scripting.Dictionary** of the headers of the last answer, keys compared without regard to letter case. It is filled by each successful synchronous request and by [**UploadFile**](#uploadfile). It is not emptied: the headers of an earlier answer stay, and the headers of a later answer overwrite those of the same name. An answer with an error status, and an asynchronous request, leave it unchanged.

The text after a blank line at the end becomes an item with the empty key and the empty value. A header that occurs twice (`Set-Cookie`) keeps its last value.
<!-- /test -->

<!-- test: HttpResponseTests.ResponseHeaders_ValueWithColons_IsKeptWhole -->
> [!WARNING] 1.0.0.29
> Each header line is split at its first colon and both parts are trimmed, so the value is cut at its own colon: `Date: Tue, 13 Oct 2026 18:00:00 GMT` gives the value `Tue, 13 Oct 2026 18`, and `Location: http://host/path` gives `http`. A line with no further colon, such as `Content-Type: text/plain`, gives its whole value.

### Cookies
{: .no_toc }

A **Scripting.Dictionary**. No member fills it. WinHTTP keeps the cookies that the server sets and sends them with the later requests of the same object, in addition to an item `Cookie` of [**RequestHeaders**](#requestheaders).

### ResponseRaw
{: .no_toc }

A **Variant**. No member sets it.

### LastError
{: .no_toc }

A **String**, the text of the last error that **Fetch**, **DownloadFile**, **FinishDownloadFile**, **UploadFile** or **UploadFileSimple** caught. **Fetch** empties it at the start of a request.

### DebugStart
{: .no_toc }

A **Boolean**. When it is set to **True** before a request, [**DebugInfo**](#debuginfo) describes that request, and the field is cleared when the request ends.

### DebugInfo
{: .no_toc }

<!-- test: HttpRequestTests.DebugInfo_DescribesTheRequestAndTheAnswer -->
A [**cJson**](cJson). **Fetch** replaces it with an empty document at the start of every request. When [**DebugStart**](#debugstart) was set, it holds an object `Request` with `IsAsync`, `Method`, `Url`, `Body`, `Headers` (the request headers), `TimeOut` and `ChartSet`, and, for a synchronous request, an object `Response` with `Status`, `StatusText`, `Headers` and `Content`. A request that failed adds an object `Error` with `Number`, `Source` and `Description`.
<!-- /test -->

```tb check_build
Dim Http As New cHttpClient

Http.DebugStart = True
Http.SendGet "https://example.com/"
Debug.Print Http.DebugInfo.Item("Response")("Status")
```

## Events

### OnResponseFinished
{: .no_toc }

An event with no arguments. It is meant to be raised when the answer of an asynchronous request has arrived.

<!-- test: HttpResponseTests.OnResponseFinished_AsyncRequest_IsRaisedWhenTheAnswerArrives -->
> [!NOTE] 1.0.0.29
> The class declares the event, and nothing raises it: a handler is never called. A program that sends an asynchronous request has to ask for the answer itself.

## Methods

### AllowRedirects
{: .no_toc }

Sets [**EnableRedirects**](#enableredirects).

Syntax: *object*.**AllowRedirects** ( *Bool* ) **As cHttpClient**

*Bool*
: *required* A **Boolean**. **True** lets WinHTTP follow redirects.

Returns the object itself.

### Async
{: .no_toc }

Makes the next request asynchronous.

Syntax: *object*.**Async** ( *Bool* ) **As cHttpClient**

*Bool*
: *required* A **Boolean**.

<!-- test: HttpResponseTests.Async_SendGet_ReturnsAtOnceAndTheAnswerIsReadLater -->
Returns the object itself. The setting is for the next request only. An asynchronous [**Fetch**](#fetch) sends the request and returns at once: it does not wait, does not check the status and does not read [**ResponseHeaders**](#responseheaders). The answer is read later with a **Return** method, which raises an error (*the data necessary to complete this operation is not yet available*) until the answer is there. There is no status property and [**OnResponseFinished**](#onresponsefinished) is never raised, so the program finds out that the answer has come by trying.
<!-- /test -->

### DownloadFile
{: .no_toc }

Downloads a file with a GET request.

Syntax: *object*.**DownloadFile** ( *url* **,** *savePath* [ **,** *Overwrite* ] ) **As Boolean**

*url*
: *required* A **String**, the address.

*savePath*
: *required* A **String**, the file to write.

*Overwrite*
: *optional* A **Boolean**, **True** by default. With **False**, a file that exists makes the call raise error 58.

<!-- test: HttpResponseTests.DownloadFile_WritesTheBodyToTheFile, HttpResponseTests.DownloadFile_ErrorStatus_Raises, HttpResponseTests.DownloadFile_OverwriteFalseAndFileExists_Raises58AfterTheRequest -->
Sends the request with [**SendGet**](#sendget) (so a 4xx or 5xx status is raised as in **Fetch**), raises an error for a status other than 200, and writes the body to the file with [**cToolsStream.SaveFileAsBinary**](cToolsStream#savefileasbinary). It returns **True**. The test for **Overwrite** comes after the request, so the answer has been received when error 58 is raised; the file is not changed.
<!-- /test -->

<!-- test: HttpResponseTests.DownloadFile_FolderThatDoesNotExist_IsNotReportedAsDone, HttpResponseTests.FinishDownloadFile_FolderThatDoesNotExist_IsNotReportedAsDone -->
> [!WARNING] 1.0.0.29
> The call returns **True** also when the file could not be written, for example for a folder that does not exist: **SaveFileAsBinary** returns **False** there, and **DownloadFile** does not look at it. Check that the file exists after the call.

### DownloadFileAsync
{: .no_toc }

Starts a download without waiting for it.

Syntax: *object*.**DownloadFileAsync** ( *url* **,** *savePath* [ **,** *Overwrite* ] ) **As cHttpClient**

<!-- test: HttpResponseTests.DownloadFileAsync_ThenFinishDownloadFile_WritesTheFile -->
The arguments are those of [**DownloadFile**](#downloadfile). The method sends an asynchronous GET request, then stores the path and the overwrite choice in [**RequestHeaders**](#requestheaders) as the items `X-Download-Path` and `X-Download-Overwrite`. [**FinishDownloadFile**](#finishdownloadfile) reads them and writes the file.
<!-- /test -->

The two items stay in **RequestHeaders**, so every later request of the object sends them to the server, with the local path in them. Remove them when the download is done: `Http.RequestHeaders.Remove "X-Download-Path"`, and the same for `X-Download-Overwrite`.

### Fetch
{: .no_toc }

Sends a request. The **Send** methods are shorter forms of this one; see [How a request runs](#how-a-request-runs).

Syntax: *object*.**Fetch** ( *Method* **,** *url* [ **,** *Body* ] ) **As cHttpClient**

*Method*
: *required* An **EnumRequestMethod** (declared in [**ToolsHttp**](ToolsHttp#enumrequestmethod)): **ReqPost**, **ReqGet**, **ReqPut**, **ReqDelete** or **ReqOptions**.

*url*
: *required* A **String**, the address. An empty string raises error 500.

*Body*
: *optional* A **String**, the body. If it is given, it is sent as it is and the form values and the JSON document are not used (they are still emptied after the request). An empty string counts as not given.

Returns the object itself.

### FinishDownloadFile
{: .no_toc }

Writes the file of a download that [**DownloadFileAsync**](#downloadfileasync) started.

Syntax: *object*.**FinishDownloadFile** ( ) **As Boolean**

<!-- test: HttpResponseTests.FinishDownloadFile_WithoutDownloadFileAsync_Raises -->
Reads the answer, raises an error for a status other than 200 and, if the file exists and the overwrite choice was **False**, error 58. It then writes the file and returns **True**. While the answer has not arrived, the call raises the WinHTTP error *the data necessary to complete this operation is not yet available* (-2147483638); a program calls it again after a short wait. If the item `X-Download-Path` is not in [**RequestHeaders**](#requestheaders), it raises error 1. Like [**DownloadFile**](#downloadfile), it returns **True** also when the file could not be written.
<!-- /test -->

### FollowRedirect
{: .no_toc }

Meant to send the request again to the address of a redirect.

Syntax: *object*.**FollowRedirect** ( [ *RedirectMethod* ] ) **As cHttpClient**

*RedirectMethod*
: *optional* An **EnumRequestMethod**, the method for a 307 or 308 answer. If it is left out, a GET request is sent.

Reads the address with [**GetRedirectUrl**](#getredirecturl) and sends a GET request to it (for 307 and 308, the given method). Each call counts, and error 310 is raised when the count exceeds [**MaxRedirects**](#maxredirects); [**ResetRedirectCount**](#resetredirectcount) sets the count to 0. The method needs [**EnableRedirects**](#enableredirects) set to **False** with [**AllowRedirects**](#allowredirects), or no redirect answer is left to follow. It returns the object itself, and does nothing if the last answer had no `Location` header.

<!-- test: HttpResponseTests.FollowRedirect_Status302_SendsARequestToTheLocation, HttpResponseTests.GetRedirectUrl_AbsoluteLocation_IsReturnedWhole -->
> [!NOTE] 1.0.0.29
> The method cannot send a request. The address comes from [**ResponseHeaders**](#responseheaders), which cuts a value at its first colon, so `http://host/path` is read as `http`, and WinHTTP raises error -2147012890, *the URL does not use a recognized protocol*. A `Location` header with a relative address, such as `/path`, has no colon and is read whole, but WinHTTP refuses it as well. A program that has to follow a redirect leaves **EnableRedirects** at **True**, so that WinHTTP follows it.

### GetRedirectUrl
{: .no_toc }

Returns the `Location` header of the last answer.

Syntax: *object*.**GetRedirectUrl** ( ) **As String**

<!-- test: HttpResponseTests.FollowRedirect_NoLocation_DoesNothing -->
Returns the item `Location` of [**ResponseHeaders**](#responseheaders), or an empty string when there is none. The value is cut at its first colon (see [ResponseHeaders](#responseheaders)), so an absolute address comes back as `http` or `https`.
<!-- /test -->

### MapRequestContentType
{: .no_toc }

The same as [**SetRequestContentType**](#setrequestcontenttype).

Syntax: *object*.**MapRequestContentType** ( *ReqType* [ **,** *ContentType* ] ) **As String**

### ResetRedirectCount
{: .no_toc }

Sets the count of [**FollowRedirect**](#followredirect) to 0.

Syntax: *object*.**ResetRedirectCount** ( ) **As cHttpClient**

Returns the object itself.

### ReturnBody
{: .no_toc }

Returns the body of the last answer as bytes.

Syntax: *object*.**ReturnBody** ( ) **As Byte()**

<!-- test: HttpResponseTests.ReturnBody_BeforeAnyRequest_Raises -->
Raises the WinHTTP error -2147012795, *this method cannot be called until the Send method has been called*, when the object has sent no request.
<!-- /test -->

### ReturnJson
{: .no_toc }

Reads the body of the last answer as a JSON document.

Syntax: *object*.**ReturnJson** ( [ *IsUtf8* ] [ **,** *IsConvert* ] ) **As cJson**

*IsUtf8*
: *optional* A **Boolean**, **True** by default.

*IsConvert*
: *optional* A **Boolean**.

<!-- test: HttpResponseTests.ReturnText_ReturnJson_ReturnBody_ReadTheAnswer -->
Takes the text from [**ReturnText**](#returntext) with the same arguments and decodes it with [**cJson.Decode**](cJson#decode), in a new **cJson**. A text that is not JSON raises error 10001 from the parser.
<!-- /test -->

### ReturnStream
{: .no_toc }

Returns the answer as a stream.

Syntax: *object*.**ReturnStream** ( ) **As Variant**

Returns the `ResponseStream` of the WinHTTP object, an `IStream`.

### ReturnText
{: .no_toc }

Returns the body of the last answer as text.

Syntax: *object*.**ReturnText** ( [ *IsUtf8* ] [ **,** *IsConvert* ] ) **As String**

*IsUtf8*
: *optional* A **Boolean**, **True** by default. With **True**, the bytes of the body are decoded as UTF-8 with [**ToolsUtf8.Decode**](ToolsUtf8#decode). The character set that the answer's headers name is not looked at.

*IsConvert*
: *optional* A **Boolean**. Used only when *IsUtf8* is **False**. With **True**, every byte of the body becomes one character (`StrConv(bytes, vbUnicode)`), which is the form to use for a text that is neither UTF-8 nor correctly named. With **False**, the text is WinHTTP's `ResponseText`, which it decodes with the character set of the `Content-Type` header, or UTF-8.

### Send
{: .no_toc }

The same as [**Fetch**](#fetch).

Syntax: *object*.**Send** ( *Method* **,** *Url* [ **,** *Body* ] ) **As cHttpClient**

### SendDelete
{: .no_toc }

Sends a DELETE request.

Syntax: *object*.**SendDelete** ( *url* [ **,** *Body* ] ) **As cHttpClient**

<!-- test: HttpRequestTests.Fetch_Methods_UseTheirOwnVerbs -->
The same as **Fetch** with **ReqDelete**.
<!-- /test -->

### SendGet
{: .no_toc }

Sends a GET request.

Syntax: *object*.**SendGet** ( *url* [ **,** *Body* ] ) **As cHttpClient**

The same as **Fetch** with **ReqGet**.

### SendOptions
{: .no_toc }

Sends an OPTIONS request.

Syntax: *object*.**SendOptions** ( *url* [ **,** *Body* ] ) **As cHttpClient**

The same as **Fetch** with **ReqOptions**.

### SendPost
{: .no_toc }

Sends a POST request.

Syntax: *object*.**SendPost** ( *url* [ **,** *Body* ] ) **As cHttpClient**

The same as **Fetch** with **ReqPost**.

```tb check_build
Dim Http As New cHttpClient

Http.RequestDataForm.Item("user") = "ann"
Http.RequestDataForm.Item("language") = "en"
Http.SendPost "https://example.com/login"

Debug.Print Http.ReturnText()
```

### SendPut
{: .no_toc }

Sends a PUT request.

Syntax: *object*.**SendPut** ( *url* [ **,** *Body* ] ) **As cHttpClient**

The same as **Fetch** with **ReqPut**.

### SetCookies
{: .no_toc }

Sets the `Cookie` header.

Syntax: *object*.**SetCookies** ( *Value* ) **As cHttpClient**

*Value*
: *required* A **String**, the text of the header, such as `a=1; b=2`. Nothing happens when it is empty.

<!-- test: HttpRequestTests.RequestHeaders_AreSentOnEveryRequestAndEmptyOnesAreNot -->
Stores the text as the item `Cookie` of [**RequestHeaders**](#requestheaders), where it stays for every later request. It returns the object itself. WinHTTP adds the cookies it has received from the server to the header it sends, so a cookie can appear twice.
<!-- /test -->

### SetRequestContentType
{: .no_toc }

Sets [**RequestContentType**](#requestcontenttype) from a number.

Syntax: *object*.**SetRequestContentType** ( *ReqType* [ **,** *ContentType* ] ) **As String**

*ReqType*
: *required* An **EnumRequestContentType** (declared in [**ToolsHttp**](ToolsHttp#enumrequestcontenttype)): **JsonString** (`application/json`), **FormEncode** (`application/x-www-form-urlencoded`), **FormMultiPart** (`multipart/form-data`), **TextPlain** (`text/plain`) or **TextHtml** (`text/html`). A value of 0 sets the empty string, and a value above 5 raises error 9.

*ContentType*
: *optional* A **String**. Not used.

<!-- test: HttpRequestTests.SetRequestContentType_ChoosesTheMediaTypeByNumber -->
Returns the new text. Read the warning at [**RequestContentType**](#requestcontenttype): the call after a first request does not change the header.
<!-- /test -->

### ShowPage
{: .no_toc }

Opens an address in the program that Windows associates with it.

Syntax: *object*.**ShowPage** ( *url* )

*url*
: *required* A **String**, the address.

Calls **ShellExecute** with the verb `open` and the address, so a web address opens in the default browser. It sends no request itself.

### UploadFile
{: .no_toc }

Sends a file in a POST request of the type `multipart/form-data`.

Syntax: *object*.**UploadFile** ( *url* **,** *filePath* [ **,** *fieldName* ] [ **,** *additionalFormData* ] ) **As cHttpClient**

*url*
: *required* A **String**, the address.

*filePath*
: *required* A **String**, the file to send. It is read whole into memory. If it does not exist, the call raises error 53.

*fieldName*
: *optional* A **String**, the name of the form field that holds the file. The default is `file`.

*additionalFormData*
: *optional* A **Scripting.Dictionary** of more form fields, as names and text values.

<!-- test: HttpResponseTests.UploadFile_SendsTheFileAsMultipartFormData, HttpResponseTests.UploadFile_MissingFile_Raises53 -->
The body has a part with the file and a part for each item of *additionalFormData*. The file is always sent with the type `application/octet-stream` and the file name of the path. The boundary is `----WebKitFormBoundary` followed by a random number. The call waits [**RequestTimeOut**](#requesttimeout) seconds for the answer and raises the status of a 400 or higher as an error, and error 900 for a timeout. It reads [**ResponseHeaders**](#responseheaders) and returns the object itself.

The call sends neither the items of **RequestHeaders** nor the extra header of [**Fetch**](#fetch), and it follows redirects as **EnableRedirects** says. It leaves two things behind: **RequestContentType** keeps the multipart value, and **RequestHeaders** gets an item `Content-Length` with the size of the body. A later request therefore has the multipart content type, as the warning at [**RequestContentType**](#requestcontenttype) says. The `Content-Length` item does not reach the server with a later GET request.
<!-- /test -->

<!-- test: HttpResponseTests.UploadFile_ErrorStatus_RaisesWithTheTextOfTheFailure, HttpResponseTests.UploadFile_NoAnswerWithinTheTimeOut_RaisesWithTheTextOfTheFailure, HttpResponseTests.UploadFileSimple_Failure_LastErrorHoldsTheTextOfTheFailure -->
> [!NOTE] 1.0.0.29
> A call that fails with a status or a timeout raises the right number but a general text: *Application-defined or object-defined error* for a status, *Automation error* for error 900. The real text, such as `上传失败: 404#Not Found` (*the upload failed*), is in [**LastError**](#lasterror).

```tb check_build
Dim Http As New cHttpClient
Dim Extra As New Scripting.Dictionary

Extra.Add "owner", "ann"
Http.UploadFile "https://example.com/upload", "C:\data\report.pdf", "document", Extra
Debug.Print Http.ReturnText()
```

### UploadFileSimple
{: .no_toc }

Sends a file and returns whether it worked.

Syntax: *object*.**UploadFileSimple** ( *url* **,** *filePath* ) **As Boolean**

Calls [**UploadFile**](#uploadfile) with the default field name, with error handling turned off, and returns **True** when it raised no error. After an error it sets [**LastError**](#lasterror) to the text of the error that was raised, which is the general text described at **UploadFile** for a status, and not the text of the failure.

## See Also

- [Consts](Consts) module -- the media types and header names
- [ToolsHttp](ToolsHttp) module -- the enumerations, and URL and form helpers
- [ToolsHttpMimeType](ToolsHttpMimeType) module -- the media type for a file name
- [cJson](cJson) class -- the JSON document of requests and answers
- [cToolsStream](cToolsStream) class -- writes the downloaded file
- [TBMAN](TBMAN) module -- the shared instance **TBMAN.HttpClient**
- [TBMANLIB](.) package -- overview
