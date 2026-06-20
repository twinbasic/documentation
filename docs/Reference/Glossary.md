---
title: Glossary
parent: Reference Section
nav_order: 99
permalink: /tB/Gloss
vba_attribution: true
---

## accelerator key

A single character used as a shortcut for selecting an object. Pressing the ALT key followed by the accelerator key gives focus to the object and initiates one or more events associated with the object. The specific event or events initiated varies from one object to another. If code is associated with an event, it is processed when the event is initiated. Also called *keyboard accelerator*, *shortcut key*, *keyboard shortcut*, or *access key*.

## ActiveX control

An object placed on a form to enable or enhance a user's interaction with an application. ActiveX controls have events and can be incorporated into other controls. These controls have an `.ocx` file name extension.

## ActiveX object

An object that is exposed to other applications or programming tools through Automation interfaces. Also called an *Automation object*.

## add-in

A customized tool that adds capabilities to the twinBASIC development environment.

## ANSI character set

The American National Standards Institute (ANSI) 8-bit character set used to represent up to 256 characters (0&ndash;255). The first 128 characters (0&ndash;127) correspond to the letters and symbols on a standard U.S. keyboard. The second 128 characters (128&ndash;255) represent special characters, such as letters in international alphabets, accents, currency symbols, and fractions.

## application

A collection of code and visual elements that work together as a single program. Developers build and run applications within the development environment, while users usually run applications as executable files outside the development environment.

## argument

