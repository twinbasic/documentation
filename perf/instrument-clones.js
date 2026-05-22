// One-off probe: count how many Layout.append clones survive into the
// finalized page wrapper vs. how many get rolled back by removeOverflow.
//
// Mechanism:
//   - Wrap Layout.prototype.append to (a) count calls and (b) tag every
//     returned clone with an expando __pagedjs_clone_tag = true.
//   - Wrap Node.prototype.cloneNode globally so we can also report the
//     gross cloneNode call count (which includes rebuildAncestors and
//     anything else outside Layout.append).
//   - At finalizePage, walk the just-finalized page wrapper counting
//     tagged survivors. (removeOverflow has already fired by this point.)
//   - At afterRendered, summarise totals + per-page distribution.
//
// Cost: O(1) per append + one tree walk per finalized page. Run with
//   --detach-pages --no-timing --additional-script ..\perf\instrument-clones.js
// from a measure.mjs invocation. Numbers are reported via console.log
// which measure.mjs forwards to stdout.

(() => {
    const Layout = window.PagedLayout;
    if (!Layout) {
        console.log('[clone-count] ERROR: window.PagedLayout not exposed; bundle patch missing.');
        return;
    }
    const origAppend = Layout.prototype.append;
    let appendCalls = 0;
    Layout.prototype.append = function (...args) {
        const clone = origAppend.apply(this, args);
        appendCalls++;
        if (clone) clone.__pagedjs_clone_tag = true;
        return clone;
    };

    const origCloneNode = Node.prototype.cloneNode;
    let cloneNodeCalls = 0;
    Node.prototype.cloneNode = function (deep) {
        cloneNodeCalls++;
        return origCloneNode.call(this, deep);
    };

    const perPage = []; // { appended, kept }
    let appendAtPageStart = 0;

    class CloneCountHandler extends Paged.Handler {
        beforePageLayout() {
            appendAtPageStart = appendCalls;
        }
        finalizePage(pageElement) {
            const appendedThisPage = appendCalls - appendAtPageStart;
            let kept = 0;
            const walker = document.createTreeWalker(
                pageElement,
                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
            );
            let n;
            while ((n = walker.nextNode())) {
                if (n.__pagedjs_clone_tag) kept++;
            }
            perPage.push({ appended: appendedThisPage, kept });
        }
        afterRendered(pages) {
            let totalAppended = 0;
            let totalKept = 0;
            let pagesWithOvershoot = 0;
            let maxOvershoot = 0;
            let maxOvershootPage = -1;
            const pcts = [];
            perPage.forEach((entry, idx) => {
                totalAppended += entry.appended;
                totalKept += entry.kept;
                const over = entry.appended - entry.kept;
                if (over > 0) pagesWithOvershoot++;
                if (over > maxOvershoot) {
                    maxOvershoot = over;
                    maxOvershootPage = idx;
                }
                pcts.push(entry.appended > 0 ? (over / entry.appended) * 100 : 0);
            });
            const totalOvershoot = totalAppended - totalKept;
            const pct = totalAppended > 0
                ? (totalOvershoot / totalAppended) * 100
                : 0;

            console.log(`[clone-count] pages=${pages.length}`);
            console.log(`[clone-count] Layout.append calls (source-walker leaf clones): ${totalAppended}`);
            console.log(`[clone-count] survivors in finalized pages: ${totalKept}`);
            console.log(`[clone-count] overshoot (appended-then-removed): ${totalOvershoot} (${pct.toFixed(1)}%)`);
            console.log(`[clone-count] pages with any overshoot: ${pagesWithOvershoot}/${pages.length}`);
            console.log(`[clone-count] max overshoot on one page: ${maxOvershoot} (page index ${maxOvershootPage}, appended=${perPage[maxOvershootPage]?.appended ?? 0})`);
            console.log(`[clone-count] gross Node.cloneNode calls (incl. rebuildAncestors, handlers, etc.): ${cloneNodeCalls}`);
            console.log(`[clone-count] non-Layout.append clones: ${cloneNodeCalls - totalAppended}`);

            // Per-page overshoot % buckets.
            const buckets = [
                { lo: 0,   hi: 1   },
                { lo: 1,   hi: 5   },
                { lo: 5,   hi: 10  },
                { lo: 10,  hi: 20  },
                { lo: 20,  hi: 30  },
                { lo: 30,  hi: 50  },
                { lo: 50,  hi: 101 },
            ];
            const counts = buckets.map(() => 0);
            for (const p of pcts) {
                for (let i = 0; i < buckets.length; i++) {
                    if (p >= buckets[i].lo && p < buckets[i].hi) {
                        counts[i]++;
                        break;
                    }
                }
            }
            console.log(`[clone-count] per-page overshoot % distribution:`);
            for (let i = 0; i < buckets.length; i++) {
                const b = buckets[i];
                const hi = b.hi === 101 ? '100' : String(b.hi);
                console.log(`[clone-count]   ${String(b.lo).padStart(3)} - ${hi.padStart(3)}%: ${counts[i]} pages`);
            }

            // Cumulative percentile cutpoints.
            const sortedPcts = pcts.slice().sort((a, b) => a - b);
            const pickPct = (q) => sortedPcts[Math.min(sortedPcts.length - 1, Math.floor(q * sortedPcts.length))];
            console.log(`[clone-count] per-page overshoot %: p50=${pickPct(0.5).toFixed(1)}% p90=${pickPct(0.9).toFixed(1)}% p99=${pickPct(0.99).toFixed(1)}% max=${pickPct(0.999).toFixed(1)}%`);
        }
    }

    Paged.registerHandlers(CloneCountHandler);
    console.log('[clone-count] handler registered');
})();
