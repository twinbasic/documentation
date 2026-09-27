#!/bin/sh
# Usage: all.sh <label>   (uses $EXP). Eval vs baseline, the three throwaway sets, probes.
# Writes its logs and JSON to $OUT (default: a temp dir). Needs sets-base.json and
# sp-base.json there from a run with EXP unset (label "base") copied to those names.
HERE=$(cd "$(dirname "$0")" && pwd)
S=${OUT:-${TMPDIR:-/tmp}/search-probes}; mkdir -p "$S"
cd "$HERE/../../.."
L=$1
{
echo "##### $L (EXP=$EXP)"
node eval/search_quality.mjs --compare eval/search_baseline.json --worst 15 2>&1 | grep -E "names out of tier|^prose  |queries compared|rank|->" | head -40
node "$HERE/sets.mjs" $S/sets-$L.json | head -2
node "$HERE/spaced.mjs" $S/sp-$L.json | head -1
node -e "
const a=require(process.argv[1]),b=require(process.argv[2]);
for(const s of ['titles','sections']){let w=[],bt=0;for(const k in a[s]){const x=a[s][k]??99,y=b[s][k]??99;if(y>x)w.push(k+' '+x+'->'+y);if(y<x)bt++}console.log(s,'worse',w.length,'better',bt,w.slice(0,12).join(' | '))}
" $S/sets-base.json $S/sets-$L.json
node -e "
const a=require(process.argv[1]),b=require(process.argv[2]);let w=[],bt=0;
for(const k in a){const x=a[k]??99,y=b[k]??99;if(y>x)w.push(k+' '+x+'->'+y);if(y<x)bt++}
console.log('spaced worse',w.length,'better',bt,w.slice(0,12).join(' | '))" $S/sp-base.json $S/sp-$L.json
} > $S/run-$L.log 2>&1
