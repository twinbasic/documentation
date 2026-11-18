# NewTabCtl --- working notes

The contributed NewTabCtl package, at `docs/Reference/Contributed/NewTabCtl/`. Rules for every
contributed package: [WIP.Contributed.md](WIP.Contributed.md#rules).

- **The section is a stand-in: its landing page only** (owner, 2026-11-18), listed under
  Experimental Packages, so that the Controls page has a page to link to for a VB6 project
  that uses SSTab. The **NewTab** control's members are not documented; `analyze` lists them
  all as missing.
- **Version 10.0.289.0, TWINSERV's newest, does not compile on BETA 1042** (TB5259, four
  `VB_Invoke_Property` attributes that name property pages the package does not hold). Its
  `compile/` cases check that, and it is in `PENDING`. The author is EduardoVB, named by the
  package's own description; TWINSERV's publisher is WaynePhillipsEA.
- **Page layout, once a version compiles** (owner): one page for the control with its members
  as sections, as every control in the reference has, and the helper classes and enumerations
  on pages of their own, the enumerations under `Enumerations/` as WinNativeCommonCtls has.
- Upstream, EduardoVB/NewTab, changed its code "for x64 (for twinBASIC)" on 2026-11-10: look
  for a new package on TWINSERV (`node indexer/twin-index.mjs sync --query --package NewTabCtl`)
  before writing the pages.
- The package's classes and modules marked `VB_Exposed = False` are all reachable from a
  project that references it.
