## Introduction

**Fusion** is a twinBASIC feature that enables 64-bit applications to host certain 32-bit ActiveX controls by transparently bridging them through an out-of-process helper executable.

Traditionally, ActiveX controls must match the bitness of the host application.  This limitation has long prevented the use of legacy 32-bit controls in modern 64-bit applications. Fusion removes this restriction by introducing a bridging layer that allows cross-architecture interaction.

Please note: this technology has currently only been tested on Windows 10 and 11 machines.  Results may vary on older operating systems.

## What does "out-of-process" mean?

An **out-of-process** component runs in a separate executable (process) rather than within the same memory space as the main application.

With *twinBASIC Fusion*:

- Your main twinBASIC application runs as usual (e.g. 64-bit)
- A secondary **host EXE** is launched automatically (e.g. 32-bit)
- The ActiveX controls are created and hosted inside this secondary process
- Communication between your main application and the controls is handled transparently by twinBASIC

This separation allows incompatible architectures (e.g. 32-bit controls in a 64-bit app) to interoperate safely.

## Inter-Process Communication (IPC)

Because *twinBASIC Fusion* operates across two separate processes, all interaction between your application and the hosted ActiveX controls is performed using **Inter-Process Communication (IPC)**.

In simple terms, IPC is a mechanism that allows two independent processes to exchange data and invoke behaviour.

With *twinBASIC Fusion*:

- Method and property calls are **marshalled across the IPC layer** to the host EXE  
- The host EXE executes the call against the real ActiveX control instance  
- Return values are transmitted back to the calling process

Events follow the same pattern in reverse:

- The control raises an event inside the host EXE  
- The event is transmitted back across the IPC channel  
- Your application receives it as if it originated locally  

#### Important characteristics:

- There is a small inherent overhead due to cross-process communication  
- All parameters and return values must be serialised/deserialised  
- Execution appears synchronous to your code, but is performed remotely  

## Deadlocks and Freezes

Due to the nature of cross-process communication and message pumping, some controls used with Fusion may be susceptible to **deadlocks or UI freezes**.

If you encounter this, you can try enabling the following per-library option:

**Fusion: Async Events**

This changes how events are delivered across the IPC boundary and can help avoid re-entrancy and blocking issues in certain controls.

## Automatic Fusion Host EXE Generation

When you open a twinBASIC project, the compiler evaluates whether all referenced ActiveX controls are available and registered for the current architecture.

If one or more controls are not registered for the current architecture then twinBASIC will automatically generate a **Fusion host EXE** alongside your project, when required.

When this occurs, you will see a note in the DEBUG CONSOLE:

<img width="412" height="73" alt="tbFusionDebugConsole" src="Images/569099635-bc9553a6-fcce-487d-a478-dbee557f33b1.png" />

This additional EXE acts as the out-of-process container for those controls and is managed automatically by the twinBASIC IDE

## ActiveX Hosting EXE Output Path

A project-level setting allows you to control where the Fusion host EXE is generated:

- **ActiveX Fusion Host EXE Output Path**

<img width="800" height="400" alt="tbFusionProjectSettings" src="Images/569150839-9ffc87ac-250d-40a4-bb47-669b607ad76f.png" />

If left blank (default), the standard build path set in the project settings is used.  Unless overriden, the standard build path is:
${SourcePath}\Build${ProjectName}_${Architecture}.${FileExtension}

For Fusion host executables, `${Architecture}` will resolve to:
- `win32host`  
- `win64host`  

This allows Fusion host EXEs to be clearly distinguished from normal build outputs.

## Per-Library Options

Each COM reference (type library) exposes Fusion-specific options.

<img width="737" height="323" alt="tbFusionPerLibraryOptions" src="Images/569100769-f1f2790a-0094-4843-809f-a8a9e928fd41.png" />

### ActiveX Fusion Mode

Controls how (and if) Fusion is applied for a given library.

**Available options:**

- `auto`  (DEFAULT)
  
  Enables Fusion automatically only when the library is not available for the current architecture  
  - 32-bit control in 64-bit build → uses `fusion64To32`  
  - 64-bit control in 32-bit build → uses `fusion32To64`  

- `fusion32To64`  
  - 32-bit builds: generates and uses a **64-bit host EXE**  
  - 64-bit builds: Fusion is not used  

- `fusion64To32`  
  - 64-bit builds: generates and uses a **32-bit host EXE**  
  - 32-bit builds: Fusion is not used  

- `fusionAllTo64`  
  - Both 32-bit and 64-bit builds use a **64-bit host EXE**  
  This option allows you to run these controls as out-of-process Fusion controls on both architectures.

- `fusionAllTo32`  
  - Both 32-bit and 64-bit builds use a **32-bit host EXE**  
  This option allows you to run these controls as out-of-process Fusion controls on both architectures.

- `none`  
  - Disables Fusion entirely for this library  

Please note: you cannot mix and match the explicit "Fusion Mode" settings across multiple libraries (except for 'auto' and 'none' modes, which can always be used).

### Fusion: Async Events

Boolean option, defaults OFF
When set, enables asynchronous event delivery across the IPC boundary (from host EXE to main app).  This can help prevent deadlocks or freezes with certain controls.  

>  [!NOTE]
> using this option means that you cannot return data to the hosted control via ByRef params (e.g. a `ByRef Cancel As Boolean` param would be ineffective).

## Runtime Behaviour and Deployment

For compiled builds at runtime:

- The main application will look for the Fusion host EXE **in the same directory as the main executable**  
- The filename must match the one generated at build time  

If required, you can override this behaviour:

```vb
App.FusionHostEXEPath = "C:\Path\To\Host.exe"
```

### Important:

This explicit path must be set **before** opening any Fusion-backed form or control.  The Fusion host EXE must always be distributed with your application.   Failure to include the host EXE will prevent Fusion-based controls from loading, and the main application process will end.

## Current Limitations

Fusion is a powerful compatibility layer, but not all ActiveX controls are supported.

#### Currently NOT supported:
- Windowless controls
- Container controls
- Controls that depend on other sited controls

#### Other Known Limitations:
- No tab navigation between controls
- Property pages are not yet implemented
- Unsupported Properties
- ToolTipText
- CausesValidation
- DragMode
- DragIcon
- HelpContextID
- WhatsThisHelpID
- TabStop
- TabIndex

## Event Differences

Mouse events are not currently OLE-translated, therefore mouse event signatures (MouseDown, MouseUp, MouseMove) will differ from traditional ActiveX expectations.  This is a current limitation, and will fixed in a later update.

## Summary

*twinBASIC Fusion* provides a practical path for modernising applications while retaining compatibility with legacy ActiveX controls.

By leveraging an out-of-process architecture and fast IPC-based communication, *twinBASIC Fusion* enables cross-bitness interoperability while maintaining a familiar programming model.