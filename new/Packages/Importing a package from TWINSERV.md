---
title: Importing a Package from TWINSERV
parent: Packages
nav_order: 3
permalink: /Packages/Importing-TWINSERV/
---

# Importing a package from TWINSERV

Open the project from which you want to use a package, open the `Settings` file within it and navigate to the References section.   Select the 'Available Packages' button, and all packages that are on the server should be shown:

![432410211-d9f1e4d9-1805-47e5-93aa-251151b4e914](https://github.com/user-attachments/assets/e749e10f-e361-4f15-a977-d756fcb3b5dd)
<br>
<br>

If you tick one of the available packages, it will be downloaded and imported into the project:

![432416432-4e4b8e4d-2a1c-42e5-8f4b-5a9b3f523ee8](https://github.com/user-attachments/assets/f2fd8374-fe46-40b0-8c66-2443df4dc5b3)
<br>
<br>

Once you're finished, save and close the Settings file which will cause the compiler to be restarted.  Now you're ready to use the package!  In the example shown above I added a reference to the CSharpishStringFormater package, and I can now confirm that I can access components from the package in my code:

![432417844-e9a3fd21-8e6a-4485-b52c-0c041600826b](https://github.com/user-attachments/assets/e2a65dfe-4a9d-4524-b6d6-7a6d1bc35cdb)
<br>
<br>

Note: If you have any PRIVATE packages that you have published, they are only available when signed in.   If you are not already signed in, you will see a warning link that you can click to login:

![image](https://github.com/user-attachments/assets/0fa1272d-41d6-4d0f-b19c-f47f24a47c4d)
<br>
<br>

After logging in, press the 'Available' button again to refresh the list.