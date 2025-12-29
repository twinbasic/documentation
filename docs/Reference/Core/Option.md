---
title: Option
parent: Statements
permalink: /tB/Core/Option
---
# Option
{: .no_toc}

Configures a compiler option.

* TOC
{:toc}

## Option Base
{: #Base }

Syntax: **Option Base** { **0** \| **1** }

Used at the [module level](../Gloss#module-level) to declare the default lower bound for array subscripts.

Because the default base is **0**, the **Option Base** statement is never required.

If used, the statement must appear in a [module](../Gloss#module) or [class](../Gloss#class) before any procedures, functions, or properties. **Option Base** can appear only once in a module and must precede array [declarations](../Gloss#declaration) that include dimensions.

> [!NOTE]
> The **To** clause in the [**Dim**](Dim), [**Private**](Private), [**Public**](Public), [**ReDim**](ReDim), and [**Static**](Static) statements provides a more flexible way to control the range of an array's subscripts. However, if you don't explicitly set the lower bound with a **To** clause, you can use **Option Base** to change the default lower bound to 1. The base of an array created with the [**ParamArray**](ParamArray) keyword is zero; **Option Base** does not affect [**ParamArray**](ParamArray) (or the [**Array**](../Modules/VBA/Array) function, when qualified with the name of its type library, for example [**VBA.Array**](../Modules/VBA/Array)).

The **Option Base** statement only affects the lower bound of arrays in the module where the statement is located.

### Example of use at module level
{: .no_toc}

This example uses the **Option Base** statement to override the default base array subscript value of 0. The [**LBound**](LBound) function returns the smallest available subscript for the indicated dimension of an array. The **Option Base** statement is used at the module level only.

```vb
Module MyModule
    Option Base 1 ' Set the default array subscripts to 1. 
    Sub Example()
        Dim Lower 
        Dim MyArray(20), TwoDArray(3, 4) ' Declare array variables. 
        Dim ZeroArray(0 To 5) ' Override the default base subscript. 

        ' Use LBound function to test lower bounds of arrays. 
        Console.WriteLine LBound(MyArray)      ' Prints 1. 
        Console.WriteLine LBound(TwoDArray, 2) ' Returns 1. 
        Console.WriteLinee LBound(ZeroArray)   ' Returns 0. 
    End Sub
End Module
```

### Example of use at class level
{: .no_toc}

``` vb
Class Example1
    Option Base 1
    Sub New()
        Dim A1(5)
        Console.WriteLine LBound(A1)  ' Prints 1
    End Sub
End Class

Class Example0
    Option Base 0
    Sub New()
        Dim A0(5)
        Console.WriteLine LBound(A0)  ' Prints 0
    End Sub
End Class
```

## Option Explicit
{: #Explicit }

Syntax: **Option Explicit**

Used at the [module level](../Gloss#module-level) to force explicit declaration of all [variables](../Gloss#variable) in that [module](../Gloss#module).

If used, the **Option Explicit** statement must appear in a module before any [procedures](../Gloss#procedure).

This option makes it mandatory to require variable declarations. There is no complementary option to make the declarations optional.

When **Option Explicit** appears in a module, you must explicitly declare all variables by using the  [**Dim**](Dim), [**Private**](Private), [**Public**](Public), [**ReDim**](ReDim), and [**Static**](Static) **Static** statements. If you attempt to use an undeclared variable name, an error occurs at [compile time](../Gloss#compile-time).

If you don't use the **Option Explicit** statement, and when the [**Option Explicit On**](../IDE/Project/Settings#option-explicit-on) project setting is changed to its non-default value of *No*, all undeclared variables are of **Variant** type unless the default type is otherwise specified with a [**Def**_type_](Deftype) statement.

> [!NOTE]
> The **Option Explicit On** project setting is *Yes* by default in new projects.
>
> Use **Option Explicit** to avoid incorrectly typing the name of an existing variable or to avoid confusion in code where the [scope](../Gloss#scope) of the variable is not clear.

### Example of use at module level
{: .no_toc }

``` vb
Module MyModule
    Option Explicit ' Force explicit variable declaration. 
	Dim MyVar ' Declare variable. 
    Sub Example()
		MyInt = 10 ' Undeclared variable generates error. 
		MyVar = 10 ' Declared variable does not generate error. 
    End Sub
End Module
```

## Option Compare
{: #Compare }

Syntax: **Option Compare** { **Binary** \| **Text** \| **Database** }

If used, the **Option Compare** statement must appear in a [module](../Gloss#module) before any [procedures](../Gloss#procedure).

The **Option Compare** statement specifies the [string comparison](../Gloss#string-comparison) method (**Binary**, **Text**, or** Database**) for a module. If a module doesn't include an **Option Compare** statement, the default text comparison method is **Binary**.

* **Option Compare Binary** results in string comparisons based on a [sort order](../Gloss#sort-order) derived from the internal binary representations of the characters. In Microsoft Windows, sort order is determined by the code page. A typical binary sort order is shown in the following example:

  ```
  A < B < E < Z < a < b < e < z < À < Ê < Ø < à < ê < ø 
  ```

* **Option Compare Text** results in string comparisons based on a case-insensitive text sort order determined by your system's [locale](../Gloss#locale). When the same characters are sorted by using **Option Compare Text**, the following text sort order is produced:

  ```
  (A=a) < ( À=à) < (B=b) < (E=e) < (Ê=ê) < (Z=z) < (Ø=ø) 
  ```
* **Option Compare Database** has no effect in twinBASIC. When used within Microsoft Access, it results in string comparisons based on the sort order determined by the locale ID of the database where the string comparisons occur.

### Example
{: .no_toc }

This example uses the **Option Compare** statement to set the default string comparison method. The **Option Compare** statement is used at the module level only.

``` vb
Module ModBin
	' Set the string comparison method to Binary. 
	Option Compare Binary ' That is, "AAA" is less than "aaa". 
End Module

Module ModText
	' Set the string comparison method to Text. 
	Option Compare Text ' That is, "AAA" is equal to "aaa". 
End Module
```

## Option Private
{: #Private }

Syntax: **Option Private Module**

When used in applications that reference multiple [packages](../Gloss#package), **Option Private Module** prevents a [module's](../Gloss#module) or [class's](../Gloss#class) contents from being referenced outside its package.

If used, the **Option Private** statement must appear at [module level](../Gloss#module-level) or [class level](../Gloss#class-level), before any [procedures](../Gloss#procedure).

When a module contains **Option Private Module**, the public parts, for example, [variables](../Gloss#variable), [objects](../Gloss#object), and [user-defined types](../Gloss#user-defined-type) declared at the module level, are still available within the [project](../Gloss#project) containing the module, but they are not available to other applications or projects.

> [!NOTE]
> **Option Private** is a more verbose way of making modules or classes private to the package. An equivalent effect in a less verbose fashion is obtained with [**Private**](Private) statement as follows:
>
> ``` vb
> Private Module MyModule
>     ' ...
> End Module 
> 
> Private Class MyClass
>     ' ...
> End Class
> ```

### Example
{: .no_toc }

This example demonstrates the **Option Private** statement, which is used at module level to indicate that the entire module is private. With **Option Private Module**, module-level parts not declared **Private** are available to other modules in the project, but not to other projects or applications.

``` vb
Module MyModule
    Option Private Module ' Indicates that the module is private.
End Module    
```

{% include VBA-Attribution.md %}
