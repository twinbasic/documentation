// The six pictures of "Deploying to docs.twinbasic.com" in docs/Documentation/Building.md: what
// each must show, its markings, and the area chromeshot.mjs trims a capture of the whole window
// to (trim.mjs). A mark is {n, on, side?, what}: `n` the badge's text, `on` an anchor of annotate.mjs,
// `side` where its badge goes, left by default, and `what` what it points at, which the panel
// asks to be clicked when GitHub's page has no such thing. A trim is {of, pad?}: the anchors whose
// boxes the picture holds, besides its marks. Only the owner, signed in, takes these
// (WIP.Screenshots.md).
//
// The anchors were read from what a signed-in page holds. GitHub's class names are hashed and
// change with a build, so an anchor names an attribute of the page's where it can: a data-testid,
// a data-component, or the start of a class name.

const FOLDER = "Documentation/Images";

/** The width the six are laid out at, in CSS px, so that each retake is the same layout. */
export const PAGE_WIDTH = 1280;

const button = (text) => ({ css: "button", text });
const POPOVER = "#__primerPortalRoot__";
const MERGE_BOX = { css: "[data-testid=mergebox-border-container]" };
const ACTIONS_TAB = { css: "a", text: "Actions" };
const WORKFLOW = { css: "a", text: "Build & deploy docs" };

export const SHOTS = [
  {
    name: "compare-changes",
    out: `${FOLDER}/compare-changes.png`,
    shows:
      "Compare changes: the compare across forks link, base repository twinbasic/documentation with base staging, " +
      "and the head repository and compare branch selectors.",
    marks: [
      { n: 3, on: button("compare across forks"), side: "right", what: "the compare across forks link" },
      { n: 4, on: { css: ".range-editor" }, what: "the repository and branch selectors" },
    ],
    trim: { of: [{ css: ".Subhead" }, { css: ".range-editor" }] },
  },
  {
    name: "create-pull-request",
    out: `${FOLDER}/create-pull-request.png`,
    shows: "The comparison after choosing the fork and branch: base staging, Able to merge, Create pull request.",
    marks: [{ n: 5, on: button("Create pull request"), what: "the Create pull request button" }],
    trim: { of: [{ css: ".range-editor" }, button("Create pull request")] },
  },
  {
    name: "merge-pull-request",
    out: `${FOLDER}/merge-pull-request.png`,
    shows: "An open pull request's merge box: No conflicts with base branch, Merge pull request.",
    marks: [{ n: "6a", on: button("Merge pull request"), what: "the Merge pull request button" }],
    trim: { of: [MERGE_BOX] },
  },
  {
    name: "confirm-merge",
    out: `${FOLDER}/confirm-merge.png`,
    shows: "The merge form: commit message, extended description, Commit email, Confirm merge. Do not press it.",
    marks: [{ n: "6b", on: button("Confirm merge"), what: "the Confirm merge button" }],
    trim: { of: [MERGE_BOX] },
  },
  {
    name: "choose-workflow",
    out: `${FOLDER}/choose-workflow.png`,
    shows: "The Actions tab with the sidebar entry Build & deploy docs.",
    marks: [
      { n: "a", on: ACTIONS_TAB, side: "below", what: "the Actions tab" },
      { n: "b", on: WORKFLOW, side: "right", what: "the Build & deploy docs entry" },
    ],
    trim: { of: [ACTIONS_TAB, WORKFLOW] },
  },
  {
    name: "run-workflow",
    out: `${FOLDER}/run-workflow.png`,
    shows: "The Run workflow drop-down open on branch staging. Do not press Run unless a release is wanted.",
    marks: [
      {
        n: "a",
        on: { css: "[data-component=PH_Actions] button", text: "Run workflow" },
        what: "the Run workflow button at the top",
      },
      {
        n: "b",
        on: { css: `${POPOVER} button`, text: "Run workflow" },
        side: "right",
        what: "the green Run workflow button in the drop-down",
      },
    ],
    trim: {
      of: [{ css: "[data-component=PH_Actions] button", text: "Run workflow" }, { css: `${POPOVER} [class*=Overlay]` }],
    },
  },
];
