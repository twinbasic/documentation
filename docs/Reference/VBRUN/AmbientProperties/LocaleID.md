---
title: LocaleID
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/LocaleID
---
# LocaleID
{: .no_toc }

Returns the Locale ID of the container, as a **Long**. Read-only.

Syntax: *object*.**LocaleID**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The Locale ID (LCID) is a 32-bit Windows identifier that names a language and a regional formatting convention --- for example `&H0409&` for English (United States) or `&H0407&` for German (Germany). A control should use this value when formatting numbers, dates, currencies, and message text, so that its output matches the language and conventions the host application is presenting to the user.

### See Also

- [DisplayName](DisplayName) property
- [RightToLeft](RightToLeft) property
