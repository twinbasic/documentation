---
title: IConnectionPoint
parent: COM Interfaces
permalink: /Reference/COM-Interfaces/IConnectionPoint
---

# IConnectionPoint interface
{: .no_toc }

Connects a client's sink to one outgoing interface of an object, and disconnects it again. It is the COM mechanism that delivers events: every class that declares [**Event**](../../tB/Core/Event) members is a connectable object, and a [**WithEvents**](../../tB/Core/WithEvents) variable connects to it through this interface. **IConnectionPointContainer**, the interface that finds the connection points of an object, has a section of its own below.

* TOC
{:toc}

## How connection points work

An object that raises events, the *source*, describes them as an *outgoing interface*: an interface that the source calls, and that the client implements. The client's implementation of it is the *sink*. The connection is made in five steps:

1. The source supports **IConnectionPointContainer**, so the client asks it for that interface with [**QueryInterface**](IUnknown).
2. The client asks the container for the connection point of the outgoing interface, by the interface's identifier with **FindConnectionPoint**, or by listing every point with **EnumConnectionPoints**.
3. The client creates the sink and passes it to the connection point's **Advise** method. The connection point asks the sink for the outgoing interface, keeps the pointer it gets, and returns a *cookie*: a number that identifies this connection.
4. When an event occurs, the source calls the matching method of every connected sink, in the order the connections were made.
5. The client passes the cookie to **Unadvise**. The source releases its pointer to the sink.

The outgoing interface of an object is usually a *dispinterface*, an interface whose methods are reached only through [**IDispatch**](IDispatch). A sink then receives each event as a call to its **Invoke** method, with the dispatch identifier of the event and the event's arguments in a **DISPPARAMS** structure.

## Declaration

**IConnectionPoint** derives from **IUnknown** and has the interface identifier `B196B286-BAB4-101A-B69C-00AA00341D07`. Its five methods return an **HRESULT**, which twinBASIC hides as it does for any interface method: a failure code raises a run-time error, and a success code other than `S_OK` is read with [**Err.LastHresult**](../../tB/Modules/ErrObject/LastHresult). A method whose last parameter is an output pointer is declared as a **Function** that returns it.

**stdole** has none of the interfaces on this page: a variable declared `As stdole.IConnectionPoint` is a compile error (TB5079, *Unrecognised datatype symbol*). A project declares its own copies, with the identifiers below.

The structures first, **GUID** for an interface identifier and **CONNECTDATA** for one item of an enumeration of connections:

```tb check_build projname=com-iconnpoint slot=file
Module ConnectionTypes
    Public Type GUID
        Data1 As Long
        Data2 As Integer
        Data3 As Integer
        Data4(0 To 7) As Byte
    End Type

    Public Type CONNECTDATA
        pUnk As stdole.IUnknown
        dwCookie As Long
    End Type
End Module
```

The two interfaces this page describes, and the two enumerators they return:

```tb check_build projname=com-iconnpoint slot=file
[InterfaceId("B196B284-BAB4-101A-B69C-00AA00341D07")]
Private Interface IConnectionPointContainer Extends stdole.IUnknown
    Function EnumConnectionPoints() As IEnumConnectionPoints
    Function FindConnectionPoint(ByRef riid As GUID) As IConnectionPoint
End Interface

[InterfaceId("B196B286-BAB4-101A-B69C-00AA00341D07")]
Private Interface IConnectionPoint Extends stdole.IUnknown
    Sub GetConnectionInterface(ByRef piid As GUID)
    Function GetConnectionPointContainer() As IConnectionPointContainer
    Function Advise(ByVal pUnkSink As stdole.IUnknown) As Long
    Sub Unadvise(ByVal dwCookie As Long)
    Function EnumConnections() As IEnumConnections
End Interface

[InterfaceId("B196B285-BAB4-101A-B69C-00AA00341D07")]
Private Interface IEnumConnectionPoints Extends stdole.IUnknown
    Sub Next(ByVal cConnections As Long, ByRef ppCP As IConnectionPoint, ByRef pcFetched As Long)
    Sub Skip(ByVal cConnections As Long)
    Sub Reset()
    Function Clone() As IEnumConnectionPoints
End Interface

[InterfaceId("B196B287-BAB4-101A-B69C-00AA00341D07")]
Private Interface IEnumConnections Extends stdole.IUnknown
    Sub Next(ByVal cConnections As Long, ByRef rgcd As CONNECTDATA, ByRef pcFetched As Long)
    Sub Skip(ByVal cConnections As Long)
    Sub Reset()
    Function Clone() As IEnumConnections
End Interface
```

