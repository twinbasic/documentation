// 3-state theme toggle (progressive enhancement): system -> light -> dark.
//
// The page works fully without this file: prefers-color-scheme supplies the
// default theme (see just-the-docs-combined.css) and the button ships `hidden`,
// so there is no dead control. When this runs it cycles a manual override,
// persisted in localStorage, and reveals the button.
//
// State model:
//   - localStorage['theme'] = 'light' | 'dark' for an explicit override, or
//     ABSENT to follow the OS. Returning to 'system' removes the key.
//   - <html data-theme> mirrors that (absent = follow OS, so the CSS media
//     query keeps governing and re-resolves on OS change -- no matchMedia
//     listener needed here).
//
//   - sessionStorage['theme'] = 'light' | 'dark' when a page of this tab was
//     opened with ?theme=light or ?theme=dark (the help add-in passes the
//     IDE's theme so). It wins over localStorage and is never written there;
//     a click on the button replaces it with the reader's own choice.
//
// A matching inline no-flash snippet in <head> applies the override before
// first paint; both MUST agree on the 'theme' storage key.
(function () {
  var KEY = "theme";
  var ORDER = ["system", "light", "dark"];

  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");
  if (!button) return;
  var status = document.getElementById("a11y-status");

  // Mode labels ride on data-* attributes so the strings stay in the template.
  var labels = {
    system: button.getAttribute("data-label-system") || "Follow system",
    light: button.getAttribute("data-label-light") || "Light",
    dark: button.getAttribute("data-label-dark") || "Dark",
  };
  // The button's base name ("Theme"), captured before the first apply() rewrites
  // it, so the accessible name can carry the current mode as "Theme: Dark".
  // aria-pressed can't model three states, so the name is where the state lives
  // -- discoverable on focus at any time, not only via the live-region announce.
  var baseLabel = button.getAttribute("aria-label") || "Theme";

  function currentChoice() {
    try {
      var stored = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (_e) {
      // localStorage unavailable (private mode) -- fall through to system.
    }
    return "system";
  }

  // `persist` stores the choice as the reader's own, in place of any ?theme=
  // override; the first sync after load only mirrors what is stored.
  function apply(choice, announce, persist) {
    if (choice === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", choice);
    }
    if (persist) {
      try {
        sessionStorage.removeItem(KEY);
        if (choice === "system") localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, choice);
      } catch (_e) {
        // ignore: the preference simply won't persist
      }
    }
    button.setAttribute("data-theme-choice", choice); // drives which icon shows
    var name = baseLabel + ": " + labels[choice];
    button.setAttribute("aria-label", name);
    if (status && announce) status.textContent = name;
  }

  // Sync the button to whatever the no-flash snippet already applied, then reveal.
  apply(currentChoice(), false, false);
  button.hidden = false;

  button.addEventListener("click", function () {
    var next = ORDER[(ORDER.indexOf(currentChoice()) + 1) % ORDER.length];
    apply(next, true, true);
  });
})();
