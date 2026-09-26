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
// A matching inline no-flash snippet in <head> applies the stored override
// before first paint; both MUST agree on the 'theme' storage key.
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
      var stored = localStorage.getItem(KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (_e) {
      // localStorage unavailable (private mode) -- fall through to system.
    }
    return "system";
  }

  function apply(choice, announce) {
    if (choice === "system") {
      root.removeAttribute("data-theme");
      try {
        localStorage.removeItem(KEY);
      } catch (_e) {
        // ignore: the preference simply won't persist
      }
    } else {
      root.setAttribute("data-theme", choice);
      try {
        localStorage.setItem(KEY, choice);
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
  apply(currentChoice(), false);
  button.hidden = false;

  button.addEventListener("click", function () {
    var next = ORDER[(ORDER.indexOf(currentChoice()) + 1) % ORDER.length];
    apply(next, true);
  });
})();
