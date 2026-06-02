// patch-dagre.mjs — postinstall patch for mermaid's bundled dagre adapter.
//
// Five patches applied to dagre-ZXKKJJHT.mjs:
//
// Patch A (extractor): extends the extractor() function's else-branch so
// that any cluster with cross-cluster edges and children is extracted into
// its own sub-graph. When the cluster has no explicit `direction`, the
// sub-graph inherits the parent graph's rankdir. Cross-boundary edges are
// rerouted to use the cluster placeholder node; original endpoint node IDs
// are preserved as _patchOrigV / _patchOrigW on the edge data so Patch B can
// fix up the rendered path.
//
// Patch B (recursiveRender, points): after dagre lays out the parent graph
// with cluster placeholders, overrides the cross-cluster edge waypoints to
// use the actual absolute positions of the original endpoint nodes (computed
// from their sub-graph positions + cluster offsets), producing an arrow
// that visually connects the correct internal nodes rather than the cluster
// bounding-box centres.
//
// Patch C (recursiveRender, z-order): raises the top-level edgePaths group
// above the nodes group whenever a cross-cluster edge is present, so the
// cross-cluster arrow renders on top of the cluster yellow rects instead of
// being hidden behind them.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is builder/scripts/; mermaid lives in the repo-root
// node_modules (deps consolidated to one package.json at the root).
const TARGET = resolve(
  __dirname,
  "../../node_modules/mermaid/dist/chunks/mermaid.esm/dagre-ZXKKJJHT.mjs"
);

// ── Patch A: extractor() ─────────────────────────────────────────────

const ORIGINAL_ELSE = `    } else {
      log.warn(
        "Cluster ** ",
        node,
        " **not meeting the criteria !externalConnections:",
        !clusterDb.get(node).externalConnections,
        " no parent: ",
        !graph.parent(node),
        " children ",
        graph.children(node) && graph.children(node).length > 0,
        graph.children("D"),
        depth
      );
      log.debug(clusterDb);
    }`;

const NEW_ELSE_V2 = `    } else if (graph.children(node) && graph.children(node).length > 0) {
      const _patchChildren = new Set(graph.children(node));
      const _patchEdges = [];
      for (const _c of _patchChildren) {
        for (const _e of graph.nodeEdges(_c) || []) {
          const _other = _e.v === _c ? _e.w : _e.v;
          if (!_patchChildren.has(_other)) {
            _patchEdges.push({ e: _e, child: _c, other: _other });
          }
        }
      }
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
      const _gs = graph.graph();
      const _dir = clusterDb.get(node)?.clusterData?.dir || _gs.rankdir;
      log.warn("Fixing dir (external cluster)", _dir);
      const _cg = new Graph({
        multigraph: true,
        compound: true
      }).setGraph({
        rankdir: _dir,
        nodesep: 50,
        ranksep: 50,
        marginx: 8,
        marginy: 8
      }).setDefaultEdgeLabel(function() {
        return {};
      });
      copy(node, graph, _cg, node);
      graph.setNode(node, {
        clusterNode: true,
        id: node,
        clusterData: clusterDb.get(node).clusterData,
        label: clusterDb.get(node).label,
        graph: _cg
      });
    } else {
      log.warn(
        "Cluster ** ",
        node,
        " **not meeting the criteria !externalConnections:",
        !clusterDb.get(node).externalConnections,
        " no parent: ",
        !graph.parent(node),
        " children ",
        graph.children(node) && graph.children(node).length > 0,
        graph.children("D"),
        depth
      );
      log.debug(clusterDb);
    }`;

// Patch A V1 → V2 migration: V1 required clusterData.dir on the cluster
// (silent crash for direction-less clusters with cross-boundary edges); V2
// extracts any such cluster and inherits the parent rankdir when no explicit
// direction is set.
const V1_GUARD_OLD = `    } else if (clusterDb.get(node)?.clusterData?.dir && graph.children(node) && graph.children(node).length > 0) {`;
const V2_GUARD_NEW = `    } else if (graph.children(node) && graph.children(node).length > 0) {`;

const V1_DIR_OLD = `      const _gs = graph.graph();
      let _dir = _gs.rankdir === "TB" ? "LR" : "TB";
      if (clusterDb.get(node)?.clusterData?.dir) {
        _dir = clusterDb.get(node).clusterData.dir;
        log.warn("Fixing dir (external cluster)", _dir);
      }`;