*ppCP* and *rgcd* name the first element of the caller's array and nothing after it, which is enough to ask for one item at a time (see [The enumerators](#the-enumerators)).

The identifier of the outgoing interface of a class written in twinBASIC is not a fixed value, so a program never declares it. It reads the identifier from the connection point (see [Events in twinBASIC](#events-in-twinbasic)).

## IConnectionPoint methods

### GetConnectionInterface
{: .no_toc }

Returns the identifier of the outgoing interface that the connection point serves.

Syntax: *object*.**GetConnectionInterface** *piid*

*piid*
: *required* A **GUID** that receives the interface identifier.

The identifier is the one to pass to **FindConnectionPoint** to get the same connection point again, and the one a sink must answer to when it is advised.

### GetConnectionPointContainer
{: .no_toc }

Returns the container that the connection point belongs to.

Syntax: **Set** *container* **=** *object*.**GetConnectionPointContainer()**

The result is the object the connection point was found on, so a client that holds only the connection point can reach the other points of its source.

### Advise
{: .no_toc }

Connects a sink to the connection point.

Syntax: *cookie* **=** *object*.**Advise(** *pUnkSink* **)**

*pUnkSink*
: *required* The sink. The connection point asks it for the outgoing interface, so it must answer **QueryInterface** for that interface's identifier.

Returns a **Long**, the cookie that identifies the connection. The cookie is not zero when a connection was made, and no two connections of one connection point have the same one. The connection point holds a reference to the sink until the connection ends.

In twinBASIC:

- Cookies start at 1 for each source object and increase by one for every connection made. A cookie is not used again after its connection ends.
- A sink that does not answer for the outgoing interface fails with `E_NOINTERFACE` (`&H80004002`), where the COM contract names `CONNECT_E_CANNOTCONNECT`. VB6 returns `E_NOINTERFACE` too. An object of an ordinary twinBASIC class is such a sink, even when the class implements **IDispatch**, and so is a class declared **NotDispatchable** that implements it. A twinBASIC class cannot answer for the identifier, because the identifier of a class's event interface changes with every build and so cannot be declared. A sink that works is the object twinBASIC creates for a **WithEvents** variable, which **EnumConnections** returns (see the example).
- A sink that is already connected to the point is not connected a second time. **Advise** raises no error, returns 0, and adds nothing.
- Passing **Nothing** is a defect in BETA 997, described in the warning below.

> [!WARNING]
> BETA 997 has a defect: **Advise** with **Nothing** as the sink ends the program with an access violation, and any unsaved data is lost. The COM contract returns `E_POINTER`. VB6 ends with an access violation as well. Test the sink for **Nothing** before calling **Advise**.

### Unadvise
{: .no_toc }

Ends a connection.

Syntax: *object*.**Unadvise** *dwCookie*

*dwCookie*
: *required* A **Long**: the cookie that **Advise** returned.

The connection point releases the reference it held to the sink, and the source stops calling it. An event that the source raises afterwards does not reach that sink.

> [!WARNING]
> BETA 997 has a defect: **Unadvise** with a cookie that names no connection, 0 included, succeeds and does nothing, where the COM contract returns an error (`E_POINTER`). VB6 returns `CONNECT_E_NOCONNECTION` (`&H80040200`) for a cookie it never issued. A caller that releases a connection twice, or with a wrong cookie, is told that it worked.

A **WithEvents** variable whose connection was ended with **Unadvise** can still be set to **Nothing** without an error.

### EnumConnections
{: .no_toc }

Returns an enumerator over the connections that exist now.

Syntax: **Set** *connections* **=** *object*.**EnumConnections()**

Each item is a **CONNECTDATA**: *pUnk* is the sink, with a reference added that the caller owns, and *dwCookie* is the cookie of its connection. The items come in the order the connections were made. A caller counts the connections of a point, or finds the cookie of a sink, with it.

## IConnectionPointContainer

**IConnectionPointContainer** derives from **IUnknown** and has the interface identifier `B196B284-BAB4-101A-B69C-00AA00341D07`. An object that raises events supports it, with one connection point for each outgoing interface.

### EnumConnectionPoints
{: .no_toc }

Returns an enumerator over the connection points of the object.

Syntax: **Set** *points* **=** *object*.**EnumConnectionPoints()**

The enumerator is an **IEnumConnectionPoints**, which returns **IConnectionPoint** items.

### FindConnectionPoint
{: .no_toc }

Returns the connection point for one outgoing interface.

Syntax: **Set** *point* **=** *object*.**FindConnectionPoint(** *riid* **)**

*riid*
: *required* A **GUID**: the identifier of the outgoing interface.

Raises `CONNECT_E_NOCONNECTION` (`&H80040200`) when the object has no outgoing interface with that identifier. Called again with the same identifier it returns the same connection point object that **EnumConnectionPoints** returns.

## The enumerators

**IEnumConnectionPoints** and **IEnumConnections** follow the pattern of [**IEnumVARIANT**](IEnumVARIANT): **Next**, **Skip**, **Reset** and **Clone**. The two enumerators that twinBASIC supplies follow it.

**Next** returns the items asked for, or the items that are left when there are fewer, and sets *pcFetched* to the number it returned. When no item is left, it writes nothing, sets *pcFetched* to 0 and raises no error, so a loop ends when *pcFetched* is 0. For **IEnumConnections**, asking for two items when two connections exist returns both. **IEnumConnections** also accepts a null *pcFetched*.

**Skip** raises no error, and **Reset** moves back to the start. **Clone** of **IEnumConnectionPoints** returns an enumerator and raises no error; **Clone** of **IEnumConnections** returns a new enumerator, which reads on its own.

## Events in twinBASIC

A class that declares [**Event**](../../tB/Core/Event) members is a connectable object, and the compiler writes all of its connection point support. What it does, in BETA 995:

- **Every class answers for IConnectionPointContainer.** **QueryInterface**, and a [**Set**](../../tB/Core/Set) to a variable of the container type, succeed for a class with no events as they do for a class with events.
- **A class with events has one connection point**, however many events it declares. **EnumConnectionPoints** returns it and **FindConnectionPoint** finds it by its interface identifier.
- **A class with no events has none, and says so by failing.** **EnumConnectionPoints** and **FindConnectionPoint** both raise run-time error 445, *Object doesn't support this action*.
- **The identifier of the outgoing interface is generated for each class.** Every object of one class reports the same identifier, two classes report different ones, and rebuilding the project changes them. Read it with **GetConnectionInterface**.
- **The outgoing interface is a dispinterface.** The sink twinBASIC creates answers for the interface's identifier with its **IDispatch** pointer. Each event has a dispatch identifier: 1 for the first event the class declares, 2 for the second, and so on in declaration order. A call of a dispatch identifier on the sink runs the handler of that event, and a late-bound [**CallByDispId**](../../tB/Modules/Interaction/CallByDispId) on a sink does the same.
- **A WithEvents variable is a connection.** Assigning an object to it with [**Set**](../../tB/Core/Set) calls **Advise**, which adds one connection to the source. Assigning **Nothing**, assigning another object, and destroying the object that holds the variable each call **Unadvise** on the source the variable held, which removes that connection. Two objects that watch the same source make two connections, and the handlers run in the order the connections were made. The sink object that twinBASIC registers does not keep the object that holds the variable alive: when the last reference to the holder is released, the holder terminates and its connection is removed.
- **[RaiseEvent](../../tB/Core/RaiseEvent) with no sink connected does nothing.** It raises no error.

A **WithEvents** variable can also hold an object that is not written in twinBASIC, when the project refers to its type library. The object's own connection point is used, and its outgoing interface is the one its type library lists as a source. The example at the end of the page does this with the sink object of the WMI scripting library.

## Example

A class that raises events, a class that listens to them with a **WithEvents** variable, and a class with no events. The helper module holds the two loops the samples reuse: it finds the first connection point of an object, and counts the sinks connected to a point.

```tb check_build projname=com-iconnpoint slot=file
Class Counter
    Public Event Changed(ByVal NewValue As Long)
    Public Event Finished()

    Private Total As Long

    Public Sub Increment()
        Total += 1
        RaiseEvent Changed(Total)
    End Sub

    Public Sub Finish()
        RaiseEvent Finished
    End Sub
End Class

Class Display
    Public Name As String
    Private WithEvents Source As Counter

    Public Sub Watch(ByVal Target As Counter)
        Set Source = Target
    End Sub

    Public Sub Unwatch()
        Set Source = Nothing
    End Sub

    Private Sub Source_Changed(ByVal NewValue As Long)
        Debug.Print Name & ": " & NewValue
    End Sub
End Class

Class Silent
    Public Value As Long
End Class
```

```tb check_build projname=com-iconnpoint slot=file
Private Module ConnectionHelpers
    Public Function FirstConnectionPoint(ByVal obj As Object) As IConnectionPoint
        Dim container As IConnectionPointContainer = obj
        Dim points As IEnumConnectionPoints = container.EnumConnectionPoints()
        Dim point As IConnectionPoint, fetched As Long
        points.Next 1, point, fetched
        Return point
    End Function

    Public Function ConnectionCount(ByVal point As IConnectionPoint) As Long
        Dim sinks As IEnumConnections = point.EnumConnections()
        Dim item As CONNECTDATA, fetched As Long, n As Long
        Do
            sinks.Next 1, item, fetched
            If fetched = 0 Then Exit Do
            n += 1
            Set item.pUnk = Nothing
        Loop
        Return n
    End Function
End Module
```

**WithEvents** and **Set** are **Advise** and **Unadvise**. The first **Increment** has no sink, so nothing is printed and the point has no connection. Each **Watch** adds one, each **Unwatch** removes one, and the handlers run in the order of the connections:

```tb check_run projname=com-iconnpoint
Dim c As New Counter
Dim point As IConnectionPoint = FirstConnectionPoint(c)
Dim a As New Display, b As New Display
a.Name = "A"
b.Name = "B"

c.Increment
Debug.Print ConnectionCount(point)
a.Watch c
Debug.Print ConnectionCount(point)
b.Watch c
Debug.Print ConnectionCount(point)
c.Increment
a.Unwatch
Debug.Print ConnectionCount(point)
c.Increment
b.Unwatch
Debug.Print ConnectionCount(point)
' Output:
' 0
' 1
' 2
' A: 2
' B: 2
' 1
' B: 3
' 0
```

A class with events has one connection point, and the container finds it again by the identifier it reports. The enumerator has no second item: its **Next** raises no error and sets *fetched* to 0. A class with no events fails in **EnumConnectionPoints** with run-time error 445. An identifier that the object does not have, here that of **IUnknown**, raises `CONNECT_E_NOCONNECTION`:

```tb check_run projname=com-iconnpoint
Dim c As New Counter
Dim container As IConnectionPointContainer = c
Dim points As IEnumConnectionPoints = container.EnumConnectionPoints()
Dim point As IConnectionPoint, fetched As Long
points.Next 1, point, fetched
Debug.Print fetched                                        ' 1

Dim iid As GUID
point.GetConnectionInterface iid
Dim again As IConnectionPoint = container.FindConnectionPoint(iid)
Debug.Print again Is point                                 ' True
Dim back As IConnectionPointContainer = point.GetConnectionPointContainer()
Debug.Print back Is container                              ' True

On Error Resume Next
points.Next 1, point, fetched
Debug.Print fetched                                        ' 0

Dim other As GUID           ' the identifier of IUnknown
other.Data4(0) = &HC0
other.Data4(7) = &H46
container.FindConnectionPoint other
Debug.Print Hex$(Err.Number)                               ' 80040200
Err.Clear

Dim s As New Silent
Dim silentContainer As IConnectionPointContainer = s
silentContainer.EnumConnectionPoints
Debug.Print Err.Number                                     ' 445
```

The sink that twinBASIC registers for a **WithEvents** variable can be taken from **EnumConnections** and advised by hand. Advising it while it is still connected adds nothing and returns 0. After **Unadvise** it can be advised again, and the new cookie is a new number. Its **IDispatch** runs the handler: event 1 of **Counter** is **Changed**, and event 2, **Finished**, has no handler to run. An ordinary object is not a sink, and **Unadvise** with a cookie nobody holds does nothing:

```tb check_run projname=com-iconnpoint
Dim c As New Counter
Dim point As IConnectionPoint = FirstConnectionPoint(c)
Dim d As New Display
d.Name = "D"
d.Watch c

Dim connections As IEnumConnections = point.EnumConnections()
Dim item As CONNECTDATA, fetched As Long
connections.Next 1, item, fetched
Dim sink As stdole.IUnknown = item.pUnk
Debug.Print item.dwCookie                  ' 1
Debug.Print point.Advise(sink)             ' 0
Debug.Print ConnectionCount(point)         ' 1

point.Unadvise item.dwCookie
Debug.Print ConnectionCount(point)         ' 0
c.Increment

Dim cookie As Long = point.Advise(sink)
Debug.Print cookie                         ' 2
c.Increment
Dim target As Object = sink
CallByDispId target, 1, vbMethod, 41
CallByDispId target, 2, vbMethod
point.Unadvise cookie
c.Increment

On Error Resume Next
Dim notASink As New Silent
Dim refused As Long = point.Advise(notASink)
Debug.Print Hex$(Err.Number)               ' 80004002
Err.Clear
point.Unadvise 99
Debug.Print Err.Number                     ' 0
' Output:
' 1
' 0
' 1
' 0
' 2
' D: 2
' D: 41
' 80004002
' 0
```

A **WithEvents** variable of a type from a type library works in the same way. This class holds the sink object of the WMI scripting library, a source of events that every Windows installation has. It needs a reference to *Microsoft WMI Scripting V1.2 Library* in the project:

```tb inert=external
Class WmiWatcher
    Public Completed As Boolean
    Private WithEvents Sink As WbemScripting.SWbemSink

    Public Sub Attach()
        Set Sink = New WbemScripting.SWbemSink
    End Sub

    Public Sub Detach()
        Set Sink = Nothing
    End Sub

    Private Sub Sink_OnCompleted(ByVal iHResult As WbemScripting.WbemErrorEnum, _
            ByVal objWbemErrorObject As WbemScripting.SWbemObject, _
            ByVal objWbemAsyncContext As WbemScripting.SWbemNamedValueSet)
        Completed = True
    End Sub
End Class
```

After **Attach**, the sink's connection point for the outgoing interface **ISWbemSinkEvents** holds one connection, and after **Detach** it holds none.

## See Also

- [IUnknown](IUnknown) interface -- the base interface and **QueryInterface**
- [IDispatch](IDispatch) interface -- how a dispinterface sink receives an event
- [IEnumVARIANT](IEnumVARIANT) interface -- the enumerator pattern the two enumerators follow
- [Event](../../tB/Core/Event) statement -- declares an event on a class
- [RaiseEvent](../../tB/Core/RaiseEvent) statement -- fires a declared event
- [WithEvents](../../tB/Core/WithEvents) statement -- connects a sink to a source
- [Handles](../../tB/Core/Handles) clause -- binds a handler without relying on its name
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses) -- declaring an interface in twinBASIC
