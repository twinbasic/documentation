// Phase 2 nav substeps: nav-path, nav-integrity-check, nav-tree,
// nav-levels, breadcrumbs, children. Six Ruby plugins share one set of
// intermediate structures (titled set, byTitle / byParentTitle maps,
// sorted top-level list, ordered-children map); collecting them in one
// JS module lets the substeps reuse that state instead of rebuilding it
// six times the way each Jekyll Generator did in isolation.
//
// See builder/PLAN-2.md §5.1-§5.6 + §6 for the full spec.
// Ports: _plugins/nav-path.rb, nav-integrity-check.rb,
//        nav-tree-precompute.rb, nav-levels-precompute.rb,
//        breadcrumbs-precompute.rb, children-precompute.rb.

const NAV_TREE_MAX_DEPTH = 16;
const BREADCRUMBS_MAX_DEPTH = 8;
const REVERSE_FLAGS = new Set(["desc", "reversed"]);

export function computeNav(pages, config) {
  computeNavPaths(pages);
  validateNavIntegrity(pages);
  const state = buildSharedNavState(pages, config);
  const navTree = buildNavTree(state);
  computeNavLevels(pages, state);
  computeBreadcrumbs(pages, state);
  computeChildren(pages, state);
  return { navTree };
}

// ---------- §5.1 nav-path ---------------------------------------------------

function computeNavPaths(pages) {
  for (const page of pages) {
    const title = page.frontmatter.title;
    if (title == null || title === "") continue;
    const parts = [];
    if (page.frontmatter.grand_parent) parts.push(String(page.frontmatter.grand_parent));
    if (page.frontmatter.parent)        parts.push(String(page.frontmatter.parent));
    parts.push(String(title));
    page.navPath = parts.join("/");
  }
}

// ---------- §5.2 nav-integrity-check ---------------------------------------

function validateNavIntegrity(pages) {
  const titled = pages.filter(p => isNonEmpty(p.frontmatter.title));
  const navVisible = titled.filter(p => !p.frontmatter.nav_exclude);

  const byTitle = groupBy(navVisible, p => String(p.frontmatter.title));

  const ambiguous = [];
  const orphaned = [];

  for (const page of navVisible) {
    const parentTitle = page.frontmatter.parent;
    if (parentTitle == null || parentTitle === "") continue;

    const candidates = byTitle.get(String(parentTitle));
    if (!candidates || candidates.length === 0) {
      orphaned.push({ page, reason: `no page titled "${parentTitle}" exists` });
      continue;
    }

    if (candidates.length === 1) continue;

    const gp = page.frontmatter.grand_parent;
    if (gp == null) {
      ambiguous.push({
        page,
        reason: `${candidates.length} pages are titled "${parentTitle}" and no grand_parent is declared to disambiguate`,
      });
      continue;
    }

    const filtered = candidates.filter(c => c.frontmatter.parent === gp);
    if (filtered.length > 1) {
      ambiguous.push({
        page,
        reason: `${filtered.length} pages titled "${parentTitle}" share parent "${gp}" - grand_parent does not disambiguate`,
      });
    } else if (filtered.length === 0) {
      orphaned.push({
        page,
        reason: `grand_parent "${gp}" does not match any page titled "${parentTitle}"`,
      });
    }
  }

  if (ambiguous.length === 0 && orphaned.length === 0) return;

  const lines = [];
  if (ambiguous.length > 0) {
    lines.push(`Nav-parent ambiguity detected in ${ambiguous.length} page(s):`);
    for (const e of ambiguous) lines.push(`  ${e.page.srcRel}: ${e.reason}`);
  }
  if (orphaned.length > 0) {
    lines.push(`Nav-parent orphan detected in ${orphaned.length} page(s):`);
    for (const e of orphaned) lines.push(`  ${e.page.srcRel}: ${e.reason}`);
  }
  throw new Error(lines.join("\n"));
}