const V2_DIR_NEW = `      const _gs = graph.graph();
      const _dir = clusterDb.get(node)?.clusterData?.dir || _gs.rankdir;
      log.warn("Fixing dir (external cluster)", _dir);`;

// Incremental: if the old A patch is present (has _patchChildren but not
// _patchOrigV), splice in the two metadata lines.
const OLD_REROUTE = `        const _eData = graph.edge(_e);
        graph.removeEdge(_e.v, _e.w, _e.name);`;

const NEW_REROUTE = `        const _eData = graph.edge(_e);
        if (!_eData._patchOrigV) _eData._patchOrigV = _e.v;
        if (!_eData._patchOrigW) _eData._patchOrigW = _e.w;
        graph.removeEdge(_e.v, _e.w, _e.name);`;

// ── Patch B: recursiveRender() edge-point fixup ──────────────────────

const RENDER_OLD = `    edge.points.forEach((point) => point.y += subGraphTitleTotalMargin / 2);
    const startNode = graph.node(e.v);`;

const RENDER_NEW = `    edge.points.forEach((point) => point.y += subGraphTitleTotalMargin / 2);
    if (edge._patchOrigV && edge._patchOrigW) {
      const _srcC = graph.node(e.v);
      const _dstC = graph.node(e.w);
      if (_srcC?.clusterNode && _dstC?.clusterNode) {
        const _srcN = _srcC.graph.node(edge._patchOrigV);
        const _dstN = _dstC.graph.node(edge._patchOrigW);
        if (_srcN && _dstN) {
          // mermaid stores _srcC.x/y as the cluster bbox CENTRE but
          // _srcC.width/height as the cluster RECT dimensions (excluding the
          // sub-graph's marginx/marginy), so (_srcC.x - _srcC.width/2) gives
          // the rect left edge, not the SVG group origin. Subtract the
          // sub-graph margins to recover the actual group origin.
          const _srcG = _srcC.graph.graph();
          const _dstG = _dstC.graph.graph();
          const _srcMx = _srcG.marginx || 0;
          const _srcMy = _srcG.marginy || 0;
          const _dstMx = _dstG.marginx || 0;
          const _dstMy = _dstG.marginy || 0;
          const _sx = (_srcC.x - _srcC.width / 2 - _srcMx) + _srcN.x;
          const _dx = (_dstC.x - _dstC.width / 2 - _dstMx) + _dstN.x;
          // For a TB outer layout: exit the source on its bottom edge, enter
          // the destination on its top edge.
          const _srcEdgeY = (_srcC.y - _srcC.height / 2 - _srcMy) + _srcN.y + (_srcN.height || 0) / 2;
          const _dstEdgeY = (_dstC.y - _dstC.height / 2 - _dstMy) + _dstN.y - (_dstN.height || 0) / 2;
          const _srcBot = _srcC.y + _srcC.height / 2;
          const _dstTop = _dstC.y - _dstC.height / 2;
          const _gapY = (_srcBot + _dstTop) / 2;
          edge.points = [
            { x: _sx, y: _srcEdgeY },
            { x: _sx, y: _srcBot },
            { x: _sx, y: _gapY },
            { x: _dx, y: _gapY },
            { x: _dx, y: _dstTop },
            { x: _dx, y: _dstEdgeY }
          ];
        }
      }
    }
    const startNode = graph.node(e.v);`;

// ── Patch C: raise top-level edgePaths above nodes ───────────────────

const RAISE_OLD = `    positionEdgeLabel(edge, paths);
  });
  graph.nodes().forEach(function(v) {`;

const RAISE_NEW = `    positionEdgeLabel(edge, paths);
  });
  if (graph.edges().some(_re => { const _red = graph.edge(_re); return _red && _red._patchOrigV && _red._patchOrigW; })) {
    edgePaths.raise();
  }
  graph.nodes().forEach(function(v) {`;

// ── Patch D: inject layout-only chain edges in edge-less sub-graphs ──
//
// Without internal edges, dagre puts all of a sub-graph's nodes into rank
// 0; in LR mode that becomes one column and the nodes stack vertically
// regardless of the declared `direction LR`. Adding chain edges in
// declaration order gives dagre something to rank against; Patch E skips
// them at render time so they don't draw as visible arrows.

