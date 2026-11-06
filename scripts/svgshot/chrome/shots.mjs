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
// The merge box with the line under it, Still in progress?, as the old pictures show it.
const MERGE_BOX = { css: "[data-testid=mergebox-partial]" };
// The green tile left of the merge box, held whole: the badge stands over its right edge.
const MERGE_TILE = { css: "[data-testid=mergebox-partial] svg.octicon-git-merge" };
const MERGE_TRIM = { of: [MERGE_BOX, MERGE_TILE], pad: { left: 16 } };
const ACTIONS_TAB = { css: "a", text: "Actions" };
const WORKFLOW = { css: "a", text: "Build & deploy docs" };
const NEXT_WORKFLOW = { css: "a", text: "Run Checks" };

export const SHOTS = [
  {
    name: "compare-changes",
    out: `${FOLDER}/compare-changes.png`,
    shows:
      "On the repository's Compare page, press compare across forks, so that all four selectors show, and set " +
      "base to staging. The yellow banner shows under them, with its Create pull request greyed.",
    marks: [
      { n: 3, on: button("compare across forks"), side: "right", what: "the compare across forks link" },
      { n: 4, on: { css: ".range-editor" }, what: "the repository and branch selectors" },
    ],
    trim: { of: [{ css: ".Subhead" }, { css: ".range-editor" }, { css: ".flash" }] },
  },
  {
    name: "create-pull-request",
    out: `${FOLDER}/create-pull-request.png`,
    shows:
      "Base staging, with your fork and a branch that has no pull request yet (GitHub then shows View pull " +
      "request instead): Able to merge, the blue Discuss and review banner and the green Create pull request. " +
      "Do not press it: the form stays closed.",
    marks: [{ n: 5, on: button("Create pull request"), what: "the Create pull request button" }],
    trim: { of: [{ css: ".Subhead" }, { css: ".range-editor" }, { css: ".js-compare-pr .flash" }] },
  },
  {
    name: "merge-pull-request",
    out: `${FOLDER}/merge-pull-request.png`,
    shows:
      "An open pull request, scrolled to its merge box: No conflicts with base branch and the green Merge pull " +
      "request, its drop-down closed. Do not merge.",
    marks: [{ n: "6a", on: button("Merge pull request"), what: "the Merge pull request button" }],
    trim: MERGE_TRIM,
  },
  {
    name: "confirm-merge",
    out: `${FOLDER}/confirm-merge.png`,
    shows:
      "Press Merge pull request once: Commit message, Extended description, Commit email and the green Confirm " +
      "merge show. Do not press Confirm merge.",
    marks: [{ n: "6b", on: button("Confirm merge"), what: "the Confirm merge button" }],
    trim: MERGE_TRIM,
  },
  {
    name: "choose-workflow",
    out: `${FOLDER}/choose-workflow.png`,
    shows:
      "The Actions tab of twinbasic/documentation, not of a fork: the tab bar and the sidebar entry Build & deploy docs.",
    marks: [
      { n: "a", on: ACTIONS_TAB, side: "below", what: "the Actions tab" },
      { n: "b", on: WORKFLOW, side: "right", what: "the Build & deploy docs entry" },
    ],
    trim: { of: [ACTIONS_TAB, WORKFLOW, NEXT_WORKFLOW], pad: { top: 4 } },
  },
  {
    name: "run-workflow",
    out: `${FOLDER}/run-workflow.png`,
    shows:
      "On the Build & deploy docs page, press Run workflow: the drop-down opens, on branch staging. Do not press " +
      "the green button inside it unless a release is wanted.",
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
