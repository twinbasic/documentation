---
title: Importing a Package from TWINSERV
parent: Package Management
grand_parent: Features
nav_order: 2
permalink: /Features/Packages/Importing-TWINSERV
redirect_from:
  - /Packages/Importing-TWINSERV
---

# Importing a package from TWINSERV

Open the project from which you want to use a package, open the `Settings` file within it and navigate to the References section.   Select the 'Available Packages' button, and all packages that are on the server should be shown:

![The Project Settings dialog open over the IDE, with red numbers marking the route: 1 on the Project Explorer's Project Settings gear, 2 on the Library References heading, 3 on the Available Packages tab. That tab lists the built-in and published packages with tick boxes and Embedded and Library Symbol columns.](Images/e749e10f-e361-4f15-a977-d756fcb3b5dd.png){:width="1162" height="529"}

If you tick one of the available packages, it will be downloaded and imported into the project:

![The Enabled Libraries tab after the ticks, where CSharpishStringFormater and FilePropertyExplorer now appear marked EMBEDDED-PACKAGE below the built-in compatibility packages and OLE Automation, with their library symbols Fmt and FileProps.](Images/f2fd8374-fe46-40b0-8c66-2443df4dc5b3.png){:width="995" height="257"}

Once you're finished, press **Apply Changes**, which saves the project and restarts the compiler.  Now you're ready to use the package!  In the example shown above I added a reference to the CSharpishStringFormater package, and I can now confirm that I can access components from the package in my code:

![A code editor where typing fmt. has opened the completion list, offering the package's members: AsciiEscapeBase, CopyCapitalisation, CurrencySFI, DateTimeSFI, DecimalSFI, EscapeSequence and more.](Images/e2a65dfe-4a9d-4524-b6d6-7a6d1bc35cdb.png){:width="592" height="252"}

Note: If you have any PRIVATE packages that you have published, they are only available when signed in.   If you are not already signed in, you will see a warning link that you can click to login:

![The yellow TIP link below the package list, offering to log in to see private packages](Images/0fa1272d-41d6-4d0f-b19c-f47f24a47c4d.png){:width="669" height="155"}

After logging in, press the 'Available' button again to refresh the list.