const CHAIN_OLD = `  log.info("###                Layout                 ### XXX");
  log.info("############################################# XXX");
  layout(graph);`;

const CHAIN_NEW = `  log.info("###                Layout                 ### XXX");
  log.info("############################################# XXX");
  // Inject layout-only chain edges between consecutive sibling nodes where
  // BOTH are isolated (have no sibling-to-sibling edge). Without this, an
  // isolated sibling drops into rank 0 and stacks regardless of the declared
  // LR/RL direction. Conservative: pairs where either sibling has a sibling
  // edge are left alone, so fan-outs like P6 -> {P7, P8} are preserved.
  // Grouping by parent (rather than filtering for leaves) means a child can
  // never end up chained to its own parent, which broke dagre's rank step
  // in the previous version.
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
        if (_siblingSet.has(_other)) {
          _hasSiblingEdge = true;
          break;
        }
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
  layout(graph);`;

// Patch D V1 → V2 migration: the V1 block (one outer condition + leaf
// filter + naive chain) is replaced wholesale by the V2 sibling-isolation
// pass.
const CHAIN_OLD_V1 = `  if (graph.edges().length === 0) {
    // When recursiveRender recurses into a sub-graph it re-adds the parent
    // cluster as a node and reparents the children to it, so graph.nodes()
    // here includes a compound parent we must skip. Chain only leaf nodes;
    // chaining a parent to its child breaks dagre's rank step.
    const _patchOrderedNodes = graph.nodes().filter(_n => {
      const _kids = graph.children(_n);
      return !_kids || _kids.length === 0;
    });
    if (_patchOrderedNodes.length > 1) {
      for (let _pi = 0; _pi < _patchOrderedNodes.length - 1; _pi++) {
        graph.setEdge(
          _patchOrderedNodes[_pi],
          _patchOrderedNodes[_pi + 1],
          { _patchInvisible: true, weight: 1, minlen: 1 }
        );
      }
    }
  }`;
const CHAIN_NEW_V2 = `  // Inject layout-only chain edges between consecutive sibling nodes where
  // BOTH are isolated (have no sibling-to-sibling edge). Without this, an
  // isolated sibling drops into rank 0 and stacks regardless of the declared
  // LR/RL direction. Conservative: pairs where either sibling has a sibling
  // edge are left alone, so fan-outs like P6 -> {P7, P8} are preserved.
  // Grouping by parent (rather than filtering for leaves) means a child can
  // never end up chained to its own parent, which broke dagre's rank step
  // in the previous version.
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
        if (_siblingSet.has(_other)) {
          _hasSiblingEdge = true;
          break;
        }
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
  }`;

// ── Patch E: skip layout-only edges in the edge-rendering loop ───────
// Patch D adds the invisible edges AFTER processEdges() but BEFORE
// layout(), so processEdges never sees them — we only need to guard the
// post-layout rendering loop.

const SKIP_OLD = `  graph.edges().forEach(function(e) {
    const edge = graph.edge(e);
    log.info("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(edge), edge);
    edge.points.forEach((point) => point.y += subGraphTitleTotalMargin / 2);`;

const SKIP_NEW = `  graph.edges().forEach(function(e) {
    const edge = graph.edge(e);
    if (edge._patchInvisible) return;
    log.info("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(edge), edge);
    edge.points.forEach((point) => point.y += subGraphTitleTotalMargin / 2);`;

// ── Apply ────────────────────────────────────────────────────────────

function applyPatch(src, marker, oldStr, newStr, name) {
  if (src.includes(marker)) {
    console.log(`patch-dagre: ${name} already applied.`);
    return src;
  }
  if (!src.includes(oldStr)) {
    console.error(`patch-dagre: ${name} target not found in dagre-ZXKKJJHT.mjs.`);
    process.exit(1);
  }
  console.log(`patch-dagre: applying ${name}.`);
  return src.replace(oldStr, newStr);
}

let src;
try {
  src = readFileSync(TARGET, "utf8");
} catch (err) {
  console.error(`patch-dagre: cannot read ${TARGET}\n  ${err.message}`);
  process.exit(1);
}
src = src.replace(/\r\n/g, "\n");