// ---------- §6.1 shared state ----------------------------------------------

function buildSharedNavState(pages, config) {
  const titled = pages.filter(p => isNonEmpty(p.frontmatter.title));
  const byTitle = groupBy(titled, p => String(p.frontmatter.title));
  const byParentTitle = groupBy(
    titled,
    p => isNonEmpty(p.frontmatter.parent) ? String(p.frontmatter.parent) : "",
  );
  const caseInsensitive = config?.nav_sort === "case_insensitive";

  const topLevel = sortPages(
    (byParentTitle.get("") || []).filter(p => !p.frontmatter.nav_exclude),
    caseInsensitive,
  );

  const orderedChildren = new Map();
  for (const parent of titled) {
    orderedChildren.set(
      parent.permalink,
      orderedChildrenFor(parent, byParentTitle, caseInsensitive),
    );
  }

  return { titled, byTitle, byParentTitle, caseInsensitive, topLevel, orderedChildren };
}

// Mirrors the upstream nav/children.html filter: drop nav_exclude pages,
// drop pages whose grand_parent contradicts the candidate parent's own
// parent, then apply child_nav_order reversal so positions match render
// order. Shared by nav-tree and nav-levels.
function orderedChildrenFor(parent, byParentTitle, caseInsensitive) {
  const parentTitle = String(parent.frontmatter.title);
  const candidates = byParentTitle.get(parentTitle) || [];
  const filtered = candidates.filter(c => {
    if (c.frontmatter.nav_exclude) return false;
    const gp = c.frontmatter.grand_parent;
    return gp == null || gp === parent.frontmatter.parent;
  });
  const sorted = sortPages(filtered, caseInsensitive);
  if (REVERSE_FLAGS.has(String(parent.frontmatter.child_nav_order || ""))) {
    sorted.reverse();
  }
  return sorted;
}

// ---------- §6.2 four-bucket sort ------------------------------------------

function sortPages(pages, caseInsensitive) {
  const navNum = [], navStr = [], titleNum = [], titleStr = [];
  for (const p of pages) {
    if (p.frontmatter.nav_order != null) {
      (typeof p.frontmatter.nav_order === "number" ? navNum : navStr).push(p);
    } else {
      (typeof p.frontmatter.title === "number" ? titleNum : titleStr).push(p);
    }
  }
  navNum.sort((a, b) => a.frontmatter.nav_order - b.frontmatter.nav_order);
  navStr.sort((a, b) => cmp(sortKey(a.frontmatter.nav_order, caseInsensitive),
                            sortKey(b.frontmatter.nav_order, caseInsensitive)));
  titleNum.sort((a, b) => a.frontmatter.title - b.frontmatter.title);
  titleStr.sort((a, b) => cmp(sortKey(a.frontmatter.title, caseInsensitive),
                              sortKey(b.frontmatter.title, caseInsensitive)));
  return [...navNum, ...navStr, ...titleNum, ...titleStr];
}

function sortKey(value, caseInsensitive) {
  const s = String(value);
  return caseInsensitive ? s.toLowerCase() : s;
}

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

// ---------- §5.3 nav-tree ---------------------------------------------------

function buildNavTree(state) {
  return state.topLevel.map(top => buildNavNode(top, [top], state.orderedChildren, 0));
}

function buildNavNode(page, chain, orderedChildren, depth) {
  const rawChildren = orderedChildren.get(page.permalink) || [];
  const children = rawChildren.filter(child => !chain.some(c => c.permalink === child.permalink));
  const childNodes = depth < NAV_TREE_MAX_DEPTH
    ? children.map(c => buildNavNode(c, [...chain, c], orderedChildren, depth + 1))
    : [];
  return {
    title: page.frontmatter.title,
    url: page.permalink,
    children: childNodes,
  };
}

// ---------- §5.4 nav-levels ------------------------------------------------

