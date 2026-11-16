// The online pages' nav. A page holds the part of the nav tree that shows when it opens -- the
// top level, and the children of the page and of each of its ancestors -- and /nav.html holds
// the whole tree. This fetches nav.html once the page has loaded, or as soon as an entry is
// expanded, and puts each branch the page lacks under its entry. What the page shows is left as
// it is: the current page's mark, the expanded entries, the scroll position and the focus.
// builder/template.mjs (withOnlineNav, renderNavTreePage) writes both halves.
//
// The two trees are walked side by side, entry by entry, and a branch is grafted only under an
// entry whose title is the same in both; a nav.html from another build than the page's (a cached
// one, a deploy in between) stops the walk where the trees part. The page asks for the nav.html
// it was built with, by the hash of its tree in the query, which the server ignores.
//
// just-the-docs.js expands an entry from a click handler on the document, so an entry grafted
// in later expands like any other; one expanded before the tree has come shows its branch when
// the branch arrives. The help add-in's pane hides the nav, so it fetches nothing there.
(function () {
  var link = document.getElementById("nav-contents");
  var nav = document.getElementById("site-nav");
  if (!link || !nav || document.documentElement.hasAttribute("data-pane")) return;
  if (!window.fetch || !window.DOMParser) return;

  var pending = null;

  function load() {
    if (pending) return pending;
    var url = link.href + "?v=" + encodeURIComponent(link.getAttribute("data-version") || "");
    pending = fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then(function (text) {
        var whole = new DOMParser().parseFromString(text, "text/html").getElementById("site-nav");
        var theirs = whole && listOf(whole);
        var mine = listOf(nav);
        if (theirs && mine) graft(mine, theirs);
      })
      .catch(function () {
        // The page keeps its part of the tree, and "Contents" still opens the whole of it.
      });
    return pending;
  }

  function graft(mine, theirs) {
    var ours = entries(mine);
    var others = entries(theirs);
    if (ours.length !== others.length) return;
    for (var i = 0; i < ours.length; i++) {
      if (titleOf(ours[i]) !== titleOf(others[i])) return;
      var branch = listOf(ours[i]);
      var whole = listOf(others[i]);
      if (!whole) continue;
      if (branch) graft(branch, whole);
      else ours[i].appendChild(document.importNode(whole, true));
    }
  }

  // An element's first child list of entries: a nav's tree, or an entry's branch.
  function listOf(element) {
    for (var child = element.firstElementChild; child; child = child.nextElementSibling) {
      if (child.tagName === "UL" && child.classList.contains("nav-list")) return child;
    }
    return null;
  }

  function entries(list) {
    var out = [];
    for (var child = list.firstElementChild; child; child = child.nextElementSibling) {
      if (child.classList.contains("nav-list-item")) out.push(child);
    }
    return out;
  }

  function titleOf(entry) {
    for (var child = entry.firstElementChild; child; child = child.nextElementSibling) {
      if (child.classList.contains("nav-list-link")) return child.textContent;
    }
    return "";
  }

  nav.addEventListener("click", function (event) {
    var target = event.target;
    while (target && target !== nav) {
      if (target.classList && target.classList.contains("nav-list-expander")) {
        load();
        return;
      }
      target = target.parentNode;
    }
  });

  if (window.requestIdleCallback) window.requestIdleCallback(load, { timeout: 3000 });
  else window.addEventListener("load", load);
})();