const originalSrc = src;

// Patch A — extractor.
// Four states:
//   V2 (current)  — clusterData?.dir || _gs.rankdir present: skip.
//   V1 (legacy)   — _patchOrigV present, auto-flip ternary present: migrate dir block.
//   V0 (oldest)   — _patchChildren present, no _patchOrigV: splice metadata + migrate dir.
//   Fresh         — no patch markers: apply V2 directly.
const V2_DIR_MARKER = "clusterData?.dir || _gs.rankdir";
if (src.includes(V2_DIR_MARKER)) {
  console.log("patch-dagre: Patch A already applied (V2).");
} else if (src.includes("_patchOrigV")) {
  src = src.replace(V1_GUARD_OLD, V2_GUARD_NEW);
  src = src.replace(V1_DIR_OLD,   V2_DIR_NEW);
  console.log("patch-dagre: Patch A upgraded V1 → V2 (inherit parent rankdir).");
} else if (src.includes("_patchChildren")) {
  // V0 → V2: splice metadata in reroute step, then migrate dir block + guard.
  src = applyPatch(src, "_patchOrigV", OLD_REROUTE, NEW_REROUTE, "Patch A V0 → V1 reroute");
  src = src.replace(V1_GUARD_OLD, V2_GUARD_NEW);
  src = src.replace(V1_DIR_OLD,   V2_DIR_NEW);
  console.log("patch-dagre: Patch A upgraded V1 → V2 (inherit parent rankdir).");
} else {
  src = applyPatch(src, "_patchChildren", ORIGINAL_ELSE, NEW_ELSE_V2, "Patch A (V2)");
}

// Patch B — render edge-point fixup.
// Migration 1: 3-point straight line → 6-point gap-routing (center endpoints).
const OLD_B_POINTS_V1 = `          edge.points = [
            { x: _sx, y: _sy },
            { x: (_sx + _dx) / 2, y: (_sy + _dy) / 2 },
            { x: _dx, y: _dy }
          ];`;
const NEW_B_POINTS_V2 = `          const _srcBot = _srcC.y + _srcC.height / 2;
          const _dstTop = _dstC.y - _dstC.height / 2;
          const _gapY = (_srcBot + _dstTop) / 2;
          edge.points = [
            { x: _sx, y: _sy },
            { x: _sx, y: _srcBot },
            { x: _sx, y: _gapY },
            { x: _dx, y: _gapY },
            { x: _dx, y: _dstTop },
            { x: _dx, y: _dy }
          ];`;
if (src.includes(OLD_B_POINTS_V1)) {
  src = src.replace(OLD_B_POINTS_V1, NEW_B_POINTS_V2);
  console.log("patch-dagre: Patch B upgraded to gap-routing (V2).");
}
// Migration 2: V2 (center endpoints) → V4 (box-edge + margin-aware).
const OLD_B_HEAD_V2 = `          const _sx = (_srcC.x - _srcC.width / 2) + _srcN.x;
          const _sy = (_srcC.y - _srcC.height / 2) + _srcN.y;
          const _dx = (_dstC.x - _dstC.width / 2) + _dstN.x;
          const _dy = (_dstC.y - _dstC.height / 2) + _dstN.y;
          const _srcBot = _srcC.y + _srcC.height / 2;
          const _dstTop = _dstC.y - _dstC.height / 2;
          const _gapY = (_srcBot + _dstTop) / 2;
          edge.points = [
            { x: _sx, y: _sy },
            { x: _sx, y: _srcBot },
            { x: _sx, y: _gapY },
            { x: _dx, y: _gapY },
            { x: _dx, y: _dstTop },
            { x: _dx, y: _dy }
          ];`;
