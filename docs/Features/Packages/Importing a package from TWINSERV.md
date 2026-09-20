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

![The Project Settings dialog open over the IDE, with hand-drawn red numbers marking the route: 1 on the toolbar settings gear, 2 on the Library References heading, 3 on the Available Packages tab. That tab lists the published packages with tick boxes and Library Symbol, Version and Publisher columns.](Images/e749e10f-e361-4f15-a977-d756fcb3b5dd.png)
<br>
<br>

If you tick one of the available packages, it will be downloaded and imported into the project:

![The Enabled Libraries tab after the tick, where FilePropertyExplorer and CSharpishStringFormater now appear marked IMPORTED below the built-in compatibility packages. Behind it the Project Explorer shows the downloaded FileProps and Fmt folders under the project's Packages branch.](Images/f2fd8374-fe46-40b0-8c66-2443df4dc5b3.png)
<br>
<br>

Once you're finished, save and close the Settings file which will cause the compiler to be restarted.  Now you're ready to use the package!  In the example shown above I added a reference to the CSharpishStringFormater package, and I can now confirm that I can access components from the package in my code:

![A code editor where typing fmt. has opened the completion list, offering the package's members: AsciiEscapeBase, CopyCapitalisation, CurrencySFI, DateTimeSFI, DecimalSFI and EscapeSequence.](Images/e2a65dfe-4a9d-4524-b6d6-7a6d1bc35cdb.png)
<br>
<br>

Note: If you have any PRIVATE packages that you have published, they are only available when signed in.   If you are not already signed in, you will see a warning link that you can click to login:

![The yellow TIP link below the package list, offering to log in to see private packages](Images/0fa1272d-41d6-4d0f-b19c-f47f24a47c4d.png)
<br>
<br>

After logging in, press the 'Available' button again to refresh the list.