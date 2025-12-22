---
title: Property Sheet and Object Serialization
parent: CustomControls
nav_order: 3
permalink: /CustomControls/Properties/
---
# Property Sheet and Object Serialization
The form designer property sheet will pickup any **_public_** custom properties (fields) that you expose via your CustomControl class.  For example, adding a field `Public MyField As Long` will then automatically show up in the control property sheet in the form designer:

![CustomControl MyField propertySheet](https://www.twinbasic.com/images/wiki/ccMyFieldPropertySheet1a.png)

This is then persisted to your project as properties inside your form JSON structure:

![CustomControl MyField JSON](https://www.twinbasic.com/images/wiki/ccMyFieldJson1a.png)

The key to making this work is your serialization constructor, which might look something like this:

    Public Sub New(Serializer As SerializationInfo)
       If Not Serializer.Deserialize(Me) Then
          InitializeDefaultValues  ' you implement this
       End If
    End Sub
If `Deserialize(Me)` returns `True`, then your class properties were synchronized with the properties set via the form designer.  If it returns `False` then the control has just been added to the form, and this gives you an opportunity to setup any suitable default values for your custom public properties.  The form designer notices default values you set within the serialization constructor, so that your property sheet is kept in-sync.
***
### Default Values
An alternative method for setting up default values is to inline them into the class field definition:

![CustomControl MyField = 42](https://www.twinbasic.com/images/wiki/ccMyFieldPropertySheet1b.png)

The `Deserialize(Me)` call inside your serialization constructor will overwrite the property value if  the control is being synchronized from the persisted property sheet data.
***
### Enumerations
Enumerations that you define in your twinBASIC project are supported.  Simply expose a class field with the enumeration:

![CustomControl enumeration property sheet example](https://www.twinbasic.com/images/wiki/ccMyEnumFieldPropertySheet.png)

Note:  Enumerations are persisted to the form JSON structure as strings, so bare this in mind when making changes/updates to a CustomControl so that you don't introduce breaking changes by renaming an enumeration value.
***
### Objects
Class objects that you define in your twinBASIC project are supported.  You ***must*** supply a ClassId attribute for any exposed object, so that the serialization can identify it.

![CustomControl class property sheet example](https://www.twinbasic.com/images/wiki/ccMyFieldClass.png)
***
### Arrays
Arrays are supported.   The form designer allows for adding new elements, removing elements, and re-ordering of elements (via drag/drop).

![CustomControl array property sheet example](https://www.twinbasic.com/images/wiki/ccMyFieldArray.png)
***
### Property Get / Let
Custom property procedures are supported.  You will find that using Property Get / Let procedures is required if you want property changes to trigger repainting of your control.

![CustomControl custom property example](https://www.twinbasic.com/images/wiki/ccMyFieldCustomProperty.png)

Note that _**private**_ fields and properties do not form part of the serialization, and so will not appear on the property sheet.
***
### Avoid Variants
The serialization does not support Variants or generic Objects.  Always use strongly-typed datatypes.
***
### Events
Events that you define in your class will be exposed in the Events property sheet:

![CustomControl attribute](https://www.twinbasic.com/images/wiki/ccEvents.png)

At the moment, the form-designer doesn't yet support code-behind-forms, so this feature is not yet complete.
***
### Tips
- If you make changes to your CustomControl class, such as exposing new properties or changing how a control is drawn, these changes will get reflected immediately to any open form designers.  Form designers will show a 'resync' button when you return to them, once pressed the changes will be apparent.

- The serialization happens via JSON when running in the IDE, but via a binary format when running in a compiled DLL/EXE.  The `SerializationInfo` object that is passed to your serialization constructor is a different implementation when running in the IDE, but this should be transparent to you as a CustomControl implementer.

- When making changes or updates to a CustomControl always consider backwards compatibility.  For example, if you rename an exposed property, the old property values stored via the property sheet won't be deserialized to your new property.