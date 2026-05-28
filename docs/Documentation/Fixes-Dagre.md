---
title: Mermaid Dagre Patches
parent: Library Patches
grand_parent: Documentation Development
nav_order: 3
permalink: /Documentation/Development/Fixes/Dagre
---

# Mermaid Dagre Patches
{: .no_toc }

`builder/node_modules/mermaid/dist/chunks/mermaid.esm/dagre-ZXKKJJHT.mjs` is mermaid's adapter between the flowchart parser and dagre, the layered-graph layout algorithm. Five patches are applied to it by `builder/scripts/patch-dagre.mjs`, wired in as an npm `postinstall` hook so a fresh `cd builder && npm install` re-applies them automatically. This page documents each patch --- what dagre does upstream, why it broke the build-pipeline diagrams, and what was changed.

The patches all target the same bundled file. Mermaid (11.15.0) ships dagre inlined into `dagre-ZXKKJJHT.mjs` and the npm bundle's load path imports the chunk directly, so patching the original `dagre-d3-es` source under `node_modules/dagre-d3-es/` has no effect at runtime.

* TOC goes here
{:toc}

## Per-cluster direction with cross-cluster edges (Patch A)

**Problem.** Mermaid's `extractor()` extracts a subgraph with `direction LR` (or `RL`) into its own layout pass --- but only when the cluster has no edges crossing its boundary. Clusters that do have a cross-boundary edge stay in the parent graph as compound nodes, and dagre's main layout silently ignores their per-cluster `rankdir`. The result: any `direction LR` subgraph that connects to anything outside itself renders top-to-bottom anyway.

This is the layout problem behind the [build-pipeline diagram](../assets/images/mmd/build-phases.svg). `row1` and `row2` are LR subgraphs, but `row1`'s last node connects to `row2`'s first node, which gives both rows external connections, so neither was extracted and both rendered as vertical stacks.

**Fix.** Extend the else-branch in `extractor()` so a cluster with both external connections and an explicit `clusterData.dir` is still extracted into its own sub-graph. Before `copy()` moves the children out, every edge that crosses the cluster boundary is rerouted to use the cluster placeholder node itself; the original endpoint node IDs are preserved on the rerouted edge as `_patchOrigV` and `_patchOrigW` so Patch B can fix up the rendered path later.

```js
for (const { e: _e, child: _c, other: _other } of _patchEdges) {
  const _eData = graph.edge(_e);
  if (!_eData._patchOrigV) _eData._patchOrigV = _e.v;
  if (!_eData._patchOrigW) _eData._patchOrigW = _e.w;
  graph.removeEdge(_e.v, _e.w, _e.name);
  if (_e.v === _c) {
    graph.setEdge(node, _other, _eData, _e.name);
  } else {
    graph.setEdge(_other, node, _eData, _e.name);
  }
}
```

After the rerouting, the parent graph's cross-cluster edge is `Cluster → ExternalCluster`, and the sub-graph carries only its internal edges. Dagre then lays out the parent (here, top-to-bottom) and the sub-graph (left-to-right) as two separate passes.

## Cross-cluster edge endpoints (Patch B)

**Problem.** Once Patch A reroutes a cross-cluster edge from `Child → ExternalNode` to `Cluster → ExternalCluster`, dagre lays it out as a straight stub between the two cluster bounding-box centres. Visually that's a short vertical line in the gap between the two rows of boxes --- the original source and destination nodes are nowhere in sight.

**Fix.** Inside `recursiveRender()`, after the parent-graph layout positions the cluster boxes, the cross-cluster edge's waypoints are replaced with an L-shape routing computed from the original endpoint nodes' actual rendered positions:

