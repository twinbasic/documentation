# tbKMode writer

Writes the module pages of the tbKMode section, `docs/Reference/Contributed/tbKMode/<Module>.md`
for modWDM, modFltMgr, modSysInfo, modImage, modDisk and modKmOpaque. A page is never edited
itself: its text is edited here, and the page written again. The section's page
[tbKMode Writer](../../../../docs/Reference/Contributed/tbKMode/Writer.md) says the same for a
reader of the section.

```sh
node test/package-tests/tbKMode/writer/writer.mjs              # every module
node test/package-tests/tbKMode/writer/writer.mjs modWDM       # one
node test/package-tests/tbKMode/writer/writer.mjs --check      # writes nothing; exit 1 if a page differs
```

It needs Node.js and this repository only: the package's snapshot
(`indexer/snapshots/contributed/tbKMode/api.json`), `../wdk/learn/<Module>.json`, `../Sources` and
`../expect.json`. Like the package's other tools it is run when the section is updated, and is in
no gate (`test/package-tests/README.md`, *Tools of one package*).

## What a module's folder holds

- `frame.md` --- the page, with placeholders where the generated parts go. Everything else on the
  page (its opening, the callouts, the examples, See Also) is written here as it appears.
- `names.json` --- a description of each public name, by section: `declares`, `delegates`, `types`,
  `enums`, `consts`, `variables`, `aliases`. A description is one line of markdown, the text of the
  table cell. A constant whose value depends on a `#Const` of the package, rather than on `Win64`,
  is `[value, description]`, the value one of its declarations' (modFltMgr's
  **FLT_REGISTRATION_VERSION**).
- `procedures.md` (modWDM) --- one `### Name` section for each procedure with a body, each with its
  anchor line `{: #Name }`, in any order.

## The placeholders

| Placeholder | Is replaced by |
|---|---|
| `{{table:<section>}}` | the table of that section of `names.json`, its rows in alphabetical order; a name's cell links to its Microsoft Learn page when `wdk/learn/<Module>.json` has one; a constant's value and an alias's type come from the package's declarations |
| `{{table:variables typed}}` | the variables' table with a Type column (modDisk's) |
| `{{procedures}}` | the sections of `procedures.md`, in alphabetical order |
| `{{cases:<Fixture> ... -<Case> ...}}` | in a test marker: the cases of each fixture that `expect.json` does not record as failing, less those after a `-`, as `Fixture.Case` |

## What it checks

- **A name with no description** --- one a new version of the package adds --- is left off the page,
  with a warning. Write its description in `names.json` and run the writer again.
- **A description of a name the module does not have** --- one a new version removes or renames ---
  is an error, and the page is not written.
- **A failing case** of a fixture a `{{cases:...}}` names must be named by a literal test marker of
  the frame or of `procedures.md`: the marker of the callout that says why it fails. A case that
  starts to fail therefore stops the writer until its callout is written.
- **A kind of name the module has and its page has no table for** is a warning.
- `--check` reports each page that differs from what the writer would write. Run it after editing
  a page by mistake: the edit belongs here.

The page's own gates still apply when the site is built: the callout labels, the markers'
evidence (`check_callout_evidence.mjs`) and the links.
