---
title: Toolbox
parent: IDE
# nav_order: 4
permalink: /tB/IDE/Project/Toolbox
---

# Toolbox

The Toolbox lists the controls available for placement on forms and designers in the current project. Additional COM components can be added through the **+ More Components** button, which opens the COM References section of Project Settings.

See [Controls](../../Controls)

<!-- ![Toolbox](../Controls/Images/toolbox.png "Toolbox") -->

![The Toolbox button labelled More components, a grey plus sign beside the text inside a dashed outline.](Images/Toolbox_MoreComponents.png)

![A twinBASIC information box reading Components list coming soon, explaining that for now ordinary COM references to the appropriate ActiveX type library must be added and the components will then appear in the form designer automatically, above a GoTo COM References button and an OK button.](Images/Components_Message.png)

The "GoTo COM References" button takes you to **Project Settings** and filters by "project.references".

![The Project Settings dialog filtered to project.references, on its Enabled Libraries tab. Four ticked entries are listed in priority order against Library Symbol and Version columns: the twinBASIC VBA and VBRUN compatibility packages, OLE Automation as stdole, and the IDE Extensibility package as tbIDE.](Images/ProjectSettings_LibraryReferences.png)

Click on the _Available COM References_ tab.

![The same dialog on its Available COM References tab, where a search box sits above an alphabetical list of unticked type libraries registered on the machine, AccessibilityCplAdmin, Active DS, ActiveMovie and AgentWmiLib among them, against Library Symbol, Version and Publisher columns.](Images/ProjectSettings_AvailableCOMReferences.png)

See [Project Settings](Settings) for more info.
