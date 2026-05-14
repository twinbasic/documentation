---
title: EnvironmentOptions
parent: WebView2
grand_parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2/EnvironmentOptions
has_toc: false
---

# WebView2EnvironmentOptions class
{: .no_toc }

Holds the host's pre-creation configuration for the underlying WebView2 environment --- folder layout, additional command-line arguments, locale, and a few policy switches. Exposed on every [**WebView2**](.) control as its **EnvironmentOptions** property; the control instantiates one automatically before raising the [**Create**](.#create) event.

The fields below take effect only while the WebView2 environment is being constructed --- that is, *before or during* the control's [**Create**](.#create) event. Assigning them after that point has no effect on the live environment.

```tb
Private Sub WebView21_Create()
    WebView21.EnvironmentOptions.UserDataFolder = _
        Environ$("APPDATA") & "\MyApp\WebView2\"
    WebView21.EnvironmentOptions.Language = "en-GB"
End Sub
```

The type itself is `Private Class` --- instances are reachable only through the control's **EnvironmentOptions** property, and a variable typed as **WebView2EnvironmentOptions** cannot be declared from outside the package.

## Properties

### AdditionalBrowserArguments
{: .no_toc }

Extra command-line switches passed straight through to the Edge browser process --- same syntax as `msedge.exe`. **String**. Default: empty.

### AllowSingleSignOnUsingOSPrimaryAccount
{: .no_toc }

When **True**, single sign-on uses the operating system's primary account (typical for Azure AD-joined machines). **Boolean**. Default: **False**.

### BrowserExecutableFolder
{: .no_toc }

Path to a fixed-version WebView2 browser distribution. Leave empty (the default) to load the system-wide Evergreen runtime; set this to point at a side-by-side fixed-version deployment. **String**.

### EnableTrackingPrevention
{: .no_toc }

Whether Edge's tracking-prevention feature is active in this environment. **Boolean**. Default: **True**.

### ExclusiveUserDataFolderAccess
{: .no_toc }

When **True**, the runtime locks the user-data folder so that no other WebView2 instance can use it concurrently. **Boolean**. Default: **False**.

### Language
{: .no_toc }

The language and locale Edge should report in `Accept-Language` and use for its UI strings --- BCP-47 form, e.g. `"en-GB"`, `"fr-FR"`. **String**. Default: empty (the runtime picks the system default).

### TargetCompatibleBrowserVersion
{: .no_toc }

The minimum Edge browser version this application is built against --- used by the loader to decide whether a runtime can host it. **String**. Default: `"86.0.616.0"` (the minimum version that supports WebView2).

### UserDataFolder
{: .no_toc }

Path to the folder Edge uses for the user profile --- cache, cookies, history, local storage, password manager, and so on. Leave empty (the default) to let the runtime pick a folder beside the host executable; set it to keep user data outside the install location, e.g. under `%APPDATA%`. **String**.

Setting a writable user-data folder is the usual remedy for the *"Error occurred creating the WebView2 controller"* failure on installs that live under `Program Files`.

### See Also

- [WebView2 control class](.)
- [Create event](.#create)
- [Customizing the UserDataFolder tutorial](../../../../Tutorials/WebView2/Customize-UserDataFolder)