const NEW_B_HEAD_V4 = `          // mermaid stores _srcC.x/y as the cluster bbox CENTRE but
          // _srcC.width/height as the cluster RECT dimensions (excluding the
          // sub-graph's marginx/marginy), so (_srcC.x - _srcC.width/2) gives
          // the rect left edge, not the SVG group origin. Subtract the
          // sub-graph margins to recover the actual group origin.
          const _srcG = _srcC.graph.graph();
          const _dstG = _dstC.graph.graph();
          const _srcMx = _srcG.marginx || 0;
          const _srcMy = _srcG.marginy || 0;
          const _dstMx = _dstG.marginx || 0;
          const _dstMy = _dstG.marginy || 0;
          const _sx = (_srcC.x - _srcC.width / 2 - _srcMx) + _srcN.x;
          const _dx = (_dstC.x - _dstC.width / 2 - _dstMx) + _dstN.x;
          // For a TB outer layout: exit the source on its bottom edge, enter
          // the destination on its top edge.
          const _srcEdgeY = (_srcC.y - _srcC.height / 2 - _srcMy) + _srcN.y + (_srcN.height || 0) / 2;
          const _dstEdgeY = (_dstC.y - _dstC.height / 2 - _dstMy) + _dstN.y - (_dstN.height || 0) / 2;
          const _srcBot = _srcC.y + _srcC.height / 2;
          const _dstTop = _dstC.y - _dstC.height / 2;
          const _gapY = (_srcBot + _dstTop) / 2;
          edge.points = [
            { x: _sx, y: _srcEdgeY },
            { x: _sx, y: _srcBot },
            { x: _sx, y: _gapY },
            { x: _dx, y: _gapY },
            { x: _dx, y: _dstTop },
            { x: _dx, y: _dstEdgeY }
          ];`;
if (src.includes(OLD_B_HEAD_V2)) {
  src = src.replace(OLD_B_HEAD_V2, NEW_B_HEAD_V4);
  console.log("patch-dagre: Patch B upgraded to V4 (margin-aware box-edge endpoints).");
}
// Migration 3: V3 (box-edge w/o margin correction) → V4 (margin-aware).
const OLD_B_HEAD_V3 = `          const _sx = (_srcC.x - _srcC.width / 2) + _srcN.x;
          const _dx = (_dstC.x - _dstC.width / 2) + _dstN.x;
          // For a TB outer layout: exit the source node on its bottom edge and
          // enter the destination node on its top edge.
          const _srcEdgeY = (_srcC.y - _srcC.height / 2) + _srcN.y + (_srcN.height || 0) / 2;
          const _dstEdgeY = (_dstC.y - _dstC.height / 2) + _dstN.y - (_dstN.height || 0) / 2;
          const _srcBot = _srcC.y + _srcC.height / 2;
          const _dstTop = _dstC.y - _dstC.height / 2;
          const _gapY = (_srcBot + _dstTop) / 2;
          edge.points = [
            { x: _sx, y: _srcEdgeY },
            { x: _sx, y: _srcBot },
            { x: _sx, y: _gapY },
            { x: _dx, y: _gapY },
            { x: _dx, y: _dstTop },
            { x: _dx, y: _dstEdgeY }
          ];`;
if (src.includes(OLD_B_HEAD_V3)) {
  src = src.replace(OLD_B_HEAD_V3, NEW_B_HEAD_V4);
  console.log("patch-dagre: Patch B upgraded V3 → V4 (margin-aware).");
}
src = applyPatch(
  src,
  "const _srcMx = _srcG.marginx",
  RENDER_OLD,
  RENDER_NEW,
  "Patch B"
);

// Patch C — raise edgePaths above nodes.
src = applyPatch(src, "edgePaths.raise()", RAISE_OLD, RAISE_NEW, "Patch C");

// Patch D — inject invisible chain edges between isolated sibling pairs.
// Migration: V1 (edge-less only, leaf filter) → V2 (sibling-isolation).
if (src.includes(CHAIN_OLD_V1)) {
  src = src.replace(CHAIN_OLD_V1, CHAIN_NEW_V2);
  console.log("patch-dagre: Patch D upgraded V1 → V2 (sibling-isolation).");
}
src = applyPatch(src, "_patchSiblingMap", CHAIN_OLD, CHAIN_NEW, "Patch D");

// Patch E — skip layout-only edges during rendering.
src = applyPatch(src, "if (edge._patchInvisible) return;", SKIP_OLD, SKIP_NEW, "Patch E");

if (src === originalSrc) {
  console.log("patch-dagre: nothing to do.");
  process.exit(0);
}

writeFileSync(TARGET, src, "utf8");
console.log(`patch-dagre: wrote ${TARGET}`);
