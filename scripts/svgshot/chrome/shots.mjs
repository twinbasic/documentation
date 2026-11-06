// The six pictures of "Deploying to docs.twinbasic.com" in docs/Documentation/Building.md: what
// each must show, and its markings. A mark is {n, on, what}: `n` the badge's text, `on` an anchor
// of annotate.mjs and `what` what it points at, which the panel asks to be clicked when GitHub's
// page has no such thing. Only the owner, signed in, takes these (WIP.Screenshots.md).

const FOLDER = "Documentation/Images";

export const SHOTS = [
  {
    name: "compare-changes",
    out: `${FOLDER}/compare-changes.png`,
    shows:
      "Compare changes: the compare across forks link, base repository twinbasic/documentation with base staging, " +
      "and the head repository and compare branch selectors.",
    marks: [
      { n: 3, on: { css: "button", text: "compare across forks" }, what: "the compare across forks link" },
      { n: 4, on: { css: ".range-editor" }, what: "the repository and branch selectors" },
    ],
  },
  {
    name: "create-pull-request",
    out: `${FOLDER}/create-pull-request.png`,
    shows: "The comparison after choosing the fork and branch: base staging, Able to merge, Create pull request.",
    marks: [{ n: 5, on: { css: "button", text: "Create pull request" }, what: "the Create pull request button" }],
  },
  {
    name: "merge-pull-request",
    out: `${FOLDER}/merge-pull-request.png`,
    shows: "An open pull request's merge box: No conflicts with base branch, Merge pull request.",
    marks: [{ n: "6a", on: { css: "button", text: "Merge pull request" }, what: "the Merge pull request button" }],
  },
  {
    name: "confirm-merge",
    out: `${FOLDER}/confirm-merge.png`,
    shows: "The merge form: commit message, extended description, Commit email, Confirm merge.",
    marks: [{ n: "6b", on: { css: "button", text: "Confirm merge" }, what: "the Confirm merge button" }],
  },
  {
    name: "choose-workflow",
    out: `${FOLDER}/choose-workflow.png`,
    shows: "The Actions tab with the sidebar entry Build & deploy docs.",
    marks: [
      { n: "a", on: { css: "a", text: "Actions" }, what: "the Actions tab" },
      { n: "b", on: { css: "a", text: "Build & deploy docs" }, what: "the Build & deploy docs entry" },
    ],
  },
  {
    name: "run-workflow",
    out: `${FOLDER}/run-workflow.png`,
    shows: "The Run workflow drop-down open on branch staging. Do not press Run unless a release is wanted.",
    marks: [
      { n: "a", on: { css: "summary", text: "Run workflow" }, what: "the Run workflow drop-down" },
      { n: "b", on: { css: "button", text: "Run workflow" }, what: "the green Run workflow button" },
    ],
  },
];