A constant, [variable](#variable), or [expression](#expression) passed to a [procedure](#procedure).

## array

A set of sequentially indexed elements having the same intrinsic [data type](#data-type). Each element of an array has a unique identifying index number. Changes made to one element of an array don't affect the other elements.

## ASCII character set

The American Standard Code for Information Interchange (ASCII) 7-bit character set used to represent letters and symbols found on a standard U.S. keyboard. The ASCII character set is the same as the first 128 characters (0&ndash;127) in the [ANSI character set](#ansi-character-set).

## attribute

(twinBASIC) Metadata attached to a [module](#module), procedure, parameter, or other declaration, written in square brackets --- for example, `[Documentation("...")]`. Some attributes control compiler behaviour (such as `[PackingAlignment]` on a [user-defined type](#user-defined-type) or `[VB_UserMemId]` on a member); others are informational. Attributes are a twinBASIC addition; classic VBA exposes only a small fixed set via the `Attribute` directive.

## Automation object

See [ActiveX object](#activex-object).

## background color

The color of the client region of an empty window or display screen, on which all drawing and color display takes place.

## base class

The original class from which other classes can be derived by inheritance.

## bitmap

An image represented by pixels and stored as a collection of bits in which each bit corresponds to one pixel. On color systems, more than one bit corresponds to each pixel. A bitmap usually has a `.bmp` file name extension.

## bitwise comparison

A bit-by-bit comparison between identically positioned bits in two numeric expressions.

## Boolean data type

A [data type](#data-type) with only two possible values, **True** (`-1`) or **False** (`0`). **Boolean** variables are stored as 16-bit (2-byte) numbers.

## Boolean expression

An [expression](#expression) that evaluates to either **True** or **False**.

## bound

Describes a control whose contents are associated with a particular [data source](#data-source).

## bound control

A data-aware control that provides access to a specific field or fields in a data source. When the current record in a data source changes, all bound controls connected to that data source update to display data from fields in the current record. When the user changes data in a bound control and then moves to a different record, the changes are automatically saved.

## break mode

Temporary suspension of program execution in the development environment. In break mode, you can examine, debug, reset, step through, or continue program execution. You enter break mode when you:

- Encounter a [breakpoint](#breakpoint) during program execution.
- Press CTRL+BREAK during program execution.
- Encounter a [**Stop**](Core/Stop) statement or untrapped run-time error during program execution.
- Add a *Break When True* [watch expression](#watch-expression); execution stops when the value of the watch changes and evaluates to **True**.
- Add a *Break When Changed* watch expression; execution stops when the value of the watch changes.

## breakpoint

A selected program line at which execution automatically stops. Breakpoints are not saved with your code.

## by reference

A way of passing the address of an argument to a procedure instead of passing the value. This allows the procedure to access the actual variable. As a result, the variable's actual value can be changed by the procedure to which it is passed. Unless otherwise specified, arguments are passed by reference. Use the **ByRef** keyword to make this explicit.

## by value

A way of passing the value of an argument to a procedure instead of passing the address. This allows the procedure to access a copy of the variable. As a result, the variable's actual value can't be changed by the procedure to which it is passed. Use the **ByVal** keyword to pass an argument by value.

## Byte data type

A [data type](#data-type) used to hold positive integer numbers ranging from 0 to 255. **Byte** variables are stored as single, unsigned 8-bit (1-byte) numbers.

## character code

A number that represents a particular character in a set, such as the [ANSI character set](#ansi-character-set) or [Unicode](#unicode).

## class

The formal definition of an object. The class acts as the template from which an instance of an object is created at run time. The class defines the properties of the object and the methods used to control the object's behavior.

## class level

Describes code in the Declarations section of a class. Any code outside a procedure is referred to as class-level code. Declarations must be listed first, followed by procedures.

## class module

A [module](#module) that contains the definition of one or more [classes](#class), including their property and method definitions.

## clear

To change a setting to "off" or remove a value.

## code module

See [standard module](#standard-module). *Code module* is the older term still used in some documentation.

## collection

An object that contains a set of related objects. An object's position in the collection can change whenever a change occurs in the collection; therefore, the position of any specific object in the collection can vary. The [**Collection**](Modules/Collection) class is the standard example; instances of the class are collections. Collections must implement a method called `NewEnum` that accepts no arguments, returns an appropriate **IUnknown** object, and has its [`VB_UserMemId`](#attribute) attribute set to `-4`.

## command line

The path, file name, and argument information provided by the user to run a program.

## comment

Text added to code that explains how the code works. In twinBASIC, a comment can start with either an apostrophe (`'`) or with the **Rem** keyword followed by a space, and extends to the end of the line.

## comparison operator

A symbol or word indicating a relationship between two or more values or expressions. These operators include less than (`<`), less than or equal to (`<=`), greater than (`>`), greater than or equal to (`>=`), not equal (`<>`), and equal (`=`). Additional comparison operators include [**Is**](Core/Is), [**IsNot**](Core/IsNot), and [**Like**](Core/Like). Note that **Is** and **Like** can't be used as comparison operators in a [**Select Case**](Core/Select-Case) statement. See [Comparison Operators](Core/Comparison-Operators).

## compile time

The period during which source code is translated to executable code.

## compiler directive

A command used to alter the action of the compiler --- for example, the [conditional compilation](#conditional-compiler-constant) directives `#If`, `#Else`, `#ElseIf`, and `#End If`, or the `#Const` directive. See [Preprocessor directives](Core/Topic-Preprocessor).

## conditional compiler constant

A twinBASIC identifier defined using the `#Const` compiler directive (or set in the project's compilation conditions) and used by other compiler directives to determine when or if certain blocks of code are compiled. See [Preprocessor directives](Core/Topic-Preprocessor).

## constant

A named item that retains a constant value throughout the execution of a program. A constant can be a string or numeric literal, another constant, or any combination that includes arithmetic or logical operators except [**Is**](Core/Is) and exponentiation. Each host application can define its own set of constants. Additional constants can be defined by the user with the [**Const**](Core/Const) statement. Use constants anywhere in your code in place of actual values.

## container

An object that can contain other objects.

## context ID

A unique number or string that corresponds to a specific object in an application. Context IDs are used to create links between the application and corresponding Help topics.

## control

An object placed on a form that has its own set of recognized properties, methods, and events. Controls are used to receive user input, display output, and trigger event procedures. Most controls can be manipulated using methods. Some controls are interactive (responsive to user actions), while others are static (accessible only through code). See the [VB package](Packages/VB/) for the standard set of controls.

## control array

A group of controls that share a common name, type, and event procedures. Each control in an array has a unique index number that can be used to determine which control recognizes an event.

## Currency data type

A [data type](#data-type) with a range of -922,337,203,685,477.5808 to 922,337,203,685,477.5807. Use this data type for calculations involving money and for fixed-point calculations where accuracy is particularly important. The at sign (`@`) [type-declaration character](#type-declaration-character) represents **Currency**.

## cursor

A piece of software that returns rows of data to the application. A cursor on a result set indicates the current position in the result set.

## data format

The structure or appearance of a unit of data, such as a file, a database record, a cell in a spreadsheet, or text in a word-processing document.

## data source

The location of data to which a control is bound, for example, a cell in a worksheet or a field in a database row. The current value of the data source can be stored in the `Value` property of a control. However, the control does not store the data; it only displays the information that is stored in the data source.

## data type

The characteristic of a variable that determines what kind of data it can hold. Intrinsic data types include [**Byte**](#byte-data-type), [**Boolean**](#boolean-data-type), [**Integer**](#integer-data-type), [**Long**](#long-data-type), [**LongLong**](#longlong-data-type), [**LongPtr**](#longptr-data-type), [**Currency**](#currency-data-type), [**Decimal**](#decimal-data-type), [**Single**](#single-data-type), [**Double**](#double-data-type), [**Date**](#date-data-type), [**String**](#string-data-type), [**Object**](#object-data-type), [**Variant**](#variant-data-type) (default), as well as [user-defined types](#user-defined-type) and specific types of objects.

## Date data type

A [data type](#data-type) used to store dates and times as a real number. **Date** variables are stored as 64-bit (8-byte) numbers. The value to the left of the decimal represents a date, and the value to the right of the decimal represents a time.

> [!NOTE]
> In twinBASIC, [`Date`](Modules/DateTime/Date) and [`Time`](Modules/DateTime/Time) (and their `$` variants) are exposed as **properties**, not statements/functions as in classic VBA.

## date expression

Any expression that can be interpreted as a date, including date literals, numbers that look like dates, strings that look like dates, and dates returned from functions. A date expression is limited to numbers or strings, in any combination, that can represent a date from January 1, 100 to December 31, 9999.

Dates are stored as part of a real number. Values to the left of the decimal represent the date; values to the right of the decimal represent the time. Negative numbers represent dates prior to December 30, 1899.

## date literal

Any sequence of characters with a valid format that is surrounded by number signs (`#`). Valid formats include the date format specified by the locale settings for your code or the [universal date format](#universal-date-format).

For example, `#12/31/92#` is the date literal that represents December 31, 1992, where English-U.S. is the locale setting for your application. Use date literals to maximize portability across national languages.

## date separators

Characters used to separate the day, month, and year when date values are formatted. The characters are determined by system settings or by the [**Format**](Modules/Strings/Format) function.

## DBCS

A character set that uses 1 or 2 bytes to represent a character, allowing more than 256 characters to be represented.

## declaration

Nonexecutable code that names a constant, [variable](#variable), or [procedure](#procedure), and specifies its characteristics, such as data type. For DLL procedures, declarations specify names, libraries, and arguments.

## Decimal data type

A [data type](#data-type) that contains decimal numbers scaled by a power of 10. For zero-scaled numbers (integers with no fractional part), the range is +/-79,228,162,514,264,337,593,543,950,335. For numbers with 28 decimal places the range is +/-7.9228162514264337593543950335. The smallest non-zero value that can be represented as a **Decimal** is `0.0000000000000000000000000001`.

> [!NOTE]
> Unlike classic VBA --- where **Decimal** was usable only as a **Variant** subtype produced by **CDec** --- twinBASIC supports **Decimal** as a first-class declared type. You can write `Dim x As Decimal`.

## designer

A visual design surface in the twinBASIC development environment used to design forms, controls, and other classes visually.

## design time

The time during which an application is built in the development environment by adding controls, setting control or form properties, and writing code. In contrast, during [run time](#run-time), the application is interacted with as a user.

## development environment

The part of the application where you write code, create controls, set control and form properties, and so on. This contrasts with running the application.

## docked window

A window that is attached to the frame of the main window.

## document

Any self-contained work created with an application and given a unique file name.

## dominant control

A reference for the *Align* command and *Make Same Size* command on the *Format* menu. When aligning controls, the selected controls align to the dominant control. When sizing controls, the selected controls are assigned the dimensions of the dominant control.

## Double data type

A [data type](#data-type) that holds double-precision floating-point numbers as 64-bit numbers in the range -1.79769313486231E308 to -4.94065645841247E-324 for negative values, and 4.94065645841247E-324 to 1.79769313486232E308 for positive values. The number sign (`#`) [type-declaration character](#type-declaration-character) represents **Double**.

## drop source

The selected text or object that is dragged in a drag-and-drop operation.

## dynamic data exchange (DDE)

An established protocol for exchanging data through active links between applications that run under Microsoft Windows.

## dynamic-link library (DLL)

A library of routines loaded and linked into applications at run time. DLLs are typically created with other programming languages such as C. External DLL procedures are made callable in twinBASIC with the [**Declare**](Core/Declare) statement.

## Empty

Indicates that no beginning value has been assigned to a [**Variant**](#variant-data-type) variable. An **Empty** variable is represented as 0 in a numeric context or a zero-length string (`""`) in a string context.

## enumerated constant

A named constant whose value is a member of an enumeration type defined with the [**Enum**](Core/Enum) statement. Additional information for an enumerated data item can usually be found in the description of the property, method, or event that uses the enumeration.

## error number

A whole number in the range 0 to 65,535 that corresponds to the `Number` property setting of the [**Err**](Modules/Information/Err) object. When combined with the `Description` property setting of the **Err** object, this number represents a particular error message.

## event source object

An object that is the source of events that occur in response to an action. An event source object is typically returned by a property.

## executable file

A Windows-based application that can run outside the development environment. An executable file has an `.exe` file name extension.

## expression

A combination of keywords, operators, variables, and constants that yields a string, number, or object. An expression can be used to perform a calculation, manipulate characters, or test data.

## file number

A number used in the [**Open**](Core/Open) statement to open a file. Use file numbers in the range 1&ndash;255 (inclusive) for files not accessible to other applications. Use file numbers in the range 256&ndash;511 for files accessible from other applications.

## focus

The ability to receive mouse clicks or keyboard input at any one time. In the Microsoft Windows environment, only one window, form, or control can have this ability at a time. The object that "has the focus" is normally indicated by a highlighted caption or title bar. The focus can be set by the user or by the application.

## foreground color

The color currently selected for drawing or displaying text on screen. In monochrome displays, the foreground color is the color of a bitmap or other graphic.

## form

A window or dialog box. Forms are containers for [controls](#control). A multiple-document interface (MDI) form can also act as a container for child forms and some controls.

## form module

A file in a twinBASIC project that contains the graphical description of a form along with its controls and their property settings, form-level declarations of constants, variables, and external procedures, and event and general procedures. In twinBASIC source projects, form modules are stored as `.twin` files.

## Function procedure

A [procedure](#procedure) that performs a specific task within a program and returns a value. A **Function** procedure begins with a [**Function**](Core/Function) statement and ends with an **End Function** statement.

## general procedure

A [procedure](#procedure) that must be explicitly called by another procedure. In contrast, an event procedure is invoked automatically in response to a user or system action.

## graphics method

A method that operates on an object such as a **Form**, **PictureBox**, or **Printer**, and performs run-time drawing operations such as animation or simulation. Graphics methods include **Circle**, **Cls**, **Line**, **PaintPicture**, **Point**, **Print**, and **PSet**.

## host application

Any application that hosts a twinBASIC project or component, for example, an Office application that loads a compiled twinBASIC COM add-in.

## icon

A graphical representation of an object or concept; commonly used to represent minimized applications in Microsoft Windows. An icon is a bitmap with a maximum size of 32 x 32 pixels. Icons have an `.ico` file name extension.

## identifier

An element of an expression that refers to a constant, variable, procedure, or other named entity.

## in process

Running in the same address space as an application.

## inherited property

A property that has acquired the characteristics of another class through inheritance.

## Input Method Editor (IME)

An application that translates what you type into characters of a DBCS language, such as Japanese or Chinese. As the user types, the IME displays possible equivalents. The user selects the most appropriate entry.

## insertable object

An application object that is a type of custom control, such as a Microsoft Excel worksheet, that can be inserted into a host document.

## Integer data type

A [data type](#data-type) that holds integer variables stored as 2-byte whole numbers in the range -32,768 to 32,767. The **Integer** data type is also used to represent enumerated values. The percent sign (`%`) [type-declaration character](#type-declaration-character) represents an **Integer**.

## intrinsic constant

A constant provided by the language or a referenced library. Intrinsic constants can be viewed in the IDE's object browser. Because intrinsic constants can't be disabled, a user-defined constant with the same name can't be created.

## keyboard state

A return value that identifies which keys are pressed and whether the keyboard modifiers SHIFT, CTRL, and ALT are pressed.

## keyword

A word or symbol recognized as part of the twinBASIC programming language; for example, a statement, function name, or operator.

## line-continuation character

The combination of a space followed by an underscore (`_`) used in source code to extend a single logical line of code to two or more physical lines. A line-continuation character can't be used to continue a line of code within a string expression.

## line label

A label used to identify a single line of code. A line label can be any combination of characters that starts with a letter and ends with a colon (`:`). Line labels are not case sensitive and must begin in the first column.

## line number

A number used to identify a single line of code. A line number can be any combination of digits that is unique within the module where it is used. Line numbers must begin in the first column.

## locale

The set of information that corresponds to a given language and country/region. The code locale setting affects the language of terms such as keywords and defines locale-specific settings such as the decimal and list separators, date formats, and character sorting order.

The system locale setting affects the way locale-aware functionality behaves, for example, when you display numbers or convert strings to dates. You set the system locale using the **Control Panel** utilities provided by the operating system.

Although the code locale and system locale are generally set to the same setting, they may differ in some situations. For example, in Visual Basic, Standard Edition and Visual Basic, Professional Edition, the code is not translated from English-U.S. The system locale can be set to the user's language and country/region, but the code locale is always set to English-U.S. and can't be changed. In this case, the English-U.S. separators, format placeholders, and sorting order are used.

## logic error

A programming error that can cause code to produce incorrect results or stop execution. For example, a logic error can be caused by incorrect variable names, incorrect variable types, endless loops, flaws in comparisons, or array problems.

## Long data type

A 4-byte integer ranging in value from -2,147,483,648 to 2,147,483,647. The ampersand (`&`) [type-declaration character](#type-declaration-character) represents a **Long**.

## LongLong data type

(twinBASIC) An 8-byte integer ranging in value from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807. Valid as a declared type only on 64-bit platforms (or for DLL [**Declare**](Core/Declare) signatures targeting 64-bit). The caret-sign (`^`) [type-declaration character](#type-declaration-character) represents a **LongLong**.

## LongPtr data type

(twinBASIC) A platform-dependent integer used to hold pointer or handle values. **LongPtr** is 4 bytes on 32-bit platforms and 8 bytes on 64-bit platforms. Use **LongPtr** rather than **Long** or **LongLong** when declaring DLL parameters that hold pointers or handles, so that the same source compiles correctly on both platforms.

## MDI child

A form contained within an MDI form in a multiple-document interface (MDI) application. To create a child form, set the `MDIChild` property of the form to **True**.

## MDI form

A window that makes up the background of a multiple-document interface (MDI) application. The MDI form is the container for any MDI child forms in the application.

## member

An element of a collection, object, or user-defined type.

## metafile

A file that stores an image as graphical objects such as lines, circles, and polygons rather than as pixels. There are two types of metafiles, standard and enhanced. Standard metafiles usually have a `.wmf` file name extension; enhanced metafiles usually have an `.emf` file name extension. Metafiles preserve an image more accurately than pixels when the image is resized.

## method

A [procedure](#procedure) that acts on an object.

## module

A set of declarations followed by procedures.

## module level

Describes code in the Declarations section of a module. Any code outside a procedure is referred to as module-level code. Declarations must be listed first, followed by procedures. This term also includes the [class module](#class-module).

## module variable

A variable declared outside [**Function**](Core/Function), [**Sub**](Core/Sub), or [**Property**](Core/Property) procedure code. Module variables must be declared outside any procedures in the module. They exist while the module is loaded and are visible in all procedures in the module.

## named argument

An argument that has a name that is predefined in the object library. Instead of providing a value for each argument in a specified order expected by the syntax, named arguments can be used to assign values in any order. For example, suppose a method accepts three arguments:

> **DoSomething** *namedarg1, namedarg2, namedarg3*

By assigning values to named arguments, you can write:

```tb
DoSomething namedarg3 := 4, namedarg2 := 5, namedarg1 := 20
```

Note that the named arguments don't have to appear in the normal positional order in the syntax.

## Null

A value indicating that a variable contains no valid data. **Null** is the result of an explicit assignment of **Null** to a variable or any operation between expressions that contain **Null**.

## numeric data type

Any intrinsic numeric [data type](#data-type) (**Byte**, **Boolean**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency**, **Decimal**, **Single**, **Double**, or **Date**).

## numeric expression

Any [expression](#expression) that can be evaluated as a number. Elements of an expression can include any combination of keywords, variables, constants, and operators that result in a number.

## object

A combination of code and data that can be treated as a unit, for example, a control, form, or application component. Each object is defined by a class.

## Object Browser

A dialog box in which you can examine the contents of an object library to get information about the objects provided.

## Object data type

A [data type](#data-type) that represents any object reference. **Object** variables are stored as pointer-sized addresses that refer to objects (4 bytes on 32-bit platforms, 8 bytes on 64-bit platforms).

## object expression

An expression that specifies a particular object and can include any of the object's containers. For example, an application can have an **Application** object that contains a **Document** object that contains a **Text** object.

## object library

A file containing standard descriptions of exposed objects, properties, and methods. Object library files typically have an `.olb` or `.tlb` extension. Use the [Object Browser](#object-browser) to examine the contents of an object library to get information about the objects provided.

## object module

A module that contains code specific to an object, for example, a class module or form module. Object modules contain the code behind their associated objects. The rules for object modules differ from those for [standard modules](#standard-module).

## object type

A type of object exposed by an application through Automation, for example, **Application**, **File**, **Range**, or **Sheet**. Refer to the application's documentation for a complete listing of available objects.

## object variable

A variable that contains a reference to an object.

## package

A unit of distribution and reference for twinBASIC code. A package bundles modules, classes, types, enums, and other declarations together, and can be referenced from a project as a single dependency. The twinBASIC runtime libraries are delivered this way: the [VBA](Packages/VBA) package mirrors classic VBA's runtime, the [VBRUN](Packages/VBRUN/) package provides VB6's runtime objects, and the [VB](Packages/VB/) package supplies the standard control classes. Developers can author and publish their own packages.

## parameter

A variable name by which an argument passed to a procedure is known within the procedure. This variable receives the argument passed into the procedure. Its scope ends when the procedure ends.

## path

A string expression specifying a directory or folder location. The location can include a drive specification.

## pi

A mathematical constant equal to approximately 3.1415926535897932.

## placeholder

A character that masks or hides another character for security reasons. For example, when a user types a password, an asterisk is displayed on the screen to take the place of each character typed.

## point

A point is 1/72 inch. Font sizes are usually measured in points.

## print zone

Print zones begin every 14 columns. The width of each column is an average of the width of all characters in the point size for the selected font.

## Private

Describes variables, procedures, or types that are visible only to the module in which they are declared. See the [**Private**](Core/Private) statement.

## procedure

A named sequence of statements executed as a unit. For example, [**Function**](Core/Function), [**Property**](Core/Property), and [**Sub**](Core/Sub) are types of procedures. A procedure name is always defined at module level. All executable code must be contained in a procedure. Procedures can't be nested within other procedures.

## procedure call

A statement in code that tells twinBASIC to execute a procedure. See [**Call**](Core/Call).

## procedure level

Describes statements located within a [**Function**](Core/Function), [**Property**](Core/Property), or [**Sub**](Core/Sub) procedure. Declarations are usually listed first, followed by assignments and other executable code.

Note that module-level code resides outside a procedure block.

## project

A set of modules.

## property

A named attribute of an object. Properties define object characteristics such as size, color, and screen location, or the state of an object, such as enabled or disabled.

## property page

A grouping of properties presented as a tabbed page of a property sheet.

## Property procedure

A [procedure](#procedure) that creates and manipulates properties for a class module. A **Property** procedure begins with a [**Property Let**, **Property Get**, or **Property Set**](Core/Property) statement and ends with an **End Property** statement.

## Public

Describes variables declared using the [**Public**](Core/Public) statement, which are visible to all procedures in all modules in all applications unless [**Option Private Module**](Core/Option#Private) is in effect. In that case, the variables are public only within the project in which they reside.

## referenced project

A project that is directly linked to from the current project. A project referenced by one of the current project's directly referenced projects is called an *indirectly referenced project*. Its **Public** variables are not accessible to the current project except through qualification with its project name. Any combination of direct and indirect references between projects is valid as long as they don't result in a cycle.

## referencing project

The current project. **Public** variables in a directly referenced project are visible to the directly referencing project, but **Public** variables in a directly referencing project are not visible to a directly referenced project.

## registry

A central configuration database in Microsoft Windows used for user, application, and computer-specific information.

## resource file

A file in a twinBASIC project that can contain bitmaps, text strings, or other data. By storing this data in a separate file, you can change the information without editing your code.

## RGB

A color value system used to describe colors as a mixture of red \(R\), green (G), and blue (B). The color is defined as a set of three integers (R, G, B) where each integer ranges from 0&ndash;255. A value of 0 indicates a total absence of a color component; a value of 255 indicates the highest intensity of a color component. See [**RGB**](Modules/Information/RGB) and [**RGBA**](Modules/Information/RGBA).

## run time

The time during which code is running. During run time, you can't edit the code.

## run-time error

An error that occurs when code is running. A run-time error results when a statement attempts an invalid operation.

## scope

Defines the visibility of a variable, procedure, or object. For example, a variable declared as [**Public**](Core/Public) is visible to all procedures in all modules in a directly referencing project unless [**Option Private Module**](Core/Option#Private) is in effect. When **Option Private Module** is in effect, the module itself is private and therefore not visible to referencing projects. Variables declared in a procedure are visible only within the procedure and lose their value between calls unless they are declared [**Static**](Core/Static).

## seed

An initial value used to generate pseudorandom numbers. For example, the [**Randomize**](Modules/Math/Randomize) statement creates a seed number used by the [**Rnd**](Modules/Math/Rnd) function to create unique pseudorandom number sequences.

## Single data type

A [data type](#data-type) that stores single-precision floating-point variables as 32-bit (4-byte) floating-point numbers, ranging in value from -3.402823E38 to -1.401298E-45 for negative values, and 1.401298E-45 to 3.402823E38 for positive values. The exclamation point (`!`) [type-declaration character](#type-declaration-character) represents a **Single**.

## sort order

A sequencing principle used to order data, for example, alphabetic, numeric, ascending, descending, and so on.

## stack

A fixed amount of memory used by twinBASIC to preserve local variables and arguments during procedure calls.

## standard module

A module containing only procedure, type, and data declarations and definitions. Module-level declarations and definitions in a standard module are **Public** by default. A standard module is sometimes referred to as a *code module*.

## statement

A syntactically complete unit that expresses one kind of action, declaration, or definition. A statement generally occupies a single line, although a colon (`:`) can be used to include more than one statement on a line. A [line-continuation character](#line-continuation-character) (`_`) can also be used to continue a single logical line onto a second physical line.

## string comparison

A comparison of two sequences of characters. Use [**Option Compare**](Core/Option#Compare) to specify binary or text comparison. In English-U.S., binary comparisons are case sensitive; text comparisons are not.

## string constant

Any constant (defined using the [**Const**](Core/Const) keyword) consisting of a sequence of contiguous characters interpreted as the characters themselves rather than as a numeric value.

## String data type

A [data type](#data-type) consisting of a sequence of contiguous characters that represent the characters themselves rather than their numeric values. A **String** can include letters, numbers, spaces, and punctuation. The **String** data type can store fixed-length strings ranging in length from 0 to approximately 63K characters and dynamic strings ranging in length from 0 to approximately 2 billion characters. The dollar sign (`$`) [type-declaration character](#type-declaration-character) represents a **String**.

## string expression

Any [expression](#expression) that evaluates to a sequence of contiguous characters. Elements of a string expression can include a function that returns a string, a string literal, a string constant, a string variable, a string [**Variant**](#variant-data-type), or a function that returns a string **Variant**.

## string literal

Any expression consisting of a sequence of contiguous characters surrounded by quotation marks that is literally interpreted as the characters within the quotation marks.

## Sub procedure

A [procedure](#procedure) that performs a specific task within a program, but returns no explicit value. A **Sub** procedure begins with a [**Sub**](Core/Sub) statement and ends with an **End Sub** statement.

## syntax checking

A feature that checks code for correct syntax. When the syntax checking feature is enabled, a message is displayed when code containing a syntax error is entered, and the suspect code is highlighted.

## syntax error

An error that occurs when a line of code is entered that twinBASIC doesn't recognize.

## system colors

Colors that are defined by the operating system for a specific type of monitor and video adapter. In Windows, each color is associated with a specific part of the user interface, such as a window title or a menu.

## tab order

The order in which the focus moves from one field to the next as TAB or SHIFT+TAB is pressed.

## target

An object onto which the user drops the object being dragged in a drag-and-drop operation.

## time expression

Any expression that can be interpreted as a time. This includes any combination of time literals, numbers that look like times, strings that look like times, and times returned from functions.

Times are stored as part of a real number. Values to the right of the decimal represent the time. For example, midday (12:00 P.M.) is represented by 0.5.

## transparent

Describes the background of the object if the background is not visible. Instead of the background, whatever is behind the object is visible --- for example, an image or picture used as a backdrop in your application. Use the `BackStyle` property to make the background transparent.

## twip

A unit of screen measurement equal to 1/20 point. A twip is a screen-independent unit used to ensure that placement and proportion of screen elements in a screen application are the same on all display systems. There are approximately 1440 twips to a logical inch, or 567 twips to a logical centimeter (the length of a screen item measuring one inch or one centimeter when printed).

## type-declaration character

A character appended to a variable name indicating the variable's data type. By default, variables are of type [**Variant**](#variant-data-type) unless a corresponding [**Def***type*](Core/Deftype) statement is present in the module. The full set of type-declaration characters is:

| Char | Type            |
|:----:|:----------------|
| `%`  | **Integer**     |
| `&`  | **Long**        |
| `^`  | **LongLong**    |
| `@`  | **Currency**    |
| `!`  | **Single**      |
| `#`  | **Double**      |
| `$`  | **String**      |

## type library

A file or component within another file that contains standard descriptions of exposed objects, properties, and methods that are available for Automation. Object library files (`.olb`, `.tlb`) contain type libraries.

## unbound

Describes a control that is not related to a [data source](#data-source). In contrast, a [bound control](#bound-control) provides access to a data source for display or editing.

## Unicode

International Standards Organization (ISO) character standard. Unicode uses a 16-bit (2-byte) coding scheme that allows for 65,536 distinct character spaces. Unicode includes representations for punctuation marks, mathematical symbols, and dingbats, with substantial room for future expansion.

## universal date format

The universal date format is `#yyyy-mm-dd hh:mm:ss#`. Both the date component (`#yyyy-mm-dd#`) and the time component (`#hh:mm:ss#`) can be represented separately.

## user-defined type

Any data type defined using the [**Type**](Core/Type) statement. User-defined data types can contain one or more elements of any data type. Arrays of user-defined and other data types are created using the [**Dim**](Core/Dim) statement. Arrays of any type can be included within user-defined types. See [data type](#data-type).

## variable

A named storage location that can contain data that can be modified during program execution. Each variable has a name that uniquely identifies it within its scope. A data type can be specified or not.

Variable names must begin with an alphabetic character, must be unique within the same scope, can't be longer than 255 characters, and can't contain an embedded period or type-declaration character.

## Variant data type

A special [data type](#data-type) that can contain numeric, string, or date data as well as user-defined types and the special values [**Empty**](#empty) and [**Null**](#null). The **Variant** data type can contain data up to the range of a **Decimal**, plus character text and the platform-specific storage required for a string. The [**VarType**](Modules/Information/VarType) function defines how the data in a **Variant** is treated. All variables become **Variant** data types if not explicitly declared as some other data type.

## variant expression

Any [expression](#expression) that can evaluate to numeric, string, or date data, as well as the special values [**Empty**](#empty) and [**Null**](#null).

## watch expression

A user-defined expression that enables observation of the behavior of a variable or expression. Watch expressions appear in the watch window of the development environment and are automatically updated when [break mode](#break-mode) is entered. The watch window displays the value of an expression within a given context. Watch expressions are not saved with code.

## z-order

The visual layering of controls on a form along the form's z-axis (depth). The z-order determines which controls are in front of other controls.
