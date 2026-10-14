// Drafts the reference pages a new twinBASIC build, or a package new to the
// reference, leaves to write. A Workflow script for Claude Code: the agent
// Workflow engine runs it as the body of a function, so it ends in a top-level
// `return`, and it can read no file itself. Its agents can.
//
// Invocation:
//   1. node indexer/twin-index.mjs analyze [--package <name>]
//   2. node indexer/twin-index.mjs draft [--package <name>]
//      which writes indexer/.packages/draft/: manifest.json, a plan for each
//      package and a file for each batch of pages.
//   3. Read indexer/.packages/draft/manifest.json and pass its parsed contents
//      as `args` to the Workflow tool, with scriptPath
//      "indexer/draft/workflow.mjs". The manifest is small: it names the batch
//      files, and each agent reads its own.
//   4. Review the drafts like any other pages: build.bat, check.bat, and the
//      follow-ups the workflow returns.
//
// For each package, one agent writes each batch of pages, all at once; then one
// agent adds the new pages to the lists of the landing page and of the pages
// of their types, and writes a new section's landing page; then one compiles
// the section's samples with check_examples, fixes what the compiler refuses,
// and runs the doubts the other agents listed: the claims no sample shows, and
// where the package may differ from the object it replaces. Nothing here
// commits, builds or runs a gate: the drafts are drafts.
// WIP.Indexer.md says why the work is split this way.

export const meta = {
  name: 'doc-draft',
  description: 'Draft the reference pages that twin-index analyze and draft found missing or changed',
  whenToUse: 'After node indexer/twin-index.mjs draft has written indexer/.packages/draft/manifest.json',
  phases: [
    { title: 'Draft', detail: 'one agent per batch of pages', model: 'sonnet' },
    { title: 'Lists', detail: 'one agent per package: landing page and member lists', model: 'sonnet' },
    { title: 'Check', detail: 'one agent per package: compile the samples, run the doubts, fix the pages', model: 'sonnet' },
  ],
}

// The Workflow tool may deliver args as JSON text.
const manifest = typeof args === 'string' ? JSON.parse(args) : args
if (!manifest || !Array.isArray(manifest.packages)) {
  throw new Error(
    'doc-draft takes the parsed contents of indexer/.packages/draft/manifest.json as args; ' +
      'run node indexer/twin-index.mjs analyze, then draft, first.',
  )
}
const packages = manifest.packages.filter((p) => p.batches.length)
const unplaced = manifest.packages.reduce((n, p) => n + p.unplaced, 0)
const flagged = manifest.packages.reduce((n, p) => n + p.flagged, 0)
if (!packages.length) {
  log('Nothing to draft.')
  return { status: 'no-tasks', unplaced, flagged }
}
const pageCount = packages.reduce((n, p) => n + p.batches.reduce((m, b) => m + b.pages, 0), 0)
log(`${pageCount} page(s) in ${packages.length} package(s)` + (unplaced ? `; ${unplaced} symbol(s) unplaced, see the plans` : ''))

// check_examples takes a base port and two lanes from it; each package's check
// gets ports of its own, clear of the harness's default 9480.
const CHECK_PORT_BASE = 9700
const CHECK_PORT_STEP = 4

const results = await pipeline(
  packages,
  (pkg) =>
    parallel(
      pkg.batches.map((batch) => () =>
        agent(draftPrompt(pkg, batch), {
          label: `draft:${pkg.package}.${batch.container}`,
          phase: 'Draft',
          model: 'sonnet',
        }),
      ),
    ),
  (drafted, pkg) =>
    agent(listsPrompt(pkg), { label: `lists:${pkg.package}`, phase: 'Lists', model: 'sonnet' }).then((lists) => ({
      drafted,
      lists,
    })),
  (done, pkg, i) =>
    agent(checkPrompt(pkg, CHECK_PORT_BASE + i * CHECK_PORT_STEP, [...done.drafted, done.lists].filter(Boolean).join('\n\n')), {
      label: `check:${pkg.package}`,
      phase: 'Check',
      model: 'sonnet',
    }).then((check) => ({ package: pkg.package, ...done, check })),
)

