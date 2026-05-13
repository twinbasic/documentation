---
title: wv2ErrorStatus
parent: Enumerations
grand_parent: WebView2 Package
permalink: /tB/Packages/WebView2/Enumerations/wv2ErrorStatus
---
# wv2ErrorStatus
{: .no_toc }

The reason a navigation failed. Carried as the `WebErrorStatus` argument of the [**NavigationComplete**](../WebView2/#navigationcomplete) event — only meaningful when its `IsSuccess` argument is **False**. Mirrors the `COREWEBVIEW2_WEB_ERROR_STATUS` enumeration.

| Constant | Value | Description |
|----------|-------|-------------|
| **wv2StateUnknown**{: #wv2StateUnknown } | 0 | An unspecified or unrecognised error. |
| **wv2CertificateCommonNameIsIncorrect**{: #wv2CertificateCommonNameIsIncorrect } | 1 | The server certificate's common name doesn't match the requested host. |
| **wv2CertificateExpired**{: #wv2CertificateExpired } | 2 | The server certificate has expired. |
| **wv2ClientCertificateContainsErrors**{: #wv2ClientCertificateContainsErrors } | 3 | The client certificate contains errors. |
| **wv2CertificateRevoked**{: #wv2CertificateRevoked } | 4 | The server certificate has been revoked. |
| **wv2CertificateIsInvalid**{: #wv2CertificateIsInvalid } | 5 | The server certificate is otherwise invalid. |
| **wv2ServerUnreachable**{: #wv2ServerUnreachable } | 6 | The server could not be reached. |
| **wv2Timeout**{: #wv2Timeout } | 7 | The connection or request timed out. |
| **wv2ErrorHttpInvalidServerResponse**{: #wv2ErrorHttpInvalidServerResponse } | 8 | The server returned a malformed HTTP response. |
| **wv2ConnectionAborted**{: #wv2ConnectionAborted } | 9 | The connection was aborted. |
| **wv2ConnectionReset**{: #wv2ConnectionReset } | 10 | The connection was reset. |
| **wv2Disconnected**{: #wv2Disconnected } | 11 | The connection was disconnected. |
| **wv2CannotConnect**{: #wv2CannotConnect } | 12 | A connection could not be established. |
| **wv2HostNameNotResolved**{: #wv2HostNameNotResolved } | 13 | DNS lookup failed. |
| **wv2OperationCanceled**{: #wv2OperationCanceled } | 14 | The navigation was cancelled. |
| **wv2RedirectFailed**{: #wv2RedirectFailed } | 15 | A redirect could not be followed. |
| **wv2UnexpectedError**{: #wv2UnexpectedError } | 16 | An unexpected error occurred. |
| **wv2ValidAuthenticationCredentialsRequired**{: #wv2ValidAuthenticationCredentialsRequired } | 17 | The server demanded credentials. |
| **wv2ValidProxyAuthenticationRequired**{: #wv2ValidProxyAuthenticationRequired } | 18 | The configured proxy demanded credentials. |
