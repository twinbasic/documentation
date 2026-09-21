---
title: Permanent Links
parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Permanent-Links
---

# Permanent Links
{: .no_toc }

The stable, or machine-accessible, part of the documentation tree is rooted on the `/tB/` prefix. URLs with this prefix --- and the internal links that target them, e.g. [`docs.twinbasic.com/tB/Modules/Math/Round`](../../tB/Modules/Math/Round) --- are guaranteed not to move. This is the contract the IDE help system and external links rely on; anything documented below should be treated as essential.

* TOC goes here
{:toc}

## What the guarantee covers, and what retires a URL
{: #retiring-a-url }

The guarantee is that a published `/tB/` URL is never **re-pointed**: it is not renamed, not restructured, and never made to resolve to a different symbol. A page that moves on disk keeps its `permalink`, which is why [the Default / Built-In split](../../tB/Packages/) changed no URL at all, and a page that takes over another's subject declares the old URL in `redirect_from:` rather than leaving it dead.

**One case falls outside it: a symbol that no longer exists in twinBASIC.** Its page is [removed](Authoring#removing-a-page) and its URL goes with it, and that is a deliberate decision rather than a routine edit --- nothing in the build will stop you, because the link check only resolves links made from inside the tree and no link inside the tree survives the removal. Three things are expected of one:

- **A redirect wherever anything can carry the URL.** If another page covers the subject now, it takes a `redirect_from:` entry for the old URL. Only a URL nothing can stand in for is allowed to 404.
- **The entry comes out of this page in the same commit.** This page is the contract; a URL listed here that no longer resolves is worse than one that was never listed, because it is the thing an implementer reads to decide what is safe to link to.
- **The commit message says which URL was retired.** Consumers of the contract are outside this repository --- the IDE help system above all --- and a commit message naming the URL is the only record they can be pointed at.

Renaming a heading is the quieter version of the same thing: `redirect_from:` emits whole-page stubs and has no fragment remapping, so an anchor that some page links into breaks silently when its heading is reworded. Anchors named in the sections below are part of the contract for the same reason the URLs are.

## /tB/Core/\<Statement\>

- [AppActivate](../../tB/Core/AppActivate)
- [Beep](../../tB/Core/Beep)
- [Call](../../tB/Core/Call), [ChDir](../../tB/Core/ChDir), [ChDrive](../../tB/Core/ChDrive), [Class](../../tB/Core/Class), [Close](../../tB/Core/Close), [CoClass](../../tB/Core/CoClass), [Const](../../tB/Core/Const), [Continue](../../tB/Core/Continue)
- [Date](../../tB/Core/Date), [Declare](../../tB/Core/Declare), [Deftype](../../tB/Core/Deftype), [DeleteSetting](../../tB/Core/DeleteSetting), [Dim](../../tB/Core/Dim), [Do-Loop](../../tB/Core/Do-Loop)
- [End](../../tB/Core/End), [Enum](../../tB/Core/Enum), [Erase](../../tB/Core/Erase), [Error](../../tB/Core/Error), [Event](../../tB/Core/Event), [Exit](../../tB/Core/Exit)
- [FileCopy](../../tB/Core/FileCopy), [For-Next](../../tB/Core/For-Next), [For-Each-Next](../../tB/Core/For-Each-Next), [Function](../../tB/Core/Function)
- [Get](../../tB/Core/Get), [GetSetting](../../tB/Core/GetSetting), [GoSub-Return](../../tB/Core/GoSub-Return), [GoTo](../../tB/Core/GoTo)
- [If-Then-Else](../../tB/Core/If-Then-Else), [Implements](../../tB/Core/Implements), [Input](../../tB/Core/Input), [Interface](../../tB/Core/Interface), [Is](../../tB/Core/Is)
- [Kill](../../tB/Core/Kill)
- [LBound](../../tB/Core/LBound), [Let](../../tB/Core/Let), [Line-Input](../../tB/Core/Line-Input), [Load](../../tB/Core/Load), [Lock](../../tB/Core/Lock), [LSet](../../tB/Core/LSet)
- [Mid-equals](../../tB/Core/Mid-equals) for `Mid(...) = ...` , [MidB-equals](../../tB/Core/MidB-equals) for `MidB(...) = ...`, [MkDir](../../tB/Core/MkDir), [Module](../../tB/Core/Module)
- [Name](../../tB/Core/Name), [New](../../tB/Core/New)
- [Option](../../tB/Core/Option), [On-Error](../../tB/Core/On-Error), [On-GoSub](../../tB/Core/On-GoSub), [On-GoTo](../../tB/Core/On-GoTo), [Open](../../tB/Core/Open)
- [ParamArray](../../tB/Core/ParamArray), [Print](../../tB/Core/Print), [Private](../../tB/Core/Private), [Property](../../tB/Core/Property), [Protected](../../tB/Core/Protected), [Public](../../tB/Core/Public), [Put](../../tB/Core/Put)
- [RaiseEvent](../../tB/Core/RaiseEvent), [ReDim](../../tB/Core/ReDim), [Reset](../../tB/Core/Reset), [Resume](../../tB/Core/Resume), [RmDir](../../tB/Core/RmDir), [RSet](../../tB/Core/RSet)
- [SavePicture](../../tB/Core/SavePicture), [SaveSetting](../../tB/Core/SaveSetting), [Seek](../../tB/Core/Seek), [Select-Case](../../tB/Core/Select-Case), [SendKeys](../../tB/Core/SendKeys), [Set](../../tB/Core/Set), [SetAttr](../../tB/Core/SetAttr), [Static](../../tB/Core/Static), [Sub](../../tB/Core/Sub), [Stop](../../tB/Core/Stop)
- [Time](../../tB/Core/Time), [Type](../../tB/Core/Type)
- [Unload](../../tB/Core/Unload), [Unlock](../../tB/Core/Unlock)
- [While-Wend](../../tB/Core/While-Wend), [Width](../../tB/Core/Width), [With](../../tB/Core/With), [Write](../../tB/Core/Write)

## /tB/Modules/\<ModuleName\>/\<Symbol\>

Within each VBA module, each procedure, property, or statement has its own stand-alone page, e.g. [**LenB**: /tB/Modules/Strings/Len](../../tB/Modules/Strings/Len). The `$`-suffixed and `B`/`W` variants are documented on the same page as the base symbol (so `LenB`, `Len$`, etc. all share the [`Len`](../../tB/Modules/Strings/Len) page).

- [Collection](../../tB/Modules/Collection)
- [Compilation](../../tB/Modules/Compilation)
- [Constants](../../tB/Modules/Constants)
- [Conversion](../../tB/Modules/Conversion)
- [DateTime](../../tB/Modules/DateTime)
- [ErrObject](../../tB/Modules/ErrObject)
- [TbExpressionService](../../tB/Modules/TbExpressionService)
- [FileSystem](../../tB/Modules/FileSystem)
- [Financial](../../tB/Modules/Financial)
- [Information](../../tB/Modules/Information)
- [Interaction](../../tB/Modules/Interaction)
- [Math](../../tB/Modules/Math)
- [Strings](../../tB/Modules/Strings)
- Internal [_HiddenModule](../../tB/Modules/HiddenModule)

## /tB/Packages/\<Package\>/...

Each package lives under `/tB/Packages/<Package>/`. The sub-structure depends on the package: modules, classes, enumerations, sub-objects, and interface members each have their own page.

Depth differs by section. VBRUN is listed by module, and its members are reached from the module page, exactly as under `/tB/Modules/`. Every other package is listed page by page --- so **a new class, control, enumeration, sub-object, or member needs its own bullet here, in the commit that adds the page.** Nothing catches the omission: the link check confirms that the links a page makes resolve, and has no opinion about whether anything links to a published URL. [Authoring Pages](Authoring#listing-a-new-page) covers the other indexes a new page must join.

### VBRUN -- /tB/Packages/VBRUN/\<Module\>/

- [AmbientProperties](../../tB/Packages/VBRUN/AmbientProperties)
- [AsyncProperty](../../tB/Packages/VBRUN/AsyncProperty)
- [Constants](../../tB/Packages/VBRUN/Constants)
- [ContainedControls](../../tB/Packages/VBRUN/ContainedControls)
- [DataMembers](../../tB/Packages/VBRUN/DataMembers)
- [DataObject](../../tB/Packages/VBRUN/DataObject)
- [ErrorCallstack](../../tB/Packages/VBRUN/ErrorCallstack)
- [ErrorContext](../../tB/Packages/VBRUN/ErrorContext)
- [ErrorStackFrame](../../tB/Packages/VBRUN/ErrorStackFrame)
- [Hyperlink](../../tB/Packages/VBRUN/Hyperlink)
- [ParentControls](../../tB/Packages/VBRUN/ParentControls)
- [PropertyBag](../../tB/Packages/VBRUN/PropertyBag)

### VB -- /tB/Packages/VB/\<Class\>/

- [App](../../tB/Packages/VB/App), [CheckBox](../../tB/Packages/VB/CheckBox), [CheckMark](../../tB/Packages/VB/CheckMark), [Clipboard](../../tB/Packages/VB/Clipboard), [ComboBox](../../tB/Packages/VB/ComboBox), [CommandButton](../../tB/Packages/VB/CommandButton)
- [Data](../../tB/Packages/VB/Data), [DirListBox](../../tB/Packages/VB/DirListBox), [DriveListBox](../../tB/Packages/VB/DriveListBox)
- [FileListBox](../../tB/Packages/VB/FileListBox), [Form](../../tB/Packages/VB/Form), [Frame](../../tB/Packages/VB/Frame), [Global](../../tB/Packages/VB/Global)
- [HScrollBar](../../tB/Packages/VB/HScrollBar), [Image](../../tB/Packages/VB/Image)
- [Label](../../tB/Packages/VB/Label), [Line](../../tB/Packages/VB/Line), [ListBox](../../tB/Packages/VB/ListBox)
- [MDIForm](../../tB/Packages/VB/MDIForm), [Menu](../../tB/Packages/VB/Menu), [MultiFrame](../../tB/Packages/VB/MultiFrame)
- [OLE](../../tB/Packages/VB/OLE), [OptionButton](../../tB/Packages/VB/OptionButton)
- [PictureBox](../../tB/Packages/VB/PictureBox), [Printer](../../tB/Packages/VB/Printer), [Printers](../../tB/Packages/VB/Printers), [PropertyPage](../../tB/Packages/VB/PropertyPage)
- [QRCode](../../tB/Packages/VB/QRCode), [Report](../../tB/Packages/VB/Report)
- [Screen](../../tB/Packages/VB/Screen), [Shape](../../tB/Packages/VB/Shape)
- [TextBox](../../tB/Packages/VB/TextBox), [Timer](../../tB/Packages/VB/Timer)
- [UserControl](../../tB/Packages/VB/UserControl), [VScrollBar](../../tB/Packages/VB/VScrollBar)

### WebView2 -- /tB/Packages/WebView2/...

- [WebView2](../../tB/Packages/WebView2/WebView2) (control class, with [EnvironmentOptions](../../tB/Packages/WebView2/WebView2/EnvironmentOptions) sub-page)
- [WebView2Header](../../tB/Packages/WebView2/WebView2Header), [WebView2HeadersCollection](../../tB/Packages/WebView2/WebView2HeadersCollection), [WebView2Request](../../tB/Packages/WebView2/WebView2Request), [WebView2RequestHeaders](../../tB/Packages/WebView2/WebView2RequestHeaders), [WebView2Response](../../tB/Packages/WebView2/WebView2Response), [WebView2ResponseHeaders](../../tB/Packages/WebView2/WebView2ResponseHeaders)
- Enumerations: [wv2DefaultDownloadCornerAlign](../../tB/Packages/WebView2/Enumerations/wv2DefaultDownloadCornerAlign), [wv2ErrorStatus](../../tB/Packages/WebView2/Enumerations/wv2ErrorStatus), [wv2HostResourceAccessKind](../../tB/Packages/WebView2/Enumerations/wv2HostResourceAccessKind), [wv2KeyEventKind](../../tB/Packages/WebView2/Enumerations/wv2KeyEventKind), [wv2PermissionKind](../../tB/Packages/WebView2/Enumerations/wv2PermissionKind), [wv2PermissionState](../../tB/Packages/WebView2/Enumerations/wv2PermissionState), [wv2PrintOrientation](../../tB/Packages/WebView2/Enumerations/wv2PrintOrientation), [wv2ProcessFailedKind](../../tB/Packages/WebView2/Enumerations/wv2ProcessFailedKind), [wv2ScriptDialogKind](../../tB/Packages/WebView2/Enumerations/wv2ScriptDialogKind), [wv2WebResourceContext](../../tB/Packages/WebView2/Enumerations/wv2WebResourceContext)
- Types: [COREWEBVIEW2_PHYSICAL_KEY_STATUS](../../tB/Packages/WebView2/Types/COREWEBVIEW2_PHYSICAL_KEY_STATUS)

### Assert -- /tB/Packages/Assert/\<Module\>

- [Exact](../../tB/Packages/Assert/Exact), [Strict](../../tB/Packages/Assert/Strict), [Permissive](../../tB/Packages/Assert/Permissive)

### CustomControls -- /tB/Packages/CustomControls/...

- Controls: [WaynesButton](../../tB/Packages/CustomControls/WaynesButton) (with [WaynesButtonState](../../tB/Packages/CustomControls/WaynesButton/WaynesButtonState)), [WaynesForm](../../tB/Packages/CustomControls/WaynesForm) (with [WindowsFormOptions](../../tB/Packages/CustomControls/WaynesForm/WindowsFormOptions)), [WaynesFrame](../../tB/Packages/CustomControls/WaynesFrame), [WaynesGrid](../../tB/Packages/CustomControls/WaynesGrid) (with [CellRenderingOptions](../../tB/Packages/CustomControls/WaynesGrid/CellRenderingOptions), [Column](../../tB/Packages/CustomControls/WaynesGrid/Column)), [WaynesLabel](../../tB/Packages/CustomControls/WaynesLabel), [WaynesSlider](../../tB/Packages/CustomControls/WaynesSlider) (with [WaynesSliderState](../../tB/Packages/CustomControls/WaynesSlider/WaynesSliderState)), [WaynesTextBox](../../tB/Packages/CustomControls/WaynesTextBox) (with [WaynesTextBoxState](../../tB/Packages/CustomControls/WaynesTextBox/WaynesTextBoxState)), [WaynesTimer](../../tB/Packages/CustomControls/WaynesTimer)
- Styles: [Anchors](../../tB/Packages/CustomControls/Styles/Anchors), [Borders](../../tB/Packages/CustomControls/Styles/Borders), [Corners](../../tB/Packages/CustomControls/Styles/Corners), [Fill](../../tB/Packages/CustomControls/Styles/Fill), [Line](../../tB/Packages/CustomControls/Styles/Line), [Padding](../../tB/Packages/CustomControls/Styles/Padding), [TextRendering](../../tB/Packages/CustomControls/Styles/TextRendering)
- Framework: [Canvas](../../tB/Packages/CustomControls/Framework/Canvas), [CustomControlContext](../../tB/Packages/CustomControls/Framework/CustomControlContext), [CustomControlsCollection](../../tB/Packages/CustomControls/Framework/CustomControlsCollection), [CustomControlTimer](../../tB/Packages/CustomControls/Framework/CustomControlTimer), [CustomFormContext](../../tB/Packages/CustomControls/Framework/CustomFormContext), [ICustomControl](../../tB/Packages/CustomControls/Framework/ICustomControl), [ICustomForm](../../tB/Packages/CustomControls/Framework/ICustomForm), [SerializeInfo](../../tB/Packages/CustomControls/Framework/SerializeInfo)
- Enumerations: [BorderStyle](../../tB/Packages/CustomControls/Enumerations/BorderStyle), [ColorRGBA](../../tB/Packages/CustomControls/Enumerations/ColorRGBA), [CornerShape](../../tB/Packages/CustomControls/Enumerations/CornerShape), [Customtate](../../tB/Packages/CustomControls/Enumerations/Customtate), [DockMode](../../tB/Packages/CustomControls/Enumerations/DockMode), [FillPattern](../../tB/Packages/CustomControls/Enumerations/FillPattern), [FontWeight](../../tB/Packages/CustomControls/Enumerations/FontWeight), [PixelCount](../../tB/Packages/CustomControls/Enumerations/PixelCount), [PointSize](../../tB/Packages/CustomControls/Enumerations/PointSize), [StartupPosition](../../tB/Packages/CustomControls/Enumerations/StartupPosition), [TextAlignment](../../tB/Packages/CustomControls/Enumerations/TextAlignment), [TextOverflowMode](../../tB/Packages/CustomControls/Enumerations/TextOverflowMode), [WindowState](../../tB/Packages/CustomControls/Enumerations/WindowState)

### CEF -- /tB/Packages/CEF/...

- [CefBrowser](../../tB/Packages/CEF/CefBrowser) (control class, with [EnvironmentOptions](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions) sub-page)
- Enumerations: [CefLogSeverity](../../tB/Packages/CEF/Enumerations/CefLogSeverity), [cefPrintOrientation](../../tB/Packages/CEF/Enumerations/cefPrintOrientation)

### WinEventLogLib -- /tB/Packages/WinEventLogLib/\<Class\>

- [EventLog](../../tB/Packages/WinEventLogLib/EventLog), [EventLogHelperPublic](../../tB/Packages/WinEventLogLib/EventLogHelperPublic)

### WinNamedPipesLib -- /tB/Packages/WinNamedPipesLib/\<Class\>

- [NamedPipeClientConnection](../../tB/Packages/WinNamedPipesLib/NamedPipeClientConnection), [NamedPipeClientManager](../../tB/Packages/WinNamedPipesLib/NamedPipeClientManager), [NamedPipeServer](../../tB/Packages/WinNamedPipesLib/NamedPipeServer), [NamedPipeServerConnection](../../tB/Packages/WinNamedPipesLib/NamedPipeServerConnection)

### WinServicesLib -- /tB/Packages/WinServicesLib/...

- [ITbService](../../tB/Packages/WinServicesLib/ITbService), [ServiceCreator](../../tB/Packages/WinServicesLib/ServiceCreator), [ServiceManager](../../tB/Packages/WinServicesLib/ServiceManager), [Services](../../tB/Packages/WinServicesLib/Services), [ServiceState](../../tB/Packages/WinServicesLib/ServiceState)
- Enumerations: [ServiceControlCodeConstants](../../tB/Packages/WinServicesLib/Enumerations/ServiceControlCodeConstants), [ServiceStartConstants](../../tB/Packages/WinServicesLib/Enumerations/ServiceStartConstants), [ServiceStatusConstants](../../tB/Packages/WinServicesLib/Enumerations/ServiceStatusConstants), [ServiceTypeConstants](../../tB/Packages/WinServicesLib/Enumerations/ServiceTypeConstants)

### tbIDE -- /tB/Packages/tbIDE/\<Class\>

- [AddIn](../../tB/Packages/tbIDE/AddIn), [AddinTimer](../../tB/Packages/tbIDE/AddinTimer), [Button](../../tB/Packages/tbIDE/Button), [CodeEditor](../../tB/Packages/tbIDE/CodeEditor), [DebugConsole](../../tB/Packages/tbIDE/DebugConsole), [Editor](../../tB/Packages/tbIDE/Editor), [Editors](../../tB/Packages/tbIDE/Editors)
- [File](../../tB/Packages/tbIDE/File), [FileSystem](../../tB/Packages/tbIDE/FileSystem), [FileSystemItem](../../tB/Packages/tbIDE/FileSystemItem), [Folder](../../tB/Packages/tbIDE/Folder)
- [Host](../../tB/Packages/tbIDE/Host), [HtmlElement](../../tB/Packages/tbIDE/HtmlElement), [HtmlElementProperties](../../tB/Packages/tbIDE/HtmlElementProperties), [HtmlElementProperty](../../tB/Packages/tbIDE/HtmlElementProperty), [HtmlElements](../../tB/Packages/tbIDE/HtmlElements), [HtmlEventProperties](../../tB/Packages/tbIDE/HtmlEventProperties), [HtmlEventProperty](../../tB/Packages/tbIDE/HtmlEventProperty)
- [KeyboardShortcuts](../../tB/Packages/tbIDE/KeyboardShortcuts), [Project](../../tB/Packages/tbIDE/Project), [Themes](../../tB/Packages/tbIDE/Themes), [Toolbar](../../tB/Packages/tbIDE/Toolbar), [Toolbars](../../tB/Packages/tbIDE/Toolbars), [ToolWindow](../../tB/Packages/tbIDE/ToolWindow), [ToolWindows](../../tB/Packages/tbIDE/ToolWindows)

### WinNativeCommonCtls -- /tB/Packages/WinNativeCommonCtls/...

- Controls: [DTPicker](../../tB/Packages/WinNativeCommonCtls/DTPicker), [ImageList](../../tB/Packages/WinNativeCommonCtls/ImageList), [ListView](../../tB/Packages/WinNativeCommonCtls/ListView), [MonthView](../../tB/Packages/WinNativeCommonCtls/MonthView), [ProgressBar](../../tB/Packages/WinNativeCommonCtls/ProgressBar), [Slider](../../tB/Packages/WinNativeCommonCtls/Slider), [TreeView](../../tB/Packages/WinNativeCommonCtls/TreeView), [UpDown](../../tB/Packages/WinNativeCommonCtls/UpDown)
- Sub-objects: [ListImages](../../tB/Packages/WinNativeCommonCtls/ImageList/ListImages), [ListImage](../../tB/Packages/WinNativeCommonCtls/ImageList/ListImage), [ListItems](../../tB/Packages/WinNativeCommonCtls/ListView/ListItems), [ListItem](../../tB/Packages/WinNativeCommonCtls/ListView/ListItem), [ColumnHeaders](../../tB/Packages/WinNativeCommonCtls/ListView/ColumnHeaders), [ColumnHeader](../../tB/Packages/WinNativeCommonCtls/ListView/ColumnHeader), [Nodes](../../tB/Packages/WinNativeCommonCtls/TreeView/Nodes), [Node](../../tB/Packages/WinNativeCommonCtls/TreeView/Node)
- Enumerations: [DTPickerFormatConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/DTPickerFormatConstants), [ImlDrawConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/ImlDrawConstants), [OrientationConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/OrientationConstants), [TreeBorderStyleConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/TreeBorderStyleConstants), [TreeLabelEditConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/TreeLabelEditConstants), [TreeLineStyleConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/TreeLineStyleConstants), [TreeRelationshipConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/TreeRelationshipConstants), [TreeSortOrderConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/TreeSortOrderConstants), [TreeSortTypeConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/TreeSortTypeConstants), [TreeStyleConstants](../../tB/Packages/WinNativeCommonCtls/Enumerations/TreeStyleConstants)

### AppGlobalClassObject -- /tB/Packages/AppGlobalClassObject/_App/\<Member\>

The **App** global object is available in every project without a reference, and each of its members is documented on a page of its own. Those pages sit under the interface **App** implements, so every member URL carries an `_App/` segment --- `App.EXEName` is documented at [/tB/Packages/AppGlobalClassObject/_App/EXEName](../../tB/Packages/AppGlobalClassObject/_App/EXEName). The leading underscore is part of the interface name, after the COM hidden-interface convention; it is not a private-page marker.

- Interface: [_App](../../tB/Packages/AppGlobalClassObject/_App/)
- Properties: [Build](../../tB/Packages/AppGlobalClassObject/_App/Build), [Comments](../../tB/Packages/AppGlobalClassObject/_App/Comments), [CompanyName](../../tB/Packages/AppGlobalClassObject/_App/CompanyName), [EXEName](../../tB/Packages/AppGlobalClassObject/_App/EXEName), [FileDescription](../../tB/Packages/AppGlobalClassObject/_App/FileDescription), [HelpFile](../../tB/Packages/AppGlobalClassObject/_App/HelpFile), [hInstance](../../tB/Packages/AppGlobalClassObject/_App/hInstance), [IsInIDE](../../tB/Packages/AppGlobalClassObject/_App/IsInIDE), [LastBuildPath](../../tB/Packages/AppGlobalClassObject/_App/LastBuildPath), [LegalCopyright](../../tB/Packages/AppGlobalClassObject/_App/LegalCopyright), [LegalTrademarks](../../tB/Packages/AppGlobalClassObject/_App/LegalTrademarks), [LogMode](../../tB/Packages/AppGlobalClassObject/_App/LogMode), [LogPath](../../tB/Packages/AppGlobalClassObject/_App/LogPath), [Major](../../tB/Packages/AppGlobalClassObject/_App/Major), [Minor](../../tB/Packages/AppGlobalClassObject/_App/Minor), [ModulePath](../../tB/Packages/AppGlobalClassObject/_App/ModulePath), [NonModalAllowed](../../tB/Packages/AppGlobalClassObject/_App/NonModalAllowed), [OleRequestPendingMsgText](../../tB/Packages/AppGlobalClassObject/_App/OleRequestPendingMsgText), [OleRequestPendingMsgTitle](../../tB/Packages/AppGlobalClassObject/_App/OleRequestPendingMsgTitle), [OleRequestPendingTimeout](../../tB/Packages/AppGlobalClassObject/_App/OleRequestPendingTimeout), [OleServerBusyMsgText](../../tB/Packages/AppGlobalClassObject/_App/OleServerBusyMsgText), [OleServerBusyMsgTitle](../../tB/Packages/AppGlobalClassObject/_App/OleServerBusyMsgTitle), [OleServerBusyRaiseError](../../tB/Packages/AppGlobalClassObject/_App/OleServerBusyRaiseError), [OleServerBusyTimeout](../../tB/Packages/AppGlobalClassObject/_App/OleServerBusyTimeout), [Path](../../tB/Packages/AppGlobalClassObject/_App/Path), [PrevInstance](../../tB/Packages/AppGlobalClassObject/_App/PrevInstance), [ProductName](../../tB/Packages/AppGlobalClassObject/_App/ProductName), [RetainedProject](../../tB/Packages/AppGlobalClassObject/_App/RetainedProject), [Revision](../../tB/Packages/AppGlobalClassObject/_App/Revision), [StartMode](../../tB/Packages/AppGlobalClassObject/_App/StartMode), [TaskVisible](../../tB/Packages/AppGlobalClassObject/_App/TaskVisible), [ThreadID](../../tB/Packages/AppGlobalClassObject/_App/ThreadID), [Title](../../tB/Packages/AppGlobalClassObject/_App/Title), [UnattendedApp](../../tB/Packages/AppGlobalClassObject/_App/UnattendedApp)
- Methods: [LogEvent](../../tB/Packages/AppGlobalClassObject/_App/LogEvent), [StartLogging](../../tB/Packages/AppGlobalClassObject/_App/StartLogging)

## /tB/Core/Attributes#\<attribute\>

> [!NOTE]
>
> All non-alphabetic characters, as well as parameters, are removed from the links. All attribute names are in lowercase in the links. E.g. `ArrayBoundsChecks(Bool)` is referenced as `/tB/Core/Attributes#arrayboundschecks`.

- [AllowUnpopulatedVtableEntry](../../tB/Core/Attributes#allowunpopulatedvtableentry), [AppObject](../../tB/Core/Attributes#appobject), [ArrayBoundsChecks](../../tB/Core/Attributes#arrayboundschecks)
- [BindOnlyIfNoArguments](../../tB/Core/Attributes#bindonlyifnoarguments), [BindOnlyIfStringSuffix](../../tB/Core/Attributes#bindonlyifstringsuffix)
- [ClassId](../../tB/Core/Attributes#classid), [ClassInterface](../../tB/Core/Attributes#classinterface), [CoClassCustomConstructor](../../tB/Core/Attributes#coclasscustomconstructor), [CoClassId](../../tB/Core/Attributes#coclassid), [COMControl](../../tB/Core/Attributes#comcontrol), [COMCreatable](../../tB/Core/Attributes#comcreatable), [ComExport](../../tB/Core/Attributes#comexport), [COMExtensible](../../tB/Core/Attributes#comextensible), [ComImport](../../tB/Core/Attributes#comimport), [CompileIf](../../tB/Core/Attributes#compileif), [CompilerOptions](../../tB/Core/Attributes#compileroptions), [ConstantFoldable](../../tB/Core/Attributes#constantfoldable), [ConstantFoldableNumericsOnly](../../tB/Core/Attributes#constantfoldablenumericsonly), [CustomControl](../../tB/Core/Attributes#customcontrol), [CustomDesigner](../../tB/Core/Attributes#customdesigner)
- [Debuggable](../../tB/Core/Attributes#debuggable), [DebugOnly](../../tB/Core/Attributes#debugonly), [Default](../../tB/Core/Attributes#default), [DefaultDesignerEvent](../../tB/Core/Attributes#defaultdesignerevent), [DefaultMember](../../tB/Core/Attributes#defaultmember), [Description](../../tB/Core/Attributes#description), [DispId](../../tB/Core/Attributes#dispid), [DispInterface](../../tB/Core/Attributes#dispinterface), [DllExport](../../tB/Core/Attributes#dllexport), [DLLStackCheck](../../tB/Core/Attributes#dllstackcheck), [DualInterface](../../tB/Core/Attributes#dualinterface)
- [EnforceErrors](../../tB/Core/Attributes#enforceerrors), [EnforceWarnings](../../tB/Core/Attributes#enforcewarnings), [Enumerator](../../tB/Core/Attributes#enumerator), [EnumId](../../tB/Core/Attributes#enumid), [EventInterfaceId](../../tB/Core/Attributes#eventinterfaceid), [EventsUseDispInterface](../../tB/Core/Attributes#eventsusedispinterface)
- [Flags](../../tB/Core/Attributes#flags), [FloatingPointErrorChecks](../../tB/Core/Attributes#floatingpointerrorchecks), [FormDesignerId](../../tB/Core/Attributes#formdesignerid), [Hidden](../../tB/Core/Attributes#hidden)
- [IdeButton](../../tB/Core/Attributes#idebutton), [IgnoreWarnings](../../tB/Core/Attributes#ignorewarnings), [ImplementsViaPrivateFriendlies](../../tB/Core/Attributes#implementsviaprivatefriendlies), [IntegerOverflowChecks](../../tB/Core/Attributes#integeroverflowchecks), [InterfaceId](../../tB/Core/Attributes#interfaceid)
- [LibraryId](../../tB/Core/Attributes#libraryid)
- [MustBeQualified](../../tB/Core/Attributes#mustbequalified)
- [NonBrowsable](../../tB/Core/Attributes#nonbrowsable)
- [OleAutomation](../../tB/Core/Attributes#oleautomation)
- [PackingAlignment](../../tB/Core/Attributes#packingalignment), [PopulateFrom](../../tB/Core/Attributes#populatefrom), [PredeclaredID](../../tB/Core/Attributes#predeclaredid), [PreserveSig](../../tB/Core/Attributes#preservesig)
- [RedirectToStaticImplementation](../../tB/Core/Attributes#redirecttostaticimplementation), [Restricted](../../tB/Core/Attributes#restricted), [RunAfterBuild](../../tB/Core/Attributes#runafterbuild), [RunBeforeStartupObject](../../tB/Core/Attributes#runbeforestartupobject)
- [Serialize](../../tB/Core/Attributes#serialize), [SetDllDirectory](../../tB/Core/Attributes#setdlldirectory), [SimplerByVals](../../tB/Core/Attributes#simplerbyvals), [Source](../../tB/Core/Attributes#source), [SpecialCompilerBinding](../../tB/Core/Attributes#specialcompilerbinding)
- [TestCase](../../tB/Core/Attributes#testcase), [TestFixture](../../tB/Core/Attributes#testfixture), [TypeHint](../../tB/Core/Attributes#typehint)
- [Unimplemented](../../tB/Core/Attributes#unimplemented), [UseGetLastError](../../tB/Core/Attributes#usegetlasterror), [UserDefinedTypeIsAnAlias](../../tB/Core/Attributes#userdefinedtypeisanalias)
- [Version](../../tB/Core/Attributes#version)
- [WindowsControl](../../tB/Core/Attributes#windowscontrol), [WithDispatchForwarding](../../tB/Core/Attributes#withdispatchforwarding)