const followUps = [
  'Read every drafted page against its source before committing it; the drafts are drafts.',
  'Run build.bat and check.bat; a new page may need a nav parent or a link fixed.',
  "Commit each section's pages with its new indexed_from, the new snapshots (indexer/snapshots/) and, for a built-in or default package, builder/package-api.json from twin-index derive (WIP.md, The package indexer).",
]
if (packages.some((p) => p.mode === 'audit')) {
  followUps.push(
    'A package analyzed in audit mode has no snapshot yet: remove its folder from indexer/.packages/<group>/ and run twin-index sync, which then writes one (WIP.Indexer.md).',
  )
}
if (unplaced || flagged) {
  followUps.push(
    `${unplaced} unplaced and ${flagged} no longer declared symbol(s) are listed in the plans under indexer/.packages/draft/; they need a person.`,
  )
}
return { packages: results.filter(Boolean), followUps }

// --- Prompts ---

function draftPrompt(pkg, batch) {
  return `Draft twinBASIC reference pages: ${batch.pages} page(s) of the ${pkg.package} package, for ${batch.container}.

Read first:
1. ${batch.file} -- your tasks. Each names the page \`file\` to write or change; its \`parent\` title; its \`permalink\` (null: use the form its sibling pages use); whether it is \`new\`, or goes \`inline\` on the one page its type has; the \`signature\`; and the \`source\` file in the indexer's store that declares it. \`model\` is a page of the same kind in the same section: follow its structure, headings and frontmatter. The file also gives the section's folder and landing page.
2. WIP.Authoring.md: "Page template", "Example" and "See Also"; "Cross-section linking" if a page links outside its section.
3. Each source file named in your tasks, once.

Then, for each task:
- action "create", \`new: true\`: write the page. Frontmatter: \`title\` (the bare name), \`parent\`, \`permalink\` (from the task, else by the siblings' form), \`has_toc: false\`.
- action "create", \`inline: true\`: add a section for the symbol to its type's page, in the order and the form that page already uses.
- action "update": change the existing page so it matches the new declaration (\`old_signature\` to \`new_signature\`, \`changes\`) and change nothing else.

Rules:
- State only what the source declares and its code does. Where the source does not make a behaviour clear, document the declaration and say nothing more: never invent semantics.
- List as a doubt each claim a page makes that no sample's stated output shows, and, when the sources say the package replaces another object or library (VBScript's RegExp, a VB6 control), each behaviour that may differ from it. A later step runs them.
- Every \`tb\` fence carries \`check_build\`. A statement sample whose output the page states also carries \`check_run\`, with the output as a trailing comment on each \`Debug.Print\` line; \`MsgBox\`, \`InputBox\` and \`End\` cannot be run.
- Do not edit the landing page, or a type's page that lists its members, except to add an \`inline\` section: a later step updates the lists.
- Write files with the Write and Edit tools, never through the shell. No git commands; do not build, and do not run check_examples: other agents are drafting beside you, and the later step compiles every page.

Return one line for each task, \`<file>: written\`, \`changed\` or \`skipped (<why>)\`, then one line for each doubt about what the source means.`
}

