---
title: PropertyBag
parent: VBRUN Package
nav_order: 18
permalink: /tB/Packages/VBRUN/PropertyBag/
redirect_from:
  - /tB/Modules/PropertyBag
has_toc: false
---

# PropertyBag class

A **PropertyBag** is a small key/value store designed for persisting an object's state across sessions. Each entry is a name and a **Variant** value; reading and writing entries is symmetric, so the same code that loaded the bag's state at start-up can store it again at shutdown. The whole bag can also be retrieved or replaced as a single byte array through [**Contents**](#contents), which makes it straightforward to save the state to a file, a database column, or another **PropertyBag**.

A new **PropertyBag** is created with **New** and starts out empty:

```tb
Dim Bag As New PropertyBag
Bag.WriteProperty "Caption", Me.Caption, "Untitled"
Bag.WriteProperty "Width", Me.Width, 800

' Persist the bag to disk.
Dim Stream As Integer
Stream = FreeFile
Open "settings.bin" For Binary Access Write As #Stream
Put #Stream, , Bag.Contents
Close #Stream
```

The runtime also hands a **PropertyBag** to a **UserControl**'s **WriteProperties** and **ReadProperties** events; the same API used in user code persists a control's design-time and run-time state through the host's storage.

## Members

### Contents

Returns or sets the complete state of the bag as a single **Variant** holding a **Byte** array.

Syntax: *object*.**Contents** [ **=** *value* ]

*object*
: *required* An object expression that evaluates to a **PropertyBag** object.

*value*
: A **Variant** containing a **Byte** array previously obtained from another **PropertyBag**'s **Contents**.

Reading **Contents** serialises the whole bag --- every name/value pair currently in it --- into a self-contained byte array suitable for writing to a file, sending across a network, or storing in another medium. Assigning to **Contents** discards the current state and replaces it with the state encoded in *value*; the byte array must be one previously produced by a compatible **PropertyBag**.

### ReadProperty

Returns the value previously stored in the bag under a given name.

Syntax: *object*.**ReadProperty(** *Name* [ **,** *DefaultValue* ] **)**

*object*
: *required* An object expression that evaluates to a **PropertyBag** object.

*Name*
: *required* A **String** giving the key the value was written under. Names are matched case-insensitively.

*DefaultValue*
: *optional* The value to return when the bag does not contain an entry called *Name*. May be of any type assignable to a **Variant**. If omitted, **ReadProperty** returns **Null** for a missing entry.

Inside a control's **ReadProperties** event, it is conventional to pass the same default to **ReadProperty** as was passed to [**WriteProperty**](#writeproperty), so that the control falls back to its design-time default when no value was persisted.

### WriteProperty

Stores a value in the bag under a given name.

Syntax: *object*.**WriteProperty** *Name* **,** *Value* [ **,** *DefaultValue* ]

*object*
: *required* An object expression that evaluates to a **PropertyBag** object.

*Name*
: *required* A **String** giving the key to store the value under. If a value was previously stored under the same name, it is replaced.

*Value*
: *required* The value to store. May be any expression assignable to a **Variant**.

*DefaultValue*
: *optional* A value that the consumer will treat as the default when reading the property. If *Value* is equal to *DefaultValue*, the bag may skip writing the entry at all --- the read side will fall back to the same default --- keeping the serialised form small. Pass the same default that the matching call to [**ReadProperty**](#readproperty) will use.
