---
title: Documentation Development
nav_order: 9
permalink: /Documentation/Development
---

# Documentation Development  
{: .no_toc }

This chapter covers the consumption of the documentation, e.g. in an IDE, as well as the development process of the content itself.

* TOC goes here
{:toc}
## Permanent Links

The stable, or machine-accessible part of the documentation tree is rooted on the `/tB/` prefix. The URLs with this prefix, as well as the internal links (e.g. [`docs.twinbasic.com/tB/Modules/Math#round`](../tB/Modules/Math#round)), are stable.

### /tB/Core/\<Statement\>

- [AppActivate](../tB/Core/AppActivate)
- [Beep](../tB/Core/Beep)
- [Call](../tB/Core/Call)
- [ChDir](../tB/Core/ChDir)
- [ChDrive](../tB/Core/ChDrive)
- [Class](../tB/Core/Class)
- [Close](../tB/Core/Close)
- [CoClass](../tB/Core/CoClass)
- [Const](../tB/Core/Const)
- [Continue](../tB/Core/Continue)
- [Date](../tB/Core/Date)
- [Declare](../tB/Core/Declare)
- [Deftype](../tB/Core/Deftype)
- [DeleteSetting](../tB/Core/DeleteSetting)
- [Dim](../tB/Core/Dim)
- [Do-Loop](../tB/Core/Do-Loop)
- [End](../tB/Core/End)
- [Enum](../tB/Core/Enum)
- [Erase](../tB/Core/Erase)
- [Error](../tB/Core/Error)
- [Event](../tB/Core/Event)
- [Exit](../tB/Core/Exit)
- [FileCopy](../tB/Core/FileCopy)
- [For-Next](/tB/Core/For-Next)
- [Function](../tB/Core/Function)
- [Get](../tB/Core/Get)
- [GetSetting](../tB/Core/GetSetting)
- [GoSub-Return](../tB/Core/GoSub-Return)
- [GoTo](../tB/Core/GoTo)
- [If-Then-Else](../tB/Core/If-Then-Else)
- [Implements](../tB/Core/Implements)
- [Input](../tB/Core/Input)
- [Interface](../tB/Core/Interface)
- [Is](../tB/Core/Is)
- [Kill](../tB/Core/Kill)
- [LBound](../tB/Core/LBound)
- [Let](../tB/Core/Let)
- [Line-Input](../tB/Core/Line-Input)
- [Load](../tB/Core/Load)
- [Lock](../tB/Core/Lock)
- [LSet](../tB/Core/LSet)
- [Mid-equals](../tB/Core/Mid-equals) for `Mid(...) = ...` 
- [MidB-equals](../tB/Core/MidB-equals) for `MidB(...) = ...`
- [MkDir](../tB/Core/MkDir)
- [Module](../tB/Core/Module)
- [Name](../tB/Core/Name)
- [New](../tB/Core/New)
- [Option](../tB/Core/Option)
- [On-Error](../tB/Core/On-Error)
- [On-GoSub](../tB/Core/On-GoSub)
- [On-GoTo](../tB/Core/On-GoTo)
- [Open](../tB/Core/Open)
- [ParamArray](../tB/Core/ParamArray)
- [Print](../tB/Core/Print)
- [Private](../tB/Core/Private)
- [Property](../tB/Core/Property)
- [Public](../tB/Core/Public)
- [Put](../tB/Core/Put)
- [RaiseEvent](../tB/Core/RaiseEvent)
- [ReDim](../tB/Core/ReDim)
- [Reset](../tB/Core/Reset)
- [Resume](../tB/Core/Resume)
- [RmDir](../tB/Core/RmDir)
- [RSet](../tB/Core/RSet)
- [SavePicture](../tB/Core/SavePicture)
- [SaveSetting](../tB/Core/SaveSetting)
- [Seek](../tB/Core/Seek)
- [Select-Case](../tB/Core/Select-Case)
- [SendKeys](../tB/Core/SendKeys)
- [Set](../tB/Core/Set)
- [SetAttr](../tB/Core/SetAttr)
- [Static](../tB/Core/Static)
- [Sub](../tB/Core/Sub)
- [Stop](../tB/Core/Stop)
- [Time](../tB/Core/Time)
- [Type](../tB/Core/Type)
- [Unload](../tB/Core/Unload)
- [Unlock](../tB/Core/Unlock)
- [While-Wend](../tB/Core/While-Wend)
- [Width](../tB/Core/Width)
- [With](../tB/Core/With)
- [Write](../tB/Core/Write)

### /tB/Modules/\<ModuleName\>

These are modules within VBA and VBRUN:

- VBA
  - [Collection](../tB/Modules/Collection)
  - [Compilation](../tB/Modules/Compilation)
  - [Constants](../tB/Modules/Constants)
  - [Conversion](../tB/Modules/Conversion)
  - [DateTime](../tB/Modules/DateTime)
  - [ErrObject](../tB/Modules/ErrObject)
  - [ExpressionService](../tB/Modules/ExpressionService)
  - [FileSystem](../tB/Modules/FileSystem)
  - [Financial](../tB/Modules/Financial)
  - [Information](../tB/Modules/Information)
  - [Interaction](../tB/Modules/Interaction)
  - [Math](../tB/Modules/Math)
  - [Strings](../tB/Modules/Strings)
  - [TextEncodingConstants](../tB/Modules/TextEncodingConstants)
  - Internal [_HiddenModule](../tB/Modules/_HiddenModule)
- VBRUN
  - [AmbientProperties](../tB/Modules/AmbientProperties)
  - [AsyncProperty](../tB/Modules/AsyncProperty)
  - [Constants](../tB/Modules/Constants)
  - [ContainedControls](../tB/Modules/ContainedControls)
  - [DataMembers](../tB/Modules/DataMembers)
  - [DataObject](../tB/Modules/DataObject)
  - [ErrorCallstack](../tB/Modules/ErrorCallstack)
  - [ErrorContext](../tB/Modules/ErrorContext)
  - [ErrorStackFrame](../tB/Modules/ErrorStackFrame)
  - [Hyperlink](../tB/Modules/Hyperlink)
  - [ParentControls](../tB/Modules/ParentControls)
  - [PropertyBag](../tB/Modules/PropertyBag)

## Documentation Development Environment

The documentation is built (renderd to html) using [Jekyll][jekyllrb].

1. Ensure that Jekyll and Ruby are installed.

   - [Installing Jekyll via RubyInstaller on Windows](https://jekyllrb.com/docs/installation/windows/#installation-via-rubyinstaller)

   Also ensure that Jekyll is in the PATH. To adjust the path on Windows, press <kbd>⊞ R</kbd>, type `SystemPropertiesAdvanced ` <kbd> Enter</kbd>, and click the **Environment Variables...** button. ![img](Images/environment-variables.png)

2. Fork [https://github.com/twinbasic/documentation][docs-repo] to your own GitHub account if you plan on making any changes or for convenience. This can be skipped if you just want to build the documentation without changes.

3. Clone either your fork in #2, or the [documentation repository itself][docs-repo].

4. **Go to the `/docs` folder in the cloned working tree.** Building, serving, and other documentation operations are all done in this folder, *not* in the repository root.

To build the documentation, i.e. render it from `.md` files to the `_site` folder:

    bundle exec jekyll build

To build and serve the documentation from http://localhost:4000:

    bundle exec jekyll serve

or, on Windows only:

    serve.bat

The documentation server detects changes in the filesystem and automatically regenerates the html files as needed. The server does *not* follow changes in `_config.yml`. If you change the configuration, the server has to be restarted. Interrupt the server by pressing **^C** repeatedly.

To check that none of the internal links in the documentation are broken:

    bundle exec htmlproofer ./_site --disable-external --no-enforce-https

or, on Windows only

    check.bat



[docs-repo]: https://github.com/twinbasic/documentation
[jekyllrb]: https://jekyllrb.com/
