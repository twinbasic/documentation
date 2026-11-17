# TBMANLIB_Dialog --- working notes

The contributed TBMANLIB_Dialog package, documented at `docs/Reference/Contributed/TBMANLIB_Dialog/`.
This file holds what its section decided and what is known about the package beyond its pages; the
rules for every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

What TBMANLIB_Dialog's pages say its dialogs do comes from `test/package-tests/TBMANLIB_Dialog/probe/`, which operates them in a built exe on a private desktop; run it again when the package's version changes.

TBMANLIB_Dialog 1.1.0.0 has a page of its own for each class except cDialog, which keeps a page for each member, so `analyze` in audit mode lists the members of those one-page classes as undocumented; its `exclude_from_docs` names its test module, `TestModule`, and the COM interface declarations that cDialogEx calls inside (`IOleWindow`, `IModalWindow`, `IShellItem`, `IShellItemArray`, `IFileDialog`, `IFileOpenDialog`, `IFileSaveDialog`), which its landing page describes in a paragraph.

**Listed under Experimental Packages** (owner): TBMANLIB_Dialog 1.1.0.0 has classes that fail at their main task (cDialogFindReplace reports nothing, cDialogPageSetup ignores paper and orientation, cDialogPassword shows the password in its confirmation boxes; every defect confirmed by a second agent, owner). cDialogEx 1.1.0.0 returns the name of the chosen file, not its path, ignores `InitialDir` and ignores a `Filter` that has no closing pipe, each documented as a WARNING.