```js
const _sx = (_srcC.x - _srcC.width / 2 - _srcMx) + _srcN.x;
const _dx = (_dstC.x - _dstC.width / 2 - _dstMx) + _dstN.x;
const _srcEdgeY = (_srcC.y - _srcC.height / 2 - _srcMy) + _srcN.y + _srcN.height / 2;
const _dstEdgeY = (_dstC.y - _dstC.height / 2 - _dstMy) + _dstN.y - _dstN.height / 2;
const _srcBot = _srcC.y + _srcC.height / 2;
const _dstTop = _dstC.y - _dstC.height / 2;
const _gapY = (_srcBot + _dstTop) / 2;
edge.points = [
  { x: _sx, y: _srcEdgeY },   // exit source on its bottom edge
  { x: _sx, y: _srcBot },     // straight down past the source cluster rect
  { x: _sx, y: _gapY },       // into the gap between cluster rows
  { x: _dx, y: _gapY },       // across the gap to the destination column
  { x: _dx, y: _dstTop },     // down to the destination cluster rect
  { x: _dx, y: _dstEdgeY }    // enter destination on its top edge
];
```

The `_Mx` / `_My` subtractions account for a subtle bookkeeping difference in mermaid's `updateNodeBounds`: it stores the cluster node's `x`/`y` as the bounding-box centre but `width`/`height` as the cluster *rect* dimensions (i.e. without the sub-graph's `marginx`/`marginy`), so `(_srcC.x - _srcC.width/2)` gives the rect left edge, not the SVG group origin. Subtracting the sub-graph margins recovers the true group origin so the absolute coordinate maps back correctly.

With mermaid's default `curveBasis` interpolator, the six waypoints render as a smooth curve that exits the source node's bottom edge, sweeps across the gap between the two cluster rows, and enters the destination node's top edge.

## Cross-cluster arrow z-order (Patch C)

**Problem.** Mermaid renders the top-level SVG children in fixed declaration order: `clusters`, `edgePaths`, `edgeLabels`, `nodes`. The cross-cluster edge's path lives in the top-level `edgePaths` group, rendered *before* `nodes`. The cluster sub-graphs (with their cluster rects) live inside `nodes`. So the cluster rect is painted on top of the cross-cluster arrow.

**Fix.** After `recursiveRender` finishes inserting all edges in the parent graph, if any of those edges is a cross-cluster edge (carries `_patchOrigV`/`_patchOrigW` from Patch A), the entire top-level `edgePaths` group is moved to the end of the parent via d3's `selection.raise()`:

```js
if (graph.edges().some(_re => {
  const _red = graph.edge(_re);
  return _red && _red._patchOrigV && _red._patchOrigW;
})) {
  edgePaths.raise();
}
```

Internal edges inside cluster sub-graphs are inside their own SVG groups, so they keep their natural in-group ordering and are unaffected.

## Edge-less LR subgraphs (Patch D)

**Problem.** Dagre's `rank` step assigns each node a rank based on the edges between them; in an LR layout the rank becomes the x-coordinate column. When a subgraph's children have no edges between them, dagre puts every node in rank 0, and rank 0 is a single column --- so the children stack vertically regardless of the declared `direction LR`.

The [`pdf-render-pipeline.mmd` PHASE8 subgraph](../assets/images/mmd/pdf-render-pipeline.svg) runs into this: it lists three sibling functions called from `pdf.mjs`, not a sequence, so there are no arrows between `ASM`, `CSS`, and `IMG`. Without the patch they render in a vertical column.

**Fix.** Immediately before `layout(graph)` runs inside `recursiveRender`, group every node by its parent and inject layout-only chain edges between consecutive *isolated* siblings --- pairs where neither side has any sibling-to-sibling edge:

```js
const _patchSiblingMap = new Map();
for (const _n of graph.nodes()) {
  const _p = graph.parent(_n) || "__root__";
  if (!_patchSiblingMap.has(_p)) _patchSiblingMap.set(_p, []);
  _patchSiblingMap.get(_p).push(_n);
}
for (const _siblings of _patchSiblingMap.values()) {
  if (_siblings.length < 2) continue;
  const _siblingSet = new Set(_siblings);
  const _isolated = new Set();
  for (const _s of _siblings) {
    let _hasSiblingEdge = false;
    const _ne = graph.nodeEdges(_s) || [];
    for (const _e of _ne) {
      const _other = _e.v === _s ? _e.w : _e.v;
      if (_siblingSet.has(_other)) { _hasSiblingEdge = true; break; }
    }
    if (!_hasSiblingEdge) _isolated.add(_s);
  }
  for (let _pi = 0; _pi < _siblings.length - 1; _pi++) {
    const _u = _siblings[_pi];
    const _v = _siblings[_pi + 1];
    if (_isolated.has(_u) && _isolated.has(_v)) {
      graph.setEdge(_u, _v, { _patchInvisible: true, weight: 1, minlen: 1 });
    }
  }
}
```

Two design choices worth calling out:

- **Group by parent, not by leaf filter.** When `recursiveRender` recurses into a sub-graph it re-adds the parent cluster as a node and reparents the children to it, so `graph.nodes()` at this point returns `[ASM, CSS, IMG, PHASE8]`. Grouping by `graph.parent()` puts the leaves into the `"PHASE8"` group and `PHASE8` itself into the `"__root__"` group, so a child can never get chained to its own parent. (An earlier version used a `children().length === 0` leaf filter; that broke dagre's rank step the moment two compound siblings needed chaining inside a nested subgraph.)
- **Isolated pairs only.** A sibling is "isolated" when none of its edges go to another sibling in the same group. Only pairs where *both* siblings are isolated get a chain edge. This preserves fan-out topologies: in `build-phases.mmd` row3, `P7` and `P8` both have an incoming edge from sibling `P6`, so neither is isolated and `P7 → P8` is not added --- the fan-out stays a fan-out.

**Behaviour by example.**

| Subgraph (`direction LR`) | What dagre does without Patch D | What Patch D adds | Result |
|---|---|---|---|
| `A; B; C` (no edges) | All rank 0, single column | `A → B`, `B → C` | Three columns, declaration order |
| `A → B; C; D` | A, C, D in rank 0; B in rank 1 | `C → D` only (A and B are not isolated) | A and B in their own row, C and D in the row below, in two columns |
| `P6 → P7; P6 → P8` | P6 in rank 0; P7, P8 share rank 1 | Nothing (P7 and P8 each have a sibling edge from P6) | Fan-out: P6 in column 0, P7 above P8 in column 1 |

> [!NOTE]
> The chain reflects the order mermaid parsed the children in. For fine-grained control or complex topologies the author should still write explicit `-->` edges (or `~~~` invisible edges); Patch D only auto-orders strictly-orphan adjacent siblings.

## Invisible edges at render time (Patch E)

**Problem.** Patch D's chain edges exist for dagre's benefit only --- they have no visual meaning and would draw as confusing arrows between sibling boxes.

**Fix.** A guard at the top of the post-layout edges loop in `recursiveRender` skips any edge tagged `_patchInvisible`:

```js
graph.edges().forEach(function(e) {
  const edge = graph.edge(e);
  if (edge._patchInvisible) return;
  log.info("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(edge), edge);
  edge.points.forEach((point) => point.y += subGraphTitleTotalMargin / 2);
  ...
});
```

`processEdges()` runs *before* `layout()` in `recursiveRender`, so the invisible edges injected by Patch D are not yet in the graph when `insertEdgeLabel` iterates --- they only exist between Patch D's setEdge calls and Patch E's skip, with `layout()` in the middle. Patches D and E together detect a topology dagre would mishandle and patch the layout without altering the user's visible diagram.

## Patch application

`builder/scripts/patch-dagre.mjs` runs as an npm `postinstall` hook for the `builder/` workspace. On a fresh `npm install`, the script applies all five patches in order; on a re-run it detects already-applied patches (by checking for marker strings unique to each one) and skips them. The script also carries migration paths from earlier patch versions: it spots an in-progress upgrade and transforms the prior version's text into the current one rather than failing the `postinstall`.

If mermaid is upgraded to a release that changes the structure of `dagre-ZXKKJJHT.mjs`, the script will fail loudly with `target not found` and the patch text in `patch-dagre.mjs` needs to be regenerated against the new source --- the patches are precise string replacements, not regex matches.
