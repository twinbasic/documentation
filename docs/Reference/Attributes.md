---
title: Attributes
parent: Reference Section
permalink: /tB/Core/Attributes
---

# Attributes

Attributes have two major functions: 

- they can act as instructions to compiler to influence how code is generated, or 
- to annotate Forms, Modules, Classes, Types, Enums, Declares, and [procedures](/tB/Gloss/#procedure) i.e. Subs/Functions/Properties. 

Previously in VBx, these attributes, such as the procedure description, hidden, default member, and others, were set via hidden text the IDE's editor didn't show you, configured via the Procedure Attributes dialog or some other places. In tB, these are all visible in the code editor. The legacy ones from VBx are supported for compatibility, but new attributes utilize the following syntax:   
`[Attribute]` or `[Attribute(value)]`

---

The available attributes are listed below in alphabetic order. Not every attribute applies to every language element. The applicability of each attribute is given below its syntax.

{:toc}

## AppObject

Syntax: **[AppObject]**

Applicable to: [**CoClass**](/tB/Core/CoClass)

Indicates the class is part of the global namespace. You should not include this attribute without a full understanding of the meaning.

## ArrayBoundsChecks(Bool)

{: #arrayboundschecks }

Syntax: **ArrayBoundsChecks( True** \| **False)**

Applicable to: [**Class**](/tB/Core/Class), [**Module**](/tB/Core/Module), [procedure](/tB/Gloss/#procedure)

Disables array element access bounds checking. Used on performance-critical routines. The default value is **True**.

## CoClassCustomConstructor(String)

{: #coclasscustomconstructor }

Syntax: **[CoClassCustomConstructor("** fully qualified path to factory method **")]**

Applicable to: [**CoClass**](/tB/Core/CoClass)

Allows custom logic for creating and returning a new instance of the coclass' implementation.

Example:

```vb
[CoClassId("7980D953-10BF-478C-93BB-DD0093315D96")]
[CoClassCustomConstructor("FooFactory.CreateFoo")]
[COMCreatable(True)]
Public CoClass Foo
   ' ...
End CoClass
```

For an overview of coclasses in tB, see [Defining coclasses](/Features/Overview/#defining-coclasses).

## CoClassId(String)

{: #coclassid }

Syntax: **[CoClassId("**00000000-0000-0000-0000-000000000000**")]**

Applicable to: [**CoClass**](/tB/Core/CoClass)

In addition to interfaces, twinBASIC also allows defining coclasses -- creatable classes that implement one or more defined interfaces. Like interfaces, these too must be in .twin files and not legacy .bas/.cls files, and must appear prior to the `Class` or `Module` statement. The generic form is:

```vb
[CoClassId("00000000-0000-0000-0000-000000000000")]
*<attributes>*
CoClass <name>
    [Default] Interface <interface name>
    *[Default, Source] Interface <event interface name>*
    *<additional Interface items>*
End CoClass
```

The methods are [procedures](/tB/Gloss/#procedure).

For an overview of coclasses in tB, see [Defining coclasses](/Features/Overview#defining-coclasses).

## ComCreatable(Bool)

{: #comcreatable }

Syntax: **[ComCreatable(True** \| **False)]**

Applicable to:  [**CoClass**](/tB/Core/CoClass)

Indicates that this coclass can be created with the [**New**](/tB/Core/New) keyword. This attribute is is **True** by default. 

## ComExtensible(Bool)

{: #comextensible }

Syntax: **[ComExtensible(True** \| **False)]**

Applicable to: [**Interface**](/tB/Core/Interface), [procedure in an Interface](/tB/Gloss/#procedure)

Specifies whether new members added at runtime can be called by name through an interface implementing **IDispatch**. This attribute is set to **False** by default.

## ComImport

Syntax: **[ComImport]**

Applicable to: [**Interface**](/tB/Core/Interface)

Specifies that an interface is an import from an external COM library, for instance, the Windows shell.

## CompileIf(Bool)

Syntax: **[CompileIf(** condition **)]**

Applicable to: [procedure definitions](/tB/Gloss/#procedure)

Controls the conditional compilation of a procedure definition. Has no default value.

## ConstantFoldable

Syntax: **[ConstantFoldable]**

Applicable to: [**Function**](/tB/Core/Function)

Specify this attribute for functions where when called with non-variable input, will be computed at compile time, rather than runtime. For example, a function to converted string literals to ANSI. The result would never change, so the resulting ANSI string is stored, rather than recomputing every run. Such functions are also called *pure functions*, because their output only depends on the arguments, and not on the state of the program.

## Debuggable(Bool)

{: #debuggable }

Syntax: **[Debuggable(True** \| **False)]**

Applicable to: [**Module**](/tB/Core/Module), [procedure in a Class or Module](/tB/Gloss/#procedure)

When false, turns of breakpoints and stepping for the method or module. The default value is **True**.

## DebugOnly

Syntax: **[DebugOnly]**

Applicable to: [procedure definitions](/tB/Gloss/#procedure)

Excludes calls to this procedure from the Build. They are only available when running from the IDE, i.e. debugging.

## Description(String) 
{: #description }

Syntax: **[Description("** arbitrary text **")]**

Applicable to: [**Class**](/tB/Core/Class), [**CoClass**](/tB/Core/CoClass), [**Const**](/tB/Core/Const), [**Declare** (API declaration)](/tB/Core/Declare), [**Interface**](/tB/Core/Interface), [**Module**](/tB/Core/Module), [**Type** (UDT)](/tB/Core/Type)

Provides a description in information popups in the IDE, and is exported as a `helpstring` attribute in the type library (if applicable).

## DispId(Integer)

{: #dispid }

Syntax: **[DispId(** 123 **)]**

Applicable to: [procedure in an Interface](/tB/Gloss/#procedure)

Defines a dispatch ID associated with the procedure.

## DllExport

Syntax: **[DllExport]**

Applicable to: [procedures](/tB/Gloss/#procedure) and variables in a module.

It's possible to export a function or variable from standard modules. Example:

```vb
[DllExport]
Public Const MyExportedSymbol As Long = &H00000001
```

## DllStackCheck(Bool)

{: #dllstackcheck }

Syntax: **DllStackCheck( True** \| **False)**

Applicable to: [**Declare** (API declaration)](/tB/Core/Declare)

Gives minor codegen size reduction on 32-bit API calls on the Intel platform. Has no effect on other platforms.

## EnumId(String)

{: #enumid }

Syntax: **[EnumId("** 00000000-0000-0000-0000-000000000000 **")]**

Applicable to: [**Enum**](/tB/Core/Enum)

Specifies a GUID to be associated with an enum in type libraries.

## Flags

Syntax: **[Flags]**

Applicable to: [**Enum**](/tB/Core/Enum)

Calculate implicit enum values as a flag set (powers of 2).

> [!NOTE]
> To prevent confusion, once an explicit value is used, all remaining values after it must also be explicit)

![image](Images/flags attribute.png)

## FloatingPointErrorChecks(Bool)

{: #floatingpointerrorchecks }

Syntax: **FloatingPointErrorChecks( True** \| **False)**

Applicable to: [**Class**](/tB/Core/Class), [**Module**](/tB/Core/Module), [procedure](/tB/Gloss/#procedure)

Disables floating point error checks. Used on performance-critical routines. The default value is **True**.

## Hidden

Syntax: **[Hidden]**

Applicable to: [**CoClass**](/tB/Core/CoClass), [**Interface**](/tB/Core/Interface)

Hides the interface or coclass from certain Intellisense and other lists.

## IntegerOverflowChecks(Bool)

{: #integeroverflowchecks }

Syntax: **IntegerOverflowChecks( True** \| **False)**

Applicable to: [**Class**](/tB/Core/Class), [**Module**](/tB/Core/Module), [procedure](/tB/Gloss/#procedure)

Disables integer overflow checks. Used on performance-critical routines. The default value is **True**.

## InterfaceId(String)

{: #interfaceid }

Syntax: **[InterfaceId("**00000000-0000-0000-0000-000000000000**")]**

Applicable to: [**Interface**](/tB/Core/Interface)

twinBASIC supports defining COM interfaces using BASIC syntax, rather than needing an type library with IDL and C++. These are only supported in .twin files, not in legacy .bas or .cls files. They must appear *before* the [**Class**](/tB/Core/Class) or [**Module**](/tB/Core/Module) statement, and will always have a project-wide scope. the The generic form for is as follows:

``` vb
[InterfaceId ("00000000-0000-0000-0000-000000000000")]
*<attributes>*
Interface <name> Extends <base-interface>
    *<attributes>*
	<method 1>
	*<attributes>*
	<method 2>
	' ...
End Interface
```

The methods are [procedures](/tB/Gloss/#procedure).

For an overview of interfaces in tB, see [Defining interfaces](/Features/Overview#defining-interfaces).

## OleAutomation(Bool)

{: #oleautomation }

Syntax:  **[OleAutomation(True** \| **False)]**

Applicable to: [**Interface**](/tB/Core/Interface)

Controls whether this attribute is applied in the typelibrary. This attribute is set to **True** by default.

## PopulateFrom(...)

{: #populatefrom }

Syntax: **[PopulateFrom("json", "**internal path to .json**", "** table field **", "** name field **", "** value field **" )]**

Applicable to: [**Enum**](/tB/Core/Enum)

Populates an **Enum** with values from a json file bundled with the project.

The path to the .json file, and the field names, are arbitrary. Thus, the json file doesn't have to be in the Resources folder within the project.

In the future, this attribute may be expanded to allow more data file types, and more context of use besides **Enum**.

For example, consider this enum declaration in a .twin file:

``` vb
[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "events", "name", "id")]
Enum EVENTS
End Enum
```

Then, there should be a `/Resources/MESSAGETABLE/Strings.json` file with following structure:

``` json
{
    "events": 
    [
        {
            "id": -1073610751,
            "name": "service_started",
            "LCID_0000": "%1 service started"
        },
    ],
}
```

The result is as-if we hand-typed the following **Enum** definition:

``` vb
Enum EVENTS
    service_started = -1073610751
End Enum
```

## PredeclaredID

Syntax: **[PredeclaredId]**

Applicable to: [**Class**](/tB/Core/Class)

When set, a global instance of the class is created when the application starts.

This attribute is equivalent to the `VB_PredeclaredId` attribute in VBx .cls files.

## PreserveSig(Bool)

{: #preservesig }

Syntax: **[PreserveSig** [ **(** **True** \| **False** **)** ] **]**

Applicable to: Method in an [Interface](/tB/Core/Interface), [API Declarations](/tB/Core/Declare).

Default value: **False** in an Interface, **True** in an API Declare.

In COM interfaces, the default value of this attribute is **False**, since normally methods return an HRESULT that the language hides from you. **[PreserveSig** [ **(True)** ] **]** overrides this behavior and defines the function exactly as you provide. This is necessary if you need to define it as returning something other than a 4-byte **Long**, or want to handle the result yourself, bypassing the normal runtime error raised if the return value is negative (this is helpful when a negative value indicates an expected, acceptable failure, rather than a true error, like when an enum interface is out of items).

In APIs, the default value of this attribute is `True`. So therefore, you can specify `False` in order to rewrite the last parameter as a return. Example:

``` vb
Public Declare PtrSafe Function SHGetDesktopFolder Lib "shell32" (ppshf As IShellFolder) As Long
```

can be rewritten as

```vb
[PreserveSig(False)] 
Public Declare PtrSafe Function SHGetDesktopFolder Lib "shell32" () As IShellFolder`
```

## Restricted

Syntax: **[Restricted]**

Applicable to: [**Interface**](/tB/Core/Interface)

Restricts the interface methods from being called in most contexts.

This is attribute has the same function as the [**restricted** MIDL attribute][MIDL restricted].

[MIDL restricted]: https://learn.microsoft.com/en-us/windows/win32/midl/restricted

## RunAfterBuild

Syntax: **[RunAfterBuild]**

Applicable to: [**Function**](/tB/Core/Function), [**Sub**](/tB/Core/Sub)

Specifies a function that runs after your exe is built. Tthere's `App.LastBuildPath` to know where it is if you're e.g. signing the executable.

## SetDllDirectory(Bool)

{: #setdlldirectory }

Syntax: **[SetDllDirectory( True** \| **False)]**

Applicable to: [**Declare** (API declaration)](/tB/Core/Declare), [**Module**](/tB/Core/Module)

Allows an explicitly loaded DLL to load its own dependencies from it's load path. Also has the effect of allowing searching the app path for the DLLs in the base app's declare statements. It can be used per-declare or within a module.

## TypeHint(EnumType)

{: #typehint }

Syntax: **[TypeHint(** an enum type **)]**

Applicable to: [procedure](/tB/Gloss/#procedure) parameters

Allows populating Intellisense with an enum for types other than **Long**.

## Unimplemented

Syntax: **[Unimplemented]**

Applicable to: [procedure](/tB/Gloss/#procedure) definitions

Makes the compiler issue a warning about the procedure being unimplemented wherever it's called. You can upgrade it to an error too.