function computeNavLevels(pages, state) {
  const topIndex = new Map();
  state.topLevel.forEach((p, i) => topIndex.set(p.permalink, i + 1));

  const childIndex = new Map();
  for (const [parentUrl, list] of state.orderedChildren) {
    const m = new Map();
    list.forEach((c, i) => m.set(c.permalink, i + 1));
    childIndex.set(parentUrl, m);
  }

  const paths = new Map();
  for (const top of state.topLevel) {
    walkNavSubtree(top, [top], paths, state.orderedChildren, 0);
  }

  for (const page of state.titled) {
    page.navLevels = levelsFromPath(paths.get(page.permalink), topIndex, childIndex);
  }
}

function walkNavSubtree(node, chain, paths, orderedChildren, depth) {
  if (depth > NAV_TREE_MAX_DEPTH) return;
  if (!paths.has(node.permalink)) paths.set(node.permalink, chain);

  const children = orderedChildren.get(node.permalink) || [];
  for (const child of children) {
    if (chain.some(p => p.permalink === child.permalink)) continue;
    walkNavSubtree(child, [...chain, child], paths, orderedChildren, depth + 1);
  }
}

function levelsFromPath(chain, topIndex, childIndex) {
  if (!chain) return undefined;

  const topIdx = topIndex.get(chain[0].permalink);
  if (topIdx == null) return undefined;

  const levels = [1, topIdx];
  for (let i = 1; i < chain.length; i++) {
    const map = childIndex.get(chain[i - 1].permalink);
    const idx = map?.get(chain[i].permalink);
    if (idx == null) return undefined;
    levels.push(idx);
  }
  return levels;
}

// ---------- §5.5 breadcrumbs -----------------------------------------------

function computeBreadcrumbs(pages, state) {
  for (const page of state.titled) {
    page.breadcrumbs = breadcrumbChainFor(page, state.byTitle);
  }
}

function breadcrumbChainFor(page, byTitle) {
  const chain = [];
  let current = page;

  for (let depth = 0; depth < BREADCRUMBS_MAX_DEPTH; depth++) {
    const parentTitle = current.frontmatter.parent;
    if (parentTitle == null || String(parentTitle) === "") break;

    const parent = resolveParent(String(parentTitle), current.frontmatter.grand_parent, byTitle);
    if (!parent) break;

    chain.unshift({ title: parent.frontmatter.title, url: parent.permalink });
    current = parent;
  }
  return chain;
}

function resolveParent(parentTitle, grandParentTitle, byTitle) {
  const candidates = byTitle.get(parentTitle);
  if (!candidates || candidates.length === 0) return null;

  if (grandParentTitle != null) {
    const narrowed = candidates.find(c => c.frontmatter.parent === grandParentTitle);
    if (narrowed) return narrowed;
  }
  return candidates[0];
}

// ---------- §5.6 children ---------------------------------------------------

function computeChildren(pages, state) {
  for (const page of state.titled) {
    const candidates = state.byParentTitle.get(String(page.frontmatter.title)) || [];
    const filtered = candidates.filter(c => {
      const gp = c.frontmatter.grand_parent;
      return gp == null || gp === page.frontmatter.parent;
    });
    const sorted = sortPages(filtered, state.caseInsensitive);
    if (REVERSE_FLAGS.has(String(page.frontmatter.child_nav_order || ""))) {
      sorted.reverse();
    }
    page.children = sorted.map(c => ({
      title: c.frontmatter.title,
      url: c.permalink,
      summary: c.frontmatter.summary,
    }));
  }
}

// ---------- utilities ------------------------------------------------------

function isNonEmpty(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0;
  return true;
}

function groupBy(items, keyFn) {
  const out = new Map();
  for (const item of items) {
    const key = keyFn(item);
    let arr = out.get(key);
    if (!arr) { arr = []; out.set(key, arr); }
    arr.push(item);
  }
  return out;
}