function listsPrompt(pkg) {
  const landing = pkg.landing
  const newLanding = landing?.new
    ? `The section has no landing page yet. Write ${landing.file} first: frontmatter \`title: ${landing.title}\`` +
      (landing.parent ? `, \`parent: ${landing.parent}\`` : ', the parent the landing pages beside it use') +
      (landing.permalink ? `, \`permalink: ${landing.permalink}\`` : ', a permalink of the form the landing pages beside it use') +
      `, \`has_toc: false\` and \`indexed_from: ${pkg.version}\`; ` +
      (landing.author
        ? `under the H1, the line \`**Author:** ${landing.author}. **Version:** ${pkg.version}\`, with the author the package's sources name in place of ${landing.author} if they name someone else, followed by \`. **On GitHub:** [owner/repo](url)\` when the sources name a repository that holds the package (WIP.md, the contributed packages); `
        : '') +
      `a short description of the package from its sources (the \`source\` paths in the plan) and, when the sources name its GitHub repository, its README (\`gh api repos/<owner>/<repo>/readme --jq .content\` gives it in base64; use gh only to read): what the package adds over the object it replaces and what it does not support, where the README says so; then the lists, with no \`* TOC\` list when the page has only one or two sections. Model it on a landing page of another section in the same folder. List as a doubt each README claim the page states that no sample on it shows.\n\n`
    : ''
  return `Bring the lists of the ${pkg.package} section up to date with the pages just drafted for it.

Read ${pkg.plan}: the plan. Its \`tasks\` are the pages; \`landing\` is the section's landing page.

${newLanding}1. Add each new page (\`new: true\`) to the landing page's lists, under the heading that fits its kind, in the form those lists already use (\`- [Name](link) -- short description\`), the link relative to the landing page's permalink. Take each description from the page's own first sentence.
2. For each task with a \`containerPage\`: if that page lists its members, add the new member there the same way.
3. Set \`indexed_from:\` in the landing page's frontmatter to \`${pkg.version}\`.
4. Change nothing else. Write files with the Write and Edit tools, never through the shell; no git commands; do not build.

Return one line for each file changed, saying what was added, then one line for each doubt.`
}

function checkPrompt(pkg, port, doubts) {
  const only = pkg.sectionDir.replace(/^docs\//, '')
  const probe = `${pkg.sectionDir}/zz-probe.md`
  return `Compile the samples of the ${pkg.package} section, settle the doubts the drafting agents listed, and fix the drafted pages.

Run, from the repository root:
  node scripts/check_examples.mjs --only "^${only}/" --port ${port} --jobs 2
It needs a twinBASIC install. For a contributed package it also needs a sample template, test/example-projects/contributed-${pkg.package}/Settings: if the run says the harness or the template is missing, stop and say so.

For each finding, fix the page it names: the sample, or what the page says it prints. Fix the page, never the harness or a template, and only the pages listed in ${pkg.plan} and its landing page. A \`check_run\` mismatch prints what the code really printed: that is the fact to document. Run again after fixing, three runs at most.

Then settle each doubt below that a run can settle:
- Write a scratch page, ${probe}, with frontmatter \`title: zz probe\` and \`nav_exclude: true\` and one \`tb check_build check_run\` sample that prints each fact in doubt, every \`Debug.Print\` line ending in the expected output \`' ?\`, and run it with \`--only "^${only}/zz-probe"\` at the same port: the report shows what each line printed. Under \`On Error Resume Next\`, a \`Debug.Print\` whose expression raises an error prints nothing, so assign the value first and print \`Err.Number\` after it.
- Where the sources say the package replaces another object, run the same input on that object when this machine can: VBScript's under \`cscript //nologo <file>.vbs\`, printing with \`WScript.Echo\`; VB6 code with \`node scripts/vb6run.mjs\`. Write those files outside the repository, and never call \`MsgBox\` or \`InputBox\`. Where the two differ, the page says what the replaced object does, in a \`> [!NOTE]\`.
- ${
    /^\d+\.\d+\.\d+\.\d+$/.test(pkg.version)
      ? `A callout about what this version of the package does, a defect above all, names the version in its label, the rest of its \`[!TYPE]\` line: \`> [!WARNING] ${pkg.version}\`. One`
      : 'A callout'
  } about what this build of twinBASIC does names the build in its label, the rest of its \`[!TYPE]\` line: \`> [!NOTE] BETA <n>\`. Its text then starts with the fact, never with "In version ..." or "In BETA ...".
- Correct the pages to what the runs printed, delete ${probe}, and run the section once more.

Doubts:
${doubts || '(none listed)'}

Write files with the Write and Edit tools, never through the shell; no git commands; do not build.

Return the last run's summary line, then one line for each fix: \`<file>:<line>: <what changed>\`, then one line for each doubt: settled, with what the run printed, or left, with why.`
}